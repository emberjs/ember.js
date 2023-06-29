declare global {
  var requirejs: {
    _eak_seen: Object;
  };
}
import Engine from '@ember/engine';
/**
 * Configure your application as it boots
 */
export default function loadInitializers(app: typeof Engine, prefix: string): void;
