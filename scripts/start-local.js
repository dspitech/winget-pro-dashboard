import { spawn } from "node:child_process";
import process from "node:process";

const isWindows = process.platform === "win32";

// Construire les commandes complètes en string pour shell: true
const commands = [
  { name: "Serveur Winget", command: "npm --prefix server start" },
  { name: "Interface", command: "npm run dev" },
];

const children = commands.map(({ name, command }) => {
  // Avec shell: true, passer la commande en string (pas de tableau)
  const child = spawn(command, [], {
    stdio: "inherit",
    shell: true,  // Nécessaire pour Windows et npm
    cwd: process.cwd(),
  });

  child.on("exit", (code) => {
    if (code) console.error(`${name} arrêté avec le code ${code}`);
  });

  child.on("error", (err) => {
    console.error(`${name} erreur:`, err.message);
  });

  return child;
});

function stopAll() {
  for (const child of children) {
    try {
      child.kill();
    } catch {
      // Ignorer les erreurs si le process est déjà terminé
    }
  }
  process.exit();
}

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);