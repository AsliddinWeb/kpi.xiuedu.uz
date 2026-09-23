# Serverga joylashtirish (production deploy)

Bu qo'llanma XIU KPI tizimini production serverga joylashtirish uchun. Hozirgi
sozlamalar shu topologiyaga mos: server o'zi faqat **6100-portda** (HTTPS'siz,
oddiy HTTP) ishlaydi, tashqi domen (`kpi.xiuedu.uz`) va HTTPS'ni **serverchi
tomonidagi reverse proxy** boshqaradi va shu 6100-portga yo'naltiradi. Ya'ni
bizning `nginx` konteynerimiz HTTPS sertifikatlari bilan shug'ullanmaydi —
buni serverchi proxy hal qiladi.

## 1. Talablar

- Serverda Docker va Docker Compose (v2, `docker compose` buyrug'i) o'rnatilgan bo'lishi kerak.
- Git orqali reponi serverga olib kelish imkoniyati.
- Serverchi tomonidan: `kpi.xiuedu.uz` (yoki tanlangan domen) uchun HTTPS sertifikat + reverse proxy, `https://kpi.xiuedu.uz` → `http://<server>:6100` yo'naltirilgan bo'lishi kerak.

## 2. Reponi serverga olib kelish

```bash
git clone <repo-url> kpi_project
cd kpi_project
```

## 3. `.env` faylini yaratish (MUHIM — hech qachon gitga tushmaydi)

```bash
cp .env.example .env
```

So'ngra `.env`ni oching va quyidagilarni **albatta** o'zgartiring (demo/dev
qiymatlar bilan production'ga chiqib bo'lmaydi):

| O'zgaruvchi | Nima qilish kerak |
|---|---|
| `POSTGRES_PASSWORD` | Kuchli, tasodifiy parolga almashtiring (`DATABASE_URL` ichidagi parolni ham shunga moslang) |
| `JWT_SECRET` | Kuchli tasodifiy qiymat: `openssl rand -hex 32` buyrug'i bilan generatsiya qiling |
| `ENV` | `production` qiling |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | Haqiqiy admin email va kuchli parol (bu — bootstrap hisob, pastga qarang) |
| `HEMIS_CLIENT_ID` / `HEMIS_CLIENT_SECRET` | HEMIS admin panelida OAuth ilova ro'yxatdan o'tkazib olinadi — batafsil: [`HEMIS_OAUTH.md`](./HEMIS_OAUTH.md) |
| `HEMIS_REDIRECT_URI` | `https://kpi.xiuedu.uz/api/v1/auth/hemis/callback` — HEMIS'da ro'yxatdan o'tkazilgan callback bilan **so'zma-so'z bir xil** bo'lishi shart |
| `FRONTEND_BASE_URL` | `https://kpi.xiuedu.uz` |
| `NGINX_PORT` | `6100` (serverchi shu portga yo'naltiradi, o'zgartirmang — yoki o'zgartirsangiz serverchiga xabar bering) |

**Eslatma**: `HEMIS_REDIRECT_URI`/`FRONTEND_BASE_URL`da `https://` yozilishi
shart, garchi bizning konteynerimiz ichida hammasi HTTP bo'lsa ham — bu
brauzer va HEMIS ko'radigan **tashqi** manzil, u https bo'ladi (serverchi
proxy orqali).

## 4. Qurish, migratsiya, ishga tushirish (**shu tartibda**, birinchi deploy'da muhim)

`Dockerfile.prod` migratsiyalarni avtomatik ishga tushirmaydi — bu qadam
har doim qo'lda bajariladi (bir nechta backend worker bir vaqtda parallel
migratsiya urinishining oldini olish uchun ataylab shunday). **Bo'sh
(yangi) baza uchun** avval bazani, keyin migratsiyani, so'ng qolgan
xizmatlarni ishga tushiring:

```bash
# 1) faqat baza va navbat xizmatlarini ishga tushirish
docker compose -f docker-compose.prod.yml up -d postgres redis

# 2) backend image'ni qurish (hali ishga tushirmasdan) va migratsiyalarni qo'llash
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# 3) qolgan hamma narsani qurish va ishga tushirish
docker compose -f docker-compose.prod.yml up -d --build
```

Bu `backend` (4 ta uvicorn worker bilan), `worker` (Celery), `frontend`
(Next.js production build) va `nginx` (6100-portda) konteynerlarini ishga
tushiradi.

> **Eslatma**: agar tasodifan migratsiyasiz `up -d --build` qilib
> yuborsangiz — ilova endi qulamaydi (backend shunchaki bootstrap
> admin'ni o'tkazib yuboradi va log'ga ogohlantirish yozadi), lekin
> birinchi super_admin hisobi paydo bo'lishi uchun baribir migratsiyani
> qo'llab, keyin `docker compose -f docker-compose.prod.yml restart backend`
> qilishingiz kerak bo'ladi.

## 5. Keyingi deploy'larda migratsiya

Bazada allaqachon jadvallar bo'lgani uchun jarayon soddaroq, lekin tartib
muhim: **avval migratsiyani qo'llang, keyin yangi kodni ishga tushiring** —
aks holda yangi kod eski (hali migratsiya qilinmagan) sxema bilan bir necha
soniya ishlab, xato berishi mumkin.

```bash
git pull
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
docker compose -f docker-compose.prod.yml up -d --build
```

`up -d --build` oxirida ham qo'yilgan — u `backend`dan tashqari
`worker`/`frontend`/`nginx`ni ham yangi kod bilan qayta quradi va ishga
tushiradi (`backend` xizmati o'zi allaqachon yangi image bilan ishlamoqda,
`build backend` bosqichida qurilgan).

## 6. Tekshirish

```bash
curl -s http://localhost:6100/health
# {"status":"ok"} qaytishi kerak
```

Serverchi proxy to'g'ri sozlangandan keyin `https://kpi.xiuedu.uz/health` ham
xuddi shunday javob berishi kerak.

## 7. Birinchi kirish va boshlang'ich sozlash

1. `https://kpi.xiuedu.uz/login/admin` sahifasiga o'ting (bu — administrator
   uchun alohida, reklama qilinmagan sahifa; oddiy `/login` faqat HEMIS
   tugmasini ko'rsatadi).
2. `.env`dagi `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` bilan kiring — bu
   hisob server birinchi marta ishga tushganda avtomatik yaratiladi
   (`backend/app/db/bootstrap.py`).
3. Tizim sizni `/setup` sahifasiga yo'naltiradi — tashkilot nomi, logotipi,
   bo'lim/lavozimlar tuzilmasini shu yerda kiritasiz.
4. Sozlash tugagach, **Sozlamalar** sahifasidan logotipni yuklang,
   **KPI shablonlari**dan standart shablon holatini tekshiring (u
   migratsiya orqali avtomatik yaratilgan bo'lishi kerak — 5 kategoriya,
   13 ko'rsatkich).
5. HEMIS orqali kirishni sozlash uchun [`HEMIS_OAUTH.md`](./HEMIS_OAUTH.md)ga
   qarang — `HEMIS_CLIENT_ID`/`SECRET` to'g'ri kiritilgan bo'lsa, xodimlar
   endi asosiy `/login` sahifasidan HEMIS orqali kira oladilar.

## 8. Zaxira nusxalash (backup)

`ops/backup.sh` mavjud — Postgres bazasini dump qilib, eskirganlarini
avtomatik tozalaydi (`BACKUP_RETENTION_DAYS`, `.env`da sozlanadi). Cron
orqali kunlik ishga tushirish tavsiya etiladi:

```bash
crontab -e
# quyidagi qatorni qo'shing:
0 3 * * * cd /to/lu/hi/kpi_project && ./ops/backup.sh >> ops/backup.log 2>&1
```

Tiklash uchun: `./ops/restore.sh backups/<fayl>.sql.gz`

## 9. Yangilash (keyingi deploy'lar)

Kodda o'zgarish bo'lganda (yangi funksiya, bug-fix, migratsiya) har safar shu
ketma-ketlikda bajaring — tartib muhim, **avval migratsiya, keyin qayta
qurish** (bo'lim 5dagi bilan bir xil, ushbu bo'lim tezkor eslatma sifatida):

```bash
cd ~/xiu/kpi.xiuedu.uz
git pull
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
docker compose -f docker-compose.prod.yml up -d --build
```

Tekshirish (barcha konteynerlar sog'lom holatda ishga tushganini ko'rish):

```bash
docker compose -f docker-compose.prod.yml ps
curl -s http://localhost:6100/health
```

**Eslatma**: agar faqat migratsiya faylida (`backend/alembic/versions/`)
xatolik topilib, kodning boshqa joyi o'zgarmagan bo'lsa ham, baribir yuqoridagi
to'liq ketma-ketlikni bajaring — `build backend` qadami hech qachon
o'tkazib yuborilmasin, aks holda `run --rm backend alembic ...` eski
(git pull'dan oldingi) image bilan ishlaydi.

## 10. Xavfsizlik bo'yicha eslatmalar

- 6100-port faqat serverchi proxy'dan kirish uchun ochiq bo'lishi kerak —
  agar proxy boshqa mashinada ishlasa, firewall orqali shu portni faqat
  proxy IP-manzilidan kiritishga cheklang.
- `.env` fayli hech qachon gitga tushmasligi kerak (allaqachon
  `.gitignore`da) — sirlarni faqat serverda saqlang.
- `JWT_SECRET`, `POSTGRES_PASSWORD`, `HEMIS_CLIENT_SECRET` — har biri
  boshqa muhitlardan (dev, staging) farqli, faqat shu serverga tegishli
  qiymat bo'lishi kerak.
