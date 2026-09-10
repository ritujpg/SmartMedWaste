from app.core.config import get_settings
from app.utils.enums import ComplianceStatus


def compliance_status(score: float) -> ComplianceStatus:
    settings = get_settings()
    if score >= settings.compliance_compliant_threshold:
        return ComplianceStatus.COMPLIANT
    if score >= settings.compliance_attention_threshold:
        return ComplianceStatus.NEEDS_ATTENTION
    return ComplianceStatus.CRITICAL


class ComplianceService:
    def calculate(self, segregation: float, timeliness: float, tracking: float) -> tuple[float, ComplianceStatus]:
        score = round((segregation + timeliness + tracking) / 3, 2)
        return score, compliance_status(score)
