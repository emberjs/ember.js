import { EnvironmentDelegate, setScheduleDestroyed, setScheduleDestroy } from '@glimmer/runtime';
import { Destroyable, Destructor } from '@glimmer/interfaces';

type Queue = (() => void)[];

const scheduledDestructors: Queue = [];
const scheduledFinalizers: Queue = [];

function flush(queue: Queue) {
  for (const fn of queue) fn();
  queue.length = 0;
}

setScheduleDestroy(<T extends Destroyable>(destroyable: T, destructor: Destructor<T>) => {
  scheduledDestructors.push(() => destructor(destroyable));
});

setScheduleDestroyed((fn: () => void) => {
  scheduledFinalizers.push(fn);
});

export default function createEnvDelegate(isInteractive: boolean): EnvironmentDelegate {
  return {
    isInteractive,
    onTransactionCommit() {
      flush(scheduledDestructors);
      flush(scheduledFinalizers);
    },
  };
}
