from app.celery_main import celery_app
from app.core.config import get_settings
from app.data.models import MineralLicense
from app.data.services import FetchResult, fetch_data_source
import asyncio
from datetime import date
from dbfread import DBF
from zipfile import ZipFile


@celery_app.task
def update() -> None:
	settings = get_settings()

	# Fetch Namibia MLs
	fetch_result = asyncio.run(fetch_data_source(
		"https://www.mme.gov.na/geoserver/ednLayer/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ednLayer:MINERAL_LICENSE_ML_DOWNLOAD&outputFormat=SHAPE-ZIP",
		settings.download_directory/"namibiamme/ml.zip",
		"application/zip",
		timeout=60
	))
	with ZipFile(fetch_result.path, "r") as f:
		f.extractall(settings.download_directory/"namibiamme")
	ml_list = []
	for record in DBF(settings.download_directory/"namibiamme/MINERAL_LICENSE_ML_DOWNLOADPolygon.dbf", encoding="ansi"):
		ml_list.append(MineralLicense(
			"Namibia",
			str(record["REGIONS"]),
			str(record["LICENSE_TY"]),
			str(record["LICENSE_NO"]),
			str(record["STATUS"]),
			[i.strip() for i in str(record["APPLICANT"]).split(";")],
			record["APPLICATIO"],
			record["VALID_FROM"],
			record["VALID_TO"]
		))
	print(f"Found {len(ml_list)} ML licenses.")

	# Fetch Namibia EPLs
	fetch_result = asyncio.run(fetch_data_source(
		"https://www.mme.gov.na/geoserver/ednLayer/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ednLayer:MINERAL_LICENSE_EPL_DOWNLOAD&outputFormat=SHAPE-ZIP",
		settings.download_directory/"namibiamme/epl.zip",
		"application/zip",
		timeout=60
	))
	with ZipFile(fetch_result.path, "r") as f:
		f.extractall(settings.download_directory/"namibiamme")
	epl_list = []
	for record in DBF(settings.download_directory/"namibiamme/MINERAL_LICENSE_EPL_DOWNLOADPolygon.dbf", encoding="ansi"):
		epl_list.append(MineralLicense(
			"Namibia",
			str(record["REGIONS"]),
			str(record["LICENSE_TY"]),
			str(record["LICENSE_NO"]),
			str(record["STATUS"]),
			[i.strip() for i in str(record["APPLICANT"]).split(";")],
			record["APPLICATION"],
			record["VALID_FROM"],
			record["VALID_TO"]
		))
	print(f"Found {len(epl_list)} EPL licenses.")

	# Fetch Namibia CLMs
	fetch_result = asyncio.run(fetch_data_source(
		"https://www.mme.gov.na/geoserver/ednLayer/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ednLayer:MINERAL_LICENSE_CLM_DOWNLOAD&outputFormat=SHAPE-ZIP",
		settings.download_directory/"namibiamme/clm.zip",
		"application/zip",
		timeout=60
	))
	with ZipFile(fetch_result.path, "r") as f:
		f.extractall(settings.download_directory/"namibiamme")
	clm_list = []
	for record in DBF(settings.download_directory/"namibiamme/MINERAL_LICENSE_CLM_DOWNLOADPolygon.dbf", encoding="ansi"):
		clm_list.append(MineralLicense(
			"Namibia",
			str(record["REGIONS"]),
			str(record["LICENSE_TY"]),
			str(record["LICENSE_NO"]),
			str(record["STATUS"]),
			[i.strip() for i in str(record["APPLICANT"]).split(";")],
			record["APPLICATIO"],
			record["VALID_FROM"],
			record["VALID_TO"]
		))
	print(f"Found {len(clm_list)} CLM licenses.")

	# Fetch Namibia Applications
	fetch_result = asyncio.run(fetch_data_source(
		"https://www.mme.gov.na/geoserver/ednLayer/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ednLayer:MINERAL_LICENSE_APPLICATION_DOWNLOAD&outputFormat=SHAPE-ZIP",
		settings.download_directory/"namibiamme/application.zip",
		"application/zip",
		timeout=60
	))
	with ZipFile(fetch_result.path, "r") as f:
		f.extractall(settings.download_directory/"namibiamme")
	application_list = []
	for record in DBF(settings.download_directory/"namibiamme/MINERAL_LICENSE_APPLICATION_DOWNLOADPolygon.dbf", encoding="ansi"):
		application_list.append(MineralLicense(
			"Namibia",
			str(record["REGIONS"]),
			str(record["LICENSE_TY"]),
			str(record["LICENSE_NO"]),
			str(record["STATUS"]),
			[i.strip() for i in str(record["APPLICANT"]).split(";")],
			record["APPLICATIO"],
			record["VALID_FROM"],
			record["VALID_TO"]
		))
	print(f"Found {len(application_list)} application licenses.")