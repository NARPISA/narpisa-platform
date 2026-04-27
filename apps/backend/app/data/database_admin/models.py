from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

AdminColumnDataType = Literal["text", "numeric", "integer", "date", "boolean", "enum"]


class AddColumnRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category: str = Field(min_length=1)
    label: str = Field(min_length=1, max_length=64)
    data_type: AdminColumnDataType = Field(alias="dataType")
    enum_options: list[str] | None = Field(default=None, alias="enumOptions")


class ColumnVisibilityRequest(BaseModel):
    category: str = Field(min_length=1)
    field: str = Field(min_length=1)
    visible: bool


class DirtyCellChange(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category: str = Field(min_length=1)
    row_id: int = Field(alias="rowId")
    field: str = Field(min_length=1)
    value: str | int | float | bool | None = None
    original_value: str | int | float | bool | None = Field(
        default=None,
        alias="originalValue",
    )
    metric_row_id: int | None = Field(default=None, alias="metricRowId")


class SaveRowsRequest(BaseModel):
    changes: list[DirtyCellChange] = Field(min_length=1)


class SaveFailure(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    row_id: int = Field(alias="rowId")
    field: str
    message: str


class SaveRowsResponse(BaseModel):
    saved: int
    failed: list[SaveFailure]


class AdminUser(BaseModel):
    id: str
    email: str | None = None


JsonValue = dict[str, Any] | list[Any] | str | int | float | bool | None
