import AssertIfHelperWithoutArguments from './assert-if-helper-without-arguments';
import AssertInputHelperWithoutBlock from './assert-input-helper-without-block';
import AssertLocalVariableShadowingHelperInvocation from './assert-local-variable-shadowing-helper-invocation';
import AssertReservedNamedArguments from './assert-reserved-named-arguments';
import AssertSplattributeExpressions from './assert-splattribute-expression';
import DeprecateSendAction from './deprecate-send-action';
import TransformActionSyntax from './transform-action-syntax';
import TransformAngleBracketComponents from './transform-angle-bracket-components';
import TransformAttrsIntoArgs from './transform-attrs-into-args';
import TransformComponentInvocation from './transform-component-invocation';
import TransformEachInIntoEach from './transform-each-in-into-each';
import TransformHasBlockSyntax from './transform-has-block-syntax';
import TransformInElement from './transform-in-element';
import TransformInlineLinkTo from './transform-inline-link-to';
import TransformInputTypeSyntax from './transform-input-type-syntax';
import TransformOldClassBindingSyntax from './transform-old-class-binding-syntax';
import TransformQuotedBindingsIntoJustBindings from './transform-quoted-bindings-into-just-bindings';
import TransformTopLevelComponents from './transform-top-level-components';

import { SEND_ACTION } from '@ember/deprecated-features';
import { ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';

export type APluginFunc = (env: ASTPluginEnvironment) => ASTPlugin | undefined;

const transforms: Array<APluginFunc> = [
  TransformComponentInvocation,
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
  AssertLocalVariableShadowingHelperInvocation,
  AssertInputHelperWithoutBlock,
  TransformInElement,
  AssertIfHelperWithoutArguments,
  AssertSplattributeExpressions,
];

if (SEND_ACTION) {
  transforms.push(DeprecateSendAction);
}

export default Object.freeze(transforms);
