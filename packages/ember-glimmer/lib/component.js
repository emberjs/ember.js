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
  get,
  PROPERTY_DID_CHANGE,
  assert,
  deprecate
} from 'ember-metal';
import { UPDATE, RootReference } from './utils/references';
import { DirtyableTag } from 'glimmer-reference';
import { readDOMAttr } from 'glimmer-runtime';

export const DIRTY_TAG = symbol('DIRTY_TAG');
export const ARGS = symbol('ARGS');
export const ROOT_REF = symbol('ROOT_REF');
export const IS_DISPATCHING_ATTRS = symbol('IS_DISPATCHING_ATTRS');
export const HAS_BLOCK = symbol('HAS_BLOCK');
export const BOUNDS = symbol('BOUNDS');

/**
@module ember
@submodule ember-glimmer
*/

/**
  An `Ember.Component` is a view that is completely
  isolated. Properties accessed in its templates go
  to the view object and actions are targeted at
  the view object. There is no access to the
  surrounding context or outer controller; all
  contextual information must be passed in.

  The easiest way to create an `Ember.Component` is via
  a template. If you name a template
  `components/my-foo`, you will be able to use
  `{{my-foo}}` in other templates, which will make
  an instance of the isolated component.

  ```handlebars
  {{app-profile person=currentUser}}
  ```

  ```handlebars
  <!-- app-profile template -->
  <h1>{{person.title}}</h1>
  <img src={{person.avatar}}>
  <p class='signature'>{{person.signature}}</p>
  ```

  You can use `yield` inside a template to
  include the **contents** of any block attached to
  the component. The block will be executed in the
  context of the surrounding context or outer controller:

  ```handlebars
  {{#app-profile person=currentUser}}
    <p>Admin mode</p>
    {{! Executed in the controller's context. }}
  {{/app-profile}}
  ```

  ```handlebars
  <!-- app-profile template -->
  <h1>{{person.title}}</h1>
  {{! Executed in the component's context. }}
  {{yield}} {{! block contents }}
  ```

  If you want to customize the component, in order to
  handle events or actions, you implement a subclass
  of `Ember.Component` named after the name of the
  component. Note that `Component` needs to be appended to the name of
  your subclass like `AppProfileComponent`.

  For example, you could implement the action
  `hello` for the `app-profile` component:

  ```javascript
  App.AppProfileComponent = Ember.Component.extend({
    actions: {
      hello: function(name) {
        console.log("Hello", name);
      }
    }
  });
  ```

  And then use it in the component's template:

  ```handlebars
  <!-- app-profile template -->
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

  @class Component
  @namespace Ember
  @extends Ember.CoreView
  @uses Ember.TargetActionSupport
  @uses Ember.ClassNamesSupport
  @uses Ember.ActionSupport
  @uses Ember.ViewMixin
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
            url: 'http://emberjs.com/deprecations/v2.x/#toc_ember-component-defaultlayout'
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

     ```javascript
     let MyComponent = Ember.Component.extend;
     MyComponent.reopenClass({
     positionalParams: ['name', 'age']
     });
     ```

     It can then be invoked like this:

     ```hbs
     {{my-component "John" 38}}
     ```

     The parameters can be referred to just like named parameters:

     ```hbs
     Name: {{attrs.name}}, Age: {{attrs.age}}.
     ```

     Using a string instead of an array allows for an arbitrary number of
     parameters:

     ```javascript
     let MyComponent = Ember.Component.extend;
     MyComponent.reopenClass({
     positionalParams: 'names'
     });
     ```

     It can then be invoked like this:

     ```hbs
     {{my-component "John" "Michael" "Scott"}}
     ```
     The parameters can then be referred to by enumerating over the list:

     ```hbs
     {{#each attrs.names as |name|}}{{name}}{{/each}}
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
