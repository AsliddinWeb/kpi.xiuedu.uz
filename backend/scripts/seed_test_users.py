"""Dev-only: rollarni qo'lda sinash uchun namunaviy userlar yaratadi.

Setup Wizard (Phase 2) haqiqiy onboarding oqimini beradi -- bu skript faqat
Phase 1'da autentifikatsiyani Wizard'gacha sinash uchun ishlatiladi.

Ishga tushirish: docker compose exec backend python scripts/seed_test_users.py
"""
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

import app.main  # noqa: E402,F401  ensures every model is imported so User's FKs resolve
from app.core.security import hash_password  # noqa: E402
from app.db.base import SessionLocal  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402

PASSWORD = "Password123!"

SEED_USERS = [
    dict(email="superadmin@example.com", full_name="Super Admin", role=UserRole.super_admin),
    dict(email="admin@example.com", full_name="HR Admin", role=UserRole.admin),
    dict(email="manager@example.com", full_name="Bo'lim Rahbari", role=UserRole.manager),
    dict(email="employee@example.com", full_name="Oddiy Xodim", role=UserRole.employee),
    # Nizom 3.2/25-band: Rektor + 3 prorektor yo'nalishi (haqiqiy, KPI-nazorat rollari).
    # Rektor ismi Nizom hujjatida imzo qo'ygan rasmiy rektorga mos ("U.Ortiqov").
    dict(email="rector@example.com", full_name="Umidjon Ortiqov", role=UserRole.rector),
    dict(email="prorektor.birinchi@example.com", full_name="Birinchi Prorektor", role=UserRole.prorektor_birinchi),
    dict(email="prorektor.oquv@example.com", full_name="O'quv Ishlari Prorektori", role=UserRole.prorektor_oquv),
    dict(
        email="prorektor.xalqaro@example.com",
        full_name="Xalqaro Hamkorlik Prorektori",
        role=UserRole.prorektor_xalqaro,
    ),
]


def run() -> None:
    db = SessionLocal()
    try:
        manager = db.query(User).filter(User.email == "manager@example.com").first()

        for data in SEED_USERS:
            if db.query(User).filter(User.email == data["email"]).first():
                continue

            user = User(
                email=data["email"],
                password_hash=hash_password(PASSWORD),
                full_name=data["full_name"],
                role=data["role"],
            )
            if data["role"] == UserRole.employee and manager is not None:
                user.manager_id = manager.id

            db.add(user)
            db.flush()

            if data["role"] == UserRole.manager:
                manager = user

        db.commit()
        print(f"Seed userlar tayyor. Parol hammasi uchun: {PASSWORD}")
        for data in SEED_USERS:
            print(f"  {data['role'].value:12s} {data['email']}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
