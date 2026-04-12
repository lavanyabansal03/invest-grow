/**
 * Run Flask from server/main.py using server/.venv when present (Windows + Unix).
 * Otherwise falls back to `python` (Windows) or `python3` (macOS/Linux).
 */
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const serverDir = path.join(root, "server");

const venvPython =
  process.platform === "win32"
    ? path.join(serverDir, ".venv", "Scripts", "python.exe")
    : path.join(serverDir, ".venv", "bin", "python");

let command = venvPython;
let shell = false;
if (!fs.existsSync(venvPython)) {
  command = process.platform === "win32" ? "python" : "python3";
  shell = process.platform === "win32";
}

const child = spawn(command, ["main.py"], {
  cwd: serverDir,
  stdio: "inherit",
  shell,
  env: { ...process.env },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
