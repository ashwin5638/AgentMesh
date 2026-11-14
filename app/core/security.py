import hashlib
import hmac
import secrets

def generate_api_key() -> str:
    return "asama_" + secrets.token_urlsafe(32)

def generate_webhook_secret() -> str:
    return "whsec_" + secrets.token_urlsafe(32)


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()


def sign_payload(secret: str, timestamp: str, body: bytes) -> str:
    """HMAC-SHA256 over '<timestamp>.<body>'."""
    message = timestamp.encode() + b"." + body
    digest = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def verify_signature(secret: str, timestamp: str, body: bytes, signature: str) -> bool:
    """For recipient agents to use. Also reject old timestamps to stop replays."""
    expected = sign_payload(secret, timestamp, body)
    return hmac.compare_digest(expected, signature)