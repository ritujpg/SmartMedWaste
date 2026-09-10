from decimal import Decimal

from app.services.compliance_service import ComplianceService
from app.services.green_credit_service import GreenCreditService
from app.utils.enums import ComplianceStatus


def test_compliance_thresholds_are_configurable_defaults():
    score, status = ComplianceService().calculate(96, 88, 98)
    assert score == 94
    assert status == ComplianceStatus.COMPLIANT


def test_green_credits_are_demo_points_not_money():
    assert GreenCreditService().calculate(Decimal("12.5"), True) == 125
    assert GreenCreditService().calculate(Decimal("12.5"), False) == 0
