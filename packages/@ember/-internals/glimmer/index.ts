/**
  [Glimmer](https://github.com/tildeio/glimmer) is a templating engine used by Ember.js that is compatible with a subset of the [Handlebars](http://handlebarsjs.com/) syntax.

  ### Showing a property

  Templates manage the flow of an application's UI, and display state (through
  the DOM) to a user. For example, given a component with the property "name",
  that component's template can use the name in several ways:

  ```app/components/person-profile.js
  import Component from '@ember/component';

  export default Component.extend({
    name: 'Jill'
  });
  ```

  ```app/components/person-profile.hbs
  {{this.name}}
  <div>{{this.name}}</div>
  <span data-name={{this.name}}></span>
  ```

  Any time the "name" property on the component changes, the DOM will be
  updated.

  Properties can be chained as well:

  ```handlebars
  {{@aUserModel.name}}
  <div>{{@listOfUsers.firstObject.name}}</div>
  ```

  ### Using Ember helpers

  When content is passed in mustaches `{{}}`, Ember will first try to find a helper
  or component with that name. For example, the `if` helper:

  ```app/components/person-profile.hbs
  {{if this.name "I have a name" "I have no name"}}
  <span data-has-name={{if this.name true}}></span>
  ```

  The returned value is placed where the `{{}}` is called. The above style is
  called "inline". A second style of helper usage is called "block". For example:

  ```handlebars
  {{#if this.name}}
    I have a name
  {{else}}
    I have no name
  {{/if}}
  ```

  The block form of helpers allows you to control how the UI is created based
  on the values of properties.
  A third form of helper is called "nested". For example here the concat
  helper will add " Doe" to a displayed name if the person has no last name:

  ```handlebars
  <span data-name={{concat this.firstName (
    if this.lastName (concat " " this.lastName) "Doe"
  )}}></span>
  ```

  Ember's built-in helpers are described under the [Ember.Templates.helpers](/ember/release/classes/Ember.Templates.helpers)
  namespace. Documentation on creating custom helpers can be found under
  [helper](/ember/release/functions/@ember%2Fcomponent%2Fhelper/helper) (or
  under [Helper](/ember/release/classes/Helper) if a helper requires access to
  dependency injection).

  ### Invoking a Component

  Ember components represent state to the UI of an application. Further
  reading on components can be found under [Component](/ember/release/classes/Component).

  @module @ember/component
  @main @ember/component
  @public
 */

/**
 @module ember
 */

/**
 @class Ember.Templates.helpers
 @public
 */

/**
  `{{yield}}` denotes an area of a template that will be rendered inside
  of another template.

  ### Use with `Component`

  When designing components `{{yield}}` is used to denote where, inside the component's
  template, an optional block passed to the component should render:

  ```app/templates/application.hbs
  <LabeledTextfield @value={{@model.name}}>
    First name:
  </LabeledTextfield>
  ```

  ```app/components/labeled-textfield.hbs
  <label>
    {{yield}} <Input @value={{@value}} />
  </label>
  ```

  Result:

  ```html
  <label>
    First name: <input type="text" />
  </label>
  ```

  Additionally you can `yield` properties into the context for use by the consumer:

  ```app/templates/application.hbs
  <LabeledTextfield @value={{@model.validation}} @validator={{this.firstNameValidator}} as |validationError|>
    {{#if validationError}}
      <p class="error">{{validationError}}</p>
    {{/if}}
    First name:
  </LabeledTextfield>
  ```

  ```app/components/labeled-textfield.hbs
  <label>
    {{yield this.validationError}} <Input @value={{@value}} />
  </label>
  ```

  Result:

  ```html
  <label>
    <p class="error">First Name must be at least 3 characters long.</p>
    First name: <input type="text" />
  </label>
  ```
  @method yield
  @for Ember.Templates.helpers
  @param {Hash} options
  @return {String} HTML string
  @public
 */

