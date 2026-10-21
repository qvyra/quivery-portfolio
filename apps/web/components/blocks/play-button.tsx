import { Play } from "lucide-react";

/** Decorative round play badge on video and embed posters */
export function PlayBadge() {
  return (
    <span
      aria-hidden="true"
      className="bg-brand-gradient grid size-16 place-items-center rounded-full shadow-[0_10px_30px_-8px_rgb(194_0_90/0.7)] ring-1 ring-white/20 transition-transform duration-(--motion-base) ease-out-quart group-hover:scale-105 group-active:scale-95 motion-reduce:transition-none sm:size-20"
    >
      <Play className="ml-1 size-7 fill-white text-white sm:size-8" />
    </span>
  );
}
