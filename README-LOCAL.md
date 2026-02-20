# 🚀 WinGet Admin Console — Guide d'installation locale

Ce guide explique comment faire communiquer le dashboard React avec votre PC Windows via winget.

## Architecture

```
┌─────────────────────────────┐       ┌──────────────────────────────────┐
│   Dashboard React           │       │   Serveur Local (Node.js)        │
│   http://localhost:5173     │ ────► │   http://localhost:3001/api/...  │
│   (ou lovable.app)          │       │   → exécute les commandes winget  │
└─────────────────────────────┘       └──────────────────────────────────┘
                                                      │
                                                      ▼
                                         PowerShell → winget
                                         (votre machine Windows)
```

## 📋 Prérequis

- **Windows 10/11** avec winget installé
- **Node.js 18+** : https://nodejs.org
- **PowerShell 5.1+** ou PowerShell 7 (recommandé)

Vérifiez que winget fonctionne :
```powershell
winget --version
```

## ⚡ Démarrage rapide

### 1. Cloner / télécharger le projet

```bash
git clone https://github.com/dspitech/Winget-inventory-report.git
cd Winget-inventory-report
```

### 2. Installer les dépendances du serveur

```bash
cd server
npm install
```

### 3. Lancer le serveur API local

```bash
# Dans le dossier server/
npm start
```

Vous devriez voir :
```
╔══════════════════════════════════════════════════════╗
║       WinGet Admin Console — Serveur Local API       ║
╠══════════════════════════════════════════════════════╣
║  ✓ Serveur démarré sur http://localhost:3001         ║
╚══════════════════════════════════════════════════════╝
```

### 4. Ouvrir le dashboard

Ouvrez votre navigateur sur :
- **Depuis Lovable** : https://id-preview--7a8cb5e9-1bd7-4881-8d13-345c3712a73e.lovable.app
- **En local** : `npm run dev` dans le dossier racine, puis http://localhost:5173

La barre latérale affichera **"PC connecté"** avec votre hostname et version winget.

---

## 🔌 Routes API disponibles

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/status` | Vérifie winget + hostname |
| GET | `/api/inventory` | Liste toutes les apps installées |
| GET | `/api/search?q=query` | Recherche dans le catalogue winget |
| GET | `/api/updates` | Liste les mises à jour disponibles |
| POST | `/api/install` | Installe un package `{ id: "Package.Id" }` |
| POST | `/api/uninstall` | Désinstalle un package `{ id: "Package.Id" }` |
| POST | `/api/upgrade` | Met à jour `{ id }` ou `{ all: true }` |
| GET | `/api/scan` | Scan complet (SSE streaming) |

---

## 🔒 Droits administrateur

Pour **installer / désinstaller** des applications, lancez le terminal en **administrateur** :

```powershell
# Dans PowerShell (Admin)
cd server
npm start
```

---

## ⚠️ Note CORS

Le serveur autorise toutes les origines (`*`) pour permettre l'accès depuis Lovable.
Pour la production, restreignez l'origine dans `server/index.js` :

```js
app.use(cors({ origin: "http://localhost:5173" }));
```

---

## 🎮 Mode démo

Si le serveur n'est pas lancé, l'application fonctionne en **mode démo** avec des données simulées.
L'indicateur dans la barre latérale indique l'état de connexion.
