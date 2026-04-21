import { useEffect, useId } from "react";

interface Props {
  publicId: string | null;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function DeleteComplaintConfirmModal({
  publicId,
  isBusy,
  onCancel,
  onConfirm,
}: Props) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!publicId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isBusy) {
        onCancel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [publicId, isBusy, onCancel]);

  if (!publicId) {
    return null;
  }

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onClick={() => {
        if (!isBusy) onCancel();
      }}
    >
      <div
        className="modal-inner modal-inner-narrow"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={titleId}>Delete this complaint?</h3>
        <p id={descId} className="modal-hint">
          Complaint <code className="code-quiet">{publicId}</code> will be
          removed permanently. This cannot be undone.
        </p>
        <div className="actions">
          <button
            type="button"
            className="secondary"
            disabled={isBusy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={isBusy}
            onClick={() => void Promise.resolve(onConfirm())}
          >
            {isBusy ? "Deleting…" : "Delete complaint"}
          </button>
        </div>
      </div>
    </div>
  );
}
