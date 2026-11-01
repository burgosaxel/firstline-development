import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
export default [
  {ignores:['**/dist/**','**/node_modules/**','.tooling/**','qa-evidence/**']},
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {files:['**/*.{ts,tsx}'],languageOptions:{globals:{...globals.node,...globals.browser}},rules:{'no-undef':'off','@typescript-eslint/no-explicit-any':'off'}},
  {files:['**/*.js'],languageOptions:{globals:globals.node}}
];
