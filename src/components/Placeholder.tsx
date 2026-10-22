import { Image, UserRound } from "lucide-react";

export function Placeholder({
  label = "图片预留",
  portrait = false,
  className = "",
}: {
  label?: string;
  portrait?: boolean;
  className?: string;
}) {
  const Icon = portrait ? UserRound : Image;
  return (
    <div
      className={`placeholder ${portrait ? "portrait" : ""} ${className}`}
      role="img"
      aria-label={label}
    >
      <span className="placeholder-corner">
        {portrait ? "PORTRAIT" : "IMAGE SPACE"}
      </span>
      <div className="placeholder-center">
        <Icon size={portrait ? 42 : 30} strokeWidth={1} aria-hidden="true" />
        <span>{label}</span>
      </div>
      <span className="placeholder-line" aria-hidden="true" />
    </div>
  );
}
