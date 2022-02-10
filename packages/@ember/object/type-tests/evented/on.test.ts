import { on } from '@ember/object/evented';
import { sendEvent } from '@ember/object/events';
import { expectTypeOf } from 'expect-type';

class Job {
  logCompleted = on('completed', function () {
    // eslint-disable-next-line no-console
    console.log('Job completed!');
  });
}

const job = new Job();

sendEvent(job, 'completed'); // Logs 'Job completed!'

expectTypeOf(job.logCompleted).toEqualTypeOf<() => void>();
