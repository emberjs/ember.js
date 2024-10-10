module.exports = {
  root: true,
  extends: '../.eslintrc.js',
  rules: {
    'no-useless-escape': 'off',

    'ember/avoid-leaking-state-in-ember-objects': 'off',
    'ember/no-get': 'off',

    // TODO: turn this back on when we figure out switching from window.Ember to imports
    'ember/new-module-imports': 'off',
  },
};
