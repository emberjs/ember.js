import { assert } from "glimmer-util";

import {
  CompileInto,
  SymbolLookup,
  Statement as StatementSyntax
} from '../../syntax';

import {
  LabelOpcode,
  EnterOpcode,
  PutArgsOpcode,
  TestOpcode,
  JumpUnlessOpcode,
  NameToPartialOpcode,
  EvaluatePartialOpcode,
  ExitOpcode
} from '../../compiled/opcodes/vm';

import * as Syntax from '../core';
import Environment from '../../environment';
import { Block } from '../../compiled/blocks';

export default class PartialSyntax extends StatementSyntax {
  type = "partial-statement";

  public args: Syntax.Args;
  public isStatic = false;

  constructor({ args }: { args: Syntax.Args }) {
    super();
    this.args = args;
  }

  prettyPrint() {
    return `partial ${this.args.prettyPrint()}`;
  }

  compile(compiler: CompileInto & SymbolLookup, env: Environment, block: Block) {

    /*
    //        Enter(BEGIN, END)
    // BEGIN: Noop
    //        PutArgs
    //        NameToPartial
    //        Test
    //        JumpUnless(END)
    //        EvaluatePartial
    // END:   Noop
    //        Exit
    */

    assert(this.args.positional.values.length > 0, `Partial found with no arguments. You must specify a template.`);
    assert(this.args.positional.values.length < 2, `Partial found with more than one argument. You can only specify a single template.`);

    let compiledPartialNameExpression = this.args.positional.values[0].compile(compiler, env);

    let BEGIN = new LabelOpcode({ label: "BEGIN" });
    let END = new LabelOpcode({ label: "END" });

    compiler.append(new EnterOpcode({ begin: BEGIN, end: END }));
    compiler.append(BEGIN);
    compiler.append(new PutArgsOpcode({ args: this.args.compile(compiler, env) }));
    compiler.append(new NameToPartialOpcode());
    compiler.append(new TestOpcode());

    compiler.append(new JumpUnlessOpcode({ target: END }));
    compiler.append(new EvaluatePartialOpcode({
      name: compiledPartialNameExpression,
      symbolTable: block.symbolTable
    }));

    compiler.append(END);
    compiler.append(new ExitOpcode());
  }
}
