import axios, { AxiosInstance, isAxiosError } from "axios";
import {
  HTTP_CLIENT_TIMEOUT_MS,
  RETRY_ATTEMPT_COUNT,
  RETRY_BACKOFF_MS,
  type AppConfig,
} from "../../config";

export interface ValidateAccountPayload {
  amount?: string;
}

export interface AccountMutationPayload {
  amount: string;
  reference: string;
}

export interface ValidateAccountResult {
  status: string;
  account_type: string;
  balance: string;
  allowed: boolean;
  reason?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetriableAxiosError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }
  if (error.response) {
    const status = error.response.status;
    return status === 408 || status === 502 || status === 503;
  }
  const code = error.code;
  return code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ECONNABORTED" || code === "ECONNREFUSED";
}

async function withRetries<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRY_ATTEMPT_COUNT; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetriableAxiosError(error)) {
        break;
      }
      if (attempt < RETRY_ATTEMPT_COUNT - 1) {
        await delay(RETRY_BACKOFF_MS[attempt]);
      }
    }
  }
  throw lastError;
}

export class AccountServiceClient {
  private readonly http: AxiosInstance;

  constructor(baseURL: string) {
    this.http = axios.create({
      baseURL,
      timeout: HTTP_CLIENT_TIMEOUT_MS,
      headers: { "Content-Type": "application/json" },
    });
  }

  static fromConfig(cfg: AppConfig): AccountServiceClient {
    return new AccountServiceClient(cfg.ACCOUNT_SERVICE_URL);
  }

  async validateAccount(accountId: string, payload: ValidateAccountPayload): Promise<ValidateAccountResult> {
    return withRetries(async () => {
      const res = await this.http.post<ValidateAccountResult>(
        `/internal/accounts/${accountId}/validate`,
        payload.amount !== undefined ? { amount: payload.amount } : {},
      );
      return res.data;
    });
  }

  async debit(accountId: string, body: AccountMutationPayload): Promise<void> {
    return withRetries(async () => {
      await this.http.post(`/internal/accounts/${accountId}/debit`, body);
    });
  }

  async credit(accountId: string, body: AccountMutationPayload): Promise<void> {
    return withRetries(async () => {
      await this.http.post(`/internal/accounts/${accountId}/credit`, body);
    });
  }
}
