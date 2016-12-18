import {
  Statement as StatementSyntax
} from '../../syntax';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';
import * as Syntax from '../core';
import { BaselineSyntax } from '../../scanner';
import {  } from '../../syntax/functions';
import Environment from '../../environment';
import { unwrap } from 'glimmer-util';

export default class WithDynamicVarsSyntax extends StatementSyntax {
  type = "with-dynamic-vars-statement";

  constructor(private args: Syntax.Args) {
    super();
  }

  compile(dsl: OpcodeBuilderDSL) {
    let { args, args: { blocks } } = this;

    dsl.unit(dsl => {
      dsl.putArgs(args);
      dsl.pushDynamicScope();
      dsl.bindDynamicScope(args.named.keys);
      dsl.evaluate('default', unwrap(blocks.default));
      dsl.popDynamicScope();
    });
  }
}
