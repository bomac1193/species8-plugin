import js from "@eslint/js"
import globals from "globals"

export default [
  {
    ignores: ["node_modules/**", "uploads/**", "previews/**"],
  },
  js.configs.recommended,
  {
    languageOptions: {
      sourceType: "module",
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
]
