import type { View } from '@ember/-internals/glimmer/lib/renderer';
import {
  descriptorForProperty,
  get,
  nativeDescDecorator,
  PROPERTY_DID_CHANGE,
} from '@ember/-internals/metal';
import type { PropertyDidChange } from '@ember/-internals/metal/lib/property_events';
import { getOwner } from '@ember/-internals/owner';
import type { ViewStates } from '@ember/-internals/views';
import {
  addChildView,
  CoreView,
  EventDispatcher,
  getChildViews,
  getViewElement,
} from '@ember/-internals/views';
import { guidFor } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import type { Environment, Template, TemplateFactory } from '@glimmer/interfaces';
import { setInternalComponentManager } from '@glimmer/manager';
import { isUpdatableRef, updateRef } from '@glimmer/reference';
import { normalizeProperty } from '@glimmer/runtime';
import type { DirtyableTag } from '@glimmer/validator';
import { createTag, dirtyTag } from '@glimmer/validator';
import type { SimpleElement } from '@simple-dom/interface';
import {
  ARGS,
  BOUNDS,
  CURLY_COMPONENT_MANAGER,
  DIRTY_TAG,
  IS_DISPATCHING_ATTRS,
} from './component-managers/curly';
import { hasDOM } from '@ember/-internals/browser-environment';

// Keep track of which component classes have already been processed for lazy event setup.
let lazyEventsProcessed = new WeakMap<EventDispatcher, WeakSet<object>>();

const EMPTY_ARRAY = Object.freeze([]);

/**
  Determines if the element matches the specified selector.

  @private
  @method matches
  @param {DOMElement} el
  @param {String} selector
*/
const elMatches: typeof Element.prototype.matches | undefined =
  typeof Element !== 'undefined' ? Element.prototype.matches : undefined;

function matches(el: Element, selector: string): boolean {
  assert('cannot call `matches` in fastboot mode', elMatches !== undefined);
  return elMatches.call(el, selector);
}

/**
@module @ember/component
*/

// A zero-runtime-overhead private symbol to use in branding the component to
// preserve its type parameter.
declare const SIGNATURE: unique symbol;

