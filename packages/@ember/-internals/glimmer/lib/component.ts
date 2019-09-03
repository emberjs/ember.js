import { get, PROPERTY_DID_CHANGE } from '@ember/-internals/metal';
import { getOwner } from '@ember/-internals/owner';
import { setFrameworkClass, TargetActionSupport } from '@ember/-internals/runtime';
import { symbol } from '@ember/-internals/utils';
import {
  ActionSupport,
  ChildViewsSupport,
  ClassNamesSupport,
  CoreView,
  getViewElement,
  ViewMixin,
  ViewStateSupport,
} from '@ember/-internals/views';
import { assert, deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { createTag, dirty } from '@glimmer/reference';
import { normalizeProperty, SVG_NAMESPACE } from '@glimmer/runtime';

import { RootReference, UPDATE } from './utils/references';

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
  A component is an isolated piece of UI, represented by a template and an
  optional class. When a component has a class, its template's `this` value
  is an instance of the component class.

  ## Template-only Components

  The simplest way to create a component is to create a template file in
  `app/templates/components`. For example, if you name a template
  `app/templates/components/person-profile.hbs`:

  ```app/templates/components/person-profile.hbs
  <h1>{{@person.name}}</h1>
  <img src={{@person.avatar}}>
  <p class='signature'>{{@person.signature}}</p>
  ```

  You will be able to use `<PersonProfile />` to invoke this component elsewhere
  in your application:

  ```app/templates/application.hbs
  <PersonProfile @person={{this.currentUser}} />
  ```

  Note that component names are capitalized here in order to distinguish them
  from regular HTML elements, but they are dasherized in the file system.

  While the angle bracket invocation form is generally preferred, it is also
  possible to invoke the same component with the `{{person-profile}}` syntax:

  ```app/templates/application.hbs
  {{person-profile person=this.currentUser}}
  ```

  Note that with this syntax, you use dashes in the component name and
  arguments are passed without the `@` sign.

  In both cases, Ember will render the content of the component template we
  created above. The end result will be something like this:

  ```html
  <h1>Tomster</h1>
  <img src="https://emberjs.com/tomster.jpg">
  <p class='signature'>Out of office this week</p>
  ```

  ## File System Nesting

  Components can be nested inside sub-folders for logical groupping. For
  example, if we placed our template in
  `app/templates/components/person/short-profile.hbs`, we can invoke it as
  `<Person::ShortProfile />`:

  ```app/templates/application.hbs
  <Person::ShortProfile @person={{this.currentUser}} />
  ```

  Or equivalently, `{{person/short-profile}}`:

  ```app/templates/application.hbs
  {{person/short-profile person=this.currentUser}}
  ```

  ## Yielding Contents

  You can use `yield` inside a template to include the **contents** of any block
  attached to the component. The block will be executed in its original context:

  ```handlebars
  <PersonProfile @person={{this.currentUser}}>
    <p>Admin mode</p>
    {{! Executed in the current context. }}
  </PersonProfile>
  ```

  or

  ```handlebars
  {{#person-profile person=this.currentUser}}
    <p>Admin mode</p>
    {{! Executed in the current context. }}
  {{/person-profile}}
  ```

  ```app/templates/components/person-profile.hbs
  <h1>{{@person.name}}</h1>
  {{yield}}
  ```

  ## Customizing Components With JavaScript

  If you want to customize the component in order to handle events, transform
  arguments or maintain internal state, you implement a subclass of `Component`.

  One example is to add computed properties to your component:

  ```app/components/person-profile.js
  import Component from '@ember/component';

  export default Component.extend({
    displayName: computed('person.title', 'person.firstName', 'person.lastName', function() {
      let { title, firstName, lastName } = this;

      if (title) {
        return `${title} ${lastName}`;
      } else {
        return `${firstName} ${lastName}`;
      }
    })
  });
  ```

  And then use it in the component's template:

  ```app/templates/components/person-profile.hbs
  <h1>{{this.displayName}}</h1>
  {{yield}}
  ```

  ## Customizing a Component's HTML Element in JavaScript

  ### HTML Tag

  The default HTML tag name used for a component's HTML representation is `div`.
  This can be customized by setting the `tagName` property.

  Consider the following component class:

  ```app/components/emphasized-paragraph.js
  import Component from '@ember/component';

  export default Component.extend({
    tagName: 'em'
  });
  ```

  When invoked, this component would produce output that looks something like
  this:

  ```html
  <em id="ember1" class="ember-view"></em>
  ```

  ### HTML `class` Attribute

  The HTML `class` attribute of a component's tag can be set by providing a
  `classNames` property that is set to an array of strings:

  ```app/components/my-widget.js
  import Component from '@ember/component';

  export default Component.extend({
    classNames: ['my-class', 'my-other-class']
  });
  ```

  Invoking this component will produce output that looks like this:

  ```html
  <div id="ember1" class="ember-view my-class my-other-class"></div>
  ```

  `class` attribute values can also be set by providing a `classNameBindings`
  property set to an array of properties names for the component. The return
  value of these properties will be added as part of the value for the
  components's `class` attribute. These properties can be computed properties:

  ```app/components/my-widget.js
  import Component from '@ember/component';
  import { computed } from '@ember/object';

  export default Component.extend({
    classNames: ['my-class', 'my-other-class'],
    classNameBindings: ['propertyA', 'propertyB'],

    propertyA: 'from-a',
    propertyB: computed(function() {
      if (someLogic) { return 'from-b'; }
    })
  });
  ```

  Invoking this component will produce HTML that looks like:

  ```html
  <div id="ember1" class="ember-view my-class my-other-class from-a from-b"></div>
  ```

  Note that `classNames` and `classNameBindings` is in addition to the `class`
  attribute passed with the angle bracket invocation syntax. Therefore, if this
  component was invoked like so:

  ```handlebars
  <MyWidget class="from-invocation" />
  ```

  The resulting HTML will look similar to this:

  ```html
  <div id="ember1" class="from-invocation ember-view my-class my-other-class from-a from-b"></div>
  ```

  If the value of a class name binding returns a boolean the property name
  itself will be used as the class name if the property is true. The class name
  will not be added if the value is `false` or `undefined`.

  ```app/components/my-widget.js
  import Component from '@ember/component';

  export default Component.extend({
    classNameBindings: ['hovered'],

    hovered: true
  });
  ```

  Invoking this component will produce HTML that looks like:

  ```html
  <div id="ember1" class="ember-view hovered"></div>
  ```

  ### Custom Class Names for Boolean Values

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

  Invoking this component will produce HTML that looks like:

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

  Invoking this component will produce HTML that looks like:

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

  Invoking this component will produce HTML that looks like:

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

  Invoking this component will produce HTML that looks like:

  ```html
  <div id="ember1" class="ember-view enabled"></div>
  ```

  When isEnabled is `false`, the resulting HTML representation looks like this:

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

  Invoking this component when the `isEnabled` property is true will produce
  HTML that looks like:

  ```html
  <div id="ember1" class="ember-view"></div>
  ```

  Invoking it when the `isEnabled` property on the component is `false` will
  produce HTML that looks like:

  ```html
  <div id="ember1" class="ember-view disabled"></div>
  ```

  Updates to the value of a class name binding will result in automatic update
  of the  HTML `class` attribute in the component's rendered HTML
  representation. If the value becomes `false` or `undefined` the class name
  will be removed.

  Both `classNames` and `classNameBindings` are concatenated properties. See
  [EmberObject](/ember/release/classes/EmberObject) documentation for more
  information about concatenated properties.

  ### Other HTML Attributes

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

  Invoking this component will produce HTML that looks like:

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

  Invoking this component will produce HTML that looks like:

  ```html
  <a id="ember1" class="ember-view" href="http://google.com"></a>
  ```

  HTML attributes passed with angle bracket invocations will take precedence
  over those specified in `attributeBindings`. Therefore, if this component was
  invoked like so:

  ```handlebars
  <MyAnchor href="http://bing.com" @url="http://google.com" />
  ```

  The resulting HTML will looks like this:

  ```html
  <a id="ember1" class="ember-view" href="http://bing.com"></a>
  ```

  Note that the `href` attribute is ultimately set to `http://bing.com`,
  despite it having attribute binidng to the `url` property, which was
  set to `http://google.com`.

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

  Invoking this component will produce HTML that looks like:

  ```html
  <use xlink:href="#triangle"></use>
  ```

  If the value of a property monitored by `attributeBindings` is a boolean, the
  attribute will be present or absent depending on the value:

  ```app/components/my-text-input.js
  import Component from '@ember/component';

  export default Component.extend({
    tagName: 'input',
    attributeBindings: ['disabled'],

    disabled: false
  });
  ```

  Invoking this component will produce HTML that looks like:

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
  value of the property used in `attributeBindings`:

  ```app/components/my-text-input.js
  import Component from '@ember/component';

  export default Component.extend({
    tagName: 'form',
    attributeBindings: ['novalidate'],
    novalidate: null
  });
  ```

  Updates to the property of an attribute binding will result in automatic
  update of the  HTML attribute in the component's HTML output.

  `attributeBindings` is a concatenated property. See
  [EmberObject](/ember/release/classes/EmberObject) documentation for more
  information about concatenated properties.

  ## Layouts

  The `layout` property can be used to dynamically specify a template associated
  with a component class, instead of relying on Ember to link together a
  component class and a template based on file names.

  In general, applications should not use this feature, but it's commonly used
  in addons for historical reasons.

  The `layout` property should be set to the default export of a template
  module, which is the name of a template file without the `.hbs` extension.

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

  If you invoke the component:

  ```handlebars
  <PersonProfile>
    <h2>Chief Basket Weaver</h2>
    <h3>Fisherman Industries</h3>
  </PersonProfile>
  ```

  or

  ```handlebars
  {{#person-profile}}
    <h2>Chief Basket Weaver</h2>
    <h3>Fisherman Industries</h3>
  {{/person-profile}}
  ```

  It will result in the following HTML output:

  ```html
  <h1>Person's Title</h1>
    <div class="details">
    <h2>Chief Basket Weaver</h2>
    <h3>Fisherman Industries</h3>
  </div>
  ```

  ## Handling Browser Events

  Components can respond to user-initiated events in one of three ways: passing
  actions with angle bracket invocation, adding event handler methods to the
  component's class, or adding actions to the component's template.

  ### Passing Actions With Angle Bracket Invoation

  For one-off events specific to particular instance of a component, it is possible
  to pass actions to the component's element using angle bracket invoation syntax.

  ```handlebars
  <MyWidget {{action 'firstWidgetClicked'}} />

  <MyWidget {{action 'secondWidgetClicked'}} />
  ```

  In this case, when the first component is clicked on, Ember will invoke the
  `firstWidgetClicked` action. When the second component is clicked on, Ember
  will invoke the `secondWidgetClicked` action instead.

  Besides `{{action}}`, it is also possible to pass any arbitrary element modifiers
  using the angle bracket invocation syntax.

  ### Event Handler Methods

  Components can also respond to user-initiated events by implementing a method
  that matches the event name. This approach is appropiate when the same event
  should be handled by all instances of the same component.

  An event object will be passed as the argument to the event handler method.

  ```app/components/my-widget.js
  import Component from '@ember/component';

  export default Component.extend({
    click(event) {
      // `event.target` is either the component's element or one of its children
      let tag = event.target.tagName.toLowerCase();
      console.log('clicked on a `<${tag}>` HTML element!');
    }
  });
  ```

  In this example, whenever the user clicked anywhere inside the component, it
  will log a message to the console.

  It is possible to handle event types other than `click` by implementing the
  following event handler methods. In addition, custom events can be registered
  by using `Application.customEvents`.

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
  * `focusIn`
  * `focusOut`

  Form events:

  * `submit`
  * `change`
  * `focusIn`
  * `focusOut`
  * `input`

  Drag and drop events:

  * `dragStart`
  * `drag`
  * `dragEnter`
  * `dragLeave`
  * `dragOver`
  * `dragEnd`
  * `drop`

  ### `{{action}}` Helper

  Instead of handling all events of a particular type anywhere inside the
  component's element, you may instead want to limit it to a particular
  element in the component's template. In this case, it would be more
  convenient to implement an action instead.

  For example, you could implement the action `hello` for the `person-profile`
  component:

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
  <h1>{{@person.name}}</h1>

  <button {{action 'hello' @person.name}}>
    Say Hello to {{@person.name}}
  </button>
  ```

  When the user clicks the button, Ember will invoke the `hello` action,
  passing in the current value of `@person.name` as an argument.

  See [Ember.Templates.helpers.action](/ember/release/classes/Ember.Templates.helpers/methods/action?anchor=action).

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
  ViewMixin,
  {
    isComponent: true,

    init() {
      this._super(...arguments);
      this[IS_DISPATCHING_ATTRS] = false;
      this[DIRTY_TAG] = createTag();
      this[ROOT_REF] = new RootReference(this);
      this[BOUNDS] = null;

      if (DEBUG && this.renderer._destinedForDOM && this.tagName === '') {
        let eventNames = [];
        let eventDispatcher = getOwner(this).lookup<any | undefined>('event_dispatcher:main');
        let events = (eventDispatcher && eventDispatcher._finalEvents) || {};

        // tslint:disable-next-line:forin
        for (let key in events) {
          let methodName = events[key];

          if (typeof this[methodName] === 'function') {
            eventNames.push(methodName);
          }
        }
        // If in a tagless component, assert that no event handlers are defined
        assert(
          // tslint:disable-next-line:max-line-length
          `You can not define \`${eventNames}\` function(s) to handle DOM event in the \`${this}\` tagless component since it doesn't have any DOM element.`,
          !eventNames.length
        );
      }

      deprecate(
        `Using \`mouseEnter\` event handler methods in components has been deprecated.`,
        this.mouseEnter === undefined,
        {
          id: 'ember-views.event-dispatcher.mouseenter-leave-move',
          until: '4.0.0',
          url: 'https://emberjs.com/deprecations/v3.x#toc_component-mouseenter-leave-move',
        }
      );
      deprecate(
        `Using \`mouseLeave\` event handler methods in components has been deprecated.`,
        this.mouseLeave === undefined,
        {
          id: 'ember-views.event-dispatcher.mouseenter-leave-move',
          until: '4.0.0',
          url: 'https://emberjs.com/deprecations/v3.x#toc_component-mouseenter-leave-move',
        }
      );
      deprecate(
        `Using \`mouseMove\` event handler methods in components has been deprecated.`,
        this.mouseMove === undefined,
        {
          id: 'ember-views.event-dispatcher.mouseenter-leave-move',
          until: '4.0.0',
          url: 'https://emberjs.com/deprecations/v3.x#toc_component-mouseenter-leave-move',
        }
      );
    },

    rerender() {
      dirty(this[DIRTY_TAG]);
      this._super();
    },

    [PROPERTY_DID_CHANGE](key: string) {
      if (this[IS_DISPATCHING_ATTRS]) {
        return;
      }

      let args = this[ARGS];
      let reference = args !== undefined ? args[key] : undefined;

      if (reference !== undefined && reference[UPDATE] !== undefined) {
        reference[UPDATE](get(this, key));
      }
    },

    getAttr(key: string) {
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
    readDOMAttr(name: string) {
      // TODO revisit this
      let _element = getViewElement(this);

      assert(
        `Cannot call \`readDOMAttr\` on ${this} which does not have an element`,
        _element !== null
      );

      let element = _element!;
      let isSVG = element.namespaceURI === SVG_NAMESPACE;
      let { type, normalized } = normalizeProperty(element, name);

      if (isSVG || type === 'attr') {
        return element.getAttribute(normalized);
      }

      return element[normalized];
    },

    /**
     The WAI-ARIA role of the control represented by this view. For example, a
     button may have a role of type 'button', or a pane may have a role of
     type 'alertdialog'. This property is used by assistive software to help
     visually challenged users navigate rich web applications.

     The full list of valid WAI-ARIA roles is available at:
     [https://www.w3.org/TR/wai-aria/#roles_categorization](https://www.w3.org/TR/wai-aria/#roles_categorization)

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
    didReceiveAttrs() {},

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
    didRender() {},

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
    willRender() {},

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
    didUpdateAttrs() {},

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
    willUpdate() {},

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
    didUpdate() {},

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

      Please note that jQuery integration is off by default and this feature will
      not work properly. To enable this feature, you can read the instructions in
      the [jquery-integration optional feature guide](https://guides.emberjs.com/release/configuring-ember/optional-features/#toc_jquery-integration).
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

      ```handlebars
      <MyComponent @elementId="a-really-cool-id" />
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

Component.toString = () => '@ember/component';

Component.reopenClass({
  isComponentFactory: true,
  positionalParams: [],
});

setFrameworkClass(Component);

export default Component;
