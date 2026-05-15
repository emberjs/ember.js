/* global Element */

import NodeQuery from '../node-query';
import equalInnerHTML from '../equal-inner-html';
import equalTokens from '../equal-tokens';
import { assertInvariants, getElement, takeSnapshot } from '../element-helpers';
import { equalsElement, regex, classes } from '../matchers';
import { runDestroy, runLoopSettled, runTask } from '../run';
import { assert } from '@ember/debug';
import { rerenderComponent } from '../component-helper';
import { _resetRenderers } from '@ember/-internals/glimmer';
// Slice-36 (Cluster B) test-helper writer for
// `__gxtPendingSyncFromPropertyChange` — routes flag clears through the
// bridge setter (canonical state migrated to module-local
// `_gxtPendingSyncFromPropertyChangeFlag` in
// `@ember/-internals/gxt-backend/compile.ts`). See
// `setPendingSyncFromPropertyChange` doc in gxt-bridge.ts. Establishes
// the test-helper-bridge-writer pattern for flag 1 (`__gxtPendingSync`)
// in slice 37.
import { getGxtRenderer } from '@ember/-internals/gxt-backend/gxt-bridge';

const TextNode = window.Text;
const HTMLElement = window.HTMLElement;
const Comment = window.Comment;

function isMarker(node: unknown): node is Comment | typeof TextNode {
  if (node instanceof Comment) {
    const text = node.textContent || '';
    // Empty comments are Glimmer VM markers
    if (text === '') return true;
    // GXT internal placeholder comments
    if (
      __GXT_MODE__ &&
      (text.includes('placeholder') ||
        text.includes('if-entry') ||
        text.includes('each-entry') ||
        text.includes('list-target') ||
        text.includes('list item') ||
        text.includes('list bottom marker') ||
        text.includes('curried-start') ||
        text.includes('curried-end') ||
        text === '/htmlRaw')
    ) {
      return true;
    }
  }

  if (node instanceof TextNode && node.textContent === '') {
    return true;
  }

  return false;
}

export type TestCase = AbstractStrictTestCase | AbstractTestCase;

export abstract class AbstractStrictTestCase {
  snapshot: ChildNode[] | null = null;
  component: unknown;
  readonly assert: QUnit['assert'];

  rerender(): void {
    rerenderComponent();
  }

  beforeEach?(_assert: QUnit['assert']) {}
  teardown?(): unknown;

  constructor(assert: QUnit['assert']) {
    this.assert = assert;
  }

  afterEach() {
    try {
      // Clean up GXT active components before destroy.
      // Slice-107 (Cluster B): routes through bridge — see
      // `cleanupActiveComponents` doc in gxt-bridge.ts. Reuses the existing
      // `getGxtRenderer` import. The optional-chain provides the same
      // null-tolerant guard as the pre-slice-107 `typeof === 'function'`
      // check for classic-Ember builds (where gxt-backend was never loaded).
      getGxtRenderer()?.compilePipeline.cleanupActiveComponents?.();

      runDestroy(this);

      // Flush pending modifier destroys so willDestroyElement fires during
      // teardown (matching Glimmer VM behavior where destroyModifier is called
      // synchronously when the element is removed).
      // Slice-39 (Cluster B): canonical state graduated from
      // `globalThis.__gxtPendingModifierDestroys` to the module-local
      // `_pendingModifierDestroys` Array in `gxt-backend/manager.ts`. The
      // cross-package reader here routes through the new read-only
      // Array-getter `compilePipeline.getPendingModifierDestroys?.()`.
      // Consumers mutate the returned array reference (`splice(0)` drains
      // here) — same mutate-by-reference contract as slice-32's
      // `_allPoolArrays` Set (`.add`/`.delete`/`.clear` on the returned
      // reference).
      try {
        const pendingDestroys = getGxtRenderer()?.compilePipeline.getPendingModifierDestroys?.();
        if (pendingDestroys && pendingDestroys.length > 0) {
          const toFlush = pendingDestroys.splice(0) as any[];
          for (const entry of toFlush) {
            if (!entry.cached.pendingDestroy) continue;
            try {
              if (
                entry.isCustom &&
                entry.cached.manager?.destroyModifier &&
                !entry.cached.instance?.__gxtModDestroyed
              ) {
                entry.cached.manager.destroyModifier(entry.cached.instance);
                if (entry.cached.instance) entry.cached.instance.__gxtModDestroyed = true;
              }
              // (Cluster B pilot, 2026-05-13) — was reading `__gxtDestroyFn`,
              // which had no writer anywhere in the source tree (orphan from a
              // previous refactor). The intended bridge function is now exposed
              // via `getGxtRenderer()?.destruction.destroyDestroyable`, but the
              // production teardown path (gxt-backend/compile.ts:5605) already
              // covers modifier-destroyable cleanup before tests reach this
              // helper. Removing the dead read is a no-op.
              // if (entry.destroyable) { /* see comment above */ }
            } catch {
              /* ignore individual modifier destroy errors */
            }
            const elCache = entry.cache?.get(entry.element);
            if (elCache) {
              elCache.delete(entry.modKey);
              if (elCache.size === 0) entry.cache.delete(entry.element);
            }
          }
        }
        // Also destroy any custom modifiers that are still active (their
        // formula destructors might not have fired during cleanup).
        const modMgr = (globalThis as any).$_MANAGERS?.modifier;
        if (modMgr?._destroyedInstances) {
          // Already tracked — skip
        } else if (modMgr?._updatedInstances) {
          // Walk recently-active instances and call destroyModifier on their managers
          for (const inst of modMgr._updatedInstances) {
            try {
              if (inst?.__gxtModManager?.destroyModifier && !inst.__gxtModDestroyed) {
                inst.__gxtModManager.destroyModifier(inst);
                inst.__gxtModDestroyed = true;
              }
            } catch {
              /* ignore */
            }
          }
          modMgr._updatedInstances.clear();
        }
      } catch {
        /* ignore */
      }

      // Clear stale globalThis.owner so subsequent tests don't see a destroyed owner
      if ((globalThis as any).owner?.isDestroyed || (globalThis as any).owner?.isDestroying) {
        (globalThis as any).owner = null;
      }
    } finally {
      _resetRenderers();
      // Slice-37 (Cluster B): `__gxtPendingSync` canonical state migrated
      // to module-local `_gxtPendingSyncFlag` in `compile.ts`. Test-
      // helper writer-contract — routes through the bridge setter
      // (reuses slice-36 test-helper-bridge-writer pattern).
      const _cpAT = getGxtRenderer()?.compilePipeline;
      _cpAT?.setPendingSync?.(false);
      // Slice-36 (Cluster B): `__gxtPendingSyncFromPropertyChange`
      // canonical state migrated to module-local
      // `_gxtPendingSyncFromPropertyChangeFlag` in `compile.ts`.
      // Test-helper writer-contract — routes through the bridge setter.
      _cpAT?.setPendingSyncFromPropertyChange?.(false);
      // (Cluster B slice 5 orphan cleanup) __gxtSyncScheduled reset removed.
      // Clear stale render errors so they don't leak into the next test's
      // beforeEach. Errors like backtracking assertions are caught by
      // assert.rejectsAssertion but also captured in _renderErrors via
      // captureRenderError, leaving a stale copy that would re-throw on
      // the next flushRenderErrors() call.
      // Slice-55 (Cluster B): routes through bridge — see clearRenderErrors
      // doc in gxt-bridge.ts.
      _cpAT?.clearRenderErrors?.();
    }
  }

