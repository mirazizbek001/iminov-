import base64
import re
from datetime import time
from django.utils import timezone

# Child-safe 7+ policy. Keep this list conservative and easy to extend.
BLOCKED_WORDS = {
    "fuck", "fucking", "shit", "bitch", "asshole", "motherfucker",
    "porn", "porno", "pornography", "nude", "nudity", "xxx", "sex",
    "sexy", "nsfw", "casino", "betting", "gambling",
    "drug", "drugs", "cocaine", "heroin", "meth", "weed",
    "kill", "murder", "suicide", "weapon", "gun", "bomb",
    "блядь", "бля", "сука", "хуй", "хуйн", "пизд", "еба", "ебать", "ебан", "шлюха", "порно", "секс", "наркот", "кокаин",
    "героин", "оруж", "убий", "самоубий", "ahmoq", "tentak", "jalab", "siktir", "sik",
}

# Faqat to'liq so'z sifatida tekshiriladigan (qisqa yoki boshqa so'z ichida uchrashi mumkin bo'lgan) so'zlar.
WORD_ONLY_BLOCKED = {
    "sex", "sexy", "seks", "seksi", "seksual", "porn", "nude", "nudes", "naked", "xxx", "nsfw",
    "boobs", "dick", "pussy", "cum", "slut", "whore", "fag", "nigga", "nigger", "idiot", "stupid", "moron",
    "kot", "qotaq", "qotoq", "sik", "sikish", "sikaman", "sikdim", "sikay", "onangni", "oneni", "ammangni",
    "haromi", "harom", "iflos", "eshak", "itvachcha", "it bola", "shaloq", "buzuq", "fohisha", "kandom",
    "ablah", "dalbayob", "dalbayop", "xunasa", "qanjiq", "jinsiy", "yalangoch", "yalang och",
    "мудак", "гандон", "залуп", "пидор", "пидар", "шалав", "дроч", "сиськи", "жопа", "ебал", "ебло", "еблан",
    "нахуй", "похуй", "голая", "голый", "эротика",
}
# Substring (compact) tekshiruvidan chiqariladigan noaniq so'zlar ("skill" ichidagi "kill" kabi).
AMBIGUOUS_WORDS = {"kill", "meth", "weed", "drug", "drugs", "gun", "bomb", "еба", "sex", "sik"}
_LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s"})
_APOSTROPHES = re.compile(r"[ʻʼ’‘`'´]")

ADULT_CONTENT_TERMS = {
    '18+', 'adult', 'porn', 'porno', 'pornography', 'nude', 'nudity', 'xxx',
    'sex', 'nsfw', 'onlyfans', 'эрот', 'порно', 'секс', 'голый', 'голая',
    'yalangoch', 'yalang\'och', 'jinsiy', 'seks', 'seksi', 'seksual', 'naked', 'boobs', 'pussy', 'dick',
}

CONTACT_PATTERNS = [
    re.compile(r"(https?://|www\.)", re.I),
    re.compile(r"\b(?:t\.me|telegram\.me|wa\.me|discord\.gg|instagram\.com|snapchat\.com)\b", re.I),
]

ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_MIMES = {"video/mp4", "video/webm"}
ALLOWED_AUDIO_MIMES = {"audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"}
MAX_MEDIA_BYTES = 25 * 1024 * 1024


def get_platform_settings():
    from .models import PlatformSettings
    return PlatformSettings.get_solo()


def is_service_open(now=None):
    settings = get_platform_settings()
    if not settings.enabled:
        return False
    if now is None:
        now = timezone.localtime()
    elif timezone.is_aware(now):
        now = timezone.localtime(now)
    current = now.time().replace(tzinfo=None)
    start = settings.open_time
    end = settings.close_time
    if start == end:
        return True
    if start < end:
        return start <= current < end
    return current >= start or current < end


def settings_payload():
    settings = get_platform_settings()
    return {
        'enabled': settings.enabled,
        'start': settings.open_time.strftime('%H:%M'),
        'end': settings.close_time.strftime('%H:%M'),
        'usageLimitMinutes': settings.usage_limit_minutes,
        'cooldownMinutes': settings.cooldown_minutes,
        'timezone': 'Asia/Tashkent',
    }


