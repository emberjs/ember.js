import {
  Statement as StatementSyntax
} from '../../syntax';

import * as Syntax from '../core';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';

import Environment from '../../environment';

import { unreachable } from 'glimmer-util';

export default class UnlessSyntax extends StatementSyntax {
  type = "unless-statement";

  constructor(public args: Syntax.Args) {
    super();
  }

  compile(dsl: OpcodeBuilderDSL) {
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

    let { args, args: { blocks } } = this;

    dsl.putArgs(args);
    dsl.test('environment');

    dsl.block(null, dsl => {
      if (blocks.default && blocks.inverse) {
        dsl.jumpIf('ELSE');
        dsl.evaluate('default', blocks.default);
        dsl.jump('END');
        dsl.label('ELSE');
        dsl.evaluate('inverse', blocks.inverse);
      } else if (blocks.default) {
        dsl.jumpIf('END');
        dsl.evaluate('default', blocks.default);
      } else {
        throw unreachable();
      }
    });
  }
}
