import EmberError from 'ember-metal/error';
import { computed } from 'ember-metal/computed';
import { getOwner } from 'container';
import { Mixin } from 'ember-metal/mixin';
import { get } from 'ember-metal/property_get';
import { assert } from 'ember-metal/debug';

export default Mixin.create({
  /**
    @property isView
    @type Boolean
    @default true
    @static
    @private
  */
  isView: true,

  // ..........................................................
  // TEMPLATE SUPPORT
  //

  /**
    The name of the template to lookup if no template is provided.

    By default `Ember.View` will lookup a template with this name in
    `Ember.TEMPLATES` (a shared global object).

    @property templateName
    @type String
    @default null
    @private
  */
  templateName: null,

  /**
    The name of the layout to lookup if no layout is provided.

    By default `Ember.View` will lookup a template with this name in
    `Ember.TEMPLATES` (a shared global object).

    @property layoutName
    @type String
    @default null
    @private
  */

  /**
    The template used to render the view. This should be a function that
    accepts an optional context parameter and returns a string of HTML that
    will be inserted into the DOM relative to its parent view.

    In general, you should set the `templateName` property instead of setting
    the template yourself.

    @property template
    @type Function
    @private
  */
  template: computed({
    get() {
      let templateName = get(this, 'templateName');
      let template = this.templateForName(templateName, 'template');
      assert('You specified the templateName ' + templateName + ' for ' + this + ', but it did not exist.', !templateName || !!template);
      return template || get(this, 'defaultTemplate');
    },
    set(key, value) {
      if (value !== undefined) { return value; }
      return get(this, key);
    }
  }),

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
    @private
  */
  layout: computed({
    get(key) {
      let layoutName = get(this, 'layoutName');
      let layout = this.templateForName(layoutName, 'layout');

      assert('You specified the layoutName ' + layoutName + ' for ' + this + ', but it did not exist.', !layoutName || !!layout);

      return layout || get(this, 'defaultLayout');
    },

    set(key, value) {
      return value;
    }
  }),

  templateForName(name, type) {
    if (!name) { return; }
    assert('templateNames are not allowed to contain periods: ' + name, name.indexOf('.') === -1);

    let owner = getOwner(this);

    if (!owner) {
      throw new EmberError('Container was not found when looking up a views template. ' +
                 'This is most likely due to manually instantiating an Ember.View. ' +
                 'See: http://git.io/EKPpnA');
    }

    return owner.lookup('template:' + name);
  }
});
