import type { Bundle, Row } from './types';

export type LocalDraft = {
  version: 1;
  original: Bundle;
  bundle: Bundle;
  staged: Row[];
  savedAt: string;
};
export const draftKey = (userId: string, productId: string) =>
  `nirvana-admin:draft:v1:${encodeURIComponent(userId)}:${encodeURIComponent(productId)}`;
export function readDraft(storage: Pick<Storage, 'getItem'>, key: string): LocalDraft | null {
  const value = storage.getItem(key);
  if (!value) return null;
  const draft = JSON.parse(value);
  if (
    draft.version !== 1 ||
    !draft.original?.product ||
    !draft.bundle?.product ||
    !Array.isArray(draft.staged)
  )
    throw new Error('本机暂存资料暂时无法读取，请保留备份并联系管理员。');
  return draft;
}
export function writeDraft(
  storage: Pick<Storage, 'setItem'>,
  key: string,
  original: Bundle,
  bundle: Bundle,
  staged: Row[],
) {
  const savedAt = new Date().toISOString();
  storage.setItem(
    key,
    JSON.stringify({ version: 1, original, bundle, staged, savedAt } satisfies LocalDraft),
  );
  return savedAt;
}
