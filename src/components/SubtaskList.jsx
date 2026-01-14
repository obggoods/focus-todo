import { useEffect, useMemo, useState } from "react";
import { uid } from "../utils/id";
import SubtaskItem from "./SubtaskItem";
import UndoToast from "./UndoToast";

function calcProgress(goal) {
  const total = goal.subtasks.length;
  if (total === 0) return 0;
  const done = goal.subtasks.filter((s) => s.done).length;
  return Math.round((done / total) * 100);
}

export default function SubtaskList({ goal, onUpdateGoal }) {
  const [text, setText] = useState("");

  // undo = { prevSubtasks, timerId, message }
  const [undo, setUndo] = useState(null);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (undo?.timerId) clearTimeout(undo.timerId);
    };
    // 의도적으로 최초 마운트/언마운트에만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = useMemo(() => calcProgress(goal), [goal]);

  const addSubtask = () => {
    const t = text.trim();
    if (!t) return;

    const next = {
      ...goal,
      subtasks: [
        ...goal.subtasks,
        {
          id: uid(),
          text: t,
          done: false,
        },
      ],
    };

    onUpdateGoal(next);
    setText("");
  };

  const toggleSubtask = (id) => {
    const next = {
      ...goal,
      subtasks: goal.subtasks.map((s) =>
        s.id === id ? { ...s, done: !s.done } : s
      ),
    };
    onUpdateGoal(next);
  };

  // 삭제 + 3초 Undo (스냅샷 복원 방식: 가장 안정적)
  const deleteSubtaskWithUndo = (id) => {
    // 기존 undo가 떠 있으면 확정 처리(타이머 제거)
    if (undo?.timerId) clearTimeout(undo.timerId);

    const prevSubtasks = goal.subtasks;
    const idx = prevSubtasks.findIndex((s) => s.id === id);
    if (idx === -1) return;

    const removed = prevSubtasks[idx];

    // 1) 즉시 삭제
    const nextSubtasks = prevSubtasks.filter((s) => s.id !== id);
    onUpdateGoal({ ...goal, subtasks: nextSubtasks });

    // 2) 3초 Undo 토스트
    const timerId = setTimeout(() => {
      setUndo(null);
    }, 3000);

    setUndo({
      prevSubtasks,
      timerId,
      message: `삭제됨: ${removed?.text ?? ""}`,
    });
  };

  const undoDelete = () => {
    if (!undo) return;
    if (undo.timerId) clearTimeout(undo.timerId);

    // 삭제 전 상태로 통째로 복원
    onUpdateGoal({ ...goal, subtasks: undo.prevSubtasks });
    setUndo(null);
  };

  const dismissUndo = () => {
    if (undo?.timerId) clearTimeout(undo.timerId);
    setUndo(null);
  };

  // 미완료 위 / 완료 아래 + 같은 상태면 원래 순서 유지(안정감)
  const ordered = useMemo(() => {
    const indexMap = new Map(goal.subtasks.map((s, i) => [s.id, i]));

    return [...goal.subtasks].sort((a, b) => {
      const doneDiff = Number(a.done) - Number(b.done);
      if (doneDiff !== 0) return doneDiff;
      return (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0);
    });
  }, [goal.subtasks]);

  return (
    <div className="subtasks">
      <div className="stickyInput">
        <div className="row">
          <input
            className="input"
            value={text}
            placeholder="하위 작업 추가"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addSubtask();
            }}
          />
          <button className="btn" onClick={addSubtask} disabled={!text.trim()}>
            Add
          </button>
        </div>

        <div className="miniMeta">
          <span className="miniLabel">Progress</span>
          <span className="miniValue">{progress}%</span>
        </div>
      </div>

      {ordered.length === 0 ? (
        <div className="empty compact">
          <div className="emptyTitle">
            하위 작업을 1개만 추가해도 시작이 쉬워집니다
          </div>
          <div className="emptyText">
            예: “창문 닦기”, “청소기”, “쓰레기 버리기”
          </div>
        </div>
      ) : (
        <div className="taskList">
          {ordered.map((s) => (
            <SubtaskItem
              key={s.id}
              subtask={s}
              onToggle={() => toggleSubtask(s.id)}
              onDelete={() => deleteSubtaskWithUndo(s.id)}
            />
          ))}
        </div>
      )}

      {undo && (
        <UndoToast
          message={undo.message || "삭제됨"}
          onUndo={undoDelete}
          onDismiss={dismissUndo}
        />
      )}
    </div>
  );
}
