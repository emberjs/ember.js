import { assert } from "glimmer-util";

import {
  CompileInto,
  SymbolLookup,
  Statement as StatementSyntax
} from '../../syntax';

import SymbolTable from '../../symbol-table';

import {
  LabelOpcode,
  EnterOpcode,
  PutArgsOpcode,
  SimpleTest,
  TestOpcode,
  JumpUnlessOpcode,
  NameToPartialOpcode,
  EvaluatePartialOpcode,
  ExitOpcode
} from '../../compiled/opcodes/vm';

import * as Syntax from '../core';
import Environment from '../../environment';

export default class PartialSyntax extends StatementSyntax {
  type = "partial-statement";

  public args: Syntax.Args;
  public isStatic = false;
  private symbolTable: SymbolTable;

  constructor({ args, symbolTable }: { args: Syntax.Args, symbolTable: SymbolTable }) {
    super();
    this.args = args;
    this.symbolTable = symbolTable;
  }

  compile(compiler: CompileInto & SymbolLookup, env: Environment, symbolTable: SymbolTable) {

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

    let compiledPartialNameExpression = this.args.positional.values[0].compile(compiler, env, symbolTable);

    let BEGIN = new LabelOpcode("BEGIN");
    let END = new LabelOpcode("END");

    compiler.append(new EnterOpcode(BEGIN, END));
    compiler.append(BEGIN);
    compiler.append(new PutArgsOpcode(this.args.compile(compiler, env, symbolTable)));
    compiler.append(new NameToPartialOpcode(this.symbolTable));
    compiler.append(new TestOpcode(SimpleTest));

    compiler.append(new JumpUnlessOpcode(END));
    compiler.append(new EvaluatePartialOpcode(
      compiledPartialNameExpression,
      symbolTable
    ));

    compiler.append(END);
    compiler.append(new ExitOpcode());
  }
}
