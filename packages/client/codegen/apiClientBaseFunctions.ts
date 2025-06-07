/* eslint-disable @typescript-eslint/no-explicit-any */
const makePathWithParams = (
  baseUrl: string,
  path: string,
  pathParams: Record<string, any> = {},
) => {
  return Object.entries(pathParams).reduce(
    (acc, [key, value]) =>
      acc.replace(`:${key}`, encodeURIComponent(String(value))),
    baseUrl + path,
  );
};

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public body: any,
  ) {
    super(message);
  }
}

export const bindApiClient = <ARGS extends Array<any>, R>(
  api: ApiBaseClient,
  fn: (api: ApiBaseClient, ...args: ARGS) => R,
): ((...args: ARGS) => R) => {
  return (...args: ARGS) => fn(api, ...args);
};

export class ApiBaseClient {
  private baseUrl;
  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  get({ pathParams, queryParams, options, path }: any): Promise<any> {
    const pathWithParams = makePathWithParams(this.baseUrl, path, pathParams);
    return fetch(
      pathWithParams +
        (queryParams ? `?${new URLSearchParams(queryParams).toString()}` : ""),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        ...options,
      },
    )
      .then((response) => {
        return Promise.all([response, response.json()] as const);
      })
      .then(([response, data]) => {
        if (!response.ok) {
          throw new ApiError(
            `HTTP error! status: ${response.status}`,
            response.status,
            data,
          );
        }

        return [response.status, data];
      });
  }

  post({ pathParams, bodyParams, options, path }: any): Promise<any> {
    const pathWithParams = makePathWithParams(this.baseUrl, path, pathParams);
    return fetch(pathWithParams, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyParams),
      ...options,
    })
      .then((response) => {
        return Promise.all([response, response.json()] as const);
      })
      .then(([response, data]) => {
        if (!response.ok) {
          throw new ApiError(
            `HTTP error! status: ${response.status}`,
            response.status,
            data,
          );
        }

        return [response.status, data];
      });
  }

  put({ pathParams, bodyParams, options, path }: any): Promise<any> {
    const pathWithParams = makePathWithParams(this.baseUrl, path, pathParams);
    return fetch(pathWithParams, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyParams),
      ...options,
    })
      .then((response) => {
        return Promise.all([response, response.json()] as const);
      })
      .then(([response, data]) => {
        if (!response.ok) {
          throw new ApiError(
            `HTTP error! status: ${response.status}`,
            response.status,
            data,
          );
        }

        return [response.status, data];
      });
  }

  delete({ pathParams, queryParams, options, path }: any): Promise<any> {
    const pathWithParams = makePathWithParams(this.baseUrl, path, pathParams);
    return fetch(
      pathWithParams +
        (queryParams ? `?${new URLSearchParams(queryParams).toString()}` : ""),
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        ...options,
      },
    )
      .then((response) => {
        return Promise.all([response, response.json()] as const);
      })
      .then(([response, data]) => {
        if (!response.ok) {
          throw new ApiError(
            `HTTP error! status: ${response.status}`,
            response.status,
            data,
          );
        }

        return [response.status, data];
      });
  }
}
