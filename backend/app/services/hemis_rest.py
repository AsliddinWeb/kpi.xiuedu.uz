from typing import Any

import httpx

from app.core.config import settings


class HemisRestError(Exception):
    """Raised when the HEMIS REST directory API call fails or isn't configured."""


def _classifier_name(value: Any) -> str | None:
    if isinstance(value, dict):
        name = value.get("name")
        return str(name) if name else None
    return None


def _extract_items(body: dict[str, Any]) -> list[dict[str, Any]]:
    """HEMIS's own OpenAPI spec types `data` inconsistently for this endpoint
    (an object with `items`, sometimes wrapped in a one-element list) - handle
    both shapes rather than trusting a single literal structure."""
    data = body.get("data")
    if isinstance(data, dict):
        items = data.get("items")
        if isinstance(items, list):
            return items
    if isinstance(data, list):
        for entry in data:
            if isinstance(entry, dict) and isinstance(entry.get("items"), list):
                return entry["items"]
    return []


def fetch_employee_by_id_number(employee_id_number: str) -> dict[str, Any] | None:
    """Looks up one employee in HEMIS's server-side directory (REST API, a static
    bearer token from the HEMIS admin panel - not the per-user OAuth flow) by
    their `employee_id_number`. Returns the raw `EmployeeMeta` dict, or None if
    HEMIS has no match. Unlike the OAuth profile sync, this works for any
    employee on demand - it doesn't require that person to log in themselves.
    """
    if not settings.hemis_api_token:
        raise HemisRestError("HEMIS_API_TOKEN sozlanmagan")

    response = httpx.get(
        f"{settings.hemis_rest_base_url}/v1/data/employee-list",
        params={"type": "all", "search": employee_id_number, "limit": 5},
        headers={"Authorization": f"Bearer {settings.hemis_api_token}", "Accept": "application/json"},
        timeout=15,
    )
    if response.status_code != 200:
        raise HemisRestError(f"HEMIS REST so'rovi muvaffaqiyatsiz: {response.status_code} {response.text[:300]}")

    items = _extract_items(response.json())
    for item in items:
        if str(item.get("employee_id_number")) == str(employee_id_number):
            return item
    return items[0] if items else None


def apply_employee_meta(user: Any, meta: dict[str, Any]) -> None:
    """Copies a HEMIS REST `EmployeeMeta` payload onto the matching hemis_* mirror
    columns on `user`. Caller is responsible for setting `hemis_rest_synced_at`
    and committing."""
    image = meta.get("image_full") or meta.get("image")
    if image:
        user.hemis_image_url = image
    if meta.get("employee_id_number") is not None:
        user.hemis_employee_id_number = str(meta["employee_id_number"])

    academic_degree = _classifier_name(meta.get("academicDegree"))
    if academic_degree:
        user.hemis_academic_degree_name = academic_degree
    academic_rank = _classifier_name(meta.get("academicRank"))
    if academic_rank:
        user.hemis_academic_rank_name = academic_rank
    staff_position = _classifier_name(meta.get("staffPosition"))
    if staff_position:
        user.hemis_staff_position_name = staff_position
    employment_status = _classifier_name(meta.get("employeeStatus"))
    if employment_status:
        user.hemis_employment_status_name = employment_status

    department = meta.get("department")
    if isinstance(department, dict) and department.get("name"):
        user.hemis_department_name = str(department["name"])
