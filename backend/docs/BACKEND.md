# Tài Liệu Backend — PM Restaurant Management System

> Phiên bản tài liệu: 1.0.0 · Ngày tạo: 2026-05-19

---

## Mục lục

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [API Reference](#2-api-reference)
3. [Cơ sở dữ liệu](#3-cơ-sở-dữ-liệu)
4. [Biến môi trường](#4-biến-môi-trường)
5. [Background Jobs](#5-background-jobs)

---

## 1. Tổng quan dự án

### Mô tả dự án

**PM Restaurant Management** là hệ thống quản lý nhà hàng full-stack. Backend cung cấp REST API để phục vụ các tính năng:

- Quản lý đặt bàn (reservation), nhận khách (walk-in), giữ bàn (hold)
- Thực đơn và danh mục món ăn
- Quản lý bàn theo khu vực (zone)
- Đặt món qua mã QR tại bàn (table session)
- Kitchen Display System (KDS) — nhà bếp xác nhận từng món
- Thanh toán (tiền mặt / chuyển khoản)
- Quản lý người dùng và phân quyền (ADMIN / STAFF / CUSTOMER)
- Báo cáo doanh thu theo ngày / tháng / năm
- Gửi email (quên mật khẩu, xác nhận)
- Cài đặt giao diện nhà hàng (logo, banner, thông tin liên hệ…)

---

### Bảng Tech Stack

| Hạng mục | Công nghệ |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express.js v5 |
| Cơ sở dữ liệu | PostgreSQL |
| Kết nối DB | `pg` (node-postgres) — raw SQL, không ORM |
| Xác thực | JWT (`jsonwebtoken`) + `bcrypt` |
| Upload file | Multer (memory storage) → lưu disk `/uploads` |
| Gửi email | Nodemailer (SMTP Gmail) |
| Tạo QR code | `qrcode` |
| Biến môi trường | `dotenv` |
| CORS | `cors` |

---

### Yêu cầu cài đặt

| Phần mềm | Phiên bản tối thiểu |
|---|---|
| Node.js | 18+ |
| PostgreSQL | 14+ |
| npm | 9+ |

---

### Các bước chạy dự án

```bash
# 1. Clone repository
git clone <repo-url>
cd PM-restaurant-management/backend

# 2. Cài đặt dependencies
npm install

# 3. Tạo file .env từ mẫu và điền thông tin thực tế
cp .env.example .env
# Chỉnh sửa .env với thông tin PostgreSQL, JWT secret, SMTP...

# 4. Khởi động PostgreSQL và đảm bảo database đã tồn tại
# (Schema được tự động tạo khi server khởi động qua ensureDbSchema())

# 5. Chạy server ở chế độ phát triển (auto-reload)
npm run dev

# 6. Chạy server ở chế độ production
npm start
```

> **Lưu ý:** Dự án không sử dụng migration files riêng biệt. Toàn bộ schema được khởi tạo tự động thông qua hàm `ensureDbSchema()` trong [config/db.js](../src/config/db.js) khi server khởi động lần đầu. Nếu bảng đã tồn tại, hàm này không thay đổi gì (idempotent).

---

### Giải thích npm scripts

| Script | Lệnh thực thi | Mô tả |
|---|---|---|
| `npm start` | `node src/server.js` | Chạy server production |
| `npm run dev` | `nodemon src/server.js` | Chạy server development với auto-reload |

---

### Cấu trúc thư mục

```
backend/
├── src/
│   ├── app.js                    # Khởi tạo Express app, đăng ký middleware và routes
│   ├── server.js                 # Entry point: khởi động server, background jobs
│   ├── config/
│   │   └── db.js                 # Kết nối PostgreSQL pool + tự động tạo schema
│   ├── routes/
│   │   ├── index.js              # Gom tất cả route modules vào một router
│   │   └── modules/              # Khai báo route theo từng domain
│   │       ├── auth.routes.js
│   │       ├── users.routes.js
│   │       ├── menu.routes.js
│   │       ├── tables.routes.js
│   │       ├── zones.routes.js
│   │       ├── reservations.routes.js
│   │       ├── orders.routes.js
│   │       ├── payments.routes.js
│   │       ├── table-session.routes.js
│   │       ├── settings.routes.js
│   │       └── admin.routes.js
│   ├── controllers/              # Xử lý logic request/response
│   │   ├── auth.controller.js
│   │   ├── users.controller.js
│   │   ├── menu.controller.js
│   │   ├── tables.controller.js
│   │   ├── zones.controller.js
│   │   ├── reservations.controller.js
│   │   ├── orders.controller.js
│   │   ├── payments.controller.js
│   │   ├── tableSession.controller.js
│   │   ├── settings.public.controller.js
│   │   └── admin/                # Controllers dành riêng cho admin panel
│   │       ├── menu.admin.controller.js
│   │       ├── categories.admin.controller.js
│   │       ├── users.admin.controller.js
│   │       ├── reservations.admin.controller.js
│   │       ├── dashboard.admin.controller.js
│   │       ├── tables.admin.controller.js
│   │       ├── reports.admin.controller.js
│   │       ├── kitchen.admin.controller.js
│   │       ├── notifications.admin.controller.js
│   │       ├── settings.admin.controller.js
│   │       ├── tableLayout.admin.controller.js
│   │       └── ingredients.admin.controller.js  # Quản lý nguyên liệu & kho
│   ├── services/                 # Logic nghiệp vụ phức tạp / tích hợp bên ngoài
│   │   ├── tableSession.service.js   # Quản lý vòng đời QR session
│   │   ├── mail.service.js           # Gửi email qua SMTP
│   │   ├── inventory.service.js      # Trừ tồn kho nguyên liệu khi bếp xác nhận món
│   │   └── tableLayoutVision.service.js  # Phân tích sơ đồ bàn bằng vision API
│   ├── middleware/               # Express middleware
│   │   ├── requireAuth.js        # Xác thực JWT bắt buộc
│   │   ├── requireRole.js        # Kiểm tra đúng một role cụ thể
│   │   ├── requireAnyRole.js     # Chấp nhận nhiều roles
│   │   ├── upload.js             # Cấu hình Multer upload
│   │   ├── errorHandler.js       # Global error handler
│   │   └── notFound.js           # 404 handler
│   └── utils/                    # Tiện ích dùng chung
│       ├── httpError.js          # Factory tạo lỗi HTTP chuẩn
│       ├── response.js           # Helper trả về JSON response chuẩn
│       ├── bookingMapper.js      # Chuyển đổi DB row → API response
│       └── notifyStaff.js        # Gửi notification đến ADMIN/STAFF
├── uploads/                      # Thư mục lưu file upload (avatar, ảnh bàn, logo...)
├── docs/
│   └── BACKEND.md                # File tài liệu này
├── .env                          # Biến môi trường (không commit)
└── package.json
```

---

## 2. API Reference

> **Base URL:** `http://localhost:5000/api`
>
> **Authentication:** Truyền JWT qua header `Authorization: Bearer <token>`
>
> **Response format chuẩn:**
> ```json
> // Thành công
> { "success": true, "data": { ... } }
>
> // Lỗi
> { "success": false, "error": { "code": "BAD_REQUEST", "message": "...", "details": {} } }
> ```

---

### Module: Auth — `/api/auth`

---

#### POST /api/auth/register

**Mô tả:** Đăng ký tài khoản CUSTOMER mới.
**Authentication:** Không yêu cầu ❌
**Role:** Public

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `name` | string | ✅ | Tên hiển thị |
| `email` | string | ✅ | Email đăng nhập (duy nhất) |
| `password` | string | ✅ | Mật khẩu (sẽ được hash bcrypt 10 rounds) |
| `phone` | string | ❌ | Số điện thoại |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Nguyễn Văn A",
      "email": "user@example.com",
      "role": "CUSTOMER",
      "status": "ACTIVE"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Codes:**

| Code | Message | Nguyên nhân |
|---|---|---|
| 400 | Email already in use | Email đã tồn tại trong hệ thống |
| 400 | Validation error | Thiếu field bắt buộc |

---

#### POST /api/auth/login

**Mô tả:** Đăng nhập, nhận JWT token.
**Authentication:** Không yêu cầu ❌
**Role:** Public

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `email` | string | ✅ | Email tài khoản |
| `password` | string | ✅ | Mật khẩu |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Nguyễn Văn A",
      "email": "user@example.com",
      "role": "CUSTOMER",
      "avatar_url": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Codes:**

| Code | Message | Nguyên nhân |
|---|---|---|
| 401 | Invalid credentials | Sai email hoặc mật khẩu |
| 403 | Account is locked | Tài khoản bị khóa |

---

#### POST /api/auth/logout

**Mô tả:** Đăng xuất (stateless — phía client xóa token).
**Authentication:** Không yêu cầu ❌

**Response 200:**
```json
{ "success": true, "data": { "message": "Logged out" } }
```

---

#### POST /api/auth/forgot-password

**Mô tả:** Gửi email chứa link reset mật khẩu (hết hạn sau 30 phút).
**Authentication:** Không yêu cầu ❌

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `email` | string | ✅ | Email tài khoản cần đặt lại mật khẩu |

**Response 200:**
```json
{ "success": true, "data": { "message": "Reset email sent if account exists" } }
```

> Luôn trả về 200 dù email có tồn tại hay không để tránh enumeration attack.

---

#### POST /api/auth/reset-password

**Mô tả:** Đặt lại mật khẩu bằng token nhận qua email.
**Authentication:** Không yêu cầu ❌

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `token` | string | ✅ | Reset token từ email |
| `newPassword` | string | ✅ | Mật khẩu mới |

**Response 200:**
```json
{ "success": true, "data": { "message": "Password reset successful" } }
```

**Error Codes:**

| Code | Message | Nguyên nhân |
|---|---|---|
| 400 | Invalid or expired token | Token không hợp lệ hoặc đã hết hạn / đã dùng |

---

### Module: Users — `/api/users`

---

#### GET /api/users/me

**Mô tả:** Lấy thông tin hồ sơ của người dùng đang đăng nhập.
**Authentication:** Bắt buộc ✅
**Role:** Mọi role

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Nguyễn Văn A",
    "email": "user@example.com",
    "phone": "0912345678",
    "avatar_url": "/uploads/user_1_xxx.jpg",
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

#### PATCH /api/users/me

**Mô tả:** Cập nhật thông tin hồ sơ cá nhân.
**Authentication:** Bắt buộc ✅

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `name` | string | ❌ | Tên hiển thị mới |
| `email` | string | ❌ | Email mới |
| `phone` | string | ❌ | Số điện thoại mới |

**Response 200:**
```json
{ "success": true, "data": { "id": 1, "name": "...", "email": "...", "phone": "..." } }
```

---

#### POST /api/users/me/password

**Mô tả:** Đổi mật khẩu của người dùng đang đăng nhập (yêu cầu nhập mật khẩu hiện tại).
**Authentication:** Bắt buộc ✅

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `currentPassword` | string | ✅ | Mật khẩu hiện tại |
| `newPassword` | string | ✅ | Mật khẩu mới (≥ 6 ký tự) |

**Response 200:**
```json
{ "success": true, "data": { "message": "Password changed successfully" } }
```

**Error Codes:**

| Code | Message | Nguyên nhân |
|---|---|---|
| 400 | Current password is incorrect | Mật khẩu hiện tại sai |
| 400 | Validation error | Thiếu field hoặc mật khẩu mới quá ngắn |

---

#### POST /api/users/me/avatar

**Mô tả:** Upload ảnh đại diện cho người dùng hiện tại.
**Authentication:** Bắt buộc ✅
**Content-Type:** `multipart/form-data`

**Request Body (form-data):**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `avatar` | file | ✅ | File ảnh (JPEG/PNG/WebP/GIF, tối đa 5MB) |

**Response 200:**
```json
{ "success": true, "data": { "avatar_url": "/uploads/user_1_1700000000000_abc123.jpg" } }
```

---

#### DELETE /api/users/me/avatar

**Mô tả:** Xóa ảnh đại diện, đặt lại về null.
**Authentication:** Bắt buộc ✅

**Response 200:**
```json
{ "success": true, "data": { "message": "Avatar removed" } }
```

---

### Module: Menu (Public) — `/api/menu`

---

#### GET /api/menu

**Mô tả:** Lấy danh sách tất cả món ăn đang hoạt động (AVAILABLE).
**Authentication:** Không yêu cầu ❌
**Role:** Public

**Query Parameters:**

| Param | Type | Required | Mô tả |
|---|---|---|---|
| `search` | string | ❌ | Tìm theo tên món |
| `categoryId` | number | ❌ | Lọc theo danh mục |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Phở bò",
      "price": "85000.00",
      "description": "Phở bò truyền thống",
      "image_url": "/uploads/food_1_xxx.jpg",
      "category_id": 2,
      "category_name": "Món chính",
      "status": "AVAILABLE"
    }
  ]
}
```

---

#### GET /api/menu/categories

**Mô tả:** Lấy danh sách danh mục món ăn.
**Authentication:** Không yêu cầu ❌

**Response 200:**
```json
{
  "success": true,
  "data": [{ "id": 1, "name": "Khai vị" }, { "id": 2, "name": "Món chính" }]
}
```

---

#### GET /api/menu/:id

**Mô tả:** Lấy chi tiết một món ăn theo ID.
**Authentication:** Không yêu cầu ❌

**Path Params:**

| Param | Type | Mô tả |
|---|---|---|
| `id` | number | ID món ăn |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Phở bò",
    "price": "85000.00",
    "description": "...",
    "image_url": "/uploads/food_1_xxx.jpg",
    "category_id": 2,
    "status": "AVAILABLE"
  }
}
```

**Error Codes:**

| Code | Message | Nguyên nhân |
|---|---|---|
| 404 | Food not found | Không tìm thấy món ăn |

---

### Module: Tables (Public Read) — `/api/tables`

---

#### GET /api/tables

**Mô tả:** Lấy danh sách tất cả bàn kèm trạng thái session hiện tại.
**Authentication:** Không yêu cầu ❌

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Bàn 01",
      "capacity": 4,
      "status": "AVAILABLE",
      "image_url": null,
      "zone": "Tầng 1",
      "pos_x": 100,
      "pos_y": 200,
      "active_session": null
    }
  ]
}
```

---

#### GET /api/tables/:id

**Mô tả:** Lấy chi tiết một bàn theo ID.
**Authentication:** Không yêu cầu ❌

---

#### POST /api/tables

**Mô tả:** Tạo bàn mới.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `name` | string | ✅ | Tên bàn |
| `capacity` | number | ✅ | Số chỗ ngồi |
| `zone` | string | ❌ | Khu vực (tên zone) |
| `pos_x` | number | ❌ | Tọa độ X trên sơ đồ |
| `pos_y` | number | ❌ | Tọa độ Y trên sơ đồ |

---

#### POST /api/tables/:id/image

**Mô tả:** Upload ảnh cho bàn.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN
**Content-Type:** `multipart/form-data`

**Request Body (form-data):**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `image` | file | ✅ | Ảnh bàn (JPEG/PNG/WebP/GIF, tối đa 5MB) |

---

#### PATCH /api/tables/:id

**Mô tả:** Cập nhật thông tin bàn.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN, STAFF

**Request Body:** Bất kỳ field nào trong: `name`, `capacity`, `status`, `zone`, `pos_x`, `pos_y`, `status_note`

---

#### DELETE /api/tables/:id

**Mô tả:** Xóa bàn.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN

---

### Module: Zones — `/api/zones`

---

#### GET /api/zones

**Mô tả:** Lấy danh sách khu vực.
**Authentication:** Không yêu cầu ❌

**Response 200:**
```json
{
  "success": true,
  "data": [{ "id": 1, "name": "Tầng 1", "created_at": "..." }]
}
```

---

#### POST /api/zones

**Mô tả:** Tạo khu vực mới.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `name` | string | ✅ | Tên khu vực (duy nhất) |

---

#### DELETE /api/zones/:id

**Mô tả:** Xóa khu vực.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN

---

### Module: Reservations — `/api/reservations`

---

#### GET /api/reservations

**Mô tả:** Lấy danh sách đặt bàn của người dùng hiện tại.
**Authentication:** Bắt buộc ✅

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "booking_date": "2025-12-25",
      "booking_time": "18:00",
      "guests": 4,
      "status": "CONFIRMED",
      "tables": [{ "id": 2, "name": "Bàn 02" }],
      "note": ""
    }
  ]
}
```

