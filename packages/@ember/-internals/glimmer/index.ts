/**
  [Glimmer](https://github.com/tildeio/glimmer) is a templating engine used by Ember.js that is compatible with a subset of the [Handlebars](http://handlebarsjs.com/) syntax.

  Ember ships with two types of JavaScript classes for components:

  1. Glimmer components, imported from `@glimmer/component`, which are the
  default component's for Ember Octane (3.15) and more recent editions.
  2. Classic components, imported from `@ember/component`, which were the
  default for older editions of Ember (pre 3.15) but are still supported.

  Below is the documentation for Classic components. If you are looking for the
  API documentation for Template-only or Glimmer components, it is [available
  here](/ember/release/modules/@glimmer%2Fcomponent).

  Note: Prior to Ember 6.8, by default, components were authored in paired `.hbs` and `.js`
  files. This is still supported, but the default authoring format is now `.gjs` or "template tag".
  The documentation for `@ember/component` still refers to the older authoring format. To read about
  the new authoring format, see the
  [Glimmer Component API documentation](/ember/release/modules/@glimmer%2Fcomponent).
    
  ### Showing a property

  Templates manage the flow of an application's UI, and display state (through
  the DOM) to a user. For example, given a component with the property "name",
  that component's template can use the name in several ways:

  ```app/components/person-profile.js
  import Component from '@ember/component';
  import { tracked } from '@glimmer/tracking';

  export default class extends Component {
    @tracked name = 'Jill'
  }
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

  ```app/templates/application.gjs
  import LabeledTextField from '../components/labeled-textfield';
    
  <template>
    <LabeledTextField @value={{@model.name}}>
      First name:
    </LabeledTextField>
  </template>
  ```

  ```app/components/labeled-textfield.gjs
  import { Input } from '@ember/component';
    
  <template>
    <label>
      {{yield}} <Input @value={{@value}} />
    </label>
  </template>
  ```

  Result:

  ```html
  <label>
    First name: <input type="text" />
  </label>
  ```

  Additionally you can `yield` properties into the context for use by the consumer:

  ```app/templates/application.gjs
  import Component from '@glimmer/component';
  import LabeledTextField from '../components/labeled-textfield';
    
  export default class Application extends Component {
    firstNameValidator = (value) => {
      // validates
    }
    
    <template>
      <LabeledTextField @value={{@model.validation}} @validator={{this.firstNameValidator}} as |validationError|>
        {{#if validationError}}
          <p class="error">{{validationError}}</p>
        {{/if}}
        First name:
      </LabeledTextField>
    </template>
  }
  ```

  ```app/components/labeled-textfield.gjs
  import { Input } from '@ember/component';
    
  <template>
    <label>
      {{yield this.validationError}} <Input @value={{@value}} />
    </label>
  </template>
  ```

  Result:

  ```html
  <label>
    <p class="error">First Name must be at least 3 characters long.</p>
    First name: <input type="text" />
  </label>
  ```

  `yield` can also be used with the `hash` helper:

  ```app/templates/application.gjs
  import DateRanges from '../components/date-ranges';
    
  <template>
    <DateRanges @value={{@model.date}} as |range|>
      Start date: {{range.start}}
      End date: {{range.end}}
    </DateRanges>
  </template>
  ```

  ```app/components/date-ranges.gjs
  <template>
    <div>
      {{yield (hash start=@value.start end=@value.end)}}
    </div>
  </template>
  ```

  Result:

  ```html
  <div>
    Start date: July 1st
    End date: July 30th
  </div>
  ```

  Multiple values can be yielded as block params:
    
  ```app/templates/application.gjs
  import Banner from '../components/banner';
    
  <template>
    <Banner @value={{@model}} as |title subtitle body|>
      <h1>{{title}}</h1>
      <h2>{{subtitle}}</h2>
      {{body}}
    </Banner>
  </template>
  ```

  ```app/components/banner.gjs
  <template>
    <div>
      {{yield "Hello title" "hello subtitle" "body text"}}
    </div>
  </template>
  ```

  Result:

  ```html
  <div>
    <h1>Hello title</h1>
    <h2>hello subtitle</h2>
    body text
  </div>
  ```

  However, it is preferred to use the hash helper, as this can prevent breaking changes to your component and also simplify the api for the component.

  Multiple components can be yielded with the `hash` and `component` helper:

  ```app/templates/application.gjs
  import Banner from '../components/banner';

  <template>
    <Banner @value={{@model}} as |banner|>
      <banner.Title>Banner title</banner.Title>
      <banner.Subtitle>Banner subtitle</banner.Subtitle>
      <banner.Body>A load of body text</banner.Body>
    </Banner>
  </template>
  ```

  ```app/components/banner.gjs
  import Title from './banner/title';
  import Subtitle from './banner/subtitle';
  import Body from './banner/body';

  export default class Banner extends Component {
    Title = Title;
    Subtitle = Subtitle;
    Body = Body;
    
    <template>
      <div>
        {{yield (hash
          Title=this.Title
          Subtitle=this.Subtitle
          Body=(component this.Body defaultArg="some value")
        )}}
      </div>
    </template>
  }
  ```

  Result:

  ```html
  <div>
    <h1>Banner title</h1>
    <h2>Banner subtitle</h2>
    A load of body text
  </div>
  ```

  A benefit of using this pattern is that the user of the component can change the order the components are displayed.

  ```app/templates/application.gjs
  import Banner from '../components/banner';

  <template>
    <Banner @value={{@model}} as |banner|>
      <banner.Subtitle>Banner subtitle</banner.Subtitle>
      <banner.Title>Banner title</banner.Title>
      <banner.Body>A load of body text</banner.Body>
    </Banner>
  </template>
  ```

  Result:

  ```html
  <div>
    <h2>Banner subtitle</h2>
    <h1>Banner title</h1>
    A load of body text
  </div>
  ```

  Another benefit to using `yield` with the `hash` and `component` helper
  is you can pass attributes and arguments to these components:

  ```app/templates/application.gjs
  import Banner from '../components/banner';

  <template>
    <Banner @value={{@model}} as |banner|>
      <banner.Subtitle class="mb-1">Banner subtitle</banner.Subtitle>
      <banner.Title @variant="loud">Banner title</banner.Title>
      <banner.Body>A load of body text</banner.Body>
    </Banner>
  </template>
  ```

  ```app/components/banner/subtitle.gjs
  {{!-- note the use of ..attributes --}}
  <h2 ...attributes>
    {{yield}}
  </h2>
  ```

  ```app/components/banner/title.gjs
  <template>
    {{#if (eq @variant "loud")}}
      <h1 class="loud">{{yield}}</h1>
    {{else}}
      <h1 class="quiet">{{yield}}</h1>
    {{/if}}
  </template>
  ```

  Result:

  ```html
  <div>
    <h2 class="mb-1">Banner subtitle</h2>
    <h1 class="loud">Banner title</h1>
    A load of body text
  </div>
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
  <MyComponent>
    Hi Jen!
  </MyComponent>
  ```

  This component is invoked without a block:

  ```handlebars
  <MyComponent />
  ```

  This is useful when you want to create a component that can optionally take a block
  and then render a default template when it is not invoked with a block.

  ```app/components/my-component.gjs
  <template>
    {{#if (has-block)}}
      Welcome {{yield}}, we are happy you're here!
    {{else}}
      Hey you! You're great!
    {{/if}}
  </template>
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

  ```app/components/my-component.gjs
  <template>
    {{#if (has-block-params)}}
      Welcome {{yield this.favoriteFlavor}}, we're happy you're here and hope you
      enjoy your favorite ice cream flavor.
    {{else}}
      Welcome {{yield}}, we're happy you're here, but we're unsure what
      flavor ice cream you would enjoy.
    {{/if}}
  </template>
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

export { default as template, templateCacheCounters } from '@glimmer/opcode-compiler/lib/template';

export { default as RootTemplate } from './lib/templates/root';
export { default as Input } from './lib/components/input';
export { default as LinkTo } from './lib/components/link-to';
export { default as Textarea } from './lib/components/textarea';
export { default as Component } from './lib/component';
export {
  default as Helper,
  helper,
  type FunctionBasedHelper,
  type FunctionBasedHelperInstance,
  type HelperFactory,
  type SimpleHelper,
} from './lib/helper';
export {
  TrustedHTML,
  SafeString,
  trustHTML,
  isTrustedHTML,
  htmlSafe,
  isHTMLSafe,
} from './lib/utils/string';
export {
  Renderer,
  _resetRenderers,
  renderSettled,
  renderComponent,
  type View,
} from './lib/renderer';
// RFC #1200 -- render-tree-scoped context (provide/consume)
export {
  createContext,
  captureContext,
  type Context,
  type CapturedContext,
} from './lib/create-context';
export {
  getTemplate,
  setTemplate,
  hasTemplate,
  getTemplates,
  setTemplates,
  type TemplatesRegistry,
} from './lib/template_registry';
export { setupEngineRegistry, setupApplicationRegistry } from './lib/setup-registry';
export { DOMChanges, NodeDOMTreeConstruction, DOMTreeConstruction } from './lib/dom';

// needed for test
// TODO just test these through public API
// a lot of these are testing how a problem was solved
// rather than the problem was solved
export { default as OutletView, type BootEnvironment } from './lib/views/outlet';
export type { OutletState, RenderState } from './lib/utils/outlet';
export {
  componentCapabilities,
  modifierCapabilities,
  setComponentManager,
} from './lib/utils/managers';
export { isSerializationFirstNode } from './lib/utils/serialization-first-node-helpers';
export { default as element } from './lib/helpers/element';
export { uniqueId } from './lib/helpers/unique-id';
