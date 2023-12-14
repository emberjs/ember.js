declare module '@ember/-internals/glimmer/lib/helpers/get' {
  /**
    @module ember
    */
  /**
      Dynamically look up a property on an object or an element in an array.
      The second argument to `{{get}}` should have a string or number value,
      although it can be bound.

      For example, these two usages are equivalent:

      ```app/components/developer-detail.js
      import Component from '@glimmer/component';
      import { tracked } from '@glimmer/tracking';

      export default class extends Component {
        @tracked developer = {
          name: "Sandi Metz",
          language: "Ruby"
        }
      }
      ```

      ```handlebars
      {{this.developer.name}}
      {{get this.developer "name"}}
      ```

      If there were several facts about a person, the `{{get}}` helper can dynamically
      pick one:

      ```app/templates/application.hbs
      <DeveloperDetail @factName="language" />
      ```

      ```handlebars
      {{get this.developer @factName}}
      ```

      For a more complex example, this template would allow the user to switch
      between showing the user's name and preferred coding language with a click:

      ```app/components/developer-detail.js
      import Component from '@glimmer/component';
      import { tracked } from '@glimmer/tracking';

      export default class extends Component {
        @tracked developer = {
          name: "Sandi Metz",
          language: "Ruby"
        }

        @tracked currentFact = 'name'

        @action
        showFact(fact) {
          this.currentFact = fact;
        }
      }
      ```

      ```app/components/developer-detail.js
      {{get this.developer this.currentFact}}

      <button {{on 'click' (fn this.showFact "name")}}>Show name</button>
      <button {{on 'click' (fn this.showFact "language")}}>Show language</button>
      ```

      The `{{get}}` helper can also respect mutable values itself. For example:

      ```app/components/developer-detail.js
      <Input @value={{mut (get this.person this.currentFact)}} />

      <button {{on 'click' (fn this.showFact "name")}}>Show name</button>
      <button {{on 'click' (fn this.showFact "language")}}>Show language</button>
      ```

      Would allow the user to swap what fact is being displayed, and also edit
      that fact via a two-way mutable binding.

      The `{{get}}` helper can also be used for array element access via index.
      This would display the value of the first element in the array `this.names`:

      ```handlebars
      {{get this.names 0}}
      ```

      Array element access also works with a dynamic second argument:

      ```handlebars
      {{get this.names @index}}
      ```

      @public
      @method get
      @for @ember/helper
      @since 2.1.0
     */
  export {};
}
