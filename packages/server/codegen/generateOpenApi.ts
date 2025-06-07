import { writeFileSync } from "fs";
import {
  gatherApiMethods,
  MethodDescription,
  TypeDescription,
} from "./gatherApi";
import { OpenAPIV3_1 } from "openapi-types";

type MethodString = "get" | "post" | "put" | "delete";

export function convertMethodDescriptionsToOpenApi(
  methods: MethodDescription[],
  typeAliases: Record<string, TypeDescription>,
): OpenAPIV3_1.Document {
  const openapi: OpenAPIV3_1.Document = {
    openapi: "3.1.0",
    info: {
      title: "Generated API",
      version: "1.0.0",
    },
    paths: {},
    components: {
      schemas: {},
    },
  };

  // Add type aliases to schemas
  for (const [aliasName, typeDescription] of Object.entries(typeAliases)) {
    if (openapi.components?.schemas) {
      openapi.components.schemas[aliasName] =
        transformTypeToSchema(typeDescription);
    }
  }

  for (const method of methods) {
    const path = method.path.replace(/\{(.*?)\}/g, "{$1}");
    if (!openapi.paths) {
      openapi.paths = {};
    }
    if (!openapi.paths[path]) {
      openapi.paths[path] = {};
    }
    //@ts-expect-error
    openapi.paths[path][method.method as MethodString] =
      transformMethodToOperation(method, typeAliases);
  }

  return openapi;
}

// Helper to transform TypeDescription to SchemaObject
function transformTypeToSchema(
  type: TypeDescription,
): OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject {
  if (typeof type !== "object" || type === null || !("kind" in type)) {
    return { type: "string" }; // Default to string for unknown types
  }
  switch (type.kind) {
    case "base":
      return { type: mapBaseType(type.name) as unknown as any };
    case "literal":
      return { enum: [type.value], type: typeof type.value as any };
    case "union":
      return { oneOf: type.variants.map(transformTypeToSchema) };
    case "tuple":
      return {
        type: "array",
        //@ts-expect-error
        prefixItems: type.values.map(transformTypeToSchema),
        minItems: type.values.length,
        maxItems: type.values.length,
      };
    case "array":
      return { type: "array", items: transformTypeToSchema(type.value) };
    case "map":
      return {
        type: "object",
        additionalProperties: transformTypeToSchema(type.value),
      };
    case "obj":
      return {
        type: "object",
        required: Object.entries(type.properties)
          .filter(([key, v]) => !v.optional)
          .map(([key]) => key),
        properties: Object.fromEntries(
          Object.entries(type.properties).map(([key, value]) => {
            return [key, transformTypeToSchema(value.type)];
          }),
        ),
      };
    case "alias":
      if (type.name === "____file") {
        return {
          type: "string",
          format: "binary",
        };
      }

      if (type.name === "_Date") {
        return {
          type: "integer",
          format: "unixtime_ms",
        };
      }

      return { $ref: `#/components/schemas/${type.name}` };
    default:
      return { type: "string" }; // Default case
  }
}

// Helper to map base types to OpenAPI types
function mapBaseType(baseType: string): string {
  const mapping: Record<string, string> = {
    string: "string",
    number: "number",
    boolean: "boolean",
  };
  return mapping[baseType] || "string";
}

function extractStatusResponses(
  returnType: TypeDescription,
  typeAliases: Record<string, TypeDescription>,
): Record<number, TypeDescription> {
  const responses: Record<number, TypeDescription> = {};

  function processStatusResponse(variant: TypeDescription) {
    if (variant.kind === "alias" && variant.name.startsWith("StatusResponse<")) {
      const statusResponseType = typeAliases[variant.name];
      if (statusResponseType && statusResponseType.kind === "obj") {
        const statusProp = statusResponseType.properties?.status;
        const resultProp = statusResponseType.properties?.result;
        
        if (statusProp) {
          // Handle single literal status code
          if (statusProp.type.kind === "literal" && typeof statusProp.type.value === "number") {
            const statusCode = statusProp.type.value;
            responses[statusCode] = resultProp?.type || { kind: "base", name: "string" };
          }
          // Handle union of status codes (e.g., StatusResponse<400 | 500, Data>)
          else if (statusProp.type.kind === "union") {
            const resultType = resultProp?.type || { kind: "base", name: "string" };
            for (const statusVariant of statusProp.type.variants) {
              if (statusVariant.kind === "literal" && typeof statusVariant.value === "number") {
                responses[statusVariant.value] = resultType;
              }
            }
          }
        }
      }
    }
  }

  // Handle union of StatusResponse types
  if (returnType.kind === "union") {
    for (const variant of returnType.variants) {
      processStatusResponse(variant);
    }
  }
  // Handle single StatusResponse type
  else if (returnType.kind === "alias" && returnType.name.startsWith("StatusResponse<")) {
    processStatusResponse(returnType);
  }
  // Fallback: treat as 200 response
  else {
    responses[200] = returnType;
  }

  return responses;
}

function transformMethodToOperation(
  method: MethodDescription,
  typeAliases: Record<string, TypeDescription>,
): OpenAPIV3_1.OperationObject {
  let parameters = [
    ...transformPathParams(method.pathParams, typeAliases),
    ...((method.method === "get" && transformQueryParams(method.params)) || []),
  ];

  const responses = extractStatusResponses(method.returnType, typeAliases);

  return {
    summary: (method.method + "_" + method.path.replace(/[\/\-\\]+/g, "_"))
      .replace(/:/g, "")
      .replace("__", "_"),
    parameters: parameters.length > 0 ? parameters : undefined,
    requestBody: transformRequestBody(method.params, "json"),
    responses: transformResponses(responses),
  };
}

function transformPathParams(
  params?: TypeDescription,
  typeAliases: Record<string, TypeDescription> = {},
): (OpenAPIV3_1.ParameterObject | OpenAPIV3_1.ReferenceObject)[] {
  if (params?.kind === 'alias') {
    params = typeAliases[params.name];
  }

  if (!params || params.kind !== "obj") return [];
  //@ts-expect-error
  return Object.entries(params.properties || {}).map(([name, type]) => ({
    name,
    in: "path" as const,
    required: true,
    schema: transformTypeToSchema(type.type),
  }));
}

function transformQueryParams(
  query?: TypeDescription,
): (OpenAPIV3_1.ParameterObject | OpenAPIV3_1.ReferenceObject)[] {
  if (!query || query.kind !== "obj") return [];
  const res = Object.entries(query.properties || {}).map(([name, type]) => ({
    name,
    in: "query" as const,
    required: false,
    schema: transformTypeToSchema(type.type),
  }));
  //@ts-expect-error
  return res;
}

function transformRequestBody(
  body?: TypeDescription,
  contentType: "json" | "multipart" = "json",
): OpenAPIV3_1.RequestBodyObject | undefined {
  if (!body) return undefined;
  const key =
    contentType === "multipart" ? "multipart/form-data" : "application/json";
  return {
    content: {
      [key]: {
        schema: transformTypeToSchema(body),
      },
    },
  };
}

function transformResponses(
  responses: Record<number, TypeDescription>,
): OpenAPIV3_1.ResponsesObject {
  const transformed: OpenAPIV3_1.ResponsesObject = {};
  for (const [statusCode, type] of Object.entries(responses)) {
    transformed[statusCode] = {
      description: `Response with status ${statusCode}`,
      content: {
        "application/json": {
          schema: transformTypeToSchema(type),
        },
      },
    };
  }
  return transformed;
}
