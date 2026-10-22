import type { ReactNode } from "react";
import { PublicCatalogContext } from "../src/catalog/publicContext";
import { prototypeProducts } from "../src/prototype/products";
import { nirvanaQuestionnaireProducts } from "../src/data/questionnaireCatalog";
import { questionnaireProducts } from "../src/data/questionnaire";
export const fixtureQuestionnaireProducts = [
  ...nirvanaQuestionnaireProducts(prototypeProducts),
  ...questionnaireProducts,
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
