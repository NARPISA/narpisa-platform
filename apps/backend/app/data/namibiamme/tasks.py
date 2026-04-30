# mypy: disable-error-code=untyped-decorator

import asyncio
import json
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any, TypeVar, cast

from supabase import Client, create_client

from app.celery_main import celery_app
from app.core.config import get_settings
from app.data.services import FetchResult, fetch_data_source

SOURCE_SYSTEM = "namibia_mme"
NAMIBIA_COUNTRY = "Namibia"
CHUNK_SIZE = 500
T = TypeVar("T")


@dataclass(frozen=True)
class MmeLayer:
    key: str
    code: str
    label: str
    zip_name: str
    type_name: str

    @property
    def url(self) -> str:
        return (
            "https://www.mme.gov.na/geoserver/ednLayer/ows?"
            "service=WFS&version=1.0.0&request=GetFeature&"
            f"typeName=ednLayer:{self.type_name}&outputFormat=SHAPE-ZIP"
        )


LAYERS: tuple[MmeLayer, ...] = (
    MmeLayer(
        key="ml",
        code="ML",
        label="Mining License",
        zip_name="ml.zip",
        type_name="MINERAL_LICENSE_ML_DOWNLOAD",
    ),
    MmeLayer(
        key="epl",
        code="EPL",
        label="Exclusive Prospecting License",
        zip_name="epl.zip",
        type_name="MINERAL_LICENSE_EPL_DOWNLOAD",
    ),
    MmeLayer(
        key="clm",
        code="CLM",
        label="Mining Claim",
        zip_name="clm.zip",
        type_name="MINERAL_LICENSE_CLM_DOWNLOAD",
    ),
    MmeLayer(
        key="applications",
        code="APPLICATION",
        label="Applications",
        zip_name="application.zip",
        type_name="MINERAL_LICENSE_APPLICATION_DOWNLOAD",
    ),
)


def _chunks(values: list[T], size: int = CHUNK_SIZE) -> list[list[T]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def _first_row(response_data: Any) -> dict[str, Any] | None:
    if isinstance(response_data, list) and response_data:
        first = response_data[0]
        return cast(dict[str, Any], first) if isinstance(first, dict) else None
    return None


def _utc_now() -> str:
    return datetime.now(UTC).isoformat()


def _string_field(properties: dict[str, Any], field: str) -> str | None:
    value = properties.get(field)
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _date_field(properties: dict[str, Any], *fields: str) -> str | None:
    value = next(
        (properties[field] for field in fields if properties.get(field) is not None),
        None,
    )
    if isinstance(value, date):
        return value.isoformat()
    if value is None:
        return None

    text = str(value).strip()
    if not text:
        return None

    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(text[:10], fmt).date().isoformat()
        except ValueError:
            continue

    return text[:10]


def _applicants(properties: dict[str, Any]) -> list[str]:
    raw = _string_field(properties, "APPLICANT")
    if raw is None:
        return []
    return [applicant.strip() for applicant in raw.split(";") if applicant.strip()]


def _normalized_status(raw_status: str | None) -> str:
    status = (raw_status or "").lower()
    active_markers = ("active", "application", "current", "pending", "renewal", "valid")
    has_active_marker = any(marker in status for marker in active_markers)
    return "active" if has_active_marker else "inactive"


def _json_safe(value: Any) -> Any:
    if value is None:
        return None
    try:
        if value != value:
            return None
    except TypeError:
        pass
    if isinstance(value, date):
        return value.isoformat()
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list | tuple):
        return [_json_safe(item) for item in value]
    if isinstance(value, int | float | str | bool):
        return value
    return str(value)


def _bbox(geometry: dict[str, Any] | None) -> list[float] | None:
    coordinates = geometry.get("coordinates") if geometry else None
    if not isinstance(coordinates, list):
        return None

    points: list[tuple[float, float]] = []

    def collect(value: Any) -> None:
        if (
            isinstance(value, list)
            and len(value) >= 2
            and isinstance(value[0], (int, float))
            and isinstance(value[1], (int, float))
        ):
            points.append((float(value[0]), float(value[1])))
            return
        if isinstance(value, list):
            for item in value:
                collect(item)

    collect(coordinates)
    if not points:
        return None

    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return [min(xs), min(ys), max(xs), max(ys)]


