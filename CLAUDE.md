# TW-Scroll-Layout — contexte projet pour Claude

## Ce que c'est
Plugin TiddlyWiki (`$:/plugins/nikorion/scroll-layout`) qui remplace le layout par défaut par un layout avec zones de scroll indépendantes : le story river, les onglets de la sidebar et le contenu des onglets scrollent chacun séparément. Auteur : nikorion.

## Structure
```
src/scroll-layout/              ← sources du plugin (seul dossier à toucher)
  modules/
    startup.js                  ← patch de $tw.pageScroller + gestion tc-tiddler-stuck
  layout.tid                    ← layout TW (tag $:/tags/Layout)
  story.tid                     ← override de $:/core/ui/PageTemplate/story
  stylesheet.tid                ← CSS : scroll indépendant story river + sidebar
  plugin.info                   ← métadonnées du plugin

wiki/                           ← wiki TW de développement (ne pas versionner StoryList/HistoryList)
  tiddlywiki.info               ← config : plugins chargés, targets build plugin-json + html
  tiddlers/
    system/                     ← tiddlers de config UI + $__dev-hmr.tid + $__config_SyncFilter.tid

dist/                           ← généré par pnpm build, gitignored
docs/                           ← TW-Scroll-Layout.html standalone (distribution)
scripts/
  dev.cjs                       ← orchestrateur pnpm dev (résout les ports, spawn nodemon + dev-hmr)
  dev-hmr.cjs                   ← serveur SSE de HMR de contenu (reboot/reload sur changement de module)
```

## Workflow dev
```
pnpm install
pnpm lint     # ESLint sur src/scroll-layout/modules/*.js
pnpm dev      # TW sur :8080 (défaut ; port libre si occupé) + HMR SSE — l'URL est affichée
pnpm build    # génère dist/TW-Scroll-Layout-Plugin.json + docs/TW-Scroll-Layout-Wiki.html
```

`pnpm dev` lance `scripts/dev.cjs`, orchestrateur (calqué sur TW-Hover-Tilt, zéro dépendance ajoutée) qui :
1. résout le port TW (défaut **8080**, sinon un port libre aléatoire si 8080 est pris) et le port SSE du HMR (défaut **35730**, même logique) — « move aside » ;
2. écrit le port SSE résolu dans le tiddler git-ignoré `$:/config/dev/hmr-port` (fichier `wiki/tiddlers/$__dev-hmr-port.tid`), lu par le client navigateur ;
3. lance en parallèle (spawn direct, plus de `concurrently`) :
   - **nodemon** → reboote TW **uniquement** sur changement de module JS / `plugin.info` (port injecté via `--exec` ; celui de `nodemon.json` n'est qu'un fallback standalone)
   - **dev-hmr.cjs** → serveur SSE de **HMR de contenu** : les tiddlers `.tid` (`layout`, `story`, `stylesheet`) modifiés sont poussés à chaud (override de shadow en mémoire, état préservé) ; un changement de `startup.js` déclenche reboot + reload complet une fois TW prêt

Le client `$:/dev/hmr` (`wiki/tiddlers/system/$__dev-hmr.tid`) ouvre l'EventSource (port lu dans `$:/config/dev/hmr-port`, fallback 35730). Le garde-fou `$:/config/SyncFilter` (`wiki/tiddlers/system/$__config_SyncFilter.tid`) exclut le préfixe du plugin du sync tiddlyweb pour que les overrides HMR ne soient jamais persistés sur disque. Principe détaillé : `../guides/hmr-tiddlywiki.md`.

