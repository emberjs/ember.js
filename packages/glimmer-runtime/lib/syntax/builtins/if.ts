import {
  Statement as StatementSyntax
} from '../../syntax';

import * as Syntax from '../core';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';

export default class IfSyntax extends StatementSyntax {
  type = "if-statement";

  public args: Syntax.Args;
  public templates: Syntax.Templates;
  public isStatic = false;

  constructor({ args, templates }: { args: Syntax.Args, templates: Syntax.Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  compile(dsl: OpcodeBuilderDSL) {
    //        PutArgs
    //        Enter(BEGIN, END)
    // BEGIN: Noop
    //        Test(Environment)
    //        JumpUnless(ELSE)
    //        Evaluate(default)
    //        Jump(END)
    // ELSE:  Noop
    //        Evalulate(inverse)
    // END:   Noop
    //        Exit

    let { args, templates } = this;

    dsl.block({ templates, args }, (dsl, BEGIN, END) => {
      dsl.test('environment');

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
