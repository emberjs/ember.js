import type EmberLocation from '@ember/routing/location';
import { expectTypeOf } from 'expect-type';
import type Owner from '@ember/owner';
import type NoneLocation from '@ember/routing/none-location';
import type HashLocation from '@ember/routing/hash-location';
import type HistoryLocation from '@ember/routing/history-location';

// Interface
expectTypeOf<EmberLocation['cancelRouterSetup']>().toEqualTypeOf<boolean | undefined>();
expectTypeOf<EmberLocation['getURL']>().toEqualTypeOf<() => string>();
expectTypeOf<EmberLocation['setURL']>().toEqualTypeOf<(url: string) => void>();
expectTypeOf<EmberLocation['replaceURL']>().toEqualTypeOf<((url: string) => void) | undefined>();
expectTypeOf<EmberLocation['onUpdateURL']>().toEqualTypeOf<
  (callback: (url: string) => void) => void
>();
expectTypeOf<EmberLocation['formatURL']>().toEqualTypeOf<(url: string) => string>();
expectTypeOf<EmberLocation['initState']>().toEqualTypeOf<(() => void) | undefined>();
expectTypeOf<EmberLocation['destroy']>().toEqualTypeOf<() => void>();

// Minimal implementation
class TestLocation implements EmberLocation {
  getURL() {
    return 'test://url';
  }

  setURL(_url: string) {}

  onUpdateURL(callback: (url: string) => void): void {
    callback('test://callback');
  }

  formatURL(url: string): string {
    return url;
  }

  destroy(): void {}
}

// Verify registrations are correct
declare let owner: Owner;
expectTypeOf(owner.lookup('location:none')).toEqualTypeOf<NoneLocation>();
expectTypeOf(owner.lookup('location:hash')).toEqualTypeOf<HashLocation>();
expectTypeOf(owner.lookup('location:history')).toEqualTypeOf<HistoryLocation>();
