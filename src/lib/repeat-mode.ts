export type RepeatMode = "once" | "single" | "loop" | "random";
export const repeatModeLabels: Record<RepeatMode, string> = { once: "不重複", single: "單一", loop: "循環", random: "隨機" };
export function shuffle<T>(items: T[]): T[] { return [...items].sort(() => Math.random() - 0.5) }
