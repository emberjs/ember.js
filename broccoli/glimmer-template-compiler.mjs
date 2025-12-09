import '@swc-node/register/esm-register';

// this needs to be async because otherwise the esm-register above hasn't taken
// effect yet.
const minimal = await import('../packages/ember-template-compiler/minimal.ts');

const { precompile, _buildCompileOptions, _preprocess, _print } = minimal;
export { precompile, _buildCompileOptions, _preprocess, _print };
