"""USDA / FSIS recall proxy.

FSIS (www.fsis.usda.gov) sits behind Akamai bot-manager, which blocks any client
whose TLS fingerprint (JA3) isn't a real browser — plain curl / Node fetch /
.NET / Android OkHttp all get HTTP 403 "Access Denied", regardless of the
User-Agent header. `curl_cffi` performs a real Safari-iOS TLS handshake, which
Akamai lets through.

This HTTP function fetches the FSIS recall API server-side with that browser TLS
fingerprint and returns the JSON to the app, so EVERY device (incl. Android)
gets USDA meat/poultry recalls reliably. The app calls this instead of hitting
FSIS directly. A short in-memory cache (reused on warm instances) avoids
hammering FSIS on every scan.
"""
import json
import time

from curl_cffi import requests as cffi
from firebase_functions import https_fn, options

FSIS_URL = "https://www.fsis.usda.gov/fsis/api/recall/v/1"
CACHE_TTL_SECONDS = 30 * 60  # recalls change slowly; 30 min is plenty

# Module-level cache, reused across invocations on a warm instance.
_cache = {"ts": 0.0, "body": None}


def _json_response(body, status=200, cache_flag="MISS"):
    return https_fn.Response(
        body,
        status=status,
        headers={
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=900",
            "X-Cache": cache_flag,
        },
    )


@https_fn.on_request(
    region="us-central1",
    memory=options.MemoryOption.MB_512,
    timeout_sec=60,
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"]),
)
def usdaRecalls(req: https_fn.Request) -> https_fn.Response:
    now = time.time()

    # Fresh cache hit.
    if _cache["body"] is not None and (now - _cache["ts"]) < CACHE_TTL_SECONDS:
        return _json_response(_cache["body"], cache_flag="HIT")

    try:
        r = cffi.get(FSIS_URL, impersonate="safari_ios", timeout=40)
    except Exception as exc:  # network / TLS failure
        if _cache["body"] is not None:
            return _json_response(_cache["body"], cache_flag="STALE")
        return _json_response(json.dumps({"error": str(exc)}), status=502)

    # Akamai block returns 403, or sometimes an HTML "Access Denied" page with
    # status 200 — guard on the JSON array shape.
    if r.status_code != 200 or not r.text.lstrip().startswith("["):
        if _cache["body"] is not None:
            return _json_response(_cache["body"], cache_flag="STALE")
        return _json_response(
            json.dumps({"error": f"FSIS upstream status {r.status_code}"}),
            status=502,
        )

    _cache["body"] = r.text
    _cache["ts"] = now
    return _json_response(r.text, cache_flag="MISS")
