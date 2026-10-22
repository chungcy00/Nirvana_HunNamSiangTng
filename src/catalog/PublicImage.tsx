import { useEffect, useState } from "react";
import { usePublicCatalog } from "./publicContext";
import {
  imageEndpoint,
  publicHeaders,
  type PublicImage,
} from "./publicRepository";
export default function CatalogImage({ image }: { image: PublicImage }) {
  const { config } = usePublicCatalog();
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!config) return;
    const abort = new AbortController();
    let objectUrl = "";
    setUrl("");
    async function load() {
      try {
        const r = await fetch(imageEndpoint(config!, image), {
          headers: publicHeaders(config!),
          cache: "no-store",
          signal: abort.signal,
        });
        if (
          !r.ok ||
          !/^image\/(png|jpeg|webp)$/.test(r.headers.get("content-type") || "")
        )
          return;
        const blob = await r.blob();
        if (abort.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        /* Preserve the existing placeholder for unavailable images. */
      }
    }
    void load();
    return () => {
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [config, image.bucket, image.path]);
  return url ? (
    <img className="fgp-real-image" src={url} alt={image.alt || "产品图片"} />
  ) : null;
}