  takeSnapshot() {
    this.snapshot = takeSnapshot();
  }

  assertStableRerender() {
    this.takeSnapshot();
    runTask(() => rerenderComponent());
    this.assertInvariants();
  }

  assertInvariants(): void;
  assertInvariants(oldSnapshot: ChildNode[], newSnapshot: ChildNode[]): void;
  assertInvariants(oldSnapshot?: ChildNode[], newSnapshot?: ChildNode[]): void {
    if (!oldSnapshot) {
      assert('expected an existing snapshot', this.snapshot);
      oldSnapshot = this.snapshot;
    }
    assertInvariants(oldSnapshot, newSnapshot);
  }
}

export default abstract class AbstractTestCase {
  snapshot: ChildNode[] | null;
  assert: QUnit['assert'];

  get fixture(): string | undefined {
    return undefined;
  }

  constructor(assert: QUnit['assert']) {
    this.snapshot = null;
    this.assert = assert;

    let { fixture } = this;
    if (fixture) {
      this.setupFixture(fixture);
    }
  }

  teardown() {}
  beforeEach(_assert: QUnit['assert']) {}
  afterEach() {}

  setupFixture(innerHTML: string) {
    let fixture = document.getElementById('qunit-fixture')!;
    fixture.innerHTML = innerHTML;
  }

  // The following methods require `this.element` to work

  get firstChild() {
    return this.nthChild(0);
  }

  nthChild(n: number) {
    let i = 0;
    let node = getElement().firstChild;

    while (node) {
      if (!isMarker(node)) {
        i++;
      }

      if (i > n) {
        break;
      } else {
        node = node.nextSibling;
      }
    }

    return node;
  }

  get nodesCount() {
    let count = 0;
    let node = getElement().firstChild;

    while (node) {
      if (!isMarker(node)) {
        count++;
      }

      node = node.nextSibling;
    }

    return count;
  }

  $(sel?: string | HTMLElement) {
    if (sel instanceof HTMLElement) {
      return NodeQuery.element(sel);
    } else if (typeof sel === 'string') {
      return NodeQuery.query(sel, getElement());
    } else if (sel !== undefined) {
      throw new Error(`Invalid this.$(${sel})`);
    } else {
      return NodeQuery.element(getElement());
    }
  }

  wrap(element: HTMLElement) {
    return NodeQuery.element(element);
  }

  click(selector: HTMLElement | string) {
    let element;
    if (typeof selector === 'string') {
      element = getElement().querySelector(selector) as HTMLElement | null;
    } else {
      element = selector;
    }

    let event = element!.click();

    return runLoopSettled(event);
  }

  textValue() {
    return getElement().textContent;
  }

