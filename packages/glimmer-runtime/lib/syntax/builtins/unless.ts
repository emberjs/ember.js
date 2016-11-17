import {
  Statement as StatementSyntax
} from '../../syntax';

import * as Syntax from '../core';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';

import Environment from '../../environment';

export default class UnlessSyntax extends StatementSyntax {
  type = "unless-statement";

  constructor(public args: Syntax.Args) {
    super();
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

    let { args, args: { templates } } = this;

    dsl.putArgs(args);
    dsl.test('environment');

    dsl.block({ templates }, dsl => {
      if (templates.inverse) {
        dsl.jumpIf('ELSE');
        dsl.evaluate('default', templates.default);
        dsl.jump('END');
        dsl.label('ELSE');
        dsl.evaluate('inverse', templates.inverse);
      } else {
        dsl.jumpIf('END');
        dsl.evaluate('default', templates.default);
      }
    });
  }
}
