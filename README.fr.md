# TW-Scroll-Layout

[English](README.md) · **Français**

![Status](https://img.shields.io/badge/status-stable-green)
![TiddlyWiki](https://img.shields.io/badge/TiddlyWiki-%E2%89%A55.3.0-blue)

Un plugin de mise en page TiddlyWiki qui donne au story river, aux onglets de la barre latérale et à leur contenu leurs propres zones de défilement indépendantes. La page ne défile plus d'un bloc — chaque zone défile sur place.

## Présentation

Par défaut, TiddlyWiki fait défiler toute la fenêtre du navigateur. Ce plugin remplace ce comportement par des zones de défilement isolées :

- **Story river** — défile indépendamment dans sa colonne
- **Contenu des onglets de la barre latérale** — défile indépendamment dans le panneau d'onglet
- **Barre d'onglets de la barre latérale** — reste fixe ; seul le contenu en dessous défile

Tout le reste (barre supérieure, en-tête de la barre latérale, cadre de la mise en page) reste fixe à l'écran.

Le plugin ne s'active que lorsque sa mise en page est sélectionnée (`$:/layout` = `$:/plugins/nikorion/scroll-layout/layout`). Toutes les autres mises en page retrouvent exactement le comportement du core — aucun effet de bord quand la mise en page est inactive.

## Fonctionnalités

**Zones de défilement indépendantes**

Le story river devient un widget `$scrollable` (`fallthrough="no"`), qui intercepte tous les événements de défilement et fait défiler la colonne du river au lieu de la fenêtre. La barre latérale utilise une chaîne flex complète pour que la hauteur se propage de `.tc-sidebar-scrollable` jusqu'au panneau de contenu des onglets, seul nœud qui défile.

**Titres de tiddlers collants**

Quand l'option `stickytitles` est activée dans le thème Vanilla, les titres des tiddlers restent collés en haut du story river pendant le défilement. Le plugin conditionne ce comportement à la même option du thème : désactiver les titres collants dans les réglages du thème les désactive donc aussi ici.

Quand un titre collant se détache de son cadre (le cadre a défilé au-dessus du bord supérieur du river), la classe `tc-tiddler-stuck` est ajoutée à l'élément du titre. Elle déclenche un traitement visuel : des marges latérales négatives étendent la barre d'un bord à l'autre, et une ombre portée signale l'état détaché.

**Prise en charge des mises en page de la barre latérale**

Les deux mises en page de barre latérale de Vanilla sont gérées :

| Mise en page | Comportement |
|---|---|
| `fixed-fluid` | Largeur du river = `storyright − storyleft` ; barre latérale alignée sur sa limite |
| `fluid-fixed` | Le river est en `width:auto` avec `margin-right: sidebarwidth + 6px` ; la barre latérale reçoit une marge intérieure gauche |

Quand la barre latérale est masquée, le river s'étend automatiquement à toute la largeur disponible.

**Correctif du défilement vers l'élément**

Le storyview classique appelle `$tw.pageScroller.scrollIntoView()`, qui fait défiler la fenêtre du navigateur. Quand le river est un widget `$scrollable`, le `overflow:hidden` posé sur `body` empêche le défilement de la fenêtre — les tiddlers nouvellement ouverts ne défileraient pas jusqu'à l'écran.

Le module de démarrage corrige `$tw.pageScroller.scrollIntoView` : quand l'élément cible se trouve dans `.tc-story-river`, le correctif utilise à la place le `element.scrollIntoView()` natif du navigateur, qui fait défiler l'ancêtre défilant le plus proche (le div intérieur du widget `$scrollable`). Un `requestAnimationFrame` diffère la vérification pour laisser aux nœuds DOM nouvellement insérés le temps de se rattacher avant l'appel à `closest()`.

## Installation

**Démo en ligne** : [https://nikorion.github.io/TW-Scroll-Layout/](https://nikorion.github.io/TW-Scroll-Layout/) — pour essayer le plugin avant de l'installer.

**Depuis la bibliothèque de plugins nikorion** (TiddlyWiki propose ensuite chaque nouvelle version en mise à jour) :

1. Dans votre wiki, créer un tiddler tagué `$:/tags/PluginLibrary`, avec un champ `url` valant `https://nikorion.github.io/tw-dev/library/index.html` et une `caption` comme `nikorion`.
2. Ouvrir *Panneau de configuration → Plugins → Obtenir d'autres plugins*, choisir la bibliothèque nikorion et installer **Scroll Layout**.

**À la main** : télécharger [`TW-Scroll-Layout-Plugin.json`](https://nikorion.github.io/TW-Scroll-Layout/TW-Scroll-Layout-Plugin.json) et le glisser-déposer sur votre wiki.

Nécessite TiddlyWiki ≥ 5.3.0.

Ensuite, ouvrir le sélecteur de mise en page (icône d'engrenage → Layout) et choisir **Scroll Layout**.

## Développement

```
pnpm install
pnpm dev      # wiki de dev + rechargement à chaud ; l'URL (port libre aléatoire) s'affiche au démarrage
pnpm build    # dist/TW-Scroll-Layout-Plugin.json + docs/ (wiki de démo, publié par la CI)
```

Les sources sont dans `src/scroll-layout/`. Le wiki de dev est dans `wiki/`. `pnpm dev` lance le serveur de dev partagé `../tw-dev` (cloné à côté de ce dépôt), qui associe nodemon (ne redémarre TW que sur modification d'un module JS ou de `plugin.info`) à un serveur de rechargement à chaud du contenu par SSE : les tiddlers de contenu (`.tid`, `.multids`, `.css`…) sont remplacés à chaud dans le navigateur, état conservé, tandis qu'une modification de module déclenche un redémarrage puis un rechargement complet une fois TW revenu.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/scroll-layout/plugin.info` | Métadonnées du plugin |
| `src/scroll-layout/layout.tid` | Point d'entrée de la mise en page (tag `$:/tags/Layout`) — transclut le modèle de page du core |
| `src/scroll-layout/story.tid` | Surcharge du shadow `$:/core/ui/PageTemplate/story` — enveloppe le story river dans un `$scrollable` |
| `src/scroll-layout/stylesheet.tid` | Tout le CSS — conditionné à l'activation de la mise en page |
| `src/scroll-layout/modules/startup.js` | Correctif de `$tw.pageScroller` + écouteur de défilement pour `tc-tiddler-stuck` |

## Compatibilité

- TiddlyWiki ≥ 5.3.0
- Thème Vanilla (le CSS cible les tiddlers de métriques et les noms de classes de Vanilla)
- Aucune dépendance externe

## Historique des versions

**v1.0.0**

Première version. Zones de défilement isolées pour le story river et le contenu des onglets de la barre latérale. Titres collants avec l'état de cadre détaché `tc-tiddler-stuck`. Correctif de `$tw.pageScroller` pour le défilement vers l'élément dans les conteneurs `$scrollable`. Prise en charge complète des mises en page de barre latérale fixed-fluid et fluid-fixed, avec repli quand la barre latérale est masquée.

## Licence

Licence MIT — voir `LICENSE`
