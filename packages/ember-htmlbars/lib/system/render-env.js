import defaultEnv from 'ember-htmlbars/env';

export default function RenderEnv(options) {
  this.lifecycleHooks = options.lifecycleHooks || [];
  this.renderedViews = options.renderedViews || [];
  this.renderedNodes = options.renderedNodes || {};
  this.hasParentOutlet = options.hasParentOutlet || false;

  this.view = options.view;
  this.outletState = options.outletState;
  this.container = options.container;
  this.renderer = options.renderer;
  this.dom = options.dom;

  this.hooks = defaultEnv.hooks;
  this.helpers = defaultEnv.helpers;
  this.useFragmentCache = defaultEnv.useFragmentCache;
  this.destinedForDOM = this.renderer._destinedForDOM;
}

RenderEnv.build = function(view) {
  return new RenderEnv({
    view: view,
    outletState: view.outletState,
    container: view.container,
    renderer: view.renderer,
    dom: view.renderer._dom
  });
};

RenderEnv.prototype.childWithView = function(view) {
  return new RenderEnv({
    view: view,
    outletState: this.outletState,
    container: this.container,
    renderer: this.renderer,
    dom: this.dom,
    lifecycleHooks: this.lifecycleHooks,
    renderedViews: this.renderedViews,
    renderedNodes: this.renderedNodes,
    hasParentOutlet: this.hasParentOutlet
  });
};

RenderEnv.prototype.childWithOutletState = function(outletState, hasParentOutlet=this.hasParentOutlet) {
  return new RenderEnv({
    view: this.view,
    outletState: outletState,
    container: this.container,
    renderer: this.renderer,
    dom: this.dom,
    lifecycleHooks: this.lifecycleHooks,
    renderedViews: this.renderedViews,
    renderedNodes: this.renderedNodes,
    hasParentOutlet: hasParentOutlet
  });
};
