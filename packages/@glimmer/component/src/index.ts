import { DEBUG } from '@glimmer/env';
import { setComponentManager } from '@ember/component';
import GlimmerComponentManager from './-private/ember-component-manager';
import _GlimmerComponent, { type Args } from './-private/component';
import { setOwner, type default as Owner } from '@ember/owner';

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
     default components for Ember Octane (3.15) and more recent editions.
  2. Classic components, imported from `@ember/component`, which were the
     default for older editions of Ember (pre 3.15).

  Below is the documentation for Template-only and Glimmer components. If you
  are looking for the API documentation for Classic components, it is
  [available here](/ember/release/classes/Component). The source code for
  Glimmer components can be found in [`@glimmer/component`](https://github.com/glimmerjs/glimmer.js/tree/master/packages/%40glimmer/component).

  ## Defining a Template-only Component

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

  ## Using Blocks

  You can use `yield` inside a template to include the **contents** of any block
  attached to the component. For instance, if we added a `{{yield}}` to our
  component like so:

  ```app/templates/components/person-profile.hbs
  <h1>{{@person.name}}</h1>
  {{yield}}
  ```

  We could then invoke it like this:

  ```handlebars
  <PersonProfile @person={{this.currentUser}}>
    <p>Admin mode</p>
  </PersonProfile>
  ```

  or with curly syntax like this:

  ```handlebars
  {{#person-profile person=this.currentUser}}
    <p>Admin mode</p>
  {{/person-profile}}
  ```

  And the content passed in between the brackets of the component would be
  rendered in the same place as the `{{yield}}` within it, replacing it.

  Blocks are executed in their original context, meaning they have access to the
  scope and any in-scope variables where they were defined.

  ### Passing parameters to blocks

  You can also pass positional parameters to `{{yield}}`, which are then made
  available in the block:

  ```app/templates/components/person-profile.hbs
  <h1>{{@person.name}}</h1>
  {{yield @person.signature}}
  ```

  We can then use this value in the block like so:

  ```handlebars
  <PersonProfile @person={{this.currentUser}} as |signature|>
    {{signature}}
  </PersonProfile>
  ```

  ### Passing multiple blocks

  You can pass multiple blocks to a component by giving them names, and
  specifying which block you are yielding to with `{{yield}}`. For instance, if
  we wanted to add a way for users to customize the title of our
  `<PersonProfile>` component, we could add a named block inside of the header:

  ```app/templates/components/person-profile.hbs
  <h1>{{yield to="title"}}</h1>
  {{yield}}
  ```

  This component could then be invoked like so:

  ```handlebars
  <PersonProfile @person={{this.currentUser}}>
    <:title>{{this.currentUser.name}}</:title>
    <:default>{{this.currentUser.signature}}</:default>
  </PersonProfile>
  ```

  When passing named blocks, you must name every block, including the `default`
  block, which is the block that is defined if you do not pass a `to` parameter
  to `{{yield}}`. Whenever you invoke a component without passing explicitly
  named blocks, the passed block is considered the `default` block.

  ### Passing parameters to named blocks

  You can also pass parameters to named blocks:

  ```app/templates/components/person-profile.hbs
  <h1>{{yield @person.name to="title"}}</h1>
  {{yield @person.signature}}
  ```

  These parameters can then be used like so:

  ```handlebars
  <PersonProfile @person={{this.currentUser}}>
    <:title as |name|>{{name}}</:title>
    <:default as |signature|>{{signature}}</:default>
  </PersonProfile>
  ```

  ### Checking to see if a block exists

  You can also check to see if a block exists using the `(has-block)` keyword,
  and conditionally use it, or provide a default template instead.

  ```app/templates/components/person-profile.hbs
  <h1>
    {{#if (has-block "title")}}
      {{yield @person.name to="title"}}
    {{else}}
      {{@person.name}}
    {{/if}}
  </h1>

  {{#if (has-block)}}
    {{yield @person.signature}}
  {{else}}
    {{@person.signature}}
  {{/if}}
  ```

  With this template, we can then optionally pass in one block, both blocks, or
  none at all:

  ```handlebars
  {{! passing both blocks }}
  <PersonProfile @person={{this.currentUser}}>
    <:title as |name|>{{name}}</:title>
    <:default as |signature|>{{signature}}</:default>
  </PersonProfile>

  {{! passing just the title block }}
  <PersonProfile @person={{this.currentUser}}>
    <:title as |name|>{{name}}</:title>
  </PersonProfile>

  {{! passing just the default block }}
  <PersonProfile @person={{this.currentUser}} as |signature|>
    {{signature}}
  </PersonProfile>

  {{! not passing any blocks }}
  <PersonProfile @person={{this.currentUser}}/>
  ```

  ### Checking to see if a block has parameters

  We can also check if a block receives parameters using the `(has-block-params)`
  keyword, and conditionally yield different values if so.

  ```app/templates/components/person-profile.hbs
  {{#if (has-block-params)}}
    {{yield @person.signature}}
  {{else}}
    {{yield}}
  {{/if}}
  ```

  ## Customizing Components With JavaScript

  To add JavaScript to a component, create a JavaScript file in the same
  location as the template file, with the same name, and export a subclass
  of `Component` as the default value. For example, to add Javascript to the
  `PersonProfile` component which we defined above, we would create
  `app/components/person-profile.js` and export our class as the default, like
  so:

  ```app/components/person-profile.js
  import Component from '@glimmer/component';

  export default class PersonProfileComponent extends Component {
    get displayName() {
      let { title, firstName, lastName } = this.args.person;

      if (title) {
        return `${title} ${lastName}`;
      } else {
        return `${firstName} ${lastName}`;
      }
    })
  }
  ```

  You can add your own properties, methods, and lifecycle hooks to this
  subclass to customize its behavior, and you can reference the instance of the
  class in your template using `{{this}}`. For instance, we could access the
  `displayName` property of our `PersonProfile` component instance in the
  template like this:

  ```app/templates/components/person-profile.hbs
  <h1>{{this.displayName}}</h1>
  {{yield}}
  ```

  ## `constructor`

  params: `owner` object and `args` object

  Constructs a new component and assigns itself the passed properties. The
  constructor is run whenever a new instance of the component is created, and
  can be used to setup the initial state of the component.

  ```javascript
  import Component from '@glimmer/component';

  export default class SomeComponent extends Component {
    constructor(owner, args) {
      super(owner, args);

      if (this.args.displayMode === 'list') {
        this.items = [];
      }
    }
  }
  ```

  Service injections and arguments are available in the constructor.

  ```javascript
  import Component from '@glimmer/component';
  import { service } from '@ember/service';

  export default class SomeComponent extends Component {
    @service myAnimations;

    constructor(owner, args) {
      super(owner, args);

      if (this.args.fadeIn === true) {
        this.myAnimations.register(this, 'fade-in');
      }
    }
  }
  ```

  ## `willDestroy`

  `willDestroy` is called after the component has been removed from the DOM, but
  before the component is fully destroyed. This lifecycle hook can be used to
  cleanup the component and any related state.

  ```javascript
  import Component from '@glimmer/component';
  import { service } from '@ember/service';

  export default class SomeComponent extends Component {
    @service myAnimations;

    willDestroy() {
      super.willDestroy(...arguments);

      this.myAnimations.unregister(this);
    }
  }
  ```

  ## `args`

  The `args` property of Glimmer components is an object that contains the
  _arguments_ that are passed to the component. For instance, the
  following component usage:

  ```handlebars
  <SomeComponent @fadeIn={{true}} />
  ```

  Would result in the following `args` object to be passed to the component:

  ```javascript
  { fadeIn: true }
  ```

  `args` can be accessed at any point in the component lifecycle, including
  `constructor` and `willDestroy`. They are also automatically marked as tracked
  properties, and they can be depended on as computed property dependencies:

  ```javascript
  import Component from '@glimmer/component';
  import { computed } from '@ember/object';

  export default class SomeComponent extends Component {

    @computed('args.someValue')
    get computedGetter() {
      // updates whenever args.someValue updates
      return this.args.someValue;
    }

    get standardGetter() {
      // updates whenever args.anotherValue updates (Ember 3.13+)
      return this.args.anotherValue;
    }
  }
  ```

  ## `isDestroying`

  A boolean flag to tell if the component is in the process of destroying. This is set to
  true before `willDestroy` is called.

  ## `isDestroyed`
  A boolean to tell if the component has been fully destroyed. This is set to true
  after `willDestroy` is called.

  @module @glimmer/component
  @public
*/
export default class GlimmerComponent<S = unknown> extends _GlimmerComponent<S> {
  constructor(owner: Owner, args: Args<S>) {
    super(owner, args);

    if (DEBUG && !(owner !== null && typeof owner === 'object')) {
      throw new Error(
        `You must pass both the owner and args to super() in your component: ${this.constructor.name}. You can pass them directly, or use ...arguments to pass all arguments through.`
      );
    }

    setOwner(this, owner);
  }
}

setComponentManager((owner: Owner) => {
  return new GlimmerComponentManager(owner);
}, GlimmerComponent);
