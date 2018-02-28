import TransformOldBindingSyntax from './transform-old-binding-syntax';
import TransformAngleBracketComponents from './transform-angle-bracket-components';
import TransformTopLevelComponents from './transform-top-level-components';
import TransformInlineLinkTo from './transform-inline-link-to';
import TransformOldClassBindingSyntax from './transform-old-class-binding-syntax';
import TransformQuotedBindingsIntoJustBindings from './transform-quoted-bindings-into-just-bindings';
import DeprecateRenderModel from './deprecate-render-model';
import DeprecateRender from './deprecate-render';
import AssertReservedNamedArguments from './assert-reserved-named-arguments';
import TransformActionSyntax from './transform-action-syntax';
import TransformInputTypeSyntax from './transform-input-type-syntax';
import TransformAttrsIntoArgs from './transform-attrs-into-args';
import TransformEachInIntoEach from './transform-each-in-into-each';
import TransformHasBlockSyntax from './transform-has-block-syntax';
import TransformDotComponentInvocation from './transform-dot-component-invocation';
import AssertInputHelperWithoutBlock from './assert-input-helper-without-block';
import TransformInElement from './transform-in-element';

const transforms = [
  TransformDotComponentInvocation,
  TransformOldBindingSyntax,
  TransformAngleBracketComponents,
  TransformTopLevelComponents,
  TransformInlineLinkTo,
  TransformOldClassBindingSyntax,
  TransformQuotedBindingsIntoJustBindings,
  DeprecateRenderModel,
  DeprecateRender,
  AssertReservedNamedArguments,
  TransformActionSyntax,
  TransformInputTypeSyntax,
  TransformAttrsIntoArgs,
  TransformEachInIntoEach,
  TransformHasBlockSyntax,
  AssertInputHelperWithoutBlock,
  TransformInElement,
];

export default Object.freeze(transforms);
