// Page atmosphere fixed behind all content: soft colour glows and the
// outlined QUIVERY wordmark

// radial gradients give the soft light of the original's four blurred 1000px
// divs without their paint cost
const glows = [
  "radial-gradient(50vmax 50vmax at 0% 12%, rgb(110 1 140 / 0.26), transparent 70%)",
  "radial-gradient(45vmax 40vmax at 100% -10%, rgb(175 46 46 / 0.2), transparent 70%)",
  "radial-gradient(40vmax 40vmax at 100% 100%, rgb(175 46 100 / 0.18), transparent 70%)",
].join(", ");

/**
 * Render once per page. Both layers are fixed and get their own compositor
 * layer (will-change), so scrolling never repaints them
 */
export function Backdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none [contain:strict]"
    >
      <div
        className="absolute inset-0 will-change-transform"
        style={{ backgroundImage: glows }}
      />
      {/* 1px outline at 6% opacity so it doesn't compete with the text */}
      <div className="absolute inset-0 flex items-center justify-center will-change-transform">
        <p
          className="text-[19.5vw] leading-none font-semibold tracking-tight whitespace-nowrap text-transparent"
          style={{ WebkitTextStroke: "1px rgb(255 214 236 / 0.06)" }}
        >
          QUIVERY
        </p>
      </div>
    </div>
  );
}
