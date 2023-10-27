// Ember will use the development build.
//
// But ember doesn't yet support import.meta.env
// and we can't require that apps gain support for it until a major of ember.
//
// So for the development build, we'll swap all
//   import.meta.env.DEV with DEBUG and
//   import.meta.env.PROD with !DEBUG
// using the existing babel-plugin-debug-macros with fake-import from `@glimmer/env`
export default function importMetaEnvToGlimmerEnv(_options = {}) {
  return {
    transform(_code) {
      // console.log(code);
      return '';
    },
  };
}
