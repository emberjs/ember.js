import AssertIfHelperWithoutArguments from './assert-if-helper-without-arguments';
import AssertInputHelperWithoutBlock from './assert-input-helper-without-block';
import AssertReservedNamedArguments from './assert-reserved-named-arguments';
import AssertSplattributeExpressions from './assert-splattribute-expression';
import DeprecateRender from './deprecate-render';
import DeprecateRenderModel from './deprecate-render-model';
import DeprecateSendAction from './deprecate-send-action';
import TransformActionSyntax from './transform-action-syntax';
import TransformAngleBracketComponents from './transform-angle-bracket-components';
import TransformAttrsIntoArgs from './transform-attrs-into-args';
import TransformDotComponentInvocation from './transform-dot-component-invocation';
import TransformEachInIntoEach from './transform-each-in-into-each';
import TransformHasBlockSyntax from './transform-has-block-syntax';
import TransformInElement from './transform-in-element';
import TransformInlineLinkTo from './transform-inline-link-to';
import TransformInputTypeSyntax from './transform-input-type-syntax';
import TransformOldBindingSyntax from './transform-old-binding-syntax';
import TransformOldClassBindingSyntax from './transform-old-class-binding-syntax';
import TransformQuotedBindingsIntoJustBindings from './transform-quoted-bindings-into-just-bindings';
import TransformTopLevelComponents from './transform-top-level-components';

import { BINDING_SUPPORT, RENDER_HELPER, SEND_ACTION } from '@ember/deprecated-features';
import { ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';

export type APluginFunc = (env: ASTPluginEnvironment) => ASTPlugin | undefined;

const transforms: Array<APluginFunc> = [
  TransformDotComponentInvocation,
  TransformAngleBracketComponents,
  TransformTopLevelComponents,
  TransformInlineLinkTo,
  TransformOldClassBindingSyntax,
  TransformQuotedBindingsIntoJustBindings,
  AssertReservedNamedArguments,
  TransformActionSyntax,
  TransformInputTypeSyntax,
  TransformAttrsIntoArgs,
  TransformEachInIntoEach,
  TransformHasBlockSyntax,
  AssertInputHelperWithoutBlock,
  TransformInElement,
  AssertIfHelperWithoutArguments,
  AssertSplattributeExpressions,
];

if (RENDER_HELPER) {
  transforms.push(DeprecateRenderModel);
  transforms.push(DeprecateRender);
}

if (BINDING_SUPPORT) {
  transforms.push(TransformOldBindingSyntax);
}

if (SEND_ACTION) {
  transforms.push(DeprecateSendAction);
}

export default Object.freeze(transforms);
