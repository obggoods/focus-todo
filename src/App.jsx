import { useEffect, useMemo, useState } from "react";
import Layout from "./components/Layout";
import GoalList from "./components/GoalList";
import GoalDetail from "./components/GoalDetail";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { STORAGE_KEY, normalizeGoals } from "./utils/storage";
import { getInitialTheme, applyTheme, persistTheme } from "./utils/theme";
import "./App.css";

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme());
  const [goals, setGoals] = useLocalStorage(STORAGE_KEY, [], normalizeGoals);
  const [activeGoalId, setActiveGoalId] = useState(null);

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };
  
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
        onOpenGoal={openGoal}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
      ) : (
        <GoalDetail
          goal={activeGoal}
          onBack={backToList}
          onUpdateGoal={updateGoal}
          onDeleteGoal={deleteGoal}
        />
      )}
    </Layout>
  );  

}
