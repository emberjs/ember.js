import { ASTv2, SymbolTable } from '@glimmer/syntax';

import { OptionalList } from '../../shared/list';
import { Result } from '../../shared/result';
import * as mir from '../2-encoding/mir';
import { VISIT_STMTS } from './visitors/statements';

/**
 * This is the mutable state for this compiler pass.
 */
export class NormalizationState {
  #currentScope: SymbolTable;

  constructor(block: SymbolTable, private cursorCount = 0) {
    this.#currentScope = block;
  }

  generateUniqueCursor(): string {
    return `%cursor:${this.cursorCount++}%`;
  }

  get scope(): SymbolTable {
    return this.#currentScope;
  }

  visitBlock(block: ASTv2.Block): Result<OptionalList<mir.Statement>> {
    let oldBlock = this.#currentScope;
    this.#currentScope = block.scope;

    try {
      return VISIT_STMTS.visitList(block.body, this);
    } finally {
      this.#currentScope = oldBlock;
    }
  }
}
