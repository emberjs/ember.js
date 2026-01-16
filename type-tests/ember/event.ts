import Component from "@ember/component";
import EmberObject, { observer } from "@ember/object";
import Evented, { on } from "@ember/object/evented";
import { addListener, removeListener, sendEvent } from "@ember/object/events";

function testOn() {
  const Job = EmberObject.extend({
    logCompleted: on('completed', () => {
      console.log('Job completed!');
    }),
  });

  const job = Job.create();

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

  person.greet();
}

function testObserver() {
  EmberObject.extend({
    valueObserver: observer('value', () => {
      // Executes whenever the "value" property changes
    }),
  });
}

function testListener() {
  class TestListener extends Component {
    init() {
      addListener(this, 'willDestroyElement', this, 'willDestroyListener');
      addListener(this, 'willDestroyElement', this, 'willDestroyListener', true);
      addListener(this, 'willDestroyElement', this, this.willDestroyListener);
      addListener(this, 'willDestroyElement', this, this.willDestroyListener, true);
      removeListener(this, 'willDestroyElement', this, 'willDestroyListener');
      removeListener(this, 'willDestroyElement', this, this.willDestroyListener);
    }
    willDestroyListener() {}
  }
}
