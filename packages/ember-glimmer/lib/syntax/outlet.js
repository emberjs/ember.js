/**
@module ember
@submodule ember-glimmer
*/
import { generateGuid, guidFor } from 'ember-utils';
import {
  ComponentDefinition,
  CompiledArgs
} from '@glimmer/runtime';
import { DEBUG } from 'ember-env-flags';
import { _instrumentStart } from 'ember-metal';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract-manager';
import {
  UpdatableTag,
  ConstReference,
  combine
} from '@glimmer/reference';

function outletComponentFor(vm) {
  let { outletState } = vm.dynamicScope();

  let args = vm.getArgs();
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

  See [templates guide](http://emberjs.com/guides/templates/the-application-template/) for
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

  ```javascript
  // app/routes/menu.js
  export default Ember.Route.extend({
    renderTemplate() {
      this.render({ outlet: 'menu' });
    }
  });
  ```

  See the [routing guide](http://emberjs.com/guides/routing/rendering-a-template/) for more
  information on how your `route` interacts with the `{{outlet}}` helper.
  Note: Your content __will not render__ if there isn't an `{{outlet}}` for it.

  @method outlet
  @param {String} [name]
  @for Ember.Templates.helpers
  @public
*/
export function outletMacro(path, params, hash, builder) {
  if (!params) {
    params = [];
  }
  let definitionArgs = [params.slice(0, 1), null, null, null];
  builder.component.dynamic(definitionArgs, outletComponentFor, CompiledArgs.empty(), builder.symbolTable, null);
  return true;
}

class OutletComponentReference {
  constructor(outletNameRef, parentOutletStateRef) {
    this.outletNameRef = outletNameRef;
    this.parentOutletStateRef = parentOutletStateRef;
    this.definition = null;
    this.lastState = null;
    let outletStateTag = this.outletStateTag = new UpdatableTag(parentOutletStateRef.tag);
    this.tag = combine([outletStateTag.tag, outletNameRef.tag]);
  }

  value() {
    let { outletNameRef, parentOutletStateRef, definition, lastState } = this;

    let outletName = outletNameRef.value();
    let outletStateRef = parentOutletStateRef.get('outlets').get(outletName);
    let newState = this.lastState = outletStateRef.value();

    this.outletStateTag.update(outletStateRef.tag);

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

function revalidate(definition, lastState, newState) {
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

function instrumentationPayload({ render: { name, outlet } }) {
  return { object: `${name}:${outlet}` };
}

function NOOP() {}

class StateBucket {
  constructor(outletState) {
    this.outletState = outletState;
    this.instrument();
  }

  instrument() {
    this.finalizer = _instrumentStart('render.outlet', instrumentationPayload, this.outletState);
  }

  finalize() {
    let { finalizer } = this;
    finalizer();
    this.finalizer = NOOP;
  }
}

class OutletComponentManager extends AbstractManager {
  prepareArgs(definition, args) {
    return args;
  }

  create(environment, definition, args, dynamicScope) {
    if (DEBUG) {
      this._pushToDebugStack(`template:${definition.template.meta.moduleName}`, environment);
    }

    let outletStateReference = dynamicScope.outletState = dynamicScope.outletState.get('outlets').get(definition.outletName);
    let outletState = outletStateReference.value();
    return new StateBucket(outletState);
  }

  layoutFor(definition, bucket, env) {
    return env.getCompiledBlock(OutletLayoutCompiler, definition.template);
  }

  getSelf({ outletState }) {
    return new RootReference(outletState.render.controller);
  }

  getTag() {
    return null;
  }

  getDestructor() {
    return null;
  }

  didRenderLayout(bucket) {
    bucket.finalize();

    if (DEBUG) {
      this.debugStack.pop();
    }
  }

  didCreateElement() {}
  didCreate(state) {}
  update(bucket) {}
  didUpdateLayout(bucket) {}
  didUpdate(state) {}
}

const MANAGER = new OutletComponentManager();

class TopLevelOutletComponentManager extends OutletComponentManager {
  create(environment, definition, args, dynamicScope) {
    if (DEBUG) {
      this._pushToDebugStack(`template:${definition.template.meta.moduleName}`, environment);
    }
    return new StateBucket(dynamicScope.outletState.value());
  }

  layoutFor(definition, bucket, env) {
    return env.getCompiledBlock(TopLevelOutletLayoutCompiler, definition.template);
  }
}

const TOP_LEVEL_MANAGER = new TopLevelOutletComponentManager();


export class TopLevelOutletComponentDefinition extends ComponentDefinition {
  constructor(instance) {
    super('outlet', TOP_LEVEL_MANAGER, instance);
    this.template = instance.template;
    generateGuid(this);
  }
}

class TopLevelOutletLayoutCompiler {
  constructor(template) {
    this.template = template;
  }

  compile(builder) {
    builder.wrapLayout(this.template.asLayout());
    builder.tag.static('div');
    builder.attrs.static('id', 'ember' + guidFor(this));
    builder.attrs.static('class', 'ember-view');
  }
}

TopLevelOutletLayoutCompiler.id = 'top-level-outlet';

class OutletComponentDefinition extends ComponentDefinition {
  constructor(outletName, template) {
    super('outlet', MANAGER, null);
    this.outletName = outletName;
    this.template = template;
    generateGuid(this);
  }
}

export class OutletLayoutCompiler {
  constructor(template) {
    this.template = template;
  }

  compile(builder) {
    builder.wrapLayout(this.template.asLayout());
  }
}

OutletLayoutCompiler.id = 'outlet';
