import Ember from 'ember-metal/core'; // reexports
import { runLoadHooks } from 'ember-runtime/system/lazy_load';

/**
@module ember
@submodule ember-application
*/

export { default as Application } from './system/application';
export { default as ApplicationInstance } from './system/application-instance';

import DefaultResolver from './system/resolver';
import Application from './system/application';
import ApplicationInstance from './system/application-instance';
import Engine from './system/engine';
import EngineInstance from './system/engine-instance';

Ember.Application = Application;
Ember.ApplicationInstance = ApplicationInstance;
Ember.Engine = Engine;
Ember.EngineInstance = EngineInstance;
Ember.DefaultResolver = Ember.Resolver = DefaultResolver;

// add domTemplates initializer (only does something if `ember-template-compiler`
// is loaded already)
import './initializers/dom-templates';

runLoadHooks('Ember.Application', Application);
