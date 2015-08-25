// jQuery, Ember.lookup,
// Ember.ContainerView circular dependency
// Ember.ENV
import Ember from 'ember-metal/core';
import { deprecate, warn } from 'ember-metal/debug';

import 'ember-views/system/ext';  // for the side effect of extending Ember.run.queues

import CoreView from 'ember-views/views/core_view';
import ViewContextSupport from 'ember-views/mixins/view_context_support';
import ViewChildViewsSupport from 'ember-views/mixins/view_child_views_support';
import ViewLegacyChildViewsSupport from 'ember-views/mixins/legacy_child_views_support';
import {
  childViewsProperty
} from 'ember-views/mixins/view_child_views_support';
import ViewStateSupport from 'ember-views/mixins/view_state_support';
import TemplateRenderingSupport from 'ember-views/mixins/template_rendering_support';
import ClassNamesSupport from 'ember-views/mixins/class_names_support';
import LegacyViewSupport from 'ember-views/mixins/legacy_view_support';
import InstrumentationSupport from 'ember-views/mixins/instrumentation_support';
import AriaRoleSupport from 'ember-views/mixins/aria_role_support';
import VisibilitySupport from 'ember-views/mixins/visibility_support';
import CompatAttrsProxy from 'ember-views/compat/attrs-proxy';
import ViewMixin from 'ember-views/mixins/view_support';
import { deprecateProperty } from 'ember-metal/deprecate_property';

/**
@module ember
@submodule ember-views
*/

warn(
  'The VIEW_PRESERVES_CONTEXT flag has been removed and the functionality can no longer be disabled.',
  Ember.ENV.VIEW_PRESERVES_CONTEXT !== false,
  {
    id: 'ember-views.view-preserves-context-flag',
    until: '2.0.0'
  });

/**
  Global hash of shared templates. This will automatically be populated
  by the build tools so that you can store your Handlebars templates in
  separate files that get loaded into JavaScript at buildtime.

  @property TEMPLATES
  @for Ember
  @type Object
  @private
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
    propertyB: Ember.computed(function() {
      if (someLogic) { return 'from-b'; }
    })
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
    disabled: Ember.computed(function() {
      if (someLogic) {
        return true;
      } else {
        return false;
      }
    })
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
  template.

  ```javascript
  AView = Ember.View.extend({
    template: Ember.HTMLBars.compile('I am the template')
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

  If you have nested routes, your Handlebars template will look like this:

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

  Using a value for `templateName` that does not have a template
  with a matching `data-template-name` attribute will throw an error.

  For views classes that may have a template later defined (e.g. as the block
  portion of a `{{view}}` helper call in another template or in
  a subclass), you can provide a `defaultTemplate` property set to compiled
  template function. If a template is not later provided for the view instance
  the `defaultTemplate` value will be used:

  ```javascript
  AView = Ember.View.extend({
    defaultTemplate: Ember.HTMLBars.compile('I was the default'),
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
    defaultTemplate: Ember.HTMLBars.compile('I was the default')
  });

  aView = AView.create({
    template: Ember.HTMLBars.compile('I was the template, not default')
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
    template: Ember.HTMLBars.compile('Hello {{excitedGreeting}}')
  });

  aController = Ember.Object.create({
    firstName: 'Barry',
    excitedGreeting: Ember.computed('content.firstName', function() {
      return this.get('content.firstName') + '!!!';
    })
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

  Most typically in Ember a layout will be a compiled template.

  A view's layout can be set directly with the `layout` property or reference
  an existing template by name with the `layoutName` property.

  A template used as a layout must contain a single use of the
  `{{yield}}` helper. The HTML contents of a view's rendered `template` will be
  inserted at this location:

  ```javascript
  AViewWithLayout = Ember.View.extend({
    layout: Ember.HTMLBars.compile("<div class='my-decorative-class'>{{yield}}</div>"),
    template: Ember.HTMLBars.compile("I got wrapped")
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

  See [Ember.Templates.helpers.yield](/api/classes/Ember.Templates.helpers.html#method_yield)
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
    template: Ember.HTMLBars.compile("outer {{#view 'inner'}}inner{{/view}} outer"),
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

  ### `{{action}}` Helper

  See [Ember.Templates.helpers.action](/api/classes/Ember.Templates.helpers.html#method_action).

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

  ## `{{view}}` Helper

  Other `Ember.View` instances can be included as part of a view's template by
  using the `{{view}}` helper. See [Ember.Templates.helpers.view](/api/classes/Ember.Templates.helpers.html#method_view)
  for additional information.

  @class View
  @namespace Ember
  @extends Ember.CoreView
  @deprecated See http://emberjs.com/deprecations/v1.x/#toc_ember-view
  @uses Ember.ViewContextSupport
  @uses Ember.ViewChildViewsSupport
  @uses Ember.TemplateRenderingSupport
  @uses Ember.ClassNamesSupport
  @uses Ember.AttributeBindingsSupport
  @uses Ember.LegacyViewSupport
  @uses Ember.InstrumentationSupport
  @uses Ember.VisibilitySupport
  @uses Ember.AriaRoleSupport
  @public
*/
// jscs:disable validateIndentation
var View = CoreView.extend(
  ViewContextSupport,
  ViewChildViewsSupport,
  ViewLegacyChildViewsSupport,
  ViewStateSupport,
  TemplateRenderingSupport,
  ClassNamesSupport,
  LegacyViewSupport,
  InstrumentationSupport,
  VisibilitySupport,
  CompatAttrsProxy,
  AriaRoleSupport,
  ViewMixin, {
    init() {
      this._super(...arguments);

      if (!this._viewRegistry) {
        this._viewRegistry = View.views;
      }
    },

    /**
      Given a property name, returns a dasherized version of that
      property name if the property evaluates to a non-falsy value.

      For example, if the view has property `isUrgent` that evaluates to true,
      passing `isUrgent` to this method will return `"is-urgent"`.

      @method _classStringForProperty
      @param property
      @private
    */
    _classStringForProperty(parsedPath) {
      return View._classStringForValue(parsedPath.path, parsedPath.stream.value(), parsedPath.className, parsedPath.falsyClassName);
    }
  });

deprecateProperty(View.prototype, 'currentState', '_currentState', {
  id: 'ember-view.current-state',
  until: '2.3.0'
});

// jscs:enable validateIndentation

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

View.reopenClass({
  /**
    Global views hash

    @property views
    @static
    @type Object
    @private
  */
  views: {},

  // If someone overrides the child views computed property when
  // defining their class, we want to be able to process the user's
  // supplied childViews and then restore the original computed property
  // at view initialization time. This happens in Ember.ContainerView's init
  // method.
  childViewsProperty
});

function viewDeprecationMessage() {
  deprecate(
    `Ember.View is deprecated. Consult the Deprecations Guide for a migration strategy.`,
    !!Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT,
    {
      url: 'http://emberjs.com/deprecations/v1.x/#toc_ember-view',
      id: 'ember-views.view-deprecated',
      until: '2.4.0'
    }
  );
}

var DeprecatedView = View.extend({
  init() {
    viewDeprecationMessage();
    this._super(...arguments);
  }
});

DeprecatedView.reopen = function() {
  viewDeprecationMessage();
  View.reopen(...arguments);
  return this;
};

export default View;

export { ViewContextSupport, ViewChildViewsSupport, ViewStateSupport, TemplateRenderingSupport, ClassNamesSupport, DeprecatedView };
