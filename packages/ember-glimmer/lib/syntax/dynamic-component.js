import {
  ArgsSyntax,
  StatementSyntax,
  GetSyntax,
  PositionalArgsSyntax
} from 'glimmer-runtime';
import { UNDEFINED_REFERENCE } from 'glimmer-reference';
import { isClosureComponent } from '../helpers/component';
import { assert } from 'ember-metal/debug';

function dynamicComponentFor(vm) {
  let env     = vm.env;
  let args    = vm.getArgs();
  let nameRef = args.positional.at(0);
  let { parentMeta } = this;

  return new DynamicComponentReference({ nameRef, env, parentMeta });
}

export class DynamicComponentSyntax extends StatementSyntax {
  // for {{component componentName}}
  static create({ args, templates, parentMeta }) {
    let definitionArgs = ArgsSyntax.fromPositionalArgs(args.positional.slice(0, 1));
    let invocationArgs = ArgsSyntax.build(args.positional.slice(1), args.named);
    return new this({ definitionArgs, args: invocationArgs, templates, parentMeta });
  }

  // Transforms {{foo.bar with=args}} or {{#foo.bar with=args}}{{/foo.bar}}
  // into {{component foo.bar with=args}} or
  // {{#component foo.bar with=args}}{{/component}}
  // with all of it's arguments
  static fromPath({ path, args, templates, parentMeta }) {
    let positional = ArgsSyntax.fromPositionalArgs(PositionalArgsSyntax.build([GetSyntax.build(path.join('.'))]));

    return new this({ definitionArgs: positional, args, templates, parentMeta });
  }

  constructor({ definitionArgs, args, templates, parentMeta }) {
    super();
    this.definition = dynamicComponentFor.bind(this);
    this.definitionArgs = definitionArgs;
    this.args = args;
    this.templates = templates;
    this.shadow = null;
    this.parentMeta = parentMeta;
  }

  compile(builder) {
    builder.component.dynamic(this);
  }
}

class DynamicComponentReference {
  constructor({ nameRef, env, parentMeta, args }) {
    this.tag = nameRef.tag;
    this.nameRef = nameRef;
    this.env = env;
    this.parentMeta = parentMeta;
    this.args = args;
  }

  value() {
    let { env, nameRef, parentMeta } = this;
    let nameOrDef = nameRef.value();

    if (typeof nameOrDef === 'string') {
      let definition = env.getComponentDefinition([nameOrDef], parentMeta);

      assert(`Could not find component named "${nameOrDef}" (no component or template with that name was found)`, definition);

      return definition;
    } else if (isClosureComponent(nameOrDef)) {
      return nameOrDef;
    } else {
      return null;
    }
  }

  get() {
    return UNDEFINED_REFERENCE;
  }
}
