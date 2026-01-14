import { useMemo, useState } from "react";
import { uid } from "../utils/id";

function calcProgress(goal) {
  const total = goal.subtasks.length;
  if (total === 0) return 0;
  const done = goal.subtasks.filter((s) => s.done).length;
  return Math.round((done / total) * 100);
}

export default function GoalList({
  goals,
  setGoals,
  onOpenGoal,
  theme,
  onToggleTheme,
}) {
  const [title, setTitle] = useState("");

  const ordered = useMemo(() => {
    return [...goals].sort((a, b) => {
      const aPct = calcProgress(a);
      const bPct = calcProgress(b);

      const aDone = aPct === 100;
      const bDone = bPct === 100;

      // 완료 목표는 아래로
      if (aDone !== bDone) return aDone ? 1 : -1;

      // 둘 다 미완료면 진행률 높은 순
      if (!aDone && !bDone) return bPct - aPct;

      // 둘 다 완료면 기존 순서 유지(안정감)
      return 0;
    });
  }, [goals]);

  const addGoal = () => {
    const t = title.trim();
    if (!t) return;

    const next = { id: uid(), title: t, subtasks: [] };
    setGoals((prev) => [next, ...prev]);
    setTitle("");
  };

  const deleteGoal = (id) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <div className="screen">
      <header className="topBar">
        <div className="goalsHeaderRow">
          <div>
            <h1 className="h1">Focus Todo</h1>
            <p className="subtle">하나씩, 진행률을 눈으로 확인하면서.</p>
          </div>

          <button
            type="button"
            className={`iosSwitch ${theme === "light" ? "isOn" : ""}`}
            onClick={onToggleTheme}
            aria-label="Toggle theme"
          >
            <span className="iosKnob" />
          </button>
        </div>
      </header>

      <section className="panel">
        <div className="row">
          <input
            className="input"
            value={title}
            placeholder='새 목표 (예: "방 청소")'
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addGoal();
            }}
          />
          <button className="btn" onClick={addGoal} disabled={!title.trim()}>
            Add
          </button>
        </div>
      </section>

      <section className="list">
        {ordered.length === 0 ? (
          <div className="empty">
            <div className="emptyTitle">목표를 하나 추가하세요</div>
            <div className="emptyText">
              목표 1개 + 하위 작업 몇 개만 만들어도 집중이 쉬워집니다.
            </div>
          </div>
        ) : (
          ordered.map((g) => {
            const pct = calcProgress(g);
            const isCompleted = pct === 100;

            const total = g.subtasks.length;
            const done = g.subtasks.filter((s) => s.done).length;

            return (
              <div
                key={g.id}
                className={`card ${isCompleted ? "completed" : ""}`}
              >
                <div
                  className="cardMain"
                  onClick={() => onOpenGoal(g.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onOpenGoal(g.id);
                  }}
                >
                  <div className="cardTitle">{g.title}</div>

                  <div className="cardMeta">
                    <span className="pct">{pct}%</span>
                    <span className="dot">•</span>
                    <span className="metaText">
                      {done}/{total} done
                    </span>
                  </div>

                  <div className="barWrap" aria-hidden="true">
                    <div className="bar" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <button
                  className="iconBtn danger"
                  type="button"
                  aria-label="Delete goal"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteGoal(g.id);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
