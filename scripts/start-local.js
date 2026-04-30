import { spawn } from "node:child_process";
import process from "node:process";

const isWindows = process.platform === "win32";
const commands = [
  { name: "Serveur Winget", command: "npm", args: ["--prefix", "server", "start"] },
  { name: "Interface", command: "npm", args: ["run", "dev", "--", "--host", "127.0.0.1"] },
];

const children = commands.map(({ name, command, args }) => {
  const child = spawn(isWindows ? `${command}.cmd` : command, args, {
    stdio: "inherit",
    shell: false,
  });

  child.on("exit", (code) => {
    if (code) console.error(`${name} arrêté avec le code ${code}`);
  });

  return child;
});

function stopAll() {
  for (const child of children) child.kill();
  process.exit();
}

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);