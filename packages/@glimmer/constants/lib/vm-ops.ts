import type {
  VmMachineInvokeStatic,
  VmMachineInvokeVirtual,
  VmMachineJump,
  VmMachineOp,
  VmMachinePopFrame,
  VmMachinePushFrame,
  VmMachineReturn,
  VmMachineReturnTo,
  VmMachineSize,
} from '@glimmer/interfaces';

export const VM_PUSH_FRAME_OP = 0 satisfies VmMachinePushFrame;
export const VM_POP_FRAME_OP = 1 satisfies VmMachinePopFrame;
export const VM_INVOKE_VIRTUAL_OP = 2 satisfies VmMachineInvokeVirtual;
export const VM_INVOKE_STATIC_OP = 3 satisfies VmMachineInvokeStatic;
export const VM_JUMP_OP = 4 satisfies VmMachineJump;
export const VM_RETURN_OP = 5 satisfies VmMachineReturn;
export const VM_RETURN_TO_OP = 6 satisfies VmMachineReturnTo;
export const VM_SIZE_OP = 7 satisfies VmMachineSize;

export function isMachineOp(value: number): value is VmMachineOp {
  return value >= 0 && value <= 15;
}
