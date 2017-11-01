import {
  Arguments,
  VM
} from '@glimmer/runtime';
import {
  combine,
  ConstReference,
  TagWrapper,
  UpdatableTag,
} from '@glimmer/reference';
import { OutletComponentDefinition } from '../component-managers/outlet';

class OutletComponentReference {
  public outletNameRef: any;
  public parentOutletStateRef: any;
  public definition: any;
  public lastState: any;
  public outletStateTag: TagWrapper<UpdatableTag>;
  public tag: any;

  constructor(outletNameRef: any, parentOutletStateRef: any) {
    this.outletNameRef = outletNameRef;
    this.parentOutletStateRef = parentOutletStateRef;
    this.definition = null;
    this.lastState = null;
    let outletStateTag = this.outletStateTag = UpdatableTag.create(parentOutletStateRef.tag);
    this.tag = combine([outletStateTag.inner, outletNameRef.tag]);
  }

  value() {
    let { outletNameRef, parentOutletStateRef, definition, lastState } = this;

    let outletName = outletNameRef.value();
    let outletStateRef = parentOutletStateRef.get('outlets').get(outletName);
    let newState = this.lastState = outletStateRef.value();

    this.outletStateTag.inner.update(outletStateRef.tag);

    definition = revalidate(definition, lastState, newState);

    let hasTemplate = newState && newState.render.template;

    if (definition) {
      return definition;
    } else if (hasTemplate) {
      return this.definition = new OutletComponentDefinition(outletName, newState.render.template);
    } else {
      return this.definition = null;
    }
  }
}

function revalidate(definition: any, lastState: any, newState: any) {
  if (!lastState && !newState) {
    return definition;
  }

  if (!lastState && newState || lastState && !newState) {
    return null;
  }

  if (
    newState.render.template === lastState.render.template &&
    newState.render.controller === lastState.render.controller
  ) {
    return definition;
  }

  return null;
}

function outletComponentFor(vm: VM, args: Arguments) {
  let { outletState } = vm.dynamicScope();

  let outletNameRef;
  if (args.positional.length === 0) {
    outletNameRef = new ConstReference('main');
  } else {
    outletNameRef = args.positional.at(0);
  }

  return new OutletComponentReference(outletNameRef, outletState);
}

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
export function outletMacro(_name: string, params: any[], _hash: any[], builder: any) {
  if (!params) {
    params = [];
  }
  let definitionArgs = [params.slice(0, 1), null, null, null];
  let emptyArgs = [[], null, null, null]; // FIXME
  builder.component.dynamic(definitionArgs, outletComponentFor, emptyArgs);
  return true;
}
