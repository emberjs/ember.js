/**
  @module ember
*/

/**
  The `{{component}}` helper lets you add instances of `Component` to a
  template. See [Component](/api/ember/release/classes/Component) for
  additional information on how a `Component` functions.
  `{{component}}`'s primary use is for cases where you want to dynamically
  change which type of component is rendered as the state of your application
  changes. This helper has three modes: inline, block, and nested.

  ### Inline Form

  Given the following template:

  ```app/application.hbs
  {{component infographicComponentName}}
  ```

  And the following application code:

  ```app/controllers/application.js
  import Controller from '@ember/controller';
  import { computed } from '@ember/object';

  export default Controller.extend({
    infographicComponentName: computed('isMarketOpen', {
      get() {
        if (this.get('isMarketOpen')) {
          return 'live-updating-chart';
        } else {
          return 'market-close-summary';
        }
      }
    })
  });
  ```

  The `live-updating-chart` component will be appended when `isMarketOpen` is
  `true`, and the `market-close-summary` component will be appended when
  `isMarketOpen` is `false`. If the value changes while the app is running,
  the component will be automatically swapped out accordingly.
  Note: You should not use this helper when you are consistently rendering the same
  component. In that case, use standard component syntax, for example:

  ```app/templates/application.hbs
  {{live-updating-chart}}
  ```

  ### Block Form

  Using the block form of this helper is similar to using the block form
  of a component. Given the following application template:

  ```app/templates/application.hbs
  {{#component infographicComponentName}}
    Last update: {{lastUpdateTimestamp}}
  {{/component}}
  ```

  The following controller code:

  ```app/controllers/application.js
  import Controller from '@ember/controller';
  import { computed } from '@ember/object';

  export default Controller.extend({
    lastUpdateTimestamp: computed(function() {
      return new Date();
    }),

    infographicComponentName: computed('isMarketOpen', {
      get() {
        if (this.get('isMarketOpen')) {
          return 'live-updating-chart';
        } else {
          return 'market-close-summary';
        }
      }
    })
  });
  ```

  And the following component template:

  ```app/templates/components/live-updating-chart.hbs
  {{! chart }}
  {{yield}}
  ```

  The `Last Update: {{lastUpdateTimestamp}}` will be rendered in place of the `{{yield}}`.

  ### Nested Usage

  The `component` helper can be used to package a component path with initial attrs.
  The included attrs can then be merged during the final invocation.
  For example, given a `person-form` component with the following template:

  ```app/templates/components/person-form.hbs
  {{yield (hash
    nameInput=(component "my-input-component" value=model.name placeholder="First Name")
  )}}
  ```

  When yielding the component via the `hash` helper, the component is invoked directly.
  See the following snippet:

  ```
  {{#person-form as |form|}}
    {{form.nameInput placeholder="Username"}}
  {{/person-form}}
  ```

  Which outputs an input whose value is already bound to `model.name` and `placeholder`
  is "Username".

  When yielding the component without the hash helper use the `component` helper.
  For example, below is a `full-name` component template:

  ```handlebars
  {{yield (component "my-input-component" value=model.name placeholder="Name")}}
  ```

  ```
  {{#full-name as |field|}}
    {{component field placeholder="Full name"}}
  {{/full-name}}
  ```

  @method component
  @since 1.11.0
  @for Ember.Templates.helpers
  @public
*/
