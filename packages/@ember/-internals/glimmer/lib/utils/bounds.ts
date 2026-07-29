// The symbol under which a classic component's rendered bounds are stashed.
// It lives in its own module (rather than in the curly component manager)
// because the renderer's `getBounds` reads it, and the renderer is part of
// builds that exclude classic components.
export const BOUNDS = Symbol('BOUNDS');
