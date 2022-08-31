import '../../types/preview';
import type ArrayPrototypeExtensions from '@ember/array/types/prototype-extensions';

declare global {
  interface Array<T> extends ArrayPrototypeExtensions<T> {}
}
