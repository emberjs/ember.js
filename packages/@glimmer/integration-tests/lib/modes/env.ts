import { setScheduleDestroy, setScheduleDestroyed, EnvironmentDelegate } from '@glimmer/runtime';
import { Destroyable, Destructor } from '@glimmer/interfaces';

let scheduledDestroyables: Destroyable[] = [];
let scheduledDestructors: Destructor<any>[] = [];
let scheduledFinishDestruction: (() => void)[] = [];

setScheduleDestroy(<T extends Destroyable>(destroyable: T, destructor: Destructor<T>) => {
  scheduledDestroyables.push(destroyable);
  scheduledDestructors.push(destructor);
});

setScheduleDestroyed((fn: () => void) => {
  scheduledFinishDestruction.push(fn);
});

export const BaseEnv: EnvironmentDelegate = {
  onTransactionCommit() {
    for (let i = 0; i < scheduledDestroyables.length; i++) {
      scheduledDestructors[i](scheduledDestroyables[i]);
    }

    scheduledFinishDestruction.forEach(fn => fn());

    scheduledDestroyables = [];
    scheduledDestructors = [];
    scheduledFinishDestruction = [];
  },
};
