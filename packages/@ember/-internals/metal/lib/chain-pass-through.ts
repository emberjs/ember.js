// Descriptors in this set tell the observer chain machinery (chain-tags) to
// track the underlying value rather than the descriptor's own computation.
// It lives in its own module (rather than in chain-tags) so that `tracked`
// can register its descriptors without pulling the chain machinery into
// builds that exclude the classic object model.
export const CHAIN_PASS_THROUGH = new WeakSet();
