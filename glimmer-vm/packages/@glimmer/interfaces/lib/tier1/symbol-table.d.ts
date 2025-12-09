export interface ProgramSymbolTable {
  symbols: string[];
}

export interface BlockSymbolTable {
  parameters: number[];
}

export type SymbolTable = ProgramSymbolTable | BlockSymbolTable;
