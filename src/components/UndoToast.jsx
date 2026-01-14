export default function UndoToast({ message, onUndo, onDismiss }) {
    return (
      <div className="undoToast" role="status" aria-live="polite">
        <div className="undoToast__msg">{message}</div>
        <div className="undoToast__actions">
          <button className="undoToast__btn" onClick={onUndo} type="button">
            Undo
          </button>
          <button
            className="undoToast__close"
            onClick={onDismiss}
            type="button"
            aria-label="Dismiss"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    );
  }
  