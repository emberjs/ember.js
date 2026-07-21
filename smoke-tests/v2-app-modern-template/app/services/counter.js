import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class CounterService extends Service {
  @tracked count = 0;

  increment() {
    this.count++;
  }
}
