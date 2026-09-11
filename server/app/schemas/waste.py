from pydantic import BaseModel, Field
from typing import Optional, Literal


class ClassificationRequest(BaseModel):
    image_base64: str
    file_name: Optional[str] = None


class ClassificationResponse(BaseModel):
    predicted_category: Literal["YELLOW", "RED", "WHITE", "BLUE"]
    assessment_confidence: float = Field(..., ge=0.0, le=1.0)
    recommended_bin: str
    reason: str
    requires_human_verification: bool