---

#### POST /api/reservations

**Mô tả:** Tạo đặt bàn mới (có thể kèm đặt trước món ăn).
**Authentication:** Không bắt buộc (optionalAuth)

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `booking_date` | string (DATE) | ✅ | Ngày đặt (YYYY-MM-DD) |
| `booking_time` | string (TIME) | ✅ | Giờ đặt (HH:MM) |
| `guests` | number | ✅ | Số khách |
| `guest_name` | string | ❌ | Tên khách (nếu không đăng nhập) |
| `guest_phone` | string | ❌ | SĐT khách (nếu không đăng nhập) |
| `note` | string | ❌ | Ghi chú thêm |
| `preorderItems` | array | ❌ | Đặt trước món: `[{ food_id, quantity }]` |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "status": "PENDING",
    "booking_date": "2025-12-25",
    "booking_time": "18:00:00",
    "guests": 4
  }
}
```

---

#### GET /api/reservations/:id

**Mô tả:** Lấy chi tiết một booking.
**Authentication:** Không bắt buộc (optionalAuth)

---

#### POST /api/reservations/:id/cancel

**Mô tả:** Khách hủy đặt bàn của mình.
**Authentication:** Bắt buộc ✅

**Error Codes:**

| Code | Message | Nguyên nhân |
|---|---|---|
| 403 | Forbidden | Booking không thuộc về user này |
| 400 | Cannot cancel | Trạng thái không thể hủy |

---

#### POST /api/reservations/:id/hold

**Mô tả:** Giữ bàn trong 15 phút. Trạng thái booking → HOLD, bàn → RESERVED.
**Authentication:** Không bắt buộc (optionalAuth)

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `tableIds` | number[] | ✅ | Danh sách ID bàn muốn giữ |

> **Lưu ý:** Body nhận `tableIds` (mảng), không phải `tableId` (đơn). Ví dụ: `{ "tableIds": [1, 2] }`.

---

#### POST /api/reservations/:id/payments/online-intent

**Mô tả:** Tạo intent thanh toán online (khởi tạo bản ghi payment UNPAID).
**Authentication:** Bắt buộc ✅

---

#### POST /api/reservations/:id/payments/online-mark-paid

**Mô tả:** Khách đánh dấu đã thanh toán online (chờ admin xác nhận).
**Authentication:** Bắt buộc ✅

---

### Module: Table Session (QR Ordering) — `/api/table-session`

> Mọi endpoint `:token` đều dùng `qr_token` của bản ghi `table_sessions`.

---

#### GET /api/table-session/me

**Mô tả:** Lấy thông tin phiên bàn đang active của người dùng (qua booking).
**Authentication:** Bắt buộc ✅

---

#### GET /api/table-session/:token

**Mô tả:** Lấy thông tin session theo QR token (thông tin bàn, booking, order hiện tại).
**Authentication:** Không yêu cầu ❌

**Path Params:**

| Param | Type | Mô tả |
|---|---|---|
| `token` | string | QR token (96 ký tự hex) |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "session": { "id": 1, "status": "ACTIVE", "qr_token": "..." },
    "table": { "id": 2, "name": "Bàn 02", "capacity": 4 },
    "booking": { "id": 10, "guests": 4 },
    "order": {
      "id": 5,
      "status": "PENDING",
      "items": [
        { "id": 1, "food_name": "Phở bò", "quantity": 2, "price": "85000.00", "kitchen_status": "PENDING" }
      ]
    }
  }
}
```

