declare module "handlebars/compiler/base" {
  export function parse(html: string): any;
}

declare module "simple-html-tokenizer" {
  export const HTML5NamedCharRefs: CharRef;

  export class EntityParser {
    constructor(ref: CharRef);
  }

  export class EventedTokenizer {
    constructor(object: Object, parser: EntityParser);
    state: string;
    line: number;
    column: number;
    tokenizePart(part: string): void;
    flushData(): void;
  }

  export function tokenize(html: string): any;

  export interface CharRef {
    [namedRef: string]: string;
  }
}