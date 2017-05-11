import {
  Option,
  SymbolTable,
} from '@glimmer/interfaces';
import { Statement } from '@glimmer/wire-format';
import { CompiledDynamicTemplate, CompiledStaticTemplate } from '../compiled/blocks';
import Environment from '../environment';
import { debugSlice } from '../opcodes';
import { compileStatements } from './functions';
import { CompilableTemplate as ICompilableTemplate } from './interfaces';

export default class CompilableTemplate<S extends SymbolTable> implements ICompilableTemplate<S> {
  private compiledStatic: Option<CompiledStaticTemplate> = null;
  private compiledDynamic: Option<CompiledDynamicTemplate<S>> = null;

  constructor(public statements: Statement[], public symbolTable: S) {}

  compileStatic(env: Environment): CompiledStaticTemplate {
    let { compiledStatic } = this;

    if (!compiledStatic) {
      let builder = compileStatements(this.statements, this.symbolTable.meta, env);

      let start = builder.start;
      let end = builder.finalize();

      debugSlice(env, start, end);

      compiledStatic = this.compiledStatic = new CompiledStaticTemplate(start, end);
    }

    return compiledStatic;
  }

  compileDynamic(env: Environment): CompiledDynamicTemplate<S> {
    let { compiledDynamic } = this;

    if (!compiledDynamic) {
      let staticBlock = this.compileStatic(env);
      compiledDynamic = new CompiledDynamicTemplate(staticBlock.start, staticBlock.end, this.symbolTable);
    }

    return compiledDynamic;
  }
}
