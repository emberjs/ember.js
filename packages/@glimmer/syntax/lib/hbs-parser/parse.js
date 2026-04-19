import { parse as peggyParse } from './parser.js';

export function parseTemplate(input, options) {
  return peggyParse(input, {
    startRule: 'Template',
    grammarSource: options?.srcName,
  });
}
