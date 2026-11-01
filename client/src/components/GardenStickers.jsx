import { useEffect } from "react";

export default function GardenStickers() {
  useEffect(() => {
    const stickers = document.querySelectorAll("[data-garden-sticker]");

    stickers.forEach((sticker) => {
      const rotate = Number(sticker.dataset.rotate || 0);

      const handleEnter = () => {
        sticker.style.transform = `rotate(${rotate + 8}deg) scale(1.08)`;
      };

      const handleLeave = () => {
        sticker.style.transform = `rotate(${rotate}deg) scale(1)`;
      };

      sticker.addEventListener("mouseenter", handleEnter);
      sticker.addEventListener("mouseleave", handleLeave);

      sticker._gardenCleanup = () => {
        sticker.removeEventListener("mouseenter", handleEnter);
        sticker.removeEventListener("mouseleave", handleLeave);
      };
    });

    return () => {
      stickers.forEach((sticker) => sticker._gardenCleanup?.());
    };
  }, []);

  return null;
}
