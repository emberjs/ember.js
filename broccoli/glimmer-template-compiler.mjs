import '@swc-node/register/esm-register';

// this needs to be async because otherwise the esm-register above hasn't taken
// effect yet.
const minimal = await import('../packages/ember-template-compiler/minimal.ts');

const { precompile: glimmerPrecompile, _buildCompileOptions, _preprocess, _print } = minimal;
export { _buildCompileOptions, _preprocess, _print };

let clientId = 0;

/**
 * GXT integration: for strict-mode templates (modern Octane-style), produce
 * BOTH the standard glimmer-vm bytecode (so that the classic ClassicRootState /
 * outlet / routing path keeps working) AND embed the raw HBS source so that
 * GXT's runtime compiler can also render these templates when called through the
 * modern `renderComponent` API.
 *
 * Classic / non-strict-mode templates continue to use the standard glimmer-vm
 * bytecode path unchanged.
 */
export function precompile(templateString, options = {}) {
  const compileOptions = _buildCompileOptions(options);
  const isStrict = options.strictMode ?? compileOptions?.strictMode ?? false;

  // Always produce glimmer-vm bytecode (needed for ClassicRootState / routing).
  const glimmerBytecode = glimmerPrecompile(templateString, compileOptions);

  // Classic (non-strict) templates: no GXT, return glimmer bytecode as-is.
  if (!isStrict) {
    return glimmerBytecode;
  }

  // Strict-mode templates: augment the glimmer output with the raw HBS source
  // so that the templateFactory can also compile a GXT version.
  // We parse the glimmer output (a JS expression like `{ block: "...", ... }`),
  // inject a `gxtSource` field, and return the augmented object literal.
  //
  // Note: `glimmerPrecompile` returns a JSON-like object literal string, e.g.:
  //   `{"id":"abc","block":"[...]","moduleName":"foo","scope":null,"isStrictMode":true}`
  // We inject `"gxtSource":"<raw HBS>"` into it.
  let transformedSource = templateString;
  try {
    const ast = _preprocess(templateString, compileOptions);
    transformedSource = _print(ast);
  } catch {
    transformedSource = templateString;
  }

  // Inject gxtSource into the glimmer output JSON
  try {
    const parsed = JSON.parse(glimmerBytecode);
    parsed.gxtSource = transformedSource;
    return JSON.stringify(parsed);
  } catch {
    // If we can't parse/augment, fall back to standard glimmer output
    return glimmerBytecode;
  }
}
