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
import re
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
# 3e niveau : relais de lecture. Mesuré le 2026-08-07 depuis GCP, fda.gov renvoie
# 401 et Google News 503 — le blocage porte sur l'IP DATACENTER, pas sur
# l'empreinte TLS (les 15 profils testés passent en 200 depuis une IP normale).
# Ce relais lit la page pour nous et renvoie du Markdown, d'où un parseur dédié.
# Dépendance TIERCE assumée et volontairement en DERNIER : si elle tombe, on
# retombe sur le cache périmé puis sur "aucun communiqué" — jamais sur une
# fausse assurance.
import urllib.parse as _up

_RSS_Q = _up.quote(FDA_RSS_URL, safe="")
# Plusieurs relais essayés dans l'ordre : le 1er qui rend le flux gagne. Chacun a
# un format de sortie différent, d'où le drapeau "md" (Markdown du relais de
# lecture) vs XML brut (simples proxies pass-through).
PRESS_RELAYS = [
    ("https://r.jina.ai/" + FDA_RSS_URL, "md"),
    ("https://api.codetabs.com/v1/proxy?quest=" + _RSS_Q, "xml"),
    ("https://api.allorigins.win/raw?url=" + _RSS_Q, "xml"),
    ("https://corsproxy.io/?" + _RSS_Q, "xml"),
]
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
    """RSS (FDA direct ou Google News) → liste
    [{title, description, link, pubDate}]. Les titres Google News sont
    suffixés " - fda.gov" → retiré pour retrouver le titre FDA exact."""
    import html as _html

    root = ET.fromstring(xml_text)
    items = []
    for item in root.iter("item"):
        title = _html.unescape((item.findtext("title") or "").strip())
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
    return items


def _parse_press_markdown(md_text: str):
    """Markdown du relais de lecture → MÊME structure que _parse_press_rss :
    [{title, description, link, pubDate}].

    Le relais rend le flux RSS sous cette forme, par item :
        ### [TITRE](URL)
        <paragraphe de description>
        [URL](URL)
        Wed, 05 Aug 2026 17:42:00 EDT
    On repart donc des titres `### [..](..)` et on lit, dans le bloc qui suit,
    la 1re ligne de prose (description) et la ligne de date RFC-822 (pubDate).
    """
    import html as _html

    items = []
    # Coupe le préambule ("Title:", "URL Source:", "Markdown Content:")
    body = md_text.split("Markdown Content:", 1)[-1]
    # Chaque item commence à un "### [titre](lien)"
    blocks = re.split(r"^###\s+", body, flags=re.M)[1:]
    date_re = re.compile(
        r"^[A-Z][a-z]{2},\s+\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4}\s+[\d:]{5,8}\s+[A-Z]{2,4}$"
    )
    for block in blocks:
        head = re.match(r"\[(.+?)\]\((https?://[^)]+)\)", block.strip(), re.S)
        if not head:
            continue
        title = _html.unescape(head.group(1)).replace("\n", " ").strip()
        link = head.group(2).strip()
        description, pub_date = "", ""
        for line in block[head.end():].splitlines():
            line = line.strip()
            if not line:
                continue
            if date_re.match(line):
                pub_date = line
                break  # la date clôt l'item
            # Ignore la ligne "[url](url)" répétée sous la description
            if line.startswith("[http"):
                continue
            if not description:
                description = _strip_html(line)[:500]
        items.append(
            {
                "title": title,
                "description": description,
                "link": link,
                "pubDate": pub_date,
            }
        )
    return items


