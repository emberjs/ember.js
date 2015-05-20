/**
@module ember
@submodule ember-views
*/

import jQuery from "ember-views/system/jquery";

import { Mixin } from "ember-metal/mixin";
import { guidFor } from "ember-metal/utils";

var DOMSupport = Mixin.create({
  init() {
    this._super(...arguments);

    if (!this.elementId) {
      this.elementId = guidFor(this);
    }
  },

  /**
    Appends the view's element to the specified parent element.

    If the view does not have an HTML representation yet, `createElement()`
    will be called automatically.

    Note that this method just schedules the view to be appended; the DOM
    element will not be appended to the given element until all bindings have
    finished synchronizing.

    This is not typically a function that you will need to call directly when
    building your application. You might consider using `Ember.ContainerView`
    instead. If you do need to use `appendTo`, be sure that the target element
    you are providing is associated with an `Ember.Application` and does not
    have an ancestor element that is associated with an Ember view.

    @method appendTo
    @param {String|DOMElement|jQuery} A selector, element, HTML string, or jQuery object
    @return {Ember.View} receiver
  */
  appendTo(selector) {
    var target = jQuery(selector);

    Ember.assert("You tried to append to (" + selector + ") but that isn't in the DOM", target.length > 0);
    Ember.assert("You cannot append to an existing Ember.View. Consider using Ember.ContainerView instead.", !target.is('.ember-view') && !target.parents().is('.ember-view'));

    this.renderer.appendTo(this, target[0]);

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
  */
  append() {
    return this.appendTo(document.body);
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
  */
  replaceIn(selector) {
    var target = jQuery(selector);

    Ember.assert("You tried to replace in (" + selector + ") but that isn't in the DOM", target.length > 0);
    Ember.assert("You cannot replace an existing Ember.View. Consider using Ember.ContainerView instead.", !target.is('.ember-view') && !target.parents().is('.ember-view'));

    this.renderer.replaceIn(this, target[0]);

    return this;
  },

  /**
    Removes the view's element from the element to which it is attached.

    @method remove
    @return {Ember.View} receiver
  */
  remove() {
    // What we should really do here is wait until the end of the run loop
    // to determine if the element has been re-appended to a different
    // element.
    // In the interim, we will just re-render if that happens. It is more
    // important than elements get garbage collected.
    if (!this.removedFromDOM) { this.destroyElement(); }

    // Set flag to avoid future renders
    this._willInsert = false;
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
        setElementId: function() {
          var index = this.get('index');
          this.set('elementId', 'component-id' + index);
        }.on('init')
      });
    ```

    @property elementId
    @type String
  */
  elementId: null,

  /**
    Returns the current DOM element for the view.

    @property element
    @type DOMElement
  */
  element: null,

  /**
    Creates a DOM representation of the view and all of its child views by
    recursively calling the `render()` method. Once the element is created,
    it sets the `element` property of the view to the rendered element.

    After the element has been inserted into the DOM, `didInsertElement` will
    be called on this view and all of its child views.

    @method createElement
    @return {Ember.View} receiver
  */
  createElement() {
    if (this.element) { return this; }

    this.renderer.createElement(this);

    return this;
  },

  /**
    Destroys any existing element along with the element for any child views
    as well. If the view does not currently have a element, then this method
    will do nothing.

    If you implement `willDestroyElement()` on your view, then this method will
    be invoked on your view before your element is destroyed to give you a
    chance to clean up any event handlers, etc.

    If you write a `willDestroyElement()` handler, you can assume that your
    `didInsertElement()` handler was called earlier for the same element.

    You should not call or override this method yourself, but you may
    want to implement the above callbacks.

    @method destroyElement
    @return {Ember.View} receiver
  */
  destroyElement() {
    return this.currentState.destroyElement(this);
  },

  /**
    Returns a jQuery object for this view's element. If you pass in a selector
    string, this method will return a jQuery object, using the current element
    as its buffer.

    For example, calling `view.$('li')` will return a jQuery object containing
    all of the `li` elements inside the DOM element of this view.

    @method $
    @param {String} [selector] a jQuery-compatible selector string
    @return {jQuery} the jQuery object for the DOM node
  */
  $(sel) {
    Ember.assert('You cannot access this.$() on a component with `tagName: \'\'` specified.', this.tagName !== '');
    return this.currentState.$(this, sel);
  },

  /**
    Normally, Ember's component model is "write-only". The component takes a
    bunch of attributes that it got passed in, and uses them to render its
    template.

    One nice thing about this model is that if you try to set a value to the
    same thing as last time, Ember (through HTMLBars) will avoid doing any
    work on the DOM.

    This is not just a performance optimization. If an attribute has not
    changed, it is important not to clobber the element's "hidden state".
    For example, if you set an input's `value` to the same value as before,
    it will clobber selection state and cursor position. In other words,
    setting an attribute is not **always** idempotent.

    This method provides a way to read an element's attribute and also
    update the last value Ember knows about at the same time. This makes
    setting an attribute idempotent.

    In particular, what this means is that if you get an `<input>` element's
    `value` attribute and then re-render the template with the same value,
    it will avoid clobbering the cursor and selection position.

    Since most attribute sets are idempotent in the browser, you typically
    can get away with reading attributes using jQuery, but the most reliable
    way to do so is through this method.

    @method readDOMAttr
    @param {String} name the name of the attribute
    @return String
  */
  readDOMAttr(name) {
    let attr = this._renderNode.childNodes.filter(node => node.attrName === name)[0];
    if (!attr) { return null; }
    return attr.getContent();
  },

  /**
    Handle events from `Ember.EventDispatcher`

    @method handleEvent
    @param eventName {String}
    @param evt {Event}
    @private
  */
  handleEvent(eventName, evt) {
    return this.currentState.handleEvent(this, eventName, evt);
  },

  /**
    Registers the view in the view registry, keyed on the view's `elementId`.
    This is used by the EventDispatcher to locate the view in response to
    events.

    This method should only be called once the view has been inserted into the
    DOM.

    @method _register
    @private
  */
  _register() {
    Ember.assert("Attempted to register a view with an id already in use: "+this.elementId, !this._viewRegistry[this.elementId]);
    this._viewRegistry[this.elementId] = this;
  },

  /**
    Removes the view from the view registry. This should be called when the
    view is removed from DOM.

    @method _unregister
    @private
  */
  _unregister() {
    delete this._viewRegistry[this.elementId];
  }
});

export default DOMSupport;
