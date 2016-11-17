import {
  Statement as StatementSyntax
} from '../../syntax';

import * as Syntax from '../core';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';

export default class IfSyntax extends StatementSyntax {
  type = "if-statement";

  constructor(public args: Syntax.Args) {
    super();
  }

  compile(dsl: OpcodeBuilderDSL) {
    //        PutArgs
    //        Test(Environment)
    //        Enter(BEGIN, END)
    // BEGIN: Noop
    //        JumpUnless(ELSE)
    //        Evaluate(default)
    //        Jump(END)
    // ELSE:  Noop
    //        Evalulate(inverse)
    // END:   Noop
    //        Exit

    let { args, args: { templates } } = this;

    dsl.putArgs(args);
    dsl.test('environment');

    dsl.block({ templates }, (dsl, BEGIN, END) => {
      if (templates.inverse) {
        dsl.jumpUnless('ELSE');
        dsl.evaluate('default', templates.default);
        dsl.jump(END);
        dsl.label('ELSE');
        dsl.evaluate('inverse', templates.inverse);
      } else {
        dsl.jumpUnless(END);
        dsl.evaluate('default', templates.default);
      }
    });
  }
}
