import {
  ArgsSyntax,
  StatementSyntax,
  GetSyntax,
  PositionalArgsSyntax,
  isComponentDefinition
} from 'glimmer-runtime';
import { UNDEFINED_REFERENCE } from 'glimmer-reference';
import { assert } from 'ember-metal/debug';

function dynamicComponentFor(vm) {
  let env     = vm.env;
  let args    = vm.getArgs();
  let nameRef = args.positional.at(0);
  let { symbolTable } = this;

  return new DynamicComponentReference({ nameRef, env, symbolTable });
}

export class DynamicComponentSyntax extends StatementSyntax {
  // for {{component componentName}}
  static create({ args, templates, symbolTable }) {
    let definitionArgs = ArgsSyntax.fromPositionalArgs(args.positional.slice(0, 1));
    let invocationArgs = ArgsSyntax.build(args.positional.slice(1), args.named);
    return new this({ definitionArgs, args: invocationArgs, templates, symbolTable });
  }

  // Transforms {{foo.bar with=args}} or {{#foo.bar with=args}}{{/foo.bar}}
  // into {{component foo.bar with=args}} or
  // {{#component foo.bar with=args}}{{/component}}
  // with all of it's arguments
  static fromPath({ path, args, templates, symbolTable }) {
    let positional = ArgsSyntax.fromPositionalArgs(PositionalArgsSyntax.build([GetSyntax.build(path.join('.'))]));

    return new this({ definitionArgs: positional, args, templates, symbolTable });
  }

  constructor({ definitionArgs, args, templates, symbolTable }) {
    super();
    this.definition = dynamicComponentFor.bind(this);
    this.definitionArgs = definitionArgs;
    this.args = args;
    this.templates = templates;
    this.symbolTable = symbolTable;
    this.shadow = null;
  }

  compile(builder) {
    builder.component.dynamic(this.definitionArgs, this.definition, this.args, this.templates, this.symbolTable, this.shadow);
  }
}

class DynamicComponentReference {
  constructor({ nameRef, env, symbolTable, args }) {
    this.tag = nameRef.tag;
    this.nameRef = nameRef;
    this.env = env;
    this.symbolTable = symbolTable;
    this.args = args;
  }

  value() {
    let { env, nameRef, symbolTable } = this;
    let nameOrDef = nameRef.value();

    if (typeof nameOrDef === 'string') {
      let definition = env.getComponentDefinition([nameOrDef], symbolTable);

      assert(`Could not find component named "${nameOrDef}" (no component or template with that name was found)`, definition);

      return definition;
    } else if (isComponentDefinition(nameOrDef)) {
      return nameOrDef;
    } else {
      return null;
    }
  }

  get() {
    return UNDEFINED_REFERENCE;
  }
}
