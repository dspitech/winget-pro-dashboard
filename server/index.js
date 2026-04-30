#!/usr/bin/env node
const express = require("express");
const cors = require("cors");
const { exec, spawn } = require("child_process");
const os = require("os");

const app = express();
const PORT = 3001;
const HOST = "127.0.0.1";
const POWERSHELL_EXE = process.env.WINGET_POWERSHELL || "powershell";

// ─── DÉTECTION / AUTO-ÉLÉVATION ─────────────────────────────────────────────

/**
 * Vérifie si le processus actuel possède les droits administrateur
 */
function checkIsAdmin() {
  return new Promise((resolve) => {
    // La commande 'net session' échoue systématiquement sans droits admin
    exec("net session", (err) => {
      resolve(!err);
    });
  });
}

/**
 * Relance le serveur en mode Administrateur si nécessaire
 */
async function ensureAdmin() {
  const isAdmin = await checkIsAdmin();
  
  if (!isAdmin && process.platform === "win32") {
    console.log("🛡️  Droits administrateur requis. Tentative d'élévation...");
    
    // Commande pour relancer node avec les privilèges admin via PowerShell
    const command = `Start-Process node -ArgumentList '"${process.argv[1]}"' -Verb RunAs`;
    
    exec(`powershell -Command "${command}"`, (err) => {
      if (err) {
        console.error("❌ Échec de l'élévation des privilèges :", err.message);
      }
      process.exit(); // Ferme l'instance actuelle (non-admin)
    });
    return false;
  }
  return true;
}

// ─── INITIALISATION DU SERVEUR ──────────────────────────────────────────────

