# mypy: disable-error-code=untyped-decorator

import asyncio

from app.celery_main import celery_app
from app.data.namibiamme.services import fetch_license_data


@celery_app.task
def update() -> None:
    ml_list = asyncio.run(fetch_license_data("ML"))
    epl_list = asyncio.run(fetch_license_data("EPL"))
    clm_list = asyncio.run(fetch_license_data("CLM"))
    application_list = asyncio.run(fetch_license_data("APPLICATION"))
    print(f"Found {len(ml_list)} ML licenses.")
    print(f"Found {len(epl_list)} EPL licenses.")
    print(f"Found {len(clm_list)} CLM licenses.")    
    print(f"Found {len(application_list)} application licenses.")
