import require, { has } from 'require';
import { environment } from 'ember-environment';
import Application from '../system/application';

let bootstrap = function() { };

Application.initializer({
  name: 'domTemplates',
  initialize() {
    let bootstrapModuleId = 'ember-template-compiler/system/bootstrap';
    if (environment.hasDOM && has(bootstrapModuleId)) {
      bootstrap = require(bootstrapModuleId).default;
    }

    bootstrap();
  }
});
