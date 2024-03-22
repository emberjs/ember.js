import AssertAgainstAttrs from './assert-against-attrs';
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
    TransformResolutions,
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
  ].filter(notNull)
);

function notNull<TValue>(value: TValue | null): value is TValue {
  return value !== null;
}
