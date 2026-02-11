import { logger } from "@/utils/logger";
import { env } from "@/utils/env";

interface ApiClientOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

class ApiClient {
  private baseUrl: string;
  private onAuthError: (() => Promise<void>) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Register a handler that is called when a 401 response is received.
   * Typically used to trigger a token refresh via the auth service.
   */
  setOnAuthError(handler: () => Promise<void>) {
    this.onAuthError = handler;
  }

  async request<T = any>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // No manual Authorization header – httpOnly cookies are sent automatically
    const config: RequestInit = {
      method: options.method || "GET",
      headers,
      credentials: "include", // Send httpOnly cookies with every request
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    logger.api(`${options.method || "GET"} ${endpoint}`);
    let response = await fetch(`${this.baseUrl}${endpoint}`, config);

    // On 401, try to refresh the session cookie and retry once
    if (response.status === 401 && this.onAuthError) {
      await this.onAuthError();
      // Retry with the (hopefully) refreshed cookie
      response = await fetch(`${this.baseUrl}${endpoint}`, config);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "GET" });
  }

  post<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: "POST", body });
  }

  put<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: "PUT", body });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient(env.VITE_API_URL);
