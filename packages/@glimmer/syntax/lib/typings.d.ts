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

  export namespace Tokens {
    export type Attribute = [string, string, boolean];

    export interface Base {
      syntaxError?: string;
      loc: {
        start: { line: number, column: number },
        end: { line: number, column: number }
      };
    }

    export interface Chars extends Base {
      type: 'Chars';
      chars: string;
    }

    export interface Comment extends Base {
      type: 'Comment';
      chars: string;
    }

    export interface StartTag extends Base {
      type: 'StartTag';
      tagName: string;
      attributes: Attribute[];
      selfClosing?: boolean;
    }

    export interface EndTag extends Base {
      type: 'EndTag';
      tagName: string;
    }

    export type Token = Chars | Comment | StartTag | EndTag;
  }

  export type Token = Tokens.Token;
  export type Attribute = Tokens.Attribute;

  export function tokenize(html: string, opts?: any): Token[];

  export interface CharRef {
    [namedRef: string]: string;
  }
}