# Tuition Management System - Backend

Express 5 + MongoDB (Mongoose) REST API: authentication, students, attendance and fees.

## Setup

```bash
npm install
cp .env.example .env        # then fill in JWT_SECRET (>= 32 chars) and MONGO_URI
npm run seed:admin          # needs ADMIN_EMAIL / ADMIN_PASSWORD in the environment
npm run dev
```

There is no public sign-up. The first Admin is created with `npm run seed:admin`;
after that, Admins create Teacher/Admin accounts with `POST /api/auth/register`.

```bash
npm test                    # runs without a database
```

## Endpoints

All routes except `POST /api/auth/login` and `GET /` need `Authorization: Bearer <token>`.

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | /api/auth/login | public | rate limited (10 failed tries / 15 min) |
| POST | /api/auth/register | Admin | body: name, email, password, phone?, role? |
| GET | /api/auth/me | any | |
| PATCH | /api/auth/change-password | any | currentPassword, newPassword; returns a new token |
| GET | /api/users | Admin | ?search=&role=&page=&limit= |
| PATCH | /api/users/:id | Admin | name, phone, role, isActive |
| POST / GET | /api/students | any | GET: ?search=&status=&className=&page=&limit= |
| GET / PUT | /api/students/:id | any | |
| DELETE | /api/students/:id | Admin | deactivates; `?permanent=true` also deletes attendance + fees |
| POST | /api/attendance | any | student, date (YYYY-MM-DD), status, remarks? |
| GET | /api/attendance | any | ?student=&date=&from=&to=&status=&page=&limit= |
| PATCH | /api/attendance/:id | any | status, remarks |
| POST | /api/fees | FEE_WRITE_ROLES | student, month, year, dueDate, amount? (defaults to monthlyFee) |
| GET | /api/fees | any | ?student=&month=&year=&status=&page=&limit= (summary covers all matches) |
| PATCH | /api/fees/:id/payment | FEE_WRITE_ROLES | payment (whole rupees), paymentMethod? |
| DELETE | /api/fees/:id | Admin | records with payments need `?force=true` |

Fee amounts are whole rupees (integers). Every payment is stored in `fee.payments`.
Edit `FEE_WRITE_ROLES` at the top of `routes/feesRoutes.js` to restrict money handling to Admins.

## Frontend ke liye naye / badle hue endpoints

| Method | Path | Notes |
|---|---|---|
| GET | /api/dashboard | counts, is mahine ki fees (percent), aaj ki attendance, 5 recent students |
| GET | /api/students/:id/profile | student + attendance % + fees + marks ek call mein |
| GET | /api/attendance/sheet | ?class=&date= : class ke Active students aur un ka status |
| POST | /api/attendance/bulk | date, records[{student,status,remarks?}] : poori class ek saath save/update |
| POST | /api/fees/generate | month, year, dueDate, class? : sab Active students ke fee records |
| GET/POST | /api/classes, /api/subjects | GET sab ke liye; POST/PUT/DELETE sirf Admin; istemal mein ho to delete nahi hota |
| GET/POST | /api/marks | ?student=&subject=&class=&testName= ; POST /api/marks/bulk poori class ke marks |
| PUT/DELETE | /api/marks/:id | marks edit / delete |
| GET | /api/reports/overview | ?year=&from=&to= : fees by month, attendance totals, subject-wise average |

Student ab `class` (Class ID) aur `subjects` (Subject IDs ki list) se bante hain; `className` / `section` fields hata di gayi hain.
