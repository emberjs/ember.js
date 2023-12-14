declare module 'ember-testing/lib/helpers/and_then' {
  import type { TestableApp } from 'ember-testing/lib/ext/application';
  export default function andThen(
    app: TestableApp,
    callback: (app: TestableApp) => unknown
  ): unknown;
}
