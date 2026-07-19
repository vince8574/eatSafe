"""USDA / FSIS + FDA press-release recall proxies.

FSIS (www.fsis.usda.gov) and www.fda.gov sit behind Akamai bot-manager, which
blocks any client whose TLS fingerprint (JA3) isn't a real browser — plain
curl / Node fetch / .NET / Android OkHttp all get HTTP 403 "Access Denied" (or
an "FDA Apology" page), regardless of the User-Agent header. `curl_cffi`
performs a real Safari-iOS TLS handshake, which Akamai lets through.

These HTTP functions fetch the upstream feeds server-side with that browser TLS
fingerprint and return JSON to the app, so EVERY device (incl. Android) gets
them reliably. Short in-memory caches (reused on warm instances) avoid
hammering the upstreams on every scan.

- usdaRecalls: FSIS recall API (meat/poultry), raw JSON pass-through.
- fdaPress:    FDA "Recalls, Market Withdrawals & Safety Alerts" RSS feed,
               parsed server-side into a compact JSON array. Press releases
               appear DAYS before the openFDA enforcement dataset ingests them
               (real case: Taylor Fresh Foods iceberg/Cyclospora, July 2026),
               and often carry no structured lot numbers — the app uses them
               ONLY for the amber "possible recall — verify" warning path.
"""
import json
import time
import xml.etree.ElementTree as ET

from curl_cffi import requests as cffi
from firebase_functions import https_fn, options

FSIS_URL = "https://www.fsis.usda.gov/fsis/api/recall/v/1"
FDA_RSS_URL = (
    "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml"
)
# Repli quand Akamai refuse l'IP datacenter sur fda.gov (401 systématique même
# avec un TLS navigateur) : Google News restreint à fda.gov reprend les mêmes
# communiqués (titres identiques, lien redirigé vers fda.gov).
GOOGLE_NEWS_RSS_URL = (
    "https://news.google.com/rss/search?q=recall%20site:fda.gov&hl=en-US&gl=US&ceid=US:en"
)
CACHE_TTL_SECONDS = 30 * 60  # recalls change slowly; 30 min is plenty

# Module-level caches, reused across invocations on a warm instance.
_cache = {"ts": 0.0, "body": None}
_press_cache = {"ts": 0.0, "body": None}


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


def _strip_html(text: str) -> str:
    import re

    return re.sub(r"<[^>]+>", " ", text).replace("&nbsp;", " ").strip()


def _parse_press_rss(xml_text: str) -> str:
    """RSS (FDA direct ou Google News) → JSON compact
    [{title, description, link, pubDate}]. Les titres Google News sont
    suffixés " - fda.gov" → retiré pour retrouver le titre FDA exact."""
    root = ET.fromstring(xml_text)
    items = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        for suffix in (" - fda.gov", " - FDA (.gov)", " - FDA"):
            if title.endswith(suffix):
                title = title[: -len(suffix)].strip()
                break
        items.append(
            {
                "title": title,
                "description": _strip_html(item.findtext("description") or "")[:500],
                "link": (item.findtext("link") or "").strip(),
                "pubDate": (item.findtext("pubDate") or "").strip(),
            }
        )
    return json.dumps(items)


@https_fn.on_request(
    region="us-central1",
    memory=options.MemoryOption.MB_512,
    timeout_sec=60,
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"]),
)
def fdaPress(req: https_fn.Request) -> https_fn.Response:
    now = time.time()

    if _press_cache["body"] is not None and (now - _press_cache["ts"]) < CACHE_TTL_SECONDS:
        return _json_response(_press_cache["body"], cache_flag="HIT")

    # fda.gov est plus agressif que FSIS envers les IP datacenter : safari_ios
    # seul renvoie 401 depuis GCP. On essaie une ÉCHELLE de profils TLS avec des
    # en-têtes navigateur complets ; le premier XML valide gagne.
    headers = {
        "Accept": "application/rss+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
    }
    body = None
    last_err = "no attempt"
    for profile in ("chrome", "safari_ios"):
        try:
            r = cffi.get(FDA_RSS_URL, impersonate=profile, headers=headers, timeout=30)
            # Akamai block returns 401/403 or an HTML "FDA Apology" page (some-
            # times with 200) — guard on the XML shape, then parse.
            if r.status_code == 200 and r.text.lstrip().startswith("<?xml"):
                body = _parse_press_rss(r.text)
                break
            last_err = f"FDA upstream status {r.status_code} ({profile})"
        except Exception as exc:  # network / TLS / parse failure
            last_err = f"{profile}: {exc}"

    # Repli Google News (mêmes communiqués, pas d'Akamai côté Google).
    if body is None:
        try:
            r = cffi.get(GOOGLE_NEWS_RSS_URL, impersonate="chrome", timeout=30)
            if r.status_code == 200 and "<rss" in r.text[:200]:
                body = _parse_press_rss(r.text)
            else:
                last_err += f"; google-news status {r.status_code}"
        except Exception as exc:
            last_err += f"; google-news: {exc}"

    if body is None:
        if _press_cache["body"] is not None:
            return _json_response(_press_cache["body"], cache_flag="STALE")
        return _json_response(json.dumps({"error": last_err}), status=502)

    _press_cache["body"] = body
    _press_cache["ts"] = now
    return _json_response(body, cache_flag="MISS")
