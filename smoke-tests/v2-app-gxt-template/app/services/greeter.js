import Service from '@ember/service';

// Injected into `<TrackedCounter>` with `@service greeter`.
export default class GreeterService extends Service {
  label = 'Tracked clicks';
}
