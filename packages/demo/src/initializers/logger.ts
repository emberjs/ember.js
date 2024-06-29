import type Application from '@ember/application';
import EmberObject from '@ember/object';

export class Logger extends EmberObject {
  log(m: unknown) {
    console.log(m);
  }
}

export function initialize(application: Application) {
  application.register('logger:main', Logger);
  console.log('logger registered');
}

export default {
  name: 'logger',
  initialize,
};
