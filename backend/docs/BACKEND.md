# Tài Liệu Backend — PM Restaurant Management System

> Phiên bản tài liệu: 1.0.0 · Ngày tạo: 2026-05-19

---

## Mục lục

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [API Reference](#2-api-reference)
3. [Cơ sở dữ liệu](#3-cơ-sở-dữ-liệu)
4. [Biến môi trường](#4-biến-môi-trường)

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
│   │       └── tableLayout.admin.controller.js
│   ├── services/                 # Logic nghiệp vụ phức tạp / tích hợp bên ngoài
│   │   ├── tableSession.service.js   # Quản lý vòng đời QR session
│   │   ├── mail.service.js           # Gửi email qua SMTP
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
| `tableId` | number | ✅ | ID bàn muốn giữ |

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
    "total_bookings_today": 12,
    "revenue_today": "3500000.00",
    "total_users": 150,
    "total_tables": 20,
    "pending_bookings": 5
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

**Mô tả:** Tạo booking walk-in tại chỗ (không cần tài khoản, ngay lập tức CHECKED_IN).
**Role:** ADMIN, STAFF

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `guest_name` | string | ✅ | Tên khách |
| `guest_phone` | string | ❌ | SĐT khách |
| `guests` | number | ✅ | Số người |
| `table_ids` | number[] | ✅ | Danh sách ID bàn gán |
| `note` | string | ❌ | Ghi chú |

---

#### GET /api/admin/reservations/:id

**Mô tả:** Lấy chi tiết booking (kèm tables, order, payment).
**Role:** ADMIN, STAFF

---

#### GET /api/admin/reservations/:id/order-total

**Mô tả:** Tính tổng tiền order của booking.
**Role:** ADMIN, STAFF

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

**Mô tả:** Chuyển khách sang bàn khác.
**Role:** ADMIN, STAFF

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `new_table_id` | number | ✅ | ID bàn mới |

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

**Mô tả:** Ghi nhận thanh toán tiền mặt tại quầy.
**Role:** ADMIN, STAFF

**Request Body:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `amount` | number | ✅ | Số tiền thu |
| `method` | string | ✅ | `cash` / `bank_transfer` |

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
    "summary": { "total_revenue": "15000000.00", "total_orders": 42 },
    "chart": [
      { "period": "2025-12-01", "revenue": "3500000.00", "orders": 10 }
    ]
  }
}
```

---

#### GET /api/admin/reports/revenue/by-table

**Mô tả:** Doanh thu nhóm theo từng bàn.
**Role:** ADMIN, STAFF

**Query Parameters:** `from`, `to` (YYYY-MM-DD)

---

#### GET /api/admin/reports/revenue/invoices

**Mô tả:** Danh sách chi tiết từng hóa đơn thanh toán.
**Role:** ADMIN, STAFF

**Query Parameters:** `from`, `to` (YYYY-MM-DD)

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

#### GET /api/admin/kitchen/orders

**Mô tả:** Lấy danh sách orders cần bếp xử lý (có item chưa ACK).
**Role:** ADMIN, STAFF

---

#### GET /api/admin/kitchen/orders/:orderId

**Mô tả:** Lấy chi tiết order cho kitchen display.
**Role:** ADMIN, STAFF

---

#### PATCH /api/admin/kitchen/order-items/:itemId/ack

**Mô tả:** Bếp xác nhận đã nhận một món (`kitchen_status` → ACKNOWLEDGED).
**Role:** ADMIN, STAFF

---

#### POST /api/admin/kitchen/orders/:orderId/ack-all

**Mô tả:** Bếp xác nhận tất cả món còn PENDING trong order.
**Role:** ADMIN, STAFF

---

#### POST /api/admin/kitchen/orders/:orderId/confirm-payment

**Mô tả:** Xác nhận thanh toán và đóng table session.
**Role:** ADMIN, STAFF

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
        VARCHAR_20 kitchen_status
        TIMESTAMP kitchen_ack_at
    }

    payments {
        SERIAL id PK
        INT order_id FK
        DECIMAL_14_2 amount
        VARCHAR_20 method
        VARCHAR_20 status
        TIMESTAMP paid_at
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
| `created_at` | TIMESTAMP WITH TZ | NO | `NOW()` | Thời gian tạo |

**Enum `status`:** `AVAILABLE`, `RESERVED`, `OCCUPIED`, `CLOSED`

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
| `kitchen_status` | VARCHAR(20) | NO | `'PENDING'` | `PENDING` / `ACKNOWLEDGED` |
| `kitchen_ack_at` | TIMESTAMP WITH TZ | YES | NULL | Thời điểm bếp xác nhận |

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
| `FRONTEND_URL` | string | ✅ | — | URL frontend (dùng cho CORS + link email) | `http://localhost:5173` |

---

### Database (PostgreSQL)

| Variable | Type | Required | Default | Mô tả | Ví dụ |
|---|---|---|---|---|---|
| `PGHOST` | string | ✅ | — | Host PostgreSQL | `localhost` |
| `PGPORT` | number | ❌ | `5432` | Port PostgreSQL | `5432` |
| `PGUSER` | string | ✅ | — | Username kết nối | `postgres` |
| `PGPASSWORD` | string | ✅ | — | Password kết nối | `secretpassword` |
| `PGDATABASE` | string | ✅ | — | Tên database | `restaurant_db` |

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

> ⚠️ **Cần bổ sung:** Nếu tích hợp Vision API cho tính năng phân tích sơ đồ bàn (`/api/admin/tables/layout/analyze-image`), cần thêm biến môi trường cho API key tương ứng. Hiện tại `tableLayoutVision.service.js` có fallback về thuật toán grid-based nếu không có API key.
