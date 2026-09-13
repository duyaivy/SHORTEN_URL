# URL Shortener Architecture & Implementation Blueprint

Tài liệu ghi nhớ các quy chuẩn kiến trúc, luồng xử lý và checklist triển khai cho hệ thống Rút gọn URL.

---

## 1. Core Service & Database Architecture

- [ ] **ID Generation (Base62 + KGS):**
  - Sử dụng thuật toán **Base62** (`a-z`, `A-Z`, `0-9`) để mã hóa ID. Với 7 ký tự, hệ thống hỗ trợ tối đa ~3.5 nghìn tỷ mã URL độc nhất.
  - Triển khai **Key Generation Service (KGS)** hoặc Ticket Server chạy ngầm để sinh sẵn pool mã ngẫu nhiên vào bộ nhớ tạm (Redis/Zookeeper). Web App chỉ cần lấy ngẫu nhiên Key đã sinh -> Tốc độ ghi tối đa và không đụng độ (Zero Collision).
- [ ] **Database & Indexing:**
  - Sử dụng NoSQL (Cassandra / DynamoDB) hoặc RDBMS (PostgreSQL/MySQL).
  - Bắt buộc tạo **Unique Index** cho cột `short_code` để truy vấn đạt độ phức tạp $O(1)$.
  - Sẵn sàng phương án **Database Sharding** dựa trên ký tự đầu của `short_code` khi dữ liệu phình to.

---

## 3. Caching & High Availability (Read-Heavy Optimization)

Hệ thống có tỷ lệ Read:Write cao (~100:1), do đó Caching đóng vai trò bảo vệ Database.

- [ ] **In-Memory Cache (Redis / Memcached):**
  - Lưu cặp Key-Value: `short_code` -> `long_url` + `metadata` (bao gồm cờ `has_password`).
- [ ] **Chính sách Eviction:**
  - Sử dụng thuật toán **LRU (Least Recently Used)** để tự động giải phóng các link ít truy cập, giữ lại bộ nhớ cho Hot Links.
- [ ] **Bảo vệ Database khỏi Spike & Spam:**
  - **Cache Null Value:** Nếu user/bot gọi một `short_code` không tồn tại, cache giá trị `null` trong thời gian ngắn (ví dụ: 60s) để tránh việc Database bị cạn kiệt connection (Cache Penetration).

---

## 4. Async Processing & Analytics Queue

Giảm thiểu tối đa độ trễ (Latency) cho người dùng bằng cách đẩy tất cả tác vụ phụ thuộc vào luồng xử lý bất đồng bộ (Asynchronous).

- [x] **Direct HTTP 302 Redirect (Loại bỏ SEO Crawl):**
  - Không cần crawl metadata khi tạo link hay render HTML meta nữa (giảm tải 100% network latency & CPU).
  - Sử dụng **Direct HTTP 302 Redirect**:
    - **Không có password**: HTTP 302 chuyển hướng trực tiếp tới URL đích. Mọi Bot / Crawler (Facebook, Google, Zalo, Twitter...) đều tự động follow 302 để lấy OpenGraph trực tiếp từ trang gốc.
    - **Có password**: HTTP 302 chuyển hướng tới trang nhập mật khẩu Frontend (`${CLIENT_URL}/a/password/${alias}?alias=${alias}`).
- [x] **Tracking Analytics (Batch Mode via Redis INCR):**
  - Luồng Redirect chỉ thực hiện Redis `INCR views:{alias}` (~0.1ms) rồi redirect ngay lập tức mà không block response.
  - Scheduler (`AnalyticsFlushScheduler`) chạy ngầm mỗi 30s gom batch tất cả lượt click ghi vào DB trong 1 transaction duy nhất.

---

## 5. Security & Rate Limiting

- [ ] **API Rate Limiting:** Áp dụng thuật toán Token Bucket/Leaky Bucket (dùng Redis Rate Limiter) để giới hạn số lượng tạo short link trên mỗi IP/User.
- [ ] **Malicious Domain Check:** Tích hợp kiểm tra Google Safe Browsing API hoặc danh sách đen domain độc hại trước khi cho phép người dùng rút gọn.
