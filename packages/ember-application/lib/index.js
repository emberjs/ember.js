/**
@module ember
@submodule ember-application
*/

export { default as Application } from './system/application';
export { default as ApplicationInstance } from './system/application-instance';
export { default as Resolver } from './system/resolver';
export { default as Engine } from './system/engine';
export { default as EngineInstance } from './system/engine-instance';
export { getEngineParent, setEngineParent } from './system/engine-parent';

// add domTemplates initializer (only does something if `ember-template-compiler`
// is loaded already)
import './initializers/dom-templates';
