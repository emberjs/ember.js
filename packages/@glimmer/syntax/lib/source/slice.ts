import * as src from './api';

export type SerializedSourceSlice<Chars extends string = string> = [
  chars: Chars,
  span: src.SerializedSourceSpan
];

export class SourceSlice<Chars extends string = string> {
  static synthetic<S extends string>(chars: S): SourceSlice<S> {
    let offsets = src.SourceSpan.synthetic(chars);
    return new SourceSlice({ loc: offsets, chars: chars });
  }

  static load(source: src.Source, slice: SerializedSourceSlice): SourceSlice {
    return new SourceSlice({
      loc: src.SourceSpan.load(source, slice[1]),
      chars: slice[0],
    });
  }

  readonly chars: Chars;
  readonly loc: src.SourceSpan;

  constructor(options: { loc: src.SourceSpan; chars: Chars }) {
    this.loc = options.loc;
    this.chars = options.chars;
  }

  getString(): string {
    return this.chars;
  }

  serialize(): SerializedSourceSlice<Chars> {
    return [this.chars, this.loc.serialize()];
  }
}
