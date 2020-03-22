import { Owner } from '@ember/-internals/owner';

export default interface EngineInstance extends Owner {
  mountPoint?: string;
  routable?: boolean;
  boot(): void;
  destroy(): void;
}
