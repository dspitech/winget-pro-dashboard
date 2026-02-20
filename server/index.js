#!/usr/bin/env node
/**
 * WinGet Admin Console — Serveur API Local
 * ==========================================
 * Lance ce serveur sur votre machine Windows pour connecter
 * le dashboard React avec winget via PowerShell.
 *
 * Usage:
 *   cd server
 *   npm install
 *   npm start
 *
 * Port: 3001 (http://localhost:3001)
 */

const express = require("express");
const cors = require("cors");
const { exec, spawn } = require("child_process");

const app = express();
const PORT = 3001;

app.use(cors({ origin: "*" }));
app.use(express.json());

// ─── Utilitaires ────────────────────────────────────────────────────────────

/**
 * Exécute une commande PowerShell et retourne la sortie en string
 */
function runPowerShell(command, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const ps = `powershell -NonInteractive -NoProfile -Command "${command.replace(/"/g, '\\"')}"`;
    exec(ps, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err && !stdout) return reject(err);
      resolve(stdout || "");
    });
  });
}

/**
 * Parse la sortie texte de `winget list`
 * Extrait: Nom, ID, Version, Disponible, Source
 */
function parseWingetList(output) {
  const lines = output.split(/\r?\n/);
  const apps = [];

  // Trouver la ligne d'en-tête (contient "Name" et "Id")
  let headerIdx = -1;
  let headerLine = "";
  for (let i = 0; i < lines.length; i++) {
    if (/\bName\b.*\bId\b.*\bVersion\b/i.test(lines[i])) {
      headerIdx = i;
      headerLine = lines[i];
      break;
    }
  }

  if (headerIdx === -1) return apps;

  // Détecter les colonnes par leurs positions
  const nameStart = headerLine.search(/Name/i);
  const idStart = headerLine.search(/Id/i);
  const versionStart = headerLine.search(/Version/i);
  const availableStart = headerLine.search(/Available/i);
  const sourceStart = headerLine.search(/Source/i);

  // Lire les données (après la ligne de séparation)
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("---")) continue;
    if (line.trim().length < 5) continue;

    const name = line.substring(nameStart, idStart).trim();
    const id = line.substring(idStart, versionStart).trim();
    const version = availableStart > 0
      ? line.substring(versionStart, availableStart).trim()
      : line.substring(versionStart, sourceStart > 0 ? sourceStart : undefined).trim();
    const available = availableStart > 0 && sourceStart > 0
      ? line.substring(availableStart, sourceStart).trim()
      : "";
    const source = sourceStart > 0 ? line.substring(sourceStart).trim() : "winget";

    if (name && id && version) {
      apps.push({
        name,
        id,
        version,
        available: available || null,
        source: source || "winget",
        status: available ? "update-available" : "up-to-date",
      });
    }
  }

  return apps;
}

/**
 * Parse la sortie de `winget search`
 */
function parseWingetSearch(output) {
  const lines = output.split(/\r?\n/);
  const results = [];

  let headerIdx = -1;
  let headerLine = "";
  for (let i = 0; i < lines.length; i++) {
    if (/\bName\b.*\bId\b.*\bVersion\b/i.test(lines[i])) {
      headerIdx = i;
      headerLine = lines[i];
      break;
    }
  }

  if (headerIdx === -1) return results;

  const nameStart = headerLine.search(/Name/i);
  const idStart = headerLine.search(/Id/i);
  const versionStart = headerLine.search(/Version/i);
  const matchStart = headerLine.search(/Match/i);
  const sourceStart = headerLine.search(/Source/i);

  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("---")) continue;
    if (line.trim().length < 5) continue;

    const name = line.substring(nameStart, idStart).trim();
    const id = line.substring(idStart, versionStart).trim();
    const version = matchStart > 0
      ? line.substring(versionStart, matchStart).trim()
      : line.substring(versionStart, sourceStart > 0 ? sourceStart : undefined).trim();
    const source = sourceStart > 0 ? line.substring(sourceStart).trim() : "winget";

    if (name && id) {
      results.push({ name, id, version: version || "N/A", source: source || "winget" });
    }
  }

  return results;
}

// ─── Routes API ─────────────────────────────────────────────────────────────

/**
 * GET /api/status
 * Vérifie que winget est disponible sur le système
 */
app.get("/api/status", async (req, res) => {
  try {
    const output = await runPowerShell("winget --version", 5000);
    const version = output.trim();
    res.json({
      ok: true,
      wingetVersion: version,
      platform: process.platform,
      hostname: require("os").hostname(),
      user: require("os").userInfo().username,
    });
  } catch (err) {
    res.status(503).json({ ok: false, error: "winget non disponible", detail: err.message });
  }
});

