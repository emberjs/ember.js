declare module '@ember/array/types/prototype-extensions' {
  import Observable from '@ember/object/observable';
  import MutableArray from '@ember/array/mutable';

  export default interface ArrayPrototypeExtensions<T> extends MutableArray<T>, Observable {}
}