def _features_from_shape_zip(zip_path: str) -> list[dict[str, Any]]:
    import geopandas as gpd  # type: ignore[import-untyped]
    from shapely.geometry import mapping  # type: ignore[import-untyped]

    frame = gpd.read_file(f"zip://{zip_path}")
    if frame.crs:
        frame = frame.to_crs(epsg=4326)

    features: list[dict[str, Any]] = []
    for _, row in frame.iterrows():
        geometry = row.geometry
        if geometry is None or geometry.is_empty:
            continue

        properties = {
            str(key): _json_safe(value)
            for key, value in row.items()
            if key != frame.geometry.name
        }
        features.append(
            {
                "type": "Feature",
                "geometry": json.loads(json.dumps(mapping(geometry))),
                "properties": properties,
            }
        )
    return features


def _country_id(supabase: Client) -> int:
    response = (
        supabase.table("countries")
        .select("id")
        .eq("name", NAMIBIA_COUNTRY)
        .limit(1)
        .execute()
    )
    country = _first_row(response.data)
    if country is not None:
        return int(country["id"])

    created = supabase.table("countries").insert({"name": NAMIBIA_COUNTRY}).execute()
    created_country = _first_row(created.data)
    if created_country is None:
        raise RuntimeError("Unable to create Namibia country row.")
    return int(created_country["id"])


def _source_hash(supabase: Client, layer: MmeLayer) -> str | None:
    response = (
        supabase.table("mme_source_files")
        .select("content_hash")
        .eq("layer_key", layer.key)
        .limit(1)
        .execute()
    )
    row = _first_row(response.data)
    return str(row["content_hash"]) if row and row.get("content_hash") else None


def _record_source_fetch(
    supabase: Client,
    layer: MmeLayer,
    fetch_result: FetchResult,
    *,
    feature_count: int | None = None,
    error: str | None = None,
) -> None:
    payload: dict[str, Any] = {
        "layer_key": layer.key,
        "layer_label": layer.label,
        "source_url": layer.url,
        "content_hash": fetch_result.hash,
        "source_status": fetch_result.source_status,
        "last_fetched_at": _utc_now(),
        "last_error": error,
    }
    if feature_count is not None:
        payload["feature_count"] = feature_count
        payload["last_processed_at"] = _utc_now()

    supabase.table("mme_source_files").upsert(
        payload,
        on_conflict="layer_key",
    ).execute()


def _upsert_licenses(
    supabase: Client,
    layer: MmeLayer,
    features: list[dict[str, Any]],
    country_id: int,
) -> dict[str, int]:
    rows_by_license_no: dict[str, dict[str, Any]] = {}

    for index, feature in enumerate(features):
        properties = cast(dict[str, Any], feature.get("properties") or {})
        license_no = (
            _string_field(properties, "LICENSE_NO") or f"{layer.code}-{index + 1}"
        )
        raw_status = _string_field(properties, "STATUS")
        rows_by_license_no[license_no] = {
            "type": layer.label,
            "country_id": country_id,
            "region": _string_field(properties, "REGIONS"),
            "status": _normalized_status(raw_status),
            "applicants": _applicants(properties),
            "application_date": _date_field(
                properties,
                "APPLICATION",
                "APPLICATIO",
            ),
            "start_date": _date_field(properties, "VALID_FROM"),
            "end_date": _date_field(properties, "VALID_TO"),
            "source_system": SOURCE_SYSTEM,
            "source_layer": layer.key,
            "source_license_no": license_no,
            "source_status": raw_status,
            "source_properties": properties,
        }

    rows = list(rows_by_license_no.values())
    license_numbers = list(rows_by_license_no)
    license_ids: dict[str, int] = {}
    for license_number_batch in _chunks(license_numbers):
        response = (
            supabase.table("licenses")
            .select("id,source_license_no")
            .eq("source_system", SOURCE_SYSTEM)
            .eq("source_layer", layer.key)
            .in_("source_license_no", license_number_batch)
            .execute()
        )
        for row in response.data or []:
            if isinstance(row, dict):
                license_ids[str(row["source_license_no"])] = int(row["id"])

    rows_to_insert: list[dict[str, Any]] = []
    rows_to_update: list[dict[str, Any]] = []
    for row in rows:
        license_no = str(row["source_license_no"])
        existing_id = license_ids.get(license_no)
        if existing_id is None:
            rows_to_insert.append(row)
            continue
        rows_to_update.append({"id": existing_id, **row})

    for row_batch in _chunks(rows_to_insert):
        supabase.table("licenses").insert(row_batch).execute()

    for row_batch in _chunks(rows_to_update):
        supabase.table("licenses").upsert(
            row_batch,
            on_conflict="id",
        ).execute()

    if rows_to_insert:
        inserted_numbers = [str(row["source_license_no"]) for row in rows_to_insert]
        for license_number_batch in _chunks(inserted_numbers):
            response = (
                supabase.table("licenses")
                .select("id,source_license_no")
                .eq("source_system", SOURCE_SYSTEM)
                .eq("source_layer", layer.key)
                .in_("source_license_no", license_number_batch)
                .execute()
            )
            for row in response.data or []:
                if isinstance(row, dict):
                    license_ids[str(row["source_license_no"])] = int(row["id"])

    return license_ids


