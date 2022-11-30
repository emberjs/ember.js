import { getOwner, setOwner } from '@ember/application';
import EngineInstance from '@ember/engine/instance';
import Owner from '@ember/owner';
import ApplicationInstance from '@ember/application/instance';
import Service from '@ember/service';
import { expectTypeOf } from 'expect-type';
import { getOwner as getOwnerProper, setOwner as setOwnerProper } from '@ember/owner';

expectTypeOf(getOwner).toEqualTypeOf(getOwnerProper);
expectTypeOf(setOwner).toEqualTypeOf(setOwnerProper);

expectTypeOf(getOwner({})).toEqualTypeOf<Owner | undefined>();

// Confirm that random subclasses work as expected.
declare class MyService extends Service {
  withStuff: true;
}
declare let myService: MyService;
expectTypeOf(getOwner(myService)).toEqualTypeOf<Owner | undefined>();

// @ts-expect-error
getOwner();

declare let baseOwner: Owner;
expectTypeOf(setOwner({}, baseOwner)).toBeVoid();

declare let engine: EngineInstance;
expectTypeOf(setOwner({}, engine)).toBeVoid();

declare let application: ApplicationInstance;
expectTypeOf(setOwner({}, application)).toBeVoid();
