from zipfile import ZipFile

from dbfread import DBF

from app.core.config import get_settings
from app.data.models import MineralLicense, LicenseStatus
from app.data.services import fetch_data_source


_settings = get_settings()


async def fetch_license_data(license_type : str) -> list[MineralLicense]:
    license_type = license_type.upper()
    if license_type not in ["ML", "EPL", "CLM", "APPLICATION"]:
        raise ValueError(f"{license_type} is not a valid Namibian license type")
    
    fetch_result = await fetch_data_source(
            f"https://www.mme.gov.na/geoserver/ednLayer/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ednLayer:MINERAL_LICENSE_{license_type}_DOWNLOAD&outputFormat=SHAPE-ZIP",
            _settings.download_directory / "namibiamme/ml.zip",
            "application/zip",
            timeout=_settings.fetch_timeout_seconds,
            chunk_size=_settings.fetch_chunk_size_bytes,
            max_size=_settings.fetch_max_bytes
    )
    with ZipFile(fetch_result.path, "r") as f:
        f.extractall(_settings.download_directory / "namibiamme")
    licenses = []
    for record in DBF(
        _settings.download_directory/f"namibiamme/MINERAL_LICENSE_{license_type}_DOWNLOADPolygon.dbf",
        encoding="ansi",
    ):
        status = LicenseStatus.ACTIVE if str(record["STATUS"]).lower() == "active" else LicenseStatus.INACTIVE

        licenses.append(
            MineralLicense(
                id=str(record["LICENSE_NO"]),
                type=str(record["LICENSE_TY"]),
                country="Namibia",
                regions=str(record["REGIONS"]),
                status=status,
                applicants=[i.strip() for i in str(record["APPLICANT"]).split(";")],
                application_date=record["APPLICATIO"],
                start_date=record["VALID_FROM"],
                end_date=record["VALID_TO"],
            )
        )
    return licenses