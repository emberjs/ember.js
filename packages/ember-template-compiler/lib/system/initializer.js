import require, { has } from 'require';
import bootstrap from './bootstrap';

// Globals mode template compiler
if (has('@ember/application') && has('ember-environment') && has('ember-glimmer')) {
  let emberEnv = require('ember-environment');
  let emberGlimmer = require('ember-glimmer');
  let emberApp = require('@ember/application');
  let Application = emberApp.default;
  let { hasTemplate, setTemplate } = emberGlimmer;
  let { environment } = emberEnv;

  Application.initializer({
    name: 'domTemplates',
    initialize() {
      let context;
      if (environment.hasDOM) {
        context = document;
      }

      bootstrap({ context, hasTemplate, setTemplate });
    },
  });
}