/**
 * GET /api/inventory
 * Lance `winget list` et retourne les applications parsées
 */
app.get("/api/inventory", async (req, res) => {
  try {
    console.log("[winget] Exécution: winget list...");
    const output = await runPowerShell("winget list --accept-source-agreements 2>&1", 90000);
    const apps = parseWingetList(output);
    console.log(`[winget] ${apps.length} applications trouvées`);
    res.json({
      apps,
      total: apps.length,
      upToDate: apps.filter((a) => a.status === "up-to-date").length,
      updates: apps.filter((a) => a.status === "update-available").length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[winget] Erreur inventory:", err.message);
    res.status(500).json({ error: "Erreur lors de l'inventaire", detail: err.message });
  }
});

/**
 * GET /api/search?q=query
 * Lance `winget search <query>` et retourne les résultats
 */
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Paramètre q requis" });

  try {
    console.log(`[winget] Recherche: "${query}"`);
    const output = await runPowerShell(
      `winget search "${query}" --accept-source-agreements 2>&1`,
      30000
    );
    const results = parseWingetSearch(output);
    console.log(`[winget] ${results.length} résultats pour "${query}"`);
    res.json({ results, query, total: results.length });
  } catch (err) {
    console.error("[winget] Erreur search:", err.message);
    res.status(500).json({ error: "Erreur lors de la recherche", detail: err.message });
  }
});

/**
 * GET /api/updates
 * Liste uniquement les apps avec mises à jour disponibles
 */
app.get("/api/updates", async (req, res) => {
  try {
    console.log("[winget] Vérification des mises à jour...");
    const output = await runPowerShell(
      "winget upgrade --include-unknown --accept-source-agreements 2>&1",
      90000
    );
    const apps = parseWingetList(output);
    const updates = apps.filter((a) => a.status === "update-available");
    res.json({ updates, total: updates.length, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Erreur mises à jour", detail: err.message });
  }
});

/**
 * POST /api/install
 * Body: { id: "Package.Id" }
 * Installe un package via winget (streaming SSE)
 */
app.post("/api/install", (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Package ID requis" });

  console.log(`[winget] Installation: ${id}`);

  // Server-Sent Events pour le streaming en temps réel
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n\n`);
  };

  sendEvent("start", `Installation de ${id}...`);
  sendEvent("cmd", `winget install --id ${id} --silent --accept-package-agreements --accept-source-agreements`);

  const child = spawn("powershell", [
    "-NonInteractive", "-NoProfile", "-Command",
    `winget install --id "${id}" --silent --accept-package-agreements --accept-source-agreements 2>&1`,
  ]);

  child.stdout.on("data", (data) => {
    const text = data.toString().trim();
    if (text) sendEvent("output", text);
  });

  child.stderr.on("data", (data) => {
    const text = data.toString().trim();
    if (text) sendEvent("output", text);
  });

  child.on("close", (code) => {
    if (code === 0) {
      sendEvent("success", `✓ ${id} installé avec succès`);
    } else {
      sendEvent("error", `✗ Échec de l'installation (code: ${code})`);
    }
    res.end();
  });

  child.on("error", (err) => {
    sendEvent("error", `✗ Erreur: ${err.message}`);
    res.end();
  });

  req.on("close", () => child.kill());
});

/**
 * POST /api/uninstall
 * Body: { id: "Package.Id" }
 */