/**
  `{{(has-block)}}` indicates if the component was invoked with a block.

  This component is invoked with a block:

  ```handlebars
  {{#my-component}}
    Hi Jen!
  {{/my-component}}
  ```

  This component is invoked without a block:

  ```handlebars
  {{my-component}}
  ```

  Using angle bracket invocation, this looks like:

  ```html
  <MyComponent>Hi Jen!</MyComponent> {{! with a block}}
  ```

  ```html
  <MyComponent/> {{! without a block}}
  ```

  This is useful when you want to create a component that can optionally take a block
  and then render a default template when it is not invoked with a block.

  ```app/templates/components/my-component.hbs
  {{#if (has-block)}}
    Welcome {{yield}}, we are happy you're here!
  {{else}}
    Hey you! You're great!
  {{/if}}
  ```

  @method has-block
  @for Ember.Templates.helpers
  @param {String} the name of the block. The name (at the moment) is either "main" or "inverse" (though only curly components support inverse)
  @return {Boolean} `true` if the component was invoked with a block
  @public
 */

/**
  `{{(has-block-params)}}` indicates if the component was invoked with block params.

  This component is invoked with block params:

  ```handlebars
  {{#my-component as |favoriteFlavor|}}
    Hi Jen!
  {{/my-component}}
  ```

  This component is invoked without block params:

  ```handlebars
  {{#my-component}}
    Hi Jenn!
  {{/my-component}}
  ```

  With angle bracket syntax, block params look like this:

    ```handlebars
  <MyComponent as |favoriteFlavor|>
    Hi Jen!
  </MyComponent>
  ```

  And without block params:

  ```handlebars
  <MyComponent>
    Hi Jen!
  </MyComponent>
  ```

  This is useful when you want to create a component that can render itself
  differently when it is not invoked with block params.

  ```app/templates/components/my-component.hbs
  {{#if (has-block-params)}}
    Welcome {{yield this.favoriteFlavor}}, we're happy you're here and hope you
    enjoy your favorite ice cream flavor.
  {{else}}
    Welcome {{yield}}, we're happy you're here, but we're unsure what
    flavor ice cream you would enjoy.
  {{/if}}
  ```

  @method has-block-params
  @for Ember.Templates.helpers
  @param {String} the name of the block. The name (at the moment) is either "main" or "inverse" (though only curly components support inverse)
  @return {Boolean} `true` if the component was invoked with block params
  @public
 */

/**
  Execute the `debugger` statement in the current template's context.

  ```handlebars
  {{debugger}}
  ```

  When using the debugger helper you will have access to a `get` function. This
  function retrieves values available in the context of the template.
  For example, if you're wondering why a value `{{foo}}` isn't rendering as
  expected within a template, you could place a `{{debugger}}` statement and,
  when the `debugger;` breakpoint is hit, you can attempt to retrieve this value:

  ```
  > get('foo')
  ```

  `get` is also aware of keywords. So in this situation

  ```handlebars
  {{#each this.items as |item|}}
    {{debugger}}
  {{/each}}
  ```

  You'll be able to get values from the current item:

  ```
  > get('item.name')
  ```

  You can also access the context of the view to make sure it is the object that
  you expect:

  ```
  > context
  ```

  @method debugger
  @for Ember.Templates.helpers
  @public
 */

export { templateFactory as template, templateCacheCounters } from '@glimmer/opcode-compiler';

export { default as RootTemplate } from './lib/templates/root';
export { default as Input } from './lib/components/input';
export { default as LinkTo } from './lib/components/link-to';
export { default as Textarea } from './lib/components/textarea';
export { default as Component } from './lib/component';
export { default as Helper, helper } from './lib/helper';
export { SafeString, escapeExpression, htmlSafe, isHTMLSafe } from './lib/utils/string';
export { Renderer, _resetRenderers, renderSettled } from './lib/renderer';
export {
  getTemplate,
  setTemplate,
  hasTemplate,
  getTemplates,
  setTemplates,
} from './lib/template_registry';
export { setupEngineRegistry, setupApplicationRegistry } from './lib/setup-registry';
export { DOMChanges, NodeDOMTreeConstruction, DOMTreeConstruction } from './lib/dom';

// needed for test
// TODO just test these through public API
// a lot of these are testing how a problem was solved
// rather than the problem was solved
export { default as OutletView } from './lib/views/outlet';
export { OutletState } from './lib/utils/outlet';
export {
  componentCapabilities,
  modifierCapabilities,
  setComponentManager,
} from './lib/utils/managers';
export { isSerializationFirstNode } from './lib/utils/serialization-first-node-helpers';
