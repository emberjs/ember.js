// The delete hints to runtimes that this object should remain in dictionary mode.
// It is a runtime-specific hack, but worthwhile in some use cases.
// These deletes make creation much more expensive than a plain Object.create,
// so this only makes sense for long-lived dictionaries that are rarely instantiated.
export default function makeDictionary<T>(parent: { [key: string]: T } | null): {
  [key: string]: T;
} {
  let dict = Object.create(parent);
  dict['_dict'] = null;
  delete dict['_dict'];
  return dict;
}
