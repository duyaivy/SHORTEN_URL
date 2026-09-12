# 📄 Tài Liệu Kỹ Thuật: Xử Lý Endpoint Short URL (`GET /view/:alias`)

Tài liệu này mô tả chi tiết logic xử lý nghiệp vụ và kỹ thuật của endpoint `GET /view/:alias` phục vụ cho việc bàn giao hoặc tái cấu trúc trên hệ thống mới bằng **NestJS**.

---

## 1. Mạch Xử Lý Tổng Quan (Overview)

Endpoint `GET /view/:alias` đảm nhận hai chức năng song song:
1. **Trả về Link Preview (SEO Meta Tags)** cho các Bot / Crawler mạng xã hội (Facebook, Zalo, Telegram, Google, Twitter...).
2. **Trả về dữ liệu điều hướng (JSON)** cho Người dùng thật (Trình duyệt) và **tự động tăng lượt xem (`views`)**.

- **Đường dẫn (Route)**: `GET /view/:alias`
- **Cơ chế**: Tự động nhận diện `User-Agent` tại tầng Backend.

```
                    [ Request: GET /view/:alias ]
                                  │
                       Kiểm tra User-Agent
                                  │
               ┌──────────────────┴──────────────────┐
               ▼                                     ▼
        [ Là BOT / Crawler ]                 [ Là Người dùng thật ]
               │                                     │
   - Lấy dữ liệu SEO Meta               - Lấy dữ liệu URL gốc
   - Trả về: HTML (`text/html`)         - Tăng lượt xem DB (`views + 1`)
   - Lượt xem DB: KHÔNG TĂNG              - Trả về: JSON (`application/json`)
```

---

## 2. Chi Tiết Logic Xử Lý (Detailed Business Logic)

### 🔍 Bước 1: Nhận diện Bot / Crawler (`isBot`)
- Đọc chuỗi `User-Agent` từ HTTP Request Header: `req.headers['user-agent']`.
- Sử dụng thư viện `isbot` (`isbot(userAgent)`). Thư viện này chứa danh sách quy tắc nhận diện tất cả các crawler/bot lớn trên toàn cầu:
  - Facebook: `facebookexternalhit`
  - Telegram: `TelegramBot`
  - Zalo: `ZaloBot` / `ZaloWeb`
  - Twitter / X: `Twitterbot`
  - Discord, WhatsApp, LinkedIn, Googlebot, Bingbot...

---

### 🤖 Bước 2A: Xử lý khi là BOT / Crawler Mạng Xã Hội
1. Truy vấn Database tìm record URL theo `alias` và `is_active: true`.
2. **KHÔNG tăng số lượt xem (`views`)** trong Database.
3. Cấu hình Header Response: `Content-Type: text/html; charset=utf-8`.
4. Trả về cấu trúc trang HTML tĩnh chứa các thẻ Meta/Open Graph:
   - **Trường hợp Link hợp lệ**:
     ```html
     <!DOCTYPE html>
     <html lang="en">
     <head>
         <meta property="og:title" content="${title}" />
         <meta property="og:description" content="${description}" />
         <meta property="og:image" content="${image_url}" />
         <meta property="og:site_name" content="${site_name}" />
         <meta property="og:url" content="${og_url}" />
         <meta name="description" content="${description}" />
         <meta name="keywords" content="${keywords}" />
         <title>${title}</title>
     </head>
     <body>Redirecting...</body>
     </html>
     ```
   - **Trường hợp Link có mật khẩu**: Trả về HTML Meta thông báo *"Protected Link | ShortLink - Liên kết được bảo vệ bằng mật khẩu"*.
   - **Trường hợp Link không tồn tại / Ngưng kích hoạt**: Trả về HTML Meta thông báo *"Link Not Found | ShortLink - Liên kết không tồn tại"*.

---

### 👤 Bước 2B: Xử lý khi là NGƯỜI DÙNG THẬT (Trình duyệt)
1. Truy vấn Database tìm record URL theo `alias` và `is_active: true`.
2. **Tự động tăng số lượt xem (`views`) thêm +1** trong Database bằng toán tử `$inc: { views: 1 }`.
3. Cấu hình Header Response: `Content-Type: application/json; charset=utf-8`.
4. Trả về đối tượng JSON:
   ```json
   {
     "statusCode": 200,
     "message": "Lấy URL thành công",
     "success": true,
     "data": {
       "_id": "60f4a98152e242248085b127355d11af",
       "alias": "ccc",
       "url": "https://goc-target.com",
       "views": 15,
       "is_active": true
     }
   }
   ```
5. **Xử lý tại Frontend**: FE nhận JSON chứa `data.url` và chủ động chuyển hướng bằng `window.location.href = data.url` (tránh hoàn toàn rủi ro bị lỗi CORS).

---

## 3. Mã Nguồn Mẫu Triển Khai Trên NestJS (NestJS Implementation)

### 📦 1. Cài đặt thư viện:
```bash
npm install isbot
```

### 🛠️ 2. Controller trong NestJS (`url.controller.ts`):
```typescript
import { Controller, Get, Param, Req, Res, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import { isbot } from 'isbot';
import { UrlService } from './url.service';

@Controller('view')
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  @Get(':alias')
  async getShortUrl(
    @Param('alias') alias: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userAgent = req.headers['user-agent'] || '';

    // 🤖 Nếu phát hiện là Bot -> Trả về HTML SEO Meta
    if (isbot(userAgent)) {
      const html = await this.urlService.getShortUrlSEO(alias);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(HttpStatus.OK).send(html);
    }

    // 👤 Nếu là Người dùng thật -> Trả về JSON & tăng views +1
    const data = await this.urlService.getShortUrl(alias);
    return res.status(HttpStatus.OK).json({
      statusCode: 200,
      message: 'Lấy URL thành công',
      success: true,
      data,
    });
  }
}
```

### 🌐 3. Yêu cầu Cấu hình Nginx (Reverse Proxy)
Nginx trên server production chỉ làm Reverse Proxy đơn thuần và chuyển tiếp `User-Agent`:
```nginx
location /view/ {
    proxy_pass http://localhost:3000/view/;
    proxy_set_header Host $host;
    proxy_set_header User-Agent $http_user_agent;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```
