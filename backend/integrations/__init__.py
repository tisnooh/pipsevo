"""Provider-agnostic, read-only trading integration layer for PipsEvo."""

from .connectors import (
    CTraderConnector,
    MetaApiConnector,
    TradeLockerConnector,
    TradovateConnector,
)


def register_configured_connectors(config, registry) -> None:
    """Register only connectors whose complete server configuration exists."""

    if config.provider_enabled("ctrader"):
        settings = config.provider_config("ctrader")
        registry.register(CTraderConnector(**settings))
    if config.provider_enabled("metaapi"):
        settings = config.provider_config("metaapi")
        registry.register(MetaApiConnector(settings["token"], settings["domain"]))
    if config.provider_enabled("tradelocker"):
        settings = config.provider_config("tradelocker")
        registry.register(TradeLockerConnector(settings["demo_url"], settings["live_url"]))
    if config.provider_enabled("tradovate"):
        settings = config.provider_config("tradovate")
        registry.register(TradovateConnector(**settings))

from .config import IntegrationConfig
from .service import IntegrationService

__all__ = ["IntegrationConfig", "IntegrationService"]
