# 📄 Tài Liệu Kỹ Thuật: Xử Lý Endpoint Short URL Direct Redirect (`GET /view/:alias`)

Tài liệu mô tả chi tiết luồng chuyển hướng trực tiếp (Direct HTTP 302 Redirect) cho hệ thống rút gọn URL trên **NestJS**.

---

## 1. Mạch Xử Lý Tổng Quan (Overview)

Hệ thống sử dụng cơ chế **Direct HTTP 302 Redirect** thuần túy:
- **Tốc độ tối đa**: Không crawl metadata trang đích khi tạo link, không sinh trang HTML tĩnh trung gian.
- **Tương thích hoàn hảo với Bot / Crawler**: Tất cả các crawler (Facebook, Google, Zalo, Twitter, Telegram...) đều tự động follow mã HTTP 302 Redirect để lấy OpenGraph / Meta data trực tiếp từ trang đích gốc.
- **Bảo mật**: Nếu link có mật khẩu, tự động chuyển hướng người dùng đến giao diện nhập mật khẩu của Frontend.
- **Hiệu năng cao**: Tăng lượt xem bất đồng bộ qua Redis `INCR` và ghi nhận định kỳ (Batching) vào Database, không làm nghẽn phản hồi.

```
                                [ Request: GET /view/:alias ]
                                              │
                                  Kiểm tra Cache Redis
                                              │
                           ┌──────────────────┴──────────────────┐
                           ▼                                     ▼
                      [ Cache Hit ]                         [ Cache Miss ]
                           │                                     │
                           │                              Đọc từ MongoDB
                           │                         (Nếu không thấy: Cache Null 60s)
                           │                                     │
                           └──────────────────┬──────────────────┘
                                              │
                                     Kiểm tra Mật khẩu?
                                              │
                           ┌──────────────────┴──────────────────┐
                           ▼                                     ▼
                   [ Có Mật khẩu ]                       [ Không có Mật khẩu ]
                           │                                     │
              Redirect HTTP 302 về:                 - Ghi nhận click: Redis INCR views:{alias}
     `${CLIENT_URL}/a/password/${alias}?alias=${alias}`   - Redirect HTTP 302 trực tiếp về URL đích:
                                                            `res.redirect(302, originalUrl)`
```

---

## 2. Chi Tiết Logic Nghiệp Vụ (Business Logic)

### 🚀 Bước 1: Cache-Aside Lookup & Chống Cache Penetration
1. Tra cứu khóa `url:{alias}` trong Redis.
2. Nếu gặp giá trị sentinel `__NULL__`: Link không tồn tại hoặc đã bị tắt $\to$ Trả về `404 Not Found` ngay lập tức mà không truy vấn Database.
3. Nếu Cache Hit:
   - Kiểm tra hạn sử dụng `exp`: Nếu đã hết hạn $\to$ Xóa cache, set Null sentinel, ném `404 Not Found`.
   - Lấy dữ liệu từ Redis.
4. Nếu Cache Miss:
   - Truy vấn MongoDB theo `alias` và `is_active: true`.
   - Nếu không tìm thấy hoặc đã hết hạn: Lưu `setNull(cacheKey, 60)` trong 60 giây và trả về `404 Not Found`.
   - Nếu tìm thấy: Lưu dữ liệu vào Redis với TTL 1 giờ (`URL_CACHE_TTL = 3600s`).

---

### 🔒 Bước 2: Phân luồng Mật khẩu (Password Protection)
- **Trường hợp 1 (Có mật khẩu)**:
  - Header: `Location: ${CLIENT_URL}/a/password/${alias}?alias=${alias}`
  - Status: `302 Found`
  - Người dùng truy cập trang nhập mật khẩu trên Frontend. Khi nhập đúng mật khẩu, Frontend gọi `POST /view/:alias` với body `{ password }` để lấy URL gốc.
- **Trường hợp 2 (Không có mật khẩu)**:
  - Gọi bất đồng bộ `analyticsProducer.pushClickEvent(alias)` (Redis `INCR views:{alias}`).
  - Header: `Location: ${originalUrl}`
  - Status: `302 Found`
  - Trình duyệt hoặc Crawler tự động điều hướng sang trang đích.

---

### ⏱️ Bước 3: Batch Flush Analytics (Ghi nhận lượt xem)
- `AnalyticsFlushScheduler` chạy ngầm mỗi 30 giây:
  1. `SCAN` các key `views:*` trong Redis.
  2. Dùng Pipeline lấy số đếm và xóa key (`GET + DEL`).
  3. Bulk update MongoDB bằng một transaction duy nhất (`$transaction` + `$inc`).
  4. Invalidate cache `url:{alias}` để đảm bảo lần đọc tiếp theo có số lượt view mới nhất.
