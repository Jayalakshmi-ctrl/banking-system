import { useEffect, useId, useState, type FormEvent } from "react";
import {
  deactivateUserAccount,
  fetchAdminResidentsRoster,
  onboardResidentUser,
} from "../api/client";
import type { AdminUserRow } from "../api/types";

const AADHAR_LEN = 11;

export function ManageResidentsPage() {
  const formId = useId();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [familyLines, setFamilyLines] = useState<string[]>([""]);

  async function load() {
    setErr(null);
    try {
      const data = await fetchAdminResidentsRoster();
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onDeactivate() {
    if (!confirmId) return;
    setErr(null);
    try {
      await deactivateUserAccount(confirmId);
      setConfirmId(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    }
  }

  function addFamilyRow() {
    setFamilyLines((prev) => [...prev, ""]);
  }

  function setFamilyLine(i: number, v: string) {
    setFamilyLines((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  function removeFamilyRow(i: number) {
    setFamilyLines((prev) => prev.filter((_, j) => j !== i));
  }

  async function onOnboard(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{11}$/.test(aadhar.trim())) {
      setErr("Aadhar must be exactly 11 digits.");
      return;
    }
    const primary = fullName.trim().toLowerCase();
    const members = familyLines.map((s) => s.trim()).filter(Boolean);
    for (const m of members) {
      if (m.toLowerCase() === primary) {
        setErr("Family members must not include the primary resident name.");
        return;
      }
    }
    setErr(null);
    try {
      await onboardResidentUser({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim(),
        aadhar: aadhar.trim(),
        family_members: members,
      });
      setOnboardOpen(false);
      setEmail("");
      setPassword("");
      setFullName("");
      setPhone("");
      setAadhar("");
      setFamilyLines([""]);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Onboard failed");
    }
  }

  const confirmRow = rows.find((r) => r.id === confirmId);

  return (
    <div className="page stack-lg">
      <header className="page-header">
        <h1 id={`${formId}-title`}>Manage residents</h1>
        <p className="lede">
          Onboard residents and mark accounts as resigned when they move out.
        </p>
      </header>

      {err && (
        <div className="alert alert-error" role="alert">
          {err}
        </div>
      )}

      <section className="card" aria-labelledby={`${formId}-actions`}>
        <div className="card-head">
          <h2 id={`${formId}-actions`} className="card-title">
            Resident roster
          </h2>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setOnboardOpen(true)}
          >
            Onboard resident
          </button>
        </div>

        <div
          className="table-scroll"
          role="region"
          aria-label="Residents table"
          tabIndex={0}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Phone</th>
                <th scope="col">Aadhar</th>
                <th scope="col">Family</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.full_name}</td>
                  <td>{r.email}</td>
                  <td>{r.phone ?? "—"}</td>
                  <td>{r.aadhar_masked ?? "—"}</td>
                  <td className="desc">
                    {r.family_members?.length
                      ? r.family_members.join(", ")
                      : "—"}
                  </td>
                  <td>
                    <span className={`status-pill status-${r.account_status}`}>
                      {r.account_status}
                    </span>
                  </td>
                  <td>
                    {r.account_status === "active" ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setConfirmId(r.id)}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <span className="subtle">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {onboardOpen && (
        <div
          className="modal"
          role="presentation"
          onClick={() => setOnboardOpen(false)}
        >
          <div
            className="modal-inner wide-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${formId}-onboard-title`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`${formId}-onboard-title`}>Onboard resident</h3>
            <form className="stack-form" onSubmit={onOnboard}>
              <div className="field">
                <label htmlFor={`${formId}-email`}>Email</label>
                <input
                  id={`${formId}-email`}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor={`${formId}-pw`}>Initial password</label>
                <input
                  id={`${formId}-pw`}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={10}
                />
              </div>
              <div className="field">
                <label htmlFor={`${formId}-name`}>Primary resident full name</label>
                <input
                  id={`${formId}-name`}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor={`${formId}-phone`}>Phone</label>
                <input
                  id={`${formId}-phone`}
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor={`${formId}-aadhar`}>
                  Aadhar ({AADHAR_LEN} digits)
                </label>
                <input
                  id={`${formId}-aadhar`}
                  inputMode="numeric"
                  pattern="\d{11}"
                  maxLength={11}
                  value={aadhar}
                  onChange={(e) =>
                    setAadhar(e.target.value.replace(/\D/g, "").slice(0, AADHAR_LEN))
                  }
                  required
                />
              </div>
              <fieldset className="field">
                <legend>Family members (excluding primary resident)</legend>
                {familyLines.map((line, i) => (
                  <div key={`fam-${i}`} className="family-row">
                    <label htmlFor={`${formId}-fam-${i}`} className="sr-only">
                      Family member {i + 1}
                    </label>
                    <input
                      id={`${formId}-fam-${i}`}
                      value={line}
                      onChange={(e) => setFamilyLine(i, e.target.value)}
                      placeholder="Name"
                    />
                    {familyLines.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeFamilyRow(i)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={addFamilyRow}>
                  Add family member
                </button>
              </fieldset>
              <div className="actions">
                <button type="submit" className="btn btn-primary">
                  Create account
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setOnboardOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmId && confirmRow && (
        <div
          className="modal"
          role="presentation"
          onClick={() => setConfirmId(null)}
        >
          <div
            className="modal-inner"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${formId}-deact-title`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`${formId}-deact-title`}>Deactivate resident</h3>
            <p>
              Mark <strong>{confirmRow.full_name}</strong> as resigned? They will no
              longer be able to sign in.
            </p>
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={onDeactivate}>
                Confirm
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setConfirmId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
