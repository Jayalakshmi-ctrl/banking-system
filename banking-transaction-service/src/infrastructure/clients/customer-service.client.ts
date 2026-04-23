import axios, { AxiosInstance, isAxiosError } from "axios";
import { HTTP_CLIENT_TIMEOUT_MS } from "../../config";

export class CustomerServiceClient {
  private readonly http: AxiosInstance;

  constructor(baseURL: string) {
    this.http = axios.create({
      baseURL,
      timeout: HTTP_CLIENT_TIMEOUT_MS,
      headers: { "Content-Type": "application/json" },
    });
  }

  /**
   * Best-effort profile read for RabbitMQ notification payloads; returns null on any HTTP error.
   */
  async getCustomerProfile(customerId: string): Promise<{ email: string; phone: string } | null> {
    try {
      const res = await this.http.get<Record<string, unknown>>(`/api/v1/customers/${customerId}`);
      const email = res.data.email;
      const phone = res.data.phone;
      if (typeof email !== "string" || email.trim().length === 0) {
        return null;
      }
      return {
        email: email.trim(),
        phone: typeof phone === "string" ? phone.trim() : "",
      };
    } catch (error) {
      if (isAxiosError(error)) {
        return null;
      }
      throw error;
    }
  }
}
