declare module '@ember/-internals/glimmer' {
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

      `yield` can also be used with the `hash` helper:

      ```app/templates/application.hbs
      <DateRanges @value={{@model.date}} as |range|>
        Start date: {{range.start}}
        End date: {{range.end}}
      </DateRanges>
      ```

      ```app/components/date-ranges.hbs
      <div>
        {{yield (hash start=@value.start end=@value.end)}}
      </div>
      ```

      Result:

      ```html
      <div>
        Start date: July 1st
        End date: July 30th
      </div>
      ```

      Multiple values can be yielded as block params:

      ```app/templates/application.hbs
      <Banner @value={{@model}} as |title subtitle body|>
        <h1>{{title}}</h1>
        <h2>{{subtitle}}</h2>
        {{body}}
      </Banner>
      ```

      ```app/components/banner.hbs
      <div>
        {{yield "Hello title" "hello subtitle" "body text"}}
      </div>
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

      ```app/templates/application.hbs
      <Banner @value={{@model}} as |banner|>
        <banner.Title>Banner title</banner.Title>
        <banner.Subtitle>Banner subtitle</banner.Subtitle>
        <banner.Body>A load of body text</banner.Body>
      </Banner>
      ```

      ```app/components/banner.js
      import Title from './banner/title';
      import Subtitle from './banner/subtitle';
      import Body from './banner/body';

      export default class Banner extends Component {
        Title = Title;
        Subtitle = Subtitle;
        Body = Body;
      }
      ```

      ```app/components/banner.hbs
      <div>
        {{yield (hash
          Title=this.Title
          Subtitle=this.Subtitle
          Body=(component this.Body defaultArg="some value")
        )}}
      </div>
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

      ```app/templates/application.hbs
      <Banner @value={{@model}} as |banner|>
        <banner.Subtitle>Banner subtitle</banner.Subtitle>
        <banner.Title>Banner title</banner.Title>
        <banner.Body>A load of body text</banner.Body>
      </Banner>
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

      ```app/templates/application.hbs
      <Banner @value={{@model}} as |banner|>
        <banner.Subtitle class="mb-1">Banner subtitle</banner.Subtitle>
        <banner.Title @variant="loud">Banner title</banner.Title>
        <banner.Body>A load of body text</banner.Body>
      </Banner>
      ```

      ```app/components/banner/subtitle.hbs
      {{!-- note the use of ..attributes --}}
      <h2 ...attributes>
        {{yield}}
      </h2>
      ```

      ```app/components/banner/title.hbs
      {{#if (eq @variant "loud")}}
          <h1 class="loud">{{yield}}</h1>
      {{else}}
          <h1 class="quiet">{{yield}}</h1>
      {{/if}}
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
  export { default as RootTemplate } from '@ember/-internals/glimmer/lib/templates/root';
  export { default as Input } from '@ember/-internals/glimmer/lib/components/input';
  export { default as LinkTo } from '@ember/-internals/glimmer/lib/components/link-to';
  export { default as Textarea } from '@ember/-internals/glimmer/lib/components/textarea';
  export { default as Component } from '@ember/-internals/glimmer/lib/component';
  export {
    default as Helper,
    helper,
    type FunctionBasedHelper,
    type FunctionBasedHelperInstance,
  } from '@ember/-internals/glimmer/lib/helper';
  export {
    SafeString,
    escapeExpression,
    htmlSafe,
    isHTMLSafe,
  } from '@ember/-internals/glimmer/lib/utils/string';
  export { Renderer, _resetRenderers, renderSettled } from '@ember/-internals/glimmer/lib/renderer';
  export {
    getTemplate,
    setTemplate,
    hasTemplate,
    getTemplates,
    setTemplates,
    type TemplatesRegistry,
  } from '@ember/-internals/glimmer/lib/template_registry';
  export {
    setupEngineRegistry,
    setupApplicationRegistry,
  } from '@ember/-internals/glimmer/lib/setup-registry';
  export {
    DOMChanges,
    NodeDOMTreeConstruction,
    DOMTreeConstruction,
  } from '@ember/-internals/glimmer/lib/dom';
  export {
    default as OutletView,
    type BootEnvironment,
  } from '@ember/-internals/glimmer/lib/views/outlet';
  export type { OutletState, RenderState } from '@ember/-internals/glimmer/lib/utils/outlet';
  export {
    componentCapabilities,
    modifierCapabilities,
    setComponentManager,
  } from '@ember/-internals/glimmer/lib/utils/managers';
  export { isSerializationFirstNode } from '@ember/-internals/glimmer/lib/utils/serialization-first-node-helpers';
  export { uniqueId } from '@ember/-internals/glimmer/lib/helpers/unique-id';
}
