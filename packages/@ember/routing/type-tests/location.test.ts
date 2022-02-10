import Location, { ILocation } from '@ember/routing/location';
import { expectTypeOf } from 'expect-type';

// This is deprecated so let's not bother with more testing
expectTypeOf(Location.create).toBeFunction();

// Interface
expectTypeOf<ILocation['implementation']>().toEqualTypeOf<string>();
expectTypeOf<ILocation['cancelRouterSetup']>().toEqualTypeOf<boolean | undefined>();
expectTypeOf<ILocation['getURL']>().toEqualTypeOf<() => string>();
expectTypeOf<ILocation['setURL']>().toEqualTypeOf<(url: string) => void>();
expectTypeOf<ILocation['replaceURL']>().toEqualTypeOf<((url: string) => void) | undefined>();
expectTypeOf<ILocation['onUpdateURL']>().toEqualTypeOf<(callback: (url: string) => void) => void>();
expectTypeOf<ILocation['formatURL']>().toEqualTypeOf<(url: string) => string>();
expectTypeOf<ILocation['detect']>().toEqualTypeOf<(() => void) | undefined>();
expectTypeOf<ILocation['initState']>().toEqualTypeOf<(() => void) | undefined>();
expectTypeOf<ILocation['destroy']>().toEqualTypeOf<() => void>();

// Minimal implementation
class TestLocation implements ILocation {
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
