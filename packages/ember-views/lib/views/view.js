// Ember.assert, Ember.deprecate, Ember.warn, Ember.TEMPLATES,
// jQuery, Ember.lookup,
// Ember.ContainerView circular dependency
// Ember.ENV
import Ember from 'ember-metal/core';

import Evented from "ember-runtime/mixins/evented";
import EmberObject from "ember-runtime/system/object";
import { get } from "ember-metal/property_get";
import {
  Mixin,
  observer
} from "ember-metal/mixin";
import { deprecateProperty } from "ember-metal/deprecate_property";

import jQuery from "ember-views/system/jquery";
import "ember-views/system/ext";  // for the side effect of extending Ember.run.queues

import CoreView from "ember-views/views/core_view";
import ViewContextSupport from "ember-views/mixins/view_context_support";
import ViewChildViewsSupport from "ember-views/mixins/view_child_views_support";
import {
  childViewsProperty
} from "ember-views/mixins/view_child_views_support";
import ViewStateSupport from "ember-views/mixins/view_state_support";
import TemplateRenderingSupport from "ember-views/mixins/template_rendering_support";
import TemplateLookupSupport from "ember-views/mixins/template_lookup_support";
import ClassNamesSupport from "ember-views/mixins/class_names_support";
import LegacyViewSupport from "ember-views/mixins/legacy_view_support";
import InstrumentationSupport from "ember-views/mixins/instrumentation_support";
import VisibilitySupport from "ember-views/mixins/visibility_support";
import CompatAttrsProxy from "ember-views/compat/attrs-proxy";
import DOMSupport from "ember-views/mixins/dom_support";

function K() { return this; }

/**
@module ember
@submodule ember-views
*/

Ember.warn("The VIEW_PRESERVES_CONTEXT flag has been removed and the functionality can no longer be disabled.", Ember.ENV.VIEW_PRESERVES_CONTEXT !== false);

/**
  Global hash of shared templates. This will automatically be populated
  by the build tools so that you can store your Handlebars templates in
  separate files that get loaded into JavaScript at buildtime.

  @property TEMPLATES
  @for Ember
  @type Hash
*/
Ember.TEMPLATES = {};

