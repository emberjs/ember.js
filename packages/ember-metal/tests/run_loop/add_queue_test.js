import run from 'ember-metal/run_loop';
import { indexOf } from "ember-metal/array";

var originalQueues = run.queues;
var queues;

QUnit.module('system/run_loop/add_queue_test',{
  setup: function(){
    run.queues = queues = ['blork', 'bleep'];
  },
  teardown: function(){
    run.queues = originalQueues;
  }
});

test('adds a queue after a specified one', function() {
  run._addQueue('testeroo', 'blork');

  equal(indexOf.call(queues, 'testeroo'), 1, "new queue was added after specified queue");
});

test('does not add the queue if it already exists', function(){
  run._addQueue('testeroo', 'blork');
  run._addQueue('testeroo', 'blork');

  equal(queues.length, 3, "queue was not added twice");
});
