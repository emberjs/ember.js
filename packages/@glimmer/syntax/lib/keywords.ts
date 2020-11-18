export type KeywordType = 'Call' | 'Modifier' | 'Append' | 'Block';

export function isKeyword(word: string): boolean {
  return word in KEYWORDS_TYPES;
}

/**
 * This includes the full list of keywords currently in use in the template
 * language, and where their valid usages are.
 */
export const KEYWORDS_TYPES: { [key: string]: KeywordType[] } = {
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
  'link-to': ['Append', 'Block'],
  log: ['Call', 'Append'],
  modifier: ['Call'],
  mount: ['Append'],
  mut: ['Call', 'Append'],
  outlet: ['Append'],
  'query-params': ['Call'],
  readonly: ['Call', 'Append'],
  unbound: ['Call', 'Append'],
  unless: ['Call', 'Append', 'Block'],
  with: ['Block'],
  yield: ['Append'],
};
