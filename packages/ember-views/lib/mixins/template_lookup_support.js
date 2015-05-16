/**
@module ember
@submodule ember-views
*/

import { Mixin } from "ember-metal/mixin";
import EmberError from "ember-metal/error";
import { get } from "ember-metal/property_get";
import { computed } from "ember-metal/computed";

var TemplateLookupSupport = Mixin.create({
  /**
    A view may contain a layout. A layout is a regular template but
    supersedes the `template` property during rendering. It is the
    responsibility of the layout template to retrieve the `template`
    property from the view (or alternatively, call `Handlebars.helpers.yield`,
    `{{yield}}`) to render it in the correct location.

    This is useful for a view that has a shared wrapper, but which delegates
    the rendering of the contents of the wrapper to the `template` property
    on a subclass.

    @property layout
    @type Function
    */
  layout: computed('layoutName', {
    get(key) {
      var layoutName = get(this, 'layoutName');
      var layout = this.templateForName(layoutName, 'layout');

      Ember.assert("You specified the layoutName " + layoutName + " for " + this + ", but it did not exist.", !layoutName || !!layout);

      return layout || get(this, 'defaultLayout');
    },

    set(key, value) {
      return value;
    }
  }),

  /**
    The name of the layout to lookup if no layout is provided.

    By default `Ember.View` will lookup a template with this name in
    `Ember.TEMPLATES` (a shared global object).

    @property layoutName
    @type String
    @default null
  */
  layoutName: null,

  /**
    The template used to render the view. This should be a function that
    accepts an optional context parameter and returns a string of HTML that
    will be inserted into the DOM relative to its parent view.

    In general, you should set the `templateName` property instead of setting
    the template yourself.

    @property template
    @type Function
  */

  template: computed('templateName', {
    get() {
      var templateName = get(this, 'templateName');
      var template = this.templateForName(templateName, 'template');
      Ember.assert("You specified the templateName " + templateName + " for " + this + ", but it did not exist.", !templateName || !!template);
      return template || get(this, 'defaultTemplate');
    },
    set(key, value) {
      if (value !== undefined) { return value; }
      return get(this, key);
    }
  }),

  templateForName(name, type) {
    if (!name) { return; }
    Ember.assert("templateNames are not allowed to contain periods: "+name, name.indexOf('.') === -1);

    if (!this.container) {
      throw new EmberError('Container was not found when looking up a views template. ' +
                 'This is most likely due to manually instantiating an Ember.View. ' +
                 'See: http://git.io/EKPpnA');
    }

    return this.container.lookup('template:' + name);
  }

});

export default TemplateLookupSupport;
