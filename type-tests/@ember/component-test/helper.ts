import Helper, {
  FunctionBasedHelper,
  FunctionBasedHelperInstance,
  helper,
} from '@ember/component/helper';
import { expectTypeOf } from 'expect-type';

interface DemoSig {
  Args: {
    Named: {
      name: string;
      age: number;
    };
    Positional: [i18nizer: (s: string) => string];
  };
  Return: string;
}

class SignatureForm extends Helper<DemoSig> {
  compute(
    [i18nizer]: [i18nizer: (s: string) => string],
    { name, age }: { name: string; age: number }
  ): string {
    return i18nizer(`${name} is ${age} years old`);
  }
}

// Type-safe helpers require you to pass a signature so that it is visible to
// external callers (via Glint) *or* to handle the fact that your callers may
// pass you anything if there is no signature. Unfortunately, the only way to
// make that safe would be to make the signature *required*.
class BadNoSigForm extends Helper {
  compute(
    [i18nizer]: [i18nizer: (s: string) => string],
    { name, age }: { name: string; age: number }
  ): string {
    return i18nizer(`${name} is ${age} years old`);
  }
}

class BadPosSigForm extends Helper<DemoSig> {
  compute(
    // @ts-expect-error
    [i18nizer, extra]: [i18nizer: (s: string) => string],
    { name, age }: { name: string; age: number }
  ): string {
    return i18nizer(`${name} is ${age} years old`);
  }
}

class BadNamedSigForm extends Helper<DemoSig> {
  compute(
    [i18nizer]: [i18nizer: (s: string) => string],
    // @ts-expect-error
    { name, age, potato }: { name: string; age: number }
  ): string {
    return i18nizer(`${name} is ${age} years old`);
  }
}

class BadReturnForm extends Helper<DemoSig> {
  compute(
    [i18nizer]: [i18nizer: (s: string) => string],
    { name, age }: { name: string; age: number }
  ): string {
    // @ts-expect-error
    return Boolean(i18nizer(`${name} is ${age} years old`));
  }
}

const inferenceOnPositional = helper(function add([a, b]: [number, number]) {
  return a + b;
});

expectTypeOf(inferenceOnPositional).toEqualTypeOf<
  FunctionBasedHelper<{
    Args: { Positional: [number, number]; Named: object };
    Return: number;
  }>
>();

const coolHelper = helper((_, named) => {
  expectTypeOf(named).toEqualTypeOf<object>();
});

const typeInferenceOnNamed = helper((_: [], { cool }: { cool: boolean }) => {
  expectTypeOf(cool).toBeBoolean();

  return cool ? 123 : 'neat';
});

expectTypeOf(typeInferenceOnNamed).toEqualTypeOf<
  FunctionBasedHelper<{
    Args: {
      Positional: [];
      Named: {
        cool: boolean;
      };
    };
    Return: 123 | 'neat';
  }>
>();

const dasherizeHelper = helper(function dasherize(
  [str]: [string],
  { delim = '-' }: { delim?: string }
) {
  return str.split(/[\s\n_.]+/g).join(delim);
});
expectTypeOf(dasherizeHelper).toEqualTypeOf<
  FunctionBasedHelper<{
    Args: {
      Positional: [string];
      Named: { delim?: string };
    };
    Return: string;
  }>
>();

const signatureForm = helper<DemoSig>(([i18nizer], { name, age }) =>
  i18nizer(`${name} is ${age} years old`)
);

// @ts-expect-error
const badPosArgsSig = helper<DemoSig>(([i18nizer, extra], { name, age }) =>
  i18nizer(`${name} is ${age} years old`)
);

// @ts-expect-error
const badNamedArgsSig = helper<DemoSig>(([i18nizer], { name, age, potato }) =>
  i18nizer(`${name} is ${age} years old`)
);

const badReturnSig = helper<DemoSig>(([i18nizer], { name, age }) =>
  // @ts-expect-error
  Boolean(i18nizer(`${name} is ${age} years old`))
);

const greet = helper(([name]: [string]) => `Hello, ${name}`);
expectTypeOf(greet).toEqualTypeOf<
  FunctionBasedHelper<{
    Args: {
      Positional: [string];
      Named: object;
    };
    Return: string;
  }>
>();

// @ts-expect-error
new greet();

// @ts-expect-error
class Subgreet extends greet {}

// Check that generics are accepted. (We cannot meaningfully test for how they
// are *handled* because it uses items we do not want to expose in public API.)
const pair = helper(<T>([item]: [T]): [T, T] => [item, item]);
expectTypeOf(pair).toEqualTypeOf<
  abstract new <T>() => FunctionBasedHelperInstance<{
    Args: {
      Positional: [T, T];
      Named: object;
    };
    Return: T;
  }>
>();
