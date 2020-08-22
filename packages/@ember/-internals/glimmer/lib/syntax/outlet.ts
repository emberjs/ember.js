import { DEBUG } from '@glimmer/env';
import { CapturedArguments, Option, VM, VMArguments } from '@glimmer/interfaces';
import { ConstReference, PathReference, Reference, RootReference } from '@glimmer/reference';
import {
  createCapturedArgs,
  CurriedComponentDefinition,
  curry,
  EMPTY_POSITIONAL,
  UNDEFINED_REFERENCE,
} from '@glimmer/runtime';
import { dict } from '@glimmer/util';
import { OutletComponentDefinition, OutletDefinitionState } from '../component-managers/outlet';
import { DynamicScope } from '../renderer';
import { isTemplateFactory } from '../template';
import { OutletReference, OutletState } from '../utils/outlet';

/**
  The `{{outlet}}` helper lets you specify where a child route will render in
  your template. An important use of the `{{outlet}}` helper is in your
  application's `application.hbs` file:

  ```app/templates/application.hbs
  <MyHeader />

  <div class="my-dynamic-content">
    <!-- this content will change based on the current route, which depends on the current URL -->
    {{outlet}}
  </div>

  <MyFooter />
  ```

  You may also specify a name for the `{{outlet}}`, which is useful when using more than one
  `{{outlet}}` in a template:

  ```app/templates/application.hbs
  {{outlet "menu"}}
  {{outlet "sidebar"}}
  {{outlet "main"}}
  ```

  Your routes can then render into a specific one of these `outlet`s by specifying the `outlet`
  attribute in your `renderTemplate` function:

  ```app/routes/menu.js
  import Route from '@ember/routing/route';

  export default class MenuRoute extends Route {
    renderTemplate() {
      this.render({ outlet: 'menu' });
    }
  }
  ```

  See the [routing guide](https://guides.emberjs.com/release/routing/rendering-a-template/) for more
  information on how your `route` interacts with the `{{outlet}}` helper.
  Note: Your content __will not render__ if there isn't an `{{outlet}}` for it.

  @method outlet
  @param {String} [name]
  @for Ember.Templates.helpers
  @public
*/
export function outletHelper(args: VMArguments, vm: VM) {
  let scope = vm.dynamicScope() as DynamicScope;
  let nameRef: Reference<string>;

  if (args.positional.length === 0) {
    nameRef = new ConstReference('main');
  } else {
    nameRef = args.positional.at<PathReference<string>>(0);
  }

  return new OutletComponentReference(new OutletReference(scope.outletState, nameRef));
}

class OutletModelReference extends RootReference {
  constructor(private parent: PathReference<OutletState | undefined>) {
    super();

    if (DEBUG) {
      this.debugLabel = '@model';
    }
  }

  isConst() {
    return false;
  }

  compute(): unknown {
    let state = this.parent.value();

    if (state === undefined) {
      return undefined;
    }

    let { render } = state;

    if (render === undefined) {
      return undefined;
    }

    return render.model as unknown;
  }
}

class OutletComponentReference implements PathReference<CurriedComponentDefinition | null> {
  private definition: Option<CurriedComponentDefinition> = null;
  private lastState: Option<OutletDefinitionState> = null;

  constructor(private outletRef: PathReference<OutletState | undefined>) {}

  isConst() {
    return false;
  }

  value(): CurriedComponentDefinition | null {
    let state = stateFor(this.outletRef);
    if (validate(state, this.lastState)) {
      return this.definition;
    }
    this.lastState = state;

    let definition = null;

    if (state !== null) {
      let args = makeArgs(this.outletRef);

      definition = curry(new OutletComponentDefinition(state), args);
    }

    return (this.definition = definition);
  }

  get(_key: string) {
    return UNDEFINED_REFERENCE;
  }
}

function makeArgs(outletRef: PathReference<OutletState | undefined>): CapturedArguments {
  let modelRef = new OutletModelReference(outletRef);
  let named = dict<PathReference>();
  named.model = modelRef;

  return createCapturedArgs(named, EMPTY_POSITIONAL);
}

function stateFor(ref: PathReference<OutletState | undefined>): OutletDefinitionState | null {
  let outlet = ref.value();
  if (outlet === undefined) return null;
  let render = outlet.render;
  if (render === undefined) return null;
  let template = render.template;
  if (template === undefined) return null;

  // this guard can be removed once @ember/test-helpers@1.6.0 has "aged out"
  // and is no longer considered supported
  if (isTemplateFactory(template)) {
    template = template(render.owner);
  }

  return {
    ref,
    name: render.name,
    outlet: render.outlet,
    template,
    controller: render.controller,
    model: render.model,
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
