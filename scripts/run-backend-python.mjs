import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const configuredPython = process.env.BACKEND_PYTHON;
const venvPythonWindows = path.join(repoRoot, ".venv", "Scripts", "python.exe");
const venvPythonUnix = path.join(repoRoot, ".venv", "bin", "python");

const pythonExecutable =
  configuredPython ??
  (existsSync(venvPythonWindows)
    ? venvPythonWindows
    : existsSync(venvPythonUnix)
      ? venvPythonUnix
      : "python");

const result = spawnSync(pythonExecutable, process.argv.slice(2), {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
