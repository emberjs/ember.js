import type { CompilableTemplate, Optional, Reference, SimpleNode } from '@glimmer/interfaces';
import { IS_COMPILABLE_TEMPLATE } from '@glimmer/constants';
import { REFERENCE } from '@glimmer/reference';
import { isIndexable } from '@glimmer/util';

import type { IntoFragment } from './fragment';
import type { LeafFragment, ValueFragment } from './fragment-type';

import { debugValue } from '../dism/opcode';
import { as, frag, Fragment, intoFragment } from '../render/fragment';
import { describeRef } from '../render/ref';

export function empty(): LeafFragment {
  return new Fragment({ kind: 'string', value: '' });
}

export function join(frags: IntoFragment[], separator?: Optional<IntoFragment>): Fragment {
  const sep = separator ? intoFragment(separator) : empty();

  if (frags.length === 0) {
    return empty();
  }

  let seenUnsubtle = false;
  let seenAny = false;

  const output: LeafFragment[] = [];

  for (const frag of frags) {
    const fragment = intoFragment(frag);
    const isSubtle = fragment.isSubtle();
    const sepIsSubtle = isSubtle || !seenUnsubtle;

    // If the succeeding fragment is subtle, the separator is also subtle. If the succeeding
    // fragment is unstubtle, the separator is unsubtle only if we've already seen an unsubtle
    // fragment. This ensures that separators are not ultimately present if the next element is not
    // printed.

    if (seenAny) {
      output.push(...sep.subtle(sepIsSubtle).leaves());
    }

    output.push(...fragment.leaves());
    seenUnsubtle ||= !isSubtle;
    seenAny = true;
  }

  return new Fragment({ kind: 'multi', value: output });
}

export type ValueRefOptions = { annotation: string } | { ref: string; value?: IntoFragment };

export function value(item: unknown, options?: ValueRefOptions): Fragment {
  if (typeof item === 'function' || Array.isArray(item)) {
    return Fragment.special(item);
  } else if (isReference(item)) {
    return describeRef(item);
  } else if (isCompilable(item)) {
    const table = item.symbolTable;

    if ('parameters' in table) {
      const blockParams =
        table.parameters.length === 0
          ? empty()
          : frag` as |${join(
              table.parameters.map((s) => item.meta.symbols.lexical?.at(s - 1) ?? `?${s}`),
              ' '
            )}|`;
      return debugValue(item, {
        ref: 'block',
        value: frag`<${as.kw('block')}${blockParams}>`,
      });
    } else {
      return frag` <${as.kw('template')} ${item.meta.moduleName ?? '(unknown module)'}>`;
    }
  } else if (isDom(item)) {
    return Fragment.special(item);
  }

  return debugValue(item, options);
}

export function unknownValue(val: unknown, options?: ValueRefOptions): LeafFragment {
  const normalize = (): ValueFragment['display'] => {
    if (options === undefined) return;

    if ('annotation' in options) {
      return { ref: options.annotation, footnote: intoFragment(options.annotation) };
    } else {
      return {
        ref: options.ref,
        footnote: options.value ? intoFragment(options.value) : undefined,
      };
    }
  };

  return new Fragment({
    kind: 'value',
    value: val,
    display: normalize(),
  });
}

export function group(...frags: IntoFragment[]): Fragment {
  return new Fragment({ kind: 'multi', value: frags.flatMap((f) => intoFragment(f).leaves()) });
}

function isCompilable(element: unknown): element is CompilableTemplate {
  return !!(element && typeof element === 'object' && IS_COMPILABLE_TEMPLATE in element);
}

function isReference(element: unknown): element is Reference {
  return !!(element && typeof element === 'object' && REFERENCE in element);
}

function isDom(element: unknown): element is Node | SimpleNode {
  if (!isIndexable(element)) {
    return false;
  }

  if (typeof Node !== 'undefined') {
    return element instanceof Node;
  } else {
    return 'nodeType' in element && typeof element.nodeType === 'number';
  }
}
