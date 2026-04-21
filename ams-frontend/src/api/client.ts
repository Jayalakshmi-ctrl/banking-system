import type {
  AdminUserRow,
  AnalyticsSummary,
  Complaint,
  TokenResponse,
  User,
} from "./types";

const base = () => import.meta.env.VITE_API_URL ?? "";

export function getApiBase(): string {
  return base();
}

export function attachmentFileUrl(publicId: string, index: number): string {
  return `${getApiBase()}/complaints/${encodeURIComponent(publicId)}/attachments/${index}/file`;
}

export function getToken(): string | null {
  return sessionStorage.getItem("token");
}

export function setToken(t: string): void {
  sessionStorage.setItem("token", t);
}

export function clearToken(): void {
  sessionStorage.removeItem("token");
}

async function parseError(r: Response): Promise<Error> {
  const fallback = "Request failed";
  try {
    const t = await r.text();
    if (!t) {
      return new Error(fallback);
    }
    const ct = r.headers.get("content-type") ?? "";
    if (ct.includes("application/json") || t.trimStart().startsWith("{")) {
      try {
        const j = JSON.parse(t) as { detail?: unknown };
        if (typeof j.detail === "string") {
          return new Error(j.detail.slice(0, 200));
        }
        if (Array.isArray(j.detail) && j.detail.length > 0) {
          const first = j.detail[0] as { msg?: string };
          if (typeof first.msg === "string") {
            return new Error(first.msg.slice(0, 200));
          }
        }
      } catch {
        /* fall through to raw body */
      }
    }
    return new Error(t.slice(0, 200));
  } catch {
    return new Error(fallback);
  }
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const r = await fetch(`${base()}${path}`, { ...init, headers });
  if (!r.ok) {
    throw await parseError(r);
  }
  if (r.status === 204) {
    return undefined as T;
  }
  return (await r.json()) as T;
}

export async function login(
  email: string,
  password: string,
): Promise<TokenResponse> {
  return apiJson<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchMe(): Promise<User> {
  return apiJson<User>("/auth/me");
}

export async function fetchMaintenanceStaff(): Promise<User[]> {
  return apiJson<User[]>("/auth/maintenance-staff");
}

export async function fetchAdminStaffRoster(): Promise<AdminUserRow[]> {
  return apiJson<AdminUserRow[]>("/auth/admin/staff");
}

export async function fetchAdminResidentsRoster(): Promise<AdminUserRow[]> {
  return apiJson<AdminUserRow[]>("/auth/admin/residents");
}

export async function onboardStaffUser(body: {
  email: string;
  password: string;
  full_name: string;
  address: string;
  phone: string;
  aadhar: string;
}): Promise<User> {
  return apiJson<User>("/auth/admin/staff/onboard", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function onboardResidentUser(body: {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  aadhar: string;
  family_members: string[];
}): Promise<User> {
  return apiJson<User>("/auth/admin/residents/onboard", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deactivateUserAccount(userId: string): Promise<void> {
  await apiJson<void>(
    `/auth/admin/users/${encodeURIComponent(userId)}/deactivate`,
    { method: "POST" },
  );
}

export async function fetchComplaints(
  q: Record<string, string | undefined>,
): Promise<Complaint[]> {
  const params = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const s = params.toString();
  return apiJson<Complaint[]>(`/complaints${s ? `?${s}` : ""}`);
}

export async function createComplaint(body: {
  category: string;
  priority: string;
  description: string;
}): Promise<Complaint> {
  return apiJson<Complaint>("/complaints", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchComplaint(
  publicId: string,
  body: Record<string, unknown>,
): Promise<Complaint> {
  return apiJson<Complaint>(`/complaints/${encodeURIComponent(publicId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteComplaint(publicId: string): Promise<void> {
  const enc = encodeURIComponent(publicId);
  const basePath = `/complaints/${enc}`;
  const token = getToken();
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  let r = await fetch(`${base()}${basePath}`, { method: "DELETE", headers });
  if (r.status === 405) {
    r = await fetch(`${base()}${basePath}/delete`, { method: "POST", headers });
  }
  if (!r.ok) {
    throw await parseError(r);
  }
}

export async function fetchAnalytics(): Promise<AnalyticsSummary> {
  return apiJson<AnalyticsSummary>("/analytics/summary");
}

export async function uploadAttachment(
  publicId: string,
  file: File,
): Promise<Complaint> {
  const token = getToken();
  const fd = new FormData();
  fd.append("file", file);
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const r = await fetch(
    `${base()}/complaints/${encodeURIComponent(publicId)}/attachments`,
    { method: "POST", body: fd, headers },
  );
  if (!r.ok) {
    throw await parseError(r);
  }
  return (await r.json()) as Complaint;
}
