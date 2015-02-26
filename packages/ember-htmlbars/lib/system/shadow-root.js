import merge from "ember-metal/merge";
import { hooks as htmlbarsHooks } from "htmlbars-runtime";

/** @private
  A ShadowRoot represents a new root scope. However, it
  is not a render tree root.
*/

import { componentSymbol, selfSymbol } from "ember-htmlbars/system/symbols";

function ShadowRoot(layoutMorph, component, layoutTemplate, contentScope, contentTemplate) {
  this.update(layoutMorph, component, layoutTemplate, contentScope, contentTemplate);
}

ShadowRoot.prototype.update = function(layoutMorph, component, layoutTemplate, contentScope, contentTemplate) {
  this.layoutMorph = layoutMorph;
  this.layoutTemplate = layoutTemplate;
  this.hostComponent = component;

  this.contentScope = contentScope;
  this.contentTemplate = contentTemplate;
};

ShadowRoot.prototype.render = function(env, self, visitor) {
  if (!this.layoutTemplate && !this.contentTemplate) { return; }

  var passedSelf = {};
  passedSelf[selfSymbol] = self;
  passedSelf[componentSymbol] = this.hostComponent || true;

  var hash = { self: passedSelf, layout: this.layoutTemplate };

  var newEnv = env;
  if (this.hostComponent) {
    newEnv = merge({}, env);
    newEnv.view = this.hostComponent;
  }

  // Invoke the `@view` helper. Tell it to render the layout template into the
  // layout morph. When the layout template `{{yield}}`s, it should render the
  // contentTemplate with the contentScope.
  htmlbarsHooks.block(this.layoutMorph, newEnv, this.contentScope, '@view',
                      [], hash, this.contentTemplate || null, null, visitor);
};

ShadowRoot.prototype.rerender = function(env) {
  if (!this.layoutTemplate && !this.contentTemplate) { return; }

  var newEnv = env;
  if (this.hostComponent) {
    newEnv = merge({}, env);
    newEnv.view = this.hostComponent;
  }

  return newEnv;
};

ShadowRoot.prototype.isStable = function(layout, template) {
  return this.layoutTemplate === layout &&
         this.contentTemplate === template;
};

export default ShadowRoot;
