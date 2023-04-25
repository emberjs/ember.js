import EmberObject from '@ember/object';
import { sendEvent, addListener, removeListener } from '@ember/object/events';
import Evented, { on } from '@ember/object/evented';

function testOn() {
  const Job = EmberObject.extend({
    logStartOrUpdate: on('started', 'updated', () => {
      console.log('Job updated!');
    }),
    logCompleted: on('completed', () => {
      console.log('Job completed!');
    }),
  });

  const job = Job.create();

  sendEvent(job, 'started'); // Logs 'Job started!'
  sendEvent(job, 'updated'); // Logs 'Job updated!'
  sendEvent(job, 'completed'); // Logs 'Job completed!'
}

function testEvented() {
  interface Person extends Evented {}
  class Person extends EmberObject {
    greet() {
      this.trigger('greet');
    }
  }

  const person = Person.create();

  person.on('potato', 'greet');

  const target = {
    hi() {
      console.log('Hello!');
    },
  };

  person.on('greet', () => {
    console.log('Our person has greeted');
  });

  person
    .on('greet', () => {
      console.log('Our person has greeted');
    })
    .one('greet', () => {
      console.log('Offer one-time special');
    })
    .off('event', {}, () => {});

  person.on('greet', target, 'hi').one('greet', target, 'hi').off('event', target, 'hi');

  person
    .on('greet', target, target.hi)
    .one('greet', target, target.hi)
    .off('event', target, target.hi);

  person.greet();
}

function testListener() {
  function willDestroyListener() {}

  class Destroy extends EmberObject {
    init() {
      addListener(this, 'willDestroy', this, 'willDestroyListener');
      addListener(this, 'willDestroy', this, 'willDestroyListener', true);
      addListener(this, 'willDestroy', this, willDestroyListener);
      addListener(this, 'willDestroy', this, willDestroyListener, true);
      removeListener(this, 'willDestroy', this, 'willDestroyListener');
      removeListener(this, 'willDestroy', this, willDestroyListener);

      addListener(this, 'willDestroy', null, 'willDestroyListener');
      addListener(this, 'willDestroy', null, 'willDestroyListener', true);
      addListener(this, 'willDestroy', null, willDestroyListener);
      addListener(this, 'willDestroy', null, willDestroyListener, true);
      removeListener(this, 'willDestroy', null, 'willDestroyListener');
      removeListener(this, 'willDestroy', null, willDestroyListener);
    }

    willDestroyListener() {
      willDestroyListener();
    }
  }
}