/**
  `Ember.View` is the class in Ember responsible for encapsulating templates of
  HTML content, combining templates with data to render as sections of a page's
  DOM, and registering and responding to user-initiated events.

  ## HTML Tag

  The default HTML tag name used for a view's DOM representation is `div`. This
  can be customized by setting the `tagName` property. The following view
  class:

  ```javascript
  ParagraphView = Ember.View.extend({
    tagName: 'em'
  });
  ```

  Would result in instances with the following HTML:

  ```html
  <em id="ember1" class="ember-view"></em>
  ```

  ## HTML `class` Attribute

  The HTML `class` attribute of a view's tag can be set by providing a
  `classNames` property that is set to an array of strings:

  ```javascript
  MyView = Ember.View.extend({
    classNames: ['my-class', 'my-other-class']
  });
  ```

  Will result in view instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view my-class my-other-class"></div>
  ```

  `class` attribute values can also be set by providing a `classNameBindings`
  property set to an array of properties names for the view. The return value
  of these properties will be added as part of the value for the view's `class`
  attribute. These properties can be computed properties:

  ```javascript
  MyView = Ember.View.extend({
    classNameBindings: ['propertyA', 'propertyB'],
    propertyA: 'from-a',
    propertyB: function() {
      if (someLogic) { return 'from-b'; }
    }.property()
  });
  ```

  Will result in view instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view from-a from-b"></div>
  ```

  If the value of a class name binding returns a boolean the property name
  itself will be used as the class name if the property is true. The class name
  will not be added if the value is `false` or `undefined`.

  ```javascript
  MyView = Ember.View.extend({
    classNameBindings: ['hovered'],
    hovered: true
  });
  ```

  Will result in view instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view hovered"></div>
  ```

  When using boolean class name bindings you can supply a string value other
  than the property name for use as the `class` HTML attribute by appending the
  preferred value after a ":" character when defining the binding:

  ```javascript
  MyView = Ember.View.extend({
    classNameBindings: ['awesome:so-very-cool'],
    awesome: true
  });
  ```

  Will result in view instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view so-very-cool"></div>
  ```

  Boolean value class name bindings whose property names are in a
  camelCase-style format will be converted to a dasherized format:

  ```javascript
  MyView = Ember.View.extend({
    classNameBindings: ['isUrgent'],
    isUrgent: true
  });
  ```

  Will result in view instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view is-urgent"></div>
  ```

  Class name bindings can also refer to object values that are found by
  traversing a path relative to the view itself:

  ```javascript
  MyView = Ember.View.extend({
    classNameBindings: ['messages.empty']
    messages: Ember.Object.create({
      empty: true
    })
  });
  ```

  Will result in view instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view empty"></div>
  ```

  If you want to add a class name for a property which evaluates to true and
  and a different class name if it evaluates to false, you can pass a binding
  like this:

  ```javascript
  // Applies 'enabled' class when isEnabled is true and 'disabled' when isEnabled is false
  Ember.View.extend({
    classNameBindings: ['isEnabled:enabled:disabled']
    isEnabled: true
  });
  ```

  Will result in view instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view enabled"></div>
  ```

  When isEnabled is `false`, the resulting HTML representation looks like
  this:

  ```html
  <div id="ember1" class="ember-view disabled"></div>
  ```

  This syntax offers the convenience to add a class if a property is `false`:

  ```javascript
  // Applies no class when isEnabled is true and class 'disabled' when isEnabled is false
  Ember.View.extend({
    classNameBindings: ['isEnabled::disabled']
    isEnabled: true
  });
  ```

  Will result in view instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view"></div>
  ```

  When the `isEnabled` property on the view is set to `false`, it will result
  in view instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view disabled"></div>
  ```

  Updates to the the value of a class name binding will result in automatic
  update of the  HTML `class` attribute in the view's rendered HTML
  representation. If the value becomes `false` or `undefined` the class name
  will be removed.

  Both `classNames` and `classNameBindings` are concatenated properties. See
  [Ember.Object](/api/classes/Ember.Object.html) documentation for more
  information about concatenated properties.

  ## HTML Attributes

  The HTML attribute section of a view's tag can be set by providing an
  `attributeBindings` property set to an array of property names on the view.
  The return value of these properties will be used as the value of the view's
  HTML associated attribute:

  ```javascript
  AnchorView = Ember.View.extend({
    tagName: 'a',
    attributeBindings: ['href'],
    href: 'http://google.com'
  });
  ```

  Will result in view instances with an HTML representation of:

  ```html
  <a id="ember1" class="ember-view" href="http://google.com"></a>
  ```

  One property can be mapped on to another by placing a ":" between
  the source property and the destination property:

  ```javascript
  AnchorView = Ember.View.extend({
    tagName: 'a',
    attributeBindings: ['url:href'],
    url: 'http://google.com'
  });
  ```

  Will result in view instances with an HTML representation of:

  ```html
  <a id="ember1" class="ember-view" href="http://google.com"></a>
  ```

  Namespaced attributes (e.g. `xlink:href`) are supported, but have to be
  mapped, since `:` is not a valid character for properties in Javascript:

  ```javascript
  UseView = Ember.View.extend({
    tagName: 'use',
    attributeBindings: ['xlinkHref:xlink:href'],
    xlinkHref: '#triangle'
  });
  ```
  Will result in view instances with an HTML representation of:

  ```html
  <use xlink:href="#triangle"></use>
  ```

  If the return value of an `attributeBindings` monitored property is a boolean
  the property will follow HTML's pattern of repeating the attribute's name as
  its value:

  ```javascript
  MyTextInput = Ember.View.extend({
    tagName: 'input',
    attributeBindings: ['disabled'],
    disabled: true
  });
  ```

  Will result in view instances with an HTML representation of:

  ```html
  <input id="ember1" class="ember-view" disabled="disabled" />
  ```

  `attributeBindings` can refer to computed properties:

  ```javascript
  MyTextInput = Ember.View.extend({
    tagName: 'input',
    attributeBindings: ['disabled'],
    disabled: function() {
      if (someLogic) {
        return true;
      } else {
        return false;
      }
    }.property()
  });
  ```

  Updates to the the property of an attribute binding will result in automatic
  update of the  HTML attribute in the view's rendered HTML representation.

  `attributeBindings` is a concatenated property. See [Ember.Object](/api/classes/Ember.Object.html)
  documentation for more information about concatenated properties.

  ## Templates

  The HTML contents of a view's rendered representation are determined by its
  template. Templates can be any function that accepts an optional context
  parameter and returns a string of HTML that will be inserted within the
  view's tag. Most typically in Ember this function will be a compiled
  `Ember.Handlebars` template.

  ```javascript
  AView = Ember.View.extend({
    template: Ember.Handlebars.compile('I am the template')
  });
  ```

  Will result in view instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view">I am the template</div>
  ```

  Within an Ember application is more common to define a Handlebars templates as
  part of a page:

  ```html
  <script type='text/x-handlebars' data-template-name='some-template'>
    Hello
  </script>
  ```

  And associate it by name using a view's `templateName` property:

  ```javascript
  AView = Ember.View.extend({
    templateName: 'some-template'
  });
  ```

  If you have nested resources, your Handlebars template will look like this:

  ```html
  <script type='text/x-handlebars' data-template-name='posts/new'>
    <h1>New Post</h1>
  </script>
  ```

  And `templateName` property:

  ```javascript
  AView = Ember.View.extend({
    templateName: 'posts/new'
  });
  ```

  Using a value for `templateName` that does not have a Handlebars template
  with a matching `data-template-name` attribute will throw an error.

  For views classes that may have a template later defined (e.g. as the block
  portion of a `{{view}}` Handlebars helper call in another template or in
  a subclass), you can provide a `defaultTemplate` property set to compiled
  template function. If a template is not later provided for the view instance
  the `defaultTemplate` value will be used:

  ```javascript
  AView = Ember.View.extend({
    defaultTemplate: Ember.Handlebars.compile('I was the default'),
    template: null,
    templateName: null
  });
  ```

  Will result in instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view">I was the default</div>
  ```

  If a `template` or `templateName` is provided it will take precedence over
  `defaultTemplate`:

  ```javascript
  AView = Ember.View.extend({
    defaultTemplate: Ember.Handlebars.compile('I was the default')
  });

  aView = AView.create({
    template: Ember.Handlebars.compile('I was the template, not default')
  });
  ```

  Will result in the following HTML representation when rendered:

  ```html
  <div id="ember1" class="ember-view">I was the template, not default</div>
  ```

  ## View Context

  The default context of the compiled template is the view's controller:

  ```javascript
  AView = Ember.View.extend({
    template: Ember.Handlebars.compile('Hello {{excitedGreeting}}')
  });

  aController = Ember.Object.create({
    firstName: 'Barry',
    excitedGreeting: function() {
      return this.get("content.firstName") + "!!!"
    }.property()
  });

  aView = AView.create({
    controller: aController
  });
  ```

  Will result in an HTML representation of:

  ```html
  <div id="ember1" class="ember-view">Hello Barry!!!</div>
  ```

  A context can also be explicitly supplied through the view's `context`
  property. If the view has neither `context` nor `controller` properties, the
  `parentView`'s context will be used.

  ## Layouts

  Views can have a secondary template that wraps their main template. Like
  primary templates, layouts can be any function that  accepts an optional
  context parameter and returns a string of HTML that will be inserted inside
  view's tag. Views whose HTML element is self closing (e.g. `<input />`)
  cannot have a layout and this property will be ignored.

  Most typically in Ember a layout will be a compiled `Ember.Handlebars`
  template.

  A view's layout can be set directly with the `layout` property or reference
  an existing Handlebars template by name with the `layoutName` property.

  A template used as a layout must contain a single use of the Handlebars
  `{{yield}}` helper. The HTML contents of a view's rendered `template` will be
  inserted at this location:

  ```javascript
  AViewWithLayout = Ember.View.extend({
    layout: Ember.Handlebars.compile("<div class='my-decorative-class'>{{yield}}</div>"),
    template: Ember.Handlebars.compile("I got wrapped")
  });
  ```

  Will result in view instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view">
    <div class="my-decorative-class">
      I got wrapped
    </div>
  </div>
  ```

  See [Ember.Handlebars.helpers.yield](/api/classes/Ember.Handlebars.helpers.html#method_yield)
  for more information.

  ## Responding to Browser Events

  Views can respond to user-initiated events in one of three ways: method
  implementation, through an event manager, and through `{{action}}` helper use
  in their template or layout.

  ### Method Implementation

  Views can respond to user-initiated events by implementing a method that
  matches the event name. A `jQuery.Event` object will be passed as the
  argument to this method.

  ```javascript
  AView = Ember.View.extend({
    click: function(event) {
      // will be called when when an instance's
      // rendered element is clicked
    }
  });
  ```

  ### Event Managers

  Views can define an object as their `eventManager` property. This object can
  then implement methods that match the desired event names. Matching events
  that occur on the view's rendered HTML or the rendered HTML of any of its DOM
  descendants will trigger this method. A `jQuery.Event` object will be passed
  as the first argument to the method and an  `Ember.View` object as the
  second. The `Ember.View` will be the view whose rendered HTML was interacted
  with. This may be the view with the `eventManager` property or one of its
  descendant views.

  ```javascript
  AView = Ember.View.extend({
    eventManager: Ember.Object.create({
      doubleClick: function(event, view) {
        // will be called when when an instance's
        // rendered element or any rendering
        // of this view's descendant
        // elements is clicked
      }
    })
  });
  ```

  An event defined for an event manager takes precedence over events of the
  same name handled through methods on the view.

  ```javascript
  AView = Ember.View.extend({
    mouseEnter: function(event) {
      // will never trigger.
    },
    eventManager: Ember.Object.create({
      mouseEnter: function(event, view) {
        // takes precedence over AView#mouseEnter
      }
    })
  });
  ```

  Similarly a view's event manager will take precedence for events of any views
  rendered as a descendant. A method name that matches an event name will not
  be called if the view instance was rendered inside the HTML representation of
  a view that has an `eventManager` property defined that handles events of the
  name. Events not handled by the event manager will still trigger method calls
  on the descendant.

  ```javascript
  var App = Ember.Application.create();
  App.OuterView = Ember.View.extend({
    template: Ember.Handlebars.compile("outer {{#view 'inner'}}inner{{/view}} outer"),
    eventManager: Ember.Object.create({
      mouseEnter: function(event, view) {
        // view might be instance of either
        // OuterView or InnerView depending on
        // where on the page the user interaction occurred
      }
    })
  });

  App.InnerView = Ember.View.extend({
    click: function(event) {
      // will be called if rendered inside
      // an OuterView because OuterView's
      // eventManager doesn't handle click events
    },
    mouseEnter: function(event) {
      // will never be called if rendered inside
      // an OuterView.
    }
  });
  ```

  ### Handlebars `{{action}}` Helper

  See [Handlebars.helpers.action](/api/classes/Ember.Handlebars.helpers.html#method_action).

  ### Event Names

  All of the event handling approaches described above respond to the same set
  of events. The names of the built-in events are listed below. (The hash of
  built-in events exists in `Ember.EventDispatcher`.) Additional, custom events
  can be registered by using `Ember.Application.customEvents`.

  Touch events:

  * `touchStart`
  * `touchMove`
  * `touchEnd`
  * `touchCancel`

  Keyboard events

  * `keyDown`
  * `keyUp`
  * `keyPress`

  Mouse events

  * `mouseDown`
  * `mouseUp`
  * `contextMenu`
  * `click`
  * `doubleClick`
  * `mouseMove`
  * `focusIn`
  * `focusOut`
  * `mouseEnter`
  * `mouseLeave`

  Form events:

  * `submit`
  * `change`
  * `focusIn`
  * `focusOut`
  * `input`

  HTML5 drag and drop events:

  * `dragStart`
  * `drag`
  * `dragEnter`
  * `dragLeave`
  * `dragOver`
  * `dragEnd`
  * `drop`

  ## Handlebars `{{view}}` Helper

  Other `Ember.View` instances can be included as part of a view's template by
  using the `{{view}}` Handlebars helper. See [Ember.Handlebars.helpers.view](/api/classes/Ember.Handlebars.helpers.html#method_view)
  for additional information.

  @class View
  @namespace Ember
  @extends Ember.CoreView
  @uses Ember.ViewContextSupport
  @uses Ember.ViewChildViewsSupport
  @uses Ember.TemplateRenderingSupport
  @uses Ember.ClassNamesSupport
  @uses Ember.AttributeBindingsSupport
  @uses Ember.LegacyViewSupport
  @uses Ember.InstrumentationSupport
  @uses Ember.VisibilitySupport
*/
// jscs:disable validateIndentation
var View = CoreView.extend(
  ViewContextSupport,
  ViewChildViewsSupport,
  ViewStateSupport,
  TemplateRenderingSupport,
  TemplateLookupSupport,
  ClassNamesSupport,
  LegacyViewSupport,
  InstrumentationSupport,
  VisibilitySupport,
  DOMSupport,
  CompatAttrsProxy, {
  concatenatedProperties: ['attributeBindings'],

  /**
    @property isView
    @type Boolean
    @default true
    @static
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
  */
  templateName: null,

  /**
    If a value that affects template rendering changes, the view should be
    re-rendered to reflect the new value.

    @method _contextDidChange
    @private
  */
  _contextDidChange: observer('context', function() {
    this.rerender();
  }),

  /**
    Return the nearest ancestor that is an instance of the provided
    class or mixin.

    @method nearestOfType
    @param {Class,Mixin} klass Subclass of Ember.View (or Ember.View itself),
           or an instance of Ember.Mixin.
    @return Ember.View
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
  */
  nearestWithProperty(property) {
    var view = get(this, 'parentView');

    while (view) {
      if (property in view) { return view; }
      view = get(view, 'parentView');
    }
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
  */
  renderToElement(tagName) {
    tagName = tagName || 'body';

    var element = this.renderer._dom.createElement(tagName);

    this.renderer.appendTo(this, element);
    return element;
  },

  /**
    Attempts to discover the element in the parent element. The default
    implementation looks for an element with an ID of `elementId` (or the
    view's guid if `elementId` is null). You can override this method to
    provide your own form of lookup. For example, if you want to discover your
    element using a CSS class name instead of an ID.

    @method findElementInParentElement
    @param {DOMElement} parentElement The parent's DOM element
    @return {DOMElement} The discovered element
  */
  findElementInParentElement(parentElem) {
    var id = "#" + this.elementId;
    return jQuery(id)[0] || jQuery(id, parentElem)[0];
  },

  /**
    Called when a view is going to insert an element into the DOM.

    @event willInsertElement
  */
  willInsertElement: K,

  /**
    Called when the element of the view has been inserted into the DOM
    or after the view was re-rendered. Override this function to do any
    set up that requires an element in the document body.

    When a view has children, didInsertElement will be called on the
    child view(s) first, bubbling upwards through the hierarchy.

    @event didInsertElement
  */
  didInsertElement: K,

  /**
    Called when the view is about to rerender, but before anything has
    been torn down. This is a good opportunity to tear down any manual
    observers you have installed based on the DOM state

    @event willClearRender
  */
  willClearRender: K,

  /**
    Called when the element of the view is going to be destroyed. Override
    this function to do any teardown that requires an element, like removing
    event listeners.

    Please note: any property changes made during this event will have no
    effect on object observers.

    @event willDestroyElement
  */
  willDestroyElement: K,

  /**
    Called when the parentView property has changed.

    @event parentViewDidChange
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
    The WAI-ARIA role of the control represented by this view. For example, a
    button may have a role of type 'button', or a pane may have a role of
    type 'alertdialog'. This property is used by assistive software to help
    visually challenged users navigate rich web applications.

    The full list of valid WAI-ARIA roles is available at:
    [http://www.w3.org/TR/wai-aria/roles#roles_categorization](http://www.w3.org/TR/wai-aria/roles#roles_categorization)

    @property ariaRole
    @type String
    @default null
  */
  ariaRole: null,

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

    if (!this._viewRegistry) {
      this._viewRegistry = View.views;
    }

    this.scheduledRevalidation = false;
  },

  __defineNonEnumerable(property) {
    this[property.name] = property.descriptor.value;
  },

  templateRenderer: null,

  /**
    Removes the view from its `parentView`, if one is found. Otherwise
    does nothing.

    @method removeFromParent
    @return {Ember.View} receiver
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

    return this;
  }
});
// jscs:enable validateIndentation

deprecateProperty(View.prototype, 'state', '_state');
deprecateProperty(View.prototype, 'states', '_states');

/*
  Describe how the specified actions should behave in the various
  states that a view can exist in. Possible states:

  * preRender: when a view is first instantiated, and after its
    element was destroyed, it is in the preRender state
  * inBuffer: once a view has been rendered, but before it has
    been inserted into the DOM, it is in the inBuffer state
  * hasElement: the DOM representation of the view is created,
    and is ready to be inserted
  * inDOM: once a view has been inserted into the DOM it is in
    the inDOM state. A view spends the vast majority of its
    existence in this state.
  * destroyed: once a view has been destroyed (using the destroy
    method), it is in this state. No further actions can be invoked
    on a destroyed view.
*/

// in the destroyed state, everything is illegal

// before rendering has begun, all legal manipulations are noops.

// inside the buffer, legal manipulations are done on the buffer

// once the view has been inserted into the DOM, legal manipulations
// are done on the DOM element.

var mutation = EmberObject.extend(Evented).create();
// TODO MOVE TO RENDERER HOOKS
View.addMutationListener = function(callback) {
  mutation.on('change', callback);
};

View.removeMutationListener = function(callback) {
  mutation.off('change', callback);
};

View.notifyMutationListeners = function() {
  mutation.trigger('change');
};

/**
  Global views hash

  @property views
  @static
  @type Hash
*/
View.views = {};

// If someone overrides the child views computed property when
// defining their class, we want to be able to process the user's
// supplied childViews and then restore the original computed property
// at view initialization time. This happens in Ember.ContainerView's init
// method.
View.childViewsProperty = childViewsProperty;


export default View;

export { ViewContextSupport, ViewChildViewsSupport, ViewStateSupport, TemplateRenderingSupport, ClassNamesSupport };
