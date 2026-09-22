from pathlib import Path

from app.models.payroll_export import PayrollExport, PayrollExportFormat, PayrollExportStatus
from app.tasks import payroll_export as payroll_export_task
from tests.conftest import TEST_PASSWORD, TestingSessionLocal


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200


def _approve_bonus(client, period="2026-07"):
    resp = client.post("/api/v1/bonuses/approve", json={"period": period})
    assert resp.status_code == 200


def test_create_export_requires_admin(client, seed_users):
    _login(client, "manager@test.com")
    resp = client.post("/api/v1/exports", json={"period": "2026-07"})
    assert resp.status_code == 403


def test_create_export_blocked_without_bonus_approval(client, seed_users):
    _login(client, "superadmin@test.com")
    resp = client.post("/api/v1/exports", json={"period": "2026-07"})
    assert resp.status_code == 400


def test_create_export_returns_pending(client, seed_users):
    _login(client, "superadmin@test.com")
    _approve_bonus(client)
    resp = client.post("/api/v1/exports", json={"period": "2026-07"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "pending"
    assert body["file_url"] is None


def test_list_exports(client, seed_users):
    _login(client, "superadmin@test.com")
    _approve_bonus(client)
    client.post("/api/v1/exports", json={"period": "2026-07"})
    resp = client.get("/api/v1/exports")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_get_export_not_found(client, seed_users):
    _login(client, "superadmin@test.com")
    resp = client.get("/api/v1/exports/9999")
    assert resp.status_code == 404


def test_download_blocked_when_not_completed(client, seed_users):
    _login(client, "superadmin@test.com")
    _approve_bonus(client)
    created = client.post("/api/v1/exports", json={"period": "2026-07"}).json()
    resp = client.get(f"/api/v1/exports/{created['id']}/download")
    assert resp.status_code == 400


def test_download_not_found(client, seed_users):
    _login(client, "superadmin@test.com")
    resp = client.get("/api/v1/exports/9999/download")
    assert resp.status_code == 404


def test_create_export_defaults_to_xlsx_format(client, seed_users):
    _login(client, "superadmin@test.com")
    _approve_bonus(client)
    resp = client.post("/api/v1/exports", json={"period": "2026-07"})
    assert resp.json()["format"] == "xlsx"


def test_create_export_accepts_pdf_format(client, seed_users):
    _login(client, "superadmin@test.com")
    _approve_bonus(client)
    resp = client.post("/api/v1/exports", json={"period": "2026-07", "format": "pdf"})
    assert resp.status_code == 201
    assert resp.json()["format"] == "pdf"


def test_generate_payroll_export_writes_xlsx_file(monkeypatch, db_session, tmp_path):
    monkeypatch.setattr(payroll_export_task, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(payroll_export_task, "EXPORTS_DIR", tmp_path)

    export = PayrollExport(period="2026-07", format=PayrollExportFormat.xlsx)
    db_session.add(export)
    db_session.commit()

    payroll_export_task.generate_payroll_export(export.id)

    db_session.refresh(export)
    assert export.status == PayrollExportStatus.completed
    assert export.file_url.endswith(".xlsx")
    assert Path(export.file_url).exists()


def test_generate_payroll_export_writes_pdf_file(monkeypatch, db_session, tmp_path):
    monkeypatch.setattr(payroll_export_task, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(payroll_export_task, "EXPORTS_DIR", tmp_path)

    export = PayrollExport(period="2026-07", format=PayrollExportFormat.pdf)
    db_session.add(export)
    db_session.commit()

    payroll_export_task.generate_payroll_export(export.id)

    db_session.refresh(export)
    assert export.status == PayrollExportStatus.completed
    assert export.file_url.endswith(".pdf")
    assert Path(export.file_url).exists()