async function init() {
  const isAdmin = await checkIsAdmin();
  app.use(cors({ origin: "*" }));
  app.use(express.json());

  function runPowerShell(command, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
      // Utiliser spawn pour mieux gérer les erreurs
      const child = spawn(POWERSHELL_EXE, [
        "-NonInteractive",
        "-NoProfile",
        "-Command",
        command
      ], {
        shell: false,
        windowsHide: true
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`Timeout après ${timeoutMs}ms`));
      }, timeoutMs);

      child.on("close", (code) => {
        clearTimeout(timeout);
        // Winget peut retourner code 1 même en cas de succès partiel
        // Si on a du stdout, on le retourne même si code !== 0
        if (stdout.trim()) {
          resolve(stdout);
        } else if (code === 0) {
          resolve(stdout || "");
        } else {
          const error = new Error(`Command failed with code ${code}: ${stderr || "No output"}`);
          error.code = code;
          reject(error);
        }
      });

      child.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  // ─── Helpers parsing sortie winget (tableau texte) ─────────────────────────

  function findDataStartIndex(lines) {
    const idx = lines.findIndex((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      const noDashes = trimmed.replace(/-/g, "").trim();
      return !noDashes && trimmed.includes("-");
    });
    return idx >= 0 ? idx + 1 : 0;
  }

  function parseWingetList(output) {
    const lines = output.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
    const start = findDataStartIndex(lines);
    const apps = [];

    for (let i = start; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;
      // Format standard : Nom (0-34) | Id (35-69) | Version (70+)
      const name = line.slice(0, 35).trim();
      const id = line.slice(35, 70).trim();
      const rest = line.slice(70).trim();
      if (!name || !id || !rest) continue;
      const [version] = rest.split(/\s+/);
      if (!version) continue;
      apps.push({ name, id, version });
    }
    return apps;
  }

  function parseWingetUpgrade(output) {
    const lines = output.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
    const start = findDataStartIndex(lines);
    const apps = [];

    for (let i = start; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;
      const name = line.slice(0, 35).trim();
      const id = line.slice(35, 70).trim();
      const rest = line.slice(70).trim();
      if (!name || !id || !rest) continue;
      const parts = rest.split(/\s+/).filter(Boolean);
      if (parts.length < 2) continue;
      const [currentVersion, availableVersion] = parts;
      apps.push({ name, id, currentVersion, availableVersion });
    }
    return apps;
  }

  function parseWingetSearch(output) {
    const lines = output.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
    const start = findDataStartIndex(lines);
    const results = [];

    for (let i = start; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;
      const name = line.slice(0, 35).trim();
      const id = line.slice(35, 70).trim();
      const rest = line.slice(70).trim();
      if (!name || !id || !rest) continue;
      const parts = rest.split(/\s+/).filter(Boolean);
      const version = parts[0] || "N/A";
      const source = parts[1] || "winget";
      results.push({ name, id, version, source });
    }
    return results;
  }

  function setupSSE(res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }
    const sendEvent = (type, data) => {
      res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    };
    return sendEvent;
  }

  // ─── ROUTES API ───────────────────────────────────────────────────────────

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, server: true, timestamp: new Date().toISOString() });
  });

  app.get("/api/status", async (req, res) => {
    try {
      const [wingetOutput, psOutput] = await Promise.all([
        runPowerShell("winget --version", 5000),
        runPowerShell("$PSVersionTable.PSVersion.ToString()", 5000).catch(() => "N/A"),
      ]);
      res.json({ 
        ok: true, 
        server: true,
        isAdmin,
        wingetAvailable: true,
        wingetVersion: wingetOutput.trim(),
        powershellVersion: psOutput.trim(),
        platform: `${os.platform()} ${os.release()}`,
        hostname: os.hostname(),
        user: os.userInfo().username,
      });
    } catch (err) {
      res.json({
        ok: true,
        server: true,
        isAdmin,
        wingetAvailable: false,
        platform: `${os.platform()} ${os.release()}`,
        hostname: os.hostname(),
        user: os.userInfo().username,
        error: "winget non disponible dans ce terminal",
      });
    }
  });

  // ─── Inventaire complet des applications installées ────────────────────────

  app.get("/api/inventory", async (req, res) => {
    try {
      let listOutput = "";
      let upgradeOutput = "";

      // Essayer d'abord avec la commande standard
      try {
        listOutput = await runPowerShell("winget list --accept-source-agreements", 120000);
      } catch (err) {
        // Si ça échoue, essayer sans --accept-source-agreements
        console.warn("Tentative avec --accept-source-agreements échouée, réessai sans...");
        try {
          listOutput = await runPowerShell("winget list", 120000);
        } catch (err2) {
          console.error("Erreur /api/inventory (list):", err2);
          return res.status(500).json({ error: `Erreur lors de l'inventaire winget: ${err2.message}` });
        }
      }

      // Essayer de récupérer les mises à jour (non bloquant)
      try {
        upgradeOutput = await runPowerShell("winget upgrade --include-unknown --accept-source-agreements", 120000);
      } catch (err) {
        try {
          upgradeOutput = await runPowerShell("winget upgrade --include-unknown", 120000);
        } catch (err2) {
          console.warn("Impossible de récupérer les mises à jour:", err2.message);
          upgradeOutput = "";
        }
      }

      const listApps = parseWingetList(listOutput);
      const upgradeApps = upgradeOutput ? parseWingetUpgrade(upgradeOutput) : [];
      const upgradesById = new Map();
      for (const u of upgradeApps) {
        upgradesById.set(u.id, u);
      }

      const apps = listApps.map((app) => {
        const up = upgradesById.get(app.id);
        const available = up?.availableVersion || null;
        const status = available ? "update-available" : "up-to-date";
        return {
          name: app.name,
          id: app.id,
          version: app.version,
          available,
          source: "winget",
          status,
        };
      });

      const total = apps.length;
      const updates = apps.filter((a) => a.status === "update-available").length;
      const upToDate = total - updates;

      res.json({
        apps,
        total,
        upToDate,
        updates,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Erreur /api/inventory:", err);
      res.status(500).json({ error: `Erreur lors de l'inventaire winget: ${err.message}` });
    }
  });

  // ─── Recherche de packages ──────────────────────────────────────────────────

  app.get("/api/search", async (req, res) => {
    const q = (req.query.q || "").toString().trim();
    if (!q) {
      return res.status(400).json({ error: "Paramètre q requis" });
    }
    try {
      const output = await runPowerShell(
        `winget search "${q.replace(/"/g, '\\"')}" --accept-source-agreements`,
        60000
      );
      const results = parseWingetSearch(output);
      res.json({
        results,
        query: q,
        total: results.length,
      });
    } catch (err) {
      console.error("Erreur /api/search:", err);
      res.status(500).json({ error: "Erreur lors de la recherche winget" });
    }
  });

  // ─── Mises à jour disponibles ──────────────────────────────────────────────

  app.get("/api/updates", async (req, res) => {
    try {
      let output = "";
      
      // Essayer d'abord avec --accept-source-agreements
      try {
        output = await runPowerShell(
          "winget upgrade --include-unknown --accept-source-agreements",
          120000
        );
      } catch (err) {
        // Si ça échoue, essayer sans --accept-source-agreements
        try {
          output = await runPowerShell(
            "winget upgrade --include-unknown",
            120000
          );
        } catch (err2) {
          // Si ça échoue aussi, cela peut signifier qu'il n'y a pas de mises à jour disponibles
          // Winget retourne parfois un code d'erreur dans ce cas, ce qui est normal
          console.warn("Aucune mise à jour disponible ou erreur winget:", err2.message);
          return res.json({
            updates: [],
            total: 0,
            timestamp: new Date().toISOString(),
          });
        }
      }
      
      // Si la sortie est vide, il n'y a pas de mises à jour
      if (!output || !output.trim()) {
        return res.json({
          updates: [],
          total: 0,
          timestamp: new Date().toISOString(),
        });
      }
      
      const upgrades = parseWingetUpgrade(output).map((app) => ({
        name: app.name,
        id: app.id,
        version: app.currentVersion,
        available: app.availableVersion,
        source: "winget",
        status: "update-available",
      }));

      res.json({
        updates: upgrades,
        total: upgrades.length,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Erreur /api/updates:", err);
      // En cas d'erreur, retourner une liste vide plutôt qu'une erreur 500
      res.json({
        updates: [],
        total: 0,
        timestamp: new Date().toISOString(),
        error: err.message,
      });
    }
  });

  // ─── Installation d'un package (SSE) ───────────────────────────────────────

  app.post("/api/install", (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "ID requis" });

    const sendEvent = setupSSE(res);
    let lastMessage = "";
    let messageCount = 0;
    let progress = 0;
    const progressSteps = [
      "Initialisation...",
      "Vérification du package...",
      "Téléchargement...",
      "Vérification du hachage...",
      "Installation...",
      "Finalisation...",
    ];
    let currentStep = 0;

    sendEvent("start", `Installation de ${id} (Mode Admin)...`);
    sendEvent("progress", JSON.stringify({ step: currentStep, message: progressSteps[currentStep], percent: 0 }));

    const child = spawn(POWERSHELL_EXE, [
      "-NoProfile", 
      "-Command", 
      `winget install --id "${id}" --silent --accept-package-agreements --accept-source-agreements`
    ]);

    const processOutput = (data) => {
      const text = data.toString().trim();
      if (!text) return;

      // Filtrer les messages répétitifs
      if (text === lastMessage) {
        messageCount++;
        // Ne renvoyer que toutes les 10 répétitions
        if (messageCount % 10 !== 0) return;
      } else {
        lastMessage = text;
        messageCount = 0;
      }

      // Détecter les étapes de progression
      const lowerText = text.toLowerCase();
      if (lowerText.includes("hash") || lowerText.includes("hachage")) {
        currentStep = 3;
        progress = 50;
        sendEvent("progress", JSON.stringify({ step: currentStep, message: progressSteps[currentStep], percent: progress }));
      } else if (lowerText.includes("téléchargement") || lowerText.includes("download")) {
        currentStep = 2;
        progress = 30;
        sendEvent("progress", JSON.stringify({ step: currentStep, message: progressSteps[currentStep], percent: progress }));
      } else if (lowerText.includes("en attente") || lowerText.includes("waiting")) {
        currentStep = 1;
        progress = 15;
        sendEvent("progress", JSON.stringify({ step: currentStep, message: "En attente d'une autre installation...", percent: progress }));
      } else if (lowerText.includes("install") && !lowerText.includes("installé")) {
        currentStep = 4;
        progress = 70;
        sendEvent("progress", JSON.stringify({ step: currentStep, message: progressSteps[currentStep], percent: progress }));
      } else if (lowerText.includes("installé") || lowerText.includes("installed")) {
        currentStep = 5;
        progress = 100;
        sendEvent("progress", JSON.stringify({ step: currentStep, message: progressSteps[currentStep], percent: progress }));
      }

      // Envoyer uniquement les messages importants
      if (!lowerText.includes("en attente de la fin") || messageCount === 0) {
        sendEvent("output", text);
      }
    };

    child.stdout.on("data", processOutput);
    child.stderr.on("data", processOutput);
    
    child.on("close", (code) => {
      if (code === 0) {
        sendEvent("progress", JSON.stringify({ step: 5, message: "Installation terminée", percent: 100 }));
        sendEvent("success", `✓ ${id} installé avec succès`);
      } else {
        sendEvent("error", `✗ Échec de l'installation (code: ${code})`);
      }
      res.end();
    });
  });

  // ─── Désinstallation d'un package (SSE) ────────────────────────────────────

  app.post("/api/uninstall", (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "ID requis" });

    const sendEvent = setupSSE(res);

    sendEvent("start", `Désinstallation de ${id} (Mode Admin)...`);

    const child = spawn(POWERSHELL_EXE, [
      "-NoProfile",
      "-Command",
      `winget uninstall --id "${id}" --silent`,
    ]);

    child.stdout.on("data", (data) => sendEvent("output", data.toString().trim()));
    child.stderr.on("data", (data) => sendEvent("output", data.toString().trim()));

    child.on("close", (code) => {
      if (code === 0) sendEvent("success", `✓ ${id} désinstallé`);
      else sendEvent("error", `✗ Échec (code: ${code})`);
      res.end();
    });
  });

  // ─── Mise à jour d'un package ou de tous (SSE) ────────────────────────────

  app.post("/api/upgrade", (req, res) => {
    const { id, all } = req.body || {};
    if (!id && !all) return res.status(400).json({ error: "ID ou all requis" });

    const sendEvent = setupSSE(res);

    const label = all ? "Mise à jour de toutes les applications" : `Mise à jour de ${id}`;
    sendEvent("start", `${label} (Mode Admin)...`);

    const command = all
      ? 'winget upgrade --all --silent --accept-package-agreements --accept-source-agreements'
      : `winget upgrade --id "${id}" --silent --accept-package-agreements --accept-source-agreements`;

    const child = spawn(POWERSHELL_EXE, ["-NoProfile", "-Command", command]);

    child.stdout.on("data", (data) => sendEvent("output", data.toString().trim()));
    child.stderr.on("data", (data) => sendEvent("output", data.toString().trim()));

    child.on("close", (code) => {
      if (code === 0) sendEvent("success", "✓ Mise à jour terminée");
      else sendEvent("error", `✗ Échec de la mise à jour (code: ${code})`);
      res.end();
    });
  });

  // ─── Scan complet (SSE) : status + sources + inventaire + mises à jour ────

  app.get("/api/scan", async (req, res) => {
    const sendEvent = setupSSE(res);

    const steps = [
      {
        id: "init",
        command: "winget --version --accept-source-agreements",
        handler: (out) => ({ version: out.trim() }),
      },
      {
        id: "sources",
        command: "winget source list",
        handler: (out) => {
          const lines = out.split(/\r?\n/).filter((l) => l.trim());
          const count = Math.max(0, lines.length - 2); // en enlevant header + séparateur
          return { sources: count };
        },
      },
      {
        id: "list",
        command: "winget list --accept-source-agreements",
        handler: (out) => {
          const apps = parseWingetList(out);
          return { count: apps.length };
        },
      },
      {
        id: "updates",
        command: "winget upgrade --include-unknown --accept-source-agreements",
        handler: (out) => {
          const updates = parseWingetUpgrade(out);
          return { updates: updates.length };
        },
      },
    ];

    try {
      let inventoryData = null;
      
      for (let index = 0; index < steps.length; index++) {
        const step = steps[index];
        sendEvent("step-start", { index });
        try {
          const output = await runPowerShell(step.command, 120000);
          const data = step.handler ? step.handler(output) : undefined;
          
          // Si c'est l'étape "list", récupérer l'inventaire complet
          if (step.id === "list") {
            try {
              const [listOutput, upgradeOutput] = await Promise.all([
                Promise.resolve(output),
                runPowerShell("winget upgrade --include-unknown --accept-source-agreements", 120000).catch(() => "")
              ]);
              
              const listApps = parseWingetList(listOutput);
              const upgradeApps = upgradeOutput ? parseWingetUpgrade(upgradeOutput) : [];
              const upgradesById = new Map();
              for (const u of upgradeApps) {
                upgradesById.set(u.id, u);
              }

              const apps = listApps.map((app) => {
                const up = upgradesById.get(app.id);
                const available = up?.availableVersion || null;
                const status = available ? "update-available" : "up-to-date";
                return {
                  name: app.name,
                  id: app.id,
                  version: app.version,
                  available,
                  source: "winget",
                  status,
                };
              });

              inventoryData = {
                apps,
                total: apps.length,
                upToDate: apps.filter((a) => a.status === "up-to-date").length,
                updates: apps.filter((a) => a.status === "update-available").length,
                timestamp: new Date().toISOString(),
              };
            } catch (invErr) {
              console.warn("Erreur lors de la récupération de l'inventaire complet:", invErr);
            }
          }
          
          sendEvent("step-done", { index, data });
        } catch (err) {
          console.error(`Erreur step ${step.id} /api/scan:`, err);
          sendEvent("step-done", { index, warn: true });
          // Ne pas arrêter le scan, continuer avec les autres étapes
        }
      }

      // Envoyer l'inventaire complet avec l'événement complete si disponible
      sendEvent("complete", { ok: true, inventory: inventoryData });
      res.end();
    } catch (err) {
      console.error("Erreur /api/scan:", err);
      sendEvent("error", "Erreur inattendue lors du scan");
      res.end();
    }
  });

  // ─── Informations réseau ──────────────────────────────────────────────────

  app.get("/api/network", async (req, res) => {
    try {
      const script = `
        $adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object Name, InterfaceDescription, MacAddress, LinkSpeed, Status
        $ipConfig = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null } | Select-Object -First 1
        $ip = $ipConfig.IPv4Address.IPAddress
        $gateway = $ipConfig.IPv4DefaultGateway.NextHop
        $dns = ($ipConfig.DNSServer | Where-Object { $_.AddressFamily -eq 2 }).ServerAddresses
        $subnet = (Get-NetIPAddress -InterfaceIndex $ipConfig.InterfaceIndex -AddressFamily IPv4).PrefixLength
        $firewall = (Get-NetFirewallProfile -Profile Domain,Public,Private | Select-Object Name, Enabled)
        $profile = (Get-NetConnectionProfile | Select-Object -First 1).NetworkCategory
        $publicIP = try { (Invoke-RestMethod -Uri 'https://api.ipify.org?format=json' -TimeoutSec 3).ip } catch { 'N/A' }
        
        @{
          adapters = $adapters | ForEach-Object { @{ name = $_.Name; description = $_.InterfaceDescription; mac = $_.MacAddress; speed = $_.LinkSpeed; status = $_.Status } }
          ip = $ip
          gateway = $gateway
          dns = $dns
          subnetPrefix = $subnet
          firewallProfiles = $firewall | ForEach-Object { @{ name = $_.Name; enabled = $_.Enabled } }
          networkProfile = $profile
          publicIP = $publicIP
        } | ConvertTo-Json -Depth 3
      `;
      const output = await runPowerShell(script, 15000);
      const data = JSON.parse(output.trim());
      res.json({ ok: true, ...data });
    } catch (err) {
      console.error("Erreur /api/network:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ─── Informations système détaillées ────────────────────────────────────────

  app.get("/api/system", async (req, res) => {
    try {
      const script = `
        $os = Get-CimInstance Win32_OperatingSystem
        $cpu = Get-CimInstance Win32_Processor
        $mem = Get-CimInstance Win32_PhysicalMemory
        $disk = Get-CimInstance Win32_DiskDrive | Select-Object -First 1
        $logicalDisk = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq 'C:' }
        $bios = Get-CimInstance Win32_BIOS
        $cs = Get-CimInstance Win32_ComputerSystem
        
        @{
          os = @{
            name = $os.Caption
            version = $os.Version
            build = $os.BuildNumber
            arch = $os.OSArchitecture
            installDate = $os.InstallDate.ToString('yyyy-MM-dd')
            lastBoot = $os.LastBootUpTime.ToString('yyyy-MM-dd HH:mm:ss')
          }
          cpu = @{
            name = $cpu.Name
            cores = $cpu.NumberOfCores
            threads = $cpu.NumberOfLogicalProcessors
            maxClock = [math]::Round($cpu.MaxClockSpeed / 1000, 2)
            cache = [math]::Round($cpu.L3CacheSize / 1024, 0)
            usage = (Get-CimInstance Win32_Processor).LoadPercentage
          }
          memory = @{
            totalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
            freeGB = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
            usedPercent = [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 0)
            speed = ($mem | Select-Object -First 1).Speed
            slots = $mem.Count
            type = if (($mem | Select-Object -First 1).SMBIOSMemoryType -eq 34) { 'DDR5' } elseif (($mem | Select-Object -First 1).SMBIOSMemoryType -eq 26) { 'DDR4' } else { 'DDR' }
          }
          storage = @{
            model = $disk.Model
            sizeGB = [math]::Round($disk.Size / 1GB, 0)
            freeGB = [math]::Round($logicalDisk.FreeSpace / 1GB, 0)
            totalGB = [math]::Round($logicalDisk.Size / 1GB, 0)
            freePercent = [math]::Round(($logicalDisk.FreeSpace / $logicalDisk.Size) * 100, 0)
            fileSystem = $logicalDisk.FileSystem
            mediaType = $disk.MediaType
          }
          machine = @{
            manufacturer = $cs.Manufacturer
            model = $cs.Model
            domain = $cs.Domain
            bios = $bios.SMBIOSBIOSVersion
          }
        } | ConvertTo-Json -Depth 3
      `;
      const output = await runPowerShell(script, 20000);
      const data = JSON.parse(output.trim());
      res.json({ ok: true, ...data });
    } catch (err) {
      console.error("Erreur /api/system:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.listen(PORT, HOST, () => {
    console.log(`
🚀 SERVEUR LOCAL WINGET ACTIF
-----------------------------
URL : http://${HOST}:${PORT}
API : http://${HOST}:${PORT}/api/health
SÉCURITÉ : ${isAdmin ? "Mode administrateur" : "Mode standard — scan OK, admin recommandé pour installation/désinstallation"}
    `);
  });
}

init();