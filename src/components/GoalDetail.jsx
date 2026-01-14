import { useMemo } from "react";
import ProgressHeader from "./ProgressHeader";
import SubtaskList from "./SubtaskList";

function calcProgress(goal) {
  const total = goal.subtasks.length;
  if (total === 0) return 0;
  const done = goal.subtasks.filter((s) => s.done).length;
  return Math.round((done / total) * 100);
}

export default function GoalDetail({ goal, onBack, onUpdateGoal, onDeleteGoal }) {
  const progress = useMemo(() => calcProgress(goal), [goal]);

  return (
    <div className="screen">
      <header className="topBar">
        <button className="linkBtn" onClick={onBack}>
          ← Back
        </button>
        <button className="linkBtn danger" onClick={() => onDeleteGoal(goal.id)}>
          Delete Goal
        </button>
      </header>

      <ProgressHeader title={goal.title} progress={progress} />

      <SubtaskList goal={goal} onUpdateGoal={onUpdateGoal} />
    </div>
  );
}