  takeSnapshot() {
    let snapshot: ChildNode[] = (this.snapshot = []);

    let node = getElement().firstChild;

    while (node) {
      if (!isMarker(node)) {
        snapshot.push(node);
      }

      node = node.nextSibling;
    }

    return snapshot;
  }

  assertText(text: string) {
    this.assert.strictEqual(
      this.textValue(),
      text,
      `#qunit-fixture content should be: \`${text}\``
    );
  }

  assertInnerHTML(html: string) {
    this.cleanGxtArtifacts();
    equalInnerHTML(this.assert, getElement(), html);
  }

  assertHTML(html: string) {
    this.cleanGxtArtifacts();
    equalTokens(getElement(), html, `#qunit-fixture content should be: \`${html}\``);
  }

  /** Remove GXT rendering artifacts from #qunit-fixture before assertions */
  private cleanGxtArtifacts() {
    if (!__GXT_MODE__) return;
    const fixture = getElement();
    if (!fixture) return;

    // Remove GXT placeholder comments
    const walker = document.createTreeWalker(fixture, NodeFilter.SHOW_COMMENT, null);
    const toRemove: Comment[] = [];
    let node: Comment | null;
    while ((node = walker.nextNode() as Comment | null)) {
      const text = node.textContent || '';
      if (
        text.includes('placeholder') ||
        text.includes('if-entry') ||
        text.includes('each-entry') ||
        text.includes('list-target') ||
        text.includes('list item') ||
        text.includes('list bottom marker') ||
        text.includes('list fragment target marker') ||
        text.includes('curried-start') ||
        text.includes('curried-end')
      ) {
        toRemove.push(node);
      } else if (text === '') {
        // Empty comments are GXT markers UNLESS they are htmlRaw placeholders.
        // An htmlRaw placeholder is an empty comment immediately followed by
        // a /htmlRaw anchor comment (used for triple-stache reactive updates).
        const next = node.nextSibling;
        const isHtmlRawPlaceholder =
          next instanceof Comment && (next.textContent || '') === '/htmlRaw';
        if (!isHtmlRawPlaceholder) {
          toRemove.push(node);
        }
      }
    }
    for (const c of toRemove) c.parentNode?.removeChild(c);

    // Remove data-node-id attributes
    for (const el of fixture.querySelectorAll('[data-node-id]')) {
      el.removeAttribute('data-node-id');
    }

    // Unwrap <ember-outlet> elements - move their children up to parent
    let outletEl: Element | null;
    while ((outletEl = fixture.querySelector('ember-outlet'))) {
      const parent = outletEl.parentNode;
      if (parent) {
        while (outletEl.firstChild) {
          parent.insertBefore(outletEl.firstChild, outletEl);
        }
        parent.removeChild(outletEl);
      }
    }
  }

  assertElement(
    node: Element,
    {
      ElementType = HTMLElement,
      tagName,
      attrs = null,
      content = null,
    }: {
      ElementType?: typeof HTMLElement;
      tagName: string;
      attrs?: Record<string, unknown> | null;
      content?: unknown;
    }
  ) {
    if (!(node instanceof ElementType)) {
      throw new Error(`Expecting a ${ElementType.name}, but got ${String(node)}`);
    }

    equalsElement(this.assert, node, tagName, attrs, content);
  }

  assertComponentElement(
    node: ChildNode | null,
    {
      ElementType = HTMLElement,
      tagName = 'div',
      attrs = {},
      content = null,
    }: {
      ElementType?: typeof HTMLElement;
      tagName: string;
      attrs?: Record<string, unknown>;
      content?: unknown;
    }
  ) {
    if (node === null || !(node?.nodeType === 1 && node instanceof Element)) {
      this.assert.ok(false, `Expected a ${ElementType.name}, but got ${String(node)}`);
      return;
    }

    attrs = Object.assign(
      {},
      { id: regex(/^ember\d*$/), class: classes('ember-view') },
      attrs || {}
    );
    this.assertElement(node, { ElementType, tagName, attrs, content });
  }

  assertSameNode(actual: ChildNode | undefined, expected: ChildNode | undefined) {
    this.assert.strictEqual(actual, expected, 'DOM node stability');
  }

  assertInvariants(): void;
  assertInvariants(oldSnapshot: ChildNode[], newSnapshot: ChildNode[]): void;
  assertInvariants(oldSnapshot?: ChildNode[], newSnapshot?: ChildNode[]): void {
    if (!oldSnapshot) {
      assert('expected an existing snapshot', this.snapshot);
      oldSnapshot = this.snapshot;
    }
    newSnapshot = newSnapshot || this.takeSnapshot();

    this.assert.strictEqual(newSnapshot.length, oldSnapshot.length, 'Same number of nodes');

    for (let i = 0; i < oldSnapshot.length; i++) {
      this.assertSameNode(newSnapshot[i], oldSnapshot[i]);
    }
  }

  assertPartialInvariants(start: number, end: number) {
    assert('expected an existing snapshot', this.snapshot);
    this.assertInvariants(this.snapshot, this.takeSnapshot().slice(start, end));
  }
}
