import { supabase } from "./supabase";
import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_ID } from "../utils/storage";

const DEFAULT_DB_CATEGORIES = DEFAULT_CATEGORIES.filter(
  (category) => category.id !== DEFAULT_CATEGORY_ID
).map((category, index) => ({
  name: category.name,
  color: category.color,
  emoji: category.emoji,
  order_index: index + 1,
}));

function toMillis(value) {
  if (!value) return Date.now();
  if (typeof value === "number") return value;

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function toTimestamp(value) {
  if (!value) return new Date().toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  return value;
}

function dbCategoryId(categoryId) {
  return categoryId && categoryId !== DEFAULT_CATEGORY_ID ? categoryId : null;
}

function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color || "#94a3b8",
    emoji: row.emoji || "",
    order: row.order_index ?? 0,
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
  };
}

function mapSubtask(row) {
  return {
    id: row.id,
    title: row.title,
    done: !!row.done,
    order: row.order_index ?? 0,
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
  };
}

function mapTask(row, subtasks = []) {
  return {
    id: row.id,
    title: row.title,
    done: !!row.done,
    order: row.order_index ?? 0,
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
    subtasks: subtasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  };
}

function mapGoal(row, tasks = []) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    categoryId: row.category_id || DEFAULT_CATEGORY_ID,
    order: row.order_index ?? 0,
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
    tasks: tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  };
}

async function seedInitialCategories(userId) {
  if (!DEFAULT_DB_CATEGORIES.length) return [];

  const { data, error } = await supabase
    .from("categories")
    .insert(
      DEFAULT_DB_CATEGORIES.map((category) => ({
        ...category,
        user_id: userId,
      }))
    )
    .select("id, name, color, emoji, order_index, created_at, updated_at")
    .order("order_index", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchTodoData(userId) {
  if (!supabase || !userId) {
    return {
      categories: [DEFAULT_CATEGORIES[0]],
      goals: [],
    };
  }

  const { data: categoryRows, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, color, emoji, order_index, created_at, updated_at")
    .eq("user_id", userId)
    .order("order_index", { ascending: true });

  if (categoryError) throw categoryError;

  const effectiveCategoryRows =
    categoryRows && categoryRows.length > 0
      ? categoryRows
      : await seedInitialCategories(userId);

  const [goalsResult, tasksResult, subtasksResult] = await Promise.all([
    supabase
      .from("goals")
      .select("id, category_id, title, description, order_index, created_at, updated_at")
      .eq("user_id", userId)
      .order("order_index", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, goal_id, title, done, order_index, created_at, updated_at")
      .eq("user_id", userId)
      .order("order_index", { ascending: true }),
    supabase
      .from("subtasks")
      .select("id, task_id, title, done, order_index, created_at, updated_at")
      .eq("user_id", userId)
      .order("order_index", { ascending: true }),
  ]);

  if (goalsResult.error) throw goalsResult.error;
  if (tasksResult.error) throw tasksResult.error;
  if (subtasksResult.error) throw subtasksResult.error;

  const subtasksByTaskId = new Map();
  (subtasksResult.data || []).forEach((row) => {
    const list = subtasksByTaskId.get(row.task_id) || [];
    list.push(mapSubtask(row));
    subtasksByTaskId.set(row.task_id, list);
  });

  const tasksByGoalId = new Map();
  (tasksResult.data || []).forEach((row) => {
    const list = tasksByGoalId.get(row.goal_id) || [];
    list.push(mapTask(row, subtasksByTaskId.get(row.id) || []));
    tasksByGoalId.set(row.goal_id, list);
  });

  const categories = [
    DEFAULT_CATEGORIES[0],
    ...(effectiveCategoryRows || []).map(mapCategory),
  ];

  const goals = (goalsResult.data || []).map((row) =>
    mapGoal(row, tasksByGoalId.get(row.id) || [])
  );

  return { categories, goals };
}

export async function syncCategoryListChanges(userId, previousCategories, nextCategories) {
  if (!supabase || !userId) return;

  const previous = (previousCategories || []).filter(
    (category) => category.id !== DEFAULT_CATEGORY_ID
  );
  const next = (nextCategories || []).filter(
    (category) => category.id !== DEFAULT_CATEGORY_ID
  );

  const previousMap = new Map(previous.map((category) => [category.id, category]));
  const nextMap = new Map(next.map((category) => [category.id, category]));

  const deletedIds = previous
    .filter((category) => !nextMap.has(category.id))
    .map((category) => category.id);

  for (const id of deletedIds) {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) throw error;
  }

  const inserted = next.filter((category) => !previousMap.has(category.id));
  if (inserted.length) {
    const { error } = await supabase.from("categories").insert(
      inserted.map((category, index) => ({
        id: category.id,
        user_id: userId,
        name: category.name,
        color: category.color || null,
        emoji: category.emoji || null,
        order_index: category.order ?? index + 1,
        created_at: toTimestamp(category.createdAt),
        updated_at: toTimestamp(category.updatedAt),
      }))
    );

    if (error) throw error;
  }

  const maybeUpdated = next.filter((category) => previousMap.has(category.id));
  for (const category of maybeUpdated) {
    const previousCategory = previousMap.get(category.id);
    const changed =
      previousCategory.name !== category.name ||
      previousCategory.color !== category.color ||
      previousCategory.emoji !== category.emoji ||
      previousCategory.order !== category.order;

    if (!changed) continue;

    const { error } = await supabase
      .from("categories")
      .update({
        name: category.name,
        color: category.color || null,
        emoji: category.emoji || null,
        order_index: category.order ?? 0,
        updated_at: toTimestamp(category.updatedAt || Date.now()),
      })
      .eq("user_id", userId)
      .eq("id", category.id);

    if (error) throw error;
  }
}

async function syncSubtaskListChanges(userId, taskId, previousSubtasks = [], nextSubtasks = []) {
  const previousMap = new Map(previousSubtasks.map((subtask) => [subtask.id, subtask]));
  const nextMap = new Map(nextSubtasks.map((subtask) => [subtask.id, subtask]));

  const deletedIds = previousSubtasks
    .filter((subtask) => !nextMap.has(subtask.id))
    .map((subtask) => subtask.id);

  for (const id of deletedIds) {
    const { error } = await supabase
      .from("subtasks")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) throw error;
  }

  const inserted = nextSubtasks.filter((subtask) => !previousMap.has(subtask.id));
  if (inserted.length) {
    const { error } = await supabase.from("subtasks").insert(
      inserted.map((subtask, index) => ({
        id: subtask.id,
        user_id: userId,
        task_id: taskId,
        title: subtask.title,
        done: !!subtask.done,
        order_index: subtask.order ?? index,
        created_at: toTimestamp(subtask.createdAt),
        updated_at: toTimestamp(subtask.updatedAt),
      }))
    );

    if (error) throw error;
  }

  const maybeUpdated = nextSubtasks.filter((subtask) => previousMap.has(subtask.id));
  for (const subtask of maybeUpdated) {
    const previousSubtask = previousMap.get(subtask.id);
    const changed =
      previousSubtask.title !== subtask.title ||
      previousSubtask.done !== subtask.done ||
      previousSubtask.order !== subtask.order;

    if (!changed) continue;

    const { error } = await supabase
      .from("subtasks")
      .update({
        title: subtask.title,
        done: !!subtask.done,
        order_index: subtask.order ?? 0,
        updated_at: toTimestamp(subtask.updatedAt || Date.now()),
      })
      .eq("user_id", userId)
      .eq("id", subtask.id);

    if (error) throw error;
  }
}

async function syncTaskListChanges(userId, goalId, previousTasks = [], nextTasks = []) {
  const previousMap = new Map(previousTasks.map((task) => [task.id, task]));
  const nextMap = new Map(nextTasks.map((task) => [task.id, task]));

  const deletedIds = previousTasks
    .filter((task) => !nextMap.has(task.id))
    .map((task) => task.id);

  for (const id of deletedIds) {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) throw error;
  }

  const inserted = nextTasks.filter((task) => !previousMap.has(task.id));
  if (inserted.length) {
    const { error } = await supabase.from("tasks").insert(
      inserted.map((task, index) => ({
        id: task.id,
        user_id: userId,
        goal_id: goalId,
        title: task.title,
        done: !!task.done,
        order_index: task.order ?? index,
        created_at: toTimestamp(task.createdAt),
        updated_at: toTimestamp(task.updatedAt),
      }))
    );

    if (error) throw error;
  }

  const maybeUpdated = nextTasks.filter((task) => previousMap.has(task.id));
  for (const task of maybeUpdated) {
    const previousTask = previousMap.get(task.id);
    const changed =
      previousTask.title !== task.title ||
      previousTask.done !== task.done ||
      previousTask.order !== task.order;

    if (changed) {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: task.title,
          done: !!task.done,
          order_index: task.order ?? 0,
          updated_at: toTimestamp(task.updatedAt || Date.now()),
        })
        .eq("user_id", userId)
        .eq("id", task.id);

      if (error) throw error;
    }

    await syncSubtaskListChanges(
      userId,
      task.id,
      previousTask?.subtasks || [],
      task.subtasks || []
    );
  }

  for (const task of inserted) {
    await syncSubtaskListChanges(userId, task.id, [], task.subtasks || []);
  }
}

