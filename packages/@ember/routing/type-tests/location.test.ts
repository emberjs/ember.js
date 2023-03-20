import type { Location } from '@ember/routing/location';
import { expectTypeOf } from 'expect-type';
import type Owner from '@ember/owner';
import type NoneLocation from '../none-location';
import type HashLocation from '../hash-location';
import type HistoryLocation from '../history-location';

// Interface
expectTypeOf<Location['implementation']>().toEqualTypeOf<string>();
expectTypeOf<Location['cancelRouterSetup']>().toEqualTypeOf<boolean | undefined>();
expectTypeOf<Location['getURL']>().toEqualTypeOf<() => string>();
expectTypeOf<Location['setURL']>().toEqualTypeOf<(url: string) => void>();
expectTypeOf<Location['replaceURL']>().toEqualTypeOf<((url: string) => void) | undefined>();
expectTypeOf<Location['onUpdateURL']>().toEqualTypeOf<(callback: (url: string) => void) => void>();
expectTypeOf<Location['formatURL']>().toEqualTypeOf<(url: string) => string>();
expectTypeOf<Location['detect']>().toEqualTypeOf<(() => void) | undefined>();
expectTypeOf<Location['initState']>().toEqualTypeOf<(() => void) | undefined>();
expectTypeOf<Location['destroy']>().toEqualTypeOf<() => void>();

// Minimal implementation
class TestLocation implements Location {
  implementation = 'test';

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

new TestLocation();

declare let owner: Owner;
expectTypeOf(owner.lookup('location:none')).toEqualTypeOf<NoneLocation>();
expectTypeOf(owner.lookup('location:hash')).toEqualTypeOf<HashLocation>();
expectTypeOf(owner.lookup('location:history')).toEqualTypeOf<HistoryLocation>();
