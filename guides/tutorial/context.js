"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const opcode_compiler_1 = require("@glimmer/opcode-compiler");
const compiler_1 = require("@glimmer/compiler");
const util_1 = require("@glimmer/util");
const COMPONENTS = {
    Second: {
        source: `<p>{{@hello}} {{@world}}{{@suffix}} ({{increment @num}})</p>`,
        handle: 1,
    },
};
const HELPERS = {
    increment: 0,
};
exports.RESOLVER_DELEGATE = {
    getCapabilities() {
        return {
            dynamicLayout: false,
            dynamicTag: false,
            prepareArgs: false,
            createArgs: false,
            attributeHook: false,
            elementHook: false,
            dynamicScope: false,
            createCaller: false,
            updateHook: false,
            createInstance: false,
        };
    },
    getLayout(handle) {
        let key = util_1.keys(COMPONENTS).find(k => COMPONENTS[k].handle === handle);
        if (key) {
            return opcode_compiler_1.Component(compiler_1.precompile(COMPONENTS[key].source));
        }
        else {
            throw new Error(`Unexpected layout handle ${handle}`);
        }
    },
    lookupHelper(name) {
        if (name in HELPERS)
            return HELPERS[name];
        return null;
    },
    lookupComponentDefinition(name) {
        if (name in COMPONENTS) {
            return COMPONENTS[name].handle;
        }
        else {
            throw new Error(`Unexpected global component ${name}`);
        }
    },
};
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
exports.context = opcode_compiler_1.Context(exports.RESOLVER_DELEGATE);
function compile(source) {
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
    let component = opcode_compiler_1.Component(wire);
    console.log('Compilable component', component);
    /**
     * Compile the module, getting back a handle that we can use to invoke it
     */
    let compiled = component.compile(exports.context);
    console.log('Compiled Handle', compiled);
    return compiled;
}
exports.compile = compile;
