from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from app.core.database import engine
from app.data.database_admin.models import (
    AddColumnRequest,
    AdminUser,
    ColumnVisibilityRequest,
    SaveRowsRequest,
    SaveRowsResponse,
)
from app.data.database_admin.services import (
    category_by_label,
    require_admin_user,
    save_database_changes,
)

router = APIRouter(prefix="/database/admin", tags=["database-admin"])


@router.post("/columns")
async def add_column(
    payload: AddColumnRequest, user: Annotated[AdminUser, Depends(require_admin_user)]
) -> dict[str, Any]:
    category = category_by_label(payload.category)
    if not category.get("can_add_columns"):
        raise HTTPException(
            status_code=400,
            detail="Columns cannot be added to this category.",
        )

    response = engine.rpc(
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
) -> dict[str, bool]:
    category = category_by_label(payload.category)
    registry_table = category.get("field_registry_table")
    if not category.get("can_hide_columns") or not registry_table:
        raise HTTPException(
            status_code=400,
            detail="Columns cannot be hidden on this category.",
        )

    engine.table(str(registry_table)).update({"is_visible": payload.visible}).or_(
        f"field_key.eq.{payload.field},ui_field.eq.{payload.field}"
    ).execute()
    return {"ok": True}


@router.patch("/rows", response_model=SaveRowsResponse)
async def save_rows(
    payload: SaveRowsRequest, user: Annotated[AdminUser, Depends(require_admin_user)]
) -> SaveRowsResponse:
    saved, failed = save_database_changes(payload.changes, user)
    return SaveRowsResponse(saved=saved, failed=failed)
