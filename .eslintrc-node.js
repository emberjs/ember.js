module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 8,
    sourceType: 'module',
  },
  extends: 'eslint:recommended',
  plugins: [
    "ember-internal"
  ],
  env: {
    mocha: true,
    node: true,
    qunit: true
  },
  globals: {
    Map: false,
    Set: false
  }
};
