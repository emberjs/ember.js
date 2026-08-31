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

  Ember's built-in and importable helpers are described under the [@ember/helper](../modules/@ember%2Fhelper).
  module. Documentation on creating custom helpers can be found under
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

 ## Looking for template keywords and helpers? 
   
 See [@ember/helper](../../modules/@ember%2Fhelper).
 
 @class Ember.Templates.helpers
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
