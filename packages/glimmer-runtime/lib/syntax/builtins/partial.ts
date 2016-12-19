import { Opaque } from "glimmer-util";

import {
  Statement as StatementSyntax,
  Expression as ExpressionSyntax
} from '../../syntax';

import { SymbolTable } from 'glimmer-interfaces';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';

import * as Syntax from '../core';
import Environment from '../../environment';

export class StaticPartialSyntax extends StatementSyntax {
  public type = "static-partial";

  constructor(private name: string) {
    super();
  }

  compile(dsl: OpcodeBuilderDSL) {
    let name = this.name;

    if (!dsl.env.hasPartial(name, dsl.symbolTable)) {
      throw new Error(`Compile Error: Could not find a partial named "${name}"`);
    }

    let definition = dsl.env.lookupPartial(name, dsl.symbolTable);

    dsl.putPartialDefinition(definition);
    dsl.evaluatePartial();
  }
}

export class DynamicPartialSyntax extends StatementSyntax {
  public type = "dynamic-partial";

  constructor(private name: ExpressionSyntax<Opaque>) {
    super();
  }

  compile(dsl: OpcodeBuilderDSL) {
    let { name } = this;

    dsl.startLabels();

    dsl.putValue(name);
    dsl.test('simple');
    dsl.enter('BEGIN', 'END');
    dsl.label('BEGIN');
    dsl.jumpUnless('END');
    dsl.putDynamicPartialDefinition();
    dsl.evaluatePartial();
    dsl.label('END');
    dsl.exit();

    dsl.stopLabels();
  }
}
