// .eslintrc.js

module.exports = {
    parser: '@typescript-eslint/parser',
    extends: [
        'plugin:@typescript-eslint/recommended',
    ],
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
    },
    rules: {
        // Disable the rule that warns about explicit 'any' types
        '@typescript-eslint/no-explicit-any': 'off',

        // Optionally, you can set it to 'warn' instead of 'off' if you want to see warnings but not errors
        // '@typescript-eslint/no-explicit-any': 'warn',

        // You can add other custom rules here
    },
};