declare module 'ember-testing/lib/ext/application' {
  import type Application from '@ember/application';
  export interface TestableApp extends Application {
    testing?: boolean;
    testHelpers: Record<string, (...args: unknown[]) => unknown>;
    originalMethods: Record<string, (...args: unknown[]) => unknown>;
    setupForTesting(): void;
    helperContainer: object | null;
    injectTestHelpers(helperContainer: unknown): void;
    removeTestHelpers(): void;
  }
}
