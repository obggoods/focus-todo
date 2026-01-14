export default function SubtaskItem({ subtask, onToggle, onDelete }) {
  return (
    <div className={`taskRow ${subtask.done ? "done" : ""}`}>
      <button
        className={`check ${subtask.done ? "checked" : ""}`}
        onClick={onToggle}
        aria-label={subtask.done ? "Uncheck" : "Check"}
        title={subtask.done ? "Uncheck" : "Check"}
        type="button"
      >
        {subtask.done ? "✓" : ""}
      </button>

      <div className="taskText" onClick={onToggle}>
        {subtask.text}
      </div>

      <button
        className="taskDeleteBtn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Delete subtask"
        title="Delete"
        type="button"
      >
        ×
      </button>
    </div>
  );
}
