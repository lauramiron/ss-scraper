// eslint.config.mjs
import js from "@eslint/js";
import globals from "globals";
import importPlugin from "eslint-plugin-import";

export default [
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {
      js,
      import: importPlugin,
    },
    extends: [
      js.configs.recommended,
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      "import/no-unresolved": "error",
      // (optional) add any other rules you want here
      // "no-unused-vars": "warn",
      // "no-console": "off",
    },
    settings: {
      import: {
        resolver: {
          node: {
            extensions: [".js", ".mjs", ".cjs", ".jsx"],
          },
        },
      },
    },
  },
];
