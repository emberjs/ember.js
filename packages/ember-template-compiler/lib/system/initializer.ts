import bootstrap from './bootstrap';
import { hasDOM } from '@ember/-internals/browser-environment';
import { hasTemplate, setTemplate } from '@ember/-internals/glimmer';
import Application from '@ember/application';

Application.initializer({
  name: 'domTemplates',
  initialize() {
    if (hasDOM) {
      bootstrap({ context: document, hasTemplate, setTemplate });
    }
  },
});
