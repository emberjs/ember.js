export {
  compile,
  compileLayout,
  equalInnerHTML,
  equalHTML,
  equalTokens,
  generateSnapshot,
  equalSnapshots,
  normalizeInnerHTML,
  isCheckedInputHTML,
  getTextContent,
  strip,
  stripTight,
  trimLines
} from './lib/helpers';

export {
  Attrs,
  BasicComponent,
  EmberishCurlyComponent,
  EmberishGlimmerComponent,
  TestModifierManager,
  TestEnvironment,
  TestDynamicScope,
  equalsElement,
  inspectHooks,
  regex,
  classes
} from './lib/environment';

export {
  VersionedObject,
  testModule,
  template,
  RenderingTest,
  SimpleRootReference
} from './lib/abstract-test-case';

declare global {
  interface QUnit {
    equiv(left: any, right: any, message?: string): boolean;
    deepEqual(left: any, right: any, message?: string): void;
    strictEqual(left: any, right: any, message?: string): void;
    equal(left: any, right: any, message?: string): void;
  }
}