import { useEffect, useMemo, useRef } from "react";
import { ChevronDown, ChevronUp, Play } from "lucide-react";
import { useC } from "../context/AppContext";
import { ReelsCard } from "../components/Shared";

function ReelsPage() {
  const { db, reelId } = useC();
  const box = useRef(null);
  const reelOrderKey = db.reels.map((reel) => reel.id).join(",");
  const blockedKey = [...db.blockedUsers, ...db.blockedByUsers].sort().join(",");
  const orderedReelIds = useMemo(() => {
    const blockedIds = new Set([...db.blockedUsers, ...db.blockedByUsers]);
    const shuffled = db.reels.filter((reel) => !blockedIds.has(reel.userId));
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selectedIndex = shuffled.findIndex((reel) => reel.id === reelId);
    if (selectedIndex > 0) {
      const [selected] = shuffled.splice(selectedIndex, 1);
      shuffled.unshift(selected);
    }
    return shuffled.map((reel) => reel.id);
  }, [reelOrderKey, blockedKey, reelId]);
  const reelsById = new Map(db.reels.map((reel) => [reel.id, reel]));
  const orderedReels = orderedReelIds
    .map((id) => reelsById.get(id))
    .filter(Boolean);
  const go = (d) =>
    box.current?.scrollBy({
      top: d * box.current.clientHeight,
      behavior: "smooth",
    });
  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target?.tagName)) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div
      ref={box}
      className="reels-page h-[calc(100dvh-56px)] snap-y snap-mandatory overflow-y-auto overscroll-y-contain no-scrollbar md:h-screen"
    >
      {orderedReels.length ? (
        orderedReels.map((r) => <ReelsCard key={r.id} r={r} />)
      ) : (
        <div className="grid h-full place-items-center text-center text-current">
          <div>
            <Play size={64} className="mx-auto mb-3" />
            <h2 className="text-xl font-bold">Hali Reels yo‘q</h2>
            <p className="mt-1 text-sm text-neutral-500 !text-[#d4e6ff]">
              Birinchi Reels videosini qo‘shing.
            </p>
          </div>
        </div>
      )}
      {orderedReels.length > 1 && (
        <div className="fixed right-4 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-3 md:flex">
          <button
            onClick={() => go(-1)}
            aria-label="Oldingi Reels"
            className="grid h-10 w-10 place-items-center rounded-full bg-neutral-200 text-white hover:bg-neutral-300 !bg-[#4f92ec] !text-white hover:!bg-[#6aa5f0]"
          >
            <ChevronUp size={22} />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Keyingi Reels"
            className="grid h-10 w-10 place-items-center rounded-full bg-neutral-200 text-white hover:bg-neutral-300 !bg-[#4f92ec] !text-white hover:!bg-[#6aa5f0]"
          >
            <ChevronDown size={22} />
          </button>
        </div>
      )}
    </div>
  );
}

export default ReelsPage;
