// gxt NATIVE layer (EMBER_RENDER_BACKEND=gxt-native) — shared failure helper.
//
// documentedDrop(): a legacy surface that the native build deliberately does
// not support. Not a TODO.

export function documentedDrop(what: string, instead: string): never {
  throw new Error(
    `${what} is not supported by the gxt-native build (documented legacy drop). ${instead}`
  );
}
