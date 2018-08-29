import require, { has } from 'require';
import bootstrap from './bootstrap';

// Globals mode template compiler
if (
  has('@ember/application') &&
  has('@ember/-internals/browser-environment') &&
  has('@ember/-internals/glimmer')
) {
  // tslint:disable:no-require-imports
  let emberEnv = require('@ember/-internals/browser-environment');
  let emberGlimmer = require('@ember/-internals/glimmer');
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
