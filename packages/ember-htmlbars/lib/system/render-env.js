import defaultEnv from 'ember-htmlbars/env';
import { MorphSet } from 'ember-metal-views/renderer';
import { getOwner } from 'container/owner';

export default function RenderEnv(options) {
  this.lifecycleHooks = options.lifecycleHooks || [];
  this.renderedViews = options.renderedViews || [];
  this.renderedNodes = options.renderedNodes || new MorphSet();
  this.hasParentOutlet = options.hasParentOutlet || false;

  this.view = options.view;
  this.outletState = options.outletState;
  this.owner = options.owner;
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
    owner: getOwner(view),
    renderer: view.renderer,
    dom: view.renderer._dom
  });
};

RenderEnv.prototype.childWithView = function(view) {
  return new RenderEnv({
    view: view,
    outletState: this.outletState,
    owner: this.owner,
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
    owner: this.owner,
    renderer: this.renderer,
    dom: this.dom,
    lifecycleHooks: this.lifecycleHooks,
    renderedViews: this.renderedViews,
    renderedNodes: this.renderedNodes,
    hasParentOutlet: hasParentOutlet
  });
};