# ─── Enrichissement : dates "Best if Used By" depuis la page du communiqué ────
# Le flux RSS n'a que le titre. Les données d'identification (tableau Brand /
# Description / Best if Used By, cas Taylor Fresh Foods juil. 2026) sont dans la
# PAGE de l'article. fda.gov bloque les IP datacenter (Akamai 401) → chaque page
# passe par la cascade : fetch direct → copie Wayback existante → déclenchement
# d'une sauvegarde Wayback (archive.org n'est pas bloqué et son crawler est
# autorisé par la FDA ; la capture aboutit même si on n'attend pas la réponse).
#
# Résolution de l'URL de l'article : les liens Google News sont des jetons
# CHIFFRÉS (indécodables) et les slugs FDA ne se devinent pas depuis le titre
# (® → "r", esperluettes, troncatures). On lit donc la PAGE LISTE officielle
# des rappels, qui contient les slugs exacts des derniers communiqués, et on
# apparie chaque titre du flux au slug qui partage le plus de mots.
ARTICLE_TTL_OK_SECONDS = 24 * 3600      # extraction réussie : stable
ARTICLE_TTL_FAIL_SECONDS = 20 * 60      # échec : on retente au prochain rebuild
MAX_ENRICH_ITEMS = 15                   # les N plus récents seulement
ENRICH_BUDGET_SECONDS = 35              # borne dure sur la latence ajoutée

LISTING_URL = "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts"
LISTING_TTL_SECONDS = 30 * 60
# Pages statiques de la même rubrique (à exclure des slugs d'articles).
_NON_ARTICLE_SLUGS = {
    "recall-resources", "enforcement-reports", "industry-guidance-recalls",
    "major-product-recalls", "additional-information-about-recalls",
}

# link du flux -> {"ts", "ok", "articleUrl", "codeInfo"}
_article_cache = {}
_listing_cache = {"ts": 0.0, "slugs": []}

_PAGE_HEADERS = {
    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
}


def _get_page(url, deadline, allow_save=True):
    """HTML d'une page fda.gov : direct → Wayback dispo → Wayback save."""
    try:
        r = cffi.get(url, impersonate="chrome", headers=_PAGE_HEADERS, timeout=8)
        if r.status_code == 200 and "FDA Apology" not in r.text[:3000]:
            return r.text
    except Exception:
        pass
    try:
        r = cffi.get("https://archive.org/wayback/available?url=" + url, timeout=8)
        snap = r.json().get("archived_snapshots", {}).get("closest", {})
        if snap.get("available") and snap.get("url"):
            # id_ = contenu brut, sans la barre d'outils Wayback.
            raw_url = re.sub(r"(/web/\d{14})/", r"\1id_/", snap["url"], count=1)
            r2 = cffi.get(raw_url, timeout=12)
            if r2.status_code == 200:
                return r2.text
    except Exception:
        pass
    # Relais de lecture — même raison que pour le flux : depuis GCP, fda.gov
    # renvoie 401 et Wayback n'a souvent archivé que la page de blocage. Sans ce
    # niveau, les dates "Best if Used By" ne sont JAMAIS extraites (codeInfo vide),
    # ce qui prive le mode « pas de numéro de lot » de sa donnée de référence.
    for relay_tpl in (
        "https://api.codetabs.com/v1/proxy?quest={q}",
        "https://api.allorigins.win/raw?url={q}",
        "https://r.jina.ai/{u}",
    ):
        if time.time() >= deadline:
            break
        try:
            relay_url = relay_tpl.format(q=_up.quote(url, safe=""), u=url)
            r = cffi.get(relay_url, impersonate="chrome", timeout=12)
            if r.status_code == 200 and len(r.text) > 2000 and "FDA Apology" not in r.text[:3000]:
                return r.text
        except Exception:
            continue
    # Sauvegarde (~10-30 s mesurés) : seulement si le budget le permet. La
    # capture continue côté archive.org même en cas de timeout ici → le cycle
    # suivant la trouvera via "available".
    remaining = deadline - time.time()
    if allow_save and remaining >= 15:
        try:
            r = cffi.get("https://web.archive.org/save/" + url, timeout=min(60, remaining))
            if r.status_code == 200 and len(r.text) > 20000:
                return r.text
        except Exception:
            pass
    return None


def _listing_slugs(deadline):
    """Slugs des derniers communiqués depuis la page liste officielle (cache)."""
    now = time.time()
    if _listing_cache["slugs"] and (now - _listing_cache["ts"]) < LISTING_TTL_SECONDS:
        return _listing_cache["slugs"]
    html = _get_page(LISTING_URL, deadline)
    if not html:
        return _listing_cache["slugs"]  # stale vaut mieux que rien
    hrefs = re.findall(r'href="/safety/recalls-market-withdrawals-safety-alerts/([a-z0-9\-]+)"', html)
    slugs = [s for s in dict.fromkeys(hrefs) if s not in _NON_ARTICLE_SLUGS and len(s) > 20]
    if slugs:
        _listing_cache["slugs"] = slugs
        _listing_cache["ts"] = now
    return _listing_cache["slugs"]


