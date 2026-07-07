import os
from .provider import PaymentProvider

def get_provider() -> PaymentProvider:
    if os.getenv("MASUMI_MODE", "mock") == "real":
        from .real import RealMasumiProvider
        return RealMasumiProvider()
    from .mock import MockMasumiProvider
    return MockMasumiProvider()

masumi: PaymentProvider = get_provider()
