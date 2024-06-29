import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { cached } from 'tracked-toolbox';

export default class DateService extends Service {
  interval: ReturnType<(typeof window)['setInterval']> | null = null;
  @tracked _date = new Date();

  constructor(...args: ConstructorParameters<typeof Service>) {
    super(...args);

    this.interval = setInterval(() => {
      this._date = new Date();
    }, 1000);
  }

  willDestroy(...args: Parameters<Service['willDestroy']>) {
    super.willDestroy(...args);
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  @cached
  get date() {
    console.log('ama cached getter, recalculating only on value change')
    return this._date.toLocaleTimeString();
  }
}