---

#### POST /api/table-session/:token/submit

**Mô tả:** Gửi order lên bếp (chuyển từ PENDING → SERVING).
**Authentication:** Không yêu cầu ❌

---

#### GET /api/table-session/:token/payment

**Mô tả:** Lấy thông tin thanh toán của session.
**Authentication:** Không yêu cầu ❌

---

#### POST /api/table-session/:token/payment

**Mô tả:** Tạo hoặc cập nhật bản ghi thanh toán cho session.
**Authentication:** Không yêu cầu ❌

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `method` | string | ✅ | `cash` hoặc `bank_transfer` |

---

#### POST /api/table-session/:token/items

**Mô tả:** Thêm món vào order trong session.
**Authentication:** Không yêu cầu ❌

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `food_id` | number | ✅ | ID món ăn |
| `quantity` | number | ✅ | Số lượng (≥ 1) |

---

#### PATCH /api/table-session/:token/items/:itemId

**Mô tả:** Cập nhật số lượng của một item trong order.
**Authentication:** Không yêu cầu ❌

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `quantity` | number | ✅ | Số lượng mới (0 = xóa item) |

---

#### DELETE /api/table-session/:token/items/:itemId

**Mô tả:** Xóa một item khỏi order.
**Authentication:** Không yêu cầu ❌

---

### Module: Orders — `/api/orders`

> Các endpoint này dành cho ADMIN tạo và quản lý order thủ công.

---

#### POST /api/orders

**Mô tả:** Tạo order mới.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `booking_id` | number | ❌ | Liên kết booking |
| `table_session_id` | number | ❌ | Liên kết table session |

---

#### GET /api/orders/:id

**Mô tả:** Lấy chi tiết order kèm items.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN

---

#### POST /api/orders/:id/items

**Mô tả:** Thêm món vào order.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `food_id` | number | ✅ | ID món ăn |
| `quantity` | number | ✅ | Số lượng |

---

#### PATCH /api/orders/:id/items/:itemId

**Mô tả:** Cập nhật số lượng item.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN

---

#### PATCH /api/orders/:id/status

**Mô tả:** Cập nhật trạng thái order.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `status` | string | ✅ | `PENDING` / `SERVING` / `DONE` |

---

### Module: Payments — `/api/payments`

---

#### POST /api/payments

**Mô tả:** Tạo bản ghi thanh toán cho order.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `order_id` | number | ✅ | ID order |
| `amount` | number | ✅ | Số tiền |
| `method` | string | ✅ | `cash` / `bank_transfer` |

---

#### PATCH /api/payments/:id/status

**Mô tả:** Cập nhật trạng thái thanh toán.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `status` | string | ✅ | `UNPAID` / `PAID` |

---

#### GET /api/payments/order/:orderId

**Mô tả:** Lấy danh sách thanh toán của một order.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN

---

### Module: Settings — `/api/settings`

---

#### GET /api/settings/public

**Mô tả:** Lấy thông tin hiển thị công khai của nhà hàng (tên, logo, banner, giờ mở cửa...).
**Authentication:** Không yêu cầu ❌

**Response 200:**
```json
{
  "success": true,
  "data": {
    "restaurant_name": "LuxEat Restaurant",
    "logo_url": "/uploads/logo_xxx.png",
    "banner_urls": ["/uploads/banner1.jpg"],
    "address": "123 Đường ABC",
    "phone": "0901234567",
    "open_time": "08:00",
    "close_time": "22:00"
  }
}
```

---

#### GET /api/settings

**Mô tả:** Lấy toàn bộ cài đặt hệ thống.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN, STAFF

---

#### PATCH /api/settings

**Mô tả:** Cập nhật cài đặt nhà hàng.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN

**Request Body:** Bất kỳ field nào trong bảng `settings` (xem mục Cơ sở dữ liệu)

---

#### POST /api/settings/logo

**Mô tả:** Upload logo nhà hàng.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN
**Content-Type:** `multipart/form-data`

**Request Body (form-data):**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `logo` | file | ✅ | File logo |

---

#### POST /api/settings/banners

**Mô tả:** Upload thêm banner (có thể nhiều file cùng lúc).
**Authentication:** Bắt buộc ✅
**Role:** ADMIN
**Content-Type:** `multipart/form-data`

**Request Body (form-data):**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `banners` | file[] | ✅ | Danh sách file banner |

---

#### DELETE /api/settings/banners

**Mô tả:** Xóa một banner khỏi danh sách.
**Authentication:** Bắt buộc ✅
**Role:** ADMIN

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `url` | string | ✅ | URL của banner cần xóa |

---

### Module: Admin — `/api/admin`

> Tất cả endpoint trong module này yêu cầu `requireAuth` + `requireAnyRole('ADMIN', 'STAFF')` trừ khi ghi chú khác.

---

#### GET /api/admin/dashboard

**Mô tả:** Thống kê tổng quan: tổng booking, doanh thu hôm nay, số user, số bàn.
**Role:** ADMIN, STAFF

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalBookings": 150,
    "totalRevenue": "25000000.00",
    "totalUsers": 50,
    "totalTables": 20,
    "revenueByDate": [
      { "date": "2025-12-25", "revenue": "3500000.00" }
    ]
  }
}
```

---

#### GET /api/admin/reservations

**Mô tả:** Lấy danh sách tất cả booking (admin view).
**Role:** ADMIN, STAFF

**Query Parameters:**

| Param | Type | Mô tả |
|---|---|---|
| `status` | string | Lọc theo trạng thái |
| `date` | string | Lọc theo ngày (YYYY-MM-DD) |
| `page` | number | Trang (mặc định: 1) |
| `pageSize` | number | Số lượng mỗi trang |

---

#### POST /api/admin/reservations/walk-in

**Mô tả:** Tạo booking walk-in tại chỗ (không cần tài khoản, ngay lập tức CHECKED_IN, tạo QR gọi món).
**Role:** ADMIN, STAFF

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `tableId` | number | ✅ | ID bàn gán (single, không phải mảng) |
| `guestName` | string | ❌ | Tên khách (mặc định: "Khách vãng lai") |
| `guestPhone` | string | ❌ | SĐT khách |
| `guests` | number | ❌ | Số người (mặc định: 2, tối đa: 99) |
| `bookingDate` | string | ❌ | Ngày (YYYY-MM-DD, mặc định: hôm nay) |
| `bookingTime` | string | ❌ | Giờ (HH:MM, mặc định: giờ hiện tại) |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "reservationId": 10,
    "walkIn": true,
    "status": "CHECKED_IN",
    "tableSession": {
      "orderUrl": "http://localhost:5173/order/table/abc...",
      "qrSvg": "<svg>..."
    }
  }
}
```

**Error Codes:**

| Code | Message | Nguyên nhân |
|---|---|---|
| 400 | tableId là bắt buộc | Thiếu tableId |
| 400 | Bàn đang đóng | Bàn ở trạng thái CLOSED |
| 400 | Bàn không trống | Bàn đang OCCUPIED hoặc RESERVED |
| 400 | Bàn đã có đơn khác | Xung đột cùng ngày giờ |
| 404 | Bàn không tồn tại | tableId không hợp lệ |

---

#### GET /api/admin/reservations/:id

**Mô tả:** Lấy chi tiết booking (kèm tables, order, payment).
**Role:** ADMIN, STAFF

---

#### GET /api/admin/reservations/:id/order-total

**Mô tả:** Tính tổng tiền order của booking.
**Role:** ADMIN, STAFF

**Response 200:**
```json
{ "success": true, "data": { "bookingId": 10, "amount": 170000 } }
```

---

#### GET /api/admin/reservations/:id/order-items

**Mô tả:** Lấy chi tiết danh sách món ăn trong order và thông tin thanh toán của booking.
**Role:** ADMIN, STAFF

**Path Params:**

