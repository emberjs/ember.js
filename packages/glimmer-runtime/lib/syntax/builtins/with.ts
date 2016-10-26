import {
  Statement as StatementSyntax
} from '../../syntax';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';

import * as Syntax from '../core';
import Environment from '../../environment';

export default class WithSyntax extends StatementSyntax {
  type = "with-statement";

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
    //        Test(Environment)
    //        Enter(BEGIN, END)
    // BEGIN: Noop
    //        JumpUnless(ELSE)
    //        Evaluate(default)
    //        Jump(END)
    // ELSE:  Noop
    //        Evaluate(inverse)
    // END:   Noop
    //        Exit

    let { args, templates } = this;

    dsl.putArgs(args);
    dsl.test('environment');

    dsl.block({ templates }, (dsl, BEGIN, END) => {
      if (templates.inverse) {
        dsl.jumpUnless('ELSE');
        dsl.evaluate('default');
        dsl.jump(END);
        dsl.label('ELSE');
        dsl.evaluate('inverse');
      } else {
        dsl.jumpUnless(END);
        dsl.evaluate('default');
      }
    });
  }
}
