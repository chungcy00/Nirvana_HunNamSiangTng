import type { ReactNode } from "react";
import { Placeholder } from "./Placeholder";

export function PageHero({
  eyebrow,
  title,
  text,
  children,
  imageLabel,
}: {
  eyebrow: string;
  title: string;
  text: string;
  children?: ReactNode;
  imageLabel?: string;
}) {
  return (
    <section className={`page-hero ${imageLabel ? "with-media" : ""}`}>
      <div className="container page-hero-inner">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="hero-description">{text}</p>
          {children}
        </div>
        {imageLabel && <Placeholder label={imageLabel} />}
      </div>
    </section>
  );
}
