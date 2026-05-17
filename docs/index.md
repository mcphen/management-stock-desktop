# Documentation — Management Stock Desktop

Application Electron offline-first pour la gestion de stock et facturation de SAMABOIS.

---

## Table des matières

| Fichier | Contenu |
|---------|---------|
| [architecture.md](./architecture.md) | Stack technique, processus Electron, sécurité, schéma de base de données |
| [developpement.md](./developpement.md) | Installer l'environnement, lancer en mode dev, résoudre les problèmes courants |
| [sync-offline.md](./sync-offline.md) | Fonctionnement de la synchronisation offline ↔ serveur Laravel |
| [release-distribution.md](./release-distribution.md) | Créer une release, distribuer aux clients, auto-updater |

---

## Vue d'ensemble rapide

```
Clients (5 employés)
    │
    ▼
┌─────────────────────────────┐
│  App Electron (Windows)     │
│  Vue 3 + TypeScript         │
│  SQLite local (offline)     │
│  Sync auto quand en ligne   │
└────────────┬────────────────┘
             │ HTTP / Sanctum Bearer Token
             ▼
┌─────────────────────────────┐
│  Serveur Laravel 10         │
│  API REST /api/v1           │
│  MySQL                      │
└─────────────────────────────┘
```

## Contexte métier

- **Secteur** : Négoce de bois (SAMABOIS)
- **Utilisateurs** : ~5 employés internes
- **Besoin clé** : Travailler sans connexion internet, synchroniser dès que le réseau est disponible
- **OS cible** : Windows 10/11

## Contacts & repo

- **Repo GitHub** : https://github.com/mcphen/management-stock-desktop
- **API Laravel** : `c:\laragon\www\HASSAN\management-stock`
