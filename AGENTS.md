# Repository Guidelines

## What This Repo Is

TerriaMap is a TerriaJS-based application shell. Most framework behavior comes from the upstream `terriajs` package; local customization lives in this repo.

The main local integration point is `index.js`. It creates the Terria app, registers `VWorldSearchProvider`, loads plugins, and shows the global disclaimer.

## Where To Work

- `lib/Models/SearchProviders/`: custom search providers and related utilities.
- `lib/Traits/SearchProviders/`: traits for custom search providers.
- `lib/Views/`: app-specific React/UI wrappers and view helpers.
- `lib/Core/loadPlugins.ts`: plugin loading.
- `test/`: app specs collected from `*Spec.ts` and `*Spec.tsx`.
- `buildprocess/`: webpack and Jasmine browser-runner config.
- `wwwroot/`: static assets, init files, translations, test fixtures, and generated bundles.

Keep TerriaMap-specific behavior close to the affected model, trait, or view instead of introducing broad shared folders.

## Commands

- `yarn install`: install dependencies for Node `>=20`.
- `yarn gulp dev`: watch app assets/code and start `terriajs-server` on port `3001`.
- `yarn start`: run `terriajs-server` with `serverconfig.json`.
- `yarn gulp build`: development build into `wwwroot/build/`.
- `yarn gulp release`: production build into `wwwroot/build/`.
- `yarn gulp lint`: run ESLint on `index.js` and `lib/`.
- `yarn test`: build the spec bundle, then run Jasmine in headless Chrome.
- `yarn gulp build-specs`: build the browser spec bundle without running tests.
- `yarn gulp clean`: remove `wwwroot/build/`.
- `yarn prettier` / `yarn prettier-check`: format or verify formatting.

## Testing And CI

Tests are browser specs bundled by `buildprocess/webpack.config.specs.js`. The bundle includes TerriaJS `test/SpecMain.ts` plus this repo's `test/**/*Spec.ts(x)` files, then runs through `buildprocess/jasmine-browser.mjs` in headless Chrome.

Prefer focused Jasmine specs near the affected feature. The current local example is `test/Models/SearchProviders/VWorldSearchProviderSpec.ts`.

Before finishing substantial code changes, run:

- `yarn test`
- `yarn gulp lint`

For changes that affect bundling, build output, or CI-sensitive paths, also run:

- `yarn gulp release`

GitHub Actions CI currently runs Node `22.x`, `24.x`, and `25.x`, then executes:

- `yarn install --frozen-lockfile`
- `yarn gulp lint release`
- `yarn test`

## Style And Safety

Use 2-space indentation, UTF-8, and final newlines per `.editorconfig`. Prettier is the formatting source of truth, and ESLint extends the TerriaJS base config from `.eslintrc.js`.

Follow existing naming patterns:

- PascalCase for React/view classes and components.
- camelCase for utilities, helpers, and locals.
- `*Spec.ts` / `*Spec.tsx` for spec files.

Do not commit local secrets or machine-specific config. Keep `wwwroot/config.json` and `wwwroot/init/simple.json` local-only; use `wwwroot/config.json.example` and `wwwroot/init/simple.json.example` as tracked templates.

## Final Response Expectations

After completing any task that modifies repository files, suggest an appropriate git commit title in the final response. Repository file changes include both code changes and documentation changes.

## Dependency Notes

This repo depends heavily on upstream TerriaJS build tooling and APIs. If dependency mismatches appear, use:

- `yarn gulp check-terriajs-dependencies`
- `yarn gulp sync-terriajs-dependencies`

Then rerun `yarn install`.