_MATCH_IGNORE = {
    "recall", "recalls", "recalled", "recalling", "issues", "issued", "voluntary",
    "voluntarily", "because", "possible", "health", "risk", "undeclared",
    "allergy", "alert", "announces", "initiates", "due",
    # NB : "expands"/"expanded" restent significatifs — un communiqué
    # d'EXTENSION doit matcher le slug de l'extension, pas celui d'origine.
}


def _match_slug(title, slugs):
    """Slug qui partage le plus de mots distinctifs avec le titre du flux."""
    tw = {w for w in re.split(r"[^a-z0-9]+", title.lower()) if len(w) >= 3 and w not in _MATCH_IGNORE}
    best, best_score = None, 0
    for slug in slugs:
        sw = {w for w in slug.split("-") if len(w) >= 3 and w not in _MATCH_IGNORE}
        score = len(tw & sw)
        if score > best_score:
            best, best_score = slug, score
    return best if best_score >= 3 else None


def _extract_code_info(html):
    """Texte d'identification compact : plage "Best if Used By" + lignes du
    tableau (marque | description | dates), plafonné pour l'affichage mobile."""
    body = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", html)
    lines = []
    for tr in re.findall(r"(?is)<tr[^>]*>(.*?)</tr>", body):
        cells = [re.sub(r"(?s)<[^>]+>", " ", c) for c in re.findall(r"(?is)<t[hd][^>]*>(.*?)</t[hd]>", tr)]
        cells = [re.sub(r"\s+", " ", c.replace("&nbsp;", " ")).strip() for c in cells]
        cells = [c for c in cells if c]
        if not cells:
            continue
        line = " | ".join(cells)
        if re.search(r"\d{1,2}/\d{1,2}/\d{2,4}", line) or re.search(r"(?i)best (if used )?by|use by|sell by|lot", line):
            lines.append(line)

    text = re.sub(r"\s+", " ", re.sub(r"(?s)<[^>]+>", " ", body))
    summary = ""
    dates = re.findall(r"\d{1,2}/\d{1,2}/\d{4}", text)
    if dates and re.search(r"(?i)best (if used )?by|use by|sell by", text):
        from datetime import datetime

        parsed = []
        for d in set(dates):
            try:
                parsed.append(datetime.strptime(d, "%m/%d/%Y"))
            except ValueError:
                pass
        if parsed:
            lo, hi = min(parsed), max(parsed)
            fmt = lambda d: f"{d.month}/{d.day}/{d.year}"
            summary = f"Best if Used By {fmt(lo)} - {fmt(hi)}" if lo != hi else f"Best if Used By {fmt(lo)}"

    # Pas de tableau ? Les infos d'identification sont souvent en PROSE
    # ("Lot 12345, Best By 8/1/2026…") → on garde les phrases porteuses.
    if not lines:
        for sentence in re.split(r"(?<=[.;]) ", text):
            if len(sentence) > 300:
                continue
            if re.search(r"(?i)\b(lot|batch|best by|best if used by|use by|sell by|exp\.? date|upc)\b", sentence) and re.search(r"\d", sentence):
                lines.append(sentence.strip())
            if len(lines) >= 4:
                break

    parts = ([summary] if summary else []) + lines[:10]
    out = "\n".join(parts).strip()
    return out[:700] if out else None


