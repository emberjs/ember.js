import Controller, { inject as controller } from '@ember/controller';
import Service, { service } from '@ember/service';
import { expectTypeOf } from 'expect-type';

class Session extends Service {
  user = 'zoey';
}

class ApplicationController extends Controller {}

class Example extends Service {
  @service declared!: Session;
  @service('session') named!: Session;
  @service accessor viaAccessor!: Session;
  @service('session') accessor namedAccessor!: Session;
  @controller application!: ApplicationController;
  @controller('application') namedController!: ApplicationController;
}

let example = new Example();
expectTypeOf(example.named.user).toEqualTypeOf<string>();
expectTypeOf(example.viaAccessor).toEqualTypeOf<Session>();

class Invalid {
  // @ts-expect-error -- @service is not valid on methods
  @service method() {}
}
new Invalid();
