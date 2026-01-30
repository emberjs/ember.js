import { expectTypeOf } from 'expect-type';
import {
  ComponentSignatureArgs,
  ComponentSignatureBlocks,
  ComponentSignatureElement,
} from '../-private/signature';

type LegacyArgs = {
  foo: number;
};

expectTypeOf<ComponentSignatureArgs<LegacyArgs>>().toEqualTypeOf<{
  Named: LegacyArgs;
  Positional: [];
}>();
expectTypeOf<ComponentSignatureBlocks<LegacyArgs>>().toEqualTypeOf<{}>();
expectTypeOf<ComponentSignatureElement<LegacyArgs>>().toEqualTypeOf<unknown>();

// Here, we are testing that the types propertly distribute over union types,
// generics which extend other types, etc.
type LegacyArgsDistributive = { foo: number } | { bar: string; baz: boolean };

expectTypeOf<ComponentSignatureArgs<LegacyArgsDistributive>>().toEqualTypeOf<
  | { Named: { foo: number }; Positional: [] }
  | { Named: { bar: string; baz: boolean }; Positional: [] }
>();
expectTypeOf<ComponentSignatureBlocks<LegacyArgsDistributive>>().toEqualTypeOf<{}>();
expectTypeOf<ComponentSignatureElement<LegacyArgsDistributive>>().toEqualTypeOf<unknown>();

interface ArgsOnly {
  Args: LegacyArgs;
}

expectTypeOf<ComponentSignatureArgs<ArgsOnly>>().toEqualTypeOf<{
  Named: LegacyArgs;
  Positional: [];
}>();
expectTypeOf<ComponentSignatureBlocks<ArgsOnly>>().toEqualTypeOf<{}>();
expectTypeOf<ComponentSignatureElement<ArgsOnly>>().toEqualTypeOf<unknown>();

interface ElementOnly {
  Element: HTMLParagraphElement;
}

expectTypeOf<ComponentSignatureArgs<ElementOnly>>().toEqualTypeOf<{
  Named: {};
  Positional: [];
}>();
expectTypeOf<ComponentSignatureBlocks<ElementOnly>>().toEqualTypeOf<{}>();
expectTypeOf<ComponentSignatureElement<ElementOnly>>().toEqualTypeOf<HTMLParagraphElement>();

interface Blocks {
  default: [name: string];
  inverse: [];
}

interface BlockOnlySig {
  Blocks: Blocks;
}

expectTypeOf<ComponentSignatureArgs<BlockOnlySig>>().toEqualTypeOf<{
  Named: {};
  Positional: [];
}>();
expectTypeOf<ComponentSignatureBlocks<BlockOnlySig>>().toEqualTypeOf<{
  default: {
    Params: {
      Positional: [name: string];
    };
  };
  inverse: {
    Params: {
      Positional: [];
    };
  };
}>();
expectTypeOf<ComponentSignatureElement<BlockOnlySig>>().toEqualTypeOf<unknown>();

interface ArgsAndBlocks {
  Args: LegacyArgs;
  Blocks: Blocks;
}

expectTypeOf<ComponentSignatureArgs<ArgsAndBlocks>>().toEqualTypeOf<{
  Named: LegacyArgs;
  Positional: [];
}>();
expectTypeOf<ComponentSignatureBlocks<ArgsAndBlocks>>().toEqualTypeOf<{
  default: {
    Params: {
      Positional: [name: string];
    };
  };
  inverse: {
    Params: {
      Positional: [];
    };
  };
}>();
expectTypeOf<ComponentSignatureElement<ArgsAndBlocks>>().toEqualTypeOf<unknown>();

interface ArgsAndEl {
  Args: LegacyArgs;
  Element: HTMLParagraphElement;
}

expectTypeOf<ComponentSignatureArgs<ArgsAndEl>>().toEqualTypeOf<{
  Named: LegacyArgs;
  Positional: [];
}>();
expectTypeOf<ComponentSignatureBlocks<ArgsAndEl>>().toEqualTypeOf<{}>();
expectTypeOf<ComponentSignatureElement<ArgsAndEl>>().toEqualTypeOf<HTMLParagraphElement>();

interface FullShortSig {
  Args: LegacyArgs;
  Element: HTMLParagraphElement;
  Blocks: Blocks;
}

expectTypeOf<ComponentSignatureArgs<FullShortSig>>().toEqualTypeOf<{
  Named: LegacyArgs;
  Positional: [];
}>();
expectTypeOf<ComponentSignatureBlocks<FullShortSig>>().toEqualTypeOf<{
  default: {
    Params: {
      Positional: [name: string];
    };
  };
  inverse: {
    Params: {
      Positional: [];
    };
  };
}>();
expectTypeOf<ComponentSignatureElement<FullShortSig>>().toEqualTypeOf<HTMLParagraphElement>();

interface FullLongSig {
  Args: {
    Named: LegacyArgs;
    Positional: [];
  };
  Element: HTMLParagraphElement;
  Blocks: {
    default: {
      Params: {
        Positional: [name: string];
      };
    };
  };
}

expectTypeOf<ComponentSignatureArgs<FullLongSig>>().toEqualTypeOf<FullLongSig['Args']>();
expectTypeOf<ComponentSignatureBlocks<FullLongSig>>().toEqualTypeOf<FullLongSig['Blocks']>();
expectTypeOf<ComponentSignatureElement<FullLongSig>>().toEqualTypeOf<FullLongSig['Element']>();