export async function syncGoalListChanges(userId, previousGoals = [], nextGoals = []) {
  if (!supabase || !userId) return;

  const previousMap = new Map(previousGoals.map((goal) => [goal.id, goal]));
  const nextMap = new Map(nextGoals.map((goal) => [goal.id, goal]));

  const deletedIds = previousGoals
    .filter((goal) => !nextMap.has(goal.id))
    .map((goal) => goal.id);

  for (const id of deletedIds) {
    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) throw error;
  }

  const inserted = nextGoals.filter((goal) => !previousMap.has(goal.id));
  if (inserted.length) {
    const { error } = await supabase.from("goals").insert(
      inserted.map((goal, index) => ({
        id: goal.id,
        user_id: userId,
        category_id: dbCategoryId(goal.categoryId),
        title: goal.title,
        description: goal.description || "",
        order_index: goal.order ?? index,
        created_at: toTimestamp(goal.createdAt),
        updated_at: toTimestamp(goal.updatedAt),
      }))
    );

    if (error) throw error;
  }

  const maybeUpdated = nextGoals.filter((goal) => previousMap.has(goal.id));
  for (const goal of maybeUpdated) {
    const previousGoal = previousMap.get(goal.id);
    const changed =
      previousGoal.title !== goal.title ||
      previousGoal.description !== goal.description ||
      previousGoal.categoryId !== goal.categoryId ||
      previousGoal.order !== goal.order;

    if (changed) {
      const { error } = await supabase
        .from("goals")
        .update({
          category_id: dbCategoryId(goal.categoryId),
          title: goal.title,
          description: goal.description || "",
          order_index: goal.order ?? 0,
          updated_at: toTimestamp(goal.updatedAt || Date.now()),
        })
        .eq("user_id", userId)
        .eq("id", goal.id);

      if (error) throw error;
    }

    await syncTaskListChanges(
      userId,
      goal.id,
      previousGoal?.tasks || [],
      goal.tasks || []
    );
  }

  for (const goal of inserted) {
    await syncTaskListChanges(userId, goal.id, [], goal.tasks || []);
  }
}
