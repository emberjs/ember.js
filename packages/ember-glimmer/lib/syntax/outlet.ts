import { OwnedTemplateMeta } from '@ember/-internals/views';
import { Option } from '@glimmer/interfaces';
import { OpcodeBuilder } from '@glimmer/opcode-compiler';
import { ConstReference, Reference, Tag, VersionedPathReference } from '@glimmer/reference';
import {
  Arguments,
  CurriedComponentDefinition,
  curry,
  UNDEFINED_REFERENCE,
  VM,
} from '@glimmer/runtime';
import * as WireFormat from '@glimmer/wire-format';
import { OutletComponentDefinition, OutletDefinitionState } from '../component-managers/outlet';
import { DynamicScope } from '../renderer';
import { OutletReference, OutletState } from '../utils/outlet';

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

  See the [routing guide](https://guides.emberjs.com/release/routing/rendering-a-template/) for more
  information on how your `route` interacts with the `{{outlet}}` helper.
  Note: Your content __will not render__ if there isn't an `{{outlet}}` for it.

  @method outlet
  @param {String} [name]
  @for Ember.Templates.helpers
  @public
*/
export function outletHelper(vm: VM, args: Arguments) {
  let scope = vm.dynamicScope() as DynamicScope;
  let nameRef: Reference<string>;
  if (args.positional.length === 0) {
    nameRef = new ConstReference('main');
  } else {
    nameRef = args.positional.at<VersionedPathReference<string>>(0);
  }
  return new OutletComponentReference(new OutletReference(scope.outletState, nameRef));
}

export function outletMacro(
  _name: string,
  params: Option<WireFormat.Core.Params>,
  hash: Option<WireFormat.Core.Hash>,
  builder: OpcodeBuilder<OwnedTemplateMeta>
) {
  let expr: WireFormat.Expressions.Helper = [WireFormat.Ops.Helper, '-outlet', params || [], hash];
  builder.dynamicComponent(expr, null, [], null, false, null, null);
  return true;
}

class OutletComponentReference
  implements VersionedPathReference<CurriedComponentDefinition | null> {
  public tag: Tag;
  private definition: CurriedComponentDefinition | null;
  private lastState: OutletDefinitionState | null;

  constructor(private outletRef: VersionedPathReference<OutletState | undefined>) {
    this.definition = null;
    this.lastState = null;
    // The router always dirties the root state.
    this.tag = outletRef.tag;
  }

  value(): CurriedComponentDefinition | null {
    let state = stateFor(this.outletRef);
    if (validate(state, this.lastState)) {
      return this.definition;
    }
    this.lastState = state;
    let definition = null;
    if (state !== null) {
      definition = curry(new OutletComponentDefinition(state));
    }
    return (this.definition = definition);
  }

  get(_key: string) {
    return UNDEFINED_REFERENCE;
  }
}

function stateFor(
  ref: VersionedPathReference<OutletState | undefined>
): OutletDefinitionState | null {
  let outlet = ref.value();
  if (outlet === undefined) return null;
  let render = outlet.render;
  if (render === undefined) return null;
  let template = render.template;
  if (template === undefined) return null;
  return {
    ref,
    name: render.name,
    outlet: render.outlet,
    template,
    controller: render.controller,
  };
}

function validate(state: OutletDefinitionState | null, lastState: OutletDefinitionState | null) {
  if (state === null) {
    return lastState === null;
  }
  if (lastState === null) {
    return false;
  }
  return state.template === lastState.template && state.controller === lastState.controller;
}
