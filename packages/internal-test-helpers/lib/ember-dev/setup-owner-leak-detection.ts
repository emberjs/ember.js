import { setupOwnerTracker, type InternalOwner } from '@ember/-internals/owner';

declare global {
  interface Config {
    queue: unknown[];
  }
}

export function setupOwnerLeakTracker() {
  let OWNER_REFS: [WeakRef<InternalOwner>, string][] = [];

  setupOwnerTracker((owner: InternalOwner) => {
    OWNER_REFS.push([new WeakRef(owner), getTestName()]);
  });

  function getTestName() {
    // the test named `ember-testing Adapters: Adapter is used by default (if
    // QUnit is not available)` sets the `Qunit` global to undefined in order
    // to confirm the test adapter functions properly without QUnit, this guard
    // is specifically to avoid an error in that test case
    if (typeof QUnit === 'undefined') {
      return '(unknown test)';
    }

    const currentTest = QUnit.config.current;
    return `${currentTest.module.name}: ${currentTest.testName}`;
  }

  let hasCheckedOwnerLeaks = false;

  async function fullyGC() {
    if (typeof gc !== 'function') {
      throw new Error('Attempting to call `fullyGC` without launching with `--expose-gc`');
    }

    // Ignoring TS errors below for the `gc` style that we are using,
    // modern chromiums accept an argument specifying type of gc (and
    // to force it to be promise based)

    // @ts-expect-error see above
    await gc({ type: 'major', execution: 'async' });
    // @ts-expect-error see above
    await gc({ type: 'major', execution: 'async' });
    // @ts-expect-error see above
    await gc({ type: 'major', execution: 'async' });
  }

  async function checkForRetainedOwners() {
    await fullyGC();

    const testNameToRetainedOwner = new Map();
    for (let [ownerRef, testName] of OWNER_REFS) {
      const owner = ownerRef.deref();
      if (owner !== undefined) {
        let owners = testNameToRetainedOwner.get(testName);
        if (owners === undefined) {
          owners = [];
          testNameToRetainedOwner.set(testName, owners);
        }
        owners.push(owner);
      }
    }

    OWNER_REFS = [];

    return testNameToRetainedOwner;
  }

  function getOwnerMetadata(owner: any) {
    if (owner.mountPoint) {
      return `Engine [mounted at \`/${owner.mountPoint}\`]`;
    }
    return `Application`;
  }

  // Due to details of how QUnit functions (see https://github.com/qunitjs/qunit/pull/1629)
  // we cannot enqueue new tests if we use `runEnd` which is basically what we want (i.e. "when all tests are done run this callback")
  //
  // Instead we use `suiteEnd` and check `QUnit.config.queue` which indicates the number of tests remaining to be ran
  // when `QUnit.config.queue` gets to `0` and `suiteEnd` is running we are finished with all tests **but** `runEnd` / `QUnit.done()` hasn't ran yet so we can still emit new tests
  QUnit.moduleDone(() => {
    if (QUnit.config.queue.length !== 0) {
      return;
    }

    if (hasCheckedOwnerLeaks) return;
    hasCheckedOwnerLeaks = true;

    QUnit.module(`[OWNER LEAK DETECTION]`, function () {
      const testBody = async function (assert: Assert) {
        assert.expect(0);

        await fullyGC();

        const leakedOwners = await checkForRetainedOwners();
        for (const [testName, owners] of leakedOwners) {
          for (const owner of owners) {
            assert.pushResult({
              result: false,
              expected: true,
              actual: false,

              message: `${testName}: Leaked ${getOwnerMetadata(owner)}`,
            });
          }
        }
      };
      // Opts the user into the `OWNER LEAK DETECTION` module regardless of filter or module selected.
      testBody.validTest = true;

      QUnit.test('There should be zero leaked Owners', testBody);
    });
  });
}
