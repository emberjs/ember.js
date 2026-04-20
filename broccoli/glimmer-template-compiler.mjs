import '@swc-node/register/esm-register';

// this needs to be async because otherwise the esm-register above hasn't taken
// effect yet.
const minimal = await import('../packages/ember-template-compiler/minimal.ts');

const { precompile: glimmerPrecompile, _buildCompileOptions, _preprocess, _print } = minimal;
export { _buildCompileOptions, _preprocess, _print };


/**
 * GXT full replacement: every template is compiled BOTH ways.
 *
 * 1. Glimmer-vm bytecode (block) — kept for @glimmer-workspace VM tests.
 * 2. Raw HBS source (gxtSource) — used by GXT for all app rendering.
 *
 * The renderer detects __gxt on the template factory and always uses GXT.
 */
export function precompile(templateString, options = {}) {
  const compileOptions = _buildCompileOptions(options);
  const glimmerBytecode = glimmerPrecompile(templateString, compileOptions);

  let gxtSource = templateString;
  try {
    const ast = _preprocess(templateString, compileOptions);
    gxtSource = _print(ast);
  } catch {}

  try {
    const parsed = JSON.parse(glimmerBytecode);
    parsed.gxtSource = gxtSource;
    return JSON.stringify(parsed);
  } catch {
    return glimmerBytecode;
  }
}
