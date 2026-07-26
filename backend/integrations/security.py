from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import Iterable

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def mask_account_number(value: str) -> str:
    clean = "".join(character for character in str(value) if character.isdigit())
    if len(clean) <= 4:
        return f"•••• {clean}"
    return f"•••• {clean[-4:]}"


@dataclass(frozen=True)
class EncryptedSecret:
    ciphertext: str
    key_version: int


class CredentialVault:
    """AES-256-GCM keyring with versioned rotation support.

    Keys are supplied only through server environment variables. The first key
    encrypts new payloads; all configured keys can decrypt historical payloads.
    """

    def __init__(self, encoded_keys: Iterable[str], current_version: int = 1):
        self._keys = tuple(self._decode_key(value) for value in encoded_keys)
        if not self._keys:
            raise ValueError("Au moins une clé de chiffrement serveur est requise")
        if current_version < 1 or current_version > len(self._keys):
            raise ValueError("Version de clé de chiffrement invalide")
        self.current_version = current_version

    @staticmethod
    def _decode_key(value: str) -> bytes:
        try:
            key = base64.urlsafe_b64decode(value.encode("ascii"))
        except Exception as exc:
            raise ValueError("Clé de chiffrement invalide") from exc
        if len(key) != 32:
            raise ValueError("Une clé AES-256 doit contenir 32 octets")
        return key

    def encrypt_json(self, payload: dict, associated_data: str) -> EncryptedSecret:
        nonce = __import__("os").urandom(12)
        key = self._keys[self.current_version - 1]
        plaintext = json.dumps(
            payload, separators=(",", ":"), ensure_ascii=False
        ).encode("utf-8")
        encrypted = AESGCM(key).encrypt(
            nonce, plaintext, associated_data.encode("utf-8")
        )
        envelope = {
            "v": self.current_version,
            "n": base64.urlsafe_b64encode(nonce).decode("ascii"),
            "c": base64.urlsafe_b64encode(encrypted).decode("ascii"),
        }
        return EncryptedSecret(
            ciphertext=base64.urlsafe_b64encode(
                json.dumps(envelope).encode("utf-8")
            ).decode("ascii"),
            key_version=self.current_version,
        )

    def decrypt_json(self, ciphertext: str, associated_data: str) -> dict:
        try:
            envelope = json.loads(base64.urlsafe_b64decode(ciphertext.encode("ascii")))
            version = int(envelope["v"])
            nonce = base64.urlsafe_b64decode(envelope["n"])
            encrypted = base64.urlsafe_b64decode(envelope["c"])
            key = self._keys[version - 1]
            plaintext = AESGCM(key).decrypt(
                nonce, encrypted, associated_data.encode("utf-8")
            )
            return json.loads(plaintext.decode("utf-8"))
        except Exception as exc:
            raise ValueError("Impossible de déchiffrer les identifiants") from exc
