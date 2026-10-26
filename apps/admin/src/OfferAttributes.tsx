import { formatSqft } from '../../../shared/areaPriceGroups';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Field } from './components';
import {
  differentText,
  differentArea,
  hasOfferDifferences,
  resolvedOfferAttributes,
  offerOverrideValue,
} from '../../../shared/offerAttributes';
import type { Row } from './types';

export function OfferAttributes({
  offer,
  common,
  onChange,
}: {
  offer: Row;
  common: Record<string, any>;
  onChange: (field: string, value: unknown) => void;
}) {
  const [expanded, setExpanded] = useState(() => hasOfferDifferences(offer, common));
  const effective = resolvedOfferAttributes(offer, common);
  return (
    <details
      className="offer-specifications wide"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>
        <ChevronRight size={18} aria-hidden="true" />
        <span>方案规格</span>
        <span className="offer-spec-summary">
          {effective.facing || '朝向未填写'} ·{' '}
          {effective.area != null ? formatSqft(effective.area) : '面积未填写'}
        </span>
      </summary>
      <div className="offer-spec-body">
        <p className="help">
          已自动带入共通规格。修改后仅对此方案生效；清空或填回共通值后自动沿用，无需重复设置。
        </p>
        <div className="fields">
          <Field
            label="方案朝向"
            value={effective.facing}
            onChange={(value) =>
              onChange('facing_override', offerOverrideValue('facing_override', value, common))
            }
            hint={
              differentText(offer.facing_override, common.facing)
                ? '本方案单独设置'
                : '沿用共通朝向'
            }
          />
          <Field
            label="方案面积（sqft）"
            value={effective.area}
            type="number"
            onChange={(value) =>
              onChange(
                'area_sqft_override',
                offerOverrideValue('area_sqft_override', value, common),
              )
            }
            hint={
              effective.area == null
                ? '填写数值，单位 sqft；名称中的面积不会自动用于分组。'
                : differentArea(offer.area_sqft_override, common.area_sqft)
                  ? '本方案单独设置'
                  : '沿用共通面积'
            }
          />
        </div>
      </div>
    </details>
  );
}
