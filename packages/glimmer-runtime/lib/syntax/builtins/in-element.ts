import {
  Statement as StatementSyntax
} from '../../syntax';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';
import * as Syntax from '../core';
import Environment from '../../environment';

export default class InElementSyntax extends StatementSyntax {
  type = "in-element-statement";

  public args: Syntax.Args;
  public templates: Syntax.Templates;
  public isStatic = false;

  constructor({ args, templates }: { args: Syntax.Args, templates: Syntax.Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  compile(dsl: OpcodeBuilderDSL, env: Environment) {
    let { args, templates } = this;

    dsl.putArgs(args);
    dsl.test('simple');

    dsl.block({ templates }, (dsl, BEGIN, END) => {
      dsl.jumpUnless(END);
      dsl.pushRemoteElement();
      dsl.evaluate('default', templates.default);
      dsl.popRemoteElement();
    });
  }
}
