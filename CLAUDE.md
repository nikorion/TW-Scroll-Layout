# TW-Scroll-Layout — contexte projet pour Claude

> **Avant toute tâche sur ce plugin, consulter d'abord le `CLAUDE.md` du workspace** (`../CLAUDE.md`) et ses `guides/` : outillage de dev commun (pnpm, `dev.cjs`/HMR, Ctrl+C, git push), pièges PowerShell/Windows, `publishFilter`, conventions modules JS, symlink. Ci-dessous : uniquement le spécifique à TW-Scroll-Layout.

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
docs/                           ← TW-Scroll-Layout-Wiki.html standalone (distribution)
```

## Spécificités dev
- `pnpm build` → `dist/TW-Scroll-Layout-Plugin.json` + `docs/TW-Scroll-Layout-Wiki.html`. Build HTML `publishFilter` (`../guides/build-html-publishfilter.md`) : `highlight` gardé (officiel TW).
- HMR : les `.tid` (`layout`, `story`, `stylesheet`) sont poussés à chaud ; un changement de `startup.js` reboote. `nodemon.json` surveille `src/scroll-layout/modules` + `plugin.info`. `eslint.config.js` : ES2021. Plugins actifs du wiki : scroll-layout, filesystem, tiddlyweb.

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
