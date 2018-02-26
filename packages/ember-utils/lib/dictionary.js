// the delete is meant to hint at runtimes that this object should remain in
// dictionary mode. This is clearly a runtime specific hack, but currently it
// appears worthwhile in some usecases. Please note, these deletes do increase
// the cost of creation dramatically over a plain Object.create. And as this
// only makes sense for long-lived dictionaries that aren't instantiated often.
export default function makeDictionary(parent) {
  let dict = Object.create(parent);
  dict['_dict'] = null;
  delete dict['_dict'];
  return dict;
}
