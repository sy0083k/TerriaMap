# Repository Guidelines

## Project Structure & Module Organization

TerriaMap is a Yarn workspace app built around TerriaJS. Application code lives in `lib/`, with feature areas split into `Core/`, `Models/`, `Traits/`, `Views/`, and `Styles/`. Browser assets, init files, translations, and generated bundles live under `wwwroot/`. Tests are primarily browser specs in `test/` named `*Spec.ts` or `*Spec.tsx`. Build and tooling code is in `buildprocess/` and `gulpfile.js`; deployment material is in `deploy/` and `doc/`.

## Build, Test, and Development Commands

- `yarn install`: install dependencies for Node `>=20`.
- `yarn gulp dev`: build in watch mode and start `terriajs-server` on port `3001`.
- `yarn start`: run the app server with `serverconfig.json`.
- `yarn test`: build specs and run the Jasmine browser suite.
- `yarn gulp lint`: run ESLint on `index.js` and `lib/`.
- `yarn gulp release`: create a production bundle in `wwwroot/build/`.
- `yarn prettier` or `yarn prettier-check`: format or verify repository formatting.

## Coding Style & Naming Conventions

Use 2-space indentation, UTF-8, and final newlines per `.editorconfig`. Prettier is the formatting source of truth (`trailingComma: none`), and ESLint extends the TerriaJS base config from `.eslintrc.js`. Follow existing naming patterns: React/view classes in PascalCase, utilities and locals in camelCase, and spec files ending in `Spec.ts` or `Spec.tsx`. Keep feature-specific code close to its model or trait instead of creating broad shared folders prematurely.

## Testing Guidelines

Add or update specs in `test/` for behavior changes. Prefer focused Jasmine cases around models, traits, and search providers, following the pattern in `test/Models/SearchProviders/VWorldSearchProviderSpec.ts`. Run `yarn test` before opening a PR; run `yarn gulp lint release` for changes that affect build output or CI-sensitive paths.

## Commit & Pull Request Guidelines

Recent history uses short imperative subjects such as `Add parcel boundary highlighting functionality...` or `Refactor parcel boundary highlighting logic...`. Keep commits focused and descriptive. PRs should explain the user-visible change, mention any config or migration impact, link related issues, and include screenshots for UI or map rendering changes. Confirm local config secrets stay out of git: use `wwwroot/config.json.example` and `wwwroot/init/simple.json.example` as templates, not committed credentials.
