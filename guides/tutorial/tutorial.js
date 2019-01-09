"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const compiler_1 = require("@glimmer/compiler");
const object_reference_1 = require("@glimmer/object-reference");
const opcode_compiler_1 = require("@glimmer/opcode-compiler");
const program_1 = require("@glimmer/program");
const runtime_1 = require("@glimmer/runtime");
const util_1 = require("@glimmer/util");
const serializer_1 = __importDefault(require("@simple-dom/serializer"));
const void_map_1 = __importDefault(require("@simple-dom/void-map"));
const document_1 = __importDefault(require("@simple-dom/document"));
const context_1 = require("./context");
const env_1 = require("./env");
const runtime_2 = require("@glimmer/runtime");
const opcode_compiler_2 = require("@glimmer/opcode-compiler");
/**
 * The source code for the module we're compiling.
 */
let source = util_1.strip `
  <div>hello {{this.world}}</div>
`;
/**
 * Precompile the source code for this module into the wire format. In JIT mode, the wire format
 * is shipped over the wire, and the compilation process is finished as needed. In AOT (which
 * we're using here), we continue to compile the wire format immediately.
 */
let wire = compiler_1.precompile(source);
console.log('Wire Format', wire);
/**
 * Rehydrate the wire format into a compilable module.
 */
let layout = opcode_compiler_2.Layout(wire);
console.log('Compilable Layout', layout);
/**
 * The ResolverDelegate is an object that resolves global names in modules at compile-time.
 * If possible, the ResolverDelegate can also tell the compiler that a particular component
 * uses a restricted subset of all available component capabilities, which allows the
 * compiler to specialize the bytecode used when invoking that component.
 *
 * (TODO: At the moment, the ResolverDelegate doesn't do anything, which makes it suitable
 * for compiling static content only)
 *
 * The `SyntaxCompilationContext` is the internal compilation context used to compile all
 * modules.
 */
let syntax = opcode_compiler_1.Syntax(new context_1.TutorialResolver());
/**
 * Compile the module, getting back a handle that we can use to invoke it
 */
let compiled = layout.compile(syntax);
console.log('Compiled Handle', compiled);
/**
 * Finalize the program, getting back the compilation artifacts:
 *
 * - the serialized program, containing all of the compiled opcodes
 * - the constant pool, mostly used for storing strings
 */
let payload = program_1.artifacts(syntax.program);
/**
 * Glimmer's internals are restricted to using a small subset of DOM
 * called Simple DOM. In a browser, you can use the normal DOM, but
 * since we're in Node, we can use the simple-dom package for rendering.
 *
 * Unlike JSDOM, simple-dom doesn't attempt to emulate the entire
 * surface of the DOM, focusing instead on the DOM as a data structure.
 * This also makes it ideal for server-side rendering, and it is, in
 * fact, used in Ember's SSR solution, FastBoot.
 *
 * The entire interface definition is at:
 * https://github.com/ember-fastboot/simple-dom/blob/master/packages/%40simple-dom/interface/index.d.ts
 */
let document = document_1.default();
/**
 * Now we're going to execute the module that we compiled, so we need
 * a runtime.
 *
 * 1. The `RuntimeEnvironment` is the internal opauqe context used to evaluate
 * compiled Glimmer programs. We need to instantiate it with:
 *
 * - the document we're rendering into
 * - a function for extracting a protocol from a URL
 * - TODO: explain or abstract iterable keys
 *
 * 2. We also need to supply a `RuntimeResolver`, the runtime counterpart to
 * the compile-time `ResolverDelegate`. (Like the compile-time delegate,
 * the runtime resolver currently doesn't do anything. Once it does,
 * explain how the compile-time and runtime are meant to work together).
 *
 * 3. Finally, we need to rehydrate the compilation artifacts.
 */
let runtime = {
    env: new runtime_2.RuntimeEnvironment({
        document,
        protocolForURL: (url) => new URL(url).protocol,
        iterable: env_1.KEYS,
    }),
    resolver: new env_1.TutorialRuntimeResolver(),
    program: program_1.RuntimeProgramImpl.hydrate(payload),
};
/**
 * Create an `UpdatableReference` for the value of `this` in the module. Using an
 * UpdatableReference allows us to change it later and re-render the output.
 */
let self = new object_reference_1.UpdatableReference({ world: 'world' });
/**
 * Create a new element to render into.
 */
let element = document.createElement('main');
/**
 * Create a cursor position for the rendering, which is just the element itself.
 */
let cursor = { element, nextSibling: null };
/**
 * We're going to use the normal client-side rendering builder to render into.
 */
let builder = runtime_1.NewElementBuilder.forInitialRender(runtime.env, cursor);
let iterator = runtime_1.renderAotMain(runtime, self, new env_1.TutorialDynamicScope(), builder, compiled);
runtime_1.renderSync(runtime.env, iterator);
let serialized = new serializer_1.default(void_map_1.default).serialize(element);
console.log(serialized);
