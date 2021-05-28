import { on } from '@ember/object/evented';
import { sendEvent } from '@ember/object/events';
import { expectTypeOf } from 'expect-type';

class Job {
  logCompleted = on('completed', function () {
    console.log('Job completed!');
  });
}

let job = new Job();

sendEvent(job, 'completed'); // Logs 'Job completed!'

expectTypeOf(job.logCompleted).toEqualTypeOf<() => void>();
