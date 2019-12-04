// import { Tag, createUpdatableTag, combine, update, track } from '@glimmer/validator';
// import { VersionedReference } from './reference';

// export function map<T, U>(
//   input: VersionedReference<T>,
//   callback: (value: T) => U,
// ): VersionedReference<U> {
//   return new MapReference(input, callback);
// }

// class MapReference<T, U> implements VersionedReference<U> {
//   readonly tag: Tag;
//   readonly updatable = createUpdatableTag();

//   constructor(private inner: VersionedReference<T>, private callback: (value: T) => U) {
//     this.tag = combine([inner.tag, this.updatable]);
//   }

//   value(): U {
//     let { inner, callback } = this;

//     let ret: U;
//     let tag = track(() => (ret = callback(inner.value())));
//     update(this.updatable, tag);

//     return ret!;
//   }
// }
