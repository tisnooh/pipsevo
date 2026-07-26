import base64
import os

import pytest

from integrations.security import CredentialVault, mask_account_number


def encoded_key():
    return base64.urlsafe_b64encode(os.urandom(32)).decode("ascii")


def test_credentials_are_encrypted_and_bound_to_connection():
    vault = CredentialVault([encoded_key()])
    payload = {"investor_password": "sensitive-value", "account_number": "12345678"}
    encrypted = vault.encrypt_json(payload, "user:connection:provider")

    assert "sensitive-value" not in encrypted.ciphertext
    assert (
        vault.decrypt_json(encrypted.ciphertext, "user:connection:provider") == payload
    )
    with pytest.raises(ValueError):
        vault.decrypt_json(encrypted.ciphertext, "another-connection")


def test_account_number_is_masked():
    assert mask_account_number("12345678").endswith("5678")
    assert "1234" not in mask_account_number("12345678")
