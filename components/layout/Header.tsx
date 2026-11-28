import type { CSSProperties } from "react";
import MeshGradientBackground from "./MeshGradientBackground";
import Hero from "@/components/marketing/Hero";

/**
 * Direction C hero shell.
 *
 * The sticky navigation owns the page's fixed bar; this `<header>` is the
 * full-bleed hero below it. The mesh is decorative: three token-driven blobs
 * drift on the compositor (see `.mesh > *` in globals.css) and are clipped by
 * the `.hero` frame, so they can never paint over the catalog.
 */
const MESH_BLOBS: ReadonlyArray<CSSProperties> = [
  {
    backgroundImage:
      "radial-gradient(circle at 40% 40%, var(--mesh-mid), var(--mesh-deep) 70%)",
  },
  {
    backgroundImage:
      "radial-gradient(circle, var(--mesh-mid), var(--mesh-deep) 72%)",
  },
  {
    backgroundImage:
      "radial-gradient(circle, var(--mesh-lime), var(--mesh-mid) 65%)",
  },
];

export default function Header() {
  return (
    <header className="hero relative bg-background text-foreground">
      <MeshGradientBackground />

      <div
        className="mesh pointer-events-none absolute inset-[-15%] z-0 opacity-70 blur-[64px]"
        aria-hidden="true"
      >
        <span
          style={MESH_BLOBS[0]}
          className="absolute top-[-6%] left-[52%] h-[38vw] w-[46vw] rounded-full opacity-70 blur-[30px]"
        />
        <span
          style={MESH_BLOBS[1]}
          className="absolute top-[34%] left-[-8%] size-[30vw] rounded-full opacity-55"
        />
        <span
          style={MESH_BLOBS[2]}
          className="absolute right-[2%] bottom-[-14%] size-[24vw] rounded-full opacity-40"
        />
      </div>

      <div className="shell relative z-10">
        <Hero />
      </div>
    </header>
  );
}
