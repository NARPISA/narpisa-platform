from io import BytesIO

import pytest
from pypdf import PdfWriter

from app.data.database_admin.models import AdminUser
from app.data.database_admin.services import require_admin_user
from app.main import app


@pytest.fixture(autouse=True)
def bypass_admin_dependency():
    app.dependency_overrides[require_admin_user] = lambda: AdminUser(
        id="00000000-0000-0000-0000-000000000001",
        email="admin@example.org",
    )
    yield
    app.dependency_overrides.pop(require_admin_user, None)


@pytest.fixture
def sample_pdf_bytes() -> bytes:
    buffer = BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=300, height=300)
    writer.write(buffer)
    return buffer.getvalue()
