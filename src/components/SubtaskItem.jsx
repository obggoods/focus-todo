function calcTaskProgress(task) {
  if (!Array.isArray(task.subtasks) || task.subtasks.length === 0) {
    return task.done ? 100 : 0;
  }

  const done = task.subtasks.filter((s) => s.done).length;
  return Math.round((done / task.subtasks.length) * 100);
}

export default function SubtaskItem({
  task,
  isSelected,
  isEditing,
  editText,
  onChangeEditText,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggle,
  onOpen,
  onDelete,
}) {
  const progress = calcTaskProgress(task);
  const hasSubtasks = task.subtasks.length > 0;

  return (
    <div className={`taskRow ${progress === 100 ? "done" : ""} ${isEditing ? "editing" : ""}`}>
      <button
        className={`check ${progress === 100 ? "checked" : ""}`}
        onClick={onToggle}
        aria-label={progress === 100 ? "Uncheck" : "Check"}
        title={progress === 100 ? "Uncheck" : "Check"}
        type="button"
      >
        {progress === 100 ? "✓" : ""}
      </button>

      {isEditing ? (
        <input
          className="inlineEditInput"
          value={editText}
          autoFocus
          onChange={(e) => onChangeEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveEdit();
            if (e.key === "Escape") onCancelEdit();
          }}
        />
      ) : (
        <div className="taskText" onClick={onOpen}>
          <div>{task.title}</div>
          <div className="emptyText">
            {hasSubtasks
              ? `서브태스크 ${task.subtasks.filter((s) => s.done).length}/${task.subtasks.length}`
              : isSelected
                ? "서브태스크 영역 열림"
                : "클릭해서 더 쪼개기"}
          </div>
        </div>
      )}

      <button
        className={`taskEditBtn ${isEditing ? "isSave" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          if (isEditing) {
            onSaveEdit();
            return;
          }
          onStartEdit();
        }}
        aria-label={isEditing ? "Save task" : "Edit task"}
        title={isEditing ? "Save" : "Edit"}
        type="button"
      >
        {isEditing ? "✓" : "✎"}
      </button>

      <button
        className="taskDeleteBtn"
        onClick={(e) => {
          e.stopPropagation();
          if (isEditing) {
            onCancelEdit();
            return;
          }
          onDelete();
        }}
        aria-label={isEditing ? "Cancel edit" : "Delete task"}
        title={isEditing ? "Cancel" : "Delete"}
        type="button"
      >
        ×
      </button>
    </div>
  );
}
