module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    // 'prettier',
    // 'jest'
  ],
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts'],
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
        paths: ['src'],
      },
    },
  },
  extends: [
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    // 'plugin:import/errors', // IGNORE LATER?
    // 'plugin:import/warnings', // IGNORE LATER?
    'plugin:jest/recommended',
    'prettier/@typescript-eslint', // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
    'plugin:prettier/recommended', // must always be last
  ],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: './',
    ecmaVersion: 2019,
    sourceType: 'module', // Allows for the use of imports
  },
  env: {
    // 'jest/globals': true,
    es6: true,
  },
  // overrides: [
  //   {
  //     files: ['*.js'],

  //   },
  // ],
  rules: {
    // START MIGRATION
    // we're interested in, but ignore short term
    // 'import/no-self-import': 'error',
    'import/no-cycle': 'off', // super expensive
    // ignore for migration phase
    '@typescript-eslint/indent': 'off',
    '@typescript-eslint/no-var-requires': 'off', // TODO: Keep this, required for importing jpgs, mp3s, etc (ts vs webpack!)
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/adjacent-overload-signatures': 'off',

    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-parameter-properties': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/array-type': 'off',
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/member-delimiter-style': 'off',
    '@typescript-eslint/no-angle-bracket-type-assertion': 'off',
    '@typescript-eslint/type-annotation-spacing': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-object-literal-type-assertion': 'off',

    'prettier/prettier': [
      'warn',
      {
        parser: 'typescript',
      },
    ],
  },
};
