import { pathToFileURL } from "url";
import path from "path";

export function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return nextResolve("next/server.js", context);
  }
  if (specifier.startsWith("@/")) {
    const filePath = path.resolve(process.cwd(), "src", specifier.slice(2));
    const target = filePath.endsWith(".ts") ? filePath : filePath + ".ts";
    return {
      shortCircuit: true,
      url: pathToFileURL(target).href,
    };
  }
  return nextResolve(specifier, context);
}
