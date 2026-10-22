import { createContext, useContext } from 'react';
import { emptyReferences, type References } from './types';
export const AdminContext = createContext<{
  refs: References;
  reload: () => Promise<void>;
  notify: (text: string) => void;
}>({ refs: emptyReferences, reload: async () => {}, notify: () => {} });
export const useAdmin = () => useContext(AdminContext);