def _normalize(value):
    value = _APOSTROPHES.sub("", value.lower())
    return re.sub(r"[\W_]+", " ", value, flags=re.UNICODE).strip()


def blocked_text(value):
    if not isinstance(value, str):
        return False
    if any(pattern.search(value) for pattern in CONTACT_PATTERNS):
        return True
    if re.search(r"(?<!\w)18\s*\+(?!\w)", value):
        return True
    variants = {_normalize(value), _normalize(value.lower().translate(_LEET))}
    for normalized in variants:
        compact = normalized.replace(" ", "")
        for word in BLOCKED_WORDS:
            if re.search(rf"(?<!\w){re.escape(word)}(?!\w)", normalized):
                return True
            if len(word) >= 4 and word not in AMBIGUOUS_WORDS and word in compact:
                return True
        for word in WORD_ONLY_BLOCKED:
            if re.search(rf"(?<!\w){re.escape(_APOSTROPHES.sub('', word))}(?!\w)", normalized):
                return True
    return False


def suspected_adult_text(value):
    if not isinstance(value, str):
        return False
    if re.search(r"(?<!\w)18\s*\+(?!\w)", value):
        return True
    normalized = re.sub(r"[\W_]+", " ", value.lower(), flags=re.UNICODE)
    compact = normalized.replace(" ", "")
    for term in ADULT_CONTENT_TERMS:
        if term == '18+':
            continue
        normalized_term = re.sub(r"[\W_]+", " ", term.lower(), flags=re.UNICODE).strip()
        compact_term = normalized_term.replace(' ', '')
        if re.search(rf"(?<!\w){re.escape(normalized_term)}(?!\w)", normalized):
            return True
        if len(compact_term) >= 4 and compact_term in compact:
            return True
    return False


def validate_text(value, field="matn"):
    if blocked_text(value):
        return f"{field.capitalize()} 7+ xavfsizlik filtri tomonidan rad etildi."


def validate_media_data(value):
    if not isinstance(value, str) or not value.startswith("data:"):
        return "Media fayl noto‘g‘ri formatda."
    try:
        header, encoded = value.split(",", 1)
        mime = header[5:].split(";", 1)[0].lower()
        raw = base64.b64decode(encoded, validate=True)
    except Exception:
        return "Media faylni o‘qib bo‘lmadi."

    if len(raw) > MAX_MEDIA_BYTES:
        return "Media hajmi 25 MB dan oshmasin."
    if mime not in ALLOWED_IMAGE_MIMES | ALLOWED_VIDEO_MIMES | ALLOWED_AUDIO_MIMES:
        return "Media formati ruxsat etilmagan."

    valid_signature = (
        (mime == "image/jpeg" and raw[:3] == b"\xff\xd8\xff") or
        (mime == "image/png" and raw[:8] == b"\x89PNG\r\n\x1a\n") or
        (mime == "image/webp" and raw[:4] == b"RIFF" and raw[8:12] == b"WEBP") or
        (mime == "video/mp4" and (b"ftyp" in raw[:32])) or
        (mime == "video/webm" and raw[:4] == b"\x1aE\xdf\xa3") or
        (mime == "audio/webm" and raw[:4] == b"\x1aE\xdf\xa3") or
        (mime == "audio/ogg" and raw[:4] == b"OggS") or
        (mime == "audio/mp4" and b"ftyp" in raw[:32]) or
        (mime == "audio/mpeg" and (raw[:3] == b"ID3" or (len(raw) > 1 and raw[0] == 0xff and raw[1] & 0xe0 == 0xe0))) or
        (mime == "audio/wav" and raw[:4] == b"RIFF" and raw[8:12] == b"WAVE")
    )
    if not valid_signature:
        return "Media fayl turi tasdiqlanmadi."
    return None


def validate_media_item(item, check_caption=True):
    if not isinstance(item, dict):
        return "Media ma'lumoti noto‘g‘ri."
    for key in ("image", "media"):
        if key in item and item[key]:
            error = validate_media_data(item[key])
            if error:
                return error
    return validate_text(item.get("caption", ""), "Caption") if check_caption else None
