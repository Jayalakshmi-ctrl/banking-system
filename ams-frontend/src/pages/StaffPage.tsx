import { useEffect, useState } from "react";
import { fetchComplaints, patchComplaint } from "../api/client";
import type { Complaint, ComplaintStatus } from "../api/types";
import { AuthenticatedImage } from "../components/AuthenticatedImage";
import { RowActionMenu } from "../components/RowActionMenu";
import {
  canStaffReopen,
  nextStaffStatus,
} from "../domain/complaintWorkflow";

export function StaffPage() {
  const [rows, setRows] = useState<Complaint[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [spotlight, setSpotlight] = useState<{
    publicId: string;
    index: number;
    label: string;
  } | null>(null);

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
    if (!spotlight) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSpotlight(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spotlight]);

  async function advanceStatus(publicId: string, current: ComplaintStatus) {
    const next = nextStaffStatus(current);
    if (!next) return;
    setErr(null);
    try {
      await patchComplaint(publicId, { status: next });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function reopen(publicId: string) {
    setErr(null);
    try {
      await patchComplaint(publicId, { status: "pending" });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reopen failed");
    }
  }

  return (
    <div className="page stack-lg">
      <header className="page-header">
        <h1 id="staff-title">Assigned work</h1>
        <p className="lede">Update status for tickets assigned to you.</p>
      </header>

      {err && (
        <div className="alert alert-error" role="alert">
          {err}
        </div>
      )}

      <div className="card">
        <div className="table-scroll" role="region" aria-label="Assigned complaints" tabIndex={0}>
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Resident</th>
                <th scope="col">Status</th>
                <th scope="col">Category</th>
                <th scope="col">Description</th>
                <th scope="col">Photos</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const n = nextStaffStatus(c.status);
                const showReopen = canStaffReopen(c.status);
                const staffMenuItems = [];
                if (n) {
                  staffMenuItems.push({
                    label: `Set ${n.replace("_", " ")}`,
                    onSelect: () => advanceStatus(c.public_id, c.status),
                  });
                }
                if (showReopen) {
                  staffMenuItems.push({
                    label: "Reopen",
                    onSelect: () => reopen(c.public_id),
                  });
                }
                return (
                  <tr key={c.public_id}>
                    <td>
                      <code className="code-quiet">{c.public_id}</code>
                    </td>
                    <td>
                      <span className="name-cell">
                        {c.resident_name ?? "Resident"}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill status-${c.status}`}>
                        {c.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>{c.category}</td>
                    <td className="desc">{c.description.slice(0, 160)}</td>
                    <td>
                      {c.images.length === 0 ? (
                        <span className="subtle">None</span>
                      ) : (
                        <ul className="thumb-list">
                          {c.images.map((_, idx) => (
                            <li key={`${c.public_id}-img-${idx}`}>
                              <AuthenticatedImage
                                publicId={c.public_id}
                                index={idx}
                                alt={`Resident photo ${idx + 1} for ${c.public_id}`}
                                onRequestDetail={() =>
                                  setSpotlight({
                                    publicId: c.public_id,
                                    index: idx,
                                    label: `Photo ${idx + 1} — ${c.public_id}`,
                                  })
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>
                      {staffMenuItems.length > 0 ? (
                        <RowActionMenu
                          ariaLabel={`Actions for complaint ${c.public_id}`}
                          items={staffMenuItems}
                        />
                      ) : (
                        <span className="subtle">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {spotlight && (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={spotlight.label}
          onClick={() => setSpotlight(null)}
        >
          <button
            type="button"
            className="lightbox-close btn btn-ghost btn-sm"
            onClick={() => setSpotlight(null)}
            aria-label="Close enlarged image"
          >
            Close
          </button>
          <div
            className="lightbox-frame"
            onClick={(e) => e.stopPropagation()}
          >
            <AuthenticatedImage
              publicId={spotlight.publicId}
              index={spotlight.index}
              alt={spotlight.label}
              size="spotlight"
            />
          </div>
        </div>
      )}
    </div>
  );
}
