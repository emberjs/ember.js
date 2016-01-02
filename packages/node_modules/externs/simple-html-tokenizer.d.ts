declare module "simple-html-tokenizer"{
  export function tokenize(html: string): any;
}

declare module "simple-html-tokenizer/evented-tokenizer" {
  import EntityParser from "simple-html-tokenizer/entity-parser";

  export default class EventedTokenizer {
    constructor(object: Object, parser: EntityParser)
  }
}

declare module "simple-html-tokenizer/entity-parser" {
  import { CharRef } from "simple-html-tokenizer/html5-named-char-refs";

  export default class EntityParser {
    constructor(ref: CharRef);
  }
}

declare module "simple-html-tokenizer/html5-named-char-refs" {
  export interface CharRef {}

  const TABLE: CharRef;

  export default TABLE;
}
