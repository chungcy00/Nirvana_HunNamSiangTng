import type { ReactNode } from "react";
import { PublicCatalogContext } from "../src/catalog/publicContext";
import { prototypeProducts } from "../src/prototype/products";
import { nirvanaQuestionnaireProducts } from "../src/data/questionnaireCatalog";
import { questionnaireProducts } from "../src/data/questionnaire";
export const fixtureQuestionnaireProducts = [
  ...nirvanaQuestionnaireProducts(prototypeProducts),
  ...questionnaireProducts,
  {
    id: "yunnan",
    name: "云南善堂殡仪配套",
    category: "殡仪服务" as const,
    provider: "云南善堂" as const,
    religions: ["佛教", "基督教"],
    description: "云南善堂殡仪配套",
    variants: [{ label: "单一配套参考价", price: 8800 }],
    includes: "具体服务清单请咨询顾问，现有资料未提供逐项内容。",
    restriction:
      "佛教、基督教均适用，仪式按需求调整；不受火化或土葬方式限制，不据此推定含火化、墓地、骨灰位等安葬费用。",
    source: "isolated legacy reference fixture",
  },
];
export function PublicFixture({ children }: { children: ReactNode }) {
  return (
    <PublicCatalogContext.Provider
      value={{ products: prototypeProducts, status: "ready", retry: () => {} }}
    >
      {children}
    </PublicCatalogContext.Provider>
  );
}
