// The curly component manager registers itself here when its module is
// evaluated. This lets the resolver ask "is this the curly manager?" without
// statically depending on the curly manager module, so apps that never use
// classic (curly) components don't pay for it in their bundles.
let curlyManager: object | null = null;

export function markAsCurlyManager(manager: object): void {
  curlyManager = manager;
}

export function isCurlyManager(manager: object): boolean {
  return curlyManager !== null && manager === curlyManager;
}
