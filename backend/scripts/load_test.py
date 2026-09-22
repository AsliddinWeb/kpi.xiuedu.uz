"""Load test: ~200 xodim seed qilib, asosiy endpointlarga parallel so'rov yuboradi.

Ishga tushirish (backend konteyner ichidan, chunki httpx shu yerda mavjud):
    docker compose exec backend python scripts/load_test.py
    docker compose exec backend python scripts/load_test.py --employees 200 --concurrency 20 --requests 500
"""
import argparse
import asyncio
import statistics
import sys
import time
import uuid
from pathlib import Path

import httpx

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402

BASE_URL = "http://localhost:8000"
ADMIN_EMAIL = settings.super_admin_email
ADMIN_PASSWORD = settings.super_admin_password

READ_ENDPOINTS = [
    "/api/v1/users",
    "/api/v1/departments",
    "/api/v1/dashboard/organization-summary",
    "/api/v1/dashboard/department-comparison",
]


async def seed_employees(client: httpx.AsyncClient, count: int, timeout: float = 30.0) -> None:
    run_id = uuid.uuid4().hex[:8]
    header = "email,full_name,role\n"
    rows = [f"loadtest.{run_id}.{i}@example.com,Load Test {i},employee\n" for i in range(count)]
    csv_content = (header + "".join(rows)).encode("utf-8")

    resp = await client.post(
        "/api/v1/users/import",
        files={"file": ("loadtest.csv", csv_content, "text/csv")},
        timeout=timeout,
    )
    resp.raise_for_status()
    summary = resp.json()
    print(f"Seed: {summary['created']} ta yaratildi, {summary['failed']} ta xato ({count} so'ralgan)")


async def hit_endpoint(client: httpx.AsyncClient, path: str, latencies: list[float], errors: list[str]) -> None:
    start = time.perf_counter()
    try:
        resp = await client.get(path)
        elapsed = time.perf_counter() - start
        latencies.append(elapsed)
        if resp.status_code >= 400:
            errors.append(f"{path} -> {resp.status_code}")
    except httpx.HTTPError as exc:
        errors.append(f"{path} -> {exc!r}")


async def run_load(client: httpx.AsyncClient, total_requests: int, concurrency: int) -> tuple[list[float], list[str]]:
    latencies: list[float] = []
    errors: list[str] = []
    semaphore = asyncio.Semaphore(concurrency)

    async def worker(path: str) -> None:
        async with semaphore:
            await hit_endpoint(client, path, latencies, errors)

    tasks = [worker(READ_ENDPOINTS[i % len(READ_ENDPOINTS)]) for i in range(total_requests)]
    await asyncio.gather(*tasks)
    return latencies, errors


def percentile(data: list[float], pct: float) -> float:
    if not data:
        return 0.0
    ordered = sorted(data)
    index = min(int(len(ordered) * pct), len(ordered) - 1)
    return ordered[index]


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--employees", type=int, default=200)
    parser.add_argument("--concurrency", type=int, default=20)
    parser.add_argument("--requests", type=int, default=500)
    parser.add_argument("--base-url", default=BASE_URL)
    args = parser.parse_args()

    async with httpx.AsyncClient(base_url=args.base_url, timeout=30.0) as client:
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        login_resp.raise_for_status()
        print(f"Kirish OK: {ADMIN_EMAIL}")

        print(f"\n{args.employees} ta xodim seed qilinmoqda...")
        seed_start = time.perf_counter()
        # bcrypt har bir qatorda parol xeshlaydi -- 200 ta yozuv uchun 30s yetmasligi mumkin
        await seed_employees(client, args.employees, timeout=180.0)
        print(f"Seed vaqti: {time.perf_counter() - seed_start:.2f}s")

        print(f"\n{args.requests} ta so'rov, {args.concurrency} parallel worker bilan yuborilmoqda...")
        load_start = time.perf_counter()
        latencies, errors = await run_load(client, args.requests, args.concurrency)
        total_time = time.perf_counter() - load_start

        print("\n--- Natija ---")
        print(f"Jami so'rovlar: {args.requests}")
        print(f"Muvaffaqiyatli: {len(latencies) - len(errors)}")
        print(f"Xatolar: {len(errors)}")
        print(f"Jami vaqt: {total_time:.2f}s")
        print(f"O'tkazuvchanlik: {args.requests / total_time:.1f} so'rov/s")
        if latencies:
            print(f"Latency (o'rtacha): {statistics.mean(latencies) * 1000:.1f}ms")
            print(f"Latency p50: {percentile(latencies, 0.50) * 1000:.1f}ms")
            print(f"Latency p95: {percentile(latencies, 0.95) * 1000:.1f}ms")
            print(f"Latency p99: {percentile(latencies, 0.99) * 1000:.1f}ms")
        if errors:
            print("\nBirinchi 10 ta xato:")
            for err in errors[:10]:
                print(f"  {err}")


if __name__ == "__main__":
    asyncio.run(main())
