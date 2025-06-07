import { createApiClient } from "../generated/api/apiClient";
import { ApiBaseClient } from "../generated/api/apiClientBaseFunctions";

// Custom API client that includes credentials for session cookies
class AuthApiBaseClient extends ApiBaseClient {
  get(params: Parameters<ApiBaseClient["get"]>[0]): Promise<unknown> {
    return super.get({
      ...params,
      options: {
        credentials: "include",
        ...params.options,
      },
    });
  }

  post(params: Parameters<ApiBaseClient["post"]>[0]): Promise<unknown> {
    return super.post({
      ...params,
      options: {
        credentials: "include",
        ...params.options,
      },
    });
  }
}

export const apiClient = createApiClient(
  new AuthApiBaseClient(import.meta.env.VITE_API_BASE_URL || "http://localhost:3000")
);
