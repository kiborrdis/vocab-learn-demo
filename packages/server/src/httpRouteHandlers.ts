/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, Router } from "express";
import cors, { CorsOptions } from "cors";

const corsOptions: CorsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  optionsSuccessStatus: 200,
  credentials: true,
};

export type HandlerContext<TExtra extends Record<string, any> = {}> = {
  req: Request;
  res: Response;
  method: string;
  handlerPattern: string;
  extra: TExtra;
};

export type StatusResponse<S extends number, TResult extends any> = {
  readonly status: S;
  readonly result: TResult;
};

export const response = <S extends number, TResult extends any>(
  status: S,
  result: TResult
): StatusResponse<S, TResult> => ({ status, result });

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export type Middleware<
  TPathIn = any,
  TDataIn = any,
  TExtraIn extends Record<string, any> = {},
  TPathOut = TPathIn,
  TDataOut = TDataIn,
  TExtraOut extends Record<string, any> = TExtraIn,
  TEarlyReturn extends StatusResponse<number, any> = never,
> = (
  path: TPathIn,
  data: TDataIn,
  context: HandlerContext<TExtraIn>
) => Promise<
  | {
      path: TPathOut;
      data: TDataOut;
      context: HandlerContext<TExtraOut>;
    }
  | TEarlyReturn
>;

export type Handler<
  TPath = any,
  TData = any,
  TExtra extends Record<string, any> = {},
  TResult extends StatusResponse<number, any> = StatusResponse<number, any>,
> = (path: TPath, data: TData, context: HandlerContext<TExtra>) => Promise<TResult> | TResult;

export type AllResponses<T> = T extends StatusResponse<number, any> ? T : never;

export class RouteHandlerBuilder<
  TPath = {},
  TData = {},
  TExtra extends Record<string, any> = {},
  TMiddlewareResponses extends StatusResponse<number, any> = never,
> {
  constructor(
    private router: Router,
    private pattern: string,
    private method: "get" | "post" | "put" | "delete" | "patch",
    private middlewares: Middleware<any, any, any, any, any, any, any>[] = []
  ) {}

  use<
    TPathOut = TPath,
    TDataOut = TData,
    TExtraOut extends Record<string, any> = TExtra,
    TEarlyReturn extends StatusResponse<number, any> = never,
  >(
    middleware: Middleware<TPath, TData, TExtra, TPathOut, TDataOut, TExtraOut, TEarlyReturn>
  ): RouteHandlerBuilder<TPathOut, TDataOut, TExtraOut, TMiddlewareResponses | TEarlyReturn> {
    this.middlewares.push(middleware);

    return new RouteHandlerBuilder(this.router, this.pattern, this.method, [
      ...this.middlewares,
      middleware,
    ]);
  }

  handle<TResult extends StatusResponse<number, any>>(
    handler: Handler<TPath, TData, TExtra, TResult>
  ): void {
    const routeHandler = async (req: Request, res: Response) => {
      try {
        let path: any = req.params;
        let data: any = this.method === "get" ? req.query : req.body;
        let context: HandlerContext<any> = {
          req,
          res,
          method: this.method,
          handlerPattern: this.pattern,
          extra: {} as TExtra,
        };

        for (const middleware of this.middlewares) {
          const result = await middleware(path, data, context);

          // If middleware returned response, we stop processing and return it
          if ("status" in result && "result" in result) {
            res.status(result.status);
            res.json(result.result);
            return;
          }

          path = result.path;
          data = result.data;
          context = result.context;
        }

        // Execute handler
        const result = await handler(path, data, context);

        res.status(result.status);
        res.json(result.result);
      } catch (e) {
        if (e instanceof HttpError) {
          res.status(e.status).json({
            error: e.message,
            details: e.details,
          });
        } else {
          console.error("Unhandled error in route handler:", e);
          res.status(500).json({
            error: (e as Error).message || "Internal server error",
          });
        }
      }
    };

    // Register route
    this.router.options(this.pattern, cors(corsOptions));

    this.router[this.method](this.pattern, cors(corsOptions), routeHandler);
  }
}

export function createGetHandler(
  router: Router,
  pattern: string
): RouteHandlerBuilder<{}, {}, {}, never> {
  return new RouteHandlerBuilder(router, pattern, "get");
}

export function createPostHandler(
  router: Router,
  pattern: string
): RouteHandlerBuilder<{}, {}, {}, never> {
  return new RouteHandlerBuilder(router, pattern, "post");
}

export function createPutHandler(
  router: Router,
  pattern: string
): RouteHandlerBuilder<{}, {}, {}, never> {
  return new RouteHandlerBuilder(router, pattern, "put");
}

export function createDeleteHandler(
  router: Router,
  pattern: string
): RouteHandlerBuilder<{}, {}, {}, never> {
  return new RouteHandlerBuilder(router, pattern, "delete");
}

export function createPatchHandler(
  router: Router,
  pattern: string
): RouteHandlerBuilder<{}, {}, {}, never> {
  return new RouteHandlerBuilder(router, pattern, "patch");
}
