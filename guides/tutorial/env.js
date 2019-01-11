"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reference_1 = require("@glimmer/reference");
const runtime_1 = require("@glimmer/runtime");
exports.RUNTIME_RESOLVER = {
    resolve(handle) {
        if (handle >= TABLE.length) {
            throw new Error(`Unexpected handle ${handle}`);
        }
        else {
            return TABLE[handle];
        }
    },
};
const increment = (args) => {
    return reference_1.map(args.positional.at(0), (i) => i + 1);
};
const TEMPLATE_ONLY_COMPONENT = { state: null, manager: new runtime_1.SimpleComponentManager() };
const TABLE = [increment, TEMPLATE_ONLY_COMPONENT];