def _replace_geometries(
    supabase: Client,
    layer: MmeLayer,
    features: list[dict[str, Any]],
    license_ids: dict[str, int],
    source_hash: str,
) -> None:
    supabase.table("license_geometries").delete().eq("source_system", SOURCE_SYSTEM).eq(
        "source_layer", layer.key
    ).execute()

    rows: list[dict[str, Any]] = []
    for index, feature in enumerate(features):
        properties = cast(dict[str, Any], feature.get("properties") or {})
        license_no = (
            _string_field(properties, "LICENSE_NO") or f"{layer.code}-{index + 1}"
        )
        license_id = license_ids.get(license_no)
        geometry = cast(dict[str, Any] | None, feature.get("geometry"))
        if license_id is None or geometry is None:
            continue

        rows.append(
            {
                "license_id": license_id,
                "source_system": SOURCE_SYSTEM,
                "source_layer": layer.key,
                "source_feature_id": f"{license_no}:{index + 1}",
                "geometry_geojson": geometry,
                "bbox": _bbox(geometry),
                "properties": properties,
                "source_hash": source_hash,
            }
        )

    for batch in _chunks(rows):
        supabase.table("license_geometries").insert(batch).execute()


def _sync_layer(supabase: Client, layer: MmeLayer, country_id: int) -> None:
    settings = get_settings()
    download_dir = settings.download_directory / "namibiamme"
    download_dir.mkdir(parents=True, exist_ok=True)
    fetch_result = asyncio.run(
        fetch_data_source(
            layer.url,
            download_dir / layer.zip_name,
            "application/zip",
            timeout=60,
        )
    )

    if _source_hash(supabase, layer) == fetch_result.hash:
        _record_source_fetch(supabase, layer, fetch_result)
        print(f"Skipped unchanged {layer.label} source.")
        return

    features = _features_from_shape_zip(str(fetch_result.path))
    license_ids = _upsert_licenses(supabase, layer, features, country_id)
    _replace_geometries(supabase, layer, features, license_ids, fetch_result.hash)
    _record_source_fetch(
        supabase,
        layer,
        fetch_result,
        feature_count=len(features),
    )
    print(f"Imported {len(features)} {layer.label} features.")


@celery_app.task
def update() -> None:
    settings = get_settings()
    supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
    country_id = _country_id(supabase)

    for layer in LAYERS:
        _sync_layer(supabase, layer, country_id)
# mypy: disable-error-code=untyped-decorator

import asyncio
from zipfile import ZipFile

from dbfread import DBF  # type: ignore[import-untyped]

from app.celery_main import celery_app
from app.core.config import get_settings
from app.data.models import MineralLicense
from app.data.services import fetch_data_source


