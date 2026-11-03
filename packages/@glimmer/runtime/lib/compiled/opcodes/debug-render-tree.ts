import type { Bounds, Nullable, UpdatingOpcode, UpdatingVM } from '@glimmer/interfaces';

export class DebugRenderTreeUpdateOpcode implements UpdatingOpcode {
  constructor(private bucket: object) {}

  evaluate(vm: UpdatingVM) {
    vm.env.debugRenderTree?.update(this.bucket);
  }
}

export class DebugRenderTreeDidRenderOpcode implements UpdatingOpcode {
  constructor(
    private bucket: object,
    private bounds: Nullable<Bounds>
  ) {}

  evaluate(vm: UpdatingVM) {
    vm.env.debugRenderTree?.didRender(this.bucket, this.bounds);
  }
}
