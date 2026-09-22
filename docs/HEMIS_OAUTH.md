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

## Texnik manba

Bu integratsiya HEMIS'ning rasmiy namunaviy loyihasiga asoslangan: https://github.com/homidjonov/hemis-oauth