| Param | Type | Mô tả |
|---|---|---|
| `id` | number | ID booking |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "order": { "id": 5, "status": "SERVING", "created_at": "2025-12-25T18:00:00Z" },
    "items": [
      {
        "id": 1,
        "quantity": 2,
        "price": "85000.00",
        "kitchen_status": "ACKNOWLEDGED",
        "kitchen_ack_at": "2025-12-25T18:05:00Z",
        "food_name": "Phở bò"
      }
    ],
    "payment": { "id": 3, "amount": "170000.00", "method": "cash", "status": "UNPAID", "paid_at": null }
  }
}
```

> Nếu booking chưa có order, trả về `{ "order": null, "items": [], "payment": null }`.

---

#### GET /api/admin/reservations/:id/order-qr

**Mô tả:** Lấy hoặc tạo mới QR code cho bàn (trả về URL + ảnh QR base64).
**Role:** ADMIN, STAFF

**Response 200:**
```json
{
  "success": true,
  "data": {
    "qr_token": "abc123...",
    "qr_url": "http://localhost:5173/order/table/abc123...",
    "qr_image": "data:image/png;base64,..."
  }
}
```

---

#### POST /api/admin/reservations/:id/assign-table

**Mô tả:** Gán bàn cho booking.
**Role:** ADMIN, STAFF

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `table_ids` | number[] | ✅ | Danh sách ID bàn |

---

#### POST /api/admin/reservations/:id/transfer-table

**Mô tả:** Chuyển khách sang bàn khác. Giữ nguyên QR/phiên nếu đã check-in, cập nhật `table_sessions.table_id`.
**Role:** ADMIN, STAFF

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `tableId` | number | ✅ | ID bàn đích (camelCase, không phải `new_table_id`) |
| `reason` | string | ❌ | Lý do chuyển bàn (được ghi vào `bookings.note`) |

> **Lưu ý:** Field là `tableId` (camelCase), không phải `new_table_id`.

---

#### POST /api/admin/reservations/:id/confirm

**Mô tả:** Xác nhận booking (PENDING → CONFIRMED).
**Role:** ADMIN, STAFF

---

#### POST /api/admin/reservations/:id/check-in

**Mô tả:** Check-in khách (CONFIRMED → CHECKED_IN), tự động tạo table_session + QR.
**Role:** ADMIN, STAFF

---

#### POST /api/admin/reservations/:id/cashier-pay

**Mô tả:** Ghi nhận thanh toán tại quầy. Tính tổng tiền từ order items, kiểm tra xung đột, cập nhật booking → COMPLETED, bàn → AVAILABLE, đóng QR session.
**Role:** ADMIN, STAFF

> Chỉ áp dụng cho booking đang ở trạng thái `CHECKED_IN`.

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `amount` | number | ❌ | Số tiền thu (nếu có, phải khớp tổng hóa đơn) |
| `transactionCode` | string | ❌ | Mã giao dịch (chuyển khoản) |
| `note` | string | ❌ | Ghi chú thanh toán |
| `tax` | number | ❌ | Thuế cộng thêm (VNĐ, mặc định: 0) |
| `discount` | number | ❌ | Giảm giá (VNĐ, mặc định: 0) |
| `surcharge` | number | ❌ | Phụ phí (VNĐ, mặc định: 0) |

**Công thức tổng tiền:** `finalTotal = foodTotal + surcharge + tax - discount`

**Response 200:**
```json
{ "success": true, "data": { "reservationId": 10, "status": "COMPLETED", "paymentId": 3, "amount": 170000 } }
```

**Error Codes:**

| Code | Message | Nguyên nhân |
|---|---|---|
| 400 | Đơn đặt bàn này đã được thanh toán | Booking đã COMPLETED |
| 400 | Đơn đặt bàn này đã bị hủy | Booking đã CANCELLED |
| 400 | Chỉ cho phép thanh toán đơn CHECKED_IN | Sai trạng thái booking |
| 400 | Số tiền thanh toán không khớp | `amount` sai so với tổng hóa đơn |
| 400 | Đơn hàng đã có bản ghi thanh toán PAID | Trùng thanh toán |

---

#### POST /api/admin/reservations/:id/release-guest

**Mô tả:** Hoàn tất booking (CHECKED_IN → COMPLETED), giải phóng bàn.
**Role:** ADMIN, STAFF

---

#### POST /api/admin/reservations/:id/confirm-online-payment

**Mô tả:** Admin xác nhận thanh toán online của khách (UNPAID → PAID).
**Role:** ADMIN, STAFF

---

#### POST /api/admin/reservations/:id/cancel

**Mô tả:** Admin hủy booking, giải phóng bàn liên quan.
**Role:** ADMIN, STAFF

---

#### GET /api/admin/menu-items

**Mô tả:** Lấy danh sách tất cả món ăn (bao gồm cả UNAVAILABLE).
**Role:** ADMIN, STAFF

---

#### POST /api/admin/menu-items

**Mô tả:** Tạo món ăn mới.
**Role:** ADMIN

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `name` | string | ✅ | Tên món |
| `price` | number | ✅ | Giá (VNĐ) |
| `category_id` | number | ✅ | ID danh mục |
| `description` | string | ❌ | Mô tả |
| `status` | string | ❌ | `AVAILABLE` / `UNAVAILABLE` (mặc định: AVAILABLE) |

---

#### POST /api/admin/menu-items/:id/image

**Mô tả:** Upload ảnh cho món ăn.
**Role:** ADMIN
**Content-Type:** `multipart/form-data`

**Request Body (form-data):**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `image` | file | ✅ | File ảnh |

---

#### PATCH /api/admin/menu-items/:id

**Mô tả:** Cập nhật thông tin món ăn.
**Role:** ADMIN

---

#### DELETE /api/admin/menu-items/:id

**Mô tả:** Xóa món ăn.
**Role:** ADMIN

---

#### POST /api/admin/menu-items/:id/toggle-active

**Mô tả:** Bật/tắt trạng thái hiển thị của món (AVAILABLE ↔ UNAVAILABLE).
**Role:** ADMIN, STAFF

---

#### GET /api/admin/categories

**Mô tả:** Lấy danh sách danh mục.
**Role:** ADMIN, STAFF

---

#### POST /api/admin/categories

**Mô tả:** Tạo danh mục mới.
**Role:** ADMIN

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `name` | string | ✅ | Tên danh mục (duy nhất) |

---

#### PATCH /api/admin/categories/:id

**Mô tả:** Đổi tên danh mục.
**Role:** ADMIN

---

#### DELETE /api/admin/categories/:id

**Mô tả:** Xóa danh mục.
**Role:** ADMIN

---

#### GET /api/admin/users

**Mô tả:** Lấy danh sách người dùng với phân trang và lọc.
**Role:** ADMIN

**Query Parameters:**

| Param | Type | Mô tả |
|---|---|---|
| `q` | string | Tìm kiếm theo tên hoặc email |
| `role` | string | Lọc theo role: `ADMIN` / `STAFF` / `CUSTOMER` |
| `status` | string | Lọc theo trạng thái: `ACTIVE` / `LOCKED` |
| `createdFrom` | string | Lọc từ ngày (YYYY-MM-DD) |
| `createdTo` | string | Lọc đến ngày (YYYY-MM-DD) |
| `page` | number | Trang (mặc định: 1) |
| `pageSize` | number | Số user mỗi trang (mặc định: 20) |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "users": [ { "id": 1, "name": "...", "email": "...", "role": "ADMIN", "status": "ACTIVE" } ],
    "meta": { "total": 50, "page": 1, "pageSize": 20, "totalPages": 3 }
  }
}
```

---

#### POST /api/admin/users

**Mô tả:** Admin tạo tài khoản STAFF hoặc ADMIN mới.
**Role:** ADMIN

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `name` | string | ✅ | Tên |
| `email` | string | ✅ | Email |
| `password` | string | ✅ | Mật khẩu ban đầu |
| `role` | string | ✅ | `STAFF` / `ADMIN` |
| `phone` | string | ❌ | SĐT |

---

#### PATCH /api/admin/users/:id

**Mô tả:** Cập nhật thông tin user (bao gồm đổi role, khóa/mở khóa tài khoản).
**Role:** ADMIN

**Request Body:** Bất kỳ field nào trong: `name`, `email`, `phone`, `role`, `status`, `password`

---

#### POST /api/admin/users/:id/avatar

**Mô tả:** Admin upload avatar cho user bất kỳ.
**Role:** ADMIN

---

#### DELETE /api/admin/users/:id

**Mô tả:** Xóa user.
**Role:** ADMIN

---

#### GET /api/admin/reports/revenue

**Mô tả:** Thống kê doanh thu theo khoảng thời gian, nhóm theo ngày/tháng/năm.
**Role:** ADMIN, STAFF

**Query Parameters:**

| Param | Type | Mô tả |
|---|---|---|
| `from` | string | Từ ngày (YYYY-MM-DD) |
| `to` | string | Đến ngày (YYYY-MM-DD) |
| `groupBy` | string | `day` / `month` / `year` (mặc định: `day`) |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "from": "2025-12-01",
    "to": "2025-12-31",
    "groupBy": "day",
    "total": 15000000,
    "invoiceCount": 42,
    "averageOrderValue": 357142.86,
    "previousTotal": 12000000,
    "growthPercent": 25.0,
    "previousRange": { "from": "2025-11-01", "to": "2025-11-30" },
    "series": [
      { "date": "2025-12-01", "revenue": "3500000" }
    ]
  }
}
```

---

#### GET /api/admin/reports/revenue/by-table

**Mô tả:** Doanh thu nhóm theo từng bàn (kèm danh sách hóa đơn của mỗi bàn).
**Role:** ADMIN, STAFF

**Query Parameters:** `from`, `to` (YYYY-MM-DD)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "tableId": 1,
      "tableName": "Bàn 01",
      "invoiceCount": 5,
      "total": "2500000",
      "invoices": [
        {
          "paymentId": 10,
          "orderId": 7,
          "amount": "500000",
          "method": "cash",
          "paidAt": "2025-12-01T18:30:00Z",
          "items": [
            { "foodName": "Phở bò", "quantity": 2, "unitPrice": "85000", "lineTotal": "170000" }
          ]
        }
      ]
    }
  ]
}
```

---

#### GET /api/admin/reports/revenue/invoices

**Mô tả:** Danh sách chi tiết từng hóa đơn thanh toán (trạng thái PAID) kèm từng dòng món.
**Role:** ADMIN, STAFF

