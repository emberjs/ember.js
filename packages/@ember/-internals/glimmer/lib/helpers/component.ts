/**
  @module ember
*/

/**
  The `component` helper is used to package a Component with initial arguments.
  The included arguments can then be merged during the final invocation.

  See [Component](/ember/release/modules/@glimmer%2Fcomponent/) for
  additional information on how a `Component` functions.

  This is similar to the concept of Partial Application.
    
  For example, given a `FullName` component:
  
  ```app/components/full-name.gjs
  import MyInputComponent from './my-input-component';
  
  <template>
    {{yield (component MyInputComponent value=@model.name placeholder="Username")}}
  </template>
  ```
  
  The yielded component can be invoked by the calling component.
  See the following snippet:
  
  ```app/components/person-form.gjs
  import FullName from './full-name';
    
  <template>
    <FullName @model={{@model}} as |Field|>
      <Field />
    </FullName>
  </template>
  ```
  
  Which will output an input whose value is already bound to `@model.name` and `placeholder`
  is "Username".
    
  Any arguments passed at the invocation site of the component will override those applied via
  the `component` helper. For example, if the invocation site of the component is:

  ```app/components/person-form.gjs
  import FullName from './full-name';

  <template>
    <FullName @model={{@model}} as |Field|>
      <Field @placeholder="Your name" />
    </FullName>
  </template>
  ```

  The output will be an input whose value is bound to `@model.name` and `placeholder`
  is "Your name".
    
  The `component` helper is built-in and does not need to be imported. 
    
  Prior to Strict Mode aka "Template Tag" or gjs, the component helper was also used to invoke
  components dynamically. This is no longer necessary, and they can be directly invoked, as above.

  ### Dynamic Component Invocation

  ```app/templates/application.gjs
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';
  import { component } from '@ember/helper';
  import LiveUpdatingChart from '../components/live-updating-chart';
  import MarketCloseSummary from '../components/market-close-summary';

  export default class Application extends Component {
    @tracked isMarketOpen = false;

    get infographicComponent() {
      return this.isMarketOpen ? LiveUpdatingChart : MarketCloseSummary;
    }

    <template>
      {{!-- The component can be invoked directly --}}
      <this.infographicComponent />
    
      {{!-- The component helper here is no longer necessary --}}
      {{component this.infographicComponentName}}
    </template>
  }
  ```

  @method component
  @since 1.11.0
  @for Ember.Templates.helpers
  @public
*/

export {};
