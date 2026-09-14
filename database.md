# Database

Ứng dụng sử dụng MongoDB thông qua Prisma. Tên collection được ánh xạ bằng
`@@map` như dưới đây.

## User

Collection: `users`

```ts
interface User {
  id: ObjectId;
  email: string; // unique
  username: string | null;
  password: string;
  avatar_url: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}
```

Một user có nhiều `RefreshToken`, `ShortUrl` và `QrScanHistory`.

## RefreshToken

Collection: `refresh_tokens`

```ts
interface RefreshToken {
  id: ObjectId;
  tokenHash: string; // unique
  userId: ObjectId;
  expiresAt: Date;
  createdAt: Date;
}
```

`RefreshToken.userId` liên kết tới `User.id`. Khi user bị xóa, các refresh
token liên quan cũng bị xóa (`onDelete: Cascade`).

## ShortUrl

Collection: `urls`

```ts
interface ShortUrl {
  id: ObjectId;
  alias: string; // unique
  url: string;
  password: string | null;
  owner_id: ObjectId | null;
  is_active: boolean;
  views: number;
  seo_data: {
    title: string | null;
    description: string | null;
    og_image: string | null;
    og_title: string | null;
    og_description: string | null;
    og_url: string | null;
  } | null;
  exp: Date | null;
  created_at: Date;
  updated_at: Date;
}
```

`owner_id` liên kết tới `User.id` và có thể null để hỗ trợ URL không thuộc về
user nào. Khi user bị xóa, URL vẫn được giữ lại và `owner_id` được đặt thành
null (`onDelete: SetNull`).

- `alias` là mã rút gọn duy nhất dùng để truy cập URL.
- `password` là mật khẩu tùy chọn để bảo vệ URL.
- `is_active` xác định URL có được phép truy cập hay không.
- `views` lưu số lượt truy cập.
- `seo_data` lưu dữ liệu SEO tùy chọn.
- `exp` là thời điểm hết hạn tùy chọn.

QR code không được lưu trực tiếp trong `ShortUrl` hiện tại.

## QrScanHistory

Collection: `qr_histories`

```ts
interface QrScanHistory {
  id: ObjectId;
  owner_id: ObjectId;
  decoded: string;
  created_at: Date;
}
```

`owner_id` liên kết tới `User.id`. Khi user bị xóa, lịch sử quét QR liên quan
cũng bị xóa (`onDelete: Cascade`).
