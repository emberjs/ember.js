import AssertIfHelperWithoutArguments from './assert-if-helper-without-arguments';
import AssertInputHelperWithoutBlock from './assert-input-helper-without-block';
import AssertLocalVariableShadowingHelperInvocation from './assert-local-variable-shadowing-helper-invocation';
import AssertReservedNamedArguments from './assert-reserved-named-arguments';
import AssertSplattributeExpressions from './assert-splattribute-expression';
import DeprecateSendAction from './deprecate-send-action';
import TransformActionSyntax from './transform-action-syntax';
import TransformAttrsIntoArgs from './transform-attrs-into-args';
import TransformComponentInvocation from './transform-component-invocation';
import TransformEachInIntoEach from './transform-each-in-into-each';
import TransformHasBlockSyntax from './transform-has-block-syntax';
import TransformInElement from './transform-in-element';
import TransformLinkTo from './transform-link-to';
import TransformOldClassBindingSyntax from './transform-old-class-binding-syntax';
import TransformQuotedBindingsIntoJustBindings from './transform-quoted-bindings-into-just-bindings';
import TransformBigNumberIntoParseIntHelper from './transform-big-number-into-parse-int-helper';

import { SEND_ACTION } from '@ember/deprecated-features';
import { ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';

export type APluginFunc = (env: ASTPluginEnvironment) => ASTPlugin | undefined;

const transforms: Array<APluginFunc> = [
  TransformComponentInvocation,
  TransformOldClassBindingSyntax,
  TransformQuotedBindingsIntoJustBindings,
  AssertReservedNamedArguments,
  TransformActionSyntax,
  TransformAttrsIntoArgs,
  TransformBigNumberIntoParseIntHelper,
  TransformEachInIntoEach,
  TransformHasBlockSyntax,
  AssertLocalVariableShadowingHelperInvocation,
  TransformLinkTo,
  AssertInputHelperWithoutBlock,
  TransformInElement,
  AssertIfHelperWithoutArguments,
  AssertSplattributeExpressions,
];

if (SEND_ACTION) {
  transforms.push(DeprecateSendAction);
}

export default Object.freeze(transforms);
