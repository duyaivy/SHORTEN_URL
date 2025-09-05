## User

```
interface UserType {
	_id?: ObjectId;
	username: string;
	email: string;
	password: string;
    created_at: Datetime;
    updated_at: Datetime;
}
```

## URL: quan hệ user 1 - Nhiều URL -> tạo schema riêng, có owner_id là user đó

```
interface UrlType {
	_id?: ObjectId;
	owner_id: ObjectId | null;
	url: string;
	views: number;
    alias: string;
    password: string | null;
	is_active: boolean;
	qr_code: string;
    created_at: Datetime;
    updated_at: Datetime;
}
```

Trong đó:

- `is_active` là thuộc tính cho phép truy cập vào link
- `qr_code` là thuộc tính chứa url của qr code
- `password` cho phép đặt mật khẩu cho rút gọn link
