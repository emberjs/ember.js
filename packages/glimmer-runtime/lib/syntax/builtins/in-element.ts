import {
  Statement as StatementSyntax
} from '../../syntax';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';
import * as Syntax from '../core';
import Environment from '../../environment';

export default class InElementSyntax extends StatementSyntax {
  type = "in-element-statement";

  constructor(private args: Syntax.Args) {
    super();
  }

  compile(dsl: OpcodeBuilderDSL, env: Environment) {
    let { args, args: { blocks } } = this;

    dsl.putArgs(args);
    dsl.test('simple');

    dsl.block(null, (dsl, BEGIN, END) => {
      dsl.jumpUnless(END);
      dsl.pushRemoteElement();
      dsl.evaluate('default', blocks.default);
      dsl.popRemoteElement();
    });
  }
}
