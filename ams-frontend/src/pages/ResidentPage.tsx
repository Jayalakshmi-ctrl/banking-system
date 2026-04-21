import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import {
  createComplaint,
  deleteComplaint,
  fetchComplaints,
  patchComplaint,
  uploadAttachment,
} from "../api/client";
import type { Complaint } from "../api/types";
import { DeleteComplaintConfirmModal } from "../components/DeleteComplaintConfirmModal";
import { RowActionMenu } from "../components/RowActionMenu";
import { StarRatingInput } from "../components/StarRatingInput";

export function ResidentPage() {
  const formId = useId();
  const [rows, setRows] = useState<Complaint[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [category, setCategory] = useState("plumbing");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [completeFor, setCompleteFor] = useState<string | null>(null);
  const [editFor, setEditFor] = useState<Complaint | null>(null);
  const [editCategory, setEditCategory] = useState("plumbing");
  const [editPriority, setEditPriority] = useState("medium");
  const [editDescription, setEditDescription] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(5);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function load() {
    setErr(null);
    try {
      const data = await fetchComplaints({});
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (completeFor) {
      setFeedback("");
      setRating(5);
    }
  }, [completeFor]);

  useEffect(() => {
    if (editFor) {
      setEditCategory(editFor.category);
      setEditPriority(editFor.priority);
      setEditDescription(editFor.description);
    }
  }, [editFor]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await createComplaint({ category, priority, description });
      setDescription("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    }
  }

  async function onComplete(e: FormEvent) {
    e.preventDefault();
    if (!completeFor) return;
    setErr(null);
    try {
      await patchComplaint(completeFor, {
        resident_feedback: feedback || undefined,
        rating,
      });
      setCompleteFor(null);
      setFeedback("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function onReopen(publicId: string) {
    setErr(null);
    try {
      await patchComplaint(publicId, { status: "pending" as const });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reopen failed");
    }
  }

  const dismissDeleteModal = useCallback(() => setDeleteTarget(null), []);

  async function confirmDeleteComplaint() {
    if (!deleteTarget) return;
    setErr(null);
    setDeleteBusy(true);
    try {
      await deleteComplaint(deleteTarget);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function onEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editFor) return;
    setErr(null);
    try {
      await patchComplaint(editFor.public_id, {
        category: editCategory,
        priority: editPriority,
        description: editDescription,
      });
      setEditFor(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div className="page stack-lg">
      <header className="page-header">
        <h1 id={`${formId}-title`}>My complaints</h1>
        <p className="lede">
          Submit maintenance requests and track them until completion.
        </p>
      </header>

      {err && (
        <div className="alert alert-error" role="alert">
          {err}
        </div>
      )}

      <section className="card" aria-labelledby={`${formId}-new`}>
        <h2 id={`${formId}-new`} className="card-title">
          New complaint
        </h2>
        <form onSubmit={onCreate} className="grid-form">
          <div className="field">
            <label htmlFor={`${formId}-cat`}>Category</label>
            <select
              id={`${formId}-cat`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="cleaning">Cleaning</option>
              <option value="appliance">Appliance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${formId}-pri`}>Priority</label>
            <select
              id={`${formId}-pri`}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="field full">
            <label htmlFor={`${formId}-desc`}>Description</label>
            <textarea
              id={`${formId}-desc`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
            />
          </div>
          <div className="field full">
            <button type="submit" className="btn btn-primary">
              Submit complaint
            </button>
          </div>
        </form>
      </section>

      <section className="card" aria-labelledby={`${formId}-list`}>
        <h2 id={`${formId}-list`} className="card-title">
          Submitted complaints
        </h2>
        <div
          className="table-scroll"
          role="region"
          aria-label="Your complaints"
          tabIndex={0}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Status</th>
                <th scope="col">Category</th>
                <th scope="col">Priority</th>
                <th scope="col">Updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.public_id}>
                  <td>
                    <code className="code-quiet">{c.public_id}</code>
                  </td>
                  <td>
                    <span className={`status-pill status-${c.status}`}>
                      {c.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>{c.category}</td>
                  <td>{c.priority}</td>
                  <td>
                    <time dateTime={c.updated_at}>
                      {new Date(c.updated_at).toLocaleString()}
                    </time>
                  </td>
                  <td>
                    <div className="table-actions">
                      {c.status === "pending" && (
                        <>
                          <input
                            id={`${formId}-file-${c.public_id}`}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={async (ev) => {
                              const f = ev.target.files?.[0];
                              if (!f) return;
                              try {
                                await uploadAttachment(c.public_id, f);
                                await load();
                              } catch (e) {
                                setErr(
                                  e instanceof Error
                                    ? e.message
                                    : "Upload failed",
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={`${formId}-file-${c.public_id}`}
                            className="btn btn-sm btn-primary"
                          >
                            Attach image
                          </label>
                          <RowActionMenu
                            ariaLabel={`Edit or delete complaint ${c.public_id}`}
                            items={[
                              {
                                label: "Edit",
                                onSelect: () => setEditFor(c),
                              },
                              {
                                label: "Delete",
                                onSelect: () => setDeleteTarget(c.public_id),
                              },
                            ]}
                          />
                        </>
                      )}
                      {c.status === "resolved" && (
                        <RowActionMenu
                          ariaLabel={`Actions for complaint ${c.public_id}`}
                          items={[
                            {
                              label: "Mark completed",
                              onSelect: () => {
                                setCompleteFor(c.public_id);
                              },
                            },
                            {
                              label: "Reopen",
                              onSelect: () => onReopen(c.public_id),
                            },
                          ]}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editFor && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-edit-title`}
        >
          <div className="modal-inner">
            <h3 id={`${formId}-edit-title`}>Edit {editFor.public_id}</h3>
            <p className="modal-hint">
              You can update details while this request is still pending.
            </p>
            <form onSubmit={onEditSubmit} className="stack-form">
              <div className="field">
                <label htmlFor={`${formId}-ecat`}>Category</label>
                <select
                  id={`${formId}-ecat`}
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                >
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="appliance">Appliance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor={`${formId}-epri`}>Priority</label>
                <select
                  id={`${formId}-epri`}
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor={`${formId}-edesc`}>Description</label>
                <textarea
                  id={`${formId}-edesc`}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                  rows={4}
                />
              </div>
              <div className="actions">
                <button type="submit" className="btn btn-primary">
                  Save changes
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setEditFor(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {completeFor && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-dlg-title`}
        >
          <div className="modal-inner">
            <h3 id={`${formId}-dlg-title`}>Complete {completeFor}</h3>
            <form onSubmit={onComplete} className="stack-form">
              <div className="field">
                <label htmlFor={`${formId}-fb`}>Feedback</label>
                <textarea
                  id={`${formId}-fb`}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                />
              </div>
              <StarRatingInput
                id={`${formId}-rate`}
                label="Rating"
                value={rating}
                onChange={setRating}
              />
              <div className="actions">
                <button type="submit" className="btn btn-primary">
                  Submit
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setCompleteFor(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteComplaintConfirmModal
        publicId={deleteTarget}
        isBusy={deleteBusy}
        onCancel={dismissDeleteModal}
        onConfirm={confirmDeleteComplaint}
      />
    </div>
  );
}
