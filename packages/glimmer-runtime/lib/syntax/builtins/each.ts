import {
  Statement as StatementSyntax
} from '../../syntax';

import * as Syntax from '../core';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';

import Environment from '../../environment';

import { unwrap } from 'glimmer-util';

export default class EachSyntax extends StatementSyntax {
  type = "each-statement";

  constructor(public args: Syntax.Args) {
    super();
  }

  compile(dsl: OpcodeBuilderDSL) {
    //         Enter(BEGIN, END)
    // BEGIN:  Noop
    //         PutArgs
    //         PutIterable
    //         JumpUnless(ELSE)
    //         EnterList(BEGIN2, END2)
    // ITER:   Noop
    //         NextIter(BREAK)
    //         EnterWithKey(BEGIN2, END2)
    // BEGIN2: Noop
    //         PushChildScope
    //         Evaluate(default)
    //         PopScope
    // END2:   Noop
    //         Exit
    //         Jump(ITER)
    // BREAK:  Noop
    //         ExitList
    //         Jump(END)
    // ELSE:   Noop
    //         Evalulate(inverse)
    // END:    Noop
    //         Exit

    let { args, args: { blocks } } = this;

    dsl.block(args, (dsl, BEGIN, END) => {
      dsl.putIterator();

      if (blocks.inverse) {
        dsl.jumpUnless('ELSE');
      } else {
        dsl.jumpUnless(END);
      }

      dsl.iter((dsl, BEGIN, END) => {
        dsl.evaluate('default', unwrap(blocks.default));
      });

      if (blocks.inverse) {
        dsl.jump(END);
        dsl.label('ELSE');
        dsl.evaluate('inverse', blocks.inverse);
      }
    });
  }
}
