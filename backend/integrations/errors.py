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
            "La plateforme de trading est temporairement indisponible.",
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
        "Les identifiants sont incorrects. Vérifie le compte, "
        "le serveur et l’accès demandé par la plateforme."
    ),
    "server_not_found": "Le serveur MT5 est introuvable. Vérifie son nom exact dans MetaTrader.",
    "provider_unavailable": "La plateforme de trading est temporairement indisponible.",
    "connection_expired": "La connexion a expiré. Reconnecte la plateforme pour reprendre la synchronisation.",
    "rate_limit": "Synchronisation temporairement ralentie. PipsEvo réessaiera automatiquement.",
    "provider_request_rejected": "La plateforme a refusé cette requête. Vérifie la configuration du compte.",
    "no_transactions": "La connexion fonctionne, mais aucune transaction n’a été trouvée.",
    "partial_sync": "Une partie de l’historique a été importée. PipsEvo réessaiera automatiquement.",
    "provider_not_configured": "Cette plateforme n’est pas encore configurée côté serveur.",
    "oauth_state_invalid": "Cette autorisation a expiré ou a déjà été utilisée.",
    "provider_configuration_pending": "Termine la configuration chez le fournisseur avant de continuer.",
    "account_not_selected": "Sélectionne au moins un compte avant de synchroniser.",
    "sync_already_running": "Une synchronisation est déjà en cours.",
    "provider_invalid_response": "La plateforme a renvoyé une réponse inexploitable.",
}


def public_provider_error(code: str | None) -> str:
    return SAFE_PROVIDER_ERRORS.get(
        code or "",
        "La connexion n’a pas pu être terminée. Réessaie plus tard ou contacte le support.",
    )
