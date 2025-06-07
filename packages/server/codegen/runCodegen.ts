import { mkdirSync, writeFileSync } from "node:fs";
import { gatherApiMethods } from "./gatherApi";
import { convertMethodDescriptionsToOpenApi } from "./generateOpenApi";
import { ZodSchemaBuilder } from "./convertTypeDescriptionToZod";

const entryPoints = [
  "./src/index.ts",
];

const [methods, types] = gatherApiMethods(entryPoints);

console.log(`Found ${methods.length} API methods:`);
methods.forEach((m) => {
  console.log(`  ${m.method.toUpperCase()} ${m.path}`);
});

const openApiDocument = convertMethodDescriptionsToOpenApi(methods, types);

const schemaBuilder = new ZodSchemaBuilder();

methods.forEach((method) => {
  if (method.method === "get" || method.method === "delete") {
    schemaBuilder.addQueryValidation(
      method.params,
      types,
      `${method.method}#${method.path}`,
      "params",
    );
  } else {
    schemaBuilder.addValidation(
      method.params,
      types,
      `${method.method}#${method.path}`,
      "params",
    );
  }
  schemaBuilder.addQueryValidation(
    method.pathParams,
    types,
    `${method.method}#${method.path}`,
    "path",
  );
});

const zodSchemaContent = schemaBuilder.makeFileContent();

mkdirSync("./src/generated", { recursive: true });
writeFileSync("./src/generated/zodSchemas.ts", zodSchemaContent);
writeFileSync("./openapi.json", JSON.stringify(openApiDocument, null, 2));

console.log("\n✓ Generated:");
console.log("  - src/generated/zodSchemas.ts");
console.log("  - openapi.json");
