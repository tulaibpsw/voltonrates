import Image from "next/image";

// The real Volt On logo from voltonsolar.com: black text for Day, white text for Night.
// Both are rendered; CSS in globals.css hides the one that does not match the nearest [data-theme].
const LOGO = { width: 1302, height: 633 } as const;

export function BrandLogo({ height, className = "", priority }: { height: number | string; className?: string; priority?: boolean }) {
  const style = { height, width: "auto" };
  const w = 400;
  const h = Math.round((w * LOGO.height) / LOGO.width);
  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      <Image src="/brand/volton-logo-black.png" alt="Volt On Solar Energy Company" width={w} height={h} style={style} className="logo-day" priority={priority} />
      <Image src="/brand/volton-logo-white.png" alt="Volt On Solar Energy Company" width={w} height={h} style={style} className="logo-night" priority={priority} />
    </span>
  );
}
