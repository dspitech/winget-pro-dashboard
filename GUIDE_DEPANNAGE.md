# 🐛 Guide de dépannage - Connexion serveur

Si vous rencontrez toujours des problèmes de connexion, utilisez ce guide.

## 🔴 Symptômes et solutions

### Symptôme 1: "Serveur indisponible - lancez npm run local"

**Diagnostic** :
```bash
# 1. Vérifier que le serveur démarre
npm run local

# 2. Dans une autre console, tester l'API directement
curl http://127.0.0.1:3001/api/health

# 3. Si ça marche en curl mais pas dans le navigateur, c'est un problème de proxy
```

**Solutions** :
- [ ] Vérifier que les deux terminaux affichent les messages de démarrage
- [ ] Attendre 2-3 secondes après le lancement
- [ ] Vérifier les erreurs dans la console du serveur
- [ ] Redémarrer : `npm run local`

---

### Symptôme 2: "Erreur CORS" dans DevTools

**Message** : `Access to XMLHttpRequest at 'http://127.0.0.1:3001/api/...' blocked by CORS`

**Cause possible** : Le proxy Vite ne fonctionne pas correctement

**Solutions** :
- [ ] Vérifier le contenu de [vite.config.ts](vite.config.ts) - doit avoir le proxy `/api`
- [ ] Vérifier que Vite démarre sur le bon port (`5173`)
- [ ] Vérifier que vous naviguez à `http://127.0.0.1:5173` et pas `localhost:5173`
- [ ] Nettoyer le cache navigateur : Ctrl+Shift+Delete

```bash
# Redémarrer Vite complètement
npm run dev
# ou
npm run local
```

---

### Symptôme 3: "Le serveur démarre mais pas la connexion"

**Diagnostic** :

1. **Ouvrir DevTools** (F12) → Network tab
2. **Recharger la page** (Ctrl+R)
3. **Rechercher les requêtes `health`** ou `status`
4. **Vérifier le statut HTTP** :
   - `200` ✅ : La requête fonctionne
   - `0` ou `failed` ❌ : Proxy ne fonctionne pas
   - `500` ❌ : Erreur serveur

**Solutions selon le statut** :

#### Statut 0 / Failed (Proxy problem)
```bash
# Vérifier la config Vite
cat vite.config.ts | grep -A 5 "proxy"

# Doit afficher quelque chose comme:
# proxy: {
#   "/api": {
#     target: "http://127.0.0.1:3001",
```

#### Statut 500 (Server error)
```bash
# Regarder la console du serveur pour les erreurs
# Ctrl+C pour arrêter
# npm run local  pour redémarrer
```

---

### Symptôme 4: "Port 3001 déjà utilisé"

**Message d'erreur** : `listen EADDRINUSE: address already in use :::3001`

**Solutions** :

```bash
# Sur Windows, trouver le process sur le port 3001
netstat -ano | findstr :3001

# Tuer le process (remplacer PID par le numéro)
taskkill /PID <PID> /F

# Ou simplement redémarrer l'application
npm run local
```

---

### Symptôme 5: "Pas de données - inventaire vide"

**Cause possible** : PowerShell ne peut pas exécuter winget

**Diagnostic** :

```bash
# Vérifier que winget est installé
winget --version

# Si rien n'apparaît, winget n'est pas dans le PATH
# Essayer le chemin complet
C:\Users\[USERNAME]\AppData\Local\Microsoft\WindowsApps\winget.exe --version
```

**Solutions** :

- [ ] Installer winget : https://learn.microsoft.com/windows/package-manager/
- [ ] Redémarrer le terminal après installation
- [ ] Lancer en **mode administrateur**

```bash
# Lancer PowerShell en admin et réessayer
npm run local
```

---

### Symptôme 6: "Accès refusé - mode administrateur requis"

**Message** : "Mode standard — scan OK, admin recommandé pour installation/désinstallation"

**Solutions** :

```bash
# Lancer PowerShell en tant qu'administrateur
# Puis redémarrer
npm run local
```

---

## 🔧 Test manuel de l'API

Si vous voulez tester directement sans l'interface :

### Test 1: Health check
```bash
curl http://127.0.0.1:3001/api/health
# Résultat attendu: {"ok":true,"server":true,"timestamp":"..."}
```

### Test 2: Status serveur
```bash
curl http://127.0.0.1:3001/api/status
# Résultat attendu: infos système, version winget, etc.
```

### Test 3: Inventaire
```bash
curl http://127.0.0.1:3001/api/inventory
# Résultat attendu: liste des applications JSON
```

### Test 4: Via Vite proxy (depuis le port 5173)
```bash
# Dans DevTools Console du navigateur ouvert sur 127.0.0.1:5173
fetch('/api/health').then(r => r.json()).then(console.log)
```

---

## 📋 Checklist de dépannage complète

- [ ] **Node.js 18+** : `node --version`
- [ ] **npm** : `npm --version`
- [ ] **Dépendances installées** : dossier `node_modules` existe
- [ ] **Dépendances serveur** : dossier `server/node_modules` existe
- [ ] **winget installé** : `winget --version` fonctionne
- [ ] **vite.config.ts** a le proxy `/api`
- [ ] **Pas de port 3001 occupé** : `netstat -ano | findstr :3001` vide
- [ ] **Pas de port 5173 occupé** : `netstat -ano | findstr :5173` vide
- [ ] **Navigateur sur IP correcte** : `http://127.0.0.1:5173`
- [ ] **DevTools Network tab** affiche les requêtes `/api`

---

## 🆘 Si rien ne marche

```bash
# 1. Arrêter tous les process
npm run local  # Ctrl+C

# 2. Nettoyer
rm -r node_modules
rm -r server/node_modules
rm package-lock.json

# 3. Réinstaller
npm install --legacy-peer-deps
cd server && npm install && cd ..

# 4. Redémarrer
npm run local
```

---

## 📞 Informations supplémentaires

**Fichiers de configuration clés** :
- [vite.config.ts](vite.config.ts) - Configuration développement
- [server/index.js](server/index.js) - API backend
- [src/lib/winget-api.ts](src/lib/winget-api.ts) - Client API

**Ports utilisés** :
- `5173` : Interface React
- `3001` : API backend

**Erreurs courantes** :
- Port déjà utilisé → Tuer le process ou attendre
- CORS → Vérifier le proxy Vite
- Pas de données → Vérifier winget et droits admin
- Connection refused → Vérifier que les deux services démarrent

