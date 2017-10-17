import { symbol, getOwner, NAME_KEY } from 'ember-utils';
import {
  CoreView,
  ClassNamesSupport,
  ChildViewsSupport,
  ViewStateSupport,
  ViewMixin,
  ActionSupport,
  getViewElement
} from 'ember-views';
import { TargetActionSupport } from 'ember-runtime';
import {
  assert,
  deprecate
} from 'ember-debug';
import {
  get,
  PROPERTY_DID_CHANGE,
} from 'ember-metal';
import { UPDATE, RootReference } from './utils/references';
import { DirtyableTag } from '@glimmer/reference';
import { readDOMAttr } from '@glimmer/runtime';

export const DIRTY_TAG = symbol('DIRTY_TAG');
export const ARGS = symbol('ARGS');
export const ROOT_REF = symbol('ROOT_REF');
export const IS_DISPATCHING_ATTRS = symbol('IS_DISPATCHING_ATTRS');
export const HAS_BLOCK = symbol('HAS_BLOCK');
export const BOUNDS = symbol('BOUNDS');

/**
@module @ember/component
*/

/**
  A `Component` is a view that is completely
  isolated. Properties accessed in its templates go
  to the view object and actions are targeted at
  the view object. There is no access to the
  surrounding context or outer controller; all
  contextual information must be passed in.

  The easiest way to create a `Component` is via
  a template. If you name a template
  `app/components/my-foo.hbs`, you will be able to use
  `{{my-foo}}` in other templates, which will make
  an instance of the isolated component.

  ```app/components/my-foo.hbs
  {{person-profile person=currentUser}}
  ```

  ```app/components/person-profile.hbs
  <h1>{{person.title}}</h1>
  <img src={{person.avatar}}>
  <p class='signature'>{{person.signature}}</p>
  ```

  You can use `yield` inside a template to
  include the **contents** of any block attached to
  the component. The block will be executed in the
  context of the surrounding context or outer controller:

  ```handlebars
  {{#person-profile person=currentUser}}
    <p>Admin mode</p>
    {{! Executed in the controller's context. }}
  {{/person-profile}}
  ```

  ```app/components/person-profile.hbs
  <h1>{{person.title}}</h1>
  {{! Executed in the component's context. }}
  {{yield}} {{! block contents }}
  ```

  If you want to customize the component, in order to
  handle events or actions, you implement a subclass
  of `Component` named after the name of the
  component.

  For example, you could implement the action
  `hello` for the `person-profile` component:

  ```app/components/person-profile.js
  import Component from '@ember/component';

  export default Component.extend({
    actions: {
      hello(name) {
        console.log("Hello", name);
      }
    }
  });
  ```

  And then use it in the component's template:

  ```app/templates/components/person-profile.hbs
  <h1>{{person.title}}</h1>
  {{yield}} <!-- block contents -->
  <button {{action 'hello' person.name}}>
    Say Hello to {{person.name}}
  </button>
  ```

  Components must have a `-` in their name to avoid
  conflicts with built-in controls that wrap HTML
  elements. This is consistent with the same
  requirement in web components.


  ## HTML Tag

  The default HTML tag name used for a component's DOM representation is `div`.
  This can be customized by setting the `tagName` property.
  The following component class:

  ```app/components/emphasized-paragraph.js
  import Component from '@ember/component';

  export default Component.extend({
    tagName: 'em'
  });
  ```

  Would result in instances with the following HTML:

  ```html
  <em id="ember1" class="ember-view"></em>
  ```


  ## HTML `class` Attribute

  The HTML `class` attribute of a component's tag can be set by providing a
  `classNames` property that is set to an array of strings:

  ```app/components/my-widget.js
  import Component from '@ember/component';

  export default Component.extend({
    classNames: ['my-class', 'my-other-class']
  });
  ```

  Will result in component instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view my-class my-other-class"></div>
  ```

  `class` attribute values can also be set by providing a `classNameBindings`
  property set to an array of properties names for the component. The return value
  of these properties will be added as part of the value for the components's `class`
  attribute. These properties can be computed properties:

  ```app/components/my-widget.js
  import Component from '@ember/component';
  import { computed } from '@ember/object';

  export default Component.extend({
    classNameBindings: ['propertyA', 'propertyB'],

    propertyA: 'from-a',
    propertyB: computed(function() {
      if (someLogic) { return 'from-b'; }
    })
  });
  ```

  Will result in component instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view from-a from-b"></div>
  ```

  If the value of a class name binding returns a boolean the property name
  itself will be used as the class name if the property is true.
  The class name will not be added if the value is `false` or `undefined`.

  ```app/components/my-widget.js
  import Component from '@ember/component';

  export default Component.extend({
    classNameBindings: ['hovered'],

    hovered: true
  });
  ```

  Will result in component instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view hovered"></div>
  ```

  When using boolean class name bindings you can supply a string value other
  than the property name for use as the `class` HTML attribute by appending the
  preferred value after a ":" character when defining the binding:

  ```app/components/my-widget.js
  import Component from '@ember/component';

  export default Component.extend({
    classNameBindings: ['awesome:so-very-cool'],

    awesome: true
  });
  ```

  Will result in component instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view so-very-cool"></div>
  ```

  Boolean value class name bindings whose property names are in a
  camelCase-style format will be converted to a dasherized format:

  ```app/components/my-widget.js
  import Component from '@ember/component';

  export default Component.extend({
    classNameBindings: ['isUrgent'],

    isUrgent: true
  });
  ```

  Will result in component instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view is-urgent"></div>
  ```

  Class name bindings can also refer to object values that are found by
  traversing a path relative to the component itself:

  ```app/components/my-widget.js
  import Component from '@ember/component';
  import EmberObject from '@ember/object';

  export default Component.extend({
    classNameBindings: ['messages.empty'],

    messages: EmberObject.create({
      empty: true
    })
  });
  ```

  Will result in component instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view empty"></div>
  ```

  If you want to add a class name for a property which evaluates to true and
  and a different class name if it evaluates to false, you can pass a binding
  like this:

  ```app/components/my-widget.js
  import Component from '@ember/component';

  export default Component.extend({
    classNameBindings: ['isEnabled:enabled:disabled'],
    isEnabled: true
  });
  ```

  Will result in component instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view enabled"></div>
  ```

  When isEnabled is `false`, the resulting HTML representation looks like
  this:

  ```html
  <div id="ember1" class="ember-view disabled"></div>
  ```

  This syntax offers the convenience to add a class if a property is `false`:

  ```app/components/my-widget.js
  import Component from '@ember/component';

  // Applies no class when isEnabled is true and class 'disabled' when isEnabled is false
  export default Component.extend({
    classNameBindings: ['isEnabled::disabled'],
    isEnabled: true
  });
  ```

  Will result in component instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view"></div>
  ```

  When the `isEnabled` property on the component is set to `false`, it will result
  in component instances with an HTML representation of:

  ```html
  <div id="ember1" class="ember-view disabled"></div>
  ```

  Updates to the value of a class name binding will result in automatic
  update of the  HTML `class` attribute in the component's rendered HTML
  representation. If the value becomes `false` or `undefined` the class name
  will be removed.
  Both `classNames` and `classNameBindings` are concatenated properties. See
  [EmberObject](/api/classes/Ember.Object.html) documentation for more
  information about concatenated properties.


  ## HTML Attributes

  The HTML attribute section of a component's tag can be set by providing an
  `attributeBindings` property set to an array of property names on the component.
  The return value of these properties will be used as the value of the component's
  HTML associated attribute:

  ```app/components/my-anchor.js
  import Component from '@ember/component';

  export default Component.extend({
    tagName: 'a',
    attributeBindings: ['href'],

    href: 'http://google.com'
  });
  ```

  Will result in component instances with an HTML representation of:

  ```html
  <a id="ember1" class="ember-view" href="http://google.com"></a>
  ```

  One property can be mapped on to another by placing a ":" between
  the source property and the destination property:

  ```app/components/my-anchor.js
  import Component from '@ember/component';

  export default Component.extend({
    tagName: 'a',
    attributeBindings: ['url:href'],

    url: 'http://google.com'
  });
  ```

  Will result in component instances with an HTML representation of:

  ```html
  <a id="ember1" class="ember-view" href="http://google.com"></a>
  ```

  Namespaced attributes (e.g. `xlink:href`) are supported, but have to be
  mapped, since `:` is not a valid character for properties in Javascript:

  ```app/components/my-use.js
  import Component from '@ember/component';

  export default Component.extend({
    tagName: 'use',
    attributeBindings: ['xlinkHref:xlink:href'],

    xlinkHref: '#triangle'
  });
  ```

  Will result in component instances with an HTML representation of:

  ```html
  <use xlink:href="#triangle"></use>
  ```

  If the return value of an `attributeBindings` monitored property is a boolean
  the attribute will be present or absent depending on the value:

  ```app/components/my-text-input.js
  import Component from '@ember/component';

  export default Component.extend({
    tagName: 'input',
    attributeBindings: ['disabled'],

    disabled: false
  });
  ```

  Will result in a component instance with an HTML representation of:

  ```html
  <input id="ember1" class="ember-view" />
  ```

  `attributeBindings` can refer to computed properties:

  ```app/components/my-text-input.js
  import Component from '@ember/component';
  import { computed } from '@ember/object';

  export default Component.extend({
    tagName: 'input',
    attributeBindings: ['disabled'],

    disabled: computed(function() {
      if (someLogic) {
        return true;
      } else {
        return false;
      }
    })
  });
  ```

  To prevent setting an attribute altogether, use `null` or `undefined` as the
  return value of the `attributeBindings` monitored property:

  ```app/components/my-text-input.js
  import Component from '@ember/component';

  export default Component.extend({
    tagName: 'form',
    attributeBindings: ['novalidate'],
    novalidate: null
  });
  ```

  Updates to the property of an attribute binding will result in automatic
  update of the  HTML attribute in the component's rendered HTML representation.
  `attributeBindings` is a concatenated property. See [EmberObject](/api/classes/Ember.Object.html)
  documentation for more information about concatenated properties.


  ## Layouts

  See [Ember.Templates.helpers.yield](/api/classes/Ember.Templates.helpers.html#method_yield)
  for more information.

  Layout can be used to wrap content in a component. In addition
  to wrapping content in a Component's template, you can also use
  the public layout API in your Component JavaScript.

  ```app/templates/components/person-profile.hbs
    <h1>Person's Title</h1>
    <div class='details'>{{yield}}</div>
  ```

  ```app/components/person-profile.js
    import Component from '@ember/component';
    import layout from '../templates/components/person-profile';

    export default Component.extend({
      layout
    });
  ```

  The above will result in the following HTML output:

  ```html
    <h1>Person's Title</h1>
    <div class="details">
      <h2>Chief Basket Weaver</h2>
      <h3>Fisherman Industries</h3>
    </div>
  ```


  ## Responding to Browser Events

  Components can respond to user-initiated events in one of three ways: method
  implementation, through an event manager, and through `{{action}}` helper use
  in their template or layout.


  ### Method Implementation

  Components can respond to user-initiated events by implementing a method that
  matches the event name. A `jQuery.Event` object will be passed as the
  argument to this method.

  ```app/components/my-widget.js
  import Component from '@ember/component';

  export default Component.extend({
    click(event) {
      // will be called when an instance's
      // rendered element is clicked
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

  Keyboard events:

  * `keyDown`
  * `keyUp`
  * `keyPress`

  Mouse events:

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

  @class Component
  @extends Ember.CoreView
  @uses Ember.TargetActionSupport
  @uses Ember.ClassNamesSupport
  @uses Ember.ActionSupport
  @uses Ember.ViewMixin
  @uses Ember.ViewStateSupport
  @public
*/
const Component = CoreView.extend(
  ChildViewsSupport,
  ViewStateSupport,
  ClassNamesSupport,
  TargetActionSupport,
  ActionSupport,
  ViewMixin, {
    isComponent: true,

    init() {
      this._super(...arguments);
      this[IS_DISPATCHING_ATTRS] = false;
      this[DIRTY_TAG] = new DirtyableTag();
      this[ROOT_REF] = new RootReference(this);
      this[BOUNDS] = null;

      // If a `defaultLayout` was specified move it to the `layout` prop.
      // `layout` is no longer a CP, so this just ensures that the `defaultLayout`
      // logic is supported with a deprecation
      if (this.defaultLayout && !this.layout) {
        deprecate(
          `Specifying \`defaultLayout\` to ${this} is deprecated. Please use \`layout\` instead.`,
          false,
          {
            id: 'ember-views.component.defaultLayout',
            until: '3.0.0',
            url: 'https://emberjs.com/deprecations/v2.x/#toc_ember-component-defaultlayout'
          }
        );

        this.layout = this.defaultLayout;
      }

      // If in a tagless component, assert that no event handlers are defined
      assert(
        `You can not define a function that handles DOM events in the \`${this}\` tagless component since it doesn't have any DOM element.`,
        this.tagName !== '' || !this.renderer._destinedForDOM || !(() => {
          let eventDispatcher = getOwner(this).lookup('event_dispatcher:main');
          let events = (eventDispatcher && eventDispatcher._finalEvents) || {};

          for (let key in events) {
            let methodName = events[key];

            if (typeof this[methodName]  === 'function') {
              return true; // indicate that the assertion should be triggered
            }
          }
        }
      )());

      assert(`You cannot use a computed property for the component's \`tagName\` (${this}).`, !(this.tagName && this.tagName.isDescriptor));
    },

    rerender() {
      this[DIRTY_TAG].dirty();
      this._super();
    },

    __defineNonEnumerable(property) {
      this[property.name] = property.descriptor.value;
    },

    [PROPERTY_DID_CHANGE](key) {
      if (this[IS_DISPATCHING_ATTRS]) { return; }

      let args, reference;

      if ((args = this[ARGS]) && (reference = args[key])) {
        if (reference[UPDATE]) {
          reference[UPDATE](get(this, key));
        }
      }
    },

    getAttr(key) {
      // TODO Intimate API should be deprecated
      return this.get(key);
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
      @public
     */
    readDOMAttr(name) {
      let element = getViewElement(this);
      return readDOMAttr(element, name);
    }

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
     @public
     */

    /**
     Enables components to take a list of parameters as arguments.
     For example, a component that takes two parameters with the names
     `name` and `age`:

     ```app/components/my-component.js
     import Component from '@ember/component';

     let MyComponent = Component.extend();

     MyComponent.reopenClass({
       positionalParams: ['name', 'age']
     });

     export default MyComponent;
     ```

     It can then be invoked like this:

     ```hbs
     {{my-component "John" 38}}
     ```

     The parameters can be referred to just like named parameters:

     ```hbs
     Name: {{name}}, Age: {{age}}.
     ```

     Using a string instead of an array allows for an arbitrary number of
     parameters:

     ```app/components/my-component.js
     import Component from '@ember/component';

     let MyComponent = Component.extend();

     MyComponent.reopenClass({
       positionalParams: 'names'
     });

     export default MyComponent;
     ```

     It can then be invoked like this:

     ```hbs
     {{my-component "John" "Michael" "Scott"}}
     ```
     The parameters can then be referred to by enumerating over the list:

     ```hbs
     {{#each names as |name|}}{{name}}{{/each}}
     ```

     @static
     @public
     @property positionalParams
     @since 1.13.0
     */


    /**
     Called when the attributes passed into the component have been updated.
     Called both during the initial render of a container and during a rerender.
     Can be used in place of an observer; code placed here will be executed
     every time any attribute updates.
     @method didReceiveAttrs
     @public
     @since 1.13.0
     */

    /**
     Called when the attributes passed into the component have been updated.
     Called both during the initial render of a container and during a rerender.
     Can be used in place of an observer; code placed here will be executed
     every time any attribute updates.
     @event didReceiveAttrs
     @public
     @since 1.13.0
     */

    /**
     Called after a component has been rendered, both on initial render and
     in subsequent rerenders.
     @method didRender
     @public
     @since 1.13.0
     */

    /**
     Called after a component has been rendered, both on initial render and
     in subsequent rerenders.
     @event didRender
     @public
     @since 1.13.0
     */

    /**
     Called before a component has been rendered, both on initial render and
     in subsequent rerenders.
     @method willRender
     @public
     @since 1.13.0
     */

    /**
     Called before a component has been rendered, both on initial render and
     in subsequent rerenders.
     @event willRender
     @public
     @since 1.13.0
     */

    /**
     Called when the attributes passed into the component have been changed.
     Called only during a rerender, not during an initial render.
     @method didUpdateAttrs
     @public
     @since 1.13.0
     */

    /**
     Called when the attributes passed into the component have been changed.
     Called only during a rerender, not during an initial render.
     @event didUpdateAttrs
     @public
     @since 1.13.0
     */

    /**
     Called when the component is about to update and rerender itself.
     Called only during a rerender, not during an initial render.
     @method willUpdate
     @public
     @since 1.13.0
     */

    /**
     Called when the component is about to update and rerender itself.
     Called only during a rerender, not during an initial render.
     @event willUpdate
     @public
     @since 1.13.0
     */

    /**
     Called when the component has updated and rerendered itself.
     Called only during a rerender, not during an initial render.
     @method didUpdate
     @public
     @since 1.13.0
     */

    /**
     Called when the component has updated and rerendered itself.
     Called only during a rerender, not during an initial render.
     @event didUpdate
     @public
     @since 1.13.0
     */

    /**
      Layout can be used to wrap content in a component.
      @property layout
      @type Function
      @public
    */

    /**
      The name of the layout to lookup if no layout is provided.
      By default `Component` will lookup a template with this name in
      `Ember.TEMPLATES` (a shared global object).
      @property layoutName
      @type String
      @default null
      @private
    */

    /**
      Returns a jQuery object for this component's element. If you pass in a selector
      string, this method will return a jQuery object, using the current element
      as its buffer.
      For example, calling `component.$('li')` will return a jQuery object containing
      all of the `li` elements inside the DOM element of this component.
      @method $
      @param {String} [selector] a jQuery-compatible selector string
      @return {jQuery} the jQuery object for the DOM node
      @public
    */

    /**
      The HTML `id` of the component's element in the DOM. You can provide this
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
      export default Component.extend({
        init() {
          this._super(...arguments);

          var index = this.get('index');
          this.set('elementId', `component-id${index}`);
        }
      });
      ```

      @property elementId
      @type String
      @public
    */

    /**
     If `false`, the view will appear hidden in DOM.

     @property isVisible
     @type Boolean
     @default null
     @public
     */
  }
);

Component[NAME_KEY] = 'Ember.Component';

Component.reopenClass({
  isComponentFactory: true,
  positionalParams: []
});

export default Component;
