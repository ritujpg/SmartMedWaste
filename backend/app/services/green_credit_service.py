from decimal import Decimal


class GreenCreditService:
    def calculate(self, quantity_kg: Decimal, correctly_segregated: bool) -> int:
        return max(0, int(quantity_kg * 10)) if correctly_segregated else 0
