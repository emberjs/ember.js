import type { ASTPluginBuilder } from '@glimmer/syntax';
import AssertAgainstAttrs from './assert-against-attrs';
import AssertAgainstNamedOutlets from './assert-against-named-outlets';
import AssertInputHelperWithoutBlock from './assert-input-helper-without-block';
import AssertReservedNamedArguments from './assert-reserved-named-arguments';
import TransformActionSyntax from './transform-action-syntax';
import TransformEachInIntoEach from './transform-each-in-into-each';
import TransformEachTrackArray from './transform-each-track-array';
import TransformInElement from './transform-in-element';
import TransformQuotedBindingsIntoJustBindings from './transform-quoted-bindings-into-just-bindings';
import TransformResolutions from './transform-resolutions';
import TransformWrapMountAndOutlet from './transform-wrap-mount-and-outlet';

export const INTERNAL_PLUGINS: Record<string, ASTPluginBuilder> = {
  AssertAgainstAttrs,
  AssertAgainstNamedOutlets,
  AssertInputHelperWithoutBlock,
  AssertReservedNamedArguments,
  TransformActionSyntax,
  TransformEachInIntoEach,
  TransformEachTrackArray,
  TransformInElement,
  TransformQuotedBindingsIntoJustBindings,
  TransformResolutions,
  TransformWrapMountAndOutlet,
} as const;

// order of plugins is important
export const RESOLUTION_MODE_TRANSFORMS: readonly ASTPluginBuilder[] = Object.freeze([
  TransformQuotedBindingsIntoJustBindings,
  AssertReservedNamedArguments,
  TransformActionSyntax,
  AssertAgainstAttrs,
  TransformEachInIntoEach,
  AssertInputHelperWithoutBlock,
  TransformInElement,
  TransformEachTrackArray,
  AssertAgainstNamedOutlets,
  TransformWrapMountAndOutlet,
  TransformResolutions,
]);

export const STRICT_MODE_TRANSFORMS: readonly ASTPluginBuilder[] = Object.freeze([
  TransformQuotedBindingsIntoJustBindings,
  AssertReservedNamedArguments,
  TransformActionSyntax,
  TransformEachInIntoEach,
  TransformInElement,
  TransformEachTrackArray,
  AssertAgainstNamedOutlets,
  TransformWrapMountAndOutlet,
]);

export const STRICT_MODE_KEYWORDS = Object.freeze([
  'action',
  'mut',
  'readonly',
  'unbound',

  // TransformEachInIntoEach
  '-each-in',
  // TransformInElement
  '-in-el-null',
  // TransformEachTrackArray
  '-track-array',
  // TransformWrapMountAndOutlet
  '-mount',
  '-outlet',
]);
