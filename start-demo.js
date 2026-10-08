import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("==================================================");
console.log("🚀 INICIANDO MODO DEMO: MENÚ DIGITAL CON SQLITE");
console.log("==================================================");

// Iniciar Servidor API SQLite
const serverProcess = spawn("node", ["server.js"], {
  cwd: __dirname,
  stdio: "inherit",
  shell: true,
});

// Iniciar Vite
const viteProcess = spawn("npx", ["vite"], {
  cwd: __dirname,
  stdio: "inherit",
  shell: true,
});

const cleanup = () => {
  console.log("\n🛑 Deteniendo servicios demo...");
  serverProcess.kill();
  viteProcess.kill();
  process.exit();
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
