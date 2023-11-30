import bootstrap from './bootstrap';
import * as emberEnv from '@ember/-internals/browser-environment';
import * as emberGlimmer from '@ember/-internals/glimmer';
import * as emberApp from '@ember/application';

// Globals mode template compiler
if (emberApp.default) {
  let Application = emberApp.default;
  let { hasTemplate, setTemplate } = emberGlimmer;
  let { hasDOM } = emberEnv;

  Application.initializer({
    name: 'domTemplates',
    initialize() {
      if (hasDOM) {
        bootstrap({ context: document, hasTemplate, setTemplate });
      }
    },
  });
}
