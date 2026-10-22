import { useId } from "react";
import type { PlacementType } from "../types";

// Scoped editor field for the future authenticated product form. The host form
// owns load/save, optimistic locking, errors and publication; no new admin route.
export function NichePlacementField({ categoryId, value, onChange, publishing = false, disabled = false }: {
  categoryId: number;
  value: PlacementType | null;
  onChange: (value: PlacementType | null) => void;
  publishing?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  if (categoryId !== 3) return null;
  return <fieldset disabled={disabled} aria-describedby={`${id}-help`}>
    <legend>安放环境{publishing ? "（必填）" : ""}</legend>
    <p id={`${id}-help`}>每件骨灰位选择一项；草稿可暂不填写，发布前必须选择。</p>
    {([ ["indoor", "室内"], ["outdoor", "室外"] ] as const).map(([option, label]) =>
      <label key={option}>
        <input type="radio" name={id} value={option} checked={value === option}
          required={publishing} onChange={() => onChange(option)} />{label}
      </label>)}
    {!publishing && value !== null && <button type="button" onClick={() => onChange(null)}>清除选择</button>}
  </fieldset>;
}
