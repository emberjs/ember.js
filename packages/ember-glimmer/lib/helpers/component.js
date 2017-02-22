/**
  @module ember
  @submodule ember-glimmer
*/
import { assign } from 'ember-utils';
import { CachedReference } from '../utils/references';
import {
  CurlyComponentDefinition,
  validatePositionalParameters
} from '../syntax/curly-component';
import {
  EvaluatedArgs,
  EvaluatedNamedArgs,
  EvaluatedPositionalArgs,
  isComponentDefinition
} from '@glimmer/runtime';
import { assert, runInDebug } from 'ember-metal';

/**
  The `{{component}}` helper lets you add instances of `Ember.Component` to a
  template. See [Ember.Component](/api/classes/Ember.Component.html) for
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
  export default Ember.Controller.extend({
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
  export default Ember.Controller.extend({
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
export class ClosureComponentReference extends CachedReference {
  static create(args, symbolTable, env) {
    return new ClosureComponentReference(args, symbolTable, env);
  }

  constructor(args, symbolTable, env) {
    super();
    
    let firstArg = args.positional.at(0);
    this.defRef = firstArg;
    this.tag = firstArg.tag;
    this.env = env;
    this.symbolTable = symbolTable;
    this.args = args;
    this.lastDefinition = undefined;
    this.lastName = undefined;
  }

  compute() {
    // TODO: Figure out how to extract this because it's nearly identical to
    // DynamicComponentReference::compute(). The only differences besides
    // currying are in the assertion messages.
    let { args, defRef, env, symbolTable, lastDefinition, lastName } = this;
    let nameOrDef = defRef.value();
    let definition = null;

    if (nameOrDef && nameOrDef === lastName) {
      return lastDefinition;
    }

    this.lastName = nameOrDef;

    if (typeof nameOrDef === 'string') {
      assert('You cannot use the input helper as a contextual helper. Please extend Ember.TextField or Ember.Checkbox to use it as a contextual component.', nameOrDef !== 'input');
      assert('You cannot use the textarea helper as a contextual helper. Please extend Ember.TextArea to use it as a contextual component.', nameOrDef !== 'textarea');
      definition = env.getComponentDefinition([nameOrDef], symbolTable);
      assert(`The component helper cannot be used without a valid component name. You used "${nameOrDef}" via (component "${nameOrDef}")`, definition);
    } else if (isComponentDefinition(nameOrDef)) {
      definition = nameOrDef;
    } else {
      assert(
        `You cannot create a component from ${nameOrDef} using the {{component}} helper`,
        nameOrDef
      );
      return null;
    }

    let newDef = createCurriedDefinition(definition, args);

    this.lastDefinition = newDef;

    return newDef;
  }
}

function createCurriedDefinition(definition, args) {
  let curriedArgs = curryArgs(definition, args);

  return new CurlyComponentDefinition(
    definition.name,
    definition.ComponentClass,
    definition.template,
    curriedArgs
  );
}

let EMPTY_BLOCKS = {
  default: null,
  inverse: null
};

runInDebug(() => {
  EMPTY_BLOCKS = Object.freeze(EMPTY_BLOCKS);
});

function curryArgs(definition, newArgs) {
  let { args, ComponentClass } = definition;
  let positionalParams = ComponentClass.class.positionalParams;

  // The args being passed in are from the (component ...) invocation,
  // so the first positional argument is actually the name or component
  // definition. It needs to be dropped in order for any actual positional
  // args to coincide with the ComponentClass's positionParams.

  // For "normal" curly components this slicing is done at the syntax layer,
  // but we don't have that luxury here.

  let [, ...slicedPositionalArgs] = newArgs.positional.values;

  if (positionalParams && slicedPositionalArgs.length) {
    validatePositionalParameters(newArgs.named, slicedPositionalArgs, positionalParams);
  }

  let isRest = typeof positionalParams === 'string';

  // For non-rest position params, we need to perform the position -> name mapping
  // at each layer to avoid a collision later when the args are used to construct
  // the component instance (inside of processArgs(), inside of create()).
  let positionalToNamedParams = {};

  if (!isRest && positionalParams && positionalParams.length > 0) {
    let limit = Math.min(positionalParams.length, slicedPositionalArgs.length);

    for (let i = 0; i < limit; i++) {
      let name = positionalParams[i];
      positionalToNamedParams[name] = slicedPositionalArgs[i];
    }

    slicedPositionalArgs.length = 0; // Throw them away since you're merged in.
  }

  // args (aka 'oldArgs') may be undefined or simply be empty args, so
  // we need to fall back to an empty array or object.
  let oldNamed = args && args.named && args.named.map || {};
  let oldPositional = args && args.positional && args.positional.values || [];

  // Merge positional arrays
  let mergedPositional = new Array(Math.max(oldPositional.length, slicedPositionalArgs.length));
  mergedPositional.splice(0, oldPositional.length, ...oldPositional);
  mergedPositional.splice(0, slicedPositionalArgs.length, ...slicedPositionalArgs);

  // Merge named maps
  let mergedNamed = assign({}, oldNamed, positionalToNamedParams, newArgs.named.map);

  let mergedArgs = EvaluatedArgs.create(
    EvaluatedPositionalArgs.create(mergedPositional),
    EvaluatedNamedArgs.create(mergedNamed),
    EMPTY_BLOCKS
  );

  return mergedArgs;
}

export default function(vm, args, symbolTable) {
  return ClosureComponentReference.create(args, symbolTable, vm.env);
}
