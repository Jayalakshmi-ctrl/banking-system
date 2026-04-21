import { useEffect, useId, useState, type FormEvent } from "react";
import {
  deactivateUserAccount,
  fetchAdminStaffRoster,
  onboardStaffUser,
} from "../api/client";
import type { AdminUserRow } from "../api/types";

const AADHAR_LEN = 11;

export function ManageStaffPage() {
  const formId = useId();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhar, setAadhar] = useState("");

  async function load() {
    setErr(null);
    try {
      const data = await fetchAdminStaffRoster();
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

  function openConfirm(id: string) {
    setConfirmId(id);
  }

  async function onOnboard(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{11}$/.test(aadhar.trim())) {
      setErr("Aadhar must be exactly 11 digits.");
      return;
    }
    setErr(null);
    try {
      await onboardStaffUser({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        aadhar: aadhar.trim(),
      });
      setOnboardOpen(false);
      setEmail("");
      setPassword("");
      setFullName("");
      setAddress("");
      setPhone("");
      setAadhar("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Onboard failed");
    }
  }

  const confirmRow = rows.find((r) => r.id === confirmId);

  return (
    <div className="page stack-lg">
      <header className="page-header">
        <h1 id={`${formId}-title`}>Manage staff</h1>
        <p className="lede">
          Onboard maintenance staff and mark accounts as resigned when they leave.
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
            Staff roster
          </h2>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setOnboardOpen(true)}
          >
            Onboard staff
          </button>
        </div>

        <div
          className="table-scroll"
          role="region"
          aria-label="Maintenance staff table"
          tabIndex={0}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Phone</th>
                <th scope="col">Address</th>
                <th scope="col">Aadhar</th>
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
                  <td className="desc">{r.address ?? "—"}</td>
                  <td>{r.aadhar_masked ?? "—"}</td>
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
                        onClick={() => openConfirm(r.id)}
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
            <h3 id={`${formId}-onboard-title`}>Onboard staff member</h3>
            <form className="stack-form" onSubmit={onOnboard}>
              <div className="field">
                <label htmlFor={`${formId}-email`}>Work email</label>
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
                <label htmlFor={`${formId}-name`}>Full name</label>
                <input
                  id={`${formId}-name`}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor={`${formId}-addr`}>Address</label>
                <textarea
                  id={`${formId}-addr`}
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
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
            <h3 id={`${formId}-deact-title`}>Deactivate staff member</h3>
            <p>
              Mark <strong>{confirmRow.full_name}</strong> as resigned? They will
              no longer be able to sign in or receive new assignments.
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
