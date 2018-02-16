import require, { has } from 'require';

// Globals mode template compiler
if (has('ember-application') && has('ember-environment') && has('ember-glimmer')) {
  let emberEnv = require('ember-environment');
  let emberGlimmer = require('ember-glimmer');
  let emberApp = require('ember-application');
  let { Application } = emberApp;
  let { hasTemplate, setTemplate } = emberGlimmer;
  let { environment } = emberEnv;

  let bootstrap = function() { };

  Application.initializer({
    name: 'domTemplates',
    initialize() {
      let bootstrapModuleId = 'ember-template-compiler/system/bootstrap';
      let context;
      if (environment.hasDOM && has(bootstrapModuleId)) {
        bootstrap = require(bootstrapModuleId).default;
        context = document;
      }

      bootstrap({ context, hasTemplate, setTemplate });
    }
  });
}

