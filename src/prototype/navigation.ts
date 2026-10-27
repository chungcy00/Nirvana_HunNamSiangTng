import { createContext } from "react";
import { detailPath, listPath } from "./model";
type Navigation = {homePath:string; listPath:(id:number)=>string; detailPath:(id:string)=>string; website:boolean; institution?: 'nirvana' | 'yunnan'};
export const ProductNavigationContext = createContext<Navigation>({
  homePath: "/prototype",
  listPath,
  detailPath,
  website: false,
});
