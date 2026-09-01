import { opcodes as SexpOpcodes } from '@glimmer/wire-format/lib/opcodes';

import { defineExpression } from './compilers';

function headOnly(name: string) {
  return () => {
    throw new Error(
      `${name} is only valid as the callee of a statement, not as a standalone expression`
    );
  };
}

export const GetFreeAsComponentOrHelperHeadOp = /*#__PURE__*/ defineExpression(
  SexpOpcodes.GetFreeAsComponentOrHelperHead,
  headOnly('GetFreeAsComponentOrHelperHead')
);
export const GetFreeAsModifierHeadOp = /*#__PURE__*/ defineExpression(
  SexpOpcodes.GetFreeAsModifierHead,
  headOnly('GetFreeAsModifierHead')
);
export const GetFreeAsComponentHeadOp = /*#__PURE__*/ defineExpression(
  SexpOpcodes.GetFreeAsComponentHead,
  headOnly('GetFreeAsComponentHead')
);
