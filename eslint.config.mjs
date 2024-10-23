import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import perfectionist from "eslint-plugin-perfectionist";
import unusedImports from "eslint-plugin-unused-imports";
import tsLint from "@typescript-eslint/eslint-plugin";
import prettierLint from "eslint-plugin-prettier";

export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          "vars": "all",
          "varsIgnorePattern": "^_",
          "args": "after-used",
          "argsIgnorePattern": "^_"
        }
      ]
    },
    plugins: {
      "perfectionist": perfectionist, "unused-imports": unusedImports, "@typescript-eslint": tsLint, "prettier": prettierLint
    },
    settings: {
      "import/resolver": {
        "typescript": {
          "alwaysTryTypes": true
        }
      }
    },
  }
];