**Query Parameters:** `from`, `to` (YYYY-MM-DD)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "paymentId": 10,
      "orderId": 7,
      "amount": "500000",
      "method": "cash",
      "paidAt": "2025-12-01T18:30:00Z",
      "items": [
        { "foodName": "Phở bò", "quantity": 2, "unitPrice": "85000", "lineTotal": "170000" }
      ]
    }
  ]
}
```

---

#### POST /api/admin/tables/:id/close

**Mô tả:** Đóng bàn để bảo trì (status → CLOSED).
**Role:** ADMIN, STAFF

---

#### POST /api/admin/tables/:id/reopen

**Mô tả:** Mở lại bàn đã đóng (status → AVAILABLE).
**Role:** ADMIN, STAFF

---

#### POST /api/admin/tables/layout/analyze-image

**Mô tả:** Phân tích ảnh sơ đồ mặt bằng để gợi ý vị trí bàn tự động.
**Role:** ADMIN, STAFF
**Content-Type:** `multipart/form-data`

**Request Body (form-data):**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `image` | file | ✅ | Ảnh sơ đồ (PNG/JPEG/GIF/WebP) |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "tables": [
      { "name": "Bàn 01", "pos_x": 100, "pos_y": 150, "capacity": 4 }
    ]
  }
}
```

---

#### PATCH /api/admin/tables/layout/bulk

**Mô tả:** Cập nhật vị trí (`pos_x`, `pos_y`) cho nhiều bàn cùng lúc — dùng khi lưu sơ đồ bàn.
**Role:** ADMIN, STAFF

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `layout` | array | ✅ | Danh sách: `[{ id, pos_x, pos_y }]` |

**Response 200:**
```json
{ "success": true, "data": { "message": "Cập nhật sơ đồ bàn thành công" } }
```

> **Lưu ý:** Thực thi trong transaction. Bỏ qua item không có `id` hợp lệ.

---

#### GET /api/admin/kitchen/orders

**Mô tả:** Lấy danh sách orders cần bếp xử lý (có item chưa ACK).
**Role:** ADMIN, STAFF

---

#### GET /api/admin/kitchen/orders/:orderId

**Mô tả:** Lấy chi tiết order cho kitchen display.
**Role:** ADMIN, STAFF

---

#### PATCH /api/admin/kitchen/order-items/:itemId/ack

**Mô tả:** Bếp xác nhận đã nhận một món (`kitchen_status` → `ACKNOWLEDGED`). Tự động gọi `deductIngredientsForFood()` để **trừ tồn kho nguyên liệu** theo `food_ingredients`.
**Role:** ADMIN, STAFF

**Response 200:**
```json
{ "success": true, "data": { "id": 1, "order_id": 5, "kitchen_status": "ACKNOWLEDGED", "kitchen_ack_at": "2025-12-25T18:05:00Z" } }
```

**Error Codes:**

| Code | Message | Nguyên nhân |
|---|---|---|
| 404 | Không tìm thấy dòng món hoặc đã xác nhận | itemId không tồn tại hoặc không còn PENDING |

---

#### PATCH /api/admin/kitchen/order-items/:itemId/serve

**Mô tả:** Bếp đánh dấu đã lên món (`kitchen_status` → `SERVED`). Chỉ áp dụng cho món trong phiên ACTIVE.
**Role:** ADMIN, STAFF

**Response 200:**
```json
{ "success": true, "data": { "id": 1, "order_id": 5, "kitchen_status": "SERVED", "kitchen_ack_at": "..." } }
```

---

#### POST /api/admin/kitchen/orders/:orderId/ack-all

**Mô tả:** Bếp xác nhận tất cả món còn PENDING trong order. Trừ tồn kho nguyên liệu cho từng món.
**Role:** ADMIN, STAFF

---

#### POST /api/admin/kitchen/orders/:orderId/confirm-payment

**Mô tả:** Nhân viên xác nhận đã thu tiền (UNPAID → PAID). Hoàn tất vòng đời: booking → COMPLETED, đóng QR session, bàn → AVAILABLE.
**Role:** ADMIN, STAFF

**Điều kiện:** Phải có bản ghi payment `status = 'UNPAID'` trong order.

**Response 200:**
```json
{
  "success": true,
  "data": { "payment": { "id": 3, "amount": "170000.00", "method": "cash", "status": "PAID" }, "tableReleased": true, "bookingCompleted": true }
}
```

**Error Codes:**

| Code | Message | Nguyên nhân |
|---|---|---|
| 400 | Không có yêu cầu thanh toán chờ thu | Không tìm thấy payment UNPAID |
| 404 | Không tìm thấy đơn hoặc phiên đã đóng | orderId không hợp lệ |

---

#### GET /api/admin/notifications

**Mô tả:** Lấy danh sách thông báo cho ADMIN/STAFF đang đăng nhập.
**Role:** ADMIN, STAFF

---

#### PATCH /api/admin/notifications/:id/read

**Mô tả:** Đánh dấu một thông báo là đã đọc.
**Role:** ADMIN, STAFF

---

#### POST /api/admin/notifications/read-all

**Mô tả:** Đánh dấu tất cả thông báo là đã đọc.
**Role:** ADMIN, STAFF

---

### Module: Admin — Ingredients (Kho Nguyên Liệu) — `/api/admin/ingredients`

> Tất cả endpoint yêu cầu `requireAuth` + `requireAnyRole('ADMIN', 'STAFF')` trừ khi ghi chú khác.

---

#### GET /api/admin/ingredients/units

**Mô tả:** Lấy danh sách đơn vị tính (kg, g, lít, cái...).
**Role:** ADMIN, STAFF

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "kg", "created_at": "2025-01-01T00:00:00Z" }
  ]
}
```

---

#### POST /api/admin/ingredients/units

**Mô tả:** Tạo đơn vị tính mới (không lỗi nếu đã tồn tại — trả về unit hiện có).
**Role:** ADMIN

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `name` | string | ✅ | Tên đơn vị (duy nhất, không phân biệt hoa thường) |

**Response 201:**
```json
{ "success": true, "data": { "id": 2, "name": "lít", "created_at": "..." } }
```

---

#### DELETE /api/admin/ingredients/units/:id

**Mô tả:** Xóa đơn vị tính.
**Role:** ADMIN

**Response 200:**
```json
{ "success": true, "data": { "id": 2, "deleted": true } }
```

**Error Codes:**

| Code | Message | Nguyên nhân |
|---|---|---|
| 404 | Không tìm thấy đơn vị tính | ID không tồn tại |

---

#### GET /api/admin/ingredients/imports/recent

**Mô tả:** Lấy danh sách lần nhập kho gần nhất (tối đa 50 bản ghi), dùng cho widget dashboard.
**Role:** ADMIN, STAFF

**Query Parameters:**

| Param | Type | Required | Mô tả |
|---|---|---|---|
| `limit` | number | ❌ | Số bản ghi tối đa (mặc định: 10, tối đa: 50) |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "quantity": 5,
      "note": "Nhập thứ 2 hàng tuần",
      "import_date": "2025-12-25T08:00:00Z",
      "ingredient_name": "Thịt bò",
      "ingredient_unit": "kg"
    }
  ]
}
```

---

#### GET /api/admin/ingredients

**Mô tả:** Lấy danh sách tất cả nguyên liệu kèm tình trạng tồn kho.
**Role:** ADMIN, STAFF

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Thịt bò",
      "unit": "kg",
      "stock_quantity": 10,
      "min_stock_alert": 2,
      "status": "Còn hàng",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

> **Trạng thái tính năng:** `status` được tính theo quy tắc:
> - `"Hết hàng"` — `stock_quantity <= 0`
> - `"Sắp hết"` — `0 < stock_quantity <= min_stock_alert`
> - `"Còn hàng"` — `stock_quantity > min_stock_alert`

---

#### POST /api/admin/ingredients

**Mô tả:** Tạo nguyên liệu mới. Nếu `stock_quantity > 0`, tự động ghi một bản ghi nhập kho ban đầu.
**Role:** ADMIN

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `name` | string | ✅ | Tên nguyên liệu |
| `unit` | string | ✅ | Đơn vị tính (ví dụ: `kg`, `lít`) |
| `stock_quantity` | number | ❌ | Số lượng tồn ban đầu (mặc định: 0) |
| `min_stock_alert` | number | ❌ | Ngưỡng cảnh báo sắp hết (mặc định: 0) |

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Thịt bò",
    "unit": "kg",
    "stock_quantity": 10,
    "min_stock_alert": 2,
    "status": "Còn hàng",
    "created_at": "2025-12-25T00:00:00Z"
  }
}
```

**Error Codes:**

| Code | Message | Nguyên nhân |
|---|---|---|
| 400 | Tên nguyên liệu là bắt buộc | Thiếu `name` |
| 400 | Đơn vị tính là bắt buộc | Thiếu `unit` |
| 400 | Số lượng tồn ban đầu không được âm | `stock_quantity < 0` |
| 400 | Ngưỡng cảnh báo không được âm | `min_stock_alert < 0` |

---

#### PATCH /api/admin/ingredients/:id

**Mô tả:** Cập nhật thông tin nguyên liệu (tên, đơn vị, ngưỡng cảnh báo).
**Role:** ADMIN

**Path Params:**

| Param | Type | Mô tả |
|---|---|---|
| `id` | number | ID nguyên liệu |

**Request Body:** Tương tự POST (tất cả field đều bắt buộc khi update).

**Response 200:** Trả về nguyên liệu đã cập nhật (cùng format với GET).

**Error Codes:**

| Code | Message | Nguyên nhân |
|---|---|---|
| 404 | Không tìm thấy nguyên liệu | ID không tồn tại |

---

#### DELETE /api/admin/ingredients/:id

**Mô tả:** Xóa nguyên liệu. Không được xóa nếu nguyên liệu đang liên kết với món ăn.
**Role:** ADMIN

**Response 200:**
```json
{ "success": true, "data": { "id": 5, "deleted": true } }
```

**Error Codes:**

| Code | Message | Nguyên nhân |
|---|---|---|
| 400 | Không thể xoá nguyên liệu đã liên kết với món ăn | FK constraint 23503 |
| 404 | Không tìm thấy nguyên liệu | ID không tồn tại |

---

#### POST /api/admin/ingredients/:id/import

**Mô tả:** Nhập thêm hàng vào kho (cộng dồn `stock_quantity`). Ghi lịch sử nhập kho.
**Role:** ADMIN

**Path Params:**

| Param | Type | Mô tả |
|---|---|---|
| `id` | number | ID nguyên liệu |

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `quantity` | number | ✅ | Số lượng nhập (> 0) |
| `note` | string | ❌ | Ghi chú lần nhập này |

**Response 200:** Trả về nguyên liệu sau khi cập nhật tồn kho.

**Error Codes:**

| Code | Message | Nguyên nhân |
|---|---|---|
| 400 | Số lượng nhập phải lớn hơn 0 | `quantity <= 0` |
| 404 | Không tìm thấy nguyên liệu | ID không tồn tại |

---

#### GET /api/admin/ingredients/:id/imports

**Mô tả:** Xem lịch sử nhập kho của một nguyên liệu (mới nhất trước).
**Role:** ADMIN, STAFF

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "quantity": 5,
      "note": "Nhập thứ 2 hàng tuần",
      "import_date": "2025-12-25T08:00:00Z"
    }
  ]
}
```

