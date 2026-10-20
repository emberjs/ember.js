/**
 * Tests of the suites that check Glimmer VM internals with no GXT equivalent,
 * by suite name (the test class's `suiteName`) and test name, with the reason.
 * Under GXT (`__GXT_MODE__`), `module.ts` registers them as `QUnit.skip`,
 * whatever the delegate. The rehydration delegate's own list is
 * `GXT_UNSUPPORTED` in `modes/rehydration/gxt-delegate.ts`.
 */

const LIST_UPDATE_STEPS =
  "verifies only the LOCAL_DEBUG 'list-updates' steps (retain/move) of the Glimmer VM's list reconciliation; GXT's keyed list records no such steps";
const SERIALIZATION =
  "asserts the markers of Glimmer's SerializeBuilder (the block comments and the `<!--% %-->` placeholder of an empty text node); GXT emits no serialization markers";
const DYNAMIC_SCOPE =
  "sets and reads dynamic variables other than outletState, which only the Glimmer VM's default DynamicScopeImpl stores; Ember's dynamic scope, and GXT with it, supports outletState only";

const GXT_VM_ONLY: Record<string, Record<string, string>> = {
  '#each': {
    'When re-iterated via swap #1, the original references are updated': LIST_UPDATE_STEPS,
    'When re-iterated via swap #2, the original references are updated': LIST_UPDATE_STEPS,
    'When re-iterated via swap #3, the original references are updated': LIST_UPDATE_STEPS,
    'When re-iterated via swap #4, the original references are updated': LIST_UPDATE_STEPS,
    'When re-iterated via swap #5, the original references are updated': LIST_UPDATE_STEPS,
    'When re-iterated via swap #6, the original references are updated': LIST_UPDATE_STEPS,
    'When re-iterated via swap #7, the original references are updated': LIST_UPDATE_STEPS,
    'When re-iterated via swap #8, the original references are updated': LIST_UPDATE_STEPS,
    'When re-iterated via swap #9, the original references are updated': LIST_UPDATE_STEPS,
  },
  'Server-side rendering in Node.js (serialize)': {
    'Null literals do not have representation in DOM': SERIALIZATION,
  },
  '-with-dynamic-vars and -get-dynamic-var': {
    'Can get and set dynamic variable': DYNAMIC_SCOPE,
    'Can get and set dynamic variable with bound names': DYNAMIC_SCOPE,
    'Can shadow existing dynamic variable': DYNAMIC_SCOPE,
  },
};

/** The reason `testName` of `suiteName` checks Glimmer VM internals, if listed. */
export function gxtVmOnlyReason(suiteName: string, testName: string): string | undefined {
  const suite = GXT_VM_ONLY[suiteName];
  return suite && Object.prototype.hasOwnProperty.call(suite, testName)
    ? suite[testName]
    : undefined;
}
