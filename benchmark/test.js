/**
 * IR Hydra:
 *
 * --trace-hydrogen --trace-phase=Z --trace-deopt --code-comments --hydrogen-track-positions --redirect-code-traces --print-opt-code
 */

{
  let target = os.system('printenv', ['TARGET']).slice(0, -1);

  function js(path) {
    load(`${target}/${path}`);
  }

  js("dist/assets/loader.js");
  loader.noConflict({ define: 'enifed' });
  js("dist/amd/glimmer-common.amd.js");
  js("dist/amd/glimmer-runtime.amd.js");
  js("dist/amd/glimmer-compiler.amd.js");
  js("dist/amd/glimmer-demos.amd.js");
  js("dist/amd/glimmer-demos.amd.js");
  js("dist/node_modules/simple-dom.js");

  let { precompile } = require("glimmer-compiler");
  let { TestEnvironment, TestDynamicScope } = require("glimmer-test-helpers");
  let { DOMTreeConstruction } = require("glimmer-runtime");
  let { UpdatableReference } = require("glimmer-object-reference");
  let { compile, init, generateServers } = require("glimmer-demos/lib/uptime");

  let document = new SimpleDOM.Document();

  let env = new TestEnvironment({
    document,
    appendOperations: new DOMTreeConstruction(document)
  });

  let output = document.createElement('div');
  let { app } = compile(env);

  env.begin();

  serversRef = new UpdatableReference({ servers: generateServers(), fps: null });
  result = app.render(serversRef, output, new TestDynamicScope());

  env.commit();

  // %DebugPrint(SimpleDOM);

}