export const STORAGE_KEY = "adhd_todo_goals_v1";
export const CATEGORY_STORAGE_KEY = "adhd_todo_categories_v1";

export const DEFAULT_CATEGORY_ID = "cat_default";

export const DEFAULT_CATEGORIES = [
  {
    id: DEFAULT_CATEGORY_ID,
    name: "기본",
    color: "#94a3b8",
    emoji: "📂",
    order: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "cat_productivity",
    name: "생산성",
    color: "#8BCB6A",
    emoji: "🌱",
    order: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "cat_work",
    name: "일",
    color: "#A78BFA",
    emoji: "💼",
    order: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "cat_health",
    name: "건강",
    color: "#7FCB77",
    emoji: "💚",
    order: 3,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "cat_hobby",
    name: "취미",
    color: "#FFD166",
    emoji: "⭐",
    order: 4,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export function normalizeCategories(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_CATEGORIES;

  const normalized = raw
    .map((cat, index) => ({
      id: String(cat?.id || crypto.randomUUID()),
      name: typeof cat?.name === "string" ? cat.name.trim() : "",
      color: typeof cat?.color === "string" ? cat.color : "#94a3b8",
      emoji: typeof cat?.emoji === "string" ? cat.emoji : "",
      order: typeof cat?.order === "number" ? cat.order : index,
      createdAt: cat?.createdAt || Date.now(),
      updatedAt: cat?.updatedAt || Date.now(),
    }))
    .filter((cat) => cat.id && cat.name);

  const hasDefault = normalized.some((cat) => cat.id === DEFAULT_CATEGORY_ID);
  if (hasDefault) return normalized;

  return [
    DEFAULT_CATEGORIES[0],
    ...normalized.map((cat, index) => ({
      ...cat,
      order: index + 1,
    })),
  ];
}

function normalizeSubtasks(rawSubtasks) {
  if (!Array.isArray(rawSubtasks)) return [];

  return rawSubtasks
    .map((s, index) => ({
      id: String(s?.id || crypto.randomUUID()),
      title:
        typeof s?.title === "string"
          ? s.title
          : typeof s?.text === "string"
            ? s.text
            : "",
      done: !!s?.done,
      order: typeof s?.order === "number" ? s.order : index,
      createdAt: s?.createdAt || Date.now(),
      updatedAt: s?.updatedAt || Date.now(),
    }))
    .filter((s) => s.id && s.title.trim());
}

function normalizeTasks(rawTasks) {
  if (!Array.isArray(rawTasks)) return [];

  return rawTasks
    .map((t, index) => ({
      id: String(t?.id || crypto.randomUUID()),
      title:
        typeof t?.title === "string"
          ? t.title
          : typeof t?.text === "string"
            ? t.text
            : "",
      done: !!t?.done,
      order: typeof t?.order === "number" ? t.order : index,
      createdAt: t?.createdAt || Date.now(),
      updatedAt: t?.updatedAt || Date.now(),
      subtasks: normalizeSubtasks(t?.subtasks),
    }))
    .filter((t) => t.id && t.title.trim());
}

export function normalizeGoals(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((g) => {
      const legacySubtasks = Array.isArray(g?.subtasks) ? g.subtasks : [];
      const rawTasks = Array.isArray(g?.tasks) ? g.tasks : legacySubtasks;

      return {
        id: String(g?.id || crypto.randomUUID()),
        title: typeof g?.title === "string" ? g.title : "",
        description: typeof g?.description === "string" ? g.description : "",
        categoryId:
          typeof g?.categoryId === "string" ? g.categoryId : DEFAULT_CATEGORY_ID,
        createdAt: g?.createdAt || Date.now(),
        updatedAt: g?.updatedAt || Date.now(),
        tasks: normalizeTasks(rawTasks),
      };
    })
    .filter((g) => g.id && g.title.trim());
}