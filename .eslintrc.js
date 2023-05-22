module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "standard",
    "plugin:prettier/recommended",
    "plugin:node/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    "node/no-unsupported-features/es-syntax": [
      "error",
      { ignores: ["modules"] },
    ],
    "node/no-missing-import": "off", // need this for eslint and ts to work together in hardhat config.
    "no-unused-expressions": "off", // need this for how chai does assertions
    "node/no-unpublished-import": "off", // need this for how to work with hardhat imports in preHardhatRuntime, see tests
    camelcase: "off", // need this because how typechain names generated files
  },
};
