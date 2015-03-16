import { Mixin } from "ember-metal/mixin";
import { get } from "ember-metal/property_get";

// Circular dep
var _renderView;
function renderView(view, buffer, template) {
  if (_renderView === undefined) {
    _renderView = require('ember-htmlbars/system/render-view')['default'];
  }
  _renderView(view, buffer, template);
}

var TemplateRenderingSupport = Mixin.create({
  /**
    Called on your view when it should push strings of HTML into a
    `Ember.RenderBuffer`. Most users will want to override the `template`
    or `templateName` properties instead of this method.

    By default, `Ember.View` will look for a function in the `template`
    property and invoke it with the value of `context`. The value of
    `context` will be the view's controller unless you override it.

    @method render
    @param {Ember.RenderBuffer} buffer The render buffer
  */
  render(buffer) {
    // If this view has a layout, it is the responsibility of the
    // the layout to render the view's template. Otherwise, render the template
    // directly.
    var template = get(this, 'layout') || get(this, 'template');
    renderView(this, buffer, template);
  }
});

export default TemplateRenderingSupport;
