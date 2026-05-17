# Release et distribution

## Comment créer une nouvelle version

### 1. Incrémenter la version

Dans `package.json`, mettre à jour le champ `version` :

```json
{
  "version": "1.1.0"
}
```

Respecter le **versioning sémantique** :
- `1.0.X` → correctif de bug (patch)
- `1.X.0` → nouvelle fonctionnalité (minor)
- `X.0.0` → changement majeur incompatible (major)

### 2. Committer et tagger

```bash
git add package.json package-lock.json
git commit -m "chore: bump version to 1.1.0"

# Créer le tag — c'est ce qui déclenche le build CI
git tag v1.1.0
git push origin main
git push origin v1.1.0
```

### 3. GitHub Actions fait le reste automatiquement

Le workflow `.github/workflows/release.yml` se déclenche sur chaque tag `v*` et :
1. Installe les dépendances (`npm ci`)
2. Recompile `better-sqlite3` pour Electron (module natif)
3. Compile le renderer Vite
4. Compile le main process TypeScript
5. Génère l'installeur Windows `Gestion Stock Setup X.Y.Z.exe`
6. Publie sur GitHub Releases (accessible via l'onglet Releases du repo)

Durée approximative : **3 à 5 minutes**.

---

## Prérequis pour que le CI fonctionne

### Secret GH_TOKEN

Le workflow a besoin d'un token GitHub pour publier la release.

**Configurer une seule fois :**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Générer un token avec le scope `repo` complet
3. Sur le repo : Settings → Secrets and variables → Actions → New repository secret
4. Nom : `GH_TOKEN` / Valeur : le token

**Si le workflow échoue avec** `GitHub Personal Access Token is not set` :
→ Le secret est absent ou mal nommé. Vérifier dans Settings → Secrets.
→ Re-run le workflow via Actions → Release → Re-run all jobs.

---

## Auto-updater

### Fonctionnement côté client

Quand une nouvelle version est publiée sur GitHub Releases :

1. **15 secondes après le démarrage** de l'app, `electron-updater` vérifie GitHub
2. Si une version plus récente existe → une **bannière bleue** apparaît en haut de l'écran
   > "Nouvelle version v1.1.0 disponible — [Télécharger]"
3. L'utilisateur clique **Télécharger** → l'installeur se télécharge en arrière-plan
4. Quand c'est prêt → bannière verte
   > "Mise à jour v1.1.0 prête — [Redémarrer]"
5. L'utilisateur clique **Redémarrer** → l'app s'installe et redémarre

### En mode développement

L'auto-updater est **désactivé** en mode dev (`npm run electron:dev`).
La page Paramètres affiche "Mode développement" lors d'une vérification manuelle.

### Fichiers générés par electron-builder

```
release/
├── Gestion Stock Setup 1.0.0.exe        ← installeur NSIS
├── Gestion Stock Setup 1.0.0.exe.blockmap
└── latest.yml                            ← lu par electron-updater pour vérifier les updates
```

`latest.yml` contient le checksum SHA-512 et l'URL de téléchargement.
electron-updater lit ce fichier pour savoir si une update est disponible.

---

## Distribution aux clients

### Première installation (manuelle)

Pour chaque nouvel employé :
1. Télécharger `Gestion Stock Setup X.Y.Z.exe` depuis l'onglet **Releases** du repo GitHub
2. Envoyer le fichier par email/WhatsApp/clé USB
3. L'employé double-clique sur le fichier

**Windows affiche un avertissement SmartScreen** (app non signée) :
> "Windows a protégé votre PC"

L'employé doit cliquer :
- **"Informations complémentaires"** (lien discret en bas)
- Puis **"Exécuter quand même"**

Cela ne se produit qu'à la **première installation**. Les mises à jour suivantes via
l'auto-updater passent sans avertissement.

### Mises à jour suivantes (automatiques)

Rien à faire — l'auto-updater gère tout. L'utilisateur voit juste la bannière et
clique "Redémarrer".

---

## Signature de code (Code Signing)

### Situation actuelle

L'app n'est **pas signée** — c'est acceptable pour 5 utilisateurs internes connus.
L'avertissement SmartScreen se contourne en 2 clics.

### Quand signer ?

Quand l'app sera distribuée à des clients externes (hors de la startup), il faudra
signer pour éviter l'avertissement. Options :

| Option | Prix | SmartScreen |
|--------|------|-------------|
| **Certum OV** | ~35€/an | Réduit (réputation à construire) |
| **Sectigo OV** | ~80€/an | Réduit |
| **Certum EV** | ~150€/an | Supprimé immédiatement |
| **Certum Open Source** | Gratuit | Réduit — si projet public GitHub |
| **SignPath Foundation** | Gratuit | Réduit — si projet open-source |

### Intégrer la signature dans le CI

Une fois un certificat obtenu (`cert.pfx`), ajouter dans le workflow :

```yaml
- name: Build & publish
  env:
    GH_TOKEN: ${{ secrets.GH_TOKEN }}
    CSC_LINK: ${{ secrets.CSC_LINK }}          # cert.pfx en base64
    CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
  run: npx electron-builder --win --publish always
```

Et dans `package.json` :
```json
"win": {
  "target": "nsis",
  "certificateFile": "cert.pfx",
  "signingHashAlgorithms": ["sha256"]
}
```

---

## Rollback — revenir à une version précédente

Si une version publiée est défectueuse :

1. Télécharger l'ancien installeur depuis l'onglet Releases
2. Le distribuer manuellement
3. Supprimer la release défectueuse sur GitHub pour que l'auto-updater
   ne la propose plus

Il n'y a pas de mécanisme de rollback automatique.

---

## Checklist de release

- [ ] `npm run typecheck` → zéro erreur TypeScript
- [ ] `npm run build:electron && npm run build:renderer` → compilation propre
- [ ] Tester la fonctionnalité principale avec `npm run start`
- [ ] Mettre à jour `version` dans `package.json`
- [ ] Committer, tagger (`v1.X.Y`), pousser le tag
- [ ] Vérifier que le workflow GitHub Actions passe au vert (~5 min)
- [ ] Tester l'installeur téléchargé depuis GitHub Releases sur une vraie machine
- [ ] Prévenir les utilisateurs (la bannière auto-updater le fera aussi)
