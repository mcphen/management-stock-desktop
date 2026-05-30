# Release et distribution

Ce document decrit la generation, la publication et la distribution de
l'application desktop SAMABOIS.

## Configuration Electron Builder

La configuration de packaging se trouve dans le champ `build` de
`package.json`.

Points importants actuellement configures :

- `productName`: `SAMABOIS`
- `appId`: `com.samabois.stock`
- `artifactName`: `SAMABOIS Setup X.Y.Z.exe`
- cible Windows: `nsis`
- icone Windows: `public/icon.ico`
- licence installateur: `build/license.txt`
- langue installateur: `French`
- sortie build: `release/`
- publication GitHub: `mcphen/management-stock-desktop`

La publication GitHub est configuree ainsi :

```json
"publish": {
  "provider": "github",
  "owner": "mcphen",
  "repo": "management-stock-desktop"
}
```

Le repo cible est :

```text
https://github.com/mcphen/management-stock-desktop
```

## Verifications locales

Avant toute release, lancer :

```bash
npm run typecheck
npm run build:renderer
npm run build:electron
```

Pour verifier Electron Builder sans creer l'installateur complet :

```bash
npx electron-builder --win --dir --publish never
```

Pour generer l'installateur Windows sans publier sur GitHub :

```bash
npx electron-builder --win --publish never
```

Fichiers attendus :

```text
release/
  SAMABOIS Setup 1.0.0.exe
  SAMABOIS Setup 1.0.0.exe.blockmap
  latest.yml
  win-unpacked/
    SAMABOIS.exe
```

## Creer une nouvelle version

### 1. Incrementer la version

Dans `package.json`, mettre a jour le champ `version` :

```json
{
  "version": "1.1.0"
}
```

Respecter le versioning semantique :

- `1.0.X`: correctif de bug
- `1.X.0`: nouvelle fonctionnalite
- `X.0.0`: changement majeur incompatible

### 2. Committer et tagger

```bash
git add package.json package-lock.json
git commit -m "chore: bump version to 1.1.0"

git tag v1.1.0
git push origin main
git push origin v1.1.0
```

Le tag `v*` sert de declencheur pour le workflow de release.

## Publication GitHub

Le projet utilise `electron-updater`, donc les releases GitHub doivent contenir :

- l'installateur `.exe`
- le `.blockmap`
- `latest.yml`

La commande de publication attendue en CI est :

```bash
npx electron-builder --win --publish always
```

### Secret GH_TOKEN

Le token `GH_TOKEN` est necessaire pour publier la release GitHub. Dans ce
projet, il est considere deja configure.

Il doit avoir acces au repo :

```text
mcphen/management-stock-desktop
```

Si un jour la publication echoue avec `GitHub Personal Access Token is not set`,
verifier le secret `GH_TOKEN` dans :

```text
GitHub repo > Settings > Secrets and variables > Actions
```

## Auto-updater

Quand une nouvelle version est publiee sur GitHub Releases :

1. L'application verifie GitHub via `electron-updater`.
2. Si une version plus recente existe, une banniere de mise a jour apparait.
3. L'utilisateur telecharge la mise a jour depuis l'application.
4. Quand le telechargement est pret, l'utilisateur redemarre l'application.
5. La nouvelle version s'installe.

En mode developpement, l'auto-updater est desactive.

## Distribution interne

L'application est prevue pour un usage interne SAMABOIS.

Premiere installation :

1. Recuperer `SAMABOIS Setup X.Y.Z.exe` depuis `release/` ou GitHub Releases.
2. Transmettre l'installateur a l'utilisateur autorise.
3. L'utilisateur lance l'installateur.
4. L'assistant d'installation s'affiche en francais.
5. La licence `build/license.txt` est affichee pendant l'installation.

Comme l'application n'est pas signee, Windows SmartScreen peut afficher un
avertissement a la premiere installation. Pour un usage interne avec utilisateurs
connus, c'est acceptable.

## Signature de code

La signature Windows n'est pas obligatoire pour l'usage interne actuel.

Elle deviendra utile si l'application est distribuee largement ou a des clients
externes, afin de reduire les alertes SmartScreen.

Variables habituelles si une signature est ajoutee plus tard :

```yaml
env:
  GH_TOKEN: ${{ secrets.GH_TOKEN }}
  CSC_LINK: ${{ secrets.CSC_LINK }}
  CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
```

## Rollback

Si une version publiee est defectueuse :

1. Telecharger l'ancien installateur depuis GitHub Releases.
2. Le redistribuer manuellement.
3. Supprimer ou de-publier la release defectueuse pour eviter que
   l'auto-updater la propose.

Il n'y a pas de rollback automatique.

## Checklist de release

- [ ] `npm run typecheck` passe.
- [ ] `npm run build:renderer` passe.
- [ ] `npm run build:electron` passe.
- [ ] `npx electron-builder --win --dir --publish never` passe.
- [ ] `npx electron-builder --win --publish never` passe localement si besoin.
- [ ] `version` est mise a jour dans `package.json`.
- [ ] Le tag `vX.Y.Z` est cree et pousse.
- [ ] La release GitHub contient l'installateur, le blockmap et `latest.yml`.
- [ ] L'installateur est teste sur une vraie machine Windows.
- [ ] Les utilisateurs internes sont prevenus.