def _enrich_items(items, budget_seconds):
    """Complète les items les plus récents avec articleUrl + codeInfo (cache)."""
    deadline = time.time() + budget_seconds
    slugs = None  # chargés au premier besoin (coûte potentiellement un fetch)
    for item in items[:MAX_ENRICH_ITEMS]:
        key = item.get("link") or item.get("title") or ""
        if not key:
            continue
        cached = _article_cache.get(key)
        now = time.time()
        if cached and (now - cached["ts"]) < (ARTICLE_TTL_OK_SECONDS if cached["ok"] else ARTICLE_TTL_FAIL_SECONDS):
            if cached.get("articleUrl"):
                item["articleUrl"] = cached["articleUrl"]
            if cached.get("codeInfo"):
                item["codeInfo"] = cached["codeInfo"]
            continue
        if now >= deadline:
            continue  # budget épuisé : les suivants attendront le prochain cycle

        link = item.get("link") or ""
        if "fda.gov" in link and "news.google" not in link:
            article_url = link  # flux FDA direct : le lien est déjà le bon
        else:
            if slugs is None:
                slugs = _listing_slugs(deadline)
            slug = _match_slug(item.get("title") or "", slugs or [])
            article_url = f"{LISTING_URL}/{slug}" if slug else None

        code_info = None
        if article_url:
            html = _get_page(article_url, deadline)
            if html:
                code_info = _extract_code_info(html)
        _article_cache[key] = {
            "ts": time.time(),
            "ok": bool(code_info),
            "articleUrl": article_url,
            "codeInfo": code_info,
        }
        if article_url:
            item["articleUrl"] = article_url
        if code_info:
            item["codeInfo"] = code_info
    return items


@https_fn.on_request(
    region="us-central1",
    memory=options.MemoryOption.MB_512,
    timeout_sec=120,
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
    items = None
    last_err = "no attempt"
    for profile in ("chrome", "safari_ios"):
        try:
            r = cffi.get(FDA_RSS_URL, impersonate=profile, headers=headers, timeout=30)
            # Akamai block returns 401/403 or an HTML "FDA Apology" page (some-
            # times with 200) — guard on the XML shape, then parse.
            if r.status_code == 200 and r.text.lstrip().startswith("<?xml"):
                items = _parse_press_rss(r.text)
                break
            last_err = f"FDA upstream status {r.status_code} ({profile})"
        except Exception as exc:  # network / TLS / parse failure
            last_err = f"{profile}: {exc}"

    # Repli Google News (mêmes communiqués, pas d'Akamai côté Google).
    if items is None:
        try:
            r = cffi.get(GOOGLE_NEWS_RSS_URL, impersonate="chrome", timeout=30)
            if r.status_code == 200 and "<rss" in r.text[:200]:
                items = _parse_press_rss(r.text)
            else:
                last_err += f"; google-news status {r.status_code}"
        except Exception as exc:
            last_err += f"; google-news: {exc}"

    # 3e niveau — relais de lecture. fda.gov (401) ET Google News (503) bloquent
    # tous deux l'IP datacenter ; ce relais lit la page pour nous. Volontairement
    # en dernier : c'est une dépendance tierce, elle ne sert que si les deux
    # sources officielles directes sont inaccessibles.
    if items is None:
        for relay_url, fmt in PRESS_RELAYS:
            name = _up.urlparse(relay_url).netloc
            try:
                r = cffi.get(
                    relay_url,
                    impersonate="chrome",
                    headers={"Accept": "text/plain,application/xml;q=0.9,*/*;q=0.8"},
                    timeout=30,
                )
                if r.status_code != 200:
                    last_err += f"; {name} status {r.status_code}"
                    continue
                if fmt == "md":
                    if "Markdown Content:" not in r.text[:4000]:
                        last_err += f"; {name} not markdown"
                        continue
                    parsed = _parse_press_markdown(r.text)
                else:
                    if not r.text.lstrip().startswith("<?xml"):
                        last_err += f"; {name} not xml"
                        continue
                    parsed = _parse_press_rss(r.text)
                if parsed:  # un parse vide n'est PAS un succès
                    items = parsed
                    break
                last_err += f"; {name} parsed 0 items"
            except Exception as exc:
                last_err += f"; {name}: {str(exc)[:60]}"

    if items is None:
        if _press_cache["body"] is not None:
            return _json_response(_press_cache["body"], cache_flag="STALE")
        return _json_response(json.dumps({"error": last_err}), status=502)

    # Dates "Best if Used By" et URL fda.gov de l'article (borné en temps).
    try:
        items = _enrich_items(items, ENRICH_BUDGET_SECONDS)
    except Exception:
        pass  # l'enrichissement est best-effort, le flux part quand même

    body = json.dumps(items)
    _press_cache["body"] = body
    _press_cache["ts"] = now
    return _json_response(body, cache_flag="MISS")
