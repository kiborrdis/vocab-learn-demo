import type { TypeDescription } from "tsc-helpers";

const calcZodSchemasOrder = (from: string, deps: Record<string, string[]>) => {
  const layers: string[][] = [];
  let nextLayer: string[] = [];
  let currLayer: string[] = [from];

  while (currLayer.length > 0) {
    currLayer.forEach((key) => {
      nextLayer.push(...(deps[key] || []));
    });

    layers.push(currLayer);
    currLayer = nextLayer;
    nextLayer = [];
  }
  const uniqLayers: string[][] = [];

  const met: Set<string> = new Set<string>();

  layers.reverse().forEach((layer) => {
    uniqLayers.push(
      layer.filter((s) => {
        const res = !met.has(s);
        met.add(s);
        return res;
      }),
    );
  });

  return uniqLayers.flat();
};

export class ZodSchemaBuilder {
  private deps: Record<string, string[]> = {
    root: [],
  };
  private generatedZodSchemas: Record<string, string> = {};
  private zodSchemas: Record<string, Record<string, string>> = {};

  addValidation(
    type: TypeDescription,
    aliases: Record<string, TypeDescription>,
    name: string,
    subname: string,
  ) {
    const schema = generateZodSchema(
      type,
      aliases,
      this.deps,
      this.generatedZodSchemas,
      "root",
    );

    if (!this.zodSchemas[name]) {
      this.zodSchemas[name] = {};
    }
    this.zodSchemas[name][subname] = schema;
  }

  addQueryValidation(
    type: TypeDescription,
    aliases: Record<string, TypeDescription>,
    name: string,
    subname: string,
  ) {
    if (type.kind === "alias") {
      const actualType = aliases[type.name];
      if (!actualType) {
        throw new Error(`Unknown alias: ${type.name}`);
      }
      type = actualType;
    }

    if (type.kind !== "obj") {
      throw new Error("Root for string validation can only be object type");
    }

    const schema = generateZodObject(
      type,
      aliases,
      this.deps,
      this.generatedZodSchemas,
      "root",
      generateZodSchemaForPath
    );

    if (!this.zodSchemas[name]) {
      this.zodSchemas[name] = {};
    }
    this.zodSchemas[name][subname] = schema;
  }

  makeFileContent(): string {
    return makeZodFileContent(
      this.generatedZodSchemas,
      calcZodSchemasOrder("root", this.deps),
      this.zodSchemas,
    );
  }
}

export const convertTypeDescriptionToZod = (
  typeDesc: TypeDescription,
  aliases: Record<string, TypeDescription>,
) => {
  const generatedZodSchemas: Record<string, string> = {};
  const deps: Record<string, string[]> = { root: [] };

  const schema = generateZodSchema(
    typeDesc,
    aliases,
    deps,
    generatedZodSchemas,
    "root",
  );

  const order: string[] = calcZodSchemasOrder("root", deps);

  return `
import { z } from 'zod';
${order
  .map((key) => {
    if (key === "root") {
      return;
    }

    return `const ${key} = ${generatedZodSchemas[key]};`;
  })
  .join("\n")}

const schema: Record<string, Record<string, ZodSchema>> = ${schema};

  `;
};

function makeZodFileContent(
  generatedZodSchemas: Record<string, string>,
  order: string[],
  zodSchemas: Record<string, Record<string, string>>,
) {
  return `
  import { z, ZodType } from 'zod';

  const numStringToDateSchema = z.preprocess((val: unknown) => {
    const numericVal = Number(val);
    return isNaN(numericVal) ? val : numericVal;
  }, z.coerce.date());

  const numberToDateSchema = z.number().refine(
    (value) => !isNaN(value),
    { message: "Value must be a valid number" }
  ).transform((value) => new Date(value));

  ${order
    .map((key) => {
      if (key === "root") {
        return;
      }

      return `const ${key} = ${generatedZodSchemas[key]};`;
    })
    .join("\n")}
  
  export const schemas: Record<string, Record<string, ZodType>> = { ${Object.keys(
    zodSchemas,
  )
    .map((className) => {
      return `"${className}": {${Object.keys(zodSchemas[className])
        .map((propName) => {
          return `"${propName}": ${zodSchemas[className][propName]},`;
        })
        .join("\n")}},`;
    })
    .join("\n")}};
  
    `;
}

function generateZodObject(
  typeDesc: Extract<TypeDescription, { kind: "obj" }>,
  aliases: Record<string, TypeDescription>,
  deps: Record<string, string[]>,
  generatedZodSchemas: Record<string, string>,
  lastAlias: string | undefined,
  generateZodSchemaFn: (
    typeDesc: TypeDescription,
    aliases: Record<string, TypeDescription>,
    deps: Record<string, string[]>,
    generatedZodSchemas: Record<string, string>,
    lastAlias: string | undefined
  ) => string
) {
  return `z.object({
        ${Object.entries(typeDesc.properties)
          .map(
            ([key, { optional, type }]) =>
              `${key}: ${generateZodSchemaFn(type, aliases, deps, generatedZodSchemas, lastAlias)}${optional ? ".optional()" : ""}`,
          )
          .join(",\n        ")}
      })`;
}

