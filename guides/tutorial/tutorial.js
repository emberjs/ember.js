"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const object_reference_1 = require("@glimmer/object-reference");
const program_1 = require("@glimmer/program");
const runtime_1 = require("@glimmer/runtime");
const util_1 = require("@glimmer/util");
const document_1 = __importDefault(require("@simple-dom/document"));
const serializer_1 = __importDefault(require("@simple-dom/serializer"));
const void_map_1 = __importDefault(require("@simple-dom/void-map"));
const context_1 = require("./context");
const env_1 = require("./env");
/**
 * The source code for the module we're compiling.
 */
let mainSource = util_1.strip `
  {{~#let "hello" "world" as |hello world|~}}
    <Second
      @hello={{hello}}
      @world={{world}}
      @suffix={{this.suffix}}
      @num={{this.num}}
    />
  {{~/let~}}
`;
let main = context_1.compile(mainSource);
/**
 * Finalize the program, getting back the compilation artifacts:
 *
 * - the serialized program, containing all of the compiled opcodes
 * - the constant pool, mostly used for storing strings
 */
let payload = program_1.artifacts(context_1.context);
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
let runtime = runtime_1.Runtime(document, payload, env_1.RUNTIME_RESOLVER);
/**
 * Create an `UpdatableReference` for the value of `this` in the module. Using an
 * UpdatableReference allows us to change it later and re-render the output.
 */
let state = object_reference_1.State({ suffix: '!', num: 5 });
/**
 * Create a new element to render into.
 */
let element = document.createElement('main');
/**
 * Create a cursor position for the rendering, which is just the element itself.
 */
let cursor = { element, nextSibling: null };
let iterator = runtime_1.renderAot(runtime, main, cursor, state);
let result = runtime_1.renderSync(runtime.env, iterator);
console.log(serialize(element));
state.update({ suffix: '?', num: 10 });
result.rerender();
console.log(serialize(element));
function serialize(element) {
    return new serializer_1.default(void_map_1.default).serialize(element);
}
