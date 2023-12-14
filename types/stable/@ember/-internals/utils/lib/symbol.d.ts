declare module '@ember/-internals/utils/lib/symbol' {
  export function isInternalSymbol(possibleSymbol: string): boolean;
  export function enumerableSymbol(debugName: string): string;
  export const symbol: SymbolConstructor;
}
