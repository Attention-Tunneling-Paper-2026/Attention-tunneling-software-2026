# React + TypeScript + Vite

## Getting started

```bash
npm ci      # install exactly what package-lock.json pins
npm run dev # http://localhost:5173
```

Use `npm ci`, not `npm install`. `npm ci` deletes `node_modules` first and
installs strictly from the lockfile, so the tree can never end up half-built or
holding native binaries for the wrong platform. `npm install` mutates whatever
is already there and leaves empty directories behind for optional dependencies
it skips, which surfaces later as
`Cannot find module './rolldown-binding.<platform>.node'`.

If you ever hit that error, `rm -rf node_modules && npm ci` fixes it.

Other scripts: `npm run build` (typecheck + production bundle),
`npm run preview` (serve the built bundle), `npm run lint`.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
