import { useCallback, useEffect, useState } from "react";
import {
  deleteComplaint,
  fetchAnalytics,
  fetchComplaints,
  fetchMaintenanceStaff,
  patchComplaint,
} from "../api/client";
import type { Complaint, User } from "../api/types";
import { DeleteComplaintConfirmModal } from "../components/DeleteComplaintConfirmModal";

export function AdminPage() {
  const [rows, setRows] = useState<Complaint[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<{ category: string; count: number }[]>(
    [],
  );
  const [status, setStatus] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function load() {
    setErr(null);
    try {
      const [list, team, stats] = await Promise.all([
        fetchComplaints({
          status: status || undefined,
          category: category || undefined,
          priority: priority || undefined,
        }),
        fetchMaintenanceStaff(),
        fetchAnalytics(),
      ]);
      setRows(list);
      setStaff(team);
      setAnalytics(stats.by_category);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
  }

  useEffect(() => {
    void load();
  }, [status, category, priority]);

  async function assign(publicId: string, staffId: string) {
    setErr(null);
    try {
      await patchComplaint(publicId, { assigned_staff_id: staffId });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Assign failed");
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

  return (
    <div className="page stack-lg">
      <header className="page-header">
        <h1 id="admin-title">Complaints</h1>
        <p className="lede">
          Monitor complaints, analytics, and assign work to maintenance staff.
        </p>
      </header>

      {err && (
        <div className="alert alert-error" role="alert">
          {err}
        </div>
      )}

      <section className="card" aria-labelledby="analytics-heading">
        <h2 id="analytics-heading" className="card-title">
          Analytics
        </h2>
        <ul className="analytics-pills">
          {analytics.map((a) => (
            <li key={a.category}>
              <span className="analytics-label">{a.category}</span>
              <span className="analytics-value">{a.count}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" aria-labelledby="filters-heading">
        <h2 id="filters-heading" className="card-title">
          Filters
        </h2>
        <div className="filters-grid">
          <div className="field">
            <label htmlFor="filter-status">Status</label>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Any</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter-category">Category</label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Any</option>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="cleaning">Cleaning</option>
              <option value="appliance">Appliance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter-priority">Priority</label>
            <select
              id="filter-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">Any</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="table-heading">
        <h2 id="table-heading" className="card-title">
          All complaints
        </h2>

        <div className="table-scroll" role="region" aria-label="Complaints table" tabIndex={0}>
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Status</th>
                <th scope="col">Resident</th>
                <th scope="col">Assignee</th>
                <th scope="col">Assign to staff</th>
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
                  <td>
                    <span className="name-cell">
                      {c.resident_name ?? "Unknown"}
                    </span>
                    <span className="subtle mono" aria-hidden>
                      {c.resident_id.slice(-6)}
                    </span>
                  </td>
                  <td>
                    {c.assigned_staff_name ? (
                      <span className="name-cell">{c.assigned_staff_name}</span>
                    ) : (
                      <span className="subtle">Unassigned</span>
                    )}
                  </td>
                  <td>
                    <label htmlFor={`assign-${c.public_id}`} className="sr-only">
                      Assign complaint {c.public_id}
                    </label>
                    <select
                      id={`assign-${c.public_id}`}
                      className="select-assign"
                      value={c.assigned_staff_id ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v) void assign(c.public_id, v);
                      }}
                    >
                      <option value="">Select staff member…</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.email})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => setDeleteTarget(c.public_id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <DeleteComplaintConfirmModal
        publicId={deleteTarget}
        isBusy={deleteBusy}
        onCancel={dismissDeleteModal}
        onConfirm={confirmDeleteComplaint}
      />
    </div>
  );
}
