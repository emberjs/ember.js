export type Keywords = keyof typeof KEYWORDS_TYPES;
export type KeywordType = 'Call' | 'Modifier' | 'Append' | 'Block';

export function isKeyword(word: string): word is Keywords;
export function isKeyword(word: string, type: KeywordType): boolean;
export function isKeyword(word: string, type?: KeywordType): boolean {
  if (word in KEYWORDS_TYPES) {
    if (type === undefined) {
      return true;
    } else {
      let types = KEYWORDS_TYPES[word as Keywords];
      // This seems like a TypeScript bug – it inferred types as never[]?
      return types.includes(type as never);
    }
  } else {
    return false;
  }
}

/**
 * This includes the full list of keywords currently in use in the template
 * language, and where their valid usages are.
 */
export const KEYWORDS_TYPES = {
  action: ['Call', 'Modifier'],
  component: ['Call', 'Append', 'Block'],
  debugger: ['Append'],
  'each-in': ['Block'],
  each: ['Block'],
  'has-block-params': ['Call', 'Append'],
  'has-block': ['Call', 'Append'],
  helper: ['Call', 'Append'],
  if: ['Call', 'Append', 'Block'],
  'in-element': ['Block'],
  let: ['Block'],
  log: ['Call', 'Append'],
  modifier: ['Call', 'Modifier'],
  mount: ['Append'],
  mut: ['Call', 'Append'],
  outlet: ['Append'],
  readonly: ['Call', 'Append'],
  unbound: ['Call', 'Append'],
  unless: ['Call', 'Append', 'Block'],
  yield: ['Append'],
} satisfies Record<string, readonly KeywordType[]>;
