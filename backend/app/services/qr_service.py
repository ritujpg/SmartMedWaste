import base64
from io import BytesIO
from uuid import UUID

import qrcode

from app.core.config import get_settings
from app.utils.generators import tracking_url


class QRService:
    def qr_data_uri(self, waste_id: UUID) -> str:
        image = qrcode.make(tracking_url(waste_id, get_settings().track_base_url))
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()

    def barcode_reference(self, waste_code: str) -> str:
        return waste_code
