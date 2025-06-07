import { randomBytes } from "node:crypto";

export function tokenGenerate(length = 56) {
  return Buffer.from(randomBytes(length)).toString("hex");
}
