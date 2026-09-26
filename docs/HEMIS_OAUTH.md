# HEMIS orqali kirish (OAuth2)

Tizimga XIU xodimlari `hemis.xiuedu.uz` orqali (o'zining mavjud HEMIS hisobi bilan) kirishlari mumkin. Bu standart OAuth2 "Authorization Code" oqimi.

## Qanday ishlaydi

1. Foydalanuvchi `/login` sahifasida **"HEMIS orqali kirish"** tugmasini bosadi → `GET /api/v1/auth/hemis/login`.
2. Backend tasodifiy `state` qiymatini yaratadi (CSRF himoyasi uchun, qisqa muddatli cookie'da saqlanadi) va foydalanuvchini HEMIS'ning `oauth/authorize` sahifasiga yo'naltiradi.
3. Foydalanuvchi HEMIS'da (odatda allaqachon login qilingan bo'lgani uchun) ruxsat beradi.
4. HEMIS foydalanuvchini bizning `HEMIS_REDIRECT_URI` manzilimizga (`/api/v1/auth/hemis/callback`) `code` va `state` bilan qaytaradi.
5. Backend `state`ni tekshiradi, `code`ni HEMIS'ning `oauth/access-token` metodiga almashtiradi, so'ng `oauth/api/user` orqali xodim profilini oladi.
6. Profil `uuid` (keyin `email`) bo'yicha mavjud lokal foydalanuvchiga bog'lanadi, yoki topilmasa — yangi hisob (`role=employee`) avtomatik yaratiladi.
7. Bizning odatdagi JWT cookie'lar (`access_token`/`refresh_token`) o'rnatiladi va foydalanuvchi `/dashboard`ga yo'naltiriladi.

Email/parol orqali kirish asosiy `/login` sahifasidan olib tashlangan (endi
faqat HEMIS tugmasi ko'rinadi). Administratorlar (masalan `super_admin`, HEMIS
hisobiga ega bo'lmasligi mumkin) uchun alohida, reklama qilinmagan
`/login/admin` sahifasi mavjud — backend darajasida `/api/v1/auth/login`
endpointi hali ham ishlaydi, faqat asosiy sahifadan ko'rinmaydi.

## Sozlash (production yoki yangi muhitda)

1. HEMIS admin panelida (`hemis.xiuedu.uz`) yangi **OAuth ilova** ro'yxatdan o'tkazing, callback (redirect) manzili sifatida aynan quyidagini bering:
   ```
   https://<sizning-domeningiz>/api/v1/auth/hemis/callback
   ```
2. Olingan `client_id` va `client_secret`ni `.env` fayliga yozing:
   ```
   HEMIS_BASE_URL=https://hemis.xiuedu.uz
   HEMIS_CLIENT_ID=...
   HEMIS_CLIENT_SECRET=...
   HEMIS_REDIRECT_URI=https://<sizning-domeningiz>/api/v1/auth/hemis/callback
   FRONTEND_BASE_URL=https://<sizning-domeningiz>
   ```
3. Konteynerlarni qayta ishga tushiring (env o'zgargani uchun): dev muhitda
   `docker compose up -d backend worker`, production serverda
   `docker compose -f docker-compose.prod.yml up -d backend worker`
   (to'liq deploy jarayoni: [`DEPLOY.md`](./DEPLOY.md)).

`HEMIS_CLIENT_ID` bo'sh bo'lsa, `/api/v1/auth/hemis/login` `503` xato qaytaradi — bu sozlanmaganini bildiradi, xato emas.

## Foydalanuvchi jadvalidagi HEMIS maydonlari

HEMIS profilidan kelgan ma'lumotlar `users` jadvalidagi `hemis_*` ustunlarida saqlanadi (`auth_provider`, `hemis_uuid`, `hemis_id`, `hemis_employee_id_number`, `hemis_login`, `hemis_type`, `hemis_roles`, `hemis_first_name/surname/patronymic`, `hemis_birth_date`, `hemis_university_id`, `hemis_phone`, `hemis_email`, `hemis_picture_url`, `hemis_last_synced_at`) — har safar HEMIS orqali kirilganda yangilanadi.

**Muhim**: `role`, `department_id`, `position_id`, `kpi_template_id` kabi tizim ichida boshqariladigan maydonlar HEMIS tomonidan **hech qachon ustidan yozilmaydi** — ular faqat shu tizim administratorlari tomonidan (Xodimlar sahifasi orqali) boshqariladi. HEMIS faqat identifikatsiya (kim ekanligini tasdiqlash) uchun ishlatiladi.

## HEMIS'dan qo'lda sinxronlash (REST API, OAuth'dan mustaqil)

Yuqoridagi OAuth oqimi faqat xodimning **o'zi** HEMIS orqali kirganda ishlaydi
— boshqa birov (masalan administrator) uning ma'lumotini "hoziroq yangila" deb
so'ray olmaydi, chunki OAuth token faqat o'sha login jarayonida bir marta
ishlatiladi va saqlanmaydi.

Shu sabab Xodim tafsiloti sahifasida (`/dashboard/employees/{id}`) alohida
**"Sinxronlash"** tugmasi bor — bu HEMIS'ning butunlay boshqa, server-server
REST API'sidan (`/v1/data/employee-list`, statik Bearer token bilan)
foydalanadi va istalgan xodim uchun, ular login qilmasa ham ishlaydi. Bu
integratsiya `hemis_auth/openapi.json` (HEMIS'ning rasmiy OpenAPI hujjati)
asosida qurilgan — `backend/app/services/hemis_rest.py`ga qarang.

**Sozlash:**
1. HEMIS admin panelida ("API" yoki "Token" bo'limida) yangi token generatsiya qiling.
2. `.env` fayliga yozing:
   ```
   HEMIS_REST_BASE_URL=https://student.xiuedu.uz/rest
   HEMIS_API_TOKEN=...
   ```
3. Konteynerlarni qayta ishga tushiring.

Token sozlanmagan bo'lsa, "Sinxronlash" tugmasi bosilganda `503` xato
ko'rsatiladi (buzilish emas). Sinxronlash faqat `hemis_employee_id_number`
allaqachon bor xodimlar uchun ishlaydi (ya'ni kamida bir marta HEMIS orqali
kirgan yoki import qilingan bo'lishi kerak) — bu maydon orqali HEMIS'dan aniq
shu odam qidiriladi.

Bu yo'l bilan olingan ma'lumotlar (rasm, unvon, lavozim, ish holati, bo'lim
nomi) alohida `hemis_image_url`, `hemis_academic_degree_name`,
`hemis_academic_rank_name`, `hemis_staff_position_name`,
`hemis_employment_status_name`, `hemis_department_name` va
`hemis_rest_synced_at` ustunlarida saqlanadi — yuqoridagi OAuth
ustunlaridan (`hemis_last_synced_at` bilan yangilanadigan) alohida, chunki
ular ikki xil, mustaqil sinxronlash mexanizmi.

## Texnik manba

Bu integratsiya HEMIS'ning rasmiy namunaviy loyihasiga asoslangan: https://github.com/homidjonov/hemis-oauth
