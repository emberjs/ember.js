"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("@glimmer/util");
class TutorialRuntimeResolver {
    lookupComponentDefinition(_name, _referrer) {
        throw new Error('Method not implemented.');
    }
    lookupPartial(_name, _referrer) {
        throw new Error('Method not implemented.');
    }
    resolve(_handle) {
        throw new Error('Method not implemented.');
    }
}
exports.TutorialRuntimeResolver = TutorialRuntimeResolver;
class TutorialDynamicScope {
    constructor(bucket = null) {
        if (bucket) {
            this.bucket = util_1.assign({}, bucket);
        }
        else {
            this.bucket = {};
        }
    }
    get(key) {
        return this.bucket[key];
    }
    set(key, reference) {
        return (this.bucket[key] = reference);
    }
    child() {
        return new TutorialDynamicScope(this.bucket);
    }
}
exports.TutorialDynamicScope = TutorialDynamicScope;
exports.KEYS = {
    named: {
        '@index': (_, index) => String(index),
        '@primitive': (item) => String(item),
    },
    default: (key) => (item) => String(item[key]),
};
