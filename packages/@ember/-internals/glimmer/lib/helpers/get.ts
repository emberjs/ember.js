/**
@module ember
*/

/**
  Dynamically look up a property on an object or an element in an array.
  The second argument to `{{get}}` should have a string or number value,
  although it can be bound.

  For example, these two usages are equivalent:

  ```app/components/developer-detail.gjs
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';
  import { get } from '@ember/object';

  export default class extends Component {
    @tracked developer = {
      name: "Sandi Metz",
      language: "Ruby"
    }
    
    <template>
      {{this.developer.name}}
      {{get this.developer "name"}}
    </template>
  }
  ```
    
  If there were several facts about a person, the `{{get}}` helper can dynamically
  pick one:

  ```app/templates/application.gjs
  import DeveloperDetail from '../components/developer-detail';
  
  <template>
    <DeveloperDetail @factName="language" />
  </template
  ```

  ```handlebars
  {{get this.developer @factName}}
  ```

  For a more complex example, this template would allow the user to switch
  between showing the user's name and preferred coding language with a click:

  ```app/components/developer-detail.gjs
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';
  import { get } from '@ember/object';

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
    
    <template>
      {{get this.developer this.currentFact}}

      <button {{on 'click' (fn this.showFact "name")}}>Show name</button>
      <button {{on 'click' (fn this.showFact "language")}}>Show language</button>
    </template>
  }
  ```

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
