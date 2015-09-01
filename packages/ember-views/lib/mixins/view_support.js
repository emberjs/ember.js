import { assert, deprecate } from 'ember-metal/debug';
import EmberError from 'ember-metal/error';
import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';
import { addObserver, removeObserver } from 'ember-metal/observer';
import { guidFor } from 'ember-metal/utils';
import { computed } from 'ember-metal/computed';
import { Mixin } from 'ember-metal/mixin';

import jQuery from 'ember-views/system/jquery';

function K() { return this; }

export default Mixin.create({
  concatenatedProperties: ['attributeBindings'],

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
  layoutName: null,

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
      var templateName = get(this, 'templateName');
      var template = this.templateForName(templateName, 'template');
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
      var layoutName = get(this, 'layoutName');
      var layout = this.templateForName(layoutName, 'layout');

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

    if (!this.container) {
      throw new EmberError('Container was not found when looking up a views template. ' +
                 'This is most likely due to manually instantiating an Ember.View. ' +
                 'See: http://git.io/EKPpnA');
    }

    return this.container.lookup('template:' + name);
  },

  /**
    Return the nearest ancestor that is an instance of the provided
    class or mixin.

    @method nearestOfType
    @param {Class,Mixin} klass Subclass of Ember.View (or Ember.View itself),
           or an instance of Ember.Mixin.
    @return Ember.View
    @private
  */
  nearestOfType(klass) {
    var view = get(this, 'parentView');
    var isOfType = klass instanceof Mixin ?
                   function(view) { return klass.detect(view); } :
                   function(view) { return klass.detect(view.constructor); };

    while (view) {
      if (isOfType(view)) { return view; }
      view = get(view, 'parentView');
    }
  },

  /**
    Return the nearest ancestor that has a given property.

    @method nearestWithProperty
    @param {String} property A property name
    @return Ember.View
    @private
  */
  nearestWithProperty(property) {
    var view = get(this, 'parentView');

    while (view) {
      if (property in view) { return view; }
      view = get(view, 'parentView');
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
  element: null,

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

  forEachChildView(callback) {
    var childViews = this.childViews;

    if (!childViews) { return this; }

    var len = childViews.length;
    var view, idx;

    for (idx = 0; idx < len; idx++) {
      view = childViews[idx];
      callback(view);
    }

    return this;
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
    @private
  */
  appendTo(selector) {
    var target = jQuery(selector);

    assert('You tried to append to (' + selector + ') but that isn\'t in the DOM', target.length > 0);
    assert('You cannot append to an existing Ember.View. Consider using Ember.ContainerView instead.', !target.is('.ember-view') && !target.parents().is('.ember-view'));

    this.renderer.appendTo(this, target[0]);

    return this;
  },

  /**
    @private

    Creates a new DOM element, renders the view into it, then returns the
    element.

    By default, the element created and rendered into will be a `BODY` element,
    since this is the default context that views are rendered into when being
    inserted directly into the DOM.

    ```js
    var element = view.renderToElement();
    element.tagName; // => "BODY"
    ```

    You can override the kind of element rendered into and returned by
    specifying an optional tag name as the first argument.

    ```js
    var element = view.renderToElement('table');
    element.tagName; // => "TABLE"
    ```

    This method is useful if you want to render the view into an element that
    is not in the document's body. Instead, a new `body` element, detached from
    the DOM is returned. FastBoot uses this to serialize the rendered view into
    a string for transmission over the network.

    ```js
    app.visit('/').then(function(instance) {
      var element;
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

    var element = this.renderer._dom.createElement(tagName);

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
    var target = jQuery(selector);

    assert('You tried to replace in (' + selector + ') but that isn\'t in the DOM', target.length > 0);
    assert('You cannot replace an existing Ember.View. Consider using Ember.ContainerView instead.', !target.is('.ember-view') && !target.parents().is('.ember-view'));

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
    Removes the view's element from the element to which it is attached.

    @method remove
    @return {Ember.View} receiver
    @private
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
        setElementId: Ember.on('init', function() {
          var index = this.get('index');
          this.set('elementId', 'component-id' + index);
        })
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
    var id = '#' + this.elementId;
    return jQuery(id)[0] || jQuery(id, parentElem)[0];
  },

  /**
    Creates a DOM representation of the view and all of its child views by
    recursively calling the `render()` method. Once the element is created,
    it sets the `element` property of the view to the rendered element.

    After the element has been inserted into the DOM, `didInsertElement` will
    be called on this view and all of its child views.

    @method createElement
    @return {Ember.View} receiver
    @private
  */
  createElement() {
    if (this.element) { return this; }

    this.renderer.createElement(this);

    return this;
  },

  /**
    Called when a view is going to insert an element into the DOM.

    @event willInsertElement
    @public
  */
  willInsertElement: K,

  /**
    Called when the element of the view has been inserted into the DOM
    or after the view was re-rendered. Override this function to do any
    set up that requires an element in the document body.

    When a view has children, didInsertElement will be called on the
    child view(s) first, bubbling upwards through the hierarchy.

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
    @private
  */
  destroyElement() {
    return this._currentState.destroyElement(this);
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

  /*
    Used to specify a default tagName that can be overridden when extending
    or invoking from a template.

    @property _defaultTagName
    @private
  */

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
    @public
  */
  readDOMAttr(name) {
    let attr = this._renderNode.childNodes.filter(node => node.attrName === name)[0];
    if (!attr) { return null; }
    return attr.getContent();
  },

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
    if (!this.elementId) {
      this.elementId = guidFor(this);
    }

    this.scheduledRevalidation = false;

    this._super(...arguments);
    this.renderer.componentInitAttrs(this, this.attrs || {});

    assert(
      'Using a custom `.render` function is no longer supported.',
      !this.render
    );
  },

  __defineNonEnumerable(property) {
    this[property.name] = property.descriptor.value;
  },

  revalidate() {
    this.renderer.revalidateTopLevelView(this);
    this.scheduledRevalidation = false;
  },

  scheduleRevalidate(node, label, manualRerender) {
    if (node && !this._dispatching && this.env.renderedNodes.has(node)) {
      if (manualRerender) {
        deprecate(
          `You manually rerendered ${label} (a parent component) from a child component during the rendering process. This rarely worked in Ember 1.x and will be removed in Ember 2.0`,
          false,
          { id: 'ember-views.manual-parent-rerender', until: '3.0.0' }
        );
      } else {
        deprecate(
          `You modified ${label} twice in a single render. This was unreliable in Ember 1.x and will be removed in Ember 2.0`,
          false,
          { id: 'ember-views.render-double-modify', until: '3.0.0' }
        );
      }
      run.scheduleOnce('render', this, this.revalidate);
      return;
    }

    deprecate(
      `A property of ${this} was modified inside the ${this._dispatching} hook. You should never change properties on components, services or models during ${this._dispatching} because it causes significant performance degradation.`,
      !this._dispatching,
      { id: 'ember-views.dispatching-modify-property', until: '3.0.0' }
    );

    if (!this.scheduledRevalidation || this._dispatching) {
      this.scheduledRevalidation = true;
      run.scheduleOnce('render', this, this.revalidate);
    }
  },

  templateRenderer: null,

  /**
    Removes the view from its `parentView`, if one is found. Otherwise
    does nothing.

    @method removeFromParent
    @return {Ember.View} receiver
    @private
  */
  removeFromParent() {
    var parent = this.parentView;

    // Remove DOM element from parent
    this.remove();

    if (parent) { parent.removeChild(this); }
    return this;
  },

  /**
    You must call `destroy` on a view to destroy the view (and all of its
    child views). This will remove the view from any parent node, then make
    sure that the DOM element managed by the view can be released by the
    memory manager.

    @method destroy
    @private
  */
  destroy() {
    // get parentView before calling super because it'll be destroyed
    var parentView = this.parentView;
    var viewName = this.viewName;

    if (!this._super(...arguments)) { return; }

    // remove from non-virtual parent view if viewName was specified
    if (viewName && parentView) {
      parentView.set(viewName, null);
    }

    // Destroy HTMLbars template
    if (this.lastResult) {
      this.lastResult.destroy();
    }

    return this;
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
    assert('Attempted to register a view with an id already in use: ' + this.elementId, !this._viewRegistry[this.elementId]);
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
  },

  registerObserver(root, path, target, observer) {
    if (!observer && 'function' === typeof target) {
      observer = target;
      target = null;
    }

    if (!root || typeof root !== 'object') {
      return;
    }

    var scheduledObserver = this._wrapAsScheduled(observer);

    addObserver(root, path, target, scheduledObserver);

    this.one('willClearRender', function() {
      removeObserver(root, path, target, scheduledObserver);
    });
  },

  _wrapAsScheduled(fn) {
    var view = this;
    var stateCheckedFn = function() {
      view._currentState.invokeObserver(this, fn);
    };
    var scheduledFn = function() {
      run.scheduleOnce('render', this, stateCheckedFn);
    };
    return scheduledFn;
  }
});
