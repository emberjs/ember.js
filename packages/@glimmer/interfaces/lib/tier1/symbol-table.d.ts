export interface ProgramSymbolTable {
  hasDebugger: boolean;
  symbols: string[];
}

export interface BlockSymbolTable {
  parameters: number[];
}

export type SymbolTable = ProgramSymbolTable | BlockSymbolTable;
