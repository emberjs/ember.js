import { ArgsSyntax, StatementSyntax } from 'glimmer-runtime';
import { ConstReference, isConst, UNDEFINED_REFERENCE } from 'glimmer-reference';

function dynamicComponentFor(vm) {
  let env     = vm.env;
  let args    = vm.getArgs();
  let nameRef = args.positional.at(0);

  if (isConst(nameRef)) {
    return new ConstReference(env.getComponentDefinition([nameRef.value()]));
  } else {
    return new DynamicComponentReference({ nameRef, env });
  }
}

export class DynamicComponentSyntax extends StatementSyntax {
  constructor({ args, templates }) {
    super();
    this.definitionArgs = ArgsSyntax.fromPositionalArgs(args.positional.slice(0, 1));
    this.definition = dynamicComponentFor;
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
    return env.getComponentDefinition([nameRef.value()]);
  }

  get() {
    return UNDEFINED_REFERENCE;
  }
}