app.post("/api/uninstall", (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Package ID requis" });

  console.log(`[winget] Désinstallation: ${id}`);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n\n`);
  };

  sendEvent("start", `Désinstallation de ${id}...`);
  sendEvent("cmd", `winget uninstall --id ${id} --silent`);

  const child = spawn("powershell", [
    "-NonInteractive", "-NoProfile", "-Command",
    `winget uninstall --id "${id}" --silent 2>&1`,
  ]);

  child.stdout.on("data", (data) => {
    const text = data.toString().trim();
    if (text) sendEvent("output", text);
  });

  child.stderr.on("data", (data) => {
    const text = data.toString().trim();
    if (text) sendEvent("output", text);
  });

  child.on("close", (code) => {
    if (code === 0) {
      sendEvent("success", `✓ ${id} désinstallé avec succès`);
    } else {
      sendEvent("error", `✗ Échec de la désinstallation (code: ${code})`);
    }
    res.end();
  });

  child.on("error", (err) => {
    sendEvent("error", `✗ Erreur: ${err.message}`);
    res.end();
  });

  req.on("close", () => child.kill());
});

/**
 * POST /api/upgrade
 * Body: { id: "Package.Id" } ou { all: true }
 */
app.post("/api/upgrade", (req, res) => {
  const { id, all } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n\n`);
  };

  const psCmd = all
    ? `winget upgrade --all --silent --accept-package-agreements --accept-source-agreements 2>&1`
    : `winget upgrade --id "${id}" --silent --accept-package-agreements --accept-source-agreements 2>&1`;

  console.log(`[winget] Upgrade: ${all ? "--all" : id}`);
  sendEvent("start", all ? "Mise à jour de toutes les applications..." : `Mise à jour de ${id}...`);
  sendEvent("cmd", psCmd.replace(" 2>&1", ""));

  const child = spawn("powershell", ["-NonInteractive", "-NoProfile", "-Command", psCmd]);

  child.stdout.on("data", (data) => {
    const text = data.toString().trim();
    if (text) sendEvent("output", text);
  });

  child.stderr.on("data", (data) => {
    const text = data.toString().trim();
    if (text) sendEvent("output", text);
  });

  child.on("close", (code) => {
    if (code === 0) {
      sendEvent("success", `✓ Mise à jour réussie`);
    } else {
      sendEvent("error", `✗ Échec mise à jour (code: ${code})`);
    }
    res.end();
  });

  child.on("error", (err) => {
    sendEvent("error", `✗ Erreur: ${err.message}`);
    res.end();
  });

  req.on("close", () => child.kill());
});

/**
 * GET /api/scan — Scan complet du système (SSE streaming)
 */
app.get("/api/scan", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n\n`);
  };

  const steps = [
    {
      id: "init",
      label: "Initialisation winget",
      cmd: "winget --version",
      parse: (out) => ({ version: out.trim() }),
    },
    {
      id: "sources",
      label: "Vérification des sources",
      cmd: "winget source list",
      parse: () => ({}),
    },
    {
      id: "list",
      label: "Inventaire des applications",
      cmd: "winget list --accept-source-agreements 2>&1",
      parse: (out) => {
        const apps = parseWingetList(out);
        return { count: apps.length };
      },
    },
    {
      id: "updates",
      label: "Détection des mises à jour",
      cmd: "winget upgrade --include-unknown --accept-source-agreements 2>&1",
      parse: (out) => {
        const apps = parseWingetList(out);
        return { updates: apps.filter((a) => a.status === "update-available").length };
      },
    },
  ];

  let stepIndex = 0;

  const runNextStep = () => {
    if (stepIndex >= steps.length) {
      sendEvent("complete", { message: "Scan terminé avec succès" });
      return res.end();
    }

    const step = steps[stepIndex];
    sendEvent("step-start", { id: step.id, label: step.label, index: stepIndex });

    exec(`powershell -NonInteractive -NoProfile -Command "${step.cmd.replace(/"/g, '\\"')}"`,
      { timeout: 120000, maxBuffer: 5 * 1024 * 1024 },
      (err, stdout) => {
        let parsed = {};
        try {
          parsed = step.parse(stdout || "");
        } catch (_) {}
        sendEvent("step-done", { id: step.id, label: step.label, index: stepIndex, data: parsed, warn: !!err });
        stepIndex++;
        runNextStep();
      }
    );
  };

  runNextStep();
  req.on("close", () => {});
});

// ─── Démarrage ───────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║       WinGet Admin Console — Serveur Local API       ║
╠══════════════════════════════════════════════════════╣
║  ✓ Serveur démarré sur http://localhost:${PORT}       ║
║  ✓ Prêt à recevoir des commandes winget              ║
╠══════════════════════════════════════════════════════╣
║  Routes disponibles:                                 ║
║   GET  /api/status      → Vérification winget        ║
║   GET  /api/inventory   → Liste des apps installées  ║
║   GET  /api/search?q=   → Recherche winget           ║
║   GET  /api/updates     → Mises à jour disponibles   ║
║   POST /api/install     → Installer un package       ║
║   POST /api/uninstall   → Désinstaller un package    ║
║   POST /api/upgrade     → Mettre à jour un package   ║
║   GET  /api/scan        → Scan système complet       ║
╚══════════════════════════════════════════════════════╝
  `);
});

process.on("uncaughtException", (err) => {
  console.error("[Server] Erreur non gérée:", err.message);
});
