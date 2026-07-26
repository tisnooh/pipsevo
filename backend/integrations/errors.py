from __future__ import annotations


class IntegrationError(Exception):
    def __init__(self, code: str, public_message: str, status_code: int = 400):
        super().__init__(public_message)
        self.code = code
        self.public_message = public_message
        self.status_code = status_code


class FeatureDisabledError(IntegrationError):
    def __init__(self):
        super().__init__(
            "feature_disabled",
            "La connexion MetaTrader 5 sera bientôt disponible.",
            503,
        )


class ProviderUnavailableError(IntegrationError):
    def __init__(self):
        super().__init__(
            "provider_unavailable",
            "Le service de connexion MetaTrader 5 est temporairement indisponible.",
            503,
        )


class ConnectionRateLimitError(IntegrationError):
    def __init__(self):
        super().__init__(
            "connection_rate_limited",
            "Trop de tentatives de connexion. Réessaie dans quelques minutes.",
            429,
        )


SAFE_PROVIDER_ERRORS = {
    "invalid_credentials": (
        "Les identifiants sont incorrects. Vérifie le numéro, "
        "le serveur et le mot de passe investisseur."
    ),
    "server_not_found": "Le serveur MT5 est introuvable. Vérifie son nom exact dans MetaTrader.",
    "provider_unavailable": "Le service de connexion MetaTrader 5 est temporairement indisponible.",
    "connection_expired": "La connexion a expiré. Reconnecte le compte avec ton accès investisseur.",
    "no_transactions": "La connexion fonctionne, mais aucune transaction n’a été trouvée.",
    "partial_sync": "Une partie de l’historique a été importée. PipsEvo réessaiera automatiquement.",
}


def public_provider_error(code: str | None) -> str:
    return SAFE_PROVIDER_ERRORS.get(
        code or "",
        "La connexion n’a pas pu être terminée. Réessaie plus tard ou contacte le support.",
    )
