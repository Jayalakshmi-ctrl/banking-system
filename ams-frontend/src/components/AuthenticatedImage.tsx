import { useEffect, useRef, useState } from "react";
import { getApiBase, getToken } from "../api/client";

interface Props {
  publicId: string;
  index: number;
  alt: string;
  /** Thumbnail in table vs large view in lightbox */
  size?: "thumb" | "spotlight";
  /** When set, thumbnail is wrapped in a button that calls this (e.g. open lightbox) */
  onRequestDetail?: () => void;
}

export function AuthenticatedImage({
  publicId,
  index,
  alt,
  size = "thumb",
  onRequestDetail,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    const path = `/complaints/${encodeURIComponent(publicId)}/attachments/${index}/file`;
    const token = getToken();
    let cancelled = false;

    void (async () => {
      try {
        const r = await fetch(`${getApiBase()}${path}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!r.ok || cancelled) {
          if (!cancelled) setFailed(true);
          return;
        }
        const blob = await r.blob();
        if (cancelled) return;
        const u = URL.createObjectURL(blob);
        if (blobRef.current) URL.revokeObjectURL(blobRef.current);
        blobRef.current = u;
        setSrc(u);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [publicId, index]);

  if (failed) {
    return (
      <span className="thumb-fallback" role="img" aria-label={alt}>
        —
      </span>
    );
  }
  if (!src) {
    return <span className="thumb-skeleton" aria-hidden />;
  }

  const isSpotlight = size === "spotlight";
  const img = (
    <img
      src={src}
      alt={alt}
      className={isSpotlight ? "spotlight-image" : "thumb"}
      {...(isSpotlight
        ? {}
        : { width: 80, height: 80, loading: "lazy" as const, decoding: "async" as const })}
    />
  );

  if (isSpotlight) {
    return img;
  }

  if (onRequestDetail) {
    return (
      <button
        type="button"
        className="thumb-trigger"
        onClick={onRequestDetail}
        aria-label={`View larger: ${alt}`}
      >
        {img}
      </button>
    );
  }

  return img;
}
