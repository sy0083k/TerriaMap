# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development server (builds & watches, serves on port 3001)
yarn gulp dev

# Run terriajs-server only (uses serverconfig.json)
yarn start

# Build
yarn gulp build          # development build
yarn gulp release        # production build

# Lint
yarn gulp lint           # ESLint on index.js and lib/

# Test (builds spec bundle → runs all specs in headless Chrome)
yarn test                # or: yarn gulp test
yarn gulp build-specs    # build spec bundle only, without running

# Formatting
yarn prettier            # format all files
yarn prettier-check      # check formatting (used in CI)

# Cleanup
yarn gulp clean          # removes wwwroot/build/
```

`yarn gulp test` is the only way to run tests — there is no way to run a single spec file without temporarily editing `buildprocess/webpack.config.specs.js` to narrow `specEntries`.

CI runs: `yarn install --frozen-lockfile` → `yarn gulp lint release` → `yarn test` (Node 22, 24, 25).

## Architecture

**TerriaMap is a customisation shell around TerriaJS.** TerriaJS (installed from `terriajs/terriajs#main`) provides essentially everything: the mapping engine (Cesium/Leaflet), catalog system, search provider framework, React UI components, and build tooling. TerriaMap layers Korean-specific features on top.

### Entry point flow

```
webpack entry: entry.js
  → lib/Views/render.jsx        React root; lazy-loads UI
  → lib/Views/terriaStore.ts    MobX store; async-imports index.js
  → index.js                    Terria init: registers providers & components, loads plugins
  → plugins.ts                  Plugin list (currently empty; add dynamic imports here)
```

`index.js` is the integration point — it creates the `Terria` instance, registers `VWorldSearchProvider` with `SearchProviderFactory`, registers `AboutButton`, loads plugins, and shows the global disclaimer.

### Customisation pattern

All TerriaMap-specific code lives under `lib/`:

| Path                                                       | Purpose                                            |
| ---------------------------------------------------------- | -------------------------------------------------- |
| `lib/Models/SearchProviders/VWorldSearchProvider.ts`       | VWorld address search provider                     |
| `lib/Models/SearchProviders/VWorldParcelBoundaryUtils.ts`  | Parcel boundary highlight via VWorld WFS + Turf.js |
| `lib/Traits/SearchProviders/VWorldSearchProviderTraits.ts` | Trait definitions for VWorldSearchProvider         |
| `lib/Views/`                                               | UI wrappers and custom components                  |
| `lib/Styles/variables-overrides.scss`                      | Theme variable overrides for TerriaJS              |
| `lib/Core/loadPlugins.ts`                                  | Plugin registration                                |

To add a new search provider:

1. Create traits in `lib/Traits/SearchProviders/` extending a TerriaJS base trait.
2. Create the provider in `lib/Models/SearchProviders/` extending `LocationSearchProviderMixin(CreateModel(YourTraits))` and implementing `doSearch()`.
3. Register in `index.js` with `SearchProviderFactory.register(type, ProviderClass)`.
4. Add to `wwwroot/config.json` or an init file.

### Parcel boundary highlighting

`VWorldParcelBoundaryUtils.ts` provides `highlightParcelBoundary()` and `removeParcelBoundaryHighlight()`. On a search result click it:

1. Calls the VWorld WFS API (`lp_pa_cbnd_bubun,lp_pa_cbnd_bonbun` typenames) to fetch the parcel polygon.
2. Converts the polygon to lines with Turf.js and adds three `GeoJsonCatalogItem` overlays to `terria.overlays` (halo, base, inner) for a layered stroke effect.
3. On Leaflet (not Cesium) and when `prefers-reduced-motion` is not set, starts a pulse animation using `setInterval`.
4. Results are cached in a module-level `Map` keyed by PNU ID or `longitude,latitude`.
5. The `wfsUrl` trait (default `https://api.vworld.kr/req/wfs`) is on `VWorldSearchProviderTraits` and must be set in `config.json` alongside `key`.

### Build tooling

TerriaMap delegates nearly all webpack and build configuration to terriajs:

- `buildprocess/webpack.config.js` — app bundle; calls `configureWebpack` from `terriajs/buildprocess/configureWebpack`
- `buildprocess/webpack.config.specs.js` — test bundle; collects `terriajs/test/SpecMain.ts` + `test/**/*Spec.{ts,tsx}`
- `buildprocess/jasmine-browser.mjs` — jasmine-browser-runner config (headless Chrome, port 9876)
- `gulpfile.js` — all tasks; `build-specs` also copies `msw/lib/mockServiceWorker.js` to `wwwroot/` for MSW

### Tests

Tests live in `test/` and use Jasmine + MSW (Mock Service Worker) for HTTP interception. The spec bundle is built by webpack and run by `jasmine-browser-runner` in headless Chrome.

MSW worker is exported from `node_modules/terriajs/test/mocks/browser` (the `test/` directory is included in the published terriajs package). The `SpecMain.ts` bootstrap is also taken from terriajs. Both are included in the spec bundle entry.

### Dependency management

TerriaMap pins its dependencies to match TerriaJS. Run `yarn gulp check-terriajs-dependencies` to detect mismatches, and `yarn gulp sync-terriajs-dependencies` then `yarn install` to fix them.

The `terriajs` package is installed from the GitHub main branch directly — not from npm. Expect its API to change; check TerriaJS changelogs when things break after `yarn install`.

## Style conventions

- 2-space indentation, UTF-8 encoding, final newline (per `.editorconfig`).
- Prettier is the formatting source of truth; ESLint extends the TerriaJS base config.
- PascalCase for React components and model classes; camelCase for utilities and locals.
- Test files: `*Spec.ts` / `*Spec.tsx`.

## Local-only files (do not commit)

`wwwroot/config.json` and `wwwroot/init/simple.json` contain local API keys and endpoints — never commit them. Use the tracked `.example` counterparts as templates.

## Final response

After completing any task that modifies repository files, suggest an appropriate git commit title in the final response.
