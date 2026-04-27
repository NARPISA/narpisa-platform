from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import Settings, get_settings
from app.data.database_admin.models import (
    AddColumnRequest,
    AdminUser,
    ColumnVisibilityRequest,
    SaveRowsRequest,
    SaveRowsResponse,
)
from app.data.database_admin.services import (
    category_by_label,
    create_service_client,
    require_admin_user,
    save_database_changes,
)

router = APIRouter(prefix="/database/admin", tags=["database-admin"])


@router.post("/columns")
async def add_column(
    payload: AddColumnRequest,
    user: Annotated[AdminUser, Depends(require_admin_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    supabase = create_service_client(settings)
    category = category_by_label(supabase, payload.category)
    if not category.get("can_add_columns"):
        raise HTTPException(
            status_code=400,
            detail="Columns cannot be added to this category.",
        )

    response = supabase.rpc(
        "admin_create_database_column",
        {
            "target_category": category["source_key"],
            "column_label": payload.label,
            "data_type": payload.data_type,
            "enum_options": payload.enum_options or [],
        },
    ).execute()
    return {"column": response.data, "editedBy": user.id}


@router.patch("/columns/visibility")
async def set_column_visibility(
    payload: ColumnVisibilityRequest,
    _user: Annotated[AdminUser, Depends(require_admin_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, bool]:
    supabase = create_service_client(settings)
    category = category_by_label(supabase, payload.category)
    registry_table = category.get("field_registry_table")
    if not category.get("can_hide_columns") or not registry_table:
        raise HTTPException(
            status_code=400,
            detail="Columns cannot be hidden on this category.",
        )

    supabase.table(str(registry_table)).update({"is_visible": payload.visible}).or_(
        f"field_key.eq.{payload.field},ui_field.eq.{payload.field}"
    ).execute()
    return {"ok": True}


@router.patch("/rows", response_model=SaveRowsResponse)
async def save_rows(
    payload: SaveRowsRequest,
    user: Annotated[AdminUser, Depends(require_admin_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SaveRowsResponse:
    supabase = create_service_client(settings)
    saved, failed = save_database_changes(supabase, payload.changes, user)
    return SaveRowsResponse(saved=saved, failed=failed)
