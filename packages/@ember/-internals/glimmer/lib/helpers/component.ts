/**
  @module ember
*/

/**
  The `{{component}}` helper lets you add instances of `Component` to a
  template. See [Component](/ember/release/classes/Component) for
  additional information on how a `Component` functions.
    
  The `component` helper is built-in and does not need to be imported. 
    
  `{{component}}`'s primary use is for cases where you want to dynamically
  change which type of component is rendered as the state of your application
  changes. This helper has three modes: inline, block, and nested.

  ### Inline Form

  Given the following component:

  ```app/templates/application.gjs
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';
  import { component } from '@ember/helper';

  export default class Application extends Component {
    @tracked isMarketOpen = 'live-updating-chart'

    get infographicComponentName() {
      return this.isMarketOpen ? 'live-updating-chart' : 'market-close-summary';
    }

    <template>
      {{component this.infographicComponentName}}
    </template>
  }
  ```

  The `live-updating-chart` component will be appended when `isMarketOpen` is
  `true`, and the `market-close-summary` component will be appended when
  `isMarketOpen` is `false`. If the value changes while the app is running,
  the component will be automatically swapped out accordingly.
  Note: You should not use this helper when you are consistently rendering the same
  component. In that case, use standard component syntax, for example:

  ```hbs
  <LiveUpdatingChart />
  ```

  ### Block Form

  Using the block form of this helper is similar to using the block form
  of a component. Given the following application component:

  ```app/templates/application.gjs
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  export default class Application extends Component {
    @tracked isMarketOpen = 'live-updating-chart'

    get lastUpdateTimestamp() {
      return new Date();
    }
    
    get infographicComponentName() {
      return this.isMarketOpen ? 'live-updating-chart' : 'market-close-summary';
    }

    <template>
      {{#component this.infographicComponentName}}
        Last update: {{this.lastUpdateTimestamp}}
      {{/component}}
    </template>
  }
  ```

  And the following component template:

  ```app/components/live-updating-chart.gjs
  <template>
    {{yield}}
  </template>
  ```

  The `Last Update: {{this.lastUpdateTimestamp}}` will be rendered in place of the `{{yield}}`.

  ### Nested Usage

  The `component` helper can be used to package a component path with initial attrs.
  The included attrs can then be merged during the final invocation.
  For example, given a `PersonForm` component:

  ```app/components/person-form.gjs
  <template>
    {{yield (hash
      nameInput=(component "my-input-component" value=@model.name placeholder="First Name")
    )}}
  </template>
  ```

  When yielding the component via the `hash` helper, the component is invoked directly.
  See the following snippet:

  ```hbs
  <PersonForm as |form|>
    <form.nameInput @placeholder="Username" />
  </PersonForm>
  ```

  Which outputs an input whose value is already bound to `model.name` and `placeholder`
  is "Username".

  When yielding the component without the `hash` helper use the `component` helper.
  For example, below is a `full-name` component template:

  ```handlebars
  {{yield (component "my-input-component" value=@model.name placeholder="Name")}}
  ```

  ```hbs
  <FullName as |field|>
    {{component field placeholder="Full name"}}
  </FullName>
  ```

  @method component
  @since 1.11.0
  @for Ember.Templates.helpers
  @public
*/

export {};
