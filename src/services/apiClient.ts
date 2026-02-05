interface ApiClientOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

class ApiClient {
  private baseUrl: string;
  private getSessionToken: (() => string | null) | null = null;
  private onTokenExpired: (() => Promise<void>) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthHandlers(getToken: () => string | null, onExpired: () => Promise<void>) {
    this.getSessionToken = getToken;
    this.onTokenExpired = onExpired;
  }

  async request<T = any>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Inject auth token
    if (this.getSessionToken) {
      const token = this.getSessionToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const config: RequestInit = {
      method: options.method || "GET",
      headers,
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    let response = await fetch(`${this.baseUrl}${endpoint}`, config);

    // Handle token expiration
    if (response.status === 401 && this.onTokenExpired) {
      // Try to refresh token
      await this.onTokenExpired();

      // Retry request with new token
      const newToken = this.getSessionToken?.();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(`${this.baseUrl}${endpoint}`, { ...config, headers });
      }
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

export const apiClient = new ApiClient(import.meta.env.VITE_API_URL || "http://localhost:3000");
