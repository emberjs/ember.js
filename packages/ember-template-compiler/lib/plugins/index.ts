import AssertAgainstAttrs from './assert-against-attrs';
import AssertAgainstDynamicHelpersModifiers from './assert-against-dynamic-helpers-modifiers';
import AssertAgainstNamedBlocks from './assert-against-named-blocks';
import AssertAgainstNamedOutlets from './assert-against-named-outlets';
import AssertInputHelperWithoutBlock from './assert-input-helper-without-block';
import AssertReservedNamedArguments from './assert-reserved-named-arguments';
import AssertSplattributeExpressions from './assert-splattribute-expression';
import TransformActionSyntax from './transform-action-syntax';
import TransformEachInIntoEach from './transform-each-in-into-each';
import TransformEachTrackArray from './transform-each-track-array';
import TransformInElement from './transform-in-element';
import TransformQuotedBindingsIntoJustBindings from './transform-quoted-bindings-into-just-bindings';
import TransformResolutions from './transform-resolutions';
import TransformWrapMountAndOutlet from './transform-wrap-mount-and-outlet';

import { EMBER_DYNAMIC_HELPERS_AND_MODIFIERS, EMBER_NAMED_BLOCKS } from '@ember/canary-features';

// order of plugins is important
export const RESOLUTION_MODE_TRANSFORMS = Object.freeze(
  [
    TransformQuotedBindingsIntoJustBindings,
    AssertReservedNamedArguments,
    TransformActionSyntax,
    AssertAgainstAttrs,
    TransformEachInIntoEach,
    AssertInputHelperWithoutBlock,
    TransformInElement,
    AssertSplattributeExpressions,
    TransformEachTrackArray,
    AssertAgainstNamedOutlets,
    TransformWrapMountAndOutlet,
    !EMBER_NAMED_BLOCKS ? AssertAgainstNamedBlocks : null,
    EMBER_DYNAMIC_HELPERS_AND_MODIFIERS
      ? TransformResolutions
      : AssertAgainstDynamicHelpersModifiers,
  ].filter(notNull)
);

export const STRICT_MODE_TRANSFORMS = Object.freeze(
  [
    TransformQuotedBindingsIntoJustBindings,
    AssertReservedNamedArguments,
    TransformActionSyntax,
    TransformEachInIntoEach,
    TransformInElement,
    AssertSplattributeExpressions,
    TransformEachTrackArray,
    AssertAgainstNamedOutlets,
    TransformWrapMountAndOutlet,
    !EMBER_NAMED_BLOCKS ? AssertAgainstNamedBlocks : null,
    !EMBER_DYNAMIC_HELPERS_AND_MODIFIERS ? AssertAgainstDynamicHelpersModifiers : null,
  ].filter(notNull)
);

function notNull<TValue>(value: TValue | null): value is TValue {
  return value !== null;
}
