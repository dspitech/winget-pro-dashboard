#!/usr/bin/env node
/**
 * Script de vérification rapide - Test de connectivité
 * Usage: node verify-setup.js
 */

const http = require('http');
const { execSync } = require('child_process');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testUrl(url, timeout = 2000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    }).on('error', () => resolve(false));
    
    setTimeout(() => {
      req.abort();
      resolve(false);
    }, timeout);
  });
}

async function verify() {
  log('\n🔍 Vérification de la configuration du projet...\n', 'blue');

  const checks = [];

  // 1. Vérifier Node.js
  try {
    const nodeVersion = execSync('node --version').toString().trim();
    log(`✅ Node.js: ${nodeVersion}`, 'green');
    checks.push(true);
  } catch {
    log('❌ Node.js non trouvé', 'red');
    checks.push(false);
  }

  // 2. Vérifier npm
  try {
    const npmVersion = execSync('npm --version').toString().trim();
    log(`✅ npm: ${npmVersion}`, 'green');
    checks.push(true);
  } catch {
    log('❌ npm non trouvé', 'red');
    checks.push(false);
  }

  // 3. Vérifier winget
  try {
    const wingetVersion = execSync('winget --version').toString().trim();
    log(`✅ winget: ${wingetVersion}`, 'green');
    checks.push(true);
  } catch {
    log('❌ winget non trouvé (non-critique)', 'yellow');
    checks.push(false);
  }

  // 4. Vérifier vite.config.ts
  try {
    const fs = require('fs');
    const viteConfig = fs.readFileSync('./vite.config.ts', 'utf8');
    if (viteConfig.includes('proxy') && viteConfig.includes('/api')) {
      log('✅ vite.config.ts: Proxy API configuré', 'green');
      checks.push(true);
    } else {
      log('❌ vite.config.ts: Proxy API manquant', 'red');
      checks.push(false);
    }
  } catch {
    log('❌ vite.config.ts non trouvé', 'red');
    checks.push(false);
  }

  // 5. Vérifier node_modules
  try {
    const fs = require('fs');
    if (fs.existsSync('./node_modules')) {
      log('✅ Dépendances: node_modules détecté', 'green');
      checks.push(true);
    } else {
      log('❌ Dépendances: node_modules manquant (lancer: npm install)', 'yellow');
      checks.push(false);
    }
  } catch {
    log('❌ Erreur lors de la vérification des dépendances', 'red');
    checks.push(false);
  }

  // 6. Vérifier server/node_modules
  try {
    const fs = require('fs');
    if (fs.existsSync('./server/node_modules')) {
      log('✅ Serveur: node_modules détecté', 'green');
      checks.push(true);
    } else {
      log('⚠️  Serveur: node_modules manquant (lancer: cd server && npm install)', 'yellow');
      checks.push(false);
    }
  } catch {
    log('❌ Erreur lors de la vérification du serveur', 'red');
    checks.push(false);
  }

  log('\n📋 Résumé:', 'blue');
  const passed = checks.filter(Boolean).length;
  const total = checks.length;
  log(`${passed}/${total} vérifications réussies\n`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('✅ Configuration prête! Lancer: npm run local\n', 'green');
    process.exit(0);
  } else {
    log('⚠️  Certaines vérifications ont échoué. Voir le guide de dépannage.\n', 'yellow');
    process.exit(1);
  }
}

verify();