---

## 3. Cơ sở dữ liệu


### Tổng quan

| Thuộc tính | Giá trị |
|---|---|
| Loại database | PostgreSQL 14+ |
| ORM / Query Builder | Không dùng ORM — raw SQL qua `pg` (node-postgres) |
| Connection | Connection pool (`pg.Pool`), cấu hình qua biến môi trường `PG*` |
| Schema init | Tự động qua `ensureDbSchema()` khi server khởi động |
| Migration strategy | Không có migration files — schema idempotent (CREATE IF NOT EXISTS) |

---

### Sơ đồ ERD

```mermaid
erDiagram
    roles {
        SERIAL id PK
        VARCHAR_50 name UK
    }

    users {
        SERIAL id PK
        VARCHAR_100 name
        VARCHAR_150 email UK
        TEXT password
        VARCHAR_20 phone
        TEXT avatar_url
        VARCHAR_10 status
        INT role_id FK
        TIMESTAMP created_at
    }

    zones {
        SERIAL id PK
        VARCHAR_100 name UK
        TIMESTAMP created_at
    }

    tables {
        SERIAL id PK
        VARCHAR_100 name
        INT capacity
        VARCHAR_20 status
        TEXT image_url
        TEXT status_note
        TEXT zone
        INT pos_x
        INT pos_y
        BOOLEAN is_deleted
        TIMESTAMP created_at
    }

    categories {
        SERIAL id PK
        VARCHAR_100 name
    }

    foods {
        SERIAL id PK
        VARCHAR_150 name
        DECIMAL_14_2 price
        TEXT description
        TEXT image_url
        INT category_id FK
        VARCHAR_20 status
        TIMESTAMP created_at
    }

    bookings {
        SERIAL id PK
        INT user_id FK
        DATE booking_date
        TIME booking_time
        INT guests
        VARCHAR_30 status
        TIMESTAMP hold_expires_at
        TEXT note
        VARCHAR_100 guest_name
        VARCHAR_20 guest_phone
        TIMESTAMP created_at
    }

    booking_tables {
        SERIAL id PK
        INT booking_id FK
        INT table_id FK
    }

    table_sessions {
        SERIAL id PK
        INT table_id FK
        INT booking_id FK
        VARCHAR_96 qr_token UK
        VARCHAR_20 status
        TIMESTAMP created_at
        TIMESTAMP closed_at
    }

    orders {
        SERIAL id PK
        INT booking_id FK
        INT table_session_id FK
        VARCHAR_20 status
        TIMESTAMP created_at
    }

    order_items {
        SERIAL id PK
        INT order_id FK
        INT food_id FK
        INT quantity
        DECIMAL_14_2 price
        TEXT note
        VARCHAR_20 kitchen_status
        TIMESTAMP kitchen_ack_at
    }

    payments {
        SERIAL id PK
        INT order_id FK
        INT cashier_id FK
        DECIMAL_14_2 amount
        VARCHAR_20 method
        VARCHAR_20 status
        TIMESTAMP paid_at
        TEXT transaction_code
        TEXT note
        DECIMAL_14_2 tax
        DECIMAL_14_2 discount
        DECIMAL_14_2 surcharge
    }

    notifications {
        SERIAL id PK
        INT user_id FK
        TEXT message
        BOOLEAN is_read
        TIMESTAMP created_at
    }

    password_reset_tokens {
        SERIAL id PK
        INT user_id FK
        TEXT token_hash UK
        TIMESTAMP expires_at
        TIMESTAMP used_at
        TIMESTAMP created_at
    }

    settings {
        SERIAL id PK
        VARCHAR restaurant_name
        TEXT logo_url
        TEXT_ARRAY banner_urls
        BOOLEAN banner_enabled
        VARCHAR_20 banner_mode
        BOOLEAN banner_show_on_home
        BOOLEAN banner_show_on_auth
        VARCHAR header_cta_label
        TEXT header_cta_url
        TEXT footer_tagline
        TEXT footer_copyright
        JSONB footer_links
        JSONB social_links
        INT total_tables
        TEXT address
        VARCHAR phone
        VARCHAR email
        TIME open_time
        TIME close_time
        TEXT payment_bank_account
        TEXT payment_bank_code
        TEXT payment_transfer_content
        TEXT payment_qr_template
        TEXT hero_eyebrow
        TEXT hero_lead
        TEXT hero_meta
        TEXT home_features_title
        TEXT home_features_desc
        TEXT home_cta_title
        TEXT home_cta_text
        TEXT home_features_json
        TIMESTAMP updated_at
    }

    ingredient_units {
        SERIAL id PK
        VARCHAR_50 name UK
        TIMESTAMP created_at
    }

    ingredients {
        SERIAL id PK
        VARCHAR_150 name
        VARCHAR_50 unit
        DECIMAL_14_2 stock_quantity
        DECIMAL_14_2 min_stock_alert
        TIMESTAMP created_at
    }

    ingredient_imports {
        SERIAL id PK
        INT ingredient_id FK
        DECIMAL_14_2 quantity
        TEXT note
        TIMESTAMP import_date
    }

    food_ingredients {
        SERIAL id PK
        INT food_id FK
        INT ingredient_id FK
        DECIMAL_14_2 quantity_needed
    }

    roles ||--o{ users : "has"
    users ||--o{ bookings : "makes"
    users ||--o{ notifications : "receives"
    users ||--o{ password_reset_tokens : "has"
    categories ||--o{ foods : "contains"
    bookings ||--o{ booking_tables : "assigned to"
    tables ||--o{ booking_tables : "used in"
    bookings ||--o{ table_sessions : "has"
    tables ||--o{ table_sessions : "hosts"
    bookings ||--o{ orders : "generates"
    table_sessions ||--o{ orders : "generates"
    orders ||--o{ order_items : "contains"
    foods ||--o{ order_items : "referenced by"
    orders ||--o{ payments : "settled by"
    ingredients ||--o{ ingredient_imports : "has history"
    ingredients ||--o{ food_ingredients : "used in"
    foods ||--o{ food_ingredients : "requires"
```

---

### Chi tiết các bảng

#### Bảng `roles`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `name` | VARCHAR(50) | NO | — | Tên role: `ADMIN`, `STAFF`, `CUSTOMER` |

**Seed data mặc định:** `ADMIN`, `STAFF`, `CUSTOMER`

---

#### Bảng `users`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `name` | VARCHAR(100) | YES | NULL | Tên hiển thị |
| `email` | VARCHAR(150) | NO | — | Email đăng nhập (UNIQUE) |
| `password` | TEXT | YES | NULL | Mật khẩu đã hash (bcrypt) |
| `phone` | VARCHAR(20) | YES | NULL | Số điện thoại |
| `avatar_url` | TEXT | YES | NULL | Đường dẫn ảnh đại diện |
| `status` | VARCHAR(10) | NO | `'ACTIVE'` | `ACTIVE` / `LOCKED` |
| `role_id` | INT | YES | NULL | FK → `roles.id` |
| `created_at` | TIMESTAMP WITH TZ | NO | `NOW()` | Thời gian tạo |

**Indexes:** `users_email_key` (UNIQUE trên `email`)

---

