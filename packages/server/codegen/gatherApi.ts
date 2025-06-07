import {
  convertAwaitedTypeToTypeDescription,
  convertTypeToTypeDescription,
  createVisitRules,
  traverseAllChildren,
} from "tsc-helpers";
import type { TypeDescription } from "tsc-helpers";
import * as ts from "typescript";

export type MethodDescription = {
  method: string;
  path: string;
  pathParams: TypeDescription;
  params: TypeDescription;
  returnType: TypeDescription;
};

export const gatherApiMethods = (
  entryPoints: string[] = ["./src/index.ts"],
): [
  MethodDescription[],
  Record<string, TypeDescription>,
] => {
  const methods: MethodDescription[] = [];
  const types: Record<string, TypeDescription> = {};

  const program = ts.createProgram(entryPoints, {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
  });

  const checker = program.getTypeChecker();

  const see = (_: any, node: ts.Node) => {
    // Look for the pattern: createGetHandler(router, pattern).use(...).handle(handler)
    // We need to find the .handle() call and work backwards
    if (!ts.isCallExpression(node)) {
      return;
    }

    const expression = node.expression;

    // Check if this is a .handle() call
    if (
      !ts.isPropertyAccessExpression(expression) ||
      expression.name.getText() !== "handle"
    ) {
      return;
    }

    // Walk back through the chain to find the create*Handler call
    let current: ts.Expression = expression.expression;
    let method = "";
    let path = "";

    // Traverse back through .use() calls to find create*Handler
    while (ts.isCallExpression(current)) {
      const currentExpression = current.expression;

      if (ts.isPropertyAccessExpression(currentExpression)) {
        // This is a .use() call, keep going back
        current = currentExpression.expression;
      } else if (ts.isIdentifier(currentExpression)) {
        // This should be the create*Handler call
        const fnName = currentExpression.getText();
        if (
          ["createPostHandler", "createGetHandler", "createPutHandler", "createDeleteHandler", "createPatchHandler"].includes(
            fnName,
          )
        ) {
          method = fnName
            .replace("create", "")
            .replace("Handler", "")
            .toLowerCase();

          // Get the path from the second argument
          if (current.arguments.length >= 2) {
            path = current.arguments[1]
              .getText()
              .replace(/^["']/, "")
              .replace(/["']$/, "");
          }
        }
        break;
      } else {
        break;
      }
    }

    if (!method || !path) {
      return;
    }

    // Now extract the handler function type from .handle(handler)
    if (node.arguments.length === 0) {
      return;
    }

    const handlerArg = node.arguments[0];
    const handlerType = checker.getTypeAtLocation(handlerArg);
    const callSignature = handlerType.getCallSignatures()[0];

    if (!callSignature) {
      return;
    }

    // Extract accumulated middleware errors from the builder's TEarlyReturn generic
    const builderExpression = (node.expression as ts.PropertyAccessExpression).expression;
    const builderType = checker.getTypeAtLocation(builderExpression);
    
    // The builder is RouteHandlerBuilder<TPath, TData, TExtra, TEarlyReturn>
    // TEarlyReturn is the 4th type argument and contains all middleware error responses
    let middlewareErrorType: ts.Type | undefined;
    
    // Try to get type arguments from the type reference
    const typeArgs = (builderType as any).typeArguments || (builderType as any).resolvedTypeArguments;
    
    if (typeArgs && typeArgs.length >= 4) {
      middlewareErrorType = typeArgs[3];
    }

    const params = callSignature.getParameters();

    let args: TypeDescription[] = [];
    
    // The handler has signature: (path, data, context) => result
    if (params.length >= 2) {
      // First parameter is path params
      args.push(
        convertTypeToTypeDescription(
          types,
          checker.getTypeOfSymbol(params[0]),
          checker,
        ),
      );

      // Second parameter is body data
      args.push(
        convertTypeToTypeDescription(
          types,
          checker.getTypeOfSymbol(params[1]),
          checker,
        ),
      );
    }

    const pathParams = args[0];
    const routeParams = args[1];

    // Get the handler's return type
    const handlerReturnType = convertAwaitedTypeToTypeDescription(
      types,
      callSignature.getReturnType(),
      checker,
    );

    // Get middleware error types
    const middlewareErrorTypeDesc = middlewareErrorType
      ? convertTypeToTypeDescription(types, middlewareErrorType, checker)
      : undefined;

    // Merge handler return type with middleware errors
    let returnType: TypeDescription;
    if (middlewareErrorTypeDesc) {
      // If we have middleware errors, create a union of handler response + middleware errors
      if (middlewareErrorTypeDesc.kind === "union") {
        // Middleware errors are a union
        if (handlerReturnType.kind === "union") {
          // Both are unions, merge them
          returnType = {
            kind: "union",
            variants: [...handlerReturnType.variants, ...middlewareErrorTypeDesc.variants],
          };
        } else {
          // Handler is single, middleware is union
          returnType = {
            kind: "union",
            variants: [handlerReturnType, ...middlewareErrorTypeDesc.variants],
          };
        }
      } else {
        // Single middleware error type
        if (handlerReturnType.kind === "union") {
          returnType = {
            kind: "union",
            variants: [...handlerReturnType.variants, middlewareErrorTypeDesc],
          };
        } else {
          returnType = {
            kind: "union",
            variants: [handlerReturnType, middlewareErrorTypeDesc],
          };
        }
      }
    } else {
      // No middleware errors, just use handler return type
      returnType = handlerReturnType;
    }

    methods.push({
      method,
      path,
      pathParams,
      params: routeParams,
      returnType,
    });
  };

  const accept = createVisitRules({
    [ts.SyntaxKind.SourceFile]: [traverseAllChildren],
    [ts.SyntaxKind.FunctionExpression]: [traverseAllChildren],
    [ts.SyntaxKind.FunctionDeclaration]: [traverseAllChildren],
    [ts.SyntaxKind.Block]: [traverseAllChildren],
    [ts.SyntaxKind.ExpressionStatement]: [traverseAllChildren],
    [ts.SyntaxKind.CallExpression]: [traverseAllChildren, see],
  });

  for (const sourceFile of program.getSourceFiles()) {
    if (
      !sourceFile.isDeclarationFile &&
      /httpHandlers/.test(sourceFile.fileName)
    ) {
      accept(sourceFile);
    }
  }

  return [methods, types];
};

export { TypeDescription };
