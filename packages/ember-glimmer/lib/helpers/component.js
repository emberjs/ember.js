import { CachedReference } from '../utils/references';
import { CurlyComponentDefinition, validatePositionalParameters } from '../syntax/curly-component';
import { EvaluatedArgs, EvaluatedNamedArgs, EvaluatedPositionalArgs, isComponentDefinition } from 'glimmer-runtime';
import { assert } from 'ember-metal/debug';
import assign from 'ember-metal/assign';

export class ClosureComponentReference extends CachedReference {
  static create(args, symbolTable, env) {
    return new ClosureComponentReference(args, symbolTable, env);
  }

  constructor(args, symbolTable, env) {
    super();
    this.defRef = args.positional.at(0);
    this.env = env;
    this.tag = args.positional.at(0).tag;
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

function curryArgs(definition, newArgs) {
  let { args, ComponentClass } = definition;
  let { positionalParams } = ComponentClass;

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
    EvaluatedNamedArgs.create(mergedNamed)
  );

  return mergedArgs;
}

export default {
  isInternalHelper: true,

  toReference(args, env) {
    // TODO: Need to figure out what to do about symbolTable here.
    return ClosureComponentReference.create(args, null, env);
  }
};
