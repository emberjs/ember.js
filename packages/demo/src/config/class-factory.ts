export default function classFactory(klass) {
  return {
    create(injections) {
      if (typeof klass.extend === 'function') {
        return klass.extend(injections);
      } else {
        return klass;
      }
    },
  };
}
