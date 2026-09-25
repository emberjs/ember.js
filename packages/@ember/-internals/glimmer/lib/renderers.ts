import type { BaseRenderer } from './base-renderer';

/**
 * Every renderer that has at least one live root.
 *
 * This covers each application's `renderer:-dom`
 * and every renderer that `renderComponent` created.
 *
 * It lives in its own module so that `@ember/debug`
 * can read it without importing the renderer.
 */
export const renderers: BaseRenderer[] = [];
