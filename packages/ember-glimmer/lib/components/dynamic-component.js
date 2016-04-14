import { ArgsSyntax, StatementSyntax } from 'glimmer-runtime';
import { ConstReference, isConst } from 'glimmer-reference';

class DynamicComponentLookup {
  constructor(args) {
    this.args = ArgsSyntax.fromPositionalArgs(args.positional.slice(0, 1));
    this.factory = dynamicComponentFor;
  }
}

function dynamicComponentFor(args, { env }) {
  let nameRef = args.positional.at(0);

  if (isConst(nameRef)) {
    return new ConstReference(lookup(env, nameRef.value()));
  } else {
    return new DynamicComponentReference({ nameRef, env });
  }
}

export class DynamicComponentSyntax extends StatementSyntax {
  constructor({ args, templates }) {
    super();
    this.definition = new DynamicComponentLookup(args);
    this.args = ArgsSyntax.build(args.positional.slice(1), args.named);
    this.templates = templates;
    this.shadow = null;
  }

  compile(builder) {
    builder.component.dynamic(this);
  }
}

class DynamicComponentReference {
  constructor({ nameRef, env }) {
    this.nameRef = nameRef;
    this.env = env;
    this.tag = nameRef.tag;
  }

  value() {
    let { env, nameRef } = this;
    return lookup(env, nameRef.value());
  }
}

function lookup(env, name) {
  if (typeof name === 'string') {
    return env.getComponentDefinition([name]);
  } else {
    throw new Error(`Cannot render ${name} as a component`);
  }
}

