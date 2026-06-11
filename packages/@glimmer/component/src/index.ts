import { DEBUG } from '@glimmer/env';
import { setComponentManager } from '@ember/component';
import GlimmerComponentManager from './-private/ember-component-manager';
import _GlimmerComponent, { type Args } from './-private/component';
import { setOwner, type default as Owner } from '@ember/owner';

/**
  A component is a reusable UI element that consists of a template and an
  optional JavaScript class that defines its behavior. For example, someone
  might make a `button` in the template and handle the click behavior in the
  JavaScript.

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
  Glimmer components can be found in [`@glimmer/component`](https://github.com/emberjs/ember.js/tree/main/packages/%40glimmer/component).

  Note: Prior to Ember 6.8, by default, components were authored in paired `.hbs` and `.js` 
  files. This is still supported, but the default authoring format is now `.gjs` or "template tag".
  To read more about how components were previously authored, see the 
  [6.7 version of this API documentation](https://api.emberjs.com/ember/6.7/modules/@glimmer%2Fcomponent).
    
  ## Defining a Template-only Component

  The simplest way to create a component is to create a `gjs` file in
  `app/components` with a `<template>` tag wrapper:

  ```app/components/person-profile.gjs
  <template>
    <h1>{{@person.name}}</h1>
    <img src={{@person.avatar}}>
    <p class='signature'>{{@person.signature}}</p>
  </template>
  ```

  You will be able to use `<PersonProfile />` to invoke this component elsewhere
  in your application:

  ```app/templates/application.gjs
  import PersonProfile from '../components/person-profile';
    
  <template>
    <PersonProfile @person={{@model.currentUser}} />
  </template>
  ```

  Note that component names are capitalized here in order to distinguish them
  from regular HTML elements.

  Ember will render the content of the component template we
  created above. The end result will be something like this:

  ```html
  <h1>Tomster</h1>
  <img src="https://emberjs.com/tomster.jpg">
  <p class='signature'>Out of office this week</p>
  ```

  ## File System Nesting

  In Ember templates, “invokables” are things you can invoke in a template. These include components, 
  helpers, and modifiers. In the template tag format, these invokables need to be imported before 
  they can be used. This makes it easier to understand where values come from and what they do, as 
  well as unlocks build optimizations.

  When making use of the `PersonProfile` component as defined before in a different component file, 
  it first needs to be imported. This is done using the import statement, just like you would import 
  any other JavaScript module -- from your local project or from an external package.

  Since they are imported, Components can be placed anywhere in your project on the filesystem, but 
  they are conventionally placed within `app/components` for reusable components and within 
  `app/templates` for Route components. 
    
  Route components must be named after the route they are associated with -- and placed in the 
  `app/templates` directory. For example, a `Person` route would have a corresponding `Person` 
  component defined in `app/templates/person.gjs`. This component would then be rendered whenever 
  the user visits the `/person` route. For more information, see the 
  [Routing](https://guides.emberjs.com/release/routing/) section of the guides.

  ## Using Blocks

  You can use `yield` inside a template to include the **contents** of any block
  attached to the component. For instance, if we added a `{{yield}}` to our
  component like so:

  ```app/components/person-profile.gjs
  <template>
    <h1>{{@person.name}}</h1>
    {{yield}}
  </template>
  ```

  We could then invoke it like this:

  ```gjs
  import PersonProfile from '../components/person-profile';
    
  <template>
    <PersonProfile @person={{@model.currentUser}}>
      <p>Admin mode</p>
    </PersonProfile>
  </template>
  ```
    
  And the content passed in between the brackets of the component would be
  rendered in the same place as the `{{yield}}` within it, replacing it.

  Blocks are executed in their original context, meaning they have access to the
  scope and any in-scope variables where they were defined.

  ### Passing parameters to blocks

  You can also pass positional parameters to `{{yield}}`, which are then made
  available in the block:

  ```app/components/person-profile.gjs
  <template>
    <h1>{{@person.name}}</h1>
    {{yield @person.signature}}
  </template>
  ```

  We can then use this value in the block like so:

  ```gjs
  import PersonProfile from '../components/person-profile';
    
  <template>
    <PersonProfile @person={{@model.currentUser}} as |signature|>
      {{signature}}
    </PersonProfile>
  </template>
  ```

  ### Passing multiple blocks

  You can pass multiple blocks to a component by giving them names, and
  specifying which block you are yielding to with `{{yield}}`. For instance, if
  we wanted to add a way for users to customize the title of our
  `<PersonProfile>` component, we could add a named block inside of the header:

  ```app/components/person-profile.gjs
  <template>
    <h1>{{yield to="title"}}</h1>
    {{yield}}
  </template>
  ```

  This component could then be invoked like so:

  ```gjs
  import PersonProfile from '../components/person-profile';

  <template>
    <PersonProfile @person={{@model.currentUser}}>
      <:title>{{@model.currentUser.name}}</:title>
      <:default>{{@model.currentUser.signature}}</:default>
    </PersonProfile>
  </template>
  ```

  When passing named blocks, you must name every block, including the `default`
  block, which is the block that is defined if you do not pass a `to` parameter
  to `{{yield}}`. Whenever you invoke a component without passing explicitly
  named blocks, the passed block is considered the `default` block.

  ### Passing parameters to named blocks

  You can also pass parameters to named blocks:

  ```app/components/person-profile.gjs
  <template>
    <h1>{{yield @person.name to="title"}}</h1>
    {{yield @person.signature}}
  </template>
  ```

  These parameters can then be used like so:

  ```gjs
  import PersonProfile from '../components/person-profile';

  <template>
    <PersonProfile @person={{@model.currentUser}}>
      <:title as |name|>{{name}}</:title>
      <:default as |signature|>{{signature}}</:default>
    </PersonProfile>
  </template>
  ```

  ### Checking to see if a block exists

  You can also check to see if a block exists using the `(has-block)` keyword,
  and conditionally use it, or provide a default template instead.

  ```app/components/person-profile.gjs
  <template>
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
  </template>
  ```

  With this template, we can then optionally pass in one block, both blocks, or
  none at all:

  ```gjs
  import PersonProfile from '../components/person-profile';

  <template>
    {{! passing both blocks }}
    <PersonProfile @person={{@model.currentUser}}>
      <:title as |name|>{{name}}</:title>
      <:default as |signature|>{{signature}}</:default>
    </PersonProfile>
  
    {{! passing just the title block }}
    <PersonProfile @person={{@model.currentUser}}>
      <:title as |name|>{{name}}</:title>
    </PersonProfile>
  
    {{! passing just the default block }}
    <PersonProfile @person={{@model.currentUser}} as |signature|>
      {{signature}}
    </PersonProfile>
  
    {{! not passing any blocks }}
    <PersonProfile @person={{@model.currentUser}}/>
  </template>
  ```

  ### Checking to see if a block has parameters

  We can also check if a block receives parameters using the `(has-block-params)`
  keyword, and conditionally yield different values if so.

  ```app/components/person-profile.gjs
  <template>
    {{#if (has-block-params)}}
      {{yield @person.signature}}
    {{else}}
      {{yield}}
    {{/if}}
  </template>
  ```

  ## Customizing Components With JavaScript

  To add JavaScript to a component, add a class extending from `@glimmer/component` to the `gjs` 
  file, wrapping your `<template>` tag.
  For example, to add JavaScript to the `PersonProfile` component which we defined above:

  ```app/components/person-profile.gjs
  import Component from '@glimmer/component';

  export default class PersonProfile extends Component {
    get displayName() {
      let { title, firstName, lastName } = this.args.person;

      if (title) {
        return `${title} ${lastName}`;
      } else {
        return `${firstName} ${lastName}`;
      }
    })
    
    <template>
      <h1>{{this.displayName}}</h1>
      {{yield}}
    </template>
  }
  ```

  You can add your own properties, methods, and lifecycle hooks to this
  subclass to customize its behavior, and you can reference the instance of the
  class in your template using `{{this}}`. In the example above, we access the
  `displayName` property of our `PersonProfile` component instance in the
  template.

  ## `constructor`

  params: `owner` object and `args` object

  Constructs a new component and assigns itself the passed properties. The
  constructor is run whenever a new instance of the component is created, and
  can be used to setup the initial state of the component.

  ```gjs
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

  ```gjs
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
    
  You may prefer the [@ember/destroyable](/ember/release/modules//@ember%2Fdestroyable) APIs for
  this purpose.

  ```gjs
  import Component from '@glimmer/component';
  import { service } from '@ember/service';

  export default class SomeComponent extends Component {
    @service myAnimations;

    willDestroy() {
      super.willDestroy();

      this.myAnimations.unregister(this);
    }
  }
  ```

  ## `args`

  The `args` property of Glimmer components is an object that contains the
  _arguments_ that are passed to the component. For instance, the
  following component usage:

  ```gjs
  <template>
    <SomeComponent @fadeIn={{true}} />
  </template>
  ```

  Would result in the following `args` object to be passed to the component:

  ```javascript
  { fadeIn: true }
  ```

  `args` can be accessed at any point in the component lifecycle, including
  `constructor` and `willDestroy`. They are also automatically marked as tracked
  properties, and they can be depended on to update as any other tracked property:

  ```gjs
  import Component from '@glimmer/component';
  import { computed } from '@ember/object';

  export default class SomeComponent extends Component {
    get standardGetter() {
      // updates whenever args.anotherValue updates
      return this.args.anotherValue;
    }
  }
  ```
    
  A components arguments are accessible in the template using the `@` prefix - for example, 
  `this.args.fadeIn` from the example above can be accessed in the template as `@fadeIn`.

  ## `isDestroying`

  A boolean flag to tell if the component is in the process of destroying. This is set to
  true before `willDestroy` is called.

  ## `isDestroyed`
  A boolean to tell if the component has been fully destroyed. This is set to true
  after `willDestroy` is called.

  @module @glimmer/component
  @public
*/
export default class Component<S = unknown> extends _GlimmerComponent<S> {
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
}, Component);
