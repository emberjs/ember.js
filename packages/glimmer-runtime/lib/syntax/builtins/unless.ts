import {
  Statement as StatementSyntax
} from '../../syntax';

import * as Syntax from '../core';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';

import Environment from '../../environment';

export default class UnlessSyntax extends StatementSyntax {
  type = "unless-statement";

  public args: Syntax.Args;
  public templates: Syntax.Templates;
  public isStatic = false;

  constructor({ args, templates }: { args: Syntax.Args, templates: Syntax.Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  compile(dsl: OpcodeBuilderDSL, env: Environment) {
    //        PutArgs
    //        Enter(BEGIN, END)
    // BEGIN: Noop
    //        Test(Environment)
    //        JumpIf(ELSE)
    //        Evaluate(default)
    //        Jump(END)
    // ELSE:  Noop
    //        Evalulate(inverse)
    // END:   Noop
    //        Exit

    let { args, templates } = this;

    dsl.block({ templates, args }, dsl => {
      dsl.test('environment');

      if (templates.inverse) {
        dsl.jumpIf('ELSE');
        dsl.evaluate('default');
        dsl.jump('END');
        dsl.label('ELSE');
        dsl.evaluate('inverse');
      } else {
        dsl.jumpIf('END');
        dsl.evaluate('default');
      }
    });
  }
}
