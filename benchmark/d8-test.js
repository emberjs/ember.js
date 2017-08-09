load("/mnt/c/Code/glimmer/dist/assets/loader.js");
loader.noConflict({ define: 'enifed' });
load("/mnt/c/Code/glimmer/dist/amd/glimmer-common.amd.js");
load("/mnt/c/Code/glimmer/dist/amd/glimmer-runtime.amd.js");
load("/mnt/c/Code/glimmer/dist/amd/glimmer-compiler.amd.js");
load("/mnt/c/Code/glimmer/dist/amd/glimmer-demos.amd.js");
load("/mnt/c/Code/glimmer/dist/amd/glimmer-demos.amd.js");
load("/mnt/c/Code/glimmer/dist/node_modules/simple-dom.js");

{

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