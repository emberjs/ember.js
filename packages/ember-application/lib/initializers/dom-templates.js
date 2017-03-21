import require, { has } from 'require';
import { environment } from 'ember-environment';
import Application from '../system/application';

let bootstrap = function() { };

Application.initializer({
  name: 'domTemplates',
  initialize(application) {
    let bootstrapModuleId = 'ember-template-compiler/system/bootstrap';
    let context;
    if (environment.hasDOM && has(bootstrapModuleId)) {
      bootstrap = require(bootstrapModuleId).default;
      context = document;
    }

    bootstrap({ context, application });
  }
});
