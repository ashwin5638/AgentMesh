import hashlib
import hmac
import secrets
import time


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


def verify_signature(
    secret: str, timestamp: str, body: bytes, signature: str, max_age_seconds: int = 300
) -> bool:
    """Verify HMAC-SHA256 signature and reject timestamps older than max_age_seconds to prevent replay attacks."""
    try:
        ts = float(timestamp)
        if abs(time.time() - ts) > max_age_seconds:
            return False
    except (ValueError, TypeError):
        return False

    expected = sign_payload(secret, timestamp, body)
    return hmac.compare_digest(expected, signature)


def is_safe_webhook_url(url: str, allow_local: bool = False) -> tuple[bool, str]:
    """Validate webhook URL against SSRF attacks (private IPs, loopback, cloud metadata)."""
    import ipaddress
    import socket
    from urllib.parse import urlparse

    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False, f"Scheme '{parsed.scheme}' not allowed. Must be http or https."
        if not parsed.hostname:
            return False, "URL must contain a valid hostname."

        host = parsed.hostname.lower()
        if host in ("localhost", "127.0.0.1", "::1", "0.0.0.0") and not allow_local:
            return False, f"Loopback host '{host}' is prohibited."

        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        addr_info = socket.getaddrinfo(host, port)
        for _, _, _, _, sockaddr in addr_info:
            ip = ipaddress.ip_address(sockaddr[0])
            if not allow_local and (
                ip.is_loopback
                or ip.is_private
                or ip.is_link_local
                or ip.is_multicast
                or ip.is_reserved
            ):
                return False, f"IP address {ip} is restricted (private or loopback)."
        return True, "OK"
    except Exception as exc:
        return False, f"Failed to resolve hostname: {exc}"
