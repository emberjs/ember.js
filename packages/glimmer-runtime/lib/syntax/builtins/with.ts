import {
  Statement as StatementSyntax
} from '../../syntax';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';

import * as Syntax from '../core';
import Environment from '../../environment';

export default class WithSyntax extends StatementSyntax {
  type = "with-statement";

  constructor(public args: Syntax.Args) {
    super();
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
