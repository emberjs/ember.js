/**
 * A free variable is resolved according to a resolution rule:
 *
 * 1. Strict resolution
 * 2. Namespaced resolution
 */

import type { GetContextualFreeOpcode } from '@glimmer/interfaces';
import { SexpOpcodes } from '@glimmer/wire-format';

import type { FreeVarNamespace } from './constants';

import { COMPONENT_VAR_NS, HELPER_VAR_NS, MODIFIER_VAR_NS } from './constants';

/**
 * Strict resolution is used:
 *
 * 1. in a strict mode template
 * 2. in an local variable invocation with dot paths
 */
export const STRICT_RESOLUTION = {
  resolution: (): GetContextualFreeOpcode => SexpOpcodes.GetStrictKeyword,
  serialize: (): SerializedResolution => 'Strict',
  isAngleBracket: false as const,
};

export type StrictResolution = typeof STRICT_RESOLUTION;

export const HTML_RESOLUTION = {
  ...STRICT_RESOLUTION,
  isAngleBracket: true as const,
};

export type HtmlResolution = typeof HTML_RESOLUTION;

export function isStrictResolution(value: unknown): value is StrictResolution {
  return value === STRICT_RESOLUTION;
}

/**
 * A `LooseModeResolution` includes one or more namespaces to resolve the variable in
 *
 * In practice, there are a limited number of possible combinations of these degrees of freedom,
 * and they are captured by the `Namespaces` union below.
 */
export class LooseModeResolution {
  /**
   * Namespaced resolution is used in an unambiguous syntax position:
   *
   * 1. `(sexp)` (namespace: `Helper`)
   * 2. `{{#block}}` (namespace: `Component`)
   * 3. `<a {{modifier}}>` (namespace: `Modifier`)
   * 4. `<Component />` (namespace: `Component`)
   */
  static namespaced(namespace: FreeVarNamespace, isAngleBracket = false): LooseModeResolution {
    return new LooseModeResolution([namespace], isAngleBracket);
  }

  /**
   * Append resolution is used when the variable should be resolved in both the `component` and
   * `helper` namespaces.
   *
   * ```hbs
   * {{x}}
   * ```
   *
   * ```hbs
   * {{x y}}
   * ```
   *
   * ^ In either case, `x` should be resolved in the `component` and `helper` namespaces.
   */
  static append(): LooseModeResolution {
    return new LooseModeResolution([COMPONENT_VAR_NS, HELPER_VAR_NS]);
  }

  /**
   * Trusting append resolution is used when the variable should be resolved only in the
   * `helper` namespaces.
   *
   * ```hbs
   * {{{x}}}
   * ```
   *
   * ```hbs
   * {{{x y}}}
   * ```
   *
   * ^ In either case, `x` should be resolved in the `helper` namespace.
   */
  static trustingAppend(): LooseModeResolution {
    return this.namespaced(HELPER_VAR_NS);
  }

  constructor(
    readonly namespaces: Namespaces,
    readonly isAngleBracket = false
  ) {}

  resolution(): GetContextualFreeOpcode {
    if (this.namespaces.length === 1) {
      switch (this.namespaces[0]) {
        case HELPER_VAR_NS:
          return SexpOpcodes.GetFreeAsHelperHead;
        case MODIFIER_VAR_NS:
          return SexpOpcodes.GetFreeAsModifierHead;
        case COMPONENT_VAR_NS:
          return SexpOpcodes.GetFreeAsComponentHead;
      }
    } else {
      return SexpOpcodes.GetFreeAsComponentOrHelperHead;
    }
  }

  serialize(): SerializedResolution {
    if (this.namespaces.length === 1) {
      return this.namespaces[0];
    } else {
      return 'ComponentOrHelper';
    }
  }
}

export const HELPER_NAMESPACE = HELPER_VAR_NS;
export const MODIFIER_NAMESPACE = MODIFIER_VAR_NS;
export const COMPONENT_NAMESPACE = COMPONENT_VAR_NS;

/**
 * A `Namespaced` must be resolved in one or more namespaces.
 *
 * ```hbs
 * <X />
 * ```
 *
 * ^ `X` is resolved in the `component` namespace
 *
 * ```hbs
 * (x)
 * ```
 *
 * ^ `x` is resolved in the `helper` namespace
 *
 * ```hbs
 * <a {{x}} />
 * ```
 *
 * ^ `x` is resolved in the `modifier` namespace
 */
type Namespaces =
  | [HELPER_VAR_NS]
  | [MODIFIER_VAR_NS]
  | [COMPONENT_VAR_NS]
  | [COMPONENT_VAR_NS, HELPER_VAR_NS];

export type FreeVarResolution = StrictResolution | HtmlResolution | LooseModeResolution;

// Serialization
export type SerializedResolution =
  | 'Strict'
  | 'Helper'
  | 'Modifier'
  | 'Component'
  | 'ComponentOrHelper';

export function loadResolution(resolution: SerializedResolution): FreeVarResolution {
  if (resolution === 'Strict') {
    return STRICT_RESOLUTION;
  } else if (resolution === 'ComponentOrHelper') {
    return LooseModeResolution.append();
  } else {
    return LooseModeResolution.namespaced(resolution as FreeVarNamespace);
  }
}
