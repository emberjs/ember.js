import {
  Value as ValueSyntax,
  GetArgument as ArgSyntax,
  Concat as ConcatSyntax,
  Get as GetSyntax,
  HasBlock as HasBlockSyntax,
  HasBlockParams as HasBlockParamsSyntax,
  Helper as HelperSyntax,
  Unknown as UnknownSyntax
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
  if (isUndefined(sexp)) return ValueSyntax.build(undefined);
  if (isArg(sexp)) return ArgSyntax.fromSpec(sexp);
  if (isConcat(sexp)) return ConcatSyntax.fromSpec(sexp);
  if (isGet(sexp)) return GetSyntax.fromSpec(sexp);
  if (isHelper(sexp)) return HelperSyntax.fromSpec(sexp);
  if (isUnknown(sexp)) return UnknownSyntax.fromSpec(sexp);
  if (isHasBlock(sexp)) return HasBlockSyntax.fromSpec(sexp);
  if (isHasBlockParams(sexp)) return HasBlockParamsSyntax.fromSpec(sexp);

  throw new Error(`Unexpected wire format: ${JSON.stringify(sexp)}`);
};