/**
  A component is a reusable UI element that consists of a `.hbs` template and an
  optional JavaScript class that defines its behavior. For example, someone
  might make a `button` in the template and handle the click behavior in the
  JavaScript file that shares the same name as the template.

  Components are broken down into two categories:

  - Components _without_ JavaScript, that are based only on a template. These
    are called Template-only or TO components.
  - Components _with_ JavaScript, which consist of a template and a backing
    class.

  Ember ships with two types of JavaScript classes for components:

  1. Glimmer components, imported from `@glimmer/component`, which are the
     default component's for Ember Octane (3.15) and more recent editions.
  2. Classic components, imported from `@ember/component`, which were the
     default for older editions of Ember (pre 3.15).

  Below is the documentation for Classic components. If you are looking for the
  API documentation for Template-only or Glimmer components, it is [available
  here](/ember/release/modules/@glimmer%2Fcomponent).

  ## Defining a Classic Component

  If you want to customize the component in order to handle events, transform
  arguments or maintain internal state, you implement a subclass of `Component`.

  One example is to add computed properties to your component:

  ```app/components/person-profile.js
  import Component from '@ember/component';

  export default class extends Component {
    @computed('person.title', 'person.firstName', 'person.lastName')
    get displayName() {
      let { title, firstName, lastName } = this.person;

      if (title) {
        return `${title} ${lastName}`;
      } else {
        return `${firstName} ${lastName}`;
      }
    }
  }
  ```

  And then use it in the component's template:

  ```app/templates/components/person-profile.hbs
  <h1>{{this.displayName}}</h1>
  {{yield}}
  ```

  ## Customizing a Classic Component's HTML Element in JavaScript

  ### HTML Tag

  The default HTML tag name used for a component's HTML representation is `div`.
  This can be customized by setting the `tagName` property.

  Consider the following component class:

  ```app/components/emphasized-paragraph.js
  import Component from '@ember/component';

  export default class extends Component {
    tagName = 'em';
  }
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

  export default class extends Component {
    classNames = ['my-class', 'my-other-class'];
  }
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

  export default class extends Component {
    classNames = ['my-class', 'my-other-class'];
    classNameBindings = ['propertyA', 'propertyB'];

    propertyA = 'from-a';

    get propertyB {
      if (someLogic) { return 'from-b'; }
    }
  }
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

  export default class extends Component {
    classNameBindings = ['hovered'];

    hovered = true;
  }
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

  export default class extends Component {
    classNameBindings = ['awesome:so-very-cool'];

    awesome = true;
  }
  ```

  Invoking this component will produce HTML that looks like:

  ```html
  <div id="ember1" class="ember-view so-very-cool"></div>
  ```

  Boolean value class name bindings whose property names are in a
  camelCase-style format will be converted to a dasherized format:

  ```app/components/my-widget.js
  import Component from '@ember/component';

  export default class extends Component {
    classNameBindings = ['isUrgent'];

    isUrgent = true;
  }
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

  export default class extends Component {
    classNameBindings = ['messages.empty'];

    messages = EmberObject.create({
      empty: true
    });
  }
  ```

  Invoking this component will produce HTML that looks like:

  ```html
  <div id="ember1" class="ember-view empty"></div>
  ```

  If you want to add a class name for a property which evaluates to true and and
  a different class name if it evaluates to false, you can pass a binding like
  this:

  ```app/components/my-widget.js
  import Component from '@ember/component';

  export default class extends Component {
    classNameBindings = ['isEnabled:enabled:disabled'];

    isEnabled = true;
  }
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
  export default class extends Component {
    classNameBindings = ['isEnabled::disabled'];

    isEnabled = true;
  }
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
  `attributeBindings` property set to an array of property names on the
  component. The return value of these properties will be used as the value of
  the component's HTML associated attribute:

  ```app/components/my-anchor.js
  import Component from '@ember/component';

  export default class extends Component {
    tagName = 'a';
    attributeBindings = ['href'];

    href = 'http://google.com';
  };
  ```

  Invoking this component will produce HTML that looks like:

  ```html
  <a id="ember1" class="ember-view" href="http://google.com"></a>
  ```

  One property can be mapped on to another by placing a ":" between the source
  property and the destination property:

  ```app/components/my-anchor.js
  import Component from '@ember/component';

  export default class extends Component {
    tagName = 'a';
    attributeBindings = ['url:href'];

    url = 'http://google.com';
  };
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

  Note that the `href` attribute is ultimately set to `http://bing.com`, despite
  it having attribute binidng to the `url` property, which was set to
  `http://google.com`.

  Namespaced attributes (e.g. `xlink:href`) are supported, but have to be
  mapped, since `:` is not a valid character for properties in Javascript:

  ```app/components/my-use.js
  import Component from '@ember/component';

  export default class extends Component {
    tagName = 'use';
    attributeBindings = ['xlinkHref:xlink:href'];

    xlinkHref = '#triangle';
  };
  ```

  Invoking this component will produce HTML that looks like:

  ```html
  <use xlink:href="#triangle"></use>
  ```

  If the value of a property monitored by `attributeBindings` is a boolean, the
  attribute will be present or absent depending on the value:

  ```app/components/my-text-input.js
  import Component from '@ember/component';

  export default class extends Component {
    tagName = 'input';
    attributeBindings = ['disabled'];

    disabled = false;
  };
  ```

  Invoking this component will produce HTML that looks like:

  ```html
  <input id="ember1" class="ember-view" />
  ```

  `attributeBindings` can refer to computed properties:

  ```app/components/my-text-input.js
  import Component from '@ember/component';
  import { computed } from '@ember/object';

  export default class extends Component {
    tagName = 'input';
    attributeBindings = ['disabled'];

    get disabled() {
      if (someLogic) {
        return true;
      } else {
        return false;
      }
    }
  };
  ```

  To prevent setting an attribute altogether, use `null` or `undefined` as the
  value of the property used in `attributeBindings`:

  ```app/components/my-text-input.js
  import Component from '@ember/component';

  export default class extends Component {
    tagName = 'form';
    attributeBindings = ['novalidate'];
    novalidate = null;
  };
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

    export default class extends Component {
      layout = layout;
    }
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

  There are two ways to handle user-initiated events:

  ### Using the `on` modifier to capture browser events

  In a component's template, you can attach an event handler to any element with the `on` modifier:

  ```handlebars
  <button {{on 'click' this.doSomething}} />
  ```

  This will call the function on your component:

  ```js
  import Component from '@ember/component';

  export default class ExampleComponent extends Component {
    doSomething = (event) => {
      // `event` is the native click Event
      console.log('clicked on the button');
    };
  }
  ```

  See the [Guide on Component event
  handlers](https://guides.emberjs.com/release/components/component-state-and-actions/#toc_html-modifiers-and-actions)
  and the [API docs for `on`](../Ember.Templates.helpers/methods/on?anchor=on)
  for more details.

  ### Event Handler Methods

  Components can also respond to user-initiated events by implementing a method
  that matches the event name. This approach is appropriate when the same event
  should be handled by all instances of the same component.

  An event object will be passed as the argument to the event handler method.

  ```app/components/my-widget.js
  import Component from '@ember/component';

  export default class extends Component {
    click(event) {
      // `event.target` is either the component's element or one of its children
      let tag = event.target.tagName.toLowerCase();
      console.log('clicked on a `<${tag}>` HTML element!');
    }
  }
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

  @class Component
  @extends Ember.CoreView
  @public
*/
class Component<S = unknown>
  extends CoreView.extend({
    concatenatedProperties: ['attributeBindings', 'classNames', 'classNameBindings'],
    classNames: EMPTY_ARRAY,
    classNameBindings: EMPTY_ARRAY,
  })
  implements PropertyDidChange
{
  isComponent = true;

  // SAFETY: this has no runtime existence whatsoever; it is a "phantom type"
  // here to preserve the type param.
  declare private [SIGNATURE]: S;

  // SAFTEY: This is set in `init`.
  declare _superRerender: this['rerender'];

  declare [IS_DISPATCHING_ATTRS]: boolean;
  declare [DIRTY_TAG]: DirtyableTag;

  /**
    Standard CSS class names to apply to the view's outer element. This
    property automatically inherits any class names defined by the view's
    superclasses as well.

    @property classNames
    @type Array
    @default ['ember-view']
    @public
  */
  declare classNames: string[];

  /**
    A list of properties of the view to apply as class names. If the property
    is a string value, the value of that string will be applied as a class
    name.

    ```javascript
    // Applies the 'high' class to the view element
    import Component from '@ember/component';
    Component.extend({
      classNameBindings: ['priority'],
      priority: 'high'
    });
    ```

    If the value of the property is a Boolean, the name of that property is
    added as a dasherized class name.

    ```javascript
    // Applies the 'is-urgent' class to the view element
    import Component from '@ember/component';
    Component.extend({
      classNameBindings: ['isUrgent'],
      isUrgent: true
    });
    ```

    If you would prefer to use a custom value instead of the dasherized
    property name, you can pass a binding like this:

    ```javascript
    // Applies the 'urgent' class to the view element
    import Component from '@ember/component';
    Component.extend({
      classNameBindings: ['isUrgent:urgent'],
      isUrgent: true
    });
    ```

    If you would like to specify a class that should only be added when the
    property is false, you can declare a binding like this:

    ```javascript
    // Applies the 'disabled' class to the view element
    import Component from '@ember/component';
    Component.extend({
      classNameBindings: ['isEnabled::disabled'],
      isEnabled: false
    });
    ```

    This list of properties is inherited from the component's superclasses as well.

    @property classNameBindings
    @type Array
    @default []
    @public
  */
  declare classNameBindings: string[];

  init(properties?: object | undefined) {
    super.init(properties);

    // Handle methods from ViewMixin.
    // The native class inheritance will not work for mixins. To work around this,
    // we copy the existing rerender method provided by the mixin and swap in the
    // new rerender method from our class.
    this._superRerender = this.rerender;
    this.rerender = this._rerender;

    this[IS_DISPATCHING_ATTRS] = false;
    this[DIRTY_TAG] = createTag();
    this[BOUNDS] = null;

    const eventDispatcher = this._dispatcher;
    if (eventDispatcher) {
      let lazyEventsProcessedForComponentClass = lazyEventsProcessed.get(eventDispatcher);
      if (!lazyEventsProcessedForComponentClass) {
        lazyEventsProcessedForComponentClass = new WeakSet<object>();
        lazyEventsProcessed.set(eventDispatcher, lazyEventsProcessedForComponentClass);
      }

      let proto = Object.getPrototypeOf(this);
      if (!lazyEventsProcessedForComponentClass.has(proto)) {
        let lazyEvents = eventDispatcher.lazyEvents;

        lazyEvents.forEach((mappedEventName, event) => {
          if (mappedEventName !== null && typeof (this as any)[mappedEventName] === 'function') {
            eventDispatcher.setupHandlerForBrowserEvent(event);
          }
        });

        lazyEventsProcessedForComponentClass.add(proto);
      }
    }

    if (DEBUG && eventDispatcher && this.renderer._isInteractive && this.tagName === '') {
      let eventNames = [];
      let events = eventDispatcher.finalEventNameMapping;

      for (let key in events) {
        let methodName = events[key];

        if (methodName && typeof (this as any)[methodName] === 'function') {
          eventNames.push(methodName);
        }
      }
      // If in a tagless component, assert that no event handlers are defined
      assert(
        `You can not define \`${eventNames}\` function(s) to handle DOM event in the \`${this}\` tagless component since it doesn't have any DOM element.`,
        !eventNames.length
      );
    }

    assert(
      `Only arrays are allowed for 'classNameBindings'`,
      descriptorForProperty(this, 'classNameBindings') === undefined &&
        Array.isArray(this.classNameBindings)
    );
    assert(
      `Only arrays of static class strings are allowed for 'classNames'. For dynamic classes, use 'classNameBindings'.`,
      descriptorForProperty(this, 'classNames') === undefined && Array.isArray(this.classNames)
    );

    // ViewMixin

    // Setup a view, but do not finish waking it up.

    // * configure `childViews`
    // * register the view with the global views hash, which is used for event
    //   dispatch

    assert(
      `You cannot use a computed property for the component's \`elementId\` (${this}).`,
      descriptorForProperty(this, 'elementId') === undefined
    );

    assert(
      `You cannot use a computed property for the component's \`tagName\` (${this}).`,
      descriptorForProperty(this, 'tagName') === undefined
    );

    if (!this.elementId && this.tagName !== '') {
      this.elementId = guidFor(this);
    }
  }

  __dispatcher?: EventDispatcher | null;

  get _dispatcher(): EventDispatcher | null {
    if (this.__dispatcher === undefined) {
      let owner = getOwner(this);
      assert('Component is unexpectedly missing an owner', owner);

      if ((owner.lookup('-environment:main') as Environment)!.isInteractive) {
        let dispatcher = owner.lookup('event_dispatcher:main');
        assert(
          'Expected dispatcher to be an EventDispatcher',
          dispatcher instanceof EventDispatcher
        );
        this.__dispatcher = dispatcher;
      } else {
        // In FastBoot we have no EventDispatcher. Set to null to not try again to look it up.
        this.__dispatcher = null;
      }
    }

    return this.__dispatcher;
  }

  // Changed to `rerender` on init
  _rerender() {
    dirtyTag(this[DIRTY_TAG]);
    this._superRerender();
  }

  [PROPERTY_DID_CHANGE](key: string, value?: unknown) {
    if (this[IS_DISPATCHING_ATTRS]) {
      return;
    }

    let args = (this as any)[ARGS];
    let reference = args !== undefined ? args[key] : undefined;

    if (reference !== undefined && isUpdatableRef(reference)) {
      updateRef(reference, arguments.length === 2 ? value : get(this, key));
    }
  }

  getAttr(key: string) {
    // TODO Intimate API should be deprecated
    return this.get(key);
  }

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

    let element = _element;
    let isSVG = element.namespaceURI === 'http://www.w3.org/2000/svg';
    let { type, normalized } = normalizeProperty(element as unknown as SimpleElement, name);

    if (isSVG || type === 'attr') {
      return element.getAttribute(normalized);
    }

    return (element as any)[normalized];
  }

  // --- Declarations which support mixins ---
  // We use `declare` on these properties, even though they are optional, so
  // that they do not get created on the class *at all* when emitting the
  // transpiled code. Otherwise, since declared class properties are equivalent
  // to calling `defineProperty` in the class constructor, they would "stomp"
  // the properties supplied by mixins.

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
  declare attributeBindings?: string[];

  /**
   Enables components to take a list of parameters as arguments.
    For example, a component that takes two parameters with the names
    `name` and `age`:

    ```app/components/my-component.js
    import Component from '@ember/component';

    export default class MyComponent extends Component {
      static positionalParams = ['name', 'age'];
    }
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

    export default class MyComponent extends Component {
      static positionalParams = 'names';
    }
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
    */ /**
   Enables components to take a list of parameters as arguments.
    For example, a component that takes two parameters with the names
    `name` and `age`:

    ```app/components/my-component.js
    import Component from '@ember/component';

    export default class MyComponent extends Component {
      static positionalParams = ['name', 'age'];
    }
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

    export default class MyComponent extends Component {
      static positionalParams = 'names';
    }
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
  declare static positionalParams: string | string[];

  /**
    Layout can be used to wrap content in a component.
    @property layout
    @type Function
    @public
  */
  declare layout?: TemplateFactory | Template;

  /**
    The name of the layout to lookup if no layout is provided.
    By default `Component` will lookup a template with this name in
    `Ember.TEMPLATES` (a shared global object).
    @property layoutName
    @type String
    @default undefined
    @private
  */
  declare layoutName?: string;

  /**
   The WAI-ARIA role of the control represented by this view. For example, a
    button may have a role of type 'button', or a pane may have a role of
    type 'alertdialog'. This property is used by assistive software to help
    visually challenged users navigate rich web applications.

    The full list of valid WAI-ARIA roles is available at:
    [https://www.w3.org/TR/wai-aria/#roles_categorization](https://www.w3.org/TR/wai-aria/#roles_categorization)

    @property ariaRole
    @type String
    @default undefined
    @public
    */
  declare ariaRole?: string;

  /**
    Array of child views. You should never edit this array directly.

    @property childViews
    @type Array
    @default []
    @private
  */
  // @ts-expect-error TODO: Fix these types
  @nativeDescDecorator({
    configurable: false,
    enumerable: false,
  })
  get childViews() {
    return getChildViews(this);
  }

  appendChild(view: View) {
    addChildView(this, view);
  }

  _transitionTo(this: Component, state: keyof typeof ViewStates) {
    let priorState = this._currentState;
    let currentState = (this._currentState = this._states[state]);
    this._state = state;

    if (priorState && priorState.exit) {
      priorState.exit(this);
    }
    if (currentState.enter) {
      currentState.enter(this);
    }
  }

  // Begin ViewMixin

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
  nearestOfType(klass: any) {
    let view = this.parentView;

    while (view) {
      if (klass.detect(view.constructor)) {
        return view;
      }
      view = view.parentView;
    }

    return;
  }

  /**
   Return the nearest ancestor that has a given property.

   @method nearestWithProperty
   @param {String} property A property name
   @return Ember.View
   @deprecated use `yield` and contextual components for composition instead.
   @private
   */
  nearestWithProperty(property: string) {
    let view = this.parentView;

    while (view) {
      if (property in view) {
        return view;
      }
      view = view.parentView;
    }

    return;
  }

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
  rerender(): void {
    return this._currentState.rerender(this);
  }

  // ..........................................................
  // ELEMENT SUPPORT
  //

  /**
   Returns the current DOM element for the view.

    @property element
    @type DOMElement
    @public
  */
  // @ts-expect-error The types are not correct here
  @nativeDescDecorator({ configurable: false, enumerable: false })
  get element() {
    return this.renderer.getElement(this);
  }

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
   @param {String|DOMElement} A selector, element, HTML string
   @return {Ember.View} receiver
   @private
   */
  appendTo(selector: string | Element | SimpleElement) {
    let target;

    if (hasDOM) {
      assert(
        `Expected a selector or instance of Element`,
        typeof selector === 'string' || selector instanceof Element
      );

      target = typeof selector === 'string' ? document.querySelector(selector) : selector;

      assert(`You tried to append to (${selector}) but that isn't in the DOM`, target);
      assert('You cannot append to an existing Ember.View.', !matches(target, '.ember-view'));
      assert(
        'You cannot append to an existing Ember.View.',
        (() => {
          let node = target.parentNode;
          while (node instanceof Element) {
            if (matches(node, '.ember-view')) {
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
        `You tried to append to a selector string (${selector}) in an environment without a DOM`,
        typeof target !== 'string'
      );
      assert(
        `You tried to append to a non-Element (${selector}) in an environment without a DOM`,
        typeof target.appendChild === 'function'
      );
    }

    // SAFETY: SimpleElement is supposed to be a subset of Element so this _should_ be safe.
    // However, the types are more specific in some places which necessitates the `as`.
    this.renderer.appendTo(this, target as unknown as SimpleElement);

    return this;
  }

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
  }

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
  declare elementId: string | null;

  /**
   Called when a view is going to insert an element into the DOM.

   @event willInsertElement
   @public
   */
  willInsertElement() {
    return this;
  }

  /**
   Called when the element of the view has been inserted into the DOM.
   Override this function to do any set up that requires an element
   in the document body.

   When a view has children, didInsertElement will be called on the
   child view(s) first and on itself afterwards.

   @event didInsertElement
   @public
   */
  didInsertElement() {
    return this;
  }

  /**
   Called when the view is about to rerender, but before anything has
   been torn down. This is a good opportunity to tear down any manual
   observers you have installed based on the DOM state

   @event willClearRender
   @public
   */
  willClearRender() {
    return this;
  }

  /**
   You must call `destroy` on a view to destroy the view (and all of its
   child views). This will remove the view from any parent node, then make
   sure that the DOM element managed by the view can be released by the
   memory manager.

   @method destroy
   @private
   */
  destroy() {
    super.destroy();
    this._currentState.destroy(this);
    return this;
  }

  /**
   Called when the element of the view is going to be destroyed. Override
   this function to do any teardown that requires an element, like removing
   event listeners.

   Please note: any property changes made during this event will have no
   effect on object observers.

   @event willDestroyElement
   @public
   */
  willDestroyElement() {
    return this;
  }

  /**
   Called after the element of the view is destroyed.

   @event willDestroyElement
   @public
   */
  didDestroyElement() {
    return this;
  }

  /**
   Called when the parentView property has changed.

   @event parentViewDidChange
   @private
   */
  parentViewDidChange() {
    return this;
  }

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
   and their `element` property has a `null` value.

   @property tagName
   @type String
   @default null
   @public
   */

  // We leave this null by default so we can tell the difference between
  // the default case and a user-specified tag.
  declare tagName: string | null;

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
  handleEvent(eventName: string, evt: Event) {
    return this._currentState.handleEvent(this, eventName, evt);
  }

  // End ViewMixin

  // Begin lifecycle hooks

  /**
   Called when the attributes passed into the component have been updated.
   Called both during the initial render of a container and during a rerender.
   Can be used in place of an observer; code placed here will be executed
   every time any attribute updates.
   @method didReceiveAttrs
   @public
   @since 1.13.0
  */
  didReceiveAttrs(): void {}

  /**
   Called after a component has been rendered, both on initial render and
    in subsequent rerenders.
    @method didRender
    @public
    @since 1.13.0
    */
  didRender(): void {}

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
  willRender(): void {}

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
  didUpdateAttrs(): void {}

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
  willUpdate(): void {}

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
  didUpdate(): void {}

  // End lifecycle hooks

  static isComponentFactory = true;

  static toString() {
    return '@ember/component';
  }
}

// We continue to use reopenClass here so that positionalParams can be overridden with reopenClass in subclasses.
Component.reopenClass({
  positionalParams: [],
});

setInternalComponentManager(CURLY_COMPONENT_MANAGER, Component);

export default Component;
