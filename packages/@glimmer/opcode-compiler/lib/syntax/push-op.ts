import { Encoder, BuilderOp, CompileTimeConstants } from '@glimmer/interfaces';

export default function pushOp(encoder: Encoder, constants: CompileTimeConstants, op: BuilderOp) {
  if (op.op3 !== undefined) {
    encoder.push(constants, op.op, op.op1!, op.op2!, op.op3);
  } else if (op.op2 !== undefined) {
    encoder.push(constants, op.op, op.op1!, op.op2);
  } else if (op.op1 !== undefined) {
    encoder.push(constants, op.op, op.op1);
  } else {
    encoder.push(constants, op.op);
  }
}
