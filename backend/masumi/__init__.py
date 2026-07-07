import os
from .real import RealMasumiProvider
from .mock import MockMasumiProvider

def get_provider():
    if os.getenv("MASUMI_API_KEY") and os.getenv("USE_REAL_MASUMI", "false").lower() == "true":
        return RealMasumiProvider()
    return MockMasumiProvider()

masumi = get_provider()
