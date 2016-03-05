import { StatementSyntax } from 'glimmer-runtime';

export class DynamicComponentSyntax extends StatementSyntax {
  constructor({ args, templates }) {
    super();
    this.args = args;
    this.definition = dynamicComponentFor;
    this.templates = templates;
    this.shadow = null;
  }

  compile(builder) {
    builder.component.dynamic(this);
  }
}

function dynamicComponentFor(args, env) {
  let nameRef = args.positional.at(0);
  return new DynamicComponentReference({ nameRef, env });
}

class DynamicComponentReference {
  constructor({ nameRef, env }) {
    this.nameRef = nameRef;
    this.env = env;
  }

  isDirty() { return true; }

  value() {
    let { env, nameRef } = this;

    let name = nameRef.value();

    if (typeof name === 'string') {
      return env.getComponentDefinition([name]);
    } else {
      throw new Error(`Cannot render ${name} as a component`);
    }
  }

  destroy() {}
}
