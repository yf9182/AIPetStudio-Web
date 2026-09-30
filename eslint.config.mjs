// eslint-config-next ships native flat configs in Next 16, so no FlatCompat
// bridge is needed (and the legacy bridge fails on the circular plugin graph).
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "node_modules/**",
      "next-env.d.ts",
      "cloudflare-env.d.ts"
    ]
  },
  ...nextCoreWebVitals,
  ...nextTypescript
];

export default eslintConfig;
