import type { ClassifiedLocalDebug, ClassifiedLocalDebugFor } from '@glimmer/debug-util';
import type {
  AppendingBlock,
  BlockSymbolNames,
  Cursor,
  NamedArguments,
  Nullable,
  PositionalArguments,
  VMArguments,
} from '@glimmer/interfaces';
import { dev, exhausted, getLocalDebugType } from '@glimmer/debug-util';
import { isIndexable } from '@glimmer/util';

import type { DisassembledOperand } from '../debug';
import type { ValueRefOptions } from '../render/basic';
import type { IntoFragment } from '../render/fragment';
import type { RegisterName, SomeDisassembledOperand } from './dism';

import { empty, join, unknownValue, value } from '../render/basic';
import { array } from '../render/combinators';
import { as, frag, Fragment } from '../render/fragment';

export class SerializeBlockContext {
  readonly #symbols: Nullable<BlockSymbolNames>;

  constructor(symbols: Nullable<BlockSymbolNames>) {
    this.#symbols = symbols;
  }

  serialize(param: SomeDisassembledOperand): IntoFragment {
    switch (param.type) {
      case 'number':
      case 'boolean':
      case 'string':
      case 'primitive':
        return this.#stringify(param.value, 'stringify');
      case 'array':
        return array(param.value?.map((value) => this.#stringify(value, 'unknown')) ?? []);
      case 'dynamic':
      case 'constant':
        return value(param.value);
      case 'register':
        return this.#stringify(param.value, 'register');
      case 'instruction':
        return this.#stringify(param.value, 'pc');
      case 'variable': {
        const value = param.value;
        if (value === 0) {
          return frag`{${as.kw('this')}}`;
        } else if (this.#symbols?.lexical && this.#symbols.lexical.length >= value) {
          // @fixme something is wrong here -- remove the `&&` to get test failures
          return frag`${as.varReference(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
            this.#symbols.lexical[value - 1]!
          )}${frag`:${value}`.subtle()}`;
        } else {
          return frag`{${as.register('$fp')}+${value}}`;
        }
      }

      case 'error:opcode':
        return `{raw:${param.value}}`;
      case 'error:operand':
        return `{err:${param.options.label.name}=${param.value}}`;
      case 'enum<curry>':
        return `<curry:${param.value}>`;

      default:
        exhausted(param);
    }
  }

  #stringify(value: number, type: 'constant' | 'variable' | 'pc'): string;
  #stringify(value: RegisterName, type: 'register'): string;
  #stringify(value: DisassembledOperand['value'], type: 'stringify' | 'unknown'): string;
  #stringify(
    value: unknown,
    type: 'stringify' | 'constant' | 'register' | 'variable' | 'pc' | 'unknown'
  ) {
    switch (type) {
      case 'stringify':
        return JSON.stringify(value);
      case 'constant':
        return this.#stringify(value, 'unknown');
      case 'register':
        return value;
      case 'variable': {
        if (value === 0) {
          return `{this}`;
        } else if (this.#symbols?.lexical && this.#symbols.lexical.length >= (value as number)) {
          return `{${this.#symbols.lexical[(value as number) - 1]}:${value}}`;
        } else {
          return `{$fp+${value}}`;
        }
      }
      case 'pc':
        return `@${value}`;
      case 'unknown': {
        switch (typeof value) {
          case 'function':
            return '<function>';
          case 'number':
          case 'string':
          case 'bigint':
          case 'boolean':
            return JSON.stringify(value);
          case 'symbol':
            return String(value);
          case 'undefined':
            return 'undefined';
          case 'object': {
            if (value === null) return 'null';
            if (Array.isArray(value)) return `<array[${value.length}]>`;

            let name = value.constructor.name;

            switch (name) {
              case 'Error':
              case 'RangeError':
              case 'ReferenceError':
              case 'SyntaxError':
              case 'TypeError':
              case 'WeakMap':
              case 'WeakSet':
                return `<${name}>`;
              case 'Object':
                return `<${name}>`;
            }

            if (value instanceof Map) {
              return `<Map[${value.size}]>`;
            } else if (value instanceof Set) {
              return `<Set[${value.size}]>`;
            } else {
              return `<${name}>`;
            }
          }
        }
      }
    }
  }
}

export function debugValue(item: unknown, options?: ValueRefOptions): Fragment {
  if (isIndexable(item)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
    const classified = getLocalDebugType(item)!;

    return describeValue(classified);
  }

  return unknownValue(item, options);
}

function describeValue(classified: ClassifiedLocalDebug): Fragment {
  switch (classified.type) {
    case 'args':
      return describeArgs(classified.value);

    case 'args:positional':
      return positionalArgs(classified.value);

    case 'args:named':
      // return entries
      return namedArgs(classified.value);

    case 'args:blocks':
      return frag`<blocks>`;

    case 'cursor':
      return describeCursor(classified.value);

    case 'block:simple':
    case 'block:remote':
    case 'block:resettable':
      return describeBlock(classified.value, classified.type);

    case 'factory:helper':
      return Fragment.special(classified.value);

    case 'syntax:source':
      return describeSyntaxSource(classified);

    case 'syntax:symbol-table:program':
      return describeProgramSymbolTable(classified);

    case 'syntax:mir:node':
      return describeMirNode(classified);
  }
}

function describeArgs(args: VMArguments) {
  const { positional, named, length } = args;

  if (length === 0) {
    return frag`${as.type('args')} { ${as.dim('empty')} }`;
  } else {
    const posFrag = positional.length === 0 ? empty() : positionalArgs(positional);
    const namedFrag = named.length === 0 ? empty() : namedArgs(named);
    const argsFrag = join([posFrag, namedFrag], ' ');

    return frag`${as.type('args')} { ${argsFrag} }`;
  }
}

function positionalArgs(args: PositionalArguments) {
  return join(
    args.capture().map((item) => value(item)),
    ' '
  );
}

function namedArgs(args: NamedArguments) {
  return join(
    Object.entries(args.capture()).map(([k, v]) => frag`${as.kw(k)}=${value(v)}`),
    ' '
  );
}

function describeCursor(cursor: Cursor) {
  const { element, nextSibling } = cursor;

  if (nextSibling) {
    return frag`${as.type('cursor')} { ${as.kw('before')} ${Fragment.special(nextSibling)} }`;
  } else {
    return frag`${as.type('cursor')} { ${as.kw('append to')} ${Fragment.special(element)} }`;
  }
}

function describeBlock(
  block: AppendingBlock,
  type: 'block:simple' | 'block:remote' | 'block:resettable'
) {
  const kind = type.split(':').at(1) as string;

  const debug = block.debug;
  const first = debug?.first();
  const last = debug?.last();

  if (first === last) {
    if (first === null) {
      return frag`${as.type('block bounds')} { ${as.kw(kind)} ${as.null('uninitialized')} }`;
    } else {
      return frag`${as.type('block bounds')} { ${as.kw(kind)} ${value(first)} }`;
    }
  } else {
    return frag`${as.type('block bounds')} { ${as.kw(kind)} ${value(first)} .. ${value(last)} }`;
  }
}

function describeProgramSymbolTable(
  classified: ClassifiedLocalDebugFor<'syntax:symbol-table:program'>
) {
  const debug = dev(classified.options.debug);

  const keywords = labelledList('keywords', debug.keywords);
  const upvars = labelledList('upvars', debug.upvars);
  const atNames = labelledList('@-names', Object.keys(debug.named));
  const blocks = labelledList('blocks', Object.keys(debug.blocks));

  const fields = join([keywords, atNames, upvars, blocks], ' ');

  const full = frag` ${value(debug, { ref: 'debug' })}`.subtle();

  return frag`${as.kw('program')} ${as.type('symbol table')} { ${fields} }${full}`;
}

function describeSyntaxSource(classified: ClassifiedLocalDebugFor<'syntax:source'>) {
  return frag`${as.kw('source')} { ${value(classified.value.source)} }`;
}

function describeMirNode(classified: ClassifiedLocalDebugFor<'syntax:mir:node'>) {
  return frag`${as.type('mir')} { ${as.kw(classified.value.type)} }`;
}

function labelledList(name: string, list: readonly unknown[]) {
  return list.length === 0
    ? frag`(${as.dim('no')} ${as.dim(name)})`.subtle()
    : frag`${as.attrName(name)}=${array(list.map((v) => value(v)))}`;
}

export type SerializableKey<O, P extends keyof O> = {
  [K in P]: O[P] extends IntoFragment ? K : never;
}[P];
