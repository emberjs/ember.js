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

    let { args, args: { blocks } } = this;

    dsl.putArgs(args);
    dsl.test('environment');

    dsl.block(null, (dsl, BEGIN, END) => {
      if (blocks.inverse) {
        dsl.jumpUnless('ELSE');
        dsl.evaluate('default', blocks.default);
        dsl.jump(END);
        dsl.label('ELSE');
        dsl.evaluate('inverse', blocks.inverse);
      } else {
        dsl.jumpUnless(END);
        dsl.evaluate('default', blocks.default);
      }
    });
  }
}
