import require, { has } from 'require';
import bootstrap from './bootstrap';

// Globals mode template compiler
if (has('@ember/application') && has('ember-browser-environment') && has('ember-glimmer')) {
  let emberEnv = require('ember-browser-environment');
  let emberGlimmer = require('ember-glimmer');
  let emberApp = require('@ember/application');
  let Application = emberApp.default;
  let { hasTemplate, setTemplate } = emberGlimmer;
  let { hasDOM } = emberEnv;

  Application.initializer({
    name: 'domTemplates',
    initialize() {
      let context;
      if (hasDOM) {
        context = document;
      }

      bootstrap({ context, hasTemplate, setTemplate });
    },
  });
}