@celery_app.task
def update() -> None:
    settings = get_settings()

    # Fetch Namibia MLs
    fetch_result = asyncio.run(
        fetch_data_source(
            "https://www.mme.gov.na/geoserver/ednLayer/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ednLayer:MINERAL_LICENSE_ML_DOWNLOAD&outputFormat=SHAPE-ZIP",
            settings.download_directory / "namibiamme/ml.zip",
            "application/zip",
            timeout=60,
        )
    )
    with ZipFile(fetch_result.path, "r") as f:
        f.extractall(settings.download_directory / "namibiamme")
    ml_list = []
    for record in DBF(
        settings.download_directory
        / "namibiamme/MINERAL_LICENSE_ML_DOWNLOADPolygon.dbf",
        encoding="ansi",
    ):
        ml_list.append(
            MineralLicense(
                id=str(record["LICENSE_NO"]),
                type=str(record["LICENSE_TY"]),
                country="Namibia",
                regions=str(record["REGIONS"]),
                status=str(record["STATUS"]),
                applicants=[i.strip() for i in str(record["APPLICANT"]).split(";")],
                application_date=record["APPLICATION"],
                start_date=record["VALID_FROM"],
                end_date=record["VALID_TO"],
            )
        )
    print(f"Found {len(ml_list)} ML licenses.")

    # Fetch Namibia EPLs
    fetch_result = asyncio.run(
        fetch_data_source(
            "https://www.mme.gov.na/geoserver/ednLayer/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ednLayer:MINERAL_LICENSE_EPL_DOWNLOAD&outputFormat=SHAPE-ZIP",
            settings.download_directory / "namibiamme/epl.zip",
            "application/zip",
            timeout=60,
        )
    )
    with ZipFile(fetch_result.path, "r") as f:
        f.extractall(settings.download_directory / "namibiamme")
    epl_list = []
    for record in DBF(
        settings.download_directory
        / "namibiamme/MINERAL_LICENSE_EPL_DOWNLOADPolygon.dbf",
        encoding="ansi",
    ):
        epl_list.append(
            MineralLicense(
                id=str(record["LICENSE_NO"]),
                type=str(record["LICENSE_TY"]),
                country="Namibia",
                regions=str(record["REGIONS"]),
                status=str(record["STATUS"]),
                applicants=[i.strip() for i in str(record["APPLICANT"]).split(";")],
                application_date=record["APPLICATION"],
                start_date=record["VALID_FROM"],
                end_date=record["VALID_TO"],
            )
        )
    print(f"Found {len(epl_list)} EPL licenses.")

    # Fetch Namibia CLMs
    fetch_result = asyncio.run(
        fetch_data_source(
            "https://www.mme.gov.na/geoserver/ednLayer/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ednLayer:MINERAL_LICENSE_CLM_DOWNLOAD&outputFormat=SHAPE-ZIP",
            settings.download_directory / "namibiamme/clm.zip",
            "application/zip",
            timeout=60,
        )
    )
    with ZipFile(fetch_result.path, "r") as f:
        f.extractall(settings.download_directory / "namibiamme")
    clm_list = []
    for record in DBF(
        settings.download_directory
        / "namibiamme/MINERAL_LICENSE_CLM_DOWNLOADPolygon.dbf",
        encoding="ansi",
    ):
        clm_list.append(
            MineralLicense(
                id=str(record["LICENSE_NO"]),
                type=str(record["LICENSE_TY"]),
                country="Namibia",
                regions=str(record["REGIONS"]),
                status=str(record["STATUS"]),
                applicants=[i.strip() for i in str(record["APPLICANT"]).split(";")],
                application_date=record["APPLICATION"],
                start_date=record["VALID_FROM"],
                end_date=record["VALID_TO"],
            )
        )
    print(f"Found {len(clm_list)} CLM licenses.")

    # Fetch Namibia Applications
    fetch_result = asyncio.run(
        fetch_data_source(
            "https://www.mme.gov.na/geoserver/ednLayer/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ednLayer:MINERAL_LICENSE_APPLICATION_DOWNLOAD&outputFormat=SHAPE-ZIP",
            settings.download_directory / "namibiamme/application.zip",
            "application/zip",
            timeout=60,
        )
    )
    with ZipFile(fetch_result.path, "r") as f:
        f.extractall(settings.download_directory / "namibiamme")
    application_list = []
    for record in DBF(
        settings.download_directory
        / "namibiamme/MINERAL_LICENSE_APPLICATION_DOWNLOADPolygon.dbf",
        encoding="ansi",
    ):
        application_list.append(
            MineralLicense(
                id=str(record["LICENSE_NO"]),
                type=str(record["LICENSE_TY"]),
                country="Namibia",
                regions=str(record["REGIONS"]),
                status=str(record["STATUS"]),
                applicants=[i.strip() for i in str(record["APPLICANT"]).split(";")],
                application_date=record["APPLICATION"],
                start_date=record["VALID_FROM"],
                end_date=record["VALID_TO"],
            )
        )
    print(f"Found {len(application_list)} application licenses.")
