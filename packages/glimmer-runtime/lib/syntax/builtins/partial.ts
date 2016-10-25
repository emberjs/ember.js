import { Opaque } from "glimmer-util";

import {
  CompileInto,
  SymbolLookup,
  Statement as StatementSyntax,
  Expression as ExpressionSyntax
} from '../../syntax';

import SymbolTable from '../../symbol-table';

import {
  LabelOpcode,
  EnterOpcode,
  PutValueOpcode,
  SimpleTest,
  TestOpcode,
  JumpUnlessOpcode,
  ExitOpcode
} from '../../compiled/opcodes/vm';

import {
  PutPartialDefinitionOpcode,
  PutDynamicPartialDefinitionOpcode,
  EvaluatePartialOpcode
} from '../../compiled/opcodes/partial';

import * as Syntax from '../core';
import Environment from '../../environment';

export class StaticPartialSyntax extends StatementSyntax {
  public type = "static-partial";

  constructor(private name: Syntax.Value<any>) {
    super();
  }

  compile(compiler: CompileInto & SymbolLookup, env: Environment, symbolTable: SymbolTable) {
    let name = String(this.name.inner());

    if (!env.hasPartial(name, symbolTable)) {
      throw new Error(`Compile Error: ${name} is not a partial`);
    }

    let definition = env.lookupPartial(name, symbolTable);

    compiler.append(new PutPartialDefinitionOpcode(definition));
    compiler.append(new EvaluatePartialOpcode(symbolTable));
  }
}

export class DynamicPartialSyntax extends StatementSyntax {
  public type = "dynamic-partial";

  constructor(private name: ExpressionSyntax<Opaque>) {
    super();
  }

  compile(compiler: CompileInto & SymbolLookup, env: Environment, symbolTable: SymbolTable) {
    let name = this.name.compile(compiler, env, symbolTable);

    /*
    //        PutArgs
    //        Enter(BEGIN, END)
    // BEGIN: Noop
    //        NameToPartial
    //        Test
    //        JumpUnless(END)
    //        EvaluatePartial
    // END:   Noop
    //        Exit
    */

    let BEGIN = new LabelOpcode("BEGIN");
    let END = new LabelOpcode("END");

    compiler.append(new PutValueOpcode(name));
    compiler.append(new EnterOpcode(BEGIN, END));
    compiler.append(BEGIN);
    compiler.append(new TestOpcode(SimpleTest));
    compiler.append(new JumpUnlessOpcode(END));
    compiler.append(new PutDynamicPartialDefinitionOpcode(symbolTable));
    compiler.append(new EvaluatePartialOpcode(symbolTable));
    compiler.append(END);
    compiler.append(new ExitOpcode());
  }
}
