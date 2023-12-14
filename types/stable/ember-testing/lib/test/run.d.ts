declare module 'ember-testing/lib/test/run' {
  export default function run<T>(fn: () => T): T;
}
