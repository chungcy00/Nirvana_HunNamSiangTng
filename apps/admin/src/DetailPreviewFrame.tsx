import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ProductDetailContent,
  type ImageRenderer,
} from '../../../src/prototype/ProductPresentation';
import { ProductNavigationContext } from '../../../src/prototype/navigation';
import type { PrototypeProduct } from '../../../src/prototype/model';
import websiteCss from '../../../src/index.css?inline';
import catalogCss from '../../../src/pages/NirvanaProducts.css?inline';
import funeralDetailCss from '../../../src/pages/NirvanaFuneralDetail.css?inline';
import generalDetailCss from '../../../src/pages/NirvanaGeneralDetail.css?inline';
import prototypeCss from '../../../src/prototype/prototype.css?inline';

const documentSource = (general: boolean) => `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${websiteCss}\n${prototypeCss}\n${catalogCss}\n${general ? generalDetailCss : funeralDetailCss}</style></head><body><div id="preview-root"></div></body></html>`;
export function DetailPreviewFrame({
  product,
  imageRenderer,
  mobile = false,
}: {
  product: PrototypeProduct;
  imageRenderer?: ImageRenderer;
  mobile?: boolean;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  return (
    <>
      <iframe
        title="正式前台详情样式预览"
        className={`detail-preview-frame${mobile ? ' is-mobile' : ''}`}
        srcDoc={documentSource(product.category !== 4)}
        onLoad={(event) =>
          setTarget(event.currentTarget.contentDocument?.getElementById('preview-root') || null)
        }
      />
      {target &&
        createPortal(
          <ProductNavigationContext.Provider
            value={{
              website: true,
              homePath: product.institution === 'yunnan' ? '/yunnan-siantang' : '/nirvana',
              listPath: () => '/nirvana',
              detailPath: () => '',
            }}
          >
            <div className="fgp fgp-website">
              <div className="fgp-wrap fgp-detail">
                <ProductDetailContent embedded product={product} imageRenderer={imageRenderer} />
              </div>
            </div>
          </ProductNavigationContext.Provider>,
          target,
        )}
    </>
  );
}
