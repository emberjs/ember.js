import TransformOldBindingSyntax from './transform-old-binding-syntax';
import TransformItemClass from './transform-item-class';
import TransformAngleBracketComponents from './transform-angle-bracket-components';
import TransformInputOnToOnEvent from './transform-input-on-to-onEvent';
import TransformTopLevelComponents from './transform-top-level-components';
import TransformInlineLinkTo from './transform-inline-link-to';
import TransformOldClassBindingSyntax from './transform-old-class-binding-syntax';
import TransformQuotedBindingsIntoJustBindings from './transform-quoted-bindings-into-just-bindings';
import DeprecateRenderModel from './deprecate-render-model';
import AssertReservedNamedArguments from './assert-reserved-named-arguments';
import TransformActionSyntax from './transform-action-syntax';
import TransformInputTypeSyntax from './transform-input-type-syntax';
import TransformAttrsIntoArgs from './transform-attrs-into-args';
import TransformEachInIntoEach from './transform-each-in-into-each';
import TransformHasBlockSyntax from './transform-has-block-syntax';

export default Object.freeze([
  TransformOldBindingSyntax,
  TransformItemClass,
  TransformAngleBracketComponents,
  TransformInputOnToOnEvent,
  TransformTopLevelComponents,
  TransformInlineLinkTo,
  TransformOldClassBindingSyntax,
  TransformQuotedBindingsIntoJustBindings,
  DeprecateRenderModel,
  AssertReservedNamedArguments,
  TransformActionSyntax,
  TransformInputTypeSyntax,
  TransformAttrsIntoArgs,
  TransformEachInIntoEach,
  TransformHasBlockSyntax
]);
