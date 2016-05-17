import { ArgsSyntax, StatementSyntax } from 'glimmer-runtime';
import { ConstReference, isConst } from 'glimmer-reference';
import { assert } from 'ember-metal/debug';

class DynamicComponentLookup {
  constructor(args, isBlock) {
    this.args = ArgsSyntax.fromPositionalArgs(args.positional.slice(0, 1));
    this.factory = (args, options) => dynamicComponentFor(args, options, isBlock);
  }
}

function dynamicComponentFor(args, { env }, isBlock) {
  let nameRef = args.positional.at(0);

  if (isConst(nameRef)) {
    return new ConstReference(lookup(env, nameRef.value(), isBlock));
  } else {
    return new DynamicComponentReference({ nameRef, env, isBlock });
  }
}

export class DynamicComponentSyntax extends StatementSyntax {
  constructor({ args, templates, isBlock }) {
    super();
    this.definition = new DynamicComponentLookup(args, isBlock);
    this.args = ArgsSyntax.build(args.positional.slice(1), args.named);
    this.templates = templates;
    this.shadow = null;
  }

  compile(builder) {
    builder.component.dynamic(this);
  }
}

class DynamicComponentReference {
  constructor({ nameRef, env, isBlock }) {
    this.nameRef = nameRef;
    this.env = env;
    this.tag = nameRef.tag;
    this.isBlock = isBlock;
  }

  value() {
    let { env, nameRef, isBlock } = this;
    return lookup(env, nameRef.value(), isBlock);
  }
}

function lookup(env, name, isBlock) {
  if (typeof name === 'string') {
    let componentDefinition = env.createComponentDefinition([name], isBlock);
    assert(`Glimmer error: Could not find component named "${name}" (no component or template with that name was found)`, componentDefinition);

    return componentDefinition;
  } else {
    throw new Error(`Cannot render ${name} as a component`);
  }
}

