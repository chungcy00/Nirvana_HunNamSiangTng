import React from 'react';
import { serviceVenues } from '../../../shared/serviceVenues';

export function ServiceVenueField({ value, onChange }: {
  value: string | null | undefined;
  onChange: (value: string) => void;
}) {
  const legacy = !!value && !serviceVenues.some(venue => venue === value);
  return (
    <label className="field">
      <span>服务地点</span>
      <select aria-label="服务地点" value={value ?? ''} onChange={event => {
        const selected = event.target.value;
        if (serviceVenues.some(venue => venue === selected)) onChange(selected);
      }}>
        <option value="" disabled>请选择服务地点</option>
        {legacy && <option value={value} disabled>{value}（旧资料，暂保留）</option>}
        {serviceVenues.map(venue => <option key={venue} value={venue}>{venue}</option>)}
      </select>
      {legacy && <small>原服务地点已保留；请核实后再选择新选项，系统不会自动覆盖。</small>}
    </label>
  );
}
