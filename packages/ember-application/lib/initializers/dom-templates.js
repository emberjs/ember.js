import require, { has } from 'require';
import {
  hasTemplate,
  setTemplate
} from 'ember-glimmer';
import { environment } from 'ember-environment';
import Application from '../system/application';

let bootstrap = () => { };

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
