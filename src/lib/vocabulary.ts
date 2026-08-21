export function normalizeVocabulary(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export function newVocabularyAllowance(dueCount: number, preferred = 5) {
  if (dueCount >= 20) return 0;
  if (dueCount >= 10) return Math.min(3, preferred);
  return Math.min(5, Math.max(3, preferred));
}

export type QueueCandidate = { id: string; dueAt: Date | null; isNew: boolean };
export function buildVocabularyQueue(candidates: QueueCandidate[], preferredNew = 5) {
  const now = Date.now();
  const due = candidates.filter((item) => !item.isNew && item.dueAt && item.dueAt.getTime() <= now).sort((a,b)=>a.dueAt!.getTime()-b.dueAt!.getTime());
  const allowance = newVocabularyAllowance(due.length, preferredNew);
  return [...due, ...candidates.filter((item) => item.isNew).slice(0, allowance)];
}
