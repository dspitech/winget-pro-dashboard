# 🚀 WinGet Admin Console — Guide d'installation locale

Ce guide explique comment faire communiquer le dashboard React avec votre PC Windows via winget.

## Architecture

```
┌─────────────────────────────┐       ┌──────────────────────────────────┐
│   Dashboard React           │       │   Serveur Local (Node.js)        │
│   http://127.0.0.1:5173     │ ────► │   http://127.0.0.1:3001/api/...  │
│   (avec proxy Vite)         │       │   → exécute les commandes winget  │
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

### 2. Installer les dépendances

```bash
npm install
cd server
npm install
cd ..
```

### 3. Lancer l'application locale complète

```bash
# À la racine du projet
npm run local
```

Cela démarre automatiquement :
- ✅ **Serveur backend** sur `http://127.0.0.1:3001`
- ✅ **Interface React** sur `http://127.0.0.1:5173` avec proxy Vite vers le backend

Vous devriez voir :
```
🚀 SERVEUR LOCAL WINGET ACTIF
-----------------------------
URL : http://127.0.0.1:3001
API : http://127.0.0.1:3001/api/health
SÉCURITÉ : Mode administrateur
```

### 4. Ouvrir le dashboard

Une fois que le serveur démarre, accédez à :
- **En local** : `http://127.0.0.1:5173`

La barre latérale détecte automatiquement le serveur et affiche **"PC connecté"** avec votre hostname, la version winget, puis lance le scan.

---

## 🔌 Routes API disponibles

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | Vérifie que le serveur fonctionne |
| GET | `/api/status` | Vérifie winget + hostname + droits admin |
| GET | `/api/inventory` | Liste toutes les apps installées |
| GET | `/api/search?q=query` | Recherche dans le catalogue winget |
| GET | `/api/updates` | Liste les mises à jour disponibles |
| POST | `/api/install` | Installe un package `{ id: "Package.Id" }` |
| POST | `/api/uninstall` | Désinstalle un package `{ id: "Package.Id" }` |
| POST | `/api/upgrade` | Met à jour `{ id }` ou `{ all: true }` |
| GET | `/api/scan` | Scan complet (SSE streaming) |
| GET | `/api/network` | Informations réseau détaillées |
| GET | `/api/system` | Informations système détaillées |

---

## 🔒 Droits administrateur

Pour **installer / désinstaller** des applications, lancez le terminal **en administrateur** :

```powershell
# Dans PowerShell (Admin)
cd C:\path\to\project
npm run local
```

---

## ⚠️ Communication Proxy Vite

Le serveur autorise toutes les origines (`*`) pour permettre l'accès depuis Lovable.
Pour la production, restreignez l'origine dans `server/index.js` :

```js
app.use(cors({ origin: "http://localhost:5173" }));
```

---

## 🎮 Mode démo

Si le serveur n'est pas lancé, l'application fonctionne en **mode démo** avec des données simulées.
L'indicateur dans la barre latérale indique l'état de connexion.