function generateZodSchema(
  typeDesc: TypeDescription,
  aliases: Record<string, TypeDescription>,
  deps: Record<string, string[]>,
  generatedZodSchemas: Record<string, string>,
  lastAlias: string | undefined = undefined,
): string {
  switch (typeDesc.kind) {
    case "base":
      switch (typeDesc.name) {
        case "string":
          return "z.string()";
        case "number":
          return "z.number()";
        case "boolean":
          return "z.boolean()";
        case "null":
          return "z.null()";
        default:
          throw new Error(`Unknown base type: ${typeDesc.name}`);
      }
    case "literal":
      return `z.literal(${JSON.stringify(typeDesc.value)})`;
    case "union":
      return `z.union([${typeDesc.variants.map((v) => generateZodSchema(v, aliases, deps, generatedZodSchemas, lastAlias)).join(", ")}])`;
    case "tuple":
      return `z.tuple([${typeDesc.values.map((v) => generateZodSchema(v, aliases, deps, generatedZodSchemas, lastAlias)).join(", ")}])`;
    case "array":
      return `z.array(${generateZodSchema(typeDesc.value, aliases, deps, generatedZodSchemas, lastAlias)})`;
    case "map":
      return `z.record(${generateZodSchema(typeDesc.key, aliases, deps, generatedZodSchemas, lastAlias)}, ${generateZodSchema(typeDesc.value, aliases, deps, generatedZodSchemas, lastAlias)})`;
    case "obj":
      return generateZodObject(typeDesc, aliases, deps, generatedZodSchemas, lastAlias, generateZodSchema);
    case "alias":
      if (!aliases[typeDesc.name]) {
        if (typeDesc.name === "_Date") {
          return "numberToDateSchema";
        }

        throw new Error(`Unknown alias: ${typeDesc.name}`);
      }

      const zodVarName = typeDesc.name.replace(/[<>]/g, "_");

      if (!generatedZodSchemas[zodVarName]) {
        generatedZodSchemas[zodVarName] = " ";

        deps[zodVarName] = [];

        generatedZodSchemas[zodVarName] = generateZodSchema(
          aliases[typeDesc.name],
          aliases,
          deps,
          generatedZodSchemas,
          zodVarName,
        );
      }

      if (lastAlias) {
        deps[lastAlias].push(zodVarName);
      }

      return zodVarName;

    default:
      throw new Error(`Unsupported type kind: ${(typeDesc as any).kind}`);
  }
}



function generateZodSchemaForPath(
  typeDesc: TypeDescription,
  aliases: Record<string, TypeDescription>,
  deps: Record<string, string[]>,
  generatedZodSchemas: Record<string, string>,
  lastAlias: string | undefined = undefined,
): string {
  switch (typeDesc.kind) {
    case "base":
      switch (typeDesc.name) {
        case "string":
          return "z.string()";
        case "number":
          return "z.coerce.number()";
        case "boolean":
          throw new Error("Boolean type is not supported in path parameters");
        case "null":
          throw new Error("Null type is not supported in path parameters");
        default:
          throw new Error(`Unknown base type: ${typeDesc.name}`);
      }
    case "literal":
      return `z.literal(${JSON.stringify(typeDesc.value)})`;
    case "union":
      return `z.union([${typeDesc.variants.map((v) => generateZodSchemaForPath(v, aliases, deps, generatedZodSchemas, lastAlias)).join(", ")}])`;
    case "array":
      throw new Error("Arrays are not supported in path parameters");
    case "map":
      throw new Error("Maps are not supported in path parameters");
    case "obj":
      throw new Error("Objects are not supported in path parameters");
    case "alias":
      if (!aliases[typeDesc.name]) {
        if (typeDesc.name === "_Date") {
          return "numStringToDateSchema";
        }

        throw new Error(`Unknown alias: ${typeDesc.name}`);
      }

      const zodVarName = typeDesc.name.replace(/[<>]/g, "_");

      if (!generatedZodSchemas[zodVarName]) {
        generatedZodSchemas[zodVarName] = " ";

        deps[zodVarName] = [];

        generatedZodSchemas[zodVarName] = generateZodSchemaForPath(
          aliases[typeDesc.name],
          aliases,
          deps,
          generatedZodSchemas,
          zodVarName,
        );
      }

      if (lastAlias) {
        deps[lastAlias].push(zodVarName);
      }

      return zodVarName;

    default:
      throw new Error(`Unsupported type kind: ${(typeDesc as any).kind}`);
  }
}
