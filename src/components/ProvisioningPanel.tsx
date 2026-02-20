import { useState, useEffect, useMemo } from "react";
import { 
  Download, Trash2, RefreshCw, CheckCircle2, XCircle, Loader2, AlertCircle, AlertTriangle, WifiOff, 
  Package, Globe, Code, Languages, Wrench, Music, MessageSquare, Shield, FileText, 
  Gamepad2, Search, X, Play, Pause, ChevronRight, ChevronLeft, Filter, CheckSquare, Square,
  Database, Cloud, Monitor, Cpu, HardDrive, Network, Settings, Zap, Terminal, BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { installPackage, uninstallPackage, upgradePackage, upgradeAll, fetchUpdates, fetchInventory, SSEEventType, AppEntry } from "@/lib/winget-api";
import { useServer } from "@/contexts/ServerContext";
import { useScanData } from "@/hooks/use-scan-data";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type Mode = "install" | "uninstall" | "update";

interface App {
  id: string;
  name: string;
  category: string;
  description?: string;
  icon?: string;
}

// Liste complète d'applications organisées par catégories
const POPULAR_APPS: App[] = [
  // Navigateurs
  { id: "Google.Chrome", name: "Google Chrome", category: "Navigateurs", description: "Navigateur web rapide et sécurisé" },
  { id: "Mozilla.Firefox", name: "Mozilla Firefox", category: "Navigateurs", description: "Navigateur open-source respectueux de la vie privée" },
  { id: "Microsoft.Edge", name: "Microsoft Edge", category: "Navigateurs", description: "Navigateur moderne basé sur Chromium" },
  { id: "Opera.Opera", name: "Opera", category: "Navigateurs", description: "Navigateur avec VPN intégré" },
  { id: "Brave.Brave", name: "Brave Browser", category: "Navigateurs", description: "Navigateur axé sur la confidentialité" },
  { id: "VivaldiTechnologies.Vivaldi", name: "Vivaldi", category: "Navigateurs", description: "Navigateur hautement personnalisable" },
  
  // Développement
  { id: "Microsoft.VisualStudioCode", name: "Visual Studio Code", category: "Développement", description: "Éditeur de code source polyvalent" },
  { id: "Git.Git", name: "Git", category: "Développement", description: "Système de contrôle de version distribué" },
  { id: "GitHub.GitHubDesktop", name: "GitHub Desktop", category: "Développement", description: "Client Git graphique pour GitHub" },
  { id: "Docker.DockerDesktop", name: "Docker Desktop", category: "Développement", description: "Plateforme de conteneurisation" },
  { id: "Postman.Postman", name: "Postman", category: "Développement", description: "Plateforme API pour développeurs" },
  { id: "Microsoft.WindowsTerminal", name: "Windows Terminal", category: "Développement", description: "Terminal moderne pour Windows" },
  { id: "Notepad++.Notepad++", name: "Notepad++", category: "Développement", description: "Éditeur de texte avancé" },
  { id: "JetBrains.IntelliJIDEA.Community", name: "IntelliJ IDEA Community", category: "Développement", description: "IDE Java puissant" },
  { id: "SublimeHQ.SublimeText.4", name: "Sublime Text 4", category: "Développement", description: "Éditeur de texte sophistiqué" },
  { id: "Oracle.VirtualBox", name: "VirtualBox", category: "Développement", description: "Virtualisation open-source" },
  
  // Langages
  { id: "Python.Python.3.13", name: "Python 3.13", category: "Langages", description: "Langage de programmation interprété" },
  { id: "Python.Python.3.12", name: "Python 3.12", category: "Langages", description: "Version stable de Python" },
  { id: "OpenJS.NodeJS.LTS", name: "Node.js LTS", category: "Langages", description: "Runtime JavaScript côté serveur" },
  { id: "Microsoft.DotNet.SDK.9", name: ".NET SDK 9", category: "Langages", description: "Framework de développement Microsoft" },
  { id: "Microsoft.DotNet.SDK.8", name: ".NET SDK 8", category: "Langages", description: "Version LTS de .NET" },
  { id: "Oracle.JDK.21", name: "Java JDK 21", category: "Langages", description: "Kit de développement Java" },
  { id: "GoLang.Go", name: "Go", category: "Langages", description: "Langage de programmation Google" },
  { id: "Rustlang.Rust.MSVC", name: "Rust", category: "Langages", description: "Langage système moderne et sûr" },
  
  // Utilitaires
  { id: "7zip.7zip", name: "7-Zip", category: "Utilitaires", description: "Archiveur de fichiers open-source" },
  { id: "Microsoft.PowerToys", name: "PowerToys", category: "Utilitaires", description: "Utilitaires système avancés" },
  { id: "Microsoft.PowerShell", name: "PowerShell 7", category: "Utilitaires", description: "Shell et langage de script" },
  { id: "WinSCP.WinSCP", name: "WinSCP", category: "Utilitaires", description: "Client SFTP et FTP" },
  { id: "PuTTY.PuTTY", name: "PuTTY", category: "Utilitaires", description: "Client SSH et Telnet" },
  { id: "Rufus.Rufus", name: "Rufus", category: "Utilitaires", description: "Créateur de clés USB bootables" },
  { id: "Balena.Etcher", name: "Etcher", category: "Utilitaires", description: "Flash d'images sur disques" },
  { id: "Everything.Everything", name: "Everything", category: "Utilitaires", description: "Recherche ultra-rapide de fichiers" },
  
  // Médias
  { id: "VideoLAN.VLC", name: "VLC Media Player", category: "Médias", description: "Lecteur multimédia universel" },
  { id: "Spotify.Spotify", name: "Spotify", category: "Médias", description: "Service de streaming musical" },
  { id: "Audacity.Audacity", name: "Audacity", description: "Éditeur audio gratuit et open-source", category: "Médias" },
  { id: "GIMP.GIMP", name: "GIMP", category: "Médias", description: "Éditeur d'images open-source" },
  { id: "OBSProject.OBSStudio", name: "OBS Studio", category: "Médias", description: "Logiciel de streaming et enregistrement" },
  { id: "KDE.Krita", name: "Krita", category: "Médias", description: "Application de peinture numérique" },
  { id: "BlenderFoundation.Blender", name: "Blender", category: "Médias", description: "Logiciel de modélisation 3D" },
  
  // Communication
  { id: "SlackTechnologies.Slack", name: "Slack", category: "Communication", description: "Plateforme de collaboration d'équipe" },
  { id: "Zoom.Zoom", name: "Zoom", category: "Communication", description: "Vidéoconférence et réunions" },
  { id: "Discord.Discord", name: "Discord", category: "Communication", description: "Chat vocal et texte pour gamers" },
  { id: "Microsoft.Teams", name: "Microsoft Teams", category: "Communication", description: "Collaboration et communication d'équipe" },
  { id: "Telegram.TelegramDesktop", name: "Telegram", category: "Communication", description: "Messagerie instantanée sécurisée" },
  { id: "WhatsApp.WhatsApp", name: "WhatsApp", category: "Communication", description: "Messagerie instantanée populaire" },
  
  // Sécurité
  { id: "Malwarebytes.Malwarebytes", name: "Malwarebytes", category: "Sécurité", description: "Protection contre les malwares" },
  { id: "KeePassXCTeam.KeePassXC", name: "KeePassXC", category: "Sécurité", description: "Gestionnaire de mots de passe" },
  { id: "Bitwarden.Bitwarden", name: "Bitwarden", category: "Sécurité", description: "Gestionnaire de mots de passe cloud" },
  { id: "Veracrypt.VeraCrypt", name: "VeraCrypt", category: "Sécurité", description: "Chiffrement de disque" },
  
  // Bureautique
  { id: "LibreOffice.LibreOffice", name: "LibreOffice", category: "Bureautique", description: "Suite bureautique open-source" },
  { id: "Adobe.Acrobat.Reader.64bit", name: "Adobe Reader", category: "Bureautique", description: "Lecteur PDF officiel" },
  { id: "SumatraPDF.SumatraPDF", name: "Sumatra PDF", category: "Bureautique", description: "Lecteur PDF léger et rapide" },
  
  // Jeux
  { id: "Valve.Steam", name: "Steam", category: "Jeux", description: "Plateforme de jeux PC" },
  { id: "EpicGames.EpicGamesLauncher", name: "Epic Games Launcher", category: "Jeux", description: "Launcher Epic Games" },
  { id: "Ubisoft.Connect", name: "Ubisoft Connect", category: "Jeux", description: "Plateforme de jeux Ubisoft" },
  { id: "ElectronicArts.EADesktop", name: "EA Desktop", category: "Jeux", description: "Launcher Electronic Arts" },
  { id: "GOG.Galaxy", name: "GOG Galaxy", category: "Jeux", description: "Launcher GOG" },
  
  // Cloud & Stockage
  { id: "Google.GoogleDrive", name: "Google Drive", category: "Cloud & Stockage", description: "Stockage cloud Google" },
  { id: "Dropbox.Dropbox", name: "Dropbox", category: "Cloud & Stockage", description: "Stockage cloud et synchronisation" },
  { id: "Microsoft.OneDrive", name: "OneDrive", category: "Cloud & Stockage", description: "Stockage cloud Microsoft" },
  { id: "Mega.MEGASync", name: "MEGA", category: "Cloud & Stockage", description: "Stockage cloud sécurisé" },
  { id: "Nextcloud.NextcloudDesktop", name: "Nextcloud Desktop", category: "Cloud & Stockage", description: "Client Nextcloud" },
  
  // Base de données
  { id: "MongoDB.MongoDBCompass", name: "MongoDB Compass", category: "Base de données", description: "Interface graphique MongoDB" },
  { id: "MySQL.MySQL", name: "MySQL", category: "Base de données", description: "Système de gestion de base de données" },
  { id: "PostgreSQL.PostgreSQL", name: "PostgreSQL", category: "Base de données", description: "Base de données relationnelle" },
  { id: "DBeaverCorp.DBeaverCommunity", name: "DBeaver Community", category: "Base de données", description: "Outil universel de gestion de bases de données" },
  { id: "Redis.Redis", name: "Redis", category: "Base de données", description: "Base de données en mémoire" },
  
  // Réseau & VPN
  { id: "OpenVPNTechnologies.OpenVPN", name: "OpenVPN", category: "Réseau & VPN", description: "Client VPN open-source" },
  { id: "ProtonTechnologies.ProtonVPN", name: "ProtonVPN", category: "Réseau & VPN", description: "Service VPN sécurisé" },
  { id: "NordVPN.NordVPN", name: "NordVPN", category: "Réseau & VPN", description: "Service VPN populaire" },
  { id: "WiresharkFoundation.Wireshark", name: "Wireshark", category: "Réseau & VPN", description: "Analyseur de protocoles réseau" },
  { id: "Fiddler.Fiddler", name: "Fiddler", category: "Réseau & VPN", description: "Outil de débogage HTTP" },
  
  // Système & Performance
  { id: "CPUID.CPU-Z", name: "CPU-Z", category: "Système & Performance", description: "Informations sur le processeur" },
  { id: "CPUID.GPU-Z", name: "GPU-Z", category: "Système & Performance", description: "Informations sur la carte graphique" },
  { id: "CrystalDewWorld.CrystalDiskInfo", name: "CrystalDiskInfo", category: "Système & Performance", description: "Surveillance de la santé des disques" },
  { id: "CrystalDewWorld.CrystalDiskMark", name: "CrystalDiskMark", category: "Système & Performance", description: "Test de performance des disques" },
  { id: "TechPowerUp.GPU-Z", name: "GPU-Z", category: "Système & Performance", description: "Informations détaillées sur le GPU" },
  
  // Éducation & Documentation
  { id: "Obsidian.Obsidian", name: "Obsidian", category: "Éducation & Documentation", description: "Application de prise de notes" },
  { id: "Notion.Notion", name: "Notion", category: "Éducation & Documentation", description: "Espace de travail tout-en-un" },
  { id: "Anki.Anki", name: "Anki", category: "Éducation & Documentation", description: "Système de répétition espacée" },
  { id: "Zotero.Zotero", name: "Zotero", category: "Éducation & Documentation", description: "Gestionnaire de références" },
  { id: "MarkText.MarkText", name: "MarkText", category: "Éducation & Documentation", description: "Éditeur Markdown" },
  
  // Design & Graphisme
  { id: "Adobe.Photoshop", name: "Adobe Photoshop", category: "Design & Graphisme", description: "Éditeur d'images professionnel" },
  { id: "Adobe.Illustrator", name: "Adobe Illustrator", category: "Design & Graphisme", description: "Logiciel de dessin vectoriel" },
  { id: "Inkscape.Inkscape", name: "Inkscape", category: "Design & Graphisme", description: "Éditeur vectoriel open-source" },
  { id: "Figma.Figma", name: "Figma", category: "Design & Graphisme", description: "Outil de design collaboratif" },
  { id: "Canva.Canva", name: "Canva", category: "Design & Graphisme", description: "Outil de design graphique" },
  
  // Audio & Vidéo
  { id: "Adobe.PremierePro", name: "Adobe Premiere Pro", category: "Audio & Vidéo", description: "Montage vidéo professionnel" },
  { id: "DaVinciResolve.DaVinciResolve", name: "DaVinci Resolve", category: "Audio & Vidéo", description: "Montage et colorisation vidéo" },
  { id: "HandBrake.HandBrake", name: "HandBrake", category: "Audio & Vidéo", description: "Transcodeur vidéo" },
  { id: "FFmpeg.FFmpeg", name: "FFmpeg", category: "Audio & Vidéo", description: "Bibliothèque multimédia" },
  { id: "Kdenlive.Kdenlive", name: "Kdenlive", category: "Audio & Vidéo", description: "Éditeur vidéo non-linéaire" },
];

const MOCK_UPDATES = [
  { id: "Git.Git", name: "Git", version: "2.47.1", available: "2.48.0" },
  { id: "OpenJS.NodeJS.LTS", name: "Node.js LTS", version: "20.18.1", available: "22.13.0" },
  { id: "Microsoft.PowerShell", name: "PowerShell 7", version: "7.4.7.0", available: "7.5.0" },
  { id: "Docker.DockerDesktop", name: "Docker Desktop", version: "4.37.1", available: "4.38.0" },
  { id: "Postman.Postman", name: "Postman", version: "11.28.4", available: "11.29.0" },
  { id: "WinSCP.WinSCP", name: "WinSCP", version: "6.3.6", available: "6.4.0" },
  { id: "Zoom.Zoom", name: "Zoom", version: "6.3.11", available: "6.4.0" },
];

interface UpdateApp {
  id: string;
  name: string;
  version: string;
  available: string | null;
}

interface InstallationProgress {
  step: number;
  message: string;
  percent: number;
}

interface InstallationStatus {
  status: "pending" | "running" | "paused" | "success" | "error" | "cancelled";
  progress?: InstallationProgress;
  cleanup?: () => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  "Navigateurs": Globe,
  "Développement": Code,
  "Langages": Languages,
  "Utilitaires": Wrench,
  "Médias": Music,
  "Communication": MessageSquare,
  "Sécurité": Shield,
  "Bureautique": FileText,
  "Jeux": Gamepad2,
  "Cloud & Stockage": Cloud,
  "Base de données": Database,
  "Réseau & VPN": Network,
  "Système & Performance": Monitor,
  "Éducation & Documentation": BookOpen,
  "Design & Graphisme": Zap,
  "Audio & Vidéo": Music,
};

const CATEGORY_COLORS: Record<string, string> = {
  "Navigateurs": "neon-blue",
  "Développement": "neon-cyan",
  "Langages": "neon-green",
  "Utilitaires": "neon-orange",
  "Médias": "neon-purple",
  "Communication": "neon-pink",
  "Sécurité": "neon-red",
  "Bureautique": "neon-yellow",
  "Jeux": "neon-blue",
  "Cloud & Stockage": "neon-cyan",
  "Base de données": "neon-green",
  "Réseau & VPN": "neon-blue",
  "Système & Performance": "neon-orange",
  "Éducation & Documentation": "neon-purple",
  "Design & Graphisme": "neon-pink",
  "Audio & Vidéo": "neon-purple",
};

export function ProvisioningPanel({ mode }: { mode: Mode }) {
  const { isConnected } = useServer();
  const { inventory: persistedInventory } = useScanData();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "paused" | "success" | "error">("idle");
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());
  const [updates, setUpdates] = useState<UpdateApp[]>(MOCK_UPDATES);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [updateStatuses, setUpdateStatuses] = useState<Record<string, "idle" | "running" | "success" | "error">>({});
  const [installStatuses, setInstallStatuses] = useState<Record<string, InstallationStatus>>({});
  const [pausedInstallations, setPausedInstallations] = useState<Set<string>>(new Set());
  
  // États pour les popups
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [alreadyInstalledDialogOpen, setAlreadyInstalledDialogOpen] = useState(false);
  const [alreadyInstalledApp, setAlreadyInstalledApp] = useState<App | null>(null);
  const [installedApps, setInstalledApps] = useState<Set<string>>(new Set());
  
  // États pour la page désinstallation
  const [uninstallSearchQuery, setUninstallSearchQuery] = useState("");
  const [uninstallFilter, setUninstallFilter] = useState<"all" | "up-to-date" | "update-available" | "unknown">("all");
  
  // États pour la page mise à jour
  const [updateSearchQuery, setUpdateSearchQuery] = useState("");
  const [updateFilter, setUpdateFilter] = useState<"all" | "idle" | "running" | "success" | "error">("all");

  // Charger la liste des applications installées
  useEffect(() => {
    if (persistedInventory?.apps) {
      const installedIds = new Set(persistedInventory.apps.map(app => app.id));
      setInstalledApps(installedIds);
    } else if (isConnected && mode === "install") {
      fetchInventory()
        .then(data => {
          const installedIds = new Set(data.apps.map(app => app.id));
          setInstalledApps(installedIds);
        })
        .catch(() => {});
    }
  }, [persistedInventory, isConnected, mode]);

  useEffect(() => {
    if (mode === "update" && isConnected) {
      setLoadingUpdates(true);
      fetchUpdates()
        .then(data => {
          // S'assurer que data.updates existe et est un tableau
          const updatesList = Array.isArray(data?.updates) ? data.updates : [];
          setUpdates(updatesList as UpdateApp[]);
        })
        .catch((err) => {
          console.error("Erreur lors du chargement des mises à jour:", err);
          // En cas d'erreur, utiliser une liste vide plutôt que MOCK_UPDATES
          setUpdates([]);
        })
        .finally(() => setLoadingUpdates(false));
    } else if (mode === "update") {
      // En mode démo, utiliser une liste vide
      setUpdates([]);
    }
  }, [mode, isConnected]);

  // Mode désinstallation : charger toutes les applications installées
  useEffect(() => {
    if (mode === "uninstall" && isConnected) {
      fetchInventory()
        .then(data => {
          const installedAppsList = data.apps.map(app => ({
            id: app.id,
            name: app.name,
            category: "Installées",
            description: `Version ${app.version}`,
          }));
          // Utiliser les apps installées comme liste pour la désinstallation
        })
        .catch(() => {});
    }
  }, [mode, isConnected]);

  // Grouper les apps par catégorie
  const appsByCategory = useMemo(() => {
    return POPULAR_APPS.reduce((acc, app) => {
      if (!acc[app.category]) acc[app.category] = [];
      acc[app.category].push(app);
      return acc;
    }, {} as Record<string, App[]>);
  }, []);

  // Filtrer les apps de la catégorie sélectionnée
  const filteredApps = useMemo(() => {
    if (!selectedCategory) return [];
    const categoryApps = appsByCategory[selectedCategory] || [];
    if (!searchQuery) return categoryApps;
    const query = searchQuery.toLowerCase();
    return categoryApps.filter(app => 
      app.name.toLowerCase().includes(query) || 
      app.id.toLowerCase().includes(query) ||
      app.description?.toLowerCase().includes(query)
    );
  }, [selectedCategory, searchQuery, appsByCategory]);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category === selectedCategory ? null : category);
    setSearchQuery("");
  };

  const toggleAppSelection = (appId: string) => {
    setSelectedApps(prev => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const selectAllApps = () => {
    if (selectedApps.size === filteredApps.length) {
      setSelectedApps(new Set());
    } else {
      setSelectedApps(new Set(filteredApps.map(app => app.id)));
    }
  };

  const removeFromQueue = (appId: string) => {
    setSelectedApps(prev => {
      const next = new Set(prev);
      next.delete(appId);
      return next;
    });
    // Annuler l'installation si en cours
    if (installStatuses[appId]?.cleanup) {
      installStatuses[appId].cleanup?.();
      setInstallStatuses(prev => {
        const next = { ...prev };
        delete next[appId];
        return next;
      });
    }
  };

  const handleInstallSelected = () => {
    if (selectedApps.size === 0) return;
    
    // Vérifier si des applications sont déjà installées
    const appsToCheck = Array.from(selectedApps).map(id => POPULAR_APPS.find(a => a.id === id)).filter(Boolean) as App[];
    const alreadyInstalled = appsToCheck.find(app => installedApps.has(app.id));
    
    if (alreadyInstalled) {
      setAlreadyInstalledApp(alreadyInstalled);
      setAlreadyInstalledDialogOpen(true);
      return;
    }
    
    // Ouvrir le popup de confirmation
    setConfirmDialogOpen(true);
  };

  const confirmInstallation = async () => {
    const appsToInstall = Array.from(selectedApps);
    
    if (appsToInstall.length === 0) return;

    setConfirmDialogOpen(false);
    setProgressDialogOpen(true);
    setStatus("running");
    
    // Initialiser les statuts
    appsToInstall.forEach(id => {
      setInstallStatuses(prev => ({ 
        ...prev, 
        [id]: { 
          status: "pending",
          progress: { step: 0, message: "En attente...", percent: 0 }
        } 
      }));
    });

    if (!isConnected) {
      // Mode démo
      appsToInstall.forEach((id, index) => {
        setTimeout(() => {
          setInstallStatuses(prev => ({ 
            ...prev, 
            [id]: { 
              status: "running",
              progress: { step: 2, message: "Téléchargement...", percent: 30 }
            } 
          }));
          setTimeout(() => {
            setInstallStatuses(prev => ({ 
              ...prev, 
              [id]: { 
                status: "success",
                progress: { step: 5, message: "Installation terminée", percent: 100 }
              } 
            }));
            if (index === appsToInstall.length - 1) {
              setStatus("success");
            }
          }, 2000);
        }, index * 500);
      });
      return;
    }

    // Installation en parallèle
    appsToInstall.forEach(id => {
      const cleanup = installPackage(id, (type: SSEEventType, data: string) => {
        if (type === "progress") {
          try {
            const progressData: InstallationProgress = JSON.parse(data);
            setInstallStatuses(prev => ({ 
              ...prev, 
              [id]: { 
                ...prev[id],
                status: pausedInstallations.has(id) ? "paused" : "running",
                progress: progressData
              } 
            }));
          } catch {}
        } else if (type === "success") {
          setInstallStatuses(prev => ({ 
            ...prev, 
            [id]: { 
              status: "success",
              progress: { step: 5, message: "Installation terminée", percent: 100 }
            } 
          }));
          // Fermer le popup de progression si toutes les installations sont terminées
          const allDone = appsToInstall.every(appId => {
            const status = installStatuses[appId];
            return status?.status === "success" || status?.status === "error";
          });
          if (allDone) {
            setTimeout(() => {
              setProgressDialogOpen(false);
            }, 2000);
          }
        } else if (type === "error") {
          setInstallStatuses(prev => ({ 
            ...prev, 
            [id]: { 
              status: "error",
              progress: prev[id]?.progress
            } 
          }));
        }
      });
      
      setInstallStatuses(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          cleanup
        }
      }));
    });
  };

  const handlePause = (appId: string) => {
    setPausedInstallations(prev => new Set(prev).add(appId));
    setInstallStatuses(prev => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        status: "paused"
      }
    }));
  };

  const handleResume = (appId: string) => {
    setPausedInstallations(prev => {
      const next = new Set(prev);
      next.delete(appId);
      return next;
    });
    setInstallStatuses(prev => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        status: "running"
      }
    }));
  };

  const handleCancel = (appId: string) => {
    if (installStatuses[appId]?.cleanup) {
      installStatuses[appId].cleanup?.();
    }
    setInstallStatuses(prev => {
      const next = { ...prev };
      delete next[appId];
      return next;
    });
    removeFromQueue(appId);
  };

  const handleUpdateOne = (app: UpdateApp) => {
    setUpdateStatuses(prev => ({ ...prev, [app.id]: "running" }));

    if (!isConnected) {
      setTimeout(() => {
        setUpdateStatuses(prev => ({ ...prev, [app.id]: "success" }));
      }, 3000);
      return;
    }

    upgradePackage(app.id, (type, _) => {
      if (type === "success") {
        setUpdateStatuses(prev => ({ ...prev, [app.id]: "success" }));
      }
      if (type === "error") setUpdateStatuses(prev => ({ ...prev, [app.id]: "error" }));
    });
  };

  const handleUpdateAll = () => {
    setStatus("running");
    selectedUpdates.forEach(id => {
      setUpdateStatuses(prev => ({ ...prev, [id]: "running" }));
    });

    if (!isConnected) {
      setTimeout(() => {
        setStatus("success");
        selectedUpdates.forEach(id => setUpdateStatuses(prev => ({ ...prev, [id]: "success" })));
      }, 4000);
      return;
    }

    upgradeAll((type: SSEEventType, data: string) => {
      if (type === "success") {
        setStatus("success");
        selectedUpdates.forEach(id => setUpdateStatuses(prev => ({ ...prev, [id]: "success" })));
      }
      if (type === "error") setStatus("error");
    });
  };

  const toggleUpdate = (id: string) => {
    setSelectedUpdates(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUninstallSelected = async () => {
    const appsToUninstall = Array.from(selectedApps);
    if (appsToUninstall.length === 0) return;

    setStatus("running");
    
    appsToUninstall.forEach(id => {
      if (!isConnected) {
        setTimeout(() => {
          setStatus("success");
          setSelectedApps(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 2000);
        return;
      }

      uninstallPackage(id, (type: SSEEventType, data: string) => {
        if (type === "success") {
          setSelectedApps(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      });
    });
  };

  const modeConfig = {
    install: { icon: Download, color: "neon-green", label: "Installation", placeholder: "ex: Microsoft.VisualStudioCode", verb: "Installer" },
    uninstall: { icon: Trash2, color: "neon-red", label: "Désinstallation", placeholder: "ex: Mozilla.Firefox", verb: "Désinstaller" },
    update: { icon: RefreshCw, color: "neon-orange", label: "Mise à jour", placeholder: "ex: Git.Git", verb: "Mettre à jour" },
  };

  const cfg = modeConfig[mode];
  const Icon = cfg.icon;

  // Applications en cours d'installation
  const installingApps = Object.entries(installStatuses).filter(([_, status]) => 
    status.status === "running" || status.status === "paused"
  );

  // Applications sélectionnées pour installation
  const queuedApps = Array.from(selectedApps).map(id => POPULAR_APPS.find(a => a.id === id)).filter(Boolean) as App[];

  // Mode désinstallation : afficher toutes les applications installées
  if (mode === "uninstall") {
    const installedAppsList = useMemo(() => {
      return persistedInventory?.apps || [];
    }, [persistedInventory]);
    
    // Filtrer les applications selon la recherche et le filtre
    const filteredInstalledApps = useMemo(() => {
      if (!installedAppsList || installedAppsList.length === 0) {
        return [];
      }
      
      let filtered = [...installedAppsList];
      
      // Filtre par statut
      if (uninstallFilter && uninstallFilter !== "all") {
        filtered = filtered.filter(app => app.status === uninstallFilter);
      }
      
      // Filtre par recherche
      const searchQuery = uninstallSearchQuery?.trim() || "";
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(app => {
          const name = String(app.name || "").toLowerCase();
          const id = String(app.id || "").toLowerCase();
          const version = String(app.version || "").toLowerCase();
          return name.includes(query) || id.includes(query) || version.includes(query);
        });
      }
      
      return filtered;
    }, [installedAppsList, uninstallFilter, uninstallSearchQuery]);
    
    // Statistiques pour les cards
    const uninstallStats = useMemo(() => {
      const total = installedAppsList.length;
      const upToDate = installedAppsList.filter(a => a.status === "up-to-date").length;
      const updateAvailable = installedAppsList.filter(a => a.status === "update-available").length;
      const unknown = installedAppsList.filter(a => a.status === "unknown").length;
      return { total, upToDate, updateAvailable, unknown };
    }, [installedAppsList]);
    
    const handleSelectAllUninstall = () => {
      if (selectedApps.size === filteredInstalledApps.length) {
        setSelectedApps(new Set());
      } else {
        setSelectedApps(new Set(filteredInstalledApps.map(app => app.id)));
      }
    };
    
    const handleDeselectAllUninstall = () => {
      const filteredIds = new Set(filteredInstalledApps.map(app => app.id));
      setSelectedApps(prev => {
        const next = new Set(prev);
        filteredIds.forEach(id => next.delete(id));
        return next;
      });
    };
    
    return (
      <div className="space-y-6">
        {!isConnected && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neon-orange/30 bg-neon-orange/5">
            <WifiOff className="w-4 h-4 text-neon-orange flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <span className="text-neon-orange font-medium">Mode démo</span> — Les commandes sont simulées.
            </div>
          </div>
        )}
        
        {/* 4 Cards de statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Package className="w-5 h-5 text-neon-red" />
                <Badge variant="secondary" className="bg-neon-red/10 text-neon-red border-neon-red/30">
                  {uninstallStats.total}
                </Badge>
              </div>
              <CardTitle className="text-sm mt-2">Total installées</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Applications détectées</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CheckCircle2 className="w-5 h-5 text-neon-green" />
                <Badge variant="secondary" className="bg-neon-green/10 text-neon-green border-neon-green/30">
                  {uninstallStats.upToDate}
                </Badge>
              </div>
              <CardTitle className="text-sm mt-2">À jour</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Versions actuelles</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <RefreshCw className="w-5 h-5 text-neon-orange" />
                <Badge variant="secondary" className="bg-neon-orange/10 text-neon-orange border-neon-orange/30">
                  {uninstallStats.updateAvailable}
                </Badge>
              </div>
              <CardTitle className="text-sm mt-2">Mises à jour</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Disponibles</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <AlertTriangle className="w-5 h-5 text-neon-yellow" />
                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                  {uninstallStats.unknown}
                </Badge>
              </div>
              <CardTitle className="text-sm mt-2">Statut inconnu</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">À vérifier</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Barre de recherche et filtres */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Barre de recherche */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={uninstallSearchQuery}
                  onChange={(e) => setUninstallSearchQuery(e.target.value)}
                  placeholder="Rechercher une application..."
                  className="pl-9"
                />
              </div>
              
              {/* Filtre par statut */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={uninstallFilter}
                  onChange={(e) => setUninstallFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-neon-red/30"
                >
                  <option value="all">Toutes</option>
                  <option value="up-to-date">À jour</option>
                  <option value="update-available">Mises à jour disponibles</option>
                  <option value="unknown">Statut inconnu</option>
                </select>
              </div>
            </div>
            
            {/* Boutons d'action */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllUninstall}
                className="flex items-center gap-2"
                disabled={filteredInstalledApps.length === 0}
              >
                <CheckSquare className="w-4 h-4" />
                Tout sélectionner
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAllUninstall}
                className="flex items-center gap-2"
                disabled={filteredInstalledApps.length === 0 || filteredInstalledApps.filter(app => selectedApps.has(app.id)).length === 0}
              >
                <Square className="w-4 h-4" />
                Tout désélectionner
              </Button>
              
              <Button
                size="sm"
                onClick={handleUninstallSelected}
                disabled={selectedApps.size === 0}
                className="flex items-center gap-2 bg-neon-red/10 text-neon-red border-neon-red/30 hover:bg-neon-red/20"
              >
                <Trash2 className="w-4 h-4" />
                Désinstaller tout ({selectedApps.size})
              </Button>
            </div>
          </CardHeader>
        </Card>
        
        {/* Tableau des applications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Applications installées</CardTitle>
              <Badge variant="secondary">
                {filteredInstalledApps.length} résultat{filteredInstalledApps.length > 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface-2 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase w-12">
                      <input
                        type="checkbox"
                        checked={selectedApps.size === filteredInstalledApps.length && filteredInstalledApps.length > 0}
                        onChange={handleSelectAllUninstall}
                        className="w-4 h-4 accent-neon-red rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Application</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Version</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Package ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredInstalledApps.map(app => {
                    const isSelected = selectedApps.has(app.id);
                    return (
                      <tr
                        key={app.id}
                        className={cn(
                          "hover:bg-surface-1 transition-colors cursor-pointer",
                          isSelected && "bg-neon-red/5"
                        )}
                        onClick={() => toggleAppSelection(app.id)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAppSelection(app.id)}
                            className="w-4 h-4 accent-neon-red rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-neon-red flex-shrink-0" />
                            <div>
                              <div className="text-sm font-medium text-foreground">{app.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <code className="text-xs text-muted-foreground font-mono">{app.version}</code>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <code className="text-xs text-muted-foreground font-mono">{app.id}</code>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className={cn(
                              app.status === "up-to-date" && "bg-neon-green/10 text-neon-green border-neon-green/30",
                              app.status === "update-available" && "bg-neon-orange/10 text-neon-orange border-neon-orange/30",
                              app.status === "unknown" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                            )}
                          >
                            {app.status === "up-to-date" && "À jour"}
                            {app.status === "update-available" && "Mise à jour"}
                            {app.status === "unknown" && "Inconnu"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredInstalledApps.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  {installedAppsList.length === 0
                    ? "Aucune application installée trouvée. Lancez un scan pour mettre à jour la liste."
                    : "Aucune application ne correspond aux critères de recherche."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "update") {
    // Filtrer les mises à jour selon la recherche et le filtre
    const filteredUpdates = useMemo(() => {
      if (!updates || updates.length === 0) {
        return [];
      }
      
      let filtered = [...updates];
      
      // Filtre par statut
      if (updateFilter && updateFilter !== "all") {
        filtered = filtered.filter(app => {
          const s = updateStatuses[app.id] || "idle";
          return s === updateFilter;
        });
      }
      
      // Filtre par recherche
      const searchQuery = updateSearchQuery?.trim() || "";
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(app => {
          const name = String(app.name || "").toLowerCase();
          const id = String(app.id || "").toLowerCase();
          const version = String(app.version || "").toLowerCase();
          const available = String(app.available || "").toLowerCase();
          return name.includes(query) || id.includes(query) || version.includes(query) || available.includes(query);
        });
      }
      
      return filtered;
    }, [updates, updateFilter, updateSearchQuery, updateStatuses]);
    
    // Statistiques pour les cards
    const updateStats = useMemo(() => {
      const total = updates.length;
      const idle = updates.filter(app => (updateStatuses[app.id] || "idle") === "idle").length;
      const running = updates.filter(app => updateStatuses[app.id] === "running").length;
      const success = updates.filter(app => updateStatuses[app.id] === "success").length;
      return { total, idle, running, success };
    }, [updates, updateStatuses]);
    
    const handleSelectAllUpdates = () => {
      if (selectedUpdates.size === filteredUpdates.length) {
        setSelectedUpdates(new Set());
      } else {
        setSelectedUpdates(new Set(filteredUpdates.filter(app => (updateStatuses[app.id] || "idle") === "idle").map(app => app.id)));
      }
    };
    
    const handleDeselectAllUpdates = () => {
      const filteredIds = new Set(filteredUpdates.map(app => app.id));
      setSelectedUpdates(prev => {
        const next = new Set(prev);
        filteredIds.forEach(id => next.delete(id));
        return next;
      });
    };
    
    return (
      <div className="space-y-6">
        {!isConnected && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neon-orange/30 bg-neon-orange/5">
            <WifiOff className="w-4 h-4 text-neon-orange flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <span className="text-neon-orange font-medium">Mode démo</span> — Les commandes sont simulées.
            </div>
          </div>
        )}
        
        {/* 4 Cards de statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <RefreshCw className="w-5 h-5 text-neon-orange" />
                <Badge variant="secondary" className="bg-neon-orange/10 text-neon-orange border-neon-orange/30">
                  {updateStats.total}
                </Badge>
              </div>
              <CardTitle className="text-sm mt-2">Total disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Mises à jour</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Package className="w-5 h-5 text-neon-blue" />
                <Badge variant="secondary" className="bg-neon-blue/10 text-neon-blue border-neon-blue/30">
                  {updateStats.idle}
                </Badge>
              </div>
              <CardTitle className="text-sm mt-2">En attente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Prêtes à mettre à jour</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Loader2 className="w-5 h-5 text-neon-orange" />
                <Badge variant="secondary" className="bg-neon-orange/10 text-neon-orange border-neon-orange/30">
                  {updateStats.running}
                </Badge>
              </div>
              <CardTitle className="text-sm mt-2">En cours</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Mises à jour actives</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CheckCircle2 className="w-5 h-5 text-neon-green" />
                <Badge variant="secondary" className="bg-neon-green/10 text-neon-green border-neon-green/30">
                  {updateStats.success}
                </Badge>
              </div>
              <CardTitle className="text-sm mt-2">Terminées</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Mises à jour réussies</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Barre de recherche et filtres */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Barre de recherche */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={updateSearchQuery}
                  onChange={(e) => setUpdateSearchQuery(e.target.value)}
                  placeholder="Rechercher une mise à jour..."
                  className="pl-9"
                />
              </div>
              
              {/* Filtre par statut */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={updateFilter}
                  onChange={(e) => setUpdateFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-neon-orange/30"
                >
                  <option value="all">Toutes</option>
                  <option value="idle">En attente</option>
                  <option value="running">En cours</option>
                  <option value="success">Terminées</option>
                  <option value="error">Erreurs</option>
                </select>
              </div>
            </div>
            
            {/* Boutons d'action */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllUpdates}
                className="flex items-center gap-2"
                disabled={filteredUpdates.filter(app => (updateStatuses[app.id] || "idle") === "idle").length === 0}
              >
                <CheckSquare className="w-4 h-4" />
                Tout sélectionner
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAllUpdates}
                className="flex items-center gap-2"
                disabled={filteredUpdates.length === 0 || filteredUpdates.filter(app => selectedUpdates.has(app.id)).length === 0}
              >
                <Square className="w-4 h-4" />
                Tout désélectionner
              </Button>
              
              <Button
                size="sm"
                onClick={handleUpdateAll}
                disabled={selectedUpdates.size === 0 || status === "running"}
                className="flex items-center gap-2 bg-neon-orange/10 text-neon-orange border-neon-orange/30 hover:bg-neon-orange/20"
              >
                <RefreshCw className={cn("w-4 h-4", status === "running" && "animate-spin")} />
                Mettre à jour tout ({selectedUpdates.size})
              </Button>
            </div>
          </CardHeader>
        </Card>
        
        {/* Tableau des mises à jour */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Mises à jour disponibles</CardTitle>
              <Badge variant="secondary">
                {loadingUpdates ? "Chargement..." : `${filteredUpdates.length} résultat${filteredUpdates.length > 1 ? "s" : ""}`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface-2 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase w-12">
                      <input
                        type="checkbox"
                        checked={selectedUpdates.size === filteredUpdates.filter(app => (updateStatuses[app.id] || "idle") === "idle").length && filteredUpdates.filter(app => (updateStatuses[app.id] || "idle") === "idle").length > 0}
                        onChange={handleSelectAllUpdates}
                        className="w-4 h-4 accent-neon-orange rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Application</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Version actuelle</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Nouvelle version</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredUpdates.map(app => {
                    const s = updateStatuses[app.id] || "idle";
                    const isSelected = selectedUpdates.has(app.id);
                    return (
                      <tr
                        key={app.id}
                        className={cn(
                          "hover:bg-surface-1 transition-colors cursor-pointer",
                          isSelected && "bg-neon-orange/5"
                        )}
                        onClick={() => {
                          if (s === "idle") {
                            toggleUpdate(app.id);
                          }
                        }}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleUpdate(app.id)}
                            className="w-4 h-4 accent-neon-orange rounded"
                            disabled={s !== "idle"}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-neon-orange flex-shrink-0" />
                            <div>
                              <div className="text-sm font-medium text-foreground">{app.name}</div>
                              <div className="font-mono text-xs text-muted-foreground">{app.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <code className="text-xs text-muted-foreground font-mono line-through">{app.version}</code>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs text-neon-orange font-mono font-bold">{app.available || "N/A"}</code>
                        </td>
                        <td className="px-4 py-3">
                          {s === "idle" && (
                            <Badge variant="secondary" className="bg-neon-blue/10 text-neon-blue border-neon-blue/30">
                              En attente
                            </Badge>
                          )}
                          {s === "running" && (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 text-neon-orange animate-spin" />
                              <span className="text-xs text-neon-orange">En cours...</span>
                            </div>
                          )}
                          {s === "success" && (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-neon-green" />
                              <span className="text-xs text-neon-green">Terminé</span>
                            </div>
                          )}
                          {s === "error" && (
                            <div className="flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-neon-red" />
                              <span className="text-xs text-neon-red">Erreur</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredUpdates.length === 0 && !loadingUpdates && (
                <div className="text-center py-12 text-muted-foreground">
                  {updates.length === 0
                    ? "Toutes vos applications sont à jour !"
                    : "Aucune mise à jour ne correspond aux critères de recherche."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Server warning */}
      {!isConnected && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neon-orange/30 bg-neon-orange/5">
          <WifiOff className="w-4 h-4 text-neon-orange flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="text-neon-orange font-medium">Mode démo</span> — Les commandes sont simulées. Lancez <code className="font-mono text-xs bg-surface-2 px-1 rounded">cd server && npm start</code> pour les vraies opérations winget.
          </div>
        </div>
      )}

      {/* Cards de catégories */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Catégories d'applications</h2>
          {selectedApps.size > 0 && (
            <Badge variant="secondary" className="bg-neon-green/10 text-neon-green border-neon-green/30">
              {selectedApps.size} sélectionnée{selectedApps.size > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(appsByCategory).map(([category, apps]) => {
            const CategoryIcon = CATEGORY_ICONS[category] || Package;
            const color = CATEGORY_COLORS[category] || "neon-blue";
            const isSelected = selectedCategory === category;
            const selectedCount = apps.filter(app => selectedApps.has(app.id)).length;
            
            const colorClasses: Record<string, { border: string; bg: string; text: string; badge: string }> = {
              "neon-blue": { border: "border-neon-blue/50", bg: "bg-neon-blue/5", text: "text-neon-blue", badge: "bg-neon-blue/20 text-neon-blue border-neon-blue/30" },
              "neon-cyan": { border: "border-neon-cyan/50", bg: "bg-neon-cyan/5", text: "text-neon-cyan", badge: "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30" },
              "neon-green": { border: "border-neon-green/50", bg: "bg-neon-green/5", text: "text-neon-green", badge: "bg-neon-green/20 text-neon-green border-neon-green/30" },
              "neon-orange": { border: "border-neon-orange/50", bg: "bg-neon-orange/5", text: "text-neon-orange", badge: "bg-neon-orange/20 text-neon-orange border-neon-orange/30" },
              "neon-purple": { border: "border-purple-500/50", bg: "bg-purple-500/5", text: "text-purple-500", badge: "bg-purple-500/20 text-purple-500 border-purple-500/30" },
              "neon-pink": { border: "border-pink-500/50", bg: "bg-pink-500/5", text: "text-pink-500", badge: "bg-pink-500/20 text-pink-500 border-pink-500/30" },
              "neon-red": { border: "border-neon-red/50", bg: "bg-neon-red/5", text: "text-neon-red", badge: "bg-neon-red/20 text-neon-red border-neon-red/30" },
              "neon-yellow": { border: "border-yellow-500/50", bg: "bg-yellow-500/5", text: "text-yellow-500", badge: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" },
            };
            const colorClass = colorClasses[color] || colorClasses["neon-blue"];
            
            return (
              <Card
                key={category}
                onClick={() => handleCategoryClick(category)}
                    className={cn(
                  "cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg",
                  isSelected && colorClass.border,
                  isSelected && colorClass.bg
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CategoryIcon className={cn("w-6 h-6", colorClass.text)} />
                    {selectedCount > 0 && (
                      <Badge className={colorClass.badge}>
                        {selectedCount}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm mt-2">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{apps.length} application{apps.length > 1 ? "s" : ""}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Tableau des applications de la catégorie sélectionnée */}
      {selectedCategory && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">
                  {selectedCategory}
                  <ChevronRight className="w-4 h-4 inline-block mx-2" />
                  Applications
                </CardTitle>
                <Badge variant="secondary">{filteredApps.length} résultat{filteredApps.length > 1 ? "s" : ""}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher..."
                    className="pl-8 w-64"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllApps}
                  className="flex items-center gap-2"
                  disabled={filteredApps.length === 0}
                >
                  <CheckSquare className="w-4 h-4" />
                  Tout sélectionner
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const categoryAppIds = filteredApps.map(app => app.id);
                    setSelectedApps(prev => {
                      const next = new Set(prev);
                      categoryAppIds.forEach(id => next.delete(id));
                      return next;
                    });
                  }}
                  className="flex items-center gap-2"
                  disabled={filteredApps.length === 0 || filteredApps.filter(app => selectedApps.has(app.id)).length === 0}
                >
                  <Square className="w-4 h-4" />
                  Tout désélectionner
                </Button>
                <Button
                  size="sm"
                  onClick={handleInstallSelected}
                  disabled={selectedApps.size === 0 || installingApps.length > 0}
                  className="flex items-center gap-2 bg-neon-green/10 text-neon-green border-neon-green/30 hover:bg-neon-green/20"
                >
                  <Download className="w-4 h-4" />
                  Installer ({selectedApps.size})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface-2 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase w-12">
              <input
                        type="checkbox"
                        checked={selectedApps.size === filteredApps.length && filteredApps.length > 0}
                        onChange={selectAllApps}
                        className="w-4 h-4 accent-neon-green rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Application</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Package ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredApps.map(app => {
                    const isSelected = selectedApps.has(app.id);
                    const installStatus = installStatuses[app.id];
                    return (
                      <tr
                        key={app.id}
              className={cn(
                          "hover:bg-surface-1 transition-colors cursor-pointer",
                          isSelected && "bg-neon-green/5"
                        )}
                        onClick={() => toggleAppSelection(app.id)}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAppSelection(app.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 accent-neon-green rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-neon-blue flex-shrink-0" />
                            <div>
                              <div className="text-sm font-medium text-foreground">{app.name}</div>
                              {installStatus && (
                                <div className="flex items-center gap-2 mt-1">
                                  {installStatus.status === "running" && (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin text-neon-blue" />
                                      <span className="text-xs text-muted-foreground">{installStatus.progress?.message}</span>
                                    </>
                                  )}
                                  {installStatus.status === "paused" && (
                                    <span className="text-xs text-neon-orange">En pause</span>
                                  )}
                                  {installStatus.status === "success" && (
                                    <CheckCircle2 className="w-3 h-3 text-neon-green" />
                                  )}
                                  {installStatus.status === "error" && (
                                    <XCircle className="w-3 h-3 text-neon-red" />
                                  )}
            </div>
          )}
              </div>
            </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <code className="text-xs text-muted-foreground font-mono">{app.id}</code>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">{app.description || "—"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredApps.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Aucune application trouvée
            </div>
          )}
        </div>
          </CardContent>
        </Card>
      )}

      {/* Popup de confirmation */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l'installation</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point d'installer {selectedApps.size} application{selectedApps.size > 1 ? "s" : ""} :
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-2 py-4">
            {Array.from(selectedApps).map(appId => {
              const app = POPULAR_APPS.find(a => a.id === appId);
              return app ? (
                <div key={appId} className="flex items-center gap-2 p-2 rounded-lg bg-surface-1">
                  <Package className="w-4 h-4 text-neon-blue" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{app.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{app.id}</div>
                  </div>
                </div>
              ) : null;
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={confirmInstallation} className="bg-neon-green/10 text-neon-green border-neon-green/30 hover:bg-neon-green/20">
              Confirmer l'installation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Popup de progression */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Installation en cours</DialogTitle>
            <DialogDescription>
              Suivi de l'installation des applications sélectionnées
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            {Array.from(selectedApps).map(appId => {
              const app = POPULAR_APPS.find(a => a.id === appId);
              const installStatus = installStatuses[appId];
              if (!app) return null;
              
              return (
                <div key={appId} className="p-4 rounded-lg border border-border bg-surface-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-neon-blue" />
                      <div>
                        <div className="text-sm font-medium">{app.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{app.id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {installStatus?.status === "running" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePause(appId)}
                            className="h-7"
                          >
                            <Pause className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancel(appId)}
                            className="h-7 text-neon-red"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {installStatus?.status === "paused" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResume(appId)}
                            className="h-7"
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancel(appId)}
                            className="h-7 text-neon-red"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {installStatus?.status === "success" && (
                        <CheckCircle2 className="w-4 h-4 text-neon-green" />
                      )}
                      {installStatus?.status === "error" && (
                        <XCircle className="w-4 h-4 text-neon-red" />
                      )}
                    </div>
                  </div>
                  {installStatus?.progress && (
                    <>
                      <Progress value={installStatus.progress.percent} className="h-2 mb-2" />
                      <div className="text-xs text-muted-foreground">{installStatus.progress.message}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                Array.from(selectedApps).forEach(appId => handleCancel(appId));
                setProgressDialogOpen(false);
              }}
              disabled={installingApps.length === 0}
            >
              Annuler toutes les installations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Popup application déjà installée */}
      <Dialog open={alreadyInstalledDialogOpen} onOpenChange={setAlreadyInstalledDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-neon-orange" />
              Application déjà installée
            </DialogTitle>
            <DialogDescription>
              {alreadyInstalledApp && (
                <>
                  L'application <strong>{alreadyInstalledApp.name}</strong> est déjà installée sur votre système.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => {
              setAlreadyInstalledDialogOpen(false);
              if (alreadyInstalledApp) {
                setSelectedApps(prev => {
                  const next = new Set(prev);
                  next.delete(alreadyInstalledApp.id);
                  return next;
                });
              }
            }}>
              Compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
