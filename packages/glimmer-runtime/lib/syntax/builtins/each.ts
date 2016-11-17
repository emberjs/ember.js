import {
  Statement as StatementSyntax
} from '../../syntax';

import * as Syntax from '../core';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';

import Environment from '../../environment';

export default class EachSyntax extends StatementSyntax {
  type = "each-statement";

  constructor(public args: Syntax.Args) {
    super();
  }

  compile(dsl: OpcodeBuilderDSL, env: Environment) {
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

    let { args, args: { templates } } = this;

    dsl.block({ templates, args }, (dsl, BEGIN, END) => {
      dsl.putIterator();

      if (templates.inverse) {
        dsl.jumpUnless('ELSE');
      } else {
        dsl.jumpUnless(END);
      }

      dsl.iter({ templates }, (dsl, BEGIN, END) => {
        dsl.evaluate('default', templates.default);
      });

      if (templates.inverse) {
        dsl.jump(END);
        dsl.label('ELSE');
        dsl.evaluate('inverse', templates.inverse);
      }
    });
  }
}
