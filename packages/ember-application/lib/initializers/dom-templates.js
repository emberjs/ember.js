import require, { has } from 'require';
import { environment } from 'ember-environment';
import Application from '../system/application';

let bootstrap = function() { };

let bootstrapModuleId = 'ember-template-compiler/system/bootstrap';
if (environment.hasDOM && has(bootstrapModuleId)) {
  bootstrap = require(bootstrapModuleId);
}


Application.initializer({
  name: 'domTemplates',
  initialize: bootstrap
});
