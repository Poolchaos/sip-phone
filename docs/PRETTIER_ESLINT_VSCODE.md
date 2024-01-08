## Beep

```json
// Place your settings in this file to overwrite default and user settings.
{
  "typescript.tsdk": "node_modules/typescript/lib",

  // DISABLE IDE Prettier / ESLINT
  // "javascript.validate.enable": false,
  // "typescript.validate.enable": false,
  // "eslint.validate": [
  //   "javascript",
  //   "javascriptreact",
  //   {
  //     "language": "typescript",
  //     "autoFix": false
  //   },
  //   {
  //     "language": "typescriptreact",
  //     "autoFix": false
  //   }
  // ],
  // "eslint.autoFixOnSave": false,
  // "eslint.enable": true,
  // "editor.formatOnSave": false,
  // "prettier.eslintIntegration": true

  // ENABLE IDE Prettier / ESLINT
  "javascript.validate.enable": false,
  "typescript.validate.enable": false,
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    {
      "language": "typescript",
      "autoFix": true
    },
    {
      "language": "typescriptreact",
      "autoFix": true
    }
  ],
  "eslint.autoFixOnSave": true,
  "eslint.enable": true,
  "editor.formatOnSave": true,
  "prettier.eslintIntegration": true,
  "prettier.disableLanguages": ["html"],
  ""
}
```

asdf
