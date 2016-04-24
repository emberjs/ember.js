import { ArgsSyntax, StatementSyntax } from 'glimmer-runtime';

class DynamicComponentLookup {
  constructor(args) {
    this.args = ArgsSyntax.fromPositionalArgs(args.positional.slice(0, 1));
    this.factory = dynamicComponentFor;
  }
}

function dynamicComponentFor(args, vm) {
  let nameRef = args.positional.at(0);
  let env = vm.env;
  return new DynamicComponentReference({ nameRef, env });
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

    let name = nameRef.value();

    if (typeof name === 'string') {
      return env.getComponentDefinition([name]);
    } else {
      throw new Error(`Cannot render ${name} as a component`);
    }
  }
}
