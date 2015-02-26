import { internal } from "htmlbars-runtime";

/** @private
  A ShadowRoot represents a new root scope. However, it
  is not a render tree root.
*/

function ShadowRoot(layoutMorph, layoutTemplate, contentScope, contentTemplate) {
  this.layoutMorph = layoutMorph;
  this.layoutTemplate = layoutTemplate;

  this.contentScope = contentScope;
  this.contentTemplate = contentTemplate;
}

ShadowRoot.prototype.render = function(env, self, shadowOptions, visitor) {
  if (!this.layoutTemplate && !this.contentTemplate) { return; }

  shadowOptions.attrs = self.attrs;

  var shadowRoot = this;

  internal.hostBlock(this.layoutMorph, env, this.contentScope, this.contentTemplate || null, null, shadowOptions, visitor, function(options) {
    var template = options.templates.template;
    if (shadowRoot.layoutTemplate) {
      template.yieldIn(shadowRoot.layoutTemplate, self);
    } else if (template.yield) {
      template.yield();
    }
  });
};

ShadowRoot.prototype.isStable = function(layout, template) {
  return this.layoutTemplate === layout &&
         this.contentTemplate === template;
};

export default ShadowRoot;
