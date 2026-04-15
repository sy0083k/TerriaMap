# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development server (builds & watches, serves on port 3001)
yarn gulp dev

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
```

`index.js` is the integration point — it creates the `Terria` instance, registers `VWorldSearchProvider` with `SearchProviderFactory`, registers `AboutButton`, loads plugins, and shows the global disclaimer.

### Customisation pattern

All TerriaMap-specific code lives under `lib/`:

| Path                                  | Purpose                                        |
| ------------------------------------- | ---------------------------------------------- |
| `lib/Models/SearchProviders/`         | Custom search providers (VWorldSearchProvider) |
| `lib/Traits/SearchProviders/`         | Trait definitions for custom providers         |
| `lib/Views/`                          | UI wrappers and custom components              |
| `lib/Styles/variables-overrides.scss` | Theme variable overrides for TerriaJS          |
| `lib/Core/loadPlugins.ts`             | Plugin registration                            |

To add a new search provider:

1. Create traits in `lib/Traits/SearchProviders/` extending a TerriaJS base trait.
2. Create the provider in `lib/Models/SearchProviders/` extending `LocationSearchProviderMixin(CreateModel(YourTraits))` and implementing `doSearch()`.
3. Register in `index.js` with `SearchProviderFactory.register(type, ProviderClass)`.
4. Add to `wwwroot/config.json` or an init file.

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
