import { Owner } from '@ember/-internals/owner';
import EmberObject from '@ember/object';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EngineInstance extends Owner {}
declare class EngineInstance extends EmberObject {
  boot(): void;
}

export default EngineInstance;
