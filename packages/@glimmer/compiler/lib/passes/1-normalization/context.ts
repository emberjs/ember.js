import { ASTv2, SymbolTable } from '@glimmer/syntax';

import { OptionalList } from '../../shared/list';
import { Result } from '../../shared/result';
import * as mir from '../2-encoding/mir';
import { VISIT_STMTS } from './visitors/statements';

/**
 * This is the mutable state for this compiler pass.
 */
export class NormalizationState {
  _currentScope: SymbolTable;
  _cursorCount = 0;

  constructor(block: SymbolTable, readonly isStrict: boolean) {
    this._currentScope = block;
  }

  generateUniqueCursor(): string {
    return `%cursor:${this._cursorCount++}%`;
  }

  get scope(): SymbolTable {
    return this._currentScope;
  }

  visitBlock(block: ASTv2.Block): Result<OptionalList<mir.Statement>> {
    let oldBlock = this._currentScope;
    this._currentScope = block.scope;

    try {
      return VISIT_STMTS.visitList(block.body, this);
    } finally {
      this._currentScope = oldBlock;
    }
  }
}
