import {
  UNDEFINED_SYNTAX,
  Concat as ConcatSyntax,
  Get as GetSyntax,
  GetArgument as ArgSyntax,
  HasBlock as HasBlockSyntax,
  HasBlockParams as HasBlockParamsSyntax,
  Helper as HelperSyntax,
  Unknown as UnknownSyntax,
  Value as ValueSyntax
} from './core';

import {
  Expressions as SerializedExpressions,
  Expression as SerializedExpression
} from 'glimmer-wire-format';

const {
  isArg,
  isConcat,
  isGet,
  isHasBlock,
  isHasBlockParams,
  isHelper,
  isUnknown,
  isPrimitiveValue,
  isUndefined
} = SerializedExpressions;

export default function(sexp: SerializedExpression): any {
  if (isPrimitiveValue(sexp)) return ValueSyntax.fromSpec(sexp);
  if (isUndefined(sexp)) return UNDEFINED_SYNTAX;
  if (isArg(sexp)) return ArgSyntax.fromSpec(sexp);
  if (isConcat(sexp)) return ConcatSyntax.fromSpec(sexp);
  if (isGet(sexp)) return GetSyntax.fromSpec(sexp);
  if (isHelper(sexp)) return HelperSyntax.fromSpec(sexp);
  if (isUnknown(sexp)) return UnknownSyntax.fromSpec(sexp);
  if (isHasBlock(sexp)) return HasBlockSyntax.fromSpec(sexp);
  if (isHasBlockParams(sexp)) return HasBlockParamsSyntax.fromSpec(sexp);

  throw new Error(`Unexpected wire format: ${JSON.stringify(sexp)}`);
};