#### Bảng `settings`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `restaurant_name` | VARCHAR(200) | YES | NULL | Tên nhà hàng |
| `logo_url` | TEXT | YES | NULL | URL logo |
| `banner_urls` | TEXT[] | YES | `'{}'` | Mảng URL banner |
| `banner_enabled` | BOOLEAN | YES | `true` | Hiển thị banner |
| `banner_mode` | VARCHAR(20) | YES | `'carousel'` | Chế độ: `carousel` / `static` |
| `header_cta_label` | VARCHAR(100) | YES | NULL | Nhãn nút CTA header |
| `header_cta_url` | TEXT | YES | NULL | URL nút CTA header |
| `footer_about` | TEXT | YES | NULL | Mô tả footer |
| `footer_links` | JSONB | YES | `'[]'` | Danh sách link footer |
| `address` | TEXT | YES | NULL | Địa chỉ nhà hàng |
| `phone` | VARCHAR(30) | YES | NULL | SĐT nhà hàng |
| `email` | VARCHAR(150) | YES | NULL | Email nhà hàng |
| `open_time` | VARCHAR(10) | YES | NULL | Giờ mở cửa (HH:MM) |
| `close_time` | VARCHAR(10) | YES | NULL | Giờ đóng cửa (HH:MM) |
| `payment_bank_name` | VARCHAR(100) | YES | NULL | Tên ngân hàng |
| `payment_account_number` | VARCHAR(50) | YES | NULL | Số tài khoản |
| `payment_account_name` | VARCHAR(100) | YES | NULL | Tên chủ tài khoản |
| `payment_qr_url` | TEXT | YES | NULL | QR chuyển khoản |
| `home_features_title` | VARCHAR(200) | YES | NULL | Tiêu đề khu vực tính năng |
| `home_features_items` | JSONB | YES | `'[]'` | Danh sách tính năng trang chủ |
| `social_links` | JSONB | YES | `'{}'` | Link mạng xã hội |
| `hero_title` | VARCHAR(300) | YES | NULL | Tiêu đề hero section |
| `hero_subtitle` | TEXT | YES | NULL | Phụ đề hero section |
| `hero_cta_label` | VARCHAR(100) | YES | NULL | Nhãn nút CTA hero |
| `hero_cta_url` | TEXT | YES | NULL | URL nút CTA hero |
| `hero_eyebrow` | TEXT | YES | NULL | Dòng nhãn trên tiêu đề hero |
| `hero_lead` | TEXT | YES | NULL | Mỏ tả ngắn hero section |
| `hero_meta` | TEXT | YES | NULL | Metadata/tag hiển thị trên hero |
| `hero_panel_tag` | TEXT | YES | NULL | Nhãn panel trên hero |
| `banner_show_on_home` | BOOLEAN | YES | `true` | Hiển thị banner trên trang chủ |
| `banner_show_on_auth` | BOOLEAN | YES | `true` | Hiển thị banner trang đăng nhập |
| `footer_tagline` | TEXT | YES | NULL | Khẩu hiệu footer |
| `footer_copyright` | TEXT | YES | NULL | Thông tin bản quyền footer |
| `total_tables` | INT | YES | NULL | Tổng số bàn (cài đặt hiển thị) |
| `payment_bank_account` | TEXT | YES | NULL | Số tài khoản ngân hàng |
| `payment_bank_code` | TEXT | YES | NULL | Mã ngân hàng (VD: `VCB`, `TCB`) |
| `payment_transfer_content` | TEXT | YES | NULL | Nội dung chuyển khoản mặc định |
| `payment_qr_template` | TEXT | YES | NULL | Template QR chuyển khoản |
| `home_features_desc` | TEXT | YES | NULL | Mô tả khu vực tính năng |
| `home_cta_title` | TEXT | YES | NULL | Tiêu đề khu vực CTA trang chủ |
| `home_cta_text` | TEXT | YES | NULL | Văn bản mô tả CTA trang chủ |
| `home_features_json` | TEXT | YES | NULL | JSON cấu hình tính năng trang chủ (ghi đè `home_features_items`) |
| `system_email` | TEXT | YES | NULL | Email hệ thống gửi |
| `system_email_password` | TEXT | YES | NULL | Mật khẩu email hệ thống |
| `updated_at` | TIMESTAMP | YES | `NOW()` | Lần cập nhật cuối |

---

#### Bảng `zones`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `name` | VARCHAR(100) | NO | — | Tên khu vực (UNIQUE) |
| `created_at` | TIMESTAMP WITH TZ | NO | `NOW()` | Thời gian tạo |

---

#### Bảng `tables`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `name` | VARCHAR(100) | NO | — | Tên bàn |
| `capacity` | INT | NO | — | Số chỗ ngồi |
| `status` | VARCHAR(20) | NO | `'AVAILABLE'` | `AVAILABLE` / `RESERVED` / `OCCUPIED` / `CLOSED` |
| `image_url` | TEXT | YES | NULL | Ảnh bàn |
| `status_note` | TEXT | YES | NULL | Ghi chú trạng thái |
| `zone` | TEXT | YES | NULL | Tên khu vực |
| `pos_x` | INT | YES | NULL | Tọa độ X trên sơ đồ |
| `pos_y` | INT | YES | NULL | Tọa độ Y trên sơ đồ |
| `is_deleted` | BOOLEAN | NO | `false` | Soft-delete flag (khi xóa bàn) |
| `created_at` | TIMESTAMP WITH TZ | NO | `NOW()` | Thời gian tạo |

**Enum `status`:** `AVAILABLE`, `RESERVED`, `OCCUPIED`, `CLOSED`

> **Soft-delete:** Bàn bị xóa qua `DELETE /api/tables/:id` không bị xóa khỏi DB mà được đặt `is_deleted = true`. Các query đọc dữ liệu bàn đều thêm điều kiện `AND is_deleted = false`.

---

#### Bảng `categories`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `name` | VARCHAR(100) | NO | — | Tên danh mục |

---

#### Bảng `foods`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `name` | VARCHAR(150) | NO | — | Tên món ăn |
| `price` | DECIMAL(14,2) | NO | — | Giá bán (VNĐ) |
| `description` | TEXT | YES | NULL | Mô tả món |
| `image_url` | TEXT | YES | NULL | Ảnh món ăn |
| `category_id` | INT | YES | NULL | FK → `categories.id` |
| `status` | VARCHAR(20) | NO | `'AVAILABLE'` | `AVAILABLE` / `UNAVAILABLE` |
| `created_at` | TIMESTAMP WITH TZ | NO | `NOW()` | Thời gian tạo |

---

#### Bảng `bookings`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `user_id` | INT | YES | NULL | FK → `users.id` (NULL nếu khách vãng lai) |
| `booking_date` | DATE | NO | — | Ngày đặt bàn |
| `booking_time` | TIME | NO | — | Giờ đặt bàn |
| `guests` | INT | NO | — | Số người |
| `status` | VARCHAR(30) | NO | `'PENDING'` | Xem enum bên dưới |
| `hold_expires_at` | TIMESTAMP WITH TZ | YES | NULL | Thời điểm hết hạn giữ bàn |
| `note` | TEXT | YES | NULL | Ghi chú của khách |
| `guest_name` | VARCHAR(100) | YES | NULL | Tên khách vãng lai |
| `guest_phone` | VARCHAR(20) | YES | NULL | SĐT khách vãng lai |
| `created_at` | TIMESTAMP WITH TZ | NO | `NOW()` | Thời gian tạo |

**Enum `status`:** `PENDING`, `CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`, `HOLD`

**Vòng đời booking:**
```
PENDING → CONFIRMED → CHECKED_IN → COMPLETED
        ↘ CANCELLED
PENDING → HOLD → (hết hạn tự động) → CANCELLED
               → CONFIRMED
```

---

#### Bảng `booking_tables`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `booking_id` | INT | NO | — | FK → `bookings.id` ON DELETE CASCADE |
| `table_id` | INT | NO | — | FK → `tables.id` |

---

#### Bảng `table_sessions`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `table_id` | INT | YES | NULL | FK → `tables.id` |
| `booking_id` | INT | YES | NULL | FK → `bookings.id` |
| `qr_token` | VARCHAR(96) | NO | — | Token QR duy nhất (UNIQUE) |
| `status` | VARCHAR(20) | NO | `'ACTIVE'` | `ACTIVE` / `CLOSED` |
| `created_at` | TIMESTAMP WITH TZ | NO | `NOW()` | Thời gian tạo |
| `closed_at` | TIMESTAMP WITH TZ | YES | NULL | Thời điểm đóng session |

---

#### Bảng `orders`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `booking_id` | INT | YES | NULL | FK → `bookings.id` |
| `table_session_id` | INT | YES | NULL | FK → `table_sessions.id` |
| `status` | VARCHAR(20) | NO | `'PENDING'` | `PENDING` / `SERVING` / `DONE` |
| `created_at` | TIMESTAMP WITH TZ | NO | `NOW()` | Thời gian tạo |

---

#### Bảng `order_items`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `order_id` | INT | NO | — | FK → `orders.id` ON DELETE CASCADE |
| `food_id` | INT | YES | NULL | FK → `foods.id` |
| `quantity` | INT | NO | — | Số lượng |
| `price` | DECIMAL(14,2) | NO | — | Giá tại thời điểm đặt (snapshot) |
| `note` | TEXT | YES | NULL | Ghi chú của khách khi thêm món |
| `kitchen_status` | VARCHAR(20) | NO | `'PENDING'` | `PENDING` → `ACKNOWLEDGED` → `SERVED` |
| `kitchen_ack_at` | TIMESTAMP WITH TZ | YES | NULL | Thời điểm bếp xác nhận (ack) |

**Vòng đời `kitchen_status`:**
```
PENDING → ACKNOWLEDGED (bếp nhận làm, trừ tồn kho)
        → SERVED (bếp lên món)
```

---

#### Bảng `payments`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `order_id` | INT | YES | NULL | FK → `orders.id` |
| `amount` | DECIMAL(14,2) | NO | — | Số tiền thanh toán |
| `method` | VARCHAR(20) | NO | — | `cash` / `bank_transfer` |
| `status` | VARCHAR(20) | NO | `'UNPAID'` | `UNPAID` / `PAID` |
| `paid_at` | TIMESTAMP WITH TZ | YES | NULL | Thời điểm thanh toán |
| `transaction_code` | TEXT | YES | NULL | Mã giao dịch (chuyển khoản) |
| `cashier_id` | INT | YES | NULL | FK → `users.id` — nhân viên thu ngân |
| `note` | TEXT | YES | NULL | Ghi chú thanh toán |
| `tax` | DECIMAL(14,2) | YES | `0` | Thuế cộng thêm |
| `discount` | DECIMAL(14,2) | YES | `0` | Giảm giá |
| `surcharge` | DECIMAL(14,2) | YES | `0` | Phụ phí |

