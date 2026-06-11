// This symbol is set on classic components (and the View interface) to track
// the rendered bounds. It lives in its own module so that consumers (like the
// renderer) don't need to import the entire curly component manager to use it.
export const BOUNDS = Symbol('BOUNDS');
