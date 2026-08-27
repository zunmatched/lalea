export function normalizeVocabulary(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export type QueueCandidate = { id: string; dueAt: Date | null; isNew: boolean };
export function buildVocabularyQueue(candidates: QueueCandidate[]) {
  const now = Date.now();
  const due = candidates.filter((item) => !item.isNew && item.dueAt && item.dueAt.getTime() <= now).sort((a,b)=>a.dueAt!.getTime()-b.dueAt!.getTime());
  return [...due, ...candidates.filter((item) => item.isNew)];
}
