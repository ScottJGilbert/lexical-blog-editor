import { cpSync, mkdirSync } from "node:fs";
mkdirSync("dist/styles", { recursive: true });
cpSync("src/styles", "dist/styles", { recursive: true });
