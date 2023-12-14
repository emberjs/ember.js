declare module '@ember/-internals/glimmer/lib/environment' {
  import type { InternalOwner } from '@ember/-internals/owner';
  import type { EnvironmentDelegate } from '@glimmer/runtime';
  export class EmberEnvironmentDelegate implements EnvironmentDelegate {
    owner: InternalOwner;
    isInteractive: boolean;
    enableDebugTooling: boolean;
    constructor(owner: InternalOwner, isInteractive: boolean);
    onTransactionCommit(): void;
  }
}
