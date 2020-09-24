import { Source } from './index';
import { SerializedSourceSpan, SourceSpan } from './span';

export type SerializedSourceSlice<Chars extends string = string> = [
  chars: Chars,
  span: SerializedSourceSpan
];

export class SourceSlice<Chars extends string = string> {
  static synthetic<S extends string>(chars: S): SourceSlice<S> {
    let offsets = SourceSpan.synthetic(chars);
    return new SourceSlice({ loc: offsets, chars: chars });
  }

  static load(source: Source, slice: SerializedSourceSlice): SourceSlice {
    return new SourceSlice({
      loc: SourceSpan.load(source, slice[1]),
      chars: slice[0],
    });
  }

  readonly chars: Chars;
  readonly loc: SourceSpan;

  constructor(options: { loc: SourceSpan; chars: Chars }) {
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
