import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next 16 ships flat-config arrays, so these spread directly.
// Replaces the legacy .eslintrc.json; `next lint` was removed in Next.js 16
// and `next build` no longer lints, so `pnpm lint` runs the ESLint CLI.
const config = [
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // eslint-plugin-react-hooks 7 (pulled in by eslint-config-next 16) adds
      // React Compiler-era rules that flag this app's existing architecture:
      // set-state-in-effect hits the localStorage auth bootstrap in
      // AuthContext and the per-page route guards, and static-components hits
      // the nested renderers in UserManagement. Both are real debt worth
      // fixing, but rewriting the auth flow is a behaviour change, not part of
      // a dependency upgrade. Kept visible as warnings rather than silenced.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
    },
  },
];

export default config;
