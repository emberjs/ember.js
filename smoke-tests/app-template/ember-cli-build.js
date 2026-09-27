'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  const app = new EmberApp(defaults, {
    /* SCENARIO_INSERTION_TARGET */
  });


  return app.toTree();
};
