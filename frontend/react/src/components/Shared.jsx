import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Compass,
  Download,
  Flag,
  Heart,
  Home,
  ImagePlus,
  LogOut,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Pencil,
  PlusSquare,
  Search,
  Send,
  Share2,
  Smile,
  Sun,
  Trash2,
  User,
  X,
  ChevronLeft,
  Grid3X3,
  Check,
  Play,
  Plus,
  Users,
  Volume2,
  VolumeX,
  Camera,
  Settings,
  Contact,
  Eye,
  EyeOff,
  CornerDownRight,
  ImageIcon,
} from "lucide-react";
import {
  useC,
  kidsUnsafeFile,
  kidsUnsafeText,
  kidsUnsafeDataUrl,
  isVideoFile,
  readMedia,
  readImg,
  ago,
  hm,
  seg,
  EMO,
  ensureCsrfToken,
  csrfToken,
} from "../context/AppContext";
import brandLogo from "../assets/bonbon-logo.png";

function Av({ u, s = 44, ring }) {
  const hue =
    ([...(u?.username || "x")].reduce((a, c) => a + c.charCodeAt(0), 0) * 37) %
    360;
  const inner = u?.avatar ? (
    <img
      src={u.avatar}
      alt=""
      className="rounded-full object-cover"
      style={{ width: s, height: s }}
    />
  ) : (
    <div
      className="grid place-items-center rounded-full font-semibold text-white"
      style={{
        width: s,
        height: s,
        fontSize: s / 2.3,
        background: "linear-gradient(135deg,#ff8a1f,#4f92ec)",
      }}
    >
      {(u?.name || u?.username || "?")[0].toUpperCase()}
    </div>
  );
  return ring ? (
    <div
      className={`story-ring shrink-0 rounded-full p-[2.5px] ${ring === "seen" ? "seen" : ""}`}
      title={ring === "seen" ? "Story ko‘rilgan" : "Story qo‘yilgan"}
    >
      <div className="rounded-full p-[2px] !bg-[#2a70d8]">{inner}</div>
    </div>
  ) : (
    <div className="shrink-0">{inner}</div>
  );
}
const Logo = ({ c = "" }) => (
  <span
    className={`font-logo bg-clip-text text-[28px] leading-none ${c}`}
    style={{ fontFamily: '"Grand Hotel",cursive' }}
  >
    Bon-Bon
  </span>
);
function FollowBtn({ id, big }) {
  const { A, db, me } = useC();
  if (id === me.id) return null;
  const f = db.follows.some((x) => x.a === me.id && x.b === id);
  return (
    <button
      onClick={() => A.follow(id)}
      className={`rounded-lg font-semibold transition active:scale-95 ${big ? "px-6 py-1.5 text-sm" : "px-4 py-1.5 text-xs"} ${f ? "bg-neutral-200 text-white !bg-[#4f92ec] !text-white" : "bg-neutral-900 text-white hover:bg-neutral-700 !bg-[#ff8a1f] !text-white hover:!bg-[#e8750a]"}`}
    >
      {f ? "Following" : "Follow"}
    </button>
  );
}
function Modal({ close, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[#0b2f6e]/70 p-3 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <button onClick={close} className="absolute right-4 top-4 text-white">
        <X size={28} />
      </button>
      <div
        className={`max-h-[92vh] w-full overflow-hidden rounded-2xl border-t-2 border-t-[#ffd24d] bg-[#2a70d8] text-white shadow-2xl !border-x !border-b !border-[#6aa5f0] !bg-[#2a70d8] !text-white ${wide ? "max-w-[1050px]" : "max-w-[520px]"}`}
      >
        {children}
      </div>
    </div>
  );
}
function EmojiPicker({ onPick, cls = "" }) {
  const [tab, setTab] = useState(Object.keys(EMO)[0]);
  return (
    <div
      className={`z-20 w-[300px] rounded-2xl border border-neutral-200 bg-[#2a70d8] p-2 shadow-2xl !border-[#6aa5f0] !bg-[#2a70d8] ${cls}`}
    >
      <div className="flex justify-between border-b border-neutral-200 pb-1 !border-[#6aa5f0]">
        {Object.keys(EMO).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-lg p-1.5 text-lg ${tab === k ? "bg-neutral-100 !bg-[#3a80e4]" : "opacity-60"}`}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="mt-2 grid h-[190px] grid-cols-7 content-start gap-0.5 overflow-y-auto no-scrollbar">
        {seg(EMO[tab]).map((e, i) => (
          <button
            key={i}
            onClick={() => onPick(e)}
            className="rounded-lg p-1 text-[22px] hover:bg-neutral-100 hover:!bg-[#4f92ec]"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Google bilan kirish ---------- */
function GoogleSignIn({ onCredential, onError }) {
  const box = useRef(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;
  const [state, setState] = useState("loading"); // loading | ready | off
  useEffect(() => {
    let dead = false;
    const init = async () => {
      let clientId = "";
      try {
        const r = await fetch("/plat/config/", { credentials: "same-origin" });
        clientId = (await r.json()).googleClientId || "";
      } catch {
        /* ignore */
      }
      if (dead) return;
      if (!clientId) {
        setState("off");
        return;
      }
      const render = () => {
        if (dead || !window.google?.accounts?.id || !box.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (res) => cb.current(res.credential),
          ux_mode: "popup",
          use_fedcm_for_prompt: true,
          cancel_on_tap_outside: false,
        });
        box.current.innerHTML = "";
        window.google.accounts.id.renderButton(box.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: Math.min(320, box.current.clientWidth || 320),
          locale: "uz",
        });
        setState("ready");
      };
      if (window.google?.accounts?.id) {
        render();
        return;
      }
      let script = document.getElementById("google-gsi");
      if (!script) {
        script = document.createElement("script");
        script.id = "google-gsi";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
      script.addEventListener("error", () => {
        if (!dead) {
          setState("off");
          onError?.("Google xizmatiga ulanib bo‘lmadi.");
        }
      });
    };
    init();
    return () => {
      dead = true;
    };
  }, []);
  if (state === "off") return null;
  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200 !bg-[#4f92ec]" />
        yoki
        <span className="h-px flex-1 bg-neutral-200 !bg-[#4f92ec]" />
      </div>
      <div ref={box} className="flex min-h-[44px] justify-center" />
    </div>
  );
}

export function PwaInstallButton({ compact = false, iconOnly = false }) {
  const [installPrompt, setInstallPrompt] = useState(
    () => window.__instakidsInstallPrompt || null,
  );
  const [installed, setInstalled] = useState(
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true,
  );
  const [showHelp, setShowHelp] = useState(false);
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const onInstallPromptAvailable = () => {
      const nextPrompt = window.__instakidsInstallPrompt || null;
      setInstallPrompt(nextPrompt);
    };
    const onInstalled = () => {
      window.__instakidsInstallPrompt = null;
      setInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    };
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = (event) => setInstalled(event.matches);

    window.addEventListener(
      "instakids-installprompt",
      onInstallPromptAvailable,
    );
    window.addEventListener("appinstalled", onInstalled);
    displayMode.addEventListener?.("change", onDisplayModeChange);
    return () => {
      window.removeEventListener(
        "instakids-installprompt",
        onInstallPromptAvailable,
      );
      window.removeEventListener("appinstalled", onInstalled);
      displayMode.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      window.__instakidsInstallPrompt = null;
      setInstallPrompt(null);
      if (choice?.outcome === "accepted") setInstalled(true);
      else setShowHelp(true);
    } catch {
      setShowHelp(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={install}
        title="Bon-Bon ilovasini o‘rnatish"
        aria-label={iconOnly ? "Bon-Bon ilovasini o‘rnatish" : undefined}
        className={
          iconOnly
            ? "mx-auto grid h-11 w-11 place-items-center rounded-lg bg-[#ff8a1f] text-white transition hover:bg-[#e8750a]"
            : compact
              ? "inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#ff8a1f] px-2.5 py-2 text-xs font-bold text-white transition hover:bg-[#e8750a]"
              : "mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff8a1f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#e8750a]"
        }
      >
        <Download size={iconOnly ? 19 : compact ? 16 : 18} />
        {!iconOnly && (compact ? "O‘rnatish" : "Ilovani telefonga o‘rnatish")}
      </button>
      {showHelp && (
        <div
          role="presentation"
          onClick={() => setShowHelp(false)}
          className="fixed inset-0 z-[130] grid place-items-center bg-[#0b2f6e]/60 p-4 backdrop-blur-sm"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-[#2a70d8] p-5 text-white shadow-2xl !border-[#6aa5f0] !bg-[#2a70d8] !text-white"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="pwa-install-title" className="text-base font-bold">
                Bon-Bon ilovasini o‘rnatish
              </h2>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                aria-label="Yopish"
                className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 hover:!bg-[#4f92ec]"
              >
                <X size={20} />
              </button>
            </div>
            {isIos ? (
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-neutral-700 !text-white">
                <li>Saytni Safari’da oching.</li>
                <li>Ulashish tugmasini bosing.</li>
                <li>“Bosh ekranga qo‘shish”ni tanlang.</li>
                <li>“Qo‘shish”ni bosing.</li>
              </ol>
            ) : (
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-neutral-700 !text-white">
                <li>Brauzer menyusini (⋮) oching.</li>
                <li>
                  “Ilovani o‘rnatish” yoki “Bosh ekranga qo‘shish”ni tanlang.
                </li>
                <li>O‘rnatishni tasdiqlang.</li>
              </ol>
            )}
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white !bg-[#ff8a1f] !text-white"
            >
              Tushunarli
            </button>
          </section>
        </div>
      )}
    </>
  );
}

/* ---------- auth ---------- */
const REMEMBERED_USERNAME_KEY = "ig_last_username";
const readRememberedUsername = () => {
  try {
    return localStorage.getItem(REMEMBERED_USERNAME_KEY) || "";
  } catch {
    return "";
  }
};
const rememberUsername = (username) => {
  try {
    localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
  } catch {
    /* The login form remains usable if storage is unavailable. */
  }
};
function Auth({ A, accessInfo }) {
  const [reg, setReg] = useState(false);
  const [f, setF] = useState({
    username: readRememberedUsername(),
    email: "",
    name: "",
    password: "",
  });
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const postJson = async (url, body, token) => {
    const send = async (csrf) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      try {
        return await fetch(url, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (error) {
        if (error.name === "AbortError")
          throw new Error(
            "Server javobi kechikyapti. Birozdan keyin qayta urinib ko‘ring.",
            { cause: error },
          );
        throw error;
      } finally {
        clearTimeout(timer);
      }
    };
    let response = await send(token);
    if (response.status === 403) {
      const result = await response.clone().json().catch(() => ({}));
      if (/csrf failed/i.test(result.detail || "")) {
        const freshToken = await ensureCsrfToken(true, 18000);
        response = await send(freshToken);
      }
    }
    return response;
  };
  const go = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErr("");
    if (reg && accessInfo?.open === false) {
      setErr(
        `Platforma yopiq. Admin bo‘lsangiz, “Kirish” rejimini tanlang. Ro‘yxatdan o‘tish ${accessInfo.start || "08:00"}–${accessInfo.end || "22:00"} oralig‘ida mumkin.`,
      );
      return;
    }
    if (reg) {
      const validationError = A.validateRegister(f);
      if (validationError) {
        setErr(validationError);
        return;
      }
    }
    setIsSubmitting(true);
    if (!reg) {
      try {
        const token = await ensureCsrfToken(false, 18000);
        const response = await postJson("/plat/login/", f, token);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          setErr(
            result.error ||
              result.detail ||
              `Kirishda xatolik (${response.status})`,
          );
          return;
        }
        rememberUsername(String(f.username || "").trim().toLowerCase());
        A.login(f, result);
      } catch (error) {
        setErr(error.message || "Server bilan bog‘lanib bo‘lmadi.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    try {
      const token = await ensureCsrfToken(false, 18000);
      const response = await postJson("/plat/register/", f, token);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErr(
          result.error ||
            result.detail ||
            `Ro‘yxatdan o‘tishda xatolik (${response.status})`,
        );
        return;
      }
      rememberUsername(String(f.username || "").trim().toLowerCase());
      A.register(f, result);
    } catch (error) {
      setErr(error.message || "Server bilan bog‘lanib bo‘lmadi.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const googleGo = async (credential) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErr("");
    let timer;
    try {
      const token = await ensureCsrfToken(false, 18000);
      const controller = new AbortController();
      timer = setTimeout(() => controller.abort(), 20000);
      const response = await fetch("/plat/google/", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": token },
        body: JSON.stringify({ credential }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErr(
          result.error ||
            result.detail ||
            `Google orqali kirishda xatolik (${response.status})`,
        );
        return;
      }
      rememberUsername(String(result.username || "").trim().toLowerCase());
      A.login({ username: result.username }, result);
    } catch (error) {
      setErr(
        error.name === "AbortError"
          ? "Server javobi kechikyapti. Birozdan keyin qayta urinib ko‘ring."
          : error.message || "Server bilan bog‘lanib bo‘lmadi.",
      );
    } finally {
      clearTimeout(timer);
      setIsSubmitting(false);
    }
  };
  const inp =
    "w-full rounded-xl border border-neutral-200 bg-[#2a70d8] px-3 py-3 text-sm outline-none transition focus:ring-2 focus:ring-0 !border-[#6aa5f0] !bg-[#1450a8] focus:!ring-0";
  const accessMessage =
    accessInfo?.reason === "cooldown"
      ? `Vaqt tugadi. ${Math.max(1, Math.ceil((accessInfo.cooldownSeconds || 0) / 60))} daqiqalik tanaffus.`
      : accessInfo?.reason === "hours"
        ? `Ilova ${accessInfo.start || "08:00"} da ochiladi va ${accessInfo.end || "22:00"} da yopiladi.`
        : "";
  return (
    <div className="auth-page grid min-h-screen place-items-center px-4 py-8 text-white !text-white">
      <div className="w-full max-w-[390px]">
        <form
          onSubmit={go}
          className="auth-card rounded-3xl border border-neutral-200 bg-white/95 px-7 pb-7 pt-8 shadow-[0_24px_70px_rgba(0,0,0,.12)] backdrop-blur !border-[#6aa5f0] !bg-[#1450a8]/95 !shadow-none sm:px-9"
        >
          <div className="mb-5 text-center">
            <img
              src={brandLogo}
              alt="Bon-Bon"
              className="mx-auto h-28 w-28 rounded-3xl object-cover shadow-lg"
            />
          </div>
          {accessMessage && (
            <div className="mb-4 rounded-xl bg-amber-50 px-3 py-2.5 text-center text-xs font-semibold text-amber-700 !bg-amber-950/30 !text-amber-300">
              {accessMessage}
            </div>
          )}
          {reg && (
            <p className="mb-4 text-center text-sm font-semibold text-neutral-500">
              Do‘stlaringizning rasm va videolarini ko‘rish uchun ro‘yxatdan
              o‘ting.
            </p>
          )}
          <div className="space-y-2">
            {reg && (
              <input
                className={inp}
                type="email"
                placeholder="Email manzilingiz"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value.trim() })}
              />
            )}
            <input
              className={inp}
              name="username"
              placeholder="Username"
              autoComplete="username"
              value={f.username}
              onChange={(e) => {
                const username = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9._]/g, "");
                setF({ ...f, username });
                rememberUsername(username);
              }}
            />
            {reg && (
              <input
                className={inp}
                placeholder="Ism familiya"
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            )}
            <div className="relative">
              <input
                className={inp + " pr-11"}
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Parol"
                autoComplete={reg ? "new-password" : "current-password"}
                value={f.password}
                onChange={(e) => setF({ ...f, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword ? "Parolni yashirish" : "Parolni ko‘rsatish"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-white hover:!text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            disabled={isSubmitting}
            className="mt-4 w-full rounded-lg bg-[#0f3f8c] py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60 !bg-[#ff8a1f] !text-white hover:!bg-[#e8750a]"
          >
            {isSubmitting
              ? "Kutilmoqda..."
              : reg
                ? "Ro‘yxatdan o‘tish"
                : "Kirish"}
          </button>
          <GoogleSignIn onCredential={googleGo} onError={setErr} />
          {err && (
            <p className="mt-4 text-center text-sm text-red-500">{err}</p>
          )}
        </form>
        <PwaInstallButton />
        <div className="mt-3 rounded-2xl border border-neutral-200 bg-white/90 p-4 text-center text-sm shadow-sm !border-[#6aa5f0] !bg-[#2a70d8]">
          {reg ? "Akkauntingiz bormi?" : "Akkauntingiz yo‘qmi?"}{" "}
          <button
            disabled={isSubmitting}
            onClick={() => {
              setReg(!reg);
              setErr("");
            }}
            className="font-semibold text-white disabled:opacity-50 !text-white"
          >
            {reg ? "Kirish" : "Ro‘yxatdan o‘tish"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- posts ---------- */
function PostActions({ p, onComment }) {
  const { A, me, db } = useC();
  const liked = p.likes.includes(me.id);
  const saved = (db.saved[me.id] || []).includes(p.id);
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex gap-4">
        <button
          onClick={() => A.like(p.id)}
          className="transition active:scale-125"
        >
          <Heart
            size={26}
            fill={liked ? "#ef4444" : "none"}
            className={liked ? "text-red-500" : ""}
          />
        </button>
        <button onClick={onComment}>
          <MessageCircle size={26} />
        </button>
        <button
          onClick={() =>
            A.toast("Postni chatda yuborish uchun Messages bo‘limiga o‘ting")
          }
        >
          <Send size={26} />
        </button>
      </div>
      <button onClick={() => A.save(p.id)}>
        <Bookmark size={26} fill={saved ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
function CommentList({ p, kind = "post", close, onReply, owner }) {
  const { byId, open, me, A } = useC();
  const [photo, setPhoto] = useState(null);
  const list = (p.comments || []).slice().sort((a, b) => a.t - b.t);
  const author = owner || byId(p.userId);
  const goProfile = (id) => {
    close?.();
    open.profile(id);
  };
  const row = (x, key, isCaption = false) => {
    const c = byId(x.userId);
    if (!c) return null;
    return (
      <div key={key} className="flex gap-3 py-2.5">
        <button onClick={() => goProfile(c.id)} className="h-fit shrink-0">
          <Av u={c} s={36} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm leading-5">
            <b className="mr-1.5">{c.username}</b>
            {x.text}
          </p>
          {x.image && (
            <button
              onClick={() => setPhoto(x.image)}
              className="mt-1.5 block overflow-hidden rounded-xl border border-[#6aa5f0]"
            >
              <img src={x.image} alt="Izoh rasmi" className="max-h-52 max-w-full object-cover" />
            </button>
          )}
          <div className="mt-1 flex items-center gap-4 text-xs text-neutral-500">
            <span>{ago(x.t)}</span>
            {!isCaption && (
              <button
                onClick={() => onReply?.({ id: x.id, username: c.username })}
                className="font-semibold"
              >
                Javob berish
              </button>
            )}
            {!isCaption && x.userId === me.id && (
              <button
                onClick={() => A.deleteComment(p.id, x.id, kind)}
                className="font-semibold text-red-400"
              >
                O‘chirish
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };
  return (
    <>
      {p.caption && author && row({ userId: author.id, text: p.caption, t: p.t }, "cap", true)}
      {list.map((c) => row(c, c.id))}
      {!p.caption && !list.length && (
        <p className="py-10 text-center text-neutral-500">
          Hali izohlar yo‘q. Birinchi bo‘lib yozing!
        </p>
      )}
      {photo && (
        <div
          className="fixed inset-0 z-[140] grid place-items-center bg-[#0b2f6e]/90 p-4"
          onClick={() => setPhoto(null)}
        >
          <img src={photo} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}
    </>
  );
}
function CommentBox({
  p,
  kind = "post",
  autoFocus = false,
  inputRef,
  reply = null,
  clearReply,
}) {
  const { A, me } = useC();
  const [t, setT] = useState("");
  const [em, setEm] = useState(false);
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const localRef = useRef(null);
  const ref = inputRef || localRef;
  useEffect(() => {
    if (reply) {
      setT((v) => (v.startsWith(`@${reply.username} `) ? v : `@${reply.username} `));
      ref.current?.focus();
    }
  }, [reply?.id]);
  const send = () => {
    if (!t.trim() && !image) return;
    const ok = A.comment(p.id, t, kind, { image, replyTo: reply?.id });
    if (ok) {
      setT("");
      setImage(null);
      setEm(false);
      clearReply?.();
    }
  };
  const pickImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (isVideoFile(file)) {
      A.toast("Izohga faqat rasm qo‘shish mumkin");
      return;
    }
    const err = kidsUnsafeFile(file);
    if (err) {
      A.toast(err);
      return;
    }
    setBusy(true);
    try {
      setImage(await readImg(file, 900));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="relative border-t border-neutral-200 py-2.5 !border-[#6aa5f0]">
      {reply && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-[#3a80e4] px-3 py-1.5 text-xs">
          <span className="flex items-center gap-1.5">
            <CornerDownRight size={14} /> <b>{reply.username}</b> ga javob
          </span>
          <button
            onClick={() => {
              clearReply?.();
              setT("");
            }}
            aria-label="Javobni bekor qilish"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {image && (
        <div className="relative mb-2 inline-block">
          <img src={image} alt="" className="h-20 w-20 rounded-xl object-cover" />
          <button
            onClick={() => setImage(null)}
            aria-label="Rasmni olib tashlash"
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-[#ff8a1f] text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2.5">
        <Av u={me} s={32} />
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[#6aa5f0] bg-[#3a80e4] px-3 py-1.5">
          <button onClick={() => setEm(!em)} aria-label="Emoji" className="shrink-0">
            <Smile size={21} />
          </button>
          <input
            ref={ref}
            value={t}
            autoFocus={autoFocus}
            maxLength={500}
            onChange={(e) => setT(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Izoh qo‘shing..."
            className="min-w-0 flex-1 border-0 bg-transparent py-1 text-sm outline-none"
          />
          <label
            title="Rasm qo‘shish"
            className={`grid shrink-0 cursor-pointer place-items-center ${busy ? "opacity-50" : ""}`}
          >
            <ImageIcon size={21} />
            <input type="file" accept="image/*" className="hidden" onChange={pickImage} />
          </label>
        </div>
        <button
          onClick={send}
          disabled={!t.trim() && !image}
          className="shrink-0 text-sm font-bold text-[#ffd24d] disabled:opacity-40"
        >
          Yuborish
        </button>
      </div>
      {em && (
        <EmojiPicker
          onPick={(e) => setT((v) => v + e)}
          cls="absolute bottom-16 left-0"
        />
      )}
    </div>
  );
}
function PostCard({ p }) {
  const { byId, A, me, open } = useC();
  const u = byId(p.userId);
  const [heart, setHeart] = useState(false);
  const [menu, setMenu] = useState(false);
  const dbl = () => {
    if (!p.likes.includes(me.id)) A.like(p.id);
    setHeart(true);
    setTimeout(() => setHeart(false), 700);
  };
  return (
    <article className="ig-card mb-4 pb-4">
      <div className="relative flex items-center gap-3 py-3">
        <button
          onClick={() => open.profile(u.id)}
          className="flex items-center gap-3"
        >
          <Av u={u} s={34} />
          <b className="text-sm">{u.username}</b>
        </button>
        <span className="text-sm text-neutral-500">• {ago(p.t)}</span>
        <button className="ml-auto" onClick={() => setMenu(!menu)}>
          <MoreHorizontal />
        </button>
        {menu && (
          <div className="absolute right-0 top-10 z-10 w-44 overflow-hidden rounded-xl border bg-[#2a70d8] text-sm shadow-xl !border-[#6aa5f0] !bg-[#2a70d8]">
            {p.userId === me.id && (
              <button
                onClick={() => {
                  if (window.confirm("Bu postni o‘chirmoqchimisiz?"))
                    A.del(p.id);
                  setMenu(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-3 font-semibold text-red-500 hover:bg-neutral-100 hover:!bg-[#4f92ec]"
              >
                <Trash2 size={16} /> O‘chirish
              </button>
            )}
            <button
              onClick={() => {
                open.profile(u.id);
                setMenu(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-neutral-100 hover:!bg-[#4f92ec]"
            >
              Profilga o‘tish
            </button>
          </div>
        )}
      </div>
      <div
        className="ig-media relative overflow-hidden border border-neutral-200 !border-[#6aa5f0] sm:rounded-[3px]"
        onDoubleClick={dbl}
      >
        <img
          src={p.image}
          alt=""
          className="block max-h-[760px] w-full select-none object-cover"
        />
        {heart && (
          <Heart
            size={100}
            fill="white"
            className="pop absolute inset-0 m-auto text-white drop-shadow-2xl"
          />
        )}
      </div>
      <PostActions p={p} onComment={() => open.post(p.id)} />
      {p.likes.length > 0 && (
        <div className="text-sm font-semibold">
          {p.likes.length.toLocaleString()} ta yoqtirish
        </div>
      )}
      {p.caption && (
        <p className="mt-1 text-sm">
          <b className="mr-1">{u.username}</b>
          {p.caption}
        </p>
      )}
      {p.comments.length > 0 && (
        <button
          onClick={() => open.post(p.id)}
          className="mt-1 text-sm text-neutral-500"
        >
          Barcha {p.comments.length} ta izohni ko‘rish
        </button>
      )}
    </article>
  );
}
function PostModal({ id, close }) {
  const { db, byId } = useC();
  const commentInput = useRef(null);
  const [reply, setReply] = useState(null);
  const p = db.posts.find((x) => x.id === id);
  if (!p) return null;
  const u = byId(p.userId);
  return (
    <Modal close={close} wide>
      <div className="flex max-h-[92vh] flex-col md:h-[640px] md:flex-row">
        <div className="grid shrink-0 place-items-center bg-[#0f3f8c] md:w-[60%]">
          <img
            src={p.image}
            alt=""
            className="max-h-[50vh] w-full object-contain md:max-h-full"
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-4">
          <div className="flex items-center gap-3 border-b border-[#6aa5f0] py-3">
            <Av u={u} s={34} />
            <b className="text-sm">{u.username}</b>
            <FollowBtn id={u.id} />
          </div>
          <div className="min-h-[80px] flex-1 overflow-y-auto no-scrollbar">
            <CommentList p={p} close={close} onReply={setReply} owner={u} />
          </div>
          <PostActions
            p={p}
            onComment={() => commentInput.current?.focus()}
          />
          {p.likes.length > 0 && (
            <div className="text-sm font-semibold">
              {p.likes.length} ta yoqtirish
            </div>
          )}
          <div className="pb-1 text-[11px] uppercase text-neutral-500">
            {ago(p.t)}
          </div>
          <CommentBox
            p={p}
            inputRef={commentInput}
            reply={reply}
            clearReply={() => setReply(null)}
          />
        </div>
      </div>
    </Modal>
  );
}
function Create({ close }) {
  const { A } = useC();
  const [img, setImg] = useState(null);
  const [cap, setCap] = useState("");
  const [em, setEm] = useState(false);
  return (
    <Modal close={close}>
      <div className="flex items-center justify-between border-b border-neutral-200 p-3 !border-[#6aa5f0]">
        <b className="mx-auto pl-10">Yangi post yaratish</b>
        {img && (
          <button
            onClick={() => {
              if (A.post(img, cap)) close();
            }}
            className="font-semibold text-white !text-white"
          >
            Ulashish
          </button>
        )}
      </div>
      {!img ? (
        <label className="grid h-[420px] cursor-pointer place-items-center text-center">
          <div>
            <ImagePlus size={64} strokeWidth={1.2} className="mx-auto" />
            <div className="mt-4 text-xl">Rasmni tanlang</div>
            <span className="mt-4 inline-block rounded-lg bg-[#0f3f8c] !bg-[#ff8a1f] !text-white px-4 py-2 text-sm font-semibold text-white">
              Qurilmadan tanlash
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files[0];
                if (!f) return;
                const err = kidsUnsafeFile(f);
                if (err) {
                  A.toast(err);
                  return;
                }
                setImg(await readImg(f));
                e.target.value = "";
              }}
            />
          </div>
        </label>
      ) : (
        <div className="relative">
          <img src={img} alt="" className="max-h-[50vh] w-full object-cover" />
          <div className="p-3">
            <textarea
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              placeholder="Izoh yozing..."
              className="h-24 w-full resize-none bg-transparent text-sm outline-none"
            />
            <button onClick={() => setEm(!em)}>
              <Smile size={22} />
            </button>
          </div>
          {em && (
            <EmojiPicker
              onPick={(e) => setCap((v) => v + e)}
              cls="absolute bottom-14 left-3"
            />
          )}
        </div>
      )}
    </Modal>
  );
}

function CreateChooser({ close, post, reel, story }) {
  return (
    <Modal close={close}>
      <div className="create-chooser bg-[#2a70d8] p-5 text-white !bg-[#2a70d8] !text-white">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-neutral-200 !bg-[#4f92ec]" />
        <h2 className="text-center text-lg font-bold">Yaratish</h2>
        <div className="mt-5 grid gap-3">
          <button
            onClick={post}
            className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-left transition hover:scale-[1.01] hover:bg-[#3a80e4] !border-[#6aa5f0] !bg-[#3a80e4] hover:!bg-[#4f92ec]"
          >
            <span className="text-amber-500">
              <ImagePlus />
            </span>
            <span>
              <b className="block">Post</b>
              <span className="text-xs text-neutral-500 !text-[#d4e6ff]">
                Rasm va caption
              </span>
            </span>
          </button>
          <button
            onClick={reel}
            className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-left transition hover:scale-[1.01] hover:bg-[#3a80e4] !border-[#6aa5f0] !bg-[#3a80e4] hover:!bg-[#4f92ec]"
          >
            <span className="text-[#ffd24d]">
              <Play />
            </span>
            <span>
              <b className="block">Reels</b>
              <span className="text-xs text-neutral-500 !text-[#d4e6ff]">
                Qisqa video
              </span>
            </span>
          </button>
          <button
            onClick={story}
            className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-left transition hover:scale-[1.01] hover:bg-white !border-[#6aa5f0] !bg-[#3a80e4] hover:!bg-[#4f92ec]"
          >
            <span className="text-[#22c55e]">
              <Camera />
            </span>
            <span>
              <b className="block">Story</b>
              <span className="text-xs text-neutral-500">
                24 soat ko‘rinadi, bir nechta qo‘shish mumkin
              </span>
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
function StoryViewer({ story, close, stories }) {
  const { db, me, byId, open, A } = useC();
  const u = byId(story.userId);
  const [i, setI] = useState(
    Math.max(
      0,
      stories.findIndex((x) => x.id === story.id),
    ),
  );
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoPaused, setVideoPaused] = useState(false);
  const [reply, setReply] = useState("");
  const [showViewers, setShowViewers] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const current = stories[i] || story;
  const next = () => (i < stories.length - 1 ? setI(i + 1) : close());
  const prev = () => i > 0 && setI(i - 1);
  useEffect(() => {
    setVideoProgress(0);
    setVideoPaused(false);
  }, [i]);
  useEffect(() => {
    A.viewStory(current.id);
  }, [current.id]);
  useEffect(() => {
    if (current.type === "video" || showViewers || deleteConfirm) return;
    const timer = setTimeout(next, 6000);
    return () => clearTimeout(timer);
  }, [i, stories.length, current.type, showViewers, deleteConfirm]);
  const cu = byId(current.userId) || u;
  const viewers = db.seenStories
    .filter(
      (item) => item.storyId === current.id && item.viewerId !== current.userId,
    )
    .sort((a, b) => (b.t || 0) - (a.t || 0))
    .map((item) => {
      const user = byId(item.viewerId);
      return user
        ? { ...user, seenAt: item.t, likedStory: (current.likes || []).includes(user.id) }
        : null;
    })
    .filter(Boolean);
  const liked = (current.likes || []).includes(me.id);
  const reelStory =
    current.sourceReel ||
    (current.type === "video" &&
      db.reels.some((reel) => reel.media === current.media));
  useEffect(() => {
    // Story egasi uchun ko‘rganlar ro‘yxatini serverdan muntazam yangilaymiz.
    if (cu.id !== me.id) return;
    A.refreshStoryViews();
    const timer = setInterval(() => A.refreshStoryViews(), 8000);
    return () => clearInterval(timer);
  }, [current.id, cu.id]);
  useEffect(() => {
    // Story ochiq paytda orqadagi video/audio (reels, lenta) to‘xtaydi va qayta o‘ynamaydi.
    window.__bbStoryOpen = true;
    const stopBackground = () =>
      document.querySelectorAll("video, audio").forEach((el) => {
        if (!el.hasAttribute("data-story-media")) el.pause();
      });
    stopBackground();
    const guard = setInterval(stopBackground, 700);
    const onKey = (event) => {
      if (event.key === "Escape") {
        if (document.querySelector("[data-story-delete-confirm]"))
          setDeleteConfirm(false);
        else close();
      }
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.__bbStoryOpen = false;
      clearInterval(guard);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  const sendReply = () => {
    if (!reply.trim()) return;
    A.send(cu.id, {
      text: reply.trim(),
      storyId: current.id,
      storyOwner: cu.id,
    });
    setReply("");
  };
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0b2f6e]/95 p-3 text-white"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div className="relative h-[min(92vh,760px)] w-full max-w-[430px] overflow-hidden rounded-xl bg-[#1450a8] shadow-2xl">
        <div className="absolute left-3 right-3 top-3 z-10 flex gap-1">
          {stories.map((item, n) => (
            <div
              key={item.id}
              className="h-1 flex-1 overflow-hidden rounded bg-white/30"
            >
              <div
                className={`h-full bg-[#fff] ${n === i && item.type !== "video" ? "story-progress" : ""}`}
                style={
                  n < i
                    ? { width: "100%" }
                    : n > i
                      ? { width: 0 }
                      : item.type === "video"
                        ? {
                            width: `${videoProgress}%`,
                            transition: "width .2s linear",
                          }
                        : {
                            animationDuration: "6s",
                            animationPlayState: showViewers ? "paused" : "running",
                          }
                }
              />
            </div>
          ))}
        </div>
        <div className="absolute left-4 right-3 top-7 z-30 flex items-center gap-2">
          <button
            onClick={() => {
              close();
              open.profile(cu.id);
            }}
          >
            <Av u={cu} s={34} />
          </button>
          <b className="min-w-0 truncate text-sm">{cu.username}</b>
          <span className="shrink-0 text-xs text-white/70">• {ago(current.t)}</span>
          {cu.id === me.id && (
            <button
              onClick={() => setDeleteConfirm(true)}
              aria-label="Storyni o‘chirish"
              className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/40"
            >
              <Trash2 size={17} />
            </button>
          )}
          <button
            onClick={close}
            aria-label="Storydan chiqish"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/40 ${cu.id === me.id ? "" : "ml-auto"}`}
          >
            <X size={22} />
          </button>
        </div>
        {current.type === "video" && (
          <>
            <video
              data-story-media
              src={current.media}
              autoPlay
              playsInline
              muted={false}
              aria-label="Story videosini pauza qilish yoki davom ettirish"
              onClick={(event) => {
                const video = event.currentTarget;
                if (video.paused) video.play();
                else video.pause();
              }}
              onPlay={() => setVideoPaused(false)}
              onPause={() => setVideoPaused(true)}
              onTimeUpdate={(event) => {
                const video = event.currentTarget;
                if (video.duration)
                  setVideoProgress((video.currentTime / video.duration) * 100);
              }}
              onEnded={next}
              className="h-full w-full object-contain"
            />
            {videoPaused && (
              <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-black/55 text-white">
                  <Play size={32} fill="currentColor" />
                </span>
              </div>
            )}
          </>
        )}
        {current.type !== "video" && (
          <img src={current.media} className="h-full w-full object-cover" />
        )}
        {current.caption && !reelStory && (
          <div className="absolute bottom-20 left-4 right-4 rounded-xl bg-black/45 p-3 text-sm backdrop-blur">
            {current.caption}
          </div>
        )}
        {deleteConfirm && (
          <div
            data-story-delete-confirm
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="story-delete-title"
            aria-describedby="story-delete-description"
            className="absolute inset-0 z-50 grid place-items-center bg-[#071d43]/65 p-5 backdrop-blur-sm"
          >
            <div className="w-full max-w-[320px] rounded-2xl border border-[#6aa5f0] bg-[#1450a8] p-5 text-center shadow-2xl">
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#ff8a1f]/20 text-[#ffd24d]">
                <Trash2 size={23} />
              </span>
              <h2 id="story-delete-title" className="text-lg font-bold">
                Storyni o‘chirish?
              </h2>
              <p
                id="story-delete-description"
                className="mt-2 text-sm leading-relaxed text-white/75"
              >
                Bu story va undagi ko‘rishlar tarixi o‘chib ketadi.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="flex-1 rounded-xl border border-white/25 px-3 py-2.5 text-sm font-semibold transition hover:bg-white/10"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={() => {
                    A.delStory(current.id);
                    setDeleteConfirm(false);
                    if (stories.length <= 1) close();
                    else setI(Math.max(0, i - 1));
                  }}
                  className="flex-1 rounded-xl bg-[#ff8a1f] px-3 py-2.5 text-sm font-bold transition hover:bg-[#e8750a]"
                >
                  O‘chirish
                </button>
              </div>
            </div>
          </div>
        )}
        {cu.id === me.id ? (
          <>
            <div className="absolute bottom-3 left-3 right-3 z-20">
              <button
                onClick={() => setShowViewers(true)}
                className="flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-sm font-semibold"
              >
                <Eye size={17} /> {viewers.length} kishi ko‘rdi
              </button>
            </div>
            {showViewers && (
              <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/40">
                <button
                  aria-label="Yopish"
                  className="min-h-[30%] flex-1"
                  onClick={() => setShowViewers(false)}
                />
                <div className="flex max-h-[65%] flex-col rounded-t-2xl bg-[#2a70d8] shadow-2xl">
                  <div className="flex items-center justify-between border-b border-[#6aa5f0] px-4 py-3">
                    <b className="flex items-center gap-2 text-sm">
                      <Eye size={17} /> Ko‘rganlar ({viewers.length})
                    </b>
                    <button
                      onClick={() => setShowViewers(false)}
                      aria-label="Ko‘rganlar ro‘yxatini yopish"
                      className="grid h-8 w-8 place-items-center rounded-full bg-[#3a80e4]"
                    >
                      <X size={17} />
                    </button>
                  </div>
                  <div className="min-h-[120px] overflow-y-auto p-2">
                    {viewers.length ? (
                      viewers.map((viewer) => (
                        <button
                          key={viewer.id}
                          onClick={() => {
                            close();
                            open.profile(viewer.id);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-[#4f92ec]"
                        >
                          <Av u={viewer} s={38} />
                          <span className="min-w-0 flex-1">
                            <b className="block truncate text-sm">{viewer.username}</b>
                            <span className="block truncate text-xs text-white/70">
                              {viewer.seenAt ? ago(viewer.seenAt) : viewer.name}
                            </span>
                          </span>
                          {viewer.likedStory && (
                            <Heart size={18} fill="#ff4f6d" className="text-[#ff4f6d]" />
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="p-6 text-center text-sm text-white/80">
                        Hali hech kim ko‘rmagan
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center gap-2">
            <div className="flex h-11 min-w-0 flex-1 items-center gap-1 rounded-full border border-white/60 bg-black/30 pl-2 pr-1">
              <label
                title="Video javob yuborish"
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full"
              >
                <ImagePlus size={18} />
                <input
                  type="file"
                  accept="video/*,.mov,.m4v,.mp4,.webm"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const err = kidsUnsafeFile(file);
                    if (err) {
                      A.toast(err);
                      return;
                    }
                    A.send(cu.id, {
                      src: await readMedia(file),
                      mediaType: "video",
                      storyId: current.id,
                      storyOwner: cu.id,
                    });
                    event.target.value = "";
                  }}
                />
              </label>
              <input
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && sendReply()}
                placeholder="Storyga javob yozing..."
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/70"
              />
              <button
                onClick={sendReply}
                disabled={!reply.trim()}
                aria-label="Javob yuborish"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white disabled:opacity-40"
              >
                <Send size={18} />
              </button>
            </div>
            <button
              onClick={() => A.like(current.id, "story")}
              aria-label="Storyga like"
              aria-pressed={liked}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/35"
            >
              <Heart
                size={24}
                fill={liked ? "#ef4444" : "none"}
                className={liked ? "text-red-500" : "text-white"}
              />
            </button>
          </div>
        )}
        <button
          onClick={prev}
          className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-3"
        >
          <ChevronLeft />
        </button>
        <button
          onClick={next}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-3 rotate-180"
        >
          <ChevronLeft />
        </button>
      </div>
    </div>
  );
}
function ShareModal({ reel, close }) {
  const { db, me, A, byId } = useC();
  const [sent, setSent] = useState([]);
  const [sharing, setSharing] = useState(false);
  const friends = db.users.filter((u) => u.id !== me.id);
  const addStory = () => {
    A.story(reel.media, reel.type, "", true);
    close();
    A.toast("Reels storyga qo‘shildi ✓");
  };
  const shareToApps = async () => {
    if (sharing) return;
    setSharing(true);
    const username = byId(reel.userId)?.username || "";
    const text = [`@${username}`, reel.caption].filter(Boolean).join(" ");
    try {
      if (navigator.share) {
        const blob = await (await fetch(reel.media)).blob();
        const extension = blob.type.split("/")[1]?.split(";")[0] || "mp4";
        const file = new File([blob], `reels.${extension}`, {
          type: blob.type || "video/mp4",
        });
        const shareData = { title: "Reels", text, files: [file] };
        if (navigator.canShare?.({ files: [file] }))
          await navigator.share(shareData);
        else await navigator.share({ title: "Reels", text });
      } else {
        await navigator.clipboard.writeText(text || "Reels");
        A.toast("Ulashish menyusi bu brauzerda yo‘q, matn nusxalandi");
      }
    } catch (error) {
      if (error.name !== "AbortError")
        A.toast("Reelsni ilovaga ulashib bo‘lmadi");
    } finally {
      setSharing(false);
    }
  };
  return (
    <Modal close={close}>
      <div className="border-b border-neutral-200 p-4 text-center font-semibold !border-[#6aa5f0]">
        Ulashish
      </div>
      <div className="p-4">
        <button
          onClick={addStory}
          className="mb-3 flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-neutral-50 !border-[#6aa5f0] hover:!bg-[#4f92ec]"
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white">
            <Camera size={22} />
          </span>
          <span>
            <b className="block">Storyga qo‘shish</b>
            <span className="text-xs text-neutral-500">
              Reelsni storyda ulashing
            </span>
          </span>
        </button>
        <button
          onClick={shareToApps}
          disabled={sharing}
          className="mb-5 flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-neutral-50 disabled:opacity-60 !border-[#6aa5f0] hover:!bg-[#4f92ec]"
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-neutral-100 !bg-[#3a80e4]">
            <Share2 size={21} />
          </span>
          <span>
            <b className="block">
              {sharing ? "Ulashish ochilmoqda..." : "Boshqa ilovaga yuborish"}
            </b>
            <span className="text-xs text-neutral-500">
              Telegram va boshqa ilovalar
            </span>
          </span>
        </button>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Users size={18} /> Do‘stlarga yuborish
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {friends.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                A.send(u.id, {
                  text: `🎬 Reels: ${reel.caption || "Reels"}`,
                  reelId: reel.id,
                });
                setSent((x) => [...x, u.id]);
              }}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-neutral-100 hover:!bg-[#4f92ec]"
            >
              <Av u={u} s={44} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm">{u.username}</b>
                <span className="text-xs text-neutral-500">{u.name}</span>
              </span>
              {sent.includes(u.id) ? (
                <Check className="text-green-500" />
              ) : (
                <Send size={18} className="text-neutral-500" />
              )}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
function ReelComments({ id, close }) {
  const { db, byId } = useC();
  const [reply, setReply] = useState(null);
  const r = db.reels.find((x) => x.id === id);
  if (!r) return null;
  const owner = byId(r.userId);
  const count = (r.comments || []).length;
  return (
    <Modal close={close}>
      <div className="flex max-h-[80vh] min-h-[50vh] flex-col text-white">
        <div className="flex items-center justify-between border-b border-[#6aa5f0] p-4">
          <b>Izohlar{count ? ` (${count})` : ""}</b>
          <button onClick={close} aria-label="Yopish">
            <X size={20} />
          </button>
        </div>
        <div className="min-h-[120px] flex-1 overflow-y-auto px-4 no-scrollbar">
          <CommentList p={r} kind="reel" close={close} onReply={setReply} owner={owner} />
        </div>
        <div className="px-4">
          <CommentBox
            p={r}
            kind="reel"
            autoFocus
            reply={reply}
            clearReply={() => setReply(null)}
          />
        </div>
      </div>
    </Modal>
  );
}
/* ---------- Reels / video helpers ---------- */
const fmtN = (n) => {
  n = n || 0;
  return n >= 1e6
    ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M"
    : n >= 1e4
      ? Math.round(n / 1e3) + "K"
      : n >= 1e3
        ? (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K"
        : String(n);
};
const MUTE_KEY = "reelMuted";
function useReelMuted() {
  const [muted, setM] = useState(() => {
    try {
      return localStorage.getItem(MUTE_KEY) !== "0";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    const h = (e) => setM(e.detail);
    window.addEventListener("reel-muted", h);
    return () => window.removeEventListener("reel-muted", h);
  }, []);
  const set = (v) => {
    setM(v);
    try {
      localStorage.setItem(MUTE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent("reel-muted", { detail: v }));
  };
  return [muted, set];
}
function useVideoAutoplay(ref, muted, setMuted, threshold, key, autoPlay = true) {
  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const stopVideo = () => {
      v.pause();
      if (document.pictureInPictureElement === v)
        document.exitPictureInPicture().catch(() => {});
    };
    const io = new IntersectionObserver(
      ([e]) => {
        const visible = e.isIntersecting && e.intersectionRatio >= threshold;
        if (!visible || window.__bbAccessLocked) {
          stopVideo();
          return;
        }
        if (!autoPlay) {
          stopVideo();
          return;
        }
        if (autoPlay && !window.__bbStoryOpen)
          v.play().catch(() => {
            v.muted = true;
            setMuted(true);
            v.play().catch(() => {});
          });
      },
      { threshold: [0, threshold] },
    );
    const onVisibilityChange = () => {
      if (document.hidden) stopVideo();
    };
    io.observe(v);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", stopVideo);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", stopVideo);
      stopVideo();
    };
  }, [key, autoPlay]);
}
function Caption({ u, text }) {
  const [more, setMore] = useState(false);
  if (!text) return null;
  const long = text.length > 90;
  return (
    <p className="break-words text-sm">
      <b className="mr-1">{u.username}</b>
      {!more && long ? text.slice(0, 90).trimEnd() + "… " : text}
      {long && !more && (
        <button onClick={() => setMore(true)} className="opacity-70">
          more
        </button>
      )}
    </p>
  );
}
function ReelReport({ r, close }) {
  const { A } = useC();
  const [reportReason, setReportReason] = useState("adult");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const submitReport = async () => {
    if (reportReason === "other" && !reportDetails.trim()) {
      A.toast("Boshqa sababni qisqacha yozing");
      return;
    }
    setReporting(true);
    const sent = await A.reportReel(r.id, reportReason, reportDetails);
    setReporting(false);
    if (sent) close();
  };
  return (
    <Modal close={() => !reporting && close()}>
      <div className="flex items-center justify-between border-b border-neutral-200 p-4 !border-[#6aa5f0]">
        <b>Reels haqida shikoyat</b>
        <button onClick={close} disabled={reporting} aria-label="Yopish">
          <X size={20} />
        </button>
      </div>
      <div className="space-y-4 p-4 text-white !text-white">
        <label className="block text-sm font-semibold">
          Sabab
          <select
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-[#2a70d8] px-3 py-2.5 font-normal !border-[#6aa5f0] !bg-[#3a80e4]"
          >
            <option value="adult">18+ kontent</option>
            <option value="violence">Zo‘ravonlik</option>
            <option value="harassment">Haqorat yoki nafrat</option>
            <option value="spam">Spam yoki aldov</option>
            <option value="other">Boshqa</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Izoh <span className="font-normal text-neutral-500">(ixtiyoriy)</span>
          <textarea
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Qo‘shimcha ma’lumot"
            className="mt-1.5 w-full resize-y rounded-lg border border-neutral-300 bg-[#2a70d8] px-3 py-2.5 font-normal outline-none !border-[#6aa5f0] !bg-[#3a80e4]"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button
            onClick={close}
            disabled={reporting}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold !border-[#6aa5f0]"
          >
            Bekor qilish
          </button>
          <button
            onClick={submitReport}
            disabled={reporting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {reporting ? "Yuborilmoqda..." : "Yuborish"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
function ReelMenu({ r, size = 24, up = false, showOpen = false }) {
  const { me, A, open } = useC();
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const own = r.userId === me.id;
  const item =
    "flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-neutral-100 hover:!bg-[#4f92ec]";
  const run = (fn) => () => {
    setMenu(false);
    fn();
  };
  return (
    <div className="relative">
      <button
        onClick={() => setMenu((v) => !v)}
        aria-label="Boshqa amallar"
        aria-expanded={menu}
      >
        <MoreHorizontal size={size} />
      </button>
      {menu && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
          <div
            className={`absolute right-0 z-30 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-[#2a70d8] text-white shadow-xl !border-[#6aa5f0] !bg-[#2a70d8] !text-white ${up ? "bottom-full mb-2" : "top-full mt-2"}`}
          >
            {showOpen && (
              <button onClick={run(() => open.reel(r.id))} className={item}>
                <Play size={16} /> Reels sifatida ochish
              </button>
            )}
            <button
              onClick={run(() => open.profile(r.userId))}
              className={item}
            >
              <User size={16} /> Profilga o‘tish
            </button>
            {!own && (
              <button
                onClick={run(() => A.story(r.media, r.type, "", true))}
                className={item}
              >
                <Plus size={16} /> Storyga qo‘shish
              </button>
            )}
            {own ? (
              <button
                onClick={run(() => {
                  if (window.confirm("Bu videoni o‘chirmoqchimisiz?"))
                    A.delReel(r.id);
                })}
                className={item + " font-semibold text-red-500"}
              >
                <Trash2 size={16} /> O‘chirish
              </button>
            ) : (
              <button
                onClick={run(() => setReport(true))}
                className={item + " font-semibold text-red-500"}
              >
                <Flag size={16} /> Shikoyat qilish
              </button>
            )}
          </div>
        </>
      )}
      {report && <ReelReport r={r} close={() => setReport(false)} />}
    </div>
  );
}
function ReelsCard({ r }) {
  const { byId, me, A, open, db } = useC();
  const u = byId(r.userId);
  const [muted, setMuted] = useReelMuted();
  const [paused, setPaused] = useState(false);
  const [share, setShare] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [heart, setHeart] = useState(false);
  const liked = r.likes.includes(me.id);
  const saved = (db.saved[me.id] || []).includes(r.id);
  const video = useRef(null);
  const bar = useRef(null);
  useVideoAutoplay(video, muted, setMuted, 0.65, r.id);
  if (!u) return null;
  const dbl = () => {
    if (!liked) A.like(r.id, "reel");
    setHeart(true);
    setTimeout(() => setHeart(false), 700);
  };
  const tick = (e) => {
    const v = e.currentTarget;
    if (bar.current && v.duration)
      bar.current.style.width = (v.currentTime / v.duration) * 100 + "%";
  };
    return (
    <article className="relative mx-auto flex h-full w-full snap-start items-center justify-center px-3 py-0">
      <div
        className="relative h-full w-full shrink-0 overflow-hidden rounded-lg bg-[#0f3f8c] text-white md:aspect-[9/16] md:w-[min(calc(100vw-24px),calc(100dvh*9/16))]"
        onDoubleClick={dbl}
      >
        {r.type === "video" ? (
          <video
            ref={video}
            src={r.media}
            preload="none"
            loop
            playsInline
            disablePictureInPicture
            disableRemotePlayback
            data-reels-video
            muted={muted}
            aria-label="Reels videosini pauza qilish yoki davom ettirish"
            onTimeUpdate={tick}
            onClick={(e) => {
              const v = e.currentTarget;
              if (v.paused) v.play();
              else v.pause();
            }}
            onPlay={(e) => {
              document
                .querySelectorAll("[data-reels-video]")
                .forEach((otherVideo) => {
                  if (otherVideo !== e.currentTarget) otherVideo.pause();
                });
              A.viewReel(r.id);
              setPaused(false);
            }}
            onPause={() => setPaused(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={r.media}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
        {paused && r.type === "video" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-black/55">
              <Play size={32} fill="currentColor" />
            </span>
          </div>
        )}
        {heart && (
          <Heart
            size={110}
            fill="white"
            className="pop pointer-events-none absolute inset-0 m-auto text-white drop-shadow-2xl"
          />
        )}
        <div
          className="absolute inset-x-3 bottom-4 space-y-2.5"
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <button onClick={() => open.profile(u.id)}>
              <Av u={u} s={34} />
            </button>
            <b className="max-w-[40%] truncate text-sm">{u.username}</b>
            {u.id !== me.id && <FollowBtn id={u.id} />}
          </div>
          <Caption u={{ username: "" }} text={r.caption} />
          <p className="text-xs text-white/80">
            ♪ Original audio · {u.username}
          </p>
        </div>
        <div className="absolute right-3 bottom-2 z-20 flex flex-col items-center gap-2.5">
          <div className="flex flex-col items-center gap-[3px]">
            <button
              onClick={() => A.like(r.id, "reel")}
              aria-label="Reelsga like"
              aria-pressed={liked}
              className="grid h-12 w-12 place-items-center rounded-full transition active:scale-110"
            >
              <Heart
                size={26}
                fill={liked ? "#ff4f6d" : "none"}
                className={liked ? "text-[#ff4f6d]" : "text-white"}
              />
            </button>
            <span className="text-[11px] font-semibold leading-none">{fmtN(r.likes.length)}</span>
          </div>
          <div className="flex flex-col items-center gap-[3px]">
            <button
              onClick={() => setCommentsOpen(true)}
              aria-label="Reelsga izoh yozish"
              className="grid h-12 w-12 place-items-center rounded-full transition active:scale-110"
            >
              <MessageCircle size={26} className="text-white" />
            </button>
            <span className="text-[11px] font-semibold leading-none">{fmtN((r.comments || []).length)}</span>
          </div>
          <div className="flex flex-col items-center gap-[3px]">
            <button
              onClick={() => setShare(true)}
              aria-label="Reelsni ulashish"
              className="grid h-12 w-12 place-items-center rounded-full transition active:scale-110"
            >
              <Send size={25} className="text-white" />
            </button>
            <span className="text-[11px] font-semibold leading-none">Yubor</span>
          </div>
          <div className="flex flex-col items-center gap-[3px]">
            <button
              onClick={() => A.save(r.id)}
              aria-label="Saqlash"
              aria-pressed={saved}
              className="grid h-12 w-12 place-items-center rounded-full transition active:scale-110"
            >
              <Bookmark size={25} fill={saved ? "currentColor" : "none"} className="text-white" />
            </button>
            <span className="text-[11px] font-semibold leading-none">Saql.</span>
          </div>
          <div className="mt-0.5 flex flex-col items-center gap-1">
            <ReelMenu r={r} up />
          </div>
        </div>
        {r.type === "video" && (
          <button
            onClick={() => setMuted(!muted)}
            aria-label={muted ? "Ovozni yoqish" : "Ovozni o‘chirish"}
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-[#0b2f6e]/60"
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        )}
        {r.type === "video" && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
            <div ref={bar} className="h-full w-0 bg-[#ffd24d]" />
          </div>
        )}
      </div>
      {share && <ShareModal reel={r} close={() => setShare(false)} />}
      {commentsOpen && (
        <ReelComments id={r.id} close={() => setCommentsOpen(false)} />
      )}
    </article>
  );
}

function CreateStory({ close }) {
  const { A } = useC();
  const [media, setMedia] = useState(null);
  const [type, setType] = useState("image");
  const [cap, setCap] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async (file) => {
    const video = isVideoFile(file);
    return {
      type: video ? "video" : "image",
      media: video ? await readMedia(file) : await readImg(file, 1080),
    };
  };
  const onPick = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    for (const f of files) {
      const err = kidsUnsafeFile(f);
      if (err) {
        A.toast(err);
        return;
      }
    }
    setBusy(true);
    try {
      if (files.length === 1) {
        const item = await load(files[0]);
        setType(item.type);
        setMedia(item.media);
        return;
      }
      // Bir nechta fayl tanlansa — hammasi alohida story bo‘lib birdaniga qo‘yiladi.
      let added = 0;
      for (const f of files.slice(0, 10)) {
        const item = await load(f);
        if (A.story(item.media, item.type, "", false, { silent: true })) added += 1;
      }
      if (added) {
        A.toast(`${added} ta story qo‘shildi ✓`);
        close();
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal close={close}>
      <div className="flex items-center justify-between border-b p-3 !border-[#6aa5f0]">
        <b className="mx-auto pl-8">Yangi story</b>
        {media && (
          <button
            onClick={() => {
              if (A.story(media, type, cap)) close();
            }}
            className="font-semibold text-[#ffd24d]"
          >
            Ulashish
          </button>
        )}
      </div>
      {!media ? (
        <label className="grid h-[420px] cursor-pointer place-items-center text-center">
          <div>
            <Camera size={58} className="mx-auto" />
            <div className="mt-4 text-xl">
              {busy ? "Yuklanmoqda..." : "Rasm yoki video tanlang"}
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Bir nechtasini birdaniga tanlash mumkin
            </p>
            <span className="mt-3 inline-block rounded-lg bg-[#ff8a1f] px-4 py-2 text-sm font-semibold text-white">
              Qurilmadan tanlash
            </span>
            <input
              type="file"
              multiple
              accept="image/*,video/*,.mov,.m4v,.mp4,.webm"
              className="hidden"
              disabled={busy}
              onChange={onPick}
            />
          </div>
        </label>
      ) : (
        <div>
          <div className="bg-[#0f3f8c]">
            {type === "image" ? (
              <img src={media} alt="" className="mx-auto max-h-[55vh] object-contain" />
            ) : (
              <video src={media} controls playsInline className="mx-auto max-h-[55vh]" />
            )}
          </div>
          <div className="p-4">
            <textarea
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              maxLength={200}
              placeholder="Storyga yozuv qo‘shing..."
              className="h-20 w-full resize-none bg-transparent outline-none"
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
function CreateReel({ close }) {
  const { A } = useC();
  const [media, setMedia] = useState(null);
  const [cap, setCap] = useState("");
  return (
    <Modal close={close}>
      <div className="flex items-center justify-between border-b p-3 !border-[#6aa5f0]">
        <b className="mx-auto pl-8">Yangi Reels</b>
        {media && (
          <button
            onClick={() => {
              if (A.reel(media, cap)) close();
            }}
            className="font-semibold text-white !text-white"
          >
            Ulashish
          </button>
        )}
      </div>
      {!media ? (
        <label className="grid h-[420px] cursor-pointer place-items-center text-center">
          <div>
            <Play size={64} className="mx-auto" />
            <div className="mt-4 text-xl">Reels videosini tanlang</div>
            <span className="mt-3 inline-block rounded-lg bg-[#0f3f8c] !bg-[#ff8a1f] !text-white px-4 py-2 text-sm font-semibold text-white">
              Video tanlash
            </span>
            <input
              type="file"
              accept="video/*,.mov,.m4v,.mp4,.webm"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const err = kidsUnsafeFile(f);
                  if (err) {
                    A.toast(err);
                    return;
                  }
                  setMedia(await readMedia(f));
                  e.target.value = "";
                }
              }}
            />
          </div>
        </label>
      ) : (
        <div>
          <video
            src={media}
            controls
            className="mx-auto max-h-[55vh] bg-[#0f3f8c]"
          />
          <div className="p-4">
            <textarea
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              placeholder="Reels haqida yozing..."
              className="h-20 w-full resize-none bg-transparent outline-none"
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

function HomeReelCard({ r }) {
  const { byId, me, A, open, db } = useC();
  const u = byId(r.userId);
  const [muted, setMuted] = useReelMuted();
  const [paused, setPaused] = useState(false);
  const [share, setShare] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [heart, setHeart] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const video = useRef(null);
  useVideoAutoplay(video, muted, setMuted, 0.6, r.id);
  if (!u) return null;
  const liked = r.likes.includes(me.id);
  const saved = (db.saved[me.id] || []).includes(r.id);
  const count = (r.comments || []).length;
  const dbl = () => {
    if (!liked) A.like(r.id, "reel");
    setHeart(true);
    setTimeout(() => setHeart(false), 700);
  };
  return (
    <article className="ig-card mb-4 pb-4">
      <div className="flex items-center gap-2 py-3">
        <button
          onClick={() => open.profile(u.id)}
          className="flex items-center gap-3"
        >
          <Av u={u} s={34} />
          <b className="text-sm">{u.username}</b>
        </button>
        <span className="text-sm text-neutral-500">• {ago(r.t)}</span>
        {u.id !== me.id && <FollowBtn id={u.id} />}
        <div className="ml-auto">
          <ReelMenu r={r} size={22} showOpen />
        </div>
      </div>
      <div
        className={`relative w-full overflow-hidden border border-neutral-200 bg-[#0f3f8c] !border-[#6aa5f0] sm:rounded-[3px] ${landscape ? "aspect-video" : "aspect-[4/5]"}`}
        onDoubleClick={dbl}
      >
        <video
          ref={video}
          src={r.media}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) =>
            setLandscape(
              e.currentTarget.videoWidth >= e.currentTarget.videoHeight,
            )
          }
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onClick={(e) => {
            const v = e.currentTarget;
            if (v.paused) v.play();
            else v.pause();
          }}
          className="block h-full w-full cursor-pointer object-cover"
        />
        {paused && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-black/55 text-white">
              <Play size={30} fill="currentColor" />
            </span>
          </div>
        )}
        {heart && (
          <Heart
            size={100}
            fill="white"
            className="pop pointer-events-none absolute inset-0 m-auto text-white drop-shadow-2xl"
          />
        )}
        <button
          onClick={() => setMuted(!muted)}
          aria-label={muted ? "Ovozni yoqish" : "Ovozni o‘chirish"}
          className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-[#0b2f6e]/60 text-white"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-5">
          <button
            onClick={() => A.like(r.id, "reel")}
            aria-label="Like"
            aria-pressed={liked}
            className="flex items-center gap-1.5 transition active:scale-110"
          >
            <Heart
              size={26}
              fill={liked ? "#ef4444" : "none"}
              className={liked ? "text-red-500" : ""}
            />
            <span className="text-sm font-semibold">
              {fmtN(r.likes.length)}
            </span>
          </button>
          <button
            onClick={() => setCommentsOpen(true)}
            aria-label="Izohlar"
            className="flex items-center gap-1.5"
          >
            <MessageCircle size={26} />
            <span className="text-sm font-semibold">{fmtN(count)}</span>
          </button>
          <button onClick={() => setShare(true)} aria-label="Ulashish">
            <Send size={26} />
          </button>
        </div>
        <button
          onClick={() => A.save(r.id)}
          aria-label="Saqlash"
          aria-pressed={saved}
        >
          <Bookmark size={26} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <Caption u={u} text={r.caption} />
      {count > 0 && (
        <button
          onClick={() => setCommentsOpen(true)}
          className="mt-1 text-sm text-neutral-500"
        >
          Barcha {count} ta izohni ko‘rish
        </button>
      )}
      {share && <ShareModal reel={r} close={() => setShare(false)} />}
      {commentsOpen && (
        <ReelComments id={r.id} close={() => setCommentsOpen(false)} />
      )}
    </article>
  );
}

function Grid({ posts }) {
  const { open } = useC();
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-5">
      {posts.map((p) => (
        <button
          key={p.id}
          onClick={() =>
            p.kind === "reel" ? open.reel(p.id) : open.post(p.id)
          }
          className="group relative aspect-square overflow-hidden bg-neutral-100 !bg-[#2a70d8]"
        >
          {p.kind === "reel" ? (
            <>
              <video
                src={p.media}
                muted
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <Play
                size={18}
                fill="white"
                className="absolute right-2 top-2 text-white drop-shadow"
              />
            </>
          ) : (
            <img src={p.image} alt="" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 hidden items-center justify-center gap-5 bg-black/40 font-semibold text-white group-hover:flex">
            <span className="flex items-center gap-1">
              <Heart size={20} fill="white" />
              {p.likes.length}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={20} fill="white" />
              {(p.comments || []).length}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

const MOODS = ["😀", "😎", "🥳", "😴", "🤓", "🥰", "💪", "🎮", "⚽", "🎨", "🎵", "📚"];
const INTEREST_IDEAS = [
  "Futbol", "Rasm chizish", "Musiqa", "Kitob", "O‘yinlar", "Multfilmlar",
  "Sayohat", "Kodlash", "Suzish", "Raqs", "Fotosurat", "Velosiped",
];
function EditProfile({ close }) {
  const { me, A } = useC();
  const [f, setF] = useState({
    name: me.name || "",
    username: me.username || "",
    bio: me.bio || "",
    avatar: me.avatar || null,
    city: me.city || "",
    mood: me.mood || "",
    interests: Array.isArray(me.interests) ? me.interests : [],
  });
  const [newInterest, setNewInterest] = useState("");
  const [emoji, setEmoji] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (patch) => {
    setErr("");
    setF((value) => ({ ...value, ...patch }));
  };
  const inp =
    "mt-1.5 w-full rounded-xl border border-[#6aa5f0] bg-[#3a80e4] p-3 text-sm outline-none placeholder:text-[#d4e6ff]";
  const addInterest = (raw) => {
    const value = String(raw || "").replace(/[,#]/g, "").trim().slice(0, 24);
    if (!value) return;
    if (f.interests.length >= 8) {
      setErr("Ko‘pi bilan 8 ta qiziqish qo‘shish mumkin");
      return;
    }
    if (kidsUnsafeText(value)) {
      setErr("Haqoratli yoki 18+ so‘zlar yozib bo‘lmaydi");
      return;
    }
    if (f.interests.some((item) => item.toLowerCase() === value.toLowerCase()))
      return;
    set({ interests: [...f.interests, value] });
    setNewInterest("");
  };
  const pickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (isVideoFile(file)) {
      setErr("Profil rasmi uchun video emas, rasm tanlang");
      return;
    }
    const bad = kidsUnsafeFile(file);
    if (bad) {
      setErr(bad);
      return;
    }
    set({ avatar: await readImg(file, 400) });
  };
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setErr("");
    const pending = newInterest.trim();
    const payload = {
      ...f,
      interests:
        pending && f.interests.length < 8 && !kidsUnsafeText(pending)
          ? [...f.interests, pending.slice(0, 24)]
          : f.interests,
    };
    const result = await A.edit(payload);
    setBusy(false);
    if (result) setErr(result);
    else close();
  };
  const bioLeft = 150 - f.bio.length;
  return (
    <Modal close={close}>
      <div className="max-h-[88vh] overflow-y-auto p-5 no-scrollbar">
        <h2 className="text-lg font-bold">Profilni tahrirlash</h2>
        <div className="mt-5 flex flex-col items-center">
          <Av u={{ ...me, ...f }} s={96} />
          <div className="mt-3 flex items-center gap-4 text-sm font-semibold">
            <label className="cursor-pointer text-[#ffd24d]">
              Rasmni almashtirish
              <input type="file" accept="image/*" className="hidden" onChange={pickAvatar} />
            </label>
            {f.avatar && (
              <button onClick={() => set({ avatar: null })} className="text-red-300">
                Olib tashlash
              </button>
            )}
          </div>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-semibold">
            Ism
            <input
              className={inp}
              value={f.name}
              maxLength={50}
              placeholder="Ismingiz"
              onChange={(e) => set({ name: e.target.value })}
            />
          </label>
          <label className="block text-sm font-semibold">
            Username
            <div className={inp + " flex items-center gap-1"}>
              <span className="text-neutral-500">@</span>
              <input
                className="min-w-0 flex-1 border-0 bg-transparent outline-none"
                value={f.username}
                maxLength={30}
                onChange={(e) =>
                  set({ username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "") })
                }
              />
            </div>
            <span className="mt-1 block text-xs font-normal text-neutral-500">
              3–30 ta belgi: a-z, 0-9, nuqta va pastki chiziq
            </span>
          </label>
          <div className="relative">
            <label className="block text-sm font-semibold">
              Bio
              <textarea
                className={inp + " h-24 resize-none"}
                value={f.bio}
                maxLength={150}
                placeholder="O‘zingiz haqingizda qisqacha yozing..."
                onChange={(e) => set({ bio: e.target.value })}
              />
            </label>
            <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
              <button onClick={() => setEmoji((v) => !v)} aria-label="Emoji" className="flex items-center gap-1">
                <Smile size={18} /> Emoji
              </button>
              <span className={bioLeft < 15 ? "font-semibold text-[#ffd24d]" : ""}>{bioLeft}</span>
            </div>
            {emoji && (
              <EmojiPicker
                onPick={(e) => f.bio.length < 148 && set({ bio: f.bio + e })}
                cls="absolute left-0 top-full mt-1"
              />
            )}
          </div>
          <label className="block text-sm font-semibold">
            Shahar / viloyat
            <input
              className={inp}
              value={f.city}
              maxLength={40}
              placeholder="Masalan: Toshkent"
              onChange={(e) => set({ city: e.target.value })}
            />
          </label>
          <div>
            <div className="text-sm font-semibold">Kayfiyat</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => set({ mood: f.mood === m ? "" : m })}
                  className={`grid h-10 w-10 place-items-center rounded-full border text-xl ${f.mood === m ? "border-[#ffd24d] bg-[#4f92ec]" : "border-[#6aa5f0] bg-[#3a80e4]"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold">
              Qiziqishlar <span className="font-normal text-neutral-500">({f.interests.length}/8)</span>
            </div>
            {f.interests.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {f.interests.map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-1.5 rounded-full bg-[#4f92ec] px-3 py-1 text-xs font-semibold"
                  >
                    {item}
                    <button
                      onClick={() => set({ interests: f.interests.filter((x) => x !== item) })}
                      aria-label={`${item} ni olib tashlash`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              className={inp}
              value={newInterest}
              maxLength={24}
              placeholder="Qiziqish yozing va Enter bosing"
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addInterest(newInterest);
                }
              }}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {INTEREST_IDEAS.filter((i) => !f.interests.includes(i)).slice(0, 8).map((i) => (
                <button
                  key={i}
                  onClick={() => addInterest(i)}
                  className="rounded-full border border-[#6aa5f0] px-2.5 py-1 text-xs hover:bg-[#4f92ec]"
                >
                  + {i}
                </button>
              ))}
            </div>
          </div>
        </div>
        {err && <p className="mt-3 text-sm font-semibold text-[#ffd24d]">{err}</p>}
        <div className="mt-5 flex gap-2">
          <button
            onClick={close}
            className="h-11 flex-1 rounded-xl border border-[#6aa5f0] text-sm font-semibold"
          >
            Bekor qilish
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff8a1f] text-sm font-semibold text-white disabled:opacity-60"
          >
            <Check size={18} /> {busy ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
function ChangePassword({ close }) {
  const { me, A } = useC();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const change = async (e) => {
    e.preventDefault();
    setErr("");
    if (newPassword.length < 4) {
      setErr("Yangi parol kamida 4 ta belgi bo‘lsin");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr("Yangi parollar mos kelmadi");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/plat/change-password/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken(),
        },
        body: JSON.stringify({
          username: me.username,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setErr(result.error || "Parolni o‘zgartirib bo‘lmadi");
        return;
      }
      close();
      A.toast("Parol muvaffaqiyatli o‘zgartirildi");
    } catch {
      setErr("Server bilan bog‘lanib bo‘lmadi");
    } finally {
      setBusy(false);
    }
  };
  const input =
    "w-full rounded-lg border border-neutral-300 bg-transparent p-3 text-sm outline-none !border-[#6aa5f0]";
  const passwordInput = (
    value,
    setValue,
    visible,
    setVisible,
    placeholder,
    autoComplete,
    minLength,
  ) => (
    <div className="relative">
      <input
        required
        minLength={minLength}
        autoComplete={autoComplete}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={input + " pr-11"}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={
          visible ? `${placeholder}ni yashirish` : `${placeholder}ni ko‘rsatish`
        }
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-white hover:!text-white"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
  return (
    <Modal close={close}>
      <form onSubmit={change} className="p-5">
        <h2 className="text-lg font-bold">Parolni o‘zgartirish</h2>
        <div className="mt-5 space-y-3">
          {passwordInput(
            currentPassword,
            setCurrentPassword,
            showCurrent,
            setShowCurrent,
            "Joriy parol",
            "current-password",
          )}
          {passwordInput(
            newPassword,
            setNewPassword,
            showNew,
            setShowNew,
            "Yangi parol",
            "new-password",
            4,
          )}
          {passwordInput(
            confirmPassword,
            setConfirmPassword,
            showConfirm,
            setShowConfirm,
            "Yangi parolni tasdiqlang",
            "new-password",
            4,
          )}
        </div>
        {err && <p className="mt-3 text-sm text-red-500">{err}</p>}
        <button
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-[#0f3f8c] !bg-[#ff8a1f] !text-white py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </form>
    </Modal>
  );
}
export {
  Av,
  Logo,
  FollowBtn,
  Modal,
  EmojiPicker,
  Auth,
  PostActions,
  CommentBox,
  PostCard,
  PostModal,
  Create,
  CreateChooser,
  StoryViewer,
  ShareModal,
  ReelsCard,
  CreateStory,
  CreateReel,
  HomeReelCard,
  Grid,
  EditProfile,
  ChangePassword,
};
