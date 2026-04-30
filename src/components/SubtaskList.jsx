import { useMemo, useState } from "react";
import { uid } from "../utils/id";
import SubtaskItem from "./SubtaskItem";

function calcTaskProgress(task) {
  if (!Array.isArray(task.subtasks) || task.subtasks.length === 0) {
    return task.done ? 100 : 0;
  }

  const done = task.subtasks.filter((s) => s.done).length;
  return Math.round((done / task.subtasks.length) * 100);
}

export default function SubtaskList({ goal, onUpdateGoal }) {
  const [taskText, setTaskText] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [subtaskText, setSubtaskText] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState("");

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return goal.tasks.find((task) => task.id === selectedTaskId) || null;
  }, [goal.tasks, selectedTaskId]);

  const addTask = () => {
    const t = taskText.trim();
    if (!t) return;

    const nextTask = {
      id: uid(),
      title: t,
      done: false,
      order: goal.tasks.length,
      createdAt: Date.now(),
      subtasks: [],
    };

    onUpdateGoal({
      ...goal,
      updatedAt: Date.now(),
      tasks: [...goal.tasks, nextTask],
    });

    setTaskText("");
  };

  const toggleTask = (id) => {
    const nextTasks = goal.tasks.map((task) => {
      if (task.id !== id) return task;

      return {
        ...task,
        done: !task.done,
        subtasks: task.subtasks.map((subtask) => ({
          ...subtask,
          done: !task.done,
        })),
      };
    });

    onUpdateGoal({ ...goal, updatedAt: Date.now(), tasks: nextTasks });
  };

  const deleteTask = (id) => {
    onUpdateGoal({
      ...goal,
      updatedAt: Date.now(),
      tasks: goal.tasks.filter((task) => task.id !== id),
    });

    setSelectedTaskId((cur) => (cur === id ? null : cur));
  };

  const startEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.title);
    setEditingSubtaskId(null);
    setEditingSubtaskText("");
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskText("");
  };

  const saveEditTask = () => {
    if (!editingTaskId) return;

    const nextTitle = editingTaskText.trim();
    if (!nextTitle) return;

    const nextTasks = goal.tasks.map((task) =>
      task.id === editingTaskId
        ? { ...task, title: nextTitle, updatedAt: Date.now() }
        : task
    );

    onUpdateGoal({ ...goal, updatedAt: Date.now(), tasks: nextTasks });
    cancelEditTask();
  };

  const addSubtask = () => {
    if (!selectedTask) return;

    const t = subtaskText.trim();
    if (!t) return;

    const nextTasks = goal.tasks.map((task) => {
      if (task.id !== selectedTask.id) return task;

      return {
        ...task,
        done: false,
        subtasks: [
          ...task.subtasks,
          {
            id: uid(),
            title: t,
            done: false,
            order: task.subtasks.length,
            createdAt: Date.now(),
          },
        ],
      };
    });

    onUpdateGoal({ ...goal, updatedAt: Date.now(), tasks: nextTasks });
    setSubtaskText("");
  };

  const toggleSubtask = (taskId, subtaskId) => {
    const nextTasks = goal.tasks.map((task) => {
      if (task.id !== taskId) return task;

      const nextSubtasks = task.subtasks.map((subtask) =>
        subtask.id === subtaskId
          ? { ...subtask, done: !subtask.done }
          : subtask
      );

      const allDone =
        nextSubtasks.length > 0 && nextSubtasks.every((subtask) => subtask.done);

      return {
        ...task,
        done: allDone,
        subtasks: nextSubtasks,
      };
    });

    onUpdateGoal({ ...goal, updatedAt: Date.now(), tasks: nextTasks });
  };

  const deleteSubtask = (taskId, subtaskId) => {
    const nextTasks = goal.tasks.map((task) => {
      if (task.id !== taskId) return task;

      const nextSubtasks = task.subtasks.filter(
        (subtask) => subtask.id !== subtaskId
      );

      return {
        ...task,
        done:
          nextSubtasks.length > 0 &&
          nextSubtasks.every((subtask) => subtask.done),
        subtasks: nextSubtasks,
      };
    });

    onUpdateGoal({ ...goal, updatedAt: Date.now(), tasks: nextTasks });
  };

  const startEditSubtask = (subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskText(subtask.title);
    setEditingTaskId(null);
    setEditingTaskText("");
  };

  const cancelEditSubtask = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskText("");
  };

  const saveEditSubtask = (taskId) => {
    if (!editingSubtaskId) return;

    const nextTitle = editingSubtaskText.trim();
    if (!nextTitle) return;

    const nextTasks = goal.tasks.map((task) => {
      if (task.id !== taskId) return task;

      return {
        ...task,
        updatedAt: Date.now(),
        subtasks: task.subtasks.map((subtask) =>
          subtask.id === editingSubtaskId
            ? { ...subtask, title: nextTitle, updatedAt: Date.now() }
            : subtask
        ),
      };
    });

    onUpdateGoal({ ...goal, updatedAt: Date.now(), tasks: nextTasks });
    cancelEditSubtask();
  };

  const orderedTasks = useMemo(() => {
    return [...goal.tasks].sort((a, b) => {
      const aProgress = calcTaskProgress(a);
      const bProgress = calcTaskProgress(b);

      if (aProgress === 100 && bProgress !== 100) return 1;
      if (aProgress !== 100 && bProgress === 100) return -1;

      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [goal.tasks]);

  return (
    <div className="subtasks">
      <div className="stickyInput">
        <div className="row">
          <input
            className="input"
            value={taskText}
            placeholder="태스크 추가"
            onChange={(e) => setTaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask();
            }}
          />
          <button className="btn" onClick={addTask} disabled={!taskText.trim()}>
            추가
          </button>
        </div>

        <div className="miniMeta">
          <span className="miniLabel">Task</span>
          <span className="miniValue">{goal.tasks.length}개</span>
        </div>
      </div>

      {orderedTasks.length === 0 ? (
        <div className="empty compact">
          <div className="emptyTitle">태스크를 1개만 추가해도 시작이 쉬워집니다</div>
          <div className="emptyText">
            예: “책상 정리”, “바닥 청소”, “쓰레기 버리기”
          </div>
        </div>
      ) : (
        <div className="taskList">
          {orderedTasks.map((task) => (
            <SubtaskItem
              key={task.id}
              task={task}
              isSelected={selectedTaskId === task.id}
              isEditing={editingTaskId === task.id}
              editText={editingTaskText}
              onChangeEditText={setEditingTaskText}
              onStartEdit={() => startEditTask(task)}
              onSaveEdit={saveEditTask}
              onCancelEdit={cancelEditTask}
              onToggle={() => toggleTask(task.id)}
              onOpen={() =>
                setSelectedTaskId((currentId) =>
                  currentId === task.id ? null : task.id
                )
              }
              onDelete={() => deleteTask(task.id)}
            />
          ))}
        </div>
      )}

      {selectedTask && (
        <section className="panel">
          <div className="progressTop">
            <div>
              <div className="emptyTitle">{selectedTask.title}</div>
              <div className="emptyText">
                더 쪼개고 싶을 때만 서브태스크를 추가하세요.
              </div>
            </div>
            <div className="pct">{calcTaskProgress(selectedTask)}%</div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <input
              className="input"
              value={subtaskText}
              placeholder="서브태스크 추가"
              onChange={(e) => setSubtaskText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addSubtask();
              }}
            />
            <button
              className="btn"
              onClick={addSubtask}
              disabled={!subtaskText.trim()}
            >
              추가
            </button>
          </div>

          {selectedTask.subtasks.length === 0 ? (
            <div className="empty compact" style={{ marginTop: 12 }}>
              <div className="emptyTitle">서브태스크는 선택사항입니다</div>
              <div className="emptyText">
                이 태스크가 충분히 작다면 그냥 완료 체크해도 됩니다.
              </div>
            </div>
          ) : (
            <div className="taskList" style={{ marginTop: 12 }}>
              {selectedTask.subtasks.map((subtask) => (
                <div
                  className={`taskRow ${subtask.done ? "done" : ""}`}
                  key={subtask.id}
                >
                  <button
                    className={`check ${subtask.done ? "checked" : ""}`}
                    onClick={() => toggleSubtask(selectedTask.id, subtask.id)}
                    type="button"
                  >
                    {subtask.done ? "✓" : ""}
                  </button>

                  {editingSubtaskId === subtask.id ? (
                    <input
                      className="inlineEditInput"
                      value={editingSubtaskText}
                      autoFocus
                      onChange={(e) => setEditingSubtaskText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditSubtask(selectedTask.id);
                        if (e.key === "Escape") cancelEditSubtask();
                      }}
                    />
                  ) : (
                    <div
                      className="taskText"
                      onClick={() => toggleSubtask(selectedTask.id, subtask.id)}
                    >
                      {subtask.title}
                    </div>
                  )}

                  <button
                    className={`taskEditBtn ${editingSubtaskId === subtask.id ? "isSave" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (editingSubtaskId === subtask.id) {
                        saveEditSubtask(selectedTask.id);
                        return;
                      }
                      startEditSubtask(subtask);
                    }}
                    aria-label={editingSubtaskId === subtask.id ? "Save subtask" : "Edit subtask"}
                    title={editingSubtaskId === subtask.id ? "Save" : "Edit"}
                    type="button"
                  >
                    {editingSubtaskId === subtask.id ? "✓" : "✎"}
                  </button>

                  <button
                    className="taskDeleteBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (editingSubtaskId === subtask.id) {
                        cancelEditSubtask();
                        return;
                      }
                      deleteSubtask(selectedTask.id, subtask.id);
                    }}
                    aria-label={editingSubtaskId === subtask.id ? "Cancel edit" : "Delete subtask"}
                    title={editingSubtaskId === subtask.id ? "Cancel" : "Delete"}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}