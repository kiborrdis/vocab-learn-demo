/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { ZodError, ZodType } from "zod";
import { HandlerContext, Middleware, response, StatusResponse } from "./httpRouteHandlers";
import { schemas } from "./generated/zodSchemas";

type BaseUser = {
  id: number;
};

/**
 * Validates path and body parameters using Zod schemas generated from types
 * Returns 400 error response on validation failure
 */
export function withSchemaValidation<
  TPath = any,
  TData = any,
  TExtra extends Record<string, any> = {},
>(): Middleware<
  any,
  any,
  TExtra,
  TPath,
  TData,
  TExtra,
  StatusResponse<400 | 500, { error: string; details?: any }>
> {
  return async (path, data, context) => {
    const { method, handlerPattern } = context;
    const schemaKey = `${method}#${handlerPattern}`;
    const schema = schemas[schemaKey];

    if (!schema) {
      return response(500, {
        error: `Schema not found for "${schemaKey}" - did you run codegen?`,
      });
    }

    const paramsSchema = schema["params"];
    const pathSchema = schema["path"];

    if (!paramsSchema || !pathSchema) {
      return response(500, {
        error: `Invalid schema structure for "${schemaKey}"`,
      });
    }

    try {
      const validatedPath = pathSchema.parse(path);
      const validatedData = paramsSchema.parse(data);

      return {
        path: validatedPath as TPath,
        data: validatedData as TData,
        context,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return response(400, {
          error: "Invalid request parameters",
          details: error.issues,
        });
      }
      throw error;
    }
  };
}

/**
 * Validates using custom Zod schemas
 */
export function withCustomValidation<
  TPathIn = any,
  TDataIn = any,
  TPathOut = any,
  TDataOut = any,
  TExtra extends Record<string, any> = {},
>(
  pathSchema?: ZodType<TPathOut>,
  dataSchema?: ZodType<TDataOut>
): Middleware<
  TPathIn,
  TDataIn,
  TExtra,
  TPathOut,
  TDataOut,
  TExtra,
  StatusResponse<400, { error: string; details?: any }>
> {
  return async (path, data, context) => {
    try {
      const validatedPath = pathSchema ? pathSchema.parse(path) : path;
      const validatedData = dataSchema ? dataSchema.parse(data) : data;

      return {
        path: validatedPath as TPathOut,
        data: validatedData as TDataOut,
        context,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return response(400, {
          error: "Invalid request parameters",
          details: error.issues,
        });
      }
      throw error;
    }
  };
}

/**
 * Authenticates user via session cookie and adds user to context
 * Returns 401 error response on authentication failure
 */
export function withAuthentication<
  TPath = any,
  TData = any,
  TExtra extends Record<string, any> = {},
>(
  prisma: PrismaClient
): Middleware<
  TPath,
  TData,
  TExtra,
  TPath,
  TData,
  TExtra & { user: BaseUser },
  StatusResponse<401, { error: string }>
> {
  return async (path, data, context) => {
    const sessionId = context.req.cookies?.session;

    if (!sessionId) {
      return response(401, { error: "Unauthorized - No session cookie" });
    }

    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: { user: true },
    });

    if (!session) {
      return response(401, { error: "Unauthorized - Invalid session" });
    }

    if (session.expiresAt < new Date()) {
      return response(401, { error: "Unauthorized - Session expired" });
    }

    const baseUser: BaseUser = {
      id: session.user.id,
    };

    return {
      path,
      data,
      context: {
        ...context,
        extra: {
          ...context.extra,
          user: baseUser,
        } as TExtra & { user: BaseUser },
      },
    };
  };
}

/**
 * Logs request details
 */
export function withLogging<
  TPath = any,
  TData = any,
  TExtra extends Record<string, any> = {},
>(): Middleware<TPath, TData, TExtra, TPath, TData, TExtra, never> {
  return async (path, data, context) => {
    console.log(`[${context.method.toUpperCase()}] ${context.handlerPattern}`, {
      path,
      data: context.method !== "get" ? data : undefined,
      userId: (context.extra as any).user?.id,
    });

    return { path, data, context };
  };
}

/**
 * Creates a middleware that adds custom data to context.extra
 */
export function withExtra<
  TPath = any,
  TData = any,
  TExtra extends Record<string, any> = {},
  TNewExtra extends Record<string, any> = {},
>(
  fn: (path: TPath, data: TData, context: HandlerContext<TExtra>) => Promise<TNewExtra> | TNewExtra
): Middleware<TPath, TData, TExtra, TPath, TData, TExtra & TNewExtra, never> {
  return async (path, data, context) => {
    const newExtra = await fn(path, data, context);

    return {
      path,
      data,
      context: {
        ...context,
        extra: {
          ...context.extra,
          ...newExtra,
        } as TExtra & TNewExtra,
      },
    };
  };
}
