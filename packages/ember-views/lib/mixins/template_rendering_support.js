/**
@module ember
@submodule ember-views
*/
import { Mixin } from 'ember-metal/mixin';

// Circular dep
var _renderView;

/**
  @class TemplateRenderingSupport
  @namespace Ember
  @private
*/
var TemplateRenderingSupport = Mixin.create({
  /**
    Called on your view when it should push strings of HTML into a
    `Ember.RenderBuffer`. Most users will want to override the `template`
    or `templateName` properties instead of this method.

    By default, `Ember.View` will look for a function in the `template`
    property and invoke it with the value of `context`. The value of
    `context` will be the view's controller unless you override it.

    @method renderBlock
    @param {Ember.RenderBuffer} buffer The render buffer
    @private
  */

  renderBlock(block, renderNode) {
    if (_renderView === undefined) {
      _renderView = require('ember-htmlbars/system/render-view');
    }

    return _renderView.renderHTMLBarsBlock(this, block, renderNode);
  }
});

export default TemplateRenderingSupport;
