import {
  Statement as StatementSyntax
} from '../../syntax';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';
import * as Syntax from '../core';
import Environment from '../../environment';

export default class WithDynamicVarsSyntax extends StatementSyntax {
  type = "with-dynamic-vars-statement";

  constructor(private args: Syntax.Args) {
    super();
  }

  compile(dsl: OpcodeBuilderDSL, env: Environment) {
    let { args, args: { blocks } } = this;

    dsl.unit(dsl => {
      dsl.putArgs(args);
      dsl.pushDynamicScope();
      dsl.bindDynamicScope(args.named.keys);
      dsl.evaluate('default', blocks.default);
      dsl.popDynamicScope();
    });
  }
}
