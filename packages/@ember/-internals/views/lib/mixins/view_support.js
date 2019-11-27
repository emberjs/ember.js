import { guidFor } from '@ember/-internals/utils';
import { descriptorForProperty, Mixin, nativeDescDecorator } from '@ember/-internals/metal';
import { assert } from '@ember/debug';
import { hasDOM } from '@ember/-internals/browser-environment';
import { matches } from '../system/utils';
import { jQuery, jQueryDisabled } from '../system/jquery';
import { deprecate } from '@ember/debug';
import { JQUERY_INTEGRATION } from '@ember/deprecated-features';

function K() {
  return this;
}

let mixin = {
  /**
   A list of properties of the view to apply as attributes. If the property
   is a string value, the value of that string will be applied as the value
   for an attribute of the property's name.

   The following example creates a tag like `<div priority="high" />`.

   ```app/components/my-component.js
   import Component from '@ember/component';

   export default Component.extend({
      attributeBindings: ['priority'],
      priority: 'high'
    });
   ```

   If the value of the property is a Boolean, the attribute is treated as
   an HTML Boolean attribute. It will be present if the property is `true`
   and omitted if the property is `false`.

   The following example creates markup like `<div visible />`.

   ```app/components/my-component.js
   import Component from '@ember/component';

   export default Component.extend({
      attributeBindings: ['visible'],
      visible: true
    });
   ```

   If you would prefer to use a custom value instead of the property name,
   you can create the same markup as the last example with a binding like
   this:

   ```app/components/my-component.js
   import Component from '@ember/component';

   export default Component.extend({
      attributeBindings: ['isVisible:visible'],
      isVisible: true
    });
   ```

   This list of attributes is inherited from the component's superclasses,
   as well.

   @property attributeBindings
   @type Array
   @default []
   @public
   */
  concatenatedProperties: ['attributeBindings'],

  // ..........................................................
  // TEMPLATE SUPPORT
  //

  /**
   Return the nearest ancestor that is an instance of the provided
   class or mixin.

   @method nearestOfType
   @param {Class,Mixin} klass Subclass of Ember.View (or Ember.View itself),
   or an instance of Mixin.
   @return Ember.View
   @deprecated use `yield` and contextual components for composition instead.
   @private
   */
  nearestOfType(klass) {
    let view = this.parentView;
    let isOfType =
      klass instanceof Mixin ? view => klass.detect(view) : view => klass.detect(view.constructor);

    while (view) {
      if (isOfType(view)) {
        return view;
      }
      view = view.parentView;
    }
  },

  /**
   Return the nearest ancestor that has a given property.

   @method nearestWithProperty
   @param {String} property A property name
   @return Ember.View
   @deprecated use `yield` and contextual components for composition instead.
   @private
   */
  nearestWithProperty(property) {
    let view = this.parentView;

    while (view) {
      if (property in view) {
        return view;
      }
      view = view.parentView;
    }
  },

  /**
   Renders the view again. This will work regardless of whether the
   view is already in the DOM or not. If the view is in the DOM, the
   rendering process will be deferred to give bindings a chance
   to synchronize.

   If children were added during the rendering process using `appendChild`,
   `rerender` will remove them, because they will be added again
   if needed by the next `render`.

   In general, if the display of your view changes, you should modify
   the DOM element directly instead of manually calling `rerender`, which can
   be slow.

   @method rerender
   @public
   */
  rerender() {
    return this._currentState.rerender(this);
  },

  // ..........................................................
  // ELEMENT SUPPORT
  //

  /**
   Returns the current DOM element for the view.

    @property element
    @type DOMElement
    @public
  */
  element: nativeDescDecorator({
    configurable: false,
    enumerable: false,
    get() {
      return this.renderer.getElement(this);
    },
  }),

  /**
   Appends the view's element to the specified parent element.

   Note that this method just schedules the view to be appended; the DOM
   element will not be appended to the given element until all bindings have
   finished synchronizing.

   This is not typically a function that you will need to call directly when
   building your application. If you do need to use `appendTo`, be sure that
   the target element you are providing is associated with an `Application`
   and does not have an ancestor element that is associated with an Ember view.

   @method appendTo
   @param {String|DOMElement|jQuery} A selector, element, HTML string, or jQuery object
   @return {Ember.View} receiver
   @private
   */
  appendTo(selector) {
    let target;

    if (hasDOM) {
      target = typeof selector === 'string' ? document.querySelector(selector) : selector;

      assert(`You tried to append to (${selector}) but that isn't in the DOM`, target);
      assert('You cannot append to an existing Ember.View.', !matches(target, '.ember-view'));
      assert(
        'You cannot append to an existing Ember.View.',
        (() => {
          let node = target.parentNode;
          while (node) {
            if (node.nodeType !== 9 && matches(node, '.ember-view')) {
              return false;
            }

            node = node.parentNode;
          }

          return true;
        })()
      );
    } else {
      target = selector;

      assert(
        `You tried to append to a selector string (${selector}) in an environment without jQuery`,
        typeof target !== 'string'
      );
      assert(
        `You tried to append to a non-Element (${selector}) in an environment without jQuery`,
        typeof selector.appendChild === 'function'
      );
    }

    this.renderer.appendTo(this, target);

    return this;
  },

  /**
   Appends the view's element to the document body. If the view does
   not have an HTML representation yet
   the element will be generated automatically.

   If your application uses the `rootElement` property, you must append
   the view within that element. Rendering views outside of the `rootElement`
   is not supported.

   Note that this method just schedules the view to be appended; the DOM
   element will not be appended to the document body until all bindings have
   finished synchronizing.

   @method append
   @return {Ember.View} receiver
   @private
   */
  append() {
    return this.appendTo(document.body);
  },

  /**
   The HTML `id` of the view's element in the DOM. You can provide this
   value yourself but it must be unique (just as in HTML):

   ```handlebars
   {{my-component elementId="a-really-cool-id"}}
   ```

   If not manually set a default value will be provided by the framework.

   Once rendered an element's `elementId` is considered immutable and you
   should never change it. If you need to compute a dynamic value for the
   `elementId`, you should do this when the component or element is being
   instantiated:

   ```app/components/my-component.js
   import Component from '@ember/component';

   export default Component.extend({
      init() {
        this._super(...arguments);
        let index = this.get('index');
        this.set('elementId', 'component-id' + index);
      }
    });
   ```

   @property elementId
   @type String
   @public
   */
  elementId: null,

  /**
   Called when a view is going to insert an element into the DOM.

   @event willInsertElement
   @public
   */
  willInsertElement: K,

  /**
   Called when the element of the view has been inserted into the DOM.
   Override this function to do any set up that requires an element
   in the document body.

   When a view has children, didInsertElement will be called on the
   child view(s) first and on itself afterwards.

   @event didInsertElement
   @public
   */
  didInsertElement: K,

  /**
   Called when the view is about to rerender, but before anything has
   been torn down. This is a good opportunity to tear down any manual
   observers you have installed based on the DOM state

   @event willClearRender
   @public
   */
  willClearRender: K,

  /**
   You must call `destroy` on a view to destroy the view (and all of its
   child views). This will remove the view from any parent node, then make
   sure that the DOM element managed by the view can be released by the
   memory manager.

   @method destroy
   @private
   */
  destroy() {
    this._super(...arguments);
    this._currentState.destroy(this);
  },

  /**
   Called when the element of the view is going to be destroyed. Override
   this function to do any teardown that requires an element, like removing
   event listeners.

   Please note: any property changes made during this event will have no
   effect on object observers.

   @event willDestroyElement
   @public
   */
  willDestroyElement: K,

  /**
   Called after the element of the view is destroyed.

   @event willDestroyElement
   @public
   */
  didDestroyElement: K,

  /**
   Called when the parentView property has changed.

   @event parentViewDidChange
   @private
   */
  parentViewDidChange: K,

  // ..........................................................
  // STANDARD RENDER PROPERTIES
  //

  /**
   Tag name for the view's outer element. The tag name is only used when an
   element is first created. If you change the `tagName` for an element, you
   must destroy and recreate the view element.

   By default, the render buffer will use a `<div>` tag for views.

   If the tagName is `''`, the view will be tagless, with no outer element.
   Component properties that depend on the presence of an outer element, such
   as `classNameBindings` and `attributeBindings`, do not work with tagless
   components. Tagless components cannot implement methods to handle events,
   and have no associated jQuery object to return with `$()`.

   @property tagName
   @type String
   @default null
   @public
   */

  // We leave this null by default so we can tell the difference between
  // the default case and a user-specified tag.
  tagName: null,

  // .......................................................
  // CORE DISPLAY METHODS
  //

  /**
   Setup a view, but do not finish waking it up.

   * configure `childViews`
   * register the view with the global views hash, which is used for event
   dispatch

   @method init
   @private
   */
  init() {
    this._super(...arguments);

    // tslint:disable-next-line:max-line-length
    assert(
      `You cannot use a computed property for the component's \`elementId\` (${this}).`,
      descriptorForProperty(this, 'elementId') === undefined
    );

    // tslint:disable-next-line:max-line-length
    assert(
      `You cannot use a computed property for the component's \`tagName\` (${this}).`,
      descriptorForProperty(this, 'tagName') === undefined
    );

    if (!this.elementId && this.tagName !== '') {
      this.elementId = guidFor(this);
    }

    assert('Using a custom `.render` function is no longer supported.', !this.render);
  },

  // .......................................................
  // EVENT HANDLING
  //

  /**
   Handle events from `EventDispatcher`

   @method handleEvent
   @param eventName {String}
   @param evt {Event}
   @private
   */
  handleEvent(eventName, evt) {
    return this._currentState.handleEvent(this, eventName, evt);
  },
};

if (JQUERY_INTEGRATION) {
  /**
   Returns a jQuery object for this view's element. If you pass in a selector
   string, this method will return a jQuery object, using the current element
   as its buffer.

   For example, calling `view.$('li')` will return a jQuery object containing
   all of the `li` elements inside the DOM element of this view.

   @method $
   @param {String} [selector] a jQuery-compatible selector string
   @return {jQuery} the jQuery object for the DOM node
   @public
   @deprecated
   */
  mixin.$ = function $(sel) {
    assert(
      "You cannot access this.$() on a component with `tagName: ''` specified.",
      this.tagName !== ''
    );
    assert('You cannot access this.$() with `jQuery` disabled.', !jQueryDisabled);
    deprecate(
      'Using this.$() in a component has been deprecated, consider using this.element',
      false,
      {
        id: 'ember-views.curly-components.jquery-element',
        until: '4.0.0',
        url: 'https://emberjs.com/deprecations/v3.x#toc_jquery-apis',
      }
    );
    if (this.element) {
      return sel ? jQuery(sel, this.element) : jQuery(this.element);
    }
  };
}

/**
 @class ViewMixin
 @namespace Ember
 @private
*/
export default Mixin.create(mixin);
