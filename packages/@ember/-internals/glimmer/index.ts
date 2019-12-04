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

  ```app/templates/components/person-profile.hbs
  {{name}}
  <div>{{name}}</div>
  <span data-name={{name}}></span>
  ```

  Any time the "name" property on the component changes, the DOM will be
  updated.

  Properties can be chained as well:

  ```handlebars
  {{aUserModel.name}}
  <div>{{listOfUsers.firstObject.name}}</div>
  ```

  ### Using Ember helpers

  When content is passed in mustaches `{{}}`, Ember will first try to find a helper
  or component with that name. For example, the `if` helper:

  ```handlebars
  {{if name "I have a name" "I have no name"}}
  <span data-has-name={{if name true}}></span>
  ```

  The returned value is placed where the `{{}}` is called. The above style is
  called "inline". A second style of helper usage is called "block". For example:

  ```handlebars
  {{#if name}}
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
  <span data-name={{concat firstName (
  if lastName (concat " " lastName) "Doe"
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
  Use the `{{with}}` helper when you want to alias a property to a new name. This is helpful
  for semantic clarity as it allows you to retain default scope or to reference a property from another
  `{{with}}` block.

  If the aliased property is "falsey", for example: `false`, `undefined` `null`, `""`, `0`, `NaN` or
  an empty array, the block will not be rendered.

  ```app/templates/application.hbs
  {{! Will only render if user.posts contains items}}
  {{#with @model.posts as |blogPosts|}}
    <div class="notice">
      There are {{blogPosts.length}} blog posts written by {{@model.name}}.
    </div>
    {{#each blogPosts as |post|}}
      <li>{{post.title}}</li>
    {{/each}}
  {{/with}}
  ```

  @method with
  @for Ember.Templates.helpers
  @param {Object} options
  @return {String} HTML string
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
  {{/labeled-textfield}}
  ```

  ```app/templates/components/labeled-textfield.hbs
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
  `{{has-block}}` indicates if the component was invoked with a block.

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

  @method hasBlock
  @for Ember.Templates.helpers
  @param {String} the name of the block. The name (at the moment) is either "main" or "inverse" (though only curly components support inverse)
  @return {Boolean} `true` if the component was invoked with a block
  @public
 */

/**
  `{{has-block-params}}` indicates if the component was invoked with block params.

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

  This is useful when you want to create a component that can render itself
  differently when it is not invoked with block params.

  ```app/templates/components/my-component.hbs
  {{#if (has-block-params)}}
    Welcome {{yield favoriteFlavor}}, we're happy you're here and hope you
    enjoy your favorite ice cream flavor.
  {{else}}
    Welcome {{yield}}, we're happy you're here, but we're unsure what
    flavor ice cream you would enjoy.
  {{/if}}
  ```

  @method hasBlockParams
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
  {{#each items as |item|}}
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

/**
  The `partial` helper renders another template without
  changing the template context:

  ```handlebars
  {{foo}}
  {{partial "nav"}}
  ```

  The above example template will render a template named
  "-nav", which has the same context as the parent template
  it's rendered into, so if the "-nav" template also referenced
  `{{foo}}`, it would print the same thing as the `{{foo}}`
  in the above example.

  If a "-nav" template isn't found, the `partial` helper will
  fall back to a template named "nav".

  ### Bound template names

  The parameter supplied to `partial` can also be a path
  to a property containing a template name, e.g.:

  ```handlebars
  {{partial someTemplateName}}
  ```

  The above example will look up the value of `someTemplateName`
  on the template context (e.g. a controller) and use that
  value as the name of the template to render. If the resolved
  value is falsy, nothing will be rendered. If `someTemplateName`
  changes, the partial will be re-rendered using the new template
  name.

  @method partial
  @for Ember.Templates.helpers
  @param {String} partialName The name of the template to render minus the leading underscore.
  @deprecated Use a component instead
  @public
*/

export { default as RootTemplate } from './lib/templates/root';
export {
  default as template,
  counters as templateCacheCounters,
  Factory as TemplateFactory,
  OwnedTemplate,
} from './lib/template';
export { default as Checkbox } from './lib/components/checkbox';
export { default as TextField } from './lib/components/text-field';
export { default as TextArea } from './lib/components/textarea';
export { default as LinkComponent } from './lib/components/link-to';
export { default as Component } from './lib/component';
export { default as Helper, helper } from './lib/helper';
export { SafeString, escapeExpression, htmlSafe, isHTMLSafe } from './lib/utils/string';
export {
  Renderer,
  InertRenderer,
  InteractiveRenderer,
  _resetRenderers,
  renderSettled,
} from './lib/renderer';
export {
  getTemplate,
  setTemplate,
  hasTemplate,
  getTemplates,
  setTemplates,
} from './lib/template_registry';
export { setupEngineRegistry, setupApplicationRegistry } from './lib/setup-registry';
export { DOMChanges, NodeDOMTreeConstruction, DOMTreeConstruction } from './lib/dom';
export {
  registerMacros as _registerMacros,
  experimentalMacros as _experimentalMacros,
} from './lib/syntax';
export { default as AbstractComponentManager } from './lib/component-managers/abstract';

// needed for test
// TODO just test these through public API
// a lot of these are testing how a problem was solved
// rather than the problem was solved
export { INVOKE } from './lib/utils/references';
// export { default as iterableFor } from './lib/utils/iterable';
export { default as OutletView } from './lib/views/outlet';
export { capabilities } from './lib/component-managers/custom';
export { setComponentManager, getComponentManager } from './lib/utils/custom-component-manager';
export { setModifierManager, getModifierManager } from './lib/utils/custom-modifier-manager';
export { capabilities as modifierCapabilities } from './lib/modifiers/custom';
export { isSerializationFirstNode } from './lib/utils/serialization-first-node-helpers';
export { setComponentTemplate, getComponentTemplate } from './lib/utils/component-template';
export { CapturedRenderNode } from './lib/utils/debug-render-tree';
