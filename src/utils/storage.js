export const STORAGE_KEY = "adhd_todo_goals_v1";

export function normalizeGoals(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((g) => ({
      id: String(g?.id || ""),
      title: typeof g?.title === "string" ? g.title : "",
      subtasks: Array.isArray(g?.subtasks)
        ? g.subtasks.map((s) => ({
            id: String(s?.id || ""),
            text: typeof s?.text === "string" ? s.text : "",
            done: !!s?.done,
          }))
        : [],
    }))
    .filter((g) => g.id && g.title.trim());
}
