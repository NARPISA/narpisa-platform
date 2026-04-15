import app.data.namibiamme.tasks as namibiamme_tasks
from fastapi import APIRouter


router = APIRouter()


@router.post("/update-data")
async def update_data() -> None:
	namibiamme_tasks.update.delay()