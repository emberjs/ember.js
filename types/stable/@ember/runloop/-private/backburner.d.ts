declare module '@ember/runloop/-private/backburner' {
  import type Backburner from 'backburner.js';
  export type { Backburner };
  export type DebugInfo = ReturnType<Backburner['getDebugInfo']>;
  export type { IQueueItem as QueueItem } from 'backburner.js/dist/backburner/interfaces';
  export type { DeferredActionQueues } from 'backburner.js';
}
