/**
 * Ember Inspector global hook (GXT MVP).
 *
 * Installs a `window.__EMBER_INSPECTOR_GXT__` bridge so the Ember
 * Inspector DevTools extension can detect that the app is running
 * under the GXT backend and route component-tree / devtools queries
 * through our adapter instead of the (non-functional) opcode-based
 * DebugRenderTree path.
 *
 * This file is intentionally side-effect-only: importing it installs
 * the hook. The import is wired in from `manager.ts` so the hook is
 * ready by the time the extension's content-script probes for it.
 *
 * See INSPECTOR.md for what's supported vs stubbed.
 */

import {
  getGxtComponentTree,
  gxtInspectorStubs,
  type InspectorNode,
} from './ember-inspector-adapter';

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    __EMBER_INSPECTOR_GXT__?: {
      version: string;
      getComponentTree(owner: unknown): InspectorNode[];
      getRenderPerformance(): { components: unknown[] };
      getViewBounds(owner: unknown, id: string): DOMRect | null;
      highlightComponent(owner: unknown, id: string): void;
      getRerenderReasons(id: string): unknown[];
      [key: string]: unknown;
    };
  }
}

export function installGxtInspectorHook(): void {
  if (typeof window === 'undefined') return;
  if ((window as Window).__EMBER_INSPECTOR_GXT__) return; // idempotent

  (window as Window).__EMBER_INSPECTOR_GXT__ = {
    version: '0.0.1-mvp',
    getComponentTree: getGxtComponentTree,
    getRenderPerformance: gxtInspectorStubs.getRenderPerformance,
    getViewBounds: gxtInspectorStubs.getViewBounds,
    highlightComponent: gxtInspectorStubs.highlightComponent,
    getRerenderReasons: gxtInspectorStubs.getRerenderReasons,
  };
}

// Install immediately on module load so the hook is ready by the time
// the extension content-script probes for it.
installGxtInspectorHook();
