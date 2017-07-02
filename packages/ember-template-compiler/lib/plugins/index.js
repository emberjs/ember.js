import TransformOldBindingSyntax from './transform-old-binding-syntax';
import TransformAngleBracketComponents from './transform-angle-bracket-components';
import TransformInputOnToOnEvent from './transform-input-on-to-onEvent';
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
import ExtractPragmaTag from './extract-pragma-tag';
import AssertInputHelperWithoutBlock from './assert-input-helper-without-block';
import {
  GLIMMER_CUSTOM_COMPONENT_MANAGER
} from 'ember/features';

const transforms = [
  TransformDotComponentInvocation,
  TransformOldBindingSyntax,
  TransformAngleBracketComponents,
  TransformInputOnToOnEvent,
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
  AssertInputHelperWithoutBlock
];

if (GLIMMER_CUSTOM_COMPONENT_MANAGER) {
  transforms.push(ExtractPragmaTag);
}

export default Object.freeze(transforms);
