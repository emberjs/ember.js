import { guidFor, symbol } from 'ember-utils';
import { assert, deprecate, descriptor, Mixin } from 'ember-metal';
import { POST_INIT } from 'ember-runtime';
import { environment } from 'ember-environment';
import { matches } from '../system/utils';

const INIT_WAS_CALLED = symbol('INIT_WAS_CALLED');

import jQuery from '../system/jquery';

function K() { return this; }

/**
 @class ViewMixin
 @namespace Ember
 @private
*/
export default Mixin.create({
  concatenatedProperties: ['attributeBindings'],

  // ..........................................................
  // TEMPLATE SUPPORT
  //

  /**
    Return the nearest ancestor that is an instance of the provided
    class or mixin.

    @method nearestOfType
    @param {Class,Mixin} klass Subclass of Ember.View (or Ember.View itself),
           or an instance of Ember.Mixin.
    @return Ember.View
    @deprecated use `yield` and contextual components for composition instead.
    @private
  */
  nearestOfType(klass) {
    let view = this.parentView;
    let isOfType = klass instanceof Mixin ?
                   view => klass.detect(view) :
                   view => klass.detect(view.constructor);

    while (view) {
      if (isOfType(view)) { return view; }
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
      if (property in view) { return view; }
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
  element: descriptor({
    configurable: false,
    enumerable: false,
    get() {
      return this.renderer.getElement(this);
    }
  }),

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
  */
  $(sel) {
    assert('You cannot access this.$() on a component with `tagName: \'\'` specified.', this.tagName !== '');
    return this._currentState.$(this, sel);
  },

  /**
    Appends the view's element to the specified parent element.

    Note that this method just schedules the view to be appended; the DOM
    element will not be appended to the given element until all bindings have
    finished synchronizing.

    This is not typically a function that you will need to call directly when
    building your application. If you do need to use `appendTo`, be sure that
    the target element you are providing is associated with an `Ember.Application`
    and does not have an ancestor element that is associated with an Ember view.

    @method appendTo
    @param {String|DOMElement|jQuery} A selector, element, HTML string, or jQuery object
    @return {Ember.View} receiver
    @private
  */
  appendTo(selector) {
    let env = this._environment || environment;
    let target;

    if (env.hasDOM) {
      target = typeof selector === 'string' ? document.querySelector(selector) : selector;

      assert('You tried to append to (' + selector + ') but that isn\'t in the DOM', target);
      assert('You cannot append to an existing Ember.View.', !matches(target, '.ember-view'));
      assert('You cannot append to an existing Ember.View.', (function() {
        let node = target.parentNode;
        while (node) {
          if (node.nodeType !== 9 && matches(node, '.ember-view')) {
            return false;
          }

          node = node.parentNode;
        }

        return true;
      })());
    } else {
      target = selector;

      assert('You tried to append to a selector string (' + selector + ') in an environment without jQuery', typeof target !== 'string');
      assert('You tried to append to a non-Element (' + selector + ') in an environment without jQuery', typeof selector.appendChild === 'function');
    }

    this.renderer.appendTo(this, target);

    return this;
  },

  /**
    Creates a new DOM element, renders the view into it, then returns the
    element.

    By default, the element created and rendered into will be a `BODY` element,
    since this is the default context that views are rendered into when being
    inserted directly into the DOM.

    ```js
    let element = view.renderToElement();
    element.tagName; // => "BODY"
    ```

    You can override the kind of element rendered into and returned by
    specifying an optional tag name as the first argument.

    ```js
    let element = view.renderToElement('table');
    element.tagName; // => "TABLE"
    ```

    This method is useful if you want to render the view into an element that
    is not in the document's body. Instead, a new `body` element, detached from
    the DOM is returned. FastBoot uses this to serialize the rendered view into
    a string for transmission over the network.

    ```js
    app.visit('/').then(function(instance) {
      let element;
      Ember.run(function() {
        element = renderToElement(instance);
      });

      res.send(serialize(element));
    });
    ```

    @method renderToElement
    @param {String} tagName The tag of the element to create and render into. Defaults to "body".
    @return {HTMLBodyElement} element
    @private
  */
  renderToElement(tagName) {
    tagName = tagName || 'body';

    let element = this.renderer.createElement(tagName);

    this.renderer.appendTo(this, element);
    return element;
  },

  /**
    Replaces the content of the specified parent element with this view's
    element. If the view does not have an HTML representation yet,
    the element will be generated automatically.

    Note that this method just schedules the view to be appended; the DOM
    element will not be appended to the given element until all bindings have
    finished synchronizing

    @method replaceIn
    @param {String|DOMElement|jQuery} target A selector, element, HTML string, or jQuery object
    @return {Ember.View} received
    @private
  */
  replaceIn(selector) {
    let target = jQuery(selector);

    assert('You tried to replace in (' + selector + ') but that isn\'t in the DOM', target.length > 0);
    assert('You cannot replace an existing Ember.View.', !target.is('.ember-view') && !target.parents().is('.ember-view'));

    this.renderer.replaceIn(this, target[0]);

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

    ```javascript
      export default Ember.Component.extend({
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
    Attempts to discover the element in the parent element. The default
    implementation looks for an element with an ID of `elementId` (or the
    view's guid if `elementId` is null). You can override this method to
    provide your own form of lookup. For example, if you want to discover your
    element using a CSS class name instead of an ID.

    @method findElementInParentElement
    @param {DOMElement} parentElement The parent's DOM element
    @return {DOMElement} The discovered element
    @private
  */
  findElementInParentElement(parentElem) {
    let id = '#' + this.elementId;
    return jQuery(id)[0] || jQuery(id, parentElem)[0];
  },

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

    if (!this.elementId && this.tagName !== '') {
      this.elementId = guidFor(this);
    }

    this[INIT_WAS_CALLED] = true;

    if (typeof(this.didInitAttrs) === 'function') {
      deprecate(
        `[DEPRECATED] didInitAttrs called in ${this.toString()}.`,
        false,
        {
          id: 'ember-views.did-init-attrs',
          until: '3.0.0',
          url: 'http://emberjs.com/deprecations/v2.x#toc_ember-component-didinitattrs'
        }
      );
    }

    assert(
      'Using a custom `.render` function is no longer supported.',
      !this.render
    );
  },

  /*
   This is a special hook implemented in CoreObject, that allows Views/Components
   to have a way to ensure that `init` fires before `didInitAttrs` / `didReceiveAttrs`
   (so that `this._super` in init does not trigger `didReceiveAttrs` before the classes
   own `init` is finished).

   @method __postInitInitialization
   @private
   */
  [POST_INIT]: function() {
    this._super();

    assert(
      `You must call \`this._super(...arguments);\` when implementing \`init\` in a component. Please update ${this} to call \`this._super\` from \`init\`.`,
      this[INIT_WAS_CALLED]
    );
  },

  __defineNonEnumerable(property) {
    this[property.name] = property.descriptor.value;
  },

  // .......................................................
  // EVENT HANDLING
  //

  /**
    Handle events from `Ember.EventDispatcher`

    @method handleEvent
    @param eventName {String}
    @param evt {Event}
    @private
  */
  handleEvent(eventName, evt) {
    return this._currentState.handleEvent(this, eventName, evt);
  }
});
