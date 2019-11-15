/**
  A component is a reusable UI element that consists of a `.hbs` template and an
  optional JavaScript class that defines its behavior. For example, someone
  might make a `button` in the template and handle the click behavior in the
  JavaScript file that shares the same name as the template.

  The APIs available in a component vary depending on whether they import from
  `@glimmer/component` or the older "classic" type, `@ember/component`. The
  documentation below covers 100% of the available methods, hooks, and
  properties of `@glimmer/component`. The source code can be found in
  [`@glimmer/component`](https://github.com/glimmerjs/glimmer.js/tree/master/packages/%40glimmer/component).

  ## Defining a component

  To define a component, subclass `Component` and add your own properties,
  methods and lifecycle hooks:

  ```javascript
  import Component from '@glimmer/component';

  export default class SomeComponent extends Component {
    // your code here
  }
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
  import { inject as service } from '@ember/service';

  export default class SomeComponent extends Component {
    @service animation;

    constructor(owner, args) {
      super(owner, args);

      if (this.args.fadeIn === true) {
        this.animation.register(this, 'fade-in');
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
  import { inject as service } from '@ember/service';

  export default class SomeComponent extends Component {
    @service animation;

    willDestroy() {
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
  import { tracked } from '@ember/tracking';
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

