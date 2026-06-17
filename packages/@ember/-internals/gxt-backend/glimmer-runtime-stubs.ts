/**
 * Glimmer-VM stub surface for the GXT ROLLUP DIST ONLY.
 *
 * The GXT build replaces the Glimmer VM with the @lifeart/gxt backend, but a
 * handful of classic-only modules under `@glimmer/runtime/lib/*` were still
 * being bundled (~140KB of dead opcode/append machinery) because the
 * ember-side classic fallback branches import them at module top level —
 * `renderMain`/`renderComponent` (lib/render), `clientBuilder`
 * (lib/vm/element-builder), `rehydrationBuilder` (lib/vm/rehydrate-builder)
 * and the SSR DOM builders (lib/dom/api, lib/dom/helper). Under the inlined
 * `__GXT_MODE__ = true` those branches are unreachable, so the GXT rollup
 * build resolves those module ids HERE instead (see GXT_DIST_VM_STUBS in
 * scripts/gxt-alias-map.mjs and the resolvePackages wiring) — one stub module
 * whose unused exports tree-shake per importer.
 *
 * NOT aliased (kept as the real vendored leaf modules, all light and live
 * under GXT): lib/modifiers/on, lib/component/template-only, lib/helpers/*,
 * lib/environment (inTransaction wraps the GXT destroy path), lib/vm/arguments
 * and lib/curried-value (small, and reachable from the kept helpers),
 * lib/dom/props.
 *
 * The vite TEST pipeline never sees this file — the in-repo suite runs the
 * real VM for the [integration] jit tests.
 */

function vmStub(name: string): (...args: unknown[]) => never {
  return () => {
    throw new Error(
      `\`${name}\` is part of the classic Glimmer VM render pipeline, which is ` +
        'not included in the GXT build of ember-source. This code path is ' +
        'unreachable under the GXT backend; reaching this stub means a ' +
        'classic-only branch executed in GXT mode — please report it.'
    );
  };
}

// lib/render
export const renderMain = vmStub('renderMain');
export const renderComponent = vmStub('renderComponent');
export const renderSync = vmStub('renderSync');

// lib/vm/element-builder
export const clientBuilder = vmStub('clientBuilder');
export const NewElementBuilder = vmStub('NewElementBuilder');

// lib/vm/rehydrate-builder — `isSerializationFirstNode` is a trivial,
// side-effect-free predicate that the glimmer package re-exports publicly;
// keep it REAL (mirrors the vendored implementation byte-for-byte).
export const SERIALIZATION_FIRST_NODE_STRING = '%+b:0%';
export function isSerializationFirstNode(node: { nodeValue: string | null }): boolean {
  return node.nodeValue === SERIALIZATION_FIRST_NODE_STRING;
}
export const rehydrationBuilder = vmStub('rehydrationBuilder');
export const RehydrateBuilder = vmStub('RehydrateBuilder');

// lib/dom/api (node/SSR tree construction)
export const DOMTreeConstruction = vmStub('DOMTreeConstruction');

// lib/dom/helper
export const DOMChanges = vmStub('DOMChanges');

// @glimmer/node (SSR) — FastBoot/SSR is out of scope for the GXT preview
// (RFC §7); these are re-exported by glimmer/lib/dom.ts.
export const serializeBuilder = vmStub('serializeBuilder');
const NodeDOMTreeConstruction = vmStub('NodeDOMTreeConstruction');
export default NodeDOMTreeConstruction;

// Bare '@glimmer/runtime' index — only the wrappers' dynamic-import
// UpdatingVM patch reaches it in the dist graph; `undefined` makes that
// site's `if (UVM && ...)` guard a no-op (no VM runs in the GXT dist).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const UpdatingVM: any = undefined;

// lib/compiled/opcodes/-debug-strip — permissive checkers for the one kept
// importer (lib/vm/arguments). The real module's checker values reference the
// opcode registrar classes, which is exactly the dead-code chain this stub
// severs; `check()` calls are debug-stripped in production anyway.
const permissiveChecker = {
  validate: (_value: unknown): boolean => true,
  expected: (): string => 'unknown (gxt stub checker)',
};
export const CheckReference = permissiveChecker;
export const CheckScope = permissiveChecker;
export const CheckCompilableBlock = permissiveChecker;
export const CheckArguments = permissiveChecker;
export const CheckCapturedArguments = permissiveChecker;
export const CheckHelper = permissiveChecker;
