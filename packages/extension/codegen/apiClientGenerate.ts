import { copyFile, mkdirSync, readFileSync, writeFileSync } from "fs";
import { OpenAPIV3_1 } from "openapi-types";
import openapiTS, { astToString } from "openapi-typescript";

const BASE_PATH = "";
const OPEN_API_JSON_PATH = "../server/openapi.json";
const GENERATED_PATH = "./src/generated/api";

const openapiStr = readFileSync(OPEN_API_JSON_PATH, "utf-8");
const openapiJSON = JSON.parse(openapiStr);

const generateTsSchema = async () => {
  const ast = await openapiTS(openapiJSON);
  const contents = astToString(ast);
  mkdirSync(GENERATED_PATH, { recursive: true });
  writeFileSync(GENERATED_PATH + "/api-schema.ts", contents);
};

type MethodString = "get" | "post" | "put" | "delete";

type MethodDescription = {
  summary: string;
  method: MethodString;
  path: string;
  hasPathParams: boolean;
  hasQueryParams: boolean;
  possibleResponseCodes: string[];
};

const gatherMethods = (
  openApiJson: OpenAPIV3_1.Document,
): MethodDescription[] => {
  const methods: MethodDescription[] = [];

  for (const path in openApiJson.paths) {
    const pathItem = openApiJson.paths[path];
    for (const method in pathItem) {
      if (["get", "post", "put", "delete"].includes(method)) {
        const operation = pathItem[method as MethodString];
        if (!operation) {
          continue;
        }

        let hasPathParams = false;
        let hasQueryParams = false;
        const possibleResponseCodes: string[] = [];

        if (operation.parameters) {
          for (const param of operation.parameters) {
            if ("in" in param && param.in === "path") {
              hasPathParams = true;
            } else if ("in" in param && param.in === "query") {
              hasQueryParams = true;
            }
          }
        }

        if (operation.responses) {
          for (const responseCode in operation.responses) {
            if (responseCode !== "default") {
              possibleResponseCodes.push(responseCode);
            }
          }
        }

        methods.push({
          summary: operation.summary || "",
          method: method as MethodString,
          path: path,
          hasPathParams,
          hasQueryParams,
          possibleResponseCodes,
        });
      }
    }
  }

  return methods;
};

const buildApiClient = (methods: MethodDescription[]): string => {
  const apiClientLines: string[] = [];
  const contentType = "application/json";

  apiClientLines.push("import type { paths } from './api-schema.ts';");
  apiClientLines.push(
    "import { ApiBaseClient, bindApiClient } from './apiClientBaseFunctions.ts';",
  );
  const clientMethods: string[] = [];

  const pathsMap: Record<string, [string, string]> = methods.reduce(
    (acc, method) => {
      acc[method.summary] = [method.method, method.path];
      return acc;
    },
    {} as Record<string, [string, string]>,
  );

  apiClientLines.push(
    "export const API_PATHS = " + JSON.stringify(pathsMap, null, 2) + " as const;",
  );

  // Generating type: [name]: paramTypes map
  apiClientLines.push(`
export type ApiClientMethodParams = {
`);
  methods.forEach((method) => {
    const hasPathParams = method.hasPathParams;
    const hasQueryParams = method.hasQueryParams;
    const hasBodyParams = method.method !== "get";

    const pathParams = method.hasPathParams
      ? `pathParams: paths['${method.path}']['${method.method}']['parameters']['path']`
      : "";
    const queryParams = method.hasQueryParams
      ? `queryParams: paths['${method.path}']['${method.method}']['parameters']['query']`
      : "";
    const bodyParams = `bodyParams: Required<paths['${method.path}']['${method.method}']>['requestBody']['content']['${contentType}']`;

    apiClientLines.push(`  '${method.summary}': {`);
    if (hasPathParams) {
      apiClientLines.push(`    ${pathParams};`);
    } else {
      apiClientLines.push(`  pathParams: undefined;`);
    }

    if (method.method === "get" && hasQueryParams) {
      apiClientLines.push(`    ${queryParams};`);
    } else {
      apiClientLines.push(`  queryParams: undefined;`);
    }  
    
    if (hasBodyParams) {
      apiClientLines.push(`    ${bodyParams};`);
    } else {
      apiClientLines.push(`  bodyParams: undefined;`);
    }

    apiClientLines.push(`  };`);
  });

  apiClientLines.push(`};`);

  methods.forEach((method) => {
    const hasQueryParams = method.hasQueryParams && method.method === "get";
    const hasBodyParams = method.method !== "get";
    const hasPathParams = method.hasPathParams;

    const methodName = method.summary;
    const pathParams = method.hasPathParams
      ? `pathParams: paths['${method.path}']['${method.method}']['parameters']['path']`
      : "";
    const queryParams = method.hasQueryParams
      ? `queryParams: paths['${method.path}']['${method.method}']['parameters']['query']`
      : "";
    const bodyParams = `bodyParams: Required<paths['${method.path}']['${method.method}']>['requestBody']['content']['${contentType}']`;
    let responseTypeStr = "";

    const respTypes = method.possibleResponseCodes.map((code) => {
      const respType = `paths['${method.path}']['${method.method}']['responses']['${code}']['content']['${contentType}']`;

      return `[${code}, ${respType}]`;
    });

    responseTypeStr = respTypes.join(" | ");

    const methodParams: string[] = ["api: ApiBaseClient"];

    if (hasPathParams) {
      methodParams.push(pathParams);
    }
    if (hasQueryParams) {
      methodParams.push(queryParams);
    }
    if (hasBodyParams) {
      methodParams.push(bodyParams);
    }

    methodParams.push("options?: RequestInit");

    const endpointParams = methodParams.join(", ");
    apiClientLines.push(`
const ${methodName} = async (${endpointParams}): Promise<${responseTypeStr}> => {
    return api.${method.method}({
      ${hasPathParams ? `pathParams,` : ""}
      ${hasQueryParams ? `queryParams,` : ""}
      ${hasBodyParams ? `bodyParams,` : ""}
      options,
      path: '${BASE_PATH + method.path}',
    });
};  
  `);
    clientMethods.push(methodName);
  });

  apiClientLines.push(
    `export const createApiClient = (api: ApiBaseClient) => ({`,
  );
  apiClientLines.push(
    `${clientMethods.map((m) => `${m}: bindApiClient(api, ${m})`).join(",\n")}`,
  );
  apiClientLines.push(`});`);

  return apiClientLines.join("\n");
};

const generate = async () => {
  const methods = gatherMethods(openapiJSON);

  console.log(`Found ${methods.length} API methods:`);
  methods.forEach((m) => {
    console.log(`  ${m.method.toUpperCase()} ${m.path} (${m.summary})`);
  });

  await generateTsSchema();
  copyFile(
    "./codegen/apiClientBaseFunctions.ts",
    GENERATED_PATH + "/apiClientBaseFunctions.ts",
    () => {},
  );
  writeFileSync(
    GENERATED_PATH + "/apiClient.ts",
    buildApiClient(methods),
  );

  console.log("\n✓ Generated:");
  console.log(`  - ${GENERATED_PATH}/api-schema.ts`);
  console.log(`  - ${GENERATED_PATH}/apiClient.ts`);
  console.log(`  - ${GENERATED_PATH}/apiClientBaseFunctions.ts`);
};

generate().catch((e) => {
  console.error("Codegen failed:", e);
  process.exit(1);
});
