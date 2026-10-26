import { useCallback } from "react";
import { usePublicCatalog } from "./publicContext";
import {
  imageEndpoint,
  publicHeaders,
  type PublicImage,
} from "./publicRepository";
import { fetchPreviewImage } from "../../shared/imageResource";
import { useVisibleImage } from "../../shared/useVisibleImage";
export default function CatalogImage({ image }: { image: PublicImage }) {
  const { config } = usePublicCatalog();
  const identity = config
    ? `${config.url}:${config.key}:${image.bucket}:${image.path}`
    : "";
  const load = useCallback(
    (width: number, signal: AbortSignal) => {
      if (!config) return Promise.reject(new Error("Image unavailable"));
      return fetchPreviewImage(
        image.bucket,
        image.path,
        width,
        publicHeaders(config),
        imageEndpoint(config, image),
        signal,
      );
    },
    [config?.url, config?.key, image.bucket, image.path],
  );
  const { target, url } = useVisibleImage(identity, load);
  return url ? (
    <img
      src={url}
      ref={(node) => {
        target.current = node;
      }}
      className="fgp-real-image"
      alt={image.alt || "产品图片"}
      decoding="async"
    />
  ) : (
    <span
      ref={(node) => {
        target.current = node;
      }}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    />
  );
}
