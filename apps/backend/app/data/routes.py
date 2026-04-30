from fastapi import APIRouter

import app.data.namibiamme.tasks as namibiamme_tasks

router = APIRouter()


@router.post("/update-data")
async def update_data() -> None:
    namibiamme_tasks.update.delay()
