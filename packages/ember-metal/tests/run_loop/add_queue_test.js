import run from '../../run_loop';

const originalQueues = run.queues;
let queues;

QUnit.module('system/run_loop/add_queue_test', {
  setup() {
    run.queues = queues = ['blork', 'bleep'];
  },
  teardown() {
    run.queues = originalQueues;
  }
});

QUnit.test('adds a queue after a specified one', function() {
  run._addQueue('testeroo', 'blork');

  equal(queues.indexOf('testeroo'), 1, 'new queue was added after specified queue');
});

QUnit.test('does not add the queue if it already exists', function() {
  run._addQueue('testeroo', 'blork');
  run._addQueue('testeroo', 'blork');

  equal(queues.length, 3, 'queue was not added twice');
});
