import { createContext } from "react";
import { detailPath, listPath } from "./model";
export const ProductNavigationContext = createContext({
  homePath: "/prototype",
  listPath,
  detailPath,
  website: false,
});
