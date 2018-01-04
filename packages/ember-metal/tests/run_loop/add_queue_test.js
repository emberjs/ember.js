import { run } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

const originalQueues = run.queues;
let queues;

moduleFor('system/run_loop/add_queue_test', class extends AbstractTestCase {
  constructor() {
    super();

    run.queues = queues = ['blork', 'bleep'];
  }

  teardown() {
    run.queues = originalQueues;
  }

  ['@test adds a queue after a specified one'](assert) {
    run._addQueue('testeroo', 'blork');

    assert.equal(queues.indexOf('testeroo'), 1, 'new queue was added after specified queue');
  }

  ['@test does not add the queue if it already exists'](assert) {
    run._addQueue('testeroo', 'blork');
    run._addQueue('testeroo', 'blork');

    assert.equal(queues.length, 3, 'queue was not added twice');
  }
});

