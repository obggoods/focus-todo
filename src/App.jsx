import { useMemo, useState } from "react";
import Layout from "./components/Layout";
import GoalList from "./components/GoalList";
import GoalDetail from "./components/GoalDetail";
import { useLocalStorage } from "./hooks/useLocalStorage";
import {
  CATEGORY_STORAGE_KEY,
  STORAGE_KEY,
  normalizeCategories,
  normalizeGoals,
} from "./utils/storage";
import "./App.css";

export default function App() {
  const [goals, setGoals] = useLocalStorage(STORAGE_KEY, [], normalizeGoals);
  const [categories, setCategories] = useLocalStorage(
    CATEGORY_STORAGE_KEY,
    [],
    normalizeCategories
  );
  const [activeGoalId, setActiveGoalId] = useState(null);

  const activeGoal = useMemo(() => {
    if (!activeGoalId) return null;
    return goals.find((g) => g.id === activeGoalId) || null;
  }, [goals, activeGoalId]);

  const openGoal = (id) => setActiveGoalId(id);
  const backToList = () => setActiveGoalId(null);

  const updateGoal = (nextGoal) => {
    setGoals((prev) => prev.map((g) => (g.id === nextGoal.id ? nextGoal : g)));
  };

  const deleteGoal = (id) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setActiveGoalId((cur) => (cur === id ? null : cur));
  };

  return (
    <Layout>
      {!activeGoal ? (
        <GoalList
          goals={goals}
          setGoals={setGoals}
          categories={categories}
          setCategories={setCategories}
          onOpenGoal={openGoal}
        />
      ) : (
        <GoalDetail
          goal={activeGoal}
          categories={categories}
          onBack={backToList}
          onUpdateGoal={updateGoal}
          onDeleteGoal={deleteGoal}
        />
      )}
    </Layout>
  );

}
