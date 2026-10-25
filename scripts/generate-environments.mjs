import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const envPath = resolve(root, ".env");
const values = {};

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].startsWith("#")) continue;
    values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const devUrl = values.API_URL_DEV || "/api";
const prodUrl = values.API_URL_PROD || "https://seu-backend-de-producao.example.com/api";

const writeEnvironment = (file, production, apiUrl) => {
  const content = `export const environment = ${JSON.stringify({ production, apiUrl }, null, 2)};\n`;
  writeFileSync(resolve(root, "src/environments", file), content, "utf8");
};

writeEnvironment("environment.ts", false, devUrl);
writeEnvironment("environment.production.ts", true, prodUrl);

console.log(`Ambientes gerados. DEV: ${devUrl} | PROD: ${prodUrl}`);
