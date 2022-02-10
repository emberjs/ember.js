import { addListener, removeListener, sendEvent } from '@ember/object/events';

import EmberObject from '@ember/object';
import { on } from '@ember/object/evented';
import { Owner } from '@ember/-internals/owner';

class Job extends EmberObject {
  logStartOrUpdate = on('started', 'updated', () => {
    // eslint-disable-next-line no-console
    console.log('Job updated!');
  });

  logCompleted = on('completed', () => {
    // eslint-disable-next-line no-console
    console.log('Job completed!');
  });
}

const job = Job.create();

sendEvent(job, 'started'); // Logs 'Job started!'
sendEvent(job, 'updated'); // Logs 'Job updated!'
sendEvent(job, 'completed'); // Logs 'Job completed!'

class MyClass extends EmberObject {
  constructor(owner: Owner) {
    super(owner);
    addListener(this, 'willDestroy', this, 'willDestroyListener');
    addListener(this, 'willDestroy', this, 'willDestroyListener', true);

    addListener(this, 'willDestroy', this, this.willDestroyListener);

    addListener(this, 'willDestroy', this, this.willDestroyListener, true);
    removeListener(this, 'willDestroy', this, 'willDestroyListener');

    removeListener(this, 'willDestroy', this, this.willDestroyListener);
  }

  willDestroyListener() {}
}

MyClass.create();
