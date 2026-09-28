# TW-Scroll-Layout — contexte projet pour Claude

> **Avant toute tâche sur ce plugin, consulter d'abord le `CLAUDE.md` du workspace** (`../CLAUDE.md`) et ses `guides/` : outillage de dev commun (pnpm, `dev.cjs`/HMR, Ctrl+C, git push), pièges PowerShell/Windows, `publishFilter`, conventions modules JS, symlink. Ci-dessous : uniquement le spécifique à TW-Scroll-Layout.

## Ce que c'est
Plugin TiddlyWiki (`$:/plugins/nikorion/scroll-layout`) qui remplace le layout par défaut par un layout avec zones de scroll indépendantes : le story river, les onglets de la sidebar et le contenu des onglets scrollent chacun séparément. Auteur : nikorion.

## Structure
```
src/scroll-layout/              ← sources du plugin (seul dossier à toucher)
  modules/
    startup.js                  ← patch de $tw.pageScroller + gestion tc-tiddler-stuck
  layout.tid                    ← layout TW (tag $:/tags/Layout) : story river $scrollable inline (backdrop/frontdrop)
  styles/
    styles.tid                  ← feuille de style (tag $:/tags/Stylesheet, titre .../styles/styles) : conditions <$reveal> + vars de config ; transclut base.css
    base.css                    ← CSS statique : scroll river + chaîne flex sidebar + scrollbars
  default-config.multids        ← défauts de config (scrollbar-*, en shadow override)
  settings.tid                  ← onglet ControlPanel (titre .../settings)
  readme.tid / history.tid / licence.tid
  language/                     ← i18n : lingo.tid + en-GB/fr-FR (readme + settings)
  plugin.info                   ← métadonnées du plugin

wiki/                           ← wiki TW de développement
  tiddlywiki.info               ← config : plugins chargés, targets build plugin-json + html
  tiddlers/
    system/                     ← tiddlers de config UI + $__dev-hmr.tid + $__config_SyncFilter.tid

dist/                           ← généré par pnpm build, gitignored
docs/                           ← TW-Scroll-Layout-Wiki.html standalone (distribution)
```

## Spécificités dev
- `pnpm build` → `dist/TW-Scroll-Layout-Plugin.json` + `docs/TW-Scroll-Layout-Wiki.html`. Build HTML `publishFilter` (`../guides/build-html-publishfilter.md`) : `highlight` gardé (officiel TW).
- HMR : les `.tid`/`.css`/`.multids` (`layout`, `styles/styles`, `styles/base.css`…) sont poussés à chaud ; un changement de `startup.js` reboote. `nodemon.json` surveille `src/scroll-layout/modules` + `plugin.info`. `eslint.config.js` : ES2021. Plugins actifs du wiki : scroll-layout, filesystem, tiddlyweb.

## Architecture du plugin

### startup.js
Deux responsabilités :

**1. Patch de `$tw.pageScroller.scrollIntoView`**
Le storyview classique appelle `$tw.pageScroller.scrollIntoView()` qui scrolle la fenêtre — mais quand le story river est un `$scrollable` widget, la fenêtre ne scroll pas (`overflow:hidden` sur body). Le patch détecte si l'élément est dans `.tc-story-river` et utilise `element.scrollIntoView()` natif à la place (scrolle l'ancêtre scrollable le plus proche). Un `requestAnimationFrame` defer l'exécution pour que le nœud DOM soit connecté avant le test `closest()`.

**2. Gestion de `tc-tiddler-stuck`**
Écoute les événements `scroll` en capture sur `.tc-story-river`. Ajoute `tc-tiddler-stuck` sur les `.tc-tiddler-title` dont le sticky a décroché de son frame (frame scrollé au-dessus du conteneur). Nécessite la phase de capture car les événements scroll ne remontent pas.

### layout.tid
Layout TW (`tag $:/tags/Layout`), sélectionné via `$:/layout` — plus d'override de `$:/core/ui/PageTemplate/story`. Le story river y est **inline** : `<$scrollable class="tc-story-river" fallthrough="no">` encadrant `story-backdrop` (première section) et `story-frontdrop` (dernière), sur lesquelles le CSS restaure les marges de padding perdues.

### styles/ — deux fichiers, découpage volontaire
- **styles.tid** — la //vraie// feuille de style (`tag $:/tags/Stylesheet`, `type text/vnd.tiddlywiki`), seule appliquée par TW. Porte le wikitext : `<$reveal>` gaté sur `$:/layout`, vars `--nk-scrollbar-*` transcluses depuis `$:/config/nikorion/scroll-layout/...`, branches fixed-fluid/fluid-fixed et sticky titles. Transclut `base.css` (`{{.../styles/base.css}}`).
- **base.css** — CSS pur, statique, **non taggé Stylesheet** (jamais appliqué seul, uniquement injecté par la transclusion ci-dessus) : `overflow:hidden` html/body, hauteur du river `calc(100vh - storytop)`, chaîne flex sidebar jusqu'au `.tc-tab-content`, scrollbars Gecko/Webkit, `tc-tiddler-stuck`.

Titres : les deux suivent titre=chemin (`.../scroll-layout/styles/styles` et `.../scroll-layout/styles/base.css`), conformément à la convention du workspace. Rien de dérogatoire ici.
