from typing import Annotated, Any, cast

from fastapi import Depends, Header, HTTPException, status
from postgrest.exceptions import APIError
from supabase import Client, create_client
from supabase_auth.errors import AuthApiError

from app.core.config import Settings, get_settings
from app.data.database_admin.models import AdminUser, DirtyCellChange, SaveFailure


def create_service_client(settings: Settings) -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return authorization.split(" ", 1)[1].strip()


def first_row(rows: Any) -> dict[str, Any] | None:
    return rows[0] if isinstance(rows, list) and rows else None


def single_or_bad_request(rows: Any, message: str) -> dict[str, Any]:
    row = first_row(rows)
    if row is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return row


def require_admin_user_from_token(settings: Settings, token: str) -> AdminUser:
    supabase = create_service_client(settings)

    try:
        user_response = supabase.auth.get_user(token)
    except AuthApiError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        ) from exc

    if user_response is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    user = user_response.user
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    profile_response = (
        supabase.table("profiles")
        .select("id,tier:tiers(name)")
        .eq("id", user.id)
        .limit(1)
        .execute()
    )
    profile = first_row(profile_response.data)
    tier = profile.get("tier") if profile else None
    tier_name = tier.get("name") if isinstance(tier, dict) else None
    if str(tier_name).lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )

    return AdminUser(id=user.id, email=user.email)


