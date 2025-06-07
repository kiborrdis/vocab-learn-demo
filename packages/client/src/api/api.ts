import { createApiClient } from "../generated/api/apiClient";
import { ApiBaseClient } from "../generated/api/apiClientBaseFunctions";

// Custom API client that includes credentials for session cookies
class AuthApiBaseClient extends ApiBaseClient {
  private withCredentials(options?: RequestInit): RequestInit {
    return { credentials: "include", ...options };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(params: any): Promise<any> {
    return super.get({ ...params, options: this.withCredentials(params.options) });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post(params: any): Promise<any> {
    return super.post({ ...params, options: this.withCredentials(params.options) });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  put(params: any): Promise<any> {
    return super.put({ ...params, options: this.withCredentials(params.options) });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete(params: any): Promise<any> {
    return super.delete({ ...params, options: this.withCredentials(params.options) });
  }
}

export const apiClient = createApiClient(
  new AuthApiBaseClient(import.meta.env.VITE_API_BASE_URL || "/api")
);