> **Lưu ý:** Các cột `transaction_code`, `cashier_id`, `note`, `tax`, `discount`, `surcharge` được thêm vào bởi `ensureDbSchema()` qua `ALTER TABLE ADD COLUMN IF NOT EXISTS` — đảm bảo tương thích ngược với DB cũ.

---

#### Bảng `notifications`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `user_id` | INT | YES | NULL | FK → `users.id` |
| `message` | TEXT | NO | — | Nội dung thông báo |
| `is_read` | BOOLEAN | NO | `false` | Đã đọc chưa |
| `created_at` | TIMESTAMP WITH TZ | NO | `NOW()` | Thời gian tạo |

---

#### Bảng `password_reset_tokens`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `user_id` | INT | NO | — | FK → `users.id` ON DELETE CASCADE |
| `token_hash` | TEXT | NO | — | SHA-256 hash của token (UNIQUE) |
| `expires_at` | TIMESTAMP WITH TZ | NO | — | Hết hạn sau 30 phút |
| `used_at` | TIMESTAMP WITH TZ | YES | NULL | Thời điểm đã sử dụng |
| `created_at` | TIMESTAMP WITH TZ | NO | `NOW()` | Thời gian tạo |

---

#### Bảng `ingredient_units`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `name` | VARCHAR(50) | NO | — | Tên đơn vị tính (UNIQUE): `kg`, `g`, `lít`, `ml`, `hộp`, `cái`, `lon`, `chai` |
| `created_at` | TIMESTAMP | NO | `NOW()` | Thời gian tạo |

**Seed data mặc định:** `kg`, `g`, `lít`, `ml`, `hộp`, `cái`, `lon`, `chai`

---

#### Bảng `ingredients`

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `name` | VARCHAR(150) | NO | — | Tên nguyên liệu |
| `unit` | VARCHAR(50) | NO | — | Đơn vị tính (ví dụ: `kg`, `lít`) |
| `stock_quantity` | DECIMAL(14,2) | NO | `0` | Số lượng tồn kho hiện tại |
| `min_stock_alert` | DECIMAL(14,2) | NO | `0` | Ngưỡng cảnh báo sắp hết |
| `created_at` | TIMESTAMP | NO | `NOW()` | Thời gian tạo |

---

#### Bảng `ingredient_imports`

Lưu lịch sử mỗi lần nhập kho (cộng dồn `ingredients.stock_quantity`).

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `ingredient_id` | INT | YES | NULL | FK → `ingredients.id` ON DELETE CASCADE |
| `quantity` | DECIMAL(14,2) | NO | — | Số lượng nhập mỗi lần |
| `note` | TEXT | YES | NULL | Ghi chú lần nhập |
| `import_date` | TIMESTAMP | NO | `NOW()` | Thời điểm nhập kho |

---

#### Bảng `food_ingredients`

Liên kết món ăn với các nguyên liệu cần dùng.

| Tên cột | Kiểu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Khóa chính |
| `food_id` | INT | YES | NULL | FK → `foods.id` ON DELETE CASCADE |
| `ingredient_id` | INT | YES | NULL | FK → `ingredients.id` ON DELETE RESTRICT |
| `quantity_needed` | DECIMAL(14,2) | NO | `1` | Lượng nguyên liệu cần cho 1 phần món |

---

### Ghi chú về Migration Strategy

> Dự án không sử dụng migration framework (Flyway, Liquibase, db-migrate...). Thay vào đó, hàm `ensureDbSchema()` trong [config/db.js](../src/config/db.js) được gọi mỗi khi server khởi động. Hàm này dùng `CREATE TABLE IF NOT EXISTS` và `INSERT ... ON CONFLICT DO NOTHING` để đảm bảo tính idempotent.
>
> **Hạn chế:** Nếu cần thay đổi schema (đổi tên cột, thêm cột vào bảng đã có), cần thực thi SQL thủ công trên database production trước khi deploy.

---

## 4. Biến môi trường

### Server

| Variable | Type | Required | Default | Mô tả | Ví dụ |
|---|---|---|---|---|---|
| `PORT` | number | ❌ | `5000` | Cổng server lắng nghe | `5000` |
| `HOST` | string | ❌ | `undefined` | Địa chỉ IP bind (mặc định lắng nghe tất cả interface) | `127.0.0.1` |
| `FRONTEND_URL` | string | ✅ | — | URL frontend (dùng cho CORS + link email) | `http://localhost:5173` |

---

### Database (PostgreSQL)

> **Ưu tiên kết nối:** Server kiểm tra `DATABASE_URL` trước. Nếu đã có thì dùng connection string đó; không thì đọc từng biến `PG*`.

| Variable | Type | Required | Default | Mô tả | Ví dụ |
|---|---|---|---|---|---|
| `DATABASE_URL` | string | ❌ | — | Connection string đầy đủ (thay thế các biến `PG*`) | `postgresql://user:pass@host:5432/db` |
| `PGHOST` | string | ✅\* | `127.0.0.1` | Host PostgreSQL | `localhost` |
| `PGPORT` | number | ❌ | `5432` | Port PostgreSQL | `5432` |
| `PGUSER` | string | ✅\* | `postgres` | Username kết nối | `postgres` |
| `PGPASSWORD` | string | ✅\* | `""` | Password kết nối | `secretpassword` |
| `PGDATABASE` | string | ✅\* | `postgres` | Tên database | `restaurant_db` |

> \* Bắt buộc khi không dùng `DATABASE_URL`.

---

### Authentication (JWT)

| Variable | Type | Required | Default | Mô tả | Ví dụ |
|---|---|---|---|---|---|
| `JWT_SECRET` | string | ✅ | — | Khóa bí mật ký JWT (≥ 32 ký tự ngẫu nhiên) | `ee170b4ba742d728...` |
| `JWT_EXPIRES_IN` | string | ❌ | `7d` | Thời hạn JWT | `7d`, `24h`, `30m` |
| `APP_SECRET` | string | ✅ | — | Khóa bí mật ứng dụng dùng cho các mục đích khác | `8d9804cb2384813f...` |

---

### Email (SMTP)

| Variable | Type | Required | Default | Mô tả | Ví dụ |
|---|---|---|---|---|---|
| `SMTP_HOST` | string | ❌ | — | Host SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | number | ❌ | `465` | Port SMTP | `465` (SSL), `587` (TLS) |
| `SMTP_SECURE` | boolean | ❌ | `true` | Dùng SSL/TLS | `true` |
| `SMTP_USER` | string | ❌ | — | Tài khoản email gửi | `noreply@restaurant.com` |
| `SMTP_PASS` | string | ❌ | — | Mật khẩu ứng dụng email | `xxxx xxxx xxxx xxxx` |
| `MAIL_FROM` | string | ❌ | — | Địa chỉ "From" trong email | `LuxEat <noreply@restaurant.com>` |

> Nếu không cấu hình SMTP, hệ thống sẽ in nội dung email ra console thay vì gửi thực (fallback preview mode).

---

> ⚠️ **Lưu ý Vision API:** Nếu tích hợp Vision API cho tính năng phân tích sơ đồ bàn (`/api/admin/tables/layout/analyze-image`), cần thêm biến môi trường cho API key tương ứng. Hiện tại `tableLayoutVision.service.js` có fallback về thuật toán grid-based nếu không có API key.

---

## 5. Background Jobs

Server tự động chạy một số tiến trình nền ngay sau khi khởi động.

---

### Job: Tự hủy HOLD booking hết hạn

| Thuộc tính | Giá trị |
|---|---|
| **Kích hoạt** | Mỗi 60 giây (`setInterval`, chạy trong `server.js`) |
| **Logic** | Tìm tất cả booking có `status = 'HOLD'` và `hold_expires_at <= NOW()` |
| **Hành động** | 1. Giải phóng bàn đã giữ (`tables.status` → `AVAILABLE`) 2. Xóa `booking_tables` tương ứng 3. Đặt booking `status = 'CANCELLED'`, `hold_expires_at = NULL` |
| **Giới hạn** | Xử lý tối đa 200 booking hết hạn mỗi lần chạy |
| **Lỗi** | Bỏ qua silently (không crash server) |

**Luồng giữ bàn (HOLD flow):**
```
1. Khách gọi POST /api/reservations/:id/hold { tableId }
2. booking.status → HOLD, hold_expires_at = NOW() + 15 phút
3. bàn.status → RESERVED
4a. Khách hoàn tất thanh toán → admin xác nhận → CONFIRMED
4b. Hết 15 phút không làm gì → background job hủy → CANCELLED, bàn → AVAILABLE
```

---

### Job: Khởi tạo Schema cơ sở dữ liệu

| Thuộc tính | Giá trị |
|---|---|
| **Khi nào chạy** | Một lần duy nhất khi server khởi động (trước khi `app.listen`) |
| **Hàm** | `ensureDbSchema()` trong `src/config/db.js` |
| **Logic** | `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS` + seed data mặc định |
| **Thất bại** | Nếu `ensureDbSchema()` thất bại, server thoát ngay (`process.exit(1)`) |

**Seed data tự động:**
- Bảng `roles`: `ADMIN`, `STAFF`, `CUSTOMER`
- Bảng `ingredient_units`: `kg`, `g`, `lít`, `ml`, `hộp`, `cái`, `lon`, `chai`
- Bảng `settings`: Chèn 1 row id=1 nếu chưa tồn tại

---
