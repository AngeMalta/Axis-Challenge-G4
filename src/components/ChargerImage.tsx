import { useState, type ImgHTMLAttributes } from "react";
import { fallbackChargerImage } from "@/constants/chargerImages";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  src?: string | null;
  /** Usually the charger id, so a charger always falls back to the same picture. */
  seed?: string | undefined;
};

/** Charger photo that shows a built-in image when the URL is empty or fails to load. */
export function ChargerImage({ src, seed, alt = "", ...props }: Props) {
  const fallback = fallbackChargerImage(seed);
  const [failed, setFailed] = useState<string | null>(null);
  const current = src && src.trim() && src !== failed ? src : fallback;

  return (
    <img
      {...props}
      src={current}
      alt={alt}
      onError={() => {
        if (current !== fallback) setFailed(current);
      }}
    />
  );
}