## Build html (docs/) — publishFilter
`--rendertiddler $:/core/save/all` embarque tout le store de tiddlers chargé dans wiki, pas seulement le plugin. La target `html` passe la variable `publishFilter` (mécanisme core du bouton "Download full wiki") en args supplémentaires de `--rendertiddler` pour exclure les tiddlers de dev :
```json
"--rendertiddler", "$:/core/save/all", "TW-Scroll-Layout-Wiki.html", "text/plain", "",
"publishFilter", "-[[$:/dev/hmr]] -[[$:/config/dev/hmr-port]] -[[$:/config/SyncFilter]] -[[$:/plugins/wikilabs/link-to-tabs]] -[[$:/plugins/kookma/commander]] -[[$:/plugins/oeyoews/tiddlywiki-codemirror-6]]"
```
Le `""` avant `publishFilter` est le slot `template` (inutilisé, à laisser vide sinon les index se décalent). Exclus : les tiddlers de dev du HMR + `link-to-tabs`, `commander`, `codemirror-6` (confort perso, installés dans `wiki/tiddlers/system/` par glisser-déposé). Gardé : `highlight` (plugin officiel TiddlyWiki).

## Fichiers de config
- [package.json](package.json) — scripts pnpm, dépendances dev
- [scripts/dev.cjs](scripts/dev.cjs) — orchestrateur `pnpm dev` : résolution des ports (défaut/libre) + spawn nodemon & dev-hmr
- [scripts/dev-hmr.cjs](scripts/dev-hmr.cjs) — serveur SSE de HMR de contenu (+ reboot/reload sur changement de module)
- [nodemon.json](nodemon.json) — watch `src/scroll-layout/modules` + `plugin.info` (port de fallback standalone ; `dev.cjs` surcharge le port réel)
- [eslint.config.js](eslint.config.js) — lint ES2021, sourceType "script" (IIFE)
- [wiki/tiddlywiki.info](wiki/tiddlywiki.info) — plugins actifs : scroll-layout, filesystem, tiddlyweb ; pluginPath: `../src`

## Architecture du plugin

### startup.js
Deux responsabilités :

**1. Patch de `$tw.pageScroller.scrollIntoView`**
Le storyview classique appelle `$tw.pageScroller.scrollIntoView()` qui scrolle la fenêtre — mais quand le story river est un `$scrollable` widget, la fenêtre ne scroll pas (`overflow:hidden` sur body). Le patch détecte si l'élément est dans `.tc-story-river` et utilise `element.scrollIntoView()` natif à la place (scrolle l'ancêtre scrollable le plus proche). Un `requestAnimationFrame` defer l'exécution pour que le nœud DOM soit connecté avant le test `closest()`.

**2. Gestion de `tc-tiddler-stuck`**
Écoute les événements `scroll` en capture sur `.tc-story-river`. Ajoute `tc-tiddler-stuck` sur les `.tc-tiddler-title` dont le sticky a décroché de son frame (frame scrollé au-dessus du conteneur). Nécessite la phase de capture car les événements scroll ne remontent pas.

### story.tid
Override de `$:/core/ui/PageTemplate/story`. Conditionnel sur `$:/layout` :
- Si scroll-layout actif → `$scrollable` avec `fallthrough="no"`
- Sinon → comportement core exact (section statique)

### stylesheet.tid
Conditionnel sur `$:/layout`. Gère :
- `overflow:hidden` sur html/body
- Story river : hauteur `calc(100vh - storytop)`, scroll indépendant
- Sidebar : chaîne flex complète jusqu'au `.tc-tab-content` qui scrolle seul
- Titres sticky + état `tc-tiddler-stuck` (ombre + marges négatives)
- Fixed-fluid et fluid-fixed : ajustements de largeur/marges

## Symlink TIDDLYWIKI_PLUGIN_PATH
Le symlink doit pointer vers `src/scroll-layout/` :
```
C:\Users\Nico\tw\plugins\nikorion\scroll-layout → D:\projets\devops\tw\plugins\nikorion\TW-Scroll-Layout\src\scroll-layout
```

## Points d'attention Windows
- `pnpm dev` nécessite **deux Ctrl+C** pour quitter : comportement normal sur Windows.
- Voir le CLAUDE.md du projet TW-Math (`D:\projets\devops\tw\plugins\nikorion\TW-Math\CLAUDE.md`) pour les pièges PowerShell (BOM UTF-8, fins de ligne, etc.) — les mêmes s'appliquent ici.
