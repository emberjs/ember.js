"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.KEYS = {
    named: {
        '@index': (_, index) => String(index),
        '@primitive': (item) => String(item),
    },
    default: (key) => (item) => String(item[key]),
};
