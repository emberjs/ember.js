import { Option } from '@glimmer/interfaces';
import { OpcodeBuilder } from '@glimmer/opcode-compiler';
import * as WireFormat from '@glimmer/wire-format';
import { TemplateMeta } from 'ember-views';

/**
  The `{{outlet}}` helper lets you specify where a child route will render in
  your template. An important use of the `{{outlet}}` helper is in your
  application's `application.hbs` file:

  ```handlebars
  {{! app/templates/application.hbs }}
  <!-- header content goes here, and will always display -->
  {{my-header}}
  <div class="my-dynamic-content">
    <!-- this content will change based on the current route, which depends on the current URL -->
    {{outlet}}
  </div>
  <!-- footer content goes here, and will always display -->
  {{my-footer}}
  ```

  See [templates guide](https://emberjs.com/guides/templates/the-application-template/) for
  additional information on using `{{outlet}}` in `application.hbs`.
  You may also specify a name for the `{{outlet}}`, which is useful when using more than one
  `{{outlet}}` in a template:

  ```handlebars
  {{outlet "menu"}}
  {{outlet "sidebar"}}
  {{outlet "main"}}
  ```

  Your routes can then render into a specific one of these `outlet`s by specifying the `outlet`
  attribute in your `renderTemplate` function:

  ```app/routes/menu.js
  import Route from '@ember/routing/route';

  export default Route.extend({
    renderTemplate() {
      this.render({ outlet: 'menu' });
    }
  });
  ```

  See the [routing guide](https://emberjs.com/guides/routing/rendering-a-template/) for more
  information on how your `route` interacts with the `{{outlet}}` helper.
  Note: Your content __will not render__ if there isn't an `{{outlet}}` for it.

  @method outlet
  @param {String} [name]
  @for Ember.Templates.helpers
  @public
*/
export const outletMacro = (_name: string, params: Option<WireFormat.Core.Params>, hash: Option<WireFormat.Core.Hash>, builder: OpcodeBuilder<TemplateMeta>) => {
  let expr: WireFormat.Expressions.Helper = [WireFormat.Ops.Helper, '-outlet', params || [], hash];
  builder.dynamicComponent(expr, [], null, false, null, null);
  return true;
};
