import { useEffect } from "react";

const shapes = ["petal", "leaf", "spark"];

export default function PetalTrail() {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let last = 0;
    let index = 0;

    const handleMove = (event) => {
      const now = performance.now();
      if (now - last < 95) return;
      last = now;

      const trail = document.createElement("span");
      const shape = shapes[index % shapes.length];
      index += 1;

      trail.className = `garden-trail garden-trail-${shape}`;
      trail.style.left = `${event.clientX}px`;
      trail.style.top = `${event.clientY}px`;
      trail.style.setProperty("--trail-rotate", `${Math.random() * 170 - 85}deg`);
      trail.style.setProperty("--trail-x", `${Math.random() * 30 - 15}px`);

      document.body.appendChild(trail);

      window.setTimeout(() => trail.remove(), 950);
    };

    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  return null;
}