async def require_admin_user(
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> AdminUser:
    return require_admin_user_from_token(settings, extract_bearer_token(authorization))


def normalize_enum(value: Any) -> str:
    return "_".join(str(value or "").strip().lower().split())


def coerce_value(value: Any, data_type: str) -> Any:
    if value == "" or value is None:
        return None
    if data_type in {"numeric", "integer"}:
        parsed = float(value)
        return int(parsed) if data_type == "integer" else parsed
    if data_type == "boolean":
        return value is True or str(value).lower() == "true"
    if data_type == "enum":
        return normalize_enum(value)
    if data_type == "date":
        return str(value).strip() or None
    return str(value)


def category_by_label(supabase: Client, label: str) -> dict[str, Any]:
    response = (
        supabase.table("database_categories")
        .select(
            "label,source_key,editable_table,field_registry_table,row_key_column,"
            "can_add_columns,can_hide_columns,can_edit_cells"
        )
        .eq("label", label)
        .limit(1)
        .execute()
    )
    return single_or_bad_request(response.data, "Unknown database category.")


def editable_categories(supabase: Client) -> dict[str, dict[str, Any]]:
    response = (
        supabase.table("database_categories")
        .select(
            "label,source_key,editable_table,field_registry_table,row_key_column,"
            "can_edit_cells"
        )
        .eq("can_edit_cells", True)
        .execute()
    )
    raw = response.data or []
    if not isinstance(raw, list):
        return {}
    rows = [cast(dict[str, Any], row) for row in raw if isinstance(row, dict)]
    return {str(row["label"]): row for row in rows}


def field_mapping(
    supabase: Client,
    category: dict[str, Any],
    field: str,
) -> dict[str, Any]:
    registry_table = category.get("field_registry_table")
    if not registry_table:
        raise ValueError("This category does not use field registry metadata.")

    response = (
        supabase.table(str(registry_table))
        .select(
            "field_key,ui_field,table_target,column_name,data_type,relation_table,"
            "relation_label_column,row_key_column,is_admin_editable"
        )
        .or_(f"field_key.eq.{field},ui_field.eq.{field}")
        .limit(1)
        .execute()
    )
    mapping = first_row(response.data)
    if mapping is None or not mapping.get("is_admin_editable"):
        raise ValueError("This field is not editable.")
    return mapping


def resolve_relation_value(
    supabase: Client,
    mapping: dict[str, Any],
    value: Any,
) -> Any:
    relation_table = mapping.get("relation_table")
    label_column = mapping.get("relation_label_column")
    if not relation_table or not label_column:
        return coerce_value(value, str(mapping["data_type"]))

    label = str(value or "").strip()
    if not label:
        return None

    existing = (
        supabase.table(str(relation_table))
        .select("id")
        .eq(str(label_column), label)
        .limit(1)
        .execute()
    )
    existing_row = first_row(existing.data)
    if existing_row:
        return existing_row["id"]

    created = (
        supabase.table(str(relation_table)).insert({str(label_column): label}).execute()
    )
    return single_or_bad_request(created.data, "Unable to create related row.")["id"]


def coerce_field_value(
    supabase: Client,
    mapping: dict[str, Any],
    value: Any,
) -> Any:
    if mapping.get("data_type") == "foreign_key":
        return resolve_relation_value(supabase, mapping, value)
    return coerce_value(value, str(mapping["data_type"]))


def write_audit(
    supabase: Client,
    change: DirtyCellChange,
    user: AdminUser,
    table_name: str,
    old_value: Any,
) -> None:
    supabase.table("admin_manual_edits").insert(
        {
            "category": change.category,
            "table_name": table_name,
            "row_id": str(change.row_id),
            "field_key": change.field,
            "old_value": old_value,
            "new_value": change.value,
            "edited_by": user.id,
            "edited_by_email": user.email,
            "provenance": {
                "source": "manual edit",
                "edited_by": user.id,
                "edited_by_email": user.email,
            },
        }
    ).execute()


def save_registered_field_change(
    supabase: Client,
    category: dict[str, Any],
    change: DirtyCellChange,
    user: AdminUser,
) -> None:
    mapping = field_mapping(supabase, category, change.field)
    table_name = str(mapping["table_target"])
    column_name = str(mapping["column_name"])
    key_column = str(
        mapping.get("row_key_column") or category.get("row_key_column") or "id"
    )
    value = coerce_field_value(supabase, mapping, change.value)

    previous = (
        supabase.table(table_name)
        .select(column_name)
        .eq(key_column, change.row_id)
        .limit(1)
        .execute()
    )
    previous_row = first_row(previous.data)
    old_value = previous_row.get(column_name) if previous_row else None

    if previous_row is None:
        supabase.table(table_name).insert(
            {key_column: change.row_id, column_name: value}
        ).execute()
    else:
        supabase.table(table_name).update({column_name: value}).eq(
            key_column, change.row_id
        ).execute()

    write_audit(supabase, change, user, table_name, old_value)


def save_metric_change(
    supabase: Client,
    category: dict[str, Any],
    change: DirtyCellChange,
    user: AdminUser,
) -> None:
    table_name = category.get("editable_table")
    key_column = str(category.get("row_key_column") or "id")
    if (
        not table_name
        or change.metric_row_id is None
        or not change.field.startswith("year_")
    ):
        raise ValueError("Only yearly metric values are editable.")

    value = coerce_value(change.value, "numeric")
    previous = (
        supabase.table(str(table_name))
        .select("value_numeric,fact_id")
        .eq(key_column, change.metric_row_id)
        .limit(1)
        .execute()
    )
    previous_row = single_or_bad_request(previous.data, "Metric row was not found.")
    old_value = previous_row.get("value_numeric")
    fact_id = previous_row.get("fact_id")

    supabase.table(str(table_name)).update({"value_numeric": value}).eq(
        key_column, change.metric_row_id
    ).execute()

    if fact_id:
        supabase.table("site_facts").update(
            {
                "value_numeric": value,
                "provenance": {
                    "source": "manual edit",
                    "edited_by": user.id,
                    "edited_by_email": user.email,
                },
            }
        ).eq("id", fact_id).execute()

    write_audit(supabase, change, user, str(table_name), old_value)


def save_database_change(
    supabase: Client,
    category: dict[str, Any],
    change: DirtyCellChange,
    user: AdminUser,
) -> None:
    if category.get("field_registry_table"):
        save_registered_field_change(supabase, category, change, user)
    else:
        save_metric_change(supabase, category, change, user)


def save_database_changes(
    supabase: Client,
    changes: list[DirtyCellChange],
    user: AdminUser,
) -> tuple[int, list[SaveFailure]]:
    categories = editable_categories(supabase)
    saved = 0
    failed: list[SaveFailure] = []

    for change in changes:
        try:
            category = categories.get(change.category)
            if category is None:
                raise ValueError("This category is not editable.")
            save_database_change(supabase, category, change, user)
            saved += 1
        except (APIError, ValueError) as exc:
            failed.append(
                SaveFailure.model_validate(
                    {
                        "rowId": change.row_id,
                        "field": change.field,
                        "message": str(exc),
                    }
                )
            )

    return saved, failed
