import {
  Statement as StatementSyntax
} from '../../syntax';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';
import * as Syntax from '../core';
import Environment from '../../environment';
import { unwrap } from 'glimmer-util';

export default class InElementSyntax extends StatementSyntax {
  type = "in-element-statement";

  constructor(private args: Syntax.Args) {
    super();
  }

  compile(dsl: OpcodeBuilderDSL) {
    let { args, args: { blocks } } = this;

    dsl.putArgs(args);
    dsl.test('simple');

    dsl.block(null, (dsl, BEGIN, END) => {
      dsl.jumpUnless(END);
      dsl.pushRemoteElement();
      dsl.evaluate('default', unwrap(blocks.default));
      dsl.popRemoteElement();
    });
  }
}
