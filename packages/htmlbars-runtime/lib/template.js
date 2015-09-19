import Builder from './builder';
import { intern } from './utils';
import { RenderResult } from './render';
import { HelperInvocationReference, ConcatReference, ConstReference } from './reference';
import { HelperMorph, ValueMorph } from './morphs/inline';
import { Morph } from './morph';
import { BlockHelperMorph } from "./morphs/block";
import { AttrMorph, SetPropertyMorph } from "./morphs/attrs";
const EMPTY_ARRAY = Object.freeze([]);
export default class Template {
    constructor(options) {
        this.meta = options.meta || {};
        this.root = options.root;
        this.position = options.position;
        this.arity = options.locals ? options.locals.length : 0;
        this.statements = options.statements || EMPTY_ARRAY;
        this.locals = options.locals || EMPTY_ARRAY;
        this.spec = options.spec || null;
        this.isEmpty = options.isEmpty || false;
        Object.seal(this);
    }
    static fromSpec(specs) {
        let templates = new Array(specs.length);
        for (let i = 0; i < specs.length; i++) {
            let spec = specs[i];
            templates[i] = new Template({
                statements: buildStatements(spec.statements, templates),
                root: templates,
                position: i,
                meta: spec.meta,
                locals: spec.locals,
                isEmpty: spec.statements.length === 0,
                spec: spec
            });
        }
        return templates[templates.length - 1];
    }
    static fromStatements(statements) {
        return new Template({
            statements,
            root: null,
            position: null,
            meta: null,
            locals: null,
            isEmpty: statements.length === 0,
            spec: null
        });
    }
    prettyPrint() {
        function pretty(obj) {
            if (typeof obj.prettyPrint === 'function')
                return obj.prettyPrint();
            else
                throw new Error(`Cannot pretty print ${obj.constructor.name}`);
        }
        return this.root.map(template => {
            return template.statements.map(statement => pretty(statement));
        });
    }
    evaluate(morph, frame) {
        let builder = new Builder(morph, frame);
        this.statements.forEach(builder.render, builder);
        let morphs = builder.morphList();
        let bounds = builder.bounds();
        return new RenderResult({ morph, morphs, bounds, template: this, locals: this.locals });
    }
    render(self, env, options, blockArguments) {
        let scope = env
            .createRootScope()
            .initTopLevel(self, this.locals, blockArguments, options.hostOptions);
        let frame = env.pushFrame(scope);
        let rootMorph = new RootMorph(options.appendTo);
        return this.evaluate(rootMorph, frame);
    }
}
class RootMorph {
    constructor(element) {
        this.parentNode = element;
    }
}
class StaticExpression {
    constructor() {
        this.isStatic = true;
    }
}
class DynamicExpression {
    constructor() {
        this.isStatic = false;
    }
}
export class Block extends DynamicExpression {
    constructor(options) {
        super();
        this.path = options.path;
        this.params = options.params;
        this.templates = options.templates;
    }
    static fromSpec(sexp, children) {
        let [, path, params, hash, templateId, inverseId] = sexp;
        return new Block({
            path,
            params: ParamsAndHash.fromSpec(params, hash),
            templates: Templates.fromSpec(templateId, inverseId, children)
        });
    }
    static build(options) {
        return new Block(options);
    }
    prettyPrint() {
        return `Block(${this.path}) { params=${this.params.prettyPrint()} templates=${this.templates.prettyPrint()} }`;
    }
    evaluate(stack) {
        let { path, params, templates } = this;
        return stack.createMorph(BlockHelperMorph, { path, params, templates });
    }
}
export class Inline extends DynamicExpression {
    constructor(options) {
        super();
        this.path = options.path;
        this.trustingMorph = options.trustingMorph;
        this.params = options.params;
    }
    static fromSpec(sexp) {
        let [, path, params, hash, trust] = sexp;
        return new Inline({
            path,
            trustingMorph: trust,
            params: ParamsAndHash.fromSpec(params, hash),
        });
    }
    static build(_path, params, trust) {
        let path = internPath(_path);
        return new Inline({ path, params, trustingMorph: trust });
    }
    prettyPrint() {
        return `Inline(${this.path}) { params=${this.params.prettyPrint()} trusted=${this.trustingMorph} }`;
    }
    evaluate(stack) {
        let { path, params, trustingMorph } = this;
        return stack.createMorph(HelperMorph, { path, params, trustingMorph });
    }
}
export class Unknown extends DynamicExpression {
    constructor(options) {
        super();
        this.ref = options.ref;
        this.trustingMorph = !!options.unsafe;
    }
    static fromSpec(sexp) {
        let [, path, unsafe] = sexp;
        return new Unknown({ ref: new Ref(path), unsafe });
    }
    static build(path, unsafe) {
        return new Unknown({ ref: Ref.build(path), unsafe });
    }
    prettyPrint() {
        return `Unknown(${this.ref.prettyPrint()}) { trust=${this.trustingMorph} }`;
    }
    evaluate(stack, frame) {
        let { ref, trustingMorph } = this;
        ref = ref.isHelper(frame) ? frame.lookupHelper(ref.path()) : ref;
        return stack.createMorph(ValueMorph, { ref, trustingMorph });
    }
}
export class DynamicProp extends DynamicExpression {
    constructor(options) {
        super();
        this.name = options.name;
        this.value = options.value;
    }
    static fromSpec(sexp) {
        let [, name, value, namespace] = sexp;
        return new DynamicProp({
            name,
            namespace,
            value: buildExpression(value)
        });
    }
    static build(name, value, namespace = null) {
        return new DynamicProp({ name, value, namespace });
    }
    prettyPrint() {
        let { name, value } = this;
        return `DynamicProp { ${name}=${value.prettyPrint()} }`;
    }
    evaluate(stack) {
        let { name, value } = this;
        return stack.createMorph(SetPropertyMorph, { name, value });
    }
}
export class DynamicAttr extends DynamicExpression {
    constructor(options) {
        super();
        this.name = options.name;
        this.value = options.value;
        this.namespace = options.namespace;
    }
    static fromSpec(sexp) {
        let [, name, value, namespace] = sexp;
        return new DynamicAttr({
            name,
            namespace,
            value: buildExpression(value)
        });
    }
    static build(name, value, namespace = null) {
        return new DynamicAttr({ name, value, namespace });
    }
    prettyPrint() {
        let { name, value, namespace } = this;
        if (namespace) {
            return `DynamicAttr { ${name}=${value.prettyPrint()}; namespace=${namespace} }`;
        }
        else {
            return `DynamicAttr { ${name}=${value.prettyPrint()} }`;
        }
    }
    evaluate(stack) {
        let { name, value, namespace } = this;
        return stack.createMorph(AttrMorph, { name, value, namespace });
    }
}
export class Component extends DynamicExpression {
    constructor(options) {
        super();
        this.path = options.path;
        this.hash = options.hash;
        this.templates = options.templates;
    }
    static fromSpec(node, children) {
        let [, path, attrs, templateId, inverseId] = node;
        return new Component({
            path: new Ref(path),
            hash: Hash.fromSpec(attrs),
            templates: Templates.fromSpec(templateId, inverseId, children)
        });
    }
    static build(path, options) {
        return new Component({
            path: Ref.build(path),
            hash: options.hash || null,
            templates: Templates.build(options.default, options.inverse)
        });
    }
    prettyPrint() {
        let { path, hash, templates } = this;
        return `Component <${path} ${hash.prettyPrint()} ${templates.prettyPrint()}>`;
    }
    evaluate(stack, frame) {
        let { path, hash, templates } = this;
        if (frame.hasHelper([path])) {
            return stack.createMorph(BlockHelperMorph, { path: [path], params: ParamsAndHash.build(Params.empty(), hash), templates });
        }
        else {
            return stack.createMorph(FallbackMorph, { path, hash, template: templates._default });
        }
    }
}
class FallbackMorph extends Morph {
    init({ path, hash, template }) {
        this.tag = path;
        this.template = template;
        let attrs = [];
        hash.forEach((name, value) => {
            if (value.isStatic)
                attrs.push(StaticAttr.build(name, value.inner()));
            else
                attrs.push(DynamicAttr.build(name, value));
        });
        this.attrs = attrs;
    }
    append(stack) {
        let { tag, attrs, template } = this;
        stack.openElement(tag);
        attrs.forEach(attr => stack.appendStatement(attr));
        if (!template.isEmpty)
            stack.appendMorph(FallbackContents, { template });
        stack.closeElement();
    }
}
class FallbackContents extends Morph {
    init({ template }) {
        this.template = template;
    }
    append() {
        this.template.evaluate(this, this.frame);
    }
}
export class Text extends StaticExpression {
    constructor(options) {
        super();
        this.content = options.content;
    }
    static fromSpec(node) {
        let [, content] = node;
        return new Text({ content });
    }
    static build(content) {
        return new Text({ content });
    }
    prettyPrint() {
        return `Text(${JSON.stringify(this.content)})`;
    }
    evaluate(stack) {
        stack.appendText(this.content);
    }
}
export class Comment extends StaticExpression {
    constructor(options) {
        super();
        this.value = options.value;
    }
    static fromSpec(sexp) {
        let [, value] = sexp;
        return new Comment({ value });
    }
    static build(value) {
        return new Comment({ value });
    }
    prettyPrint() {
        return `Comment <!-- ${this.value} -->`;
    }
    evaluate(stack) {
        stack.appendComment(this.value);
    }
}
export class OpenElement extends StaticExpression {
    constructor(options) {
        super();
        this.tag = options.tag;
    }
    static fromSpec(sexp) {
        let [, tag] = sexp;
        return new OpenElement({ tag });
    }
    static build(tag) {
        return new OpenElement({ tag });
    }
    prettyPrint() {
        return `<${this.tag}>`;
    }
    evaluate(stack) {
        stack.openElement(this.tag);
    }
}
export class CloseElement extends StaticExpression {
    static fromSpec() {
        return new CloseElement();
    }
    static build() {
        return new CloseElement();
    }
    prettyPrint() {
        return `</>`;
    }
    evaluate(stack) {
        stack.closeElement();
    }
}
export class StaticAttr extends StaticExpression {
    constructor(options) {
        super();
        this.name = options.name;
        this.value = options.value;
        this.namespace = options.namespace;
    }
    static fromSpec(node) {
        let [, name, value, namespace] = node;
        return new StaticAttr({ name, value, namespace });
    }
    static build(name, value, namespace = null) {
        return new StaticAttr({ name, value, namespace });
    }
    prettyPrint() {
        let { name, value, namespace } = this;
        if (namespace) {
            return `StaticAttr { ${name}=${JSON.stringify(value)}; namespace=${namespace} }`;
        }
        else {
            return `StaticAttr { ${name}=${JSON.stringify(value)} }`;
        }
    }
    evaluate(stack) {
        let { name, value, namespace } = this;
        if (namespace) {
            stack.setAttributeNS(name, value, namespace);
        }
        else {
            stack.setAttribute(name, value);
        }
    }
}
// these are all constructors, indexed by statement type
const StatementNodes = {
    /// dynamic statements
    block: Block,
    inline: Inline,
    unknown: Unknown,
    //modifier: Modifier,
    dynamicAttr: DynamicAttr,
    dynamicProp: DynamicProp,
    component: Component,
    /// static statements
    text: Text,
    comment: Comment,
    openElement: OpenElement,
    closeElement: CloseElement,
    staticAttr: StaticAttr,
};
const BOUNDARY_CANDIDATES = {
    block: true,
    inline: true,
    unknown: true,
    component: true
};
class EvaluatedParams {
}
class EvaluatedHash {
    constructor({ keys, values }) {
        this._keys = keys;
        this._values = values;
    }
    forEach(callback) {
        let { _keys, _values } = this;
        for (let i = 0, l = _keys.length; i < l; i++) {
            callback(_keys[i], _values[i]);
        }
    }
}
export class Value extends StaticExpression {
    constructor(value) {
        super();
        this.value = value;
    }
    static fromSpec(value) {
        return new Value(value);
    }
    static build(value) {
        return new Value(value);
    }
    prettyPrint() {
        return JSON.stringify(this.value);
    }
    inner() {
        return this.value;
    }
    evaluate() {
        return new ConstReference(this.value);
    }
}
export class Get {
    constructor(options) {
        this.ref = options.ref;
    }
    static fromSpec(sexp) {
        let [, parts] = sexp;
        return new Get({ ref: new Ref(parts) });
    }
    static build(path) {
        return new Get({ ref: Ref.build(path) });
    }
    prettyPrint() {
        return `Get ${this.ref.prettyPrint()}`;
    }
    evaluate(frame) {
        return this.ref.evaluate(frame);
    }
}
// intern paths because they will be used as keys
function internPath(path) {
    return path.split('.').map(intern);
}
// this is separated out from Get because Unknown also has a ref, but it
// may turn out to be a helper
class Ref {
    constructor(parts) {
        this.parts = parts;
    }
    static build(path) {
        return new Ref(internPath(path));
    }
    prettyPrint() {
        return this.parts.join('.');
    }
    evaluate(frame) {
        let parts = this.parts;
        let path = frame.scope().getBase(parts[0]);
        for (let i = 1; i < parts.length; i++) {
            path = path.get(parts[i]);
        }
        return path;
    }
    path() {
        return this.parts;
    }
    isHelper(frame) {
        return frame.hasHelper(this.parts);
    }
}
export class Helper {
    constructor(options) {
        this.path = options.path;
        this.params = options.params;
    }
    static fromSpec(sexp) {
        let [, path, params, hash] = sexp;
        return new Helper({
            path: new Ref(path),
            params: ParamsAndHash.fromSpec(params, hash)
        });
    }
    static build(path, params, hash) {
        return new Helper({ path: Ref.build(path), params: new ParamsAndHash({ params, hash }) });
    }
    evaluate(frame) {
        let helper = frame.lookupHelper(this.path);
        let { params } = this;
        return HelperInvocationReference.fromStatements({ helper, params, frame });
    }
}
export class Concat {
    constructor(options) {
        this.parts = options.parts;
    }
    static fromSpec(sexp) {
        let [, params] = sexp;
        return new Concat({ parts: Params.fromSpec(params) });
    }
    static build(parts) {
        return new Concat({ parts });
    }
    evaluate(frame) {
        return new ConcatReference(this.parts.map(p => p.evaluate(frame)));
    }
}
const ExpressionNodes = {
    get: Get,
    helper: Helper,
    concat: Concat
};
export function buildStatements(statements, list) {
    if (statements.length === 0) {
        return EMPTY_ARRAY;
    }
    let built = statements.map(statement => StatementNodes[statement[0]].fromSpec(statement, list));
    if (statements[0][0] in BOUNDARY_CANDIDATES) {
        built[0].frontBoundary = true;
    }
    if (statements[statements.length - 1][0] in BOUNDARY_CANDIDATES) {
        built[built.length - 1].backBoundary = true;
    }
    return built;
}
function buildExpression(spec) {
    if (typeof spec !== 'object' || spec === null) {
        return Value.fromSpec(spec);
    }
    else {
        return ExpressionNodes[spec[0]].fromSpec(spec);
    }
}
export class ParamsAndHash {
    constructor(options) {
        this.params = options.params;
        this.hash = options.hash;
    }
    static fromSpec(params, hash) {
        return new ParamsAndHash({ params: Params.fromSpec(params), hash: Hash.fromSpec(hash) });
    }
    static build(params, hash) {
        return new ParamsAndHash({ params, hash });
    }
    prettyPrint() {
        return `ParamsAndHash { params=${this.params.prettyPrint()}, hash=${this.hash.prettyPrint()} }`;
    }
    evaluate(frame) {
        throw new Error("TODO: unimplemented evaluate for ParamsAndHash");
    }
}
class Enumerable {
    forEach(callback) {
        throw new Error(`unimplemented forEach for ${this.constructor.name}`);
    }
    map(callback) {
        let out = [];
        this.forEach(val => out.push(callback(val)));
        return out;
    }
}
class Params extends Enumerable {
    constructor(exprs) {
        super();
        this.params = exprs;
    }
    static fromSpec(sexp) {
        if (!sexp || sexp.length === 0)
            return Params.empty();
        return new Params(sexp.map(buildExpression));
    }
    static build(exprs) {
        return new Params(exprs);
    }
    static empty() {
        return (this._empty = this._empty || new Params([]));
    }
    forEach(callback) {
        this.params.forEach(callback);
    }
    prettyPrint() {
        return `Params [ ${this.params.map(p => p.prettyPrint()).join(', ')} ]`;
    }
    evaluate(frame) {
        throw new Error("TODO: unimplemented evaluate for Params");
    }
}
export class Hash {
    constructor({ keys, values }) {
        this.keys = keys;
        this.values = values;
    }
    static fromSpec(rawPairs) {
        if (!rawPairs) {
            return Hash.empty();
        }
        let keys = [];
        let values = [];
        for (let i = 0, l = rawPairs.length; i < l; i += 2) {
            let key = rawPairs[i];
            let expr = rawPairs[i + 1];
            keys.push(key);
            values.push(buildExpression(expr));
        }
        return new Hash({ keys, values });
    }
    static build(hash) {
        if (hash === undefined) {
            return Hash.empty();
        }
        let keys = [];
        let values = [];
        Object.keys(hash).forEach(key => {
            keys.push(key);
            values.push(hash[key]);
        });
        return new Hash({ keys, values });
    }
    static empty() {
        return (this._empty = this._empty || new Hash({ keys: EMPTY_ARRAY, values: EMPTY_ARRAY }));
    }
    entries() {
        throw new Error("unimplemented entries for Hash");
    }
    forEach(callback) {
        let { keys, values } = this;
        keys.forEach((key, i) => callback(key, values[i]));
    }
    prettyPrint() {
        let inside = this.keys.map((k, i) => `${k}=${this.values[i].prettyPrint()}`).join(', ');
        return `Hash { ${inside} }`;
    }
    evaluate(frame) {
        let { keys, values } = this;
        let out = new Array(values.length);
        for (let i = 0, l = values.length; i < l; i++) {
            out[i] = values[i].evaluate(frame);
        }
        return new EvaluatedHash({ keys, values: out });
    }
}
class Templates {
    constructor(options) {
        this._default = options.template;
        this._inverse = options.inverse;
    }
    static fromSpec(templateId, inverseId, children) {
        return new Templates({
            template: templateId === null ? null : children[templateId],
            inverse: inverseId === null ? null : children[inverseId],
        });
    }
    static build(template, inverse) {
        return new Templates({ template, inverse });
    }
    prettyPrint() {
        let { _default, _inverse } = this;
        return `Templates { default=${_default ? _default.position : 'none'}, inverse=${_inverse ? _inverse.position : 'none'} }`;
    }
    evaluate(frame) {
        throw new Error("unimplemented evaluate for ExpressionSyntax");
    }
}
export let builders = {
    value: Value.build,
    hash: Hash.build
};
export class TemplateBuilder {
    constructor() {
        this.statements = [];
    }
    template() {
        return Template.fromStatements(this.statements); // jshint ignore:line
    }
    specExpr(spec) {
        return buildExpression(spec);
    }
    params(params, hash) {
        return new ParamsAndHash({ params, hash });
    }
    openElement(tagName) {
        return OpenElement.build(tagName);
    }
    closeElement() {
        return CloseElement.build();
    }
    staticAttr(key, value) {
        return StaticAttr.build(key, value);
    }
    dynamicAttr(key, value, namespace = null) {
        return DynamicAttr.build(key, value);
    }
    inline(path, params = null, trust = false) {
        return Inline.build(path, params, trust);
    }
}
// export all statement nodes as builders via their static `build` method
Object.keys(StatementNodes).forEach(key => {
    let builderKey = `${key[0].toLowerCase()}${key.slice(1)}`;
    builders[builderKey] = StatementNodes[key].build;
});
Object.keys(builders).forEach(key => {
    TemplateBuilder.prototype[key] = function (...args) {
        this.statements.push(builders[key](...args));
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvaHRtbGJhcnMtcnVudGltZS9saWIvdGVtcGxhdGUudHMiXSwibmFtZXMiOlsiVGVtcGxhdGUiLCJUZW1wbGF0ZS5jb25zdHJ1Y3RvciIsIlRlbXBsYXRlLmZyb21TcGVjIiwiVGVtcGxhdGUuZnJvbVN0YXRlbWVudHMiLCJUZW1wbGF0ZS5wcmV0dHlQcmludCIsIlRlbXBsYXRlLnByZXR0eVByaW50LnByZXR0eSIsIlRlbXBsYXRlLmV2YWx1YXRlIiwiVGVtcGxhdGUucmVuZGVyIiwiUm9vdE1vcnBoIiwiUm9vdE1vcnBoLmNvbnN0cnVjdG9yIiwiU3RhdGljRXhwcmVzc2lvbiIsIlN0YXRpY0V4cHJlc3Npb24uY29uc3RydWN0b3IiLCJEeW5hbWljRXhwcmVzc2lvbiIsIkR5bmFtaWNFeHByZXNzaW9uLmNvbnN0cnVjdG9yIiwiQmxvY2siLCJCbG9jay5jb25zdHJ1Y3RvciIsIkJsb2NrLmZyb21TcGVjIiwiQmxvY2suYnVpbGQiLCJCbG9jay5wcmV0dHlQcmludCIsIkJsb2NrLmV2YWx1YXRlIiwiSW5saW5lIiwiSW5saW5lLmNvbnN0cnVjdG9yIiwiSW5saW5lLmZyb21TcGVjIiwiSW5saW5lLmJ1aWxkIiwiSW5saW5lLnByZXR0eVByaW50IiwiSW5saW5lLmV2YWx1YXRlIiwiVW5rbm93biIsIlVua25vd24uY29uc3RydWN0b3IiLCJVbmtub3duLmZyb21TcGVjIiwiVW5rbm93bi5idWlsZCIsIlVua25vd24ucHJldHR5UHJpbnQiLCJVbmtub3duLmV2YWx1YXRlIiwiRHluYW1pY1Byb3AiLCJEeW5hbWljUHJvcC5jb25zdHJ1Y3RvciIsIkR5bmFtaWNQcm9wLmZyb21TcGVjIiwiRHluYW1pY1Byb3AuYnVpbGQiLCJEeW5hbWljUHJvcC5wcmV0dHlQcmludCIsIkR5bmFtaWNQcm9wLmV2YWx1YXRlIiwiRHluYW1pY0F0dHIiLCJEeW5hbWljQXR0ci5jb25zdHJ1Y3RvciIsIkR5bmFtaWNBdHRyLmZyb21TcGVjIiwiRHluYW1pY0F0dHIuYnVpbGQiLCJEeW5hbWljQXR0ci5wcmV0dHlQcmludCIsIkR5bmFtaWNBdHRyLmV2YWx1YXRlIiwiQ29tcG9uZW50IiwiQ29tcG9uZW50LmNvbnN0cnVjdG9yIiwiQ29tcG9uZW50LmZyb21TcGVjIiwiQ29tcG9uZW50LmJ1aWxkIiwiQ29tcG9uZW50LnByZXR0eVByaW50IiwiQ29tcG9uZW50LmV2YWx1YXRlIiwiRmFsbGJhY2tNb3JwaCIsIkZhbGxiYWNrTW9ycGguaW5pdCIsIkZhbGxiYWNrTW9ycGguYXBwZW5kIiwiRmFsbGJhY2tDb250ZW50cyIsIkZhbGxiYWNrQ29udGVudHMuaW5pdCIsIkZhbGxiYWNrQ29udGVudHMuYXBwZW5kIiwiVGV4dCIsIlRleHQuY29uc3RydWN0b3IiLCJUZXh0LmZyb21TcGVjIiwiVGV4dC5idWlsZCIsIlRleHQucHJldHR5UHJpbnQiLCJUZXh0LmV2YWx1YXRlIiwiQ29tbWVudCIsIkNvbW1lbnQuY29uc3RydWN0b3IiLCJDb21tZW50LmZyb21TcGVjIiwiQ29tbWVudC5idWlsZCIsIkNvbW1lbnQucHJldHR5UHJpbnQiLCJDb21tZW50LmV2YWx1YXRlIiwiT3BlbkVsZW1lbnQiLCJPcGVuRWxlbWVudC5jb25zdHJ1Y3RvciIsIk9wZW5FbGVtZW50LmZyb21TcGVjIiwiT3BlbkVsZW1lbnQuYnVpbGQiLCJPcGVuRWxlbWVudC5wcmV0dHlQcmludCIsIk9wZW5FbGVtZW50LmV2YWx1YXRlIiwiQ2xvc2VFbGVtZW50IiwiQ2xvc2VFbGVtZW50LmZyb21TcGVjIiwiQ2xvc2VFbGVtZW50LmJ1aWxkIiwiQ2xvc2VFbGVtZW50LnByZXR0eVByaW50IiwiQ2xvc2VFbGVtZW50LmV2YWx1YXRlIiwiU3RhdGljQXR0ciIsIlN0YXRpY0F0dHIuY29uc3RydWN0b3IiLCJTdGF0aWNBdHRyLmZyb21TcGVjIiwiU3RhdGljQXR0ci5idWlsZCIsIlN0YXRpY0F0dHIucHJldHR5UHJpbnQiLCJTdGF0aWNBdHRyLmV2YWx1YXRlIiwiRXZhbHVhdGVkUGFyYW1zIiwiRXZhbHVhdGVkSGFzaCIsIkV2YWx1YXRlZEhhc2guY29uc3RydWN0b3IiLCJFdmFsdWF0ZWRIYXNoLmZvckVhY2giLCJWYWx1ZSIsIlZhbHVlLmNvbnN0cnVjdG9yIiwiVmFsdWUuZnJvbVNwZWMiLCJWYWx1ZS5idWlsZCIsIlZhbHVlLnByZXR0eVByaW50IiwiVmFsdWUuaW5uZXIiLCJWYWx1ZS5ldmFsdWF0ZSIsIkdldCIsIkdldC5jb25zdHJ1Y3RvciIsIkdldC5mcm9tU3BlYyIsIkdldC5idWlsZCIsIkdldC5wcmV0dHlQcmludCIsIkdldC5ldmFsdWF0ZSIsImludGVyblBhdGgiLCJSZWYiLCJSZWYuY29uc3RydWN0b3IiLCJSZWYuYnVpbGQiLCJSZWYucHJldHR5UHJpbnQiLCJSZWYuZXZhbHVhdGUiLCJSZWYucGF0aCIsIlJlZi5pc0hlbHBlciIsIkhlbHBlciIsIkhlbHBlci5jb25zdHJ1Y3RvciIsIkhlbHBlci5mcm9tU3BlYyIsIkhlbHBlci5idWlsZCIsIkhlbHBlci5ldmFsdWF0ZSIsIkNvbmNhdCIsIkNvbmNhdC5jb25zdHJ1Y3RvciIsIkNvbmNhdC5mcm9tU3BlYyIsIkNvbmNhdC5idWlsZCIsIkNvbmNhdC5ldmFsdWF0ZSIsImJ1aWxkU3RhdGVtZW50cyIsImJ1aWxkRXhwcmVzc2lvbiIsIlBhcmFtc0FuZEhhc2giLCJQYXJhbXNBbmRIYXNoLmNvbnN0cnVjdG9yIiwiUGFyYW1zQW5kSGFzaC5mcm9tU3BlYyIsIlBhcmFtc0FuZEhhc2guYnVpbGQiLCJQYXJhbXNBbmRIYXNoLnByZXR0eVByaW50IiwiUGFyYW1zQW5kSGFzaC5ldmFsdWF0ZSIsIkVudW1lcmFibGUiLCJFbnVtZXJhYmxlLmZvckVhY2giLCJFbnVtZXJhYmxlLm1hcCIsIlBhcmFtcyIsIlBhcmFtcy5jb25zdHJ1Y3RvciIsIlBhcmFtcy5mcm9tU3BlYyIsIlBhcmFtcy5idWlsZCIsIlBhcmFtcy5lbXB0eSIsIlBhcmFtcy5mb3JFYWNoIiwiUGFyYW1zLnByZXR0eVByaW50IiwiUGFyYW1zLmV2YWx1YXRlIiwiSGFzaCIsIkhhc2guY29uc3RydWN0b3IiLCJIYXNoLmZyb21TcGVjIiwiSGFzaC5idWlsZCIsIkhhc2guZW1wdHkiLCJIYXNoLmVudHJpZXMiLCJIYXNoLmZvckVhY2giLCJIYXNoLnByZXR0eVByaW50IiwiSGFzaC5ldmFsdWF0ZSIsIlRlbXBsYXRlcyIsIlRlbXBsYXRlcy5jb25zdHJ1Y3RvciIsIlRlbXBsYXRlcy5mcm9tU3BlYyIsIlRlbXBsYXRlcy5idWlsZCIsIlRlbXBsYXRlcy5wcmV0dHlQcmludCIsIlRlbXBsYXRlcy5ldmFsdWF0ZSIsIlRlbXBsYXRlQnVpbGRlciIsIlRlbXBsYXRlQnVpbGRlci5jb25zdHJ1Y3RvciIsIlRlbXBsYXRlQnVpbGRlci50ZW1wbGF0ZSIsIlRlbXBsYXRlQnVpbGRlci5zcGVjRXhwciIsIlRlbXBsYXRlQnVpbGRlci5wYXJhbXMiLCJUZW1wbGF0ZUJ1aWxkZXIub3BlbkVsZW1lbnQiLCJUZW1wbGF0ZUJ1aWxkZXIuY2xvc2VFbGVtZW50IiwiVGVtcGxhdGVCdWlsZGVyLnN0YXRpY0F0dHIiLCJUZW1wbGF0ZUJ1aWxkZXIuZHluYW1pY0F0dHIiLCJUZW1wbGF0ZUJ1aWxkZXIuaW5saW5lIl0sIm1hcHBpbmdzIjoiT0FBTyxPQUFPLE1BQU0sV0FBVztPQUN4QixFQUFFLE1BQU0sRUFBRSxNQUFNLFNBQVM7T0FDekIsRUFBRSxZQUFZLEVBQUUsTUFBTSxVQUFVO09BQ2hDLEVBQUUseUJBQXlCLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxNQUFNLGFBQWE7T0FhakYsRUFDTCxXQUFXLEVBQ1gsVUFBVSxFQUVYLE1BQU0saUJBQWlCO09BRWpCLEVBQUUsS0FBSyxFQUFFLE1BQU0sU0FBUztPQUV4QixFQUNMLGdCQUFnQixFQUNqQixNQUFNLGdCQUFnQjtPQUVoQixFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdCQUFnQjtBQUk1RCxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVB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TUEsR0FBR0EsTUFBTUEsQ0FBQ0E7SUFDdkJBLENBQUNBO0lBekNERCxPQUFPQSxRQUFRQSxDQUFDQSxRQUFrQkE7UUFDaENFLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO1lBQUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO1FBQUNBLENBQUNBO1FBRXZDQSxJQUFJQSxJQUFJQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUNkQSxJQUFJQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUVoQkEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsR0FBR0EsUUFBUUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7WUFDbkRBLElBQUlBLEdBQUdBLEdBQUdBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3RCQSxJQUFJQSxJQUFJQSxHQUFHQSxRQUFRQSxDQUFDQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN6QkEsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDZkEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDckNBLENBQUNBO1FBRURBLE1BQU1BLENBQUNBLElBQUlBLElBQUlBLENBQUNBLEVBQUVBLElBQUlBLEVBQUVBLE1BQU1BLEVBQUVBLENBQUNBLENBQUNBO0lBQ3BDQSxDQUFDQTtJQUVERixPQUFPQSxLQUFLQSxDQUFDQSxJQUEyQ0E7UUFDdERHLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLEtBQUtBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO1lBQUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO1FBQUNBLENBQUNBO1FBQ2hEQSxJQUFJQSxJQUFJQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUNkQSxJQUFJQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUVoQkEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0E7WUFDM0JBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQ2ZBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO1FBQ3pCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUVIQSxNQUFNQSxDQUFDQSxJQUFJQSxJQUFJQSxDQUFDQSxFQUFFQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxDQUFDQSxDQUFDQTtJQUNwQ0EsQ0FBQ0E7SUFJREgsT0FBT0EsS0FBS0E7UUFDVkksTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsSUFBSUEsSUFBSUEsSUFBSUEsQ0FBQ0EsRUFBRUEsSUFBSUEsRUFBRUEsV0FBV0EsRUFBRUEsTUFBTUEsRUFBRUEsV0FBV0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDN0ZBLENBQUNBO0lBVURKLE9BQU9BO1FBQ0xLLE1BQU1BLElBQUlBLEtBQUtBLENBQUNBLGdDQUFnQ0EsQ0FBQ0EsQ0FBQ0E7SUFDcERBLENBQUNBO0lBRURMLE9BQU9BLENBQUNBLFFBQVFBO1FBQ2RNLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLE1BQU1BLEVBQUVBLEdBQUdBLElBQUlBLENBQUNBO1FBQzVCQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxHQUFHQSxFQUFFQSxDQUFDQSxLQUFLQSxRQUFRQSxDQUFDQSxHQUFHQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUNyREEsQ0FBQ0E7SUFFRE4sV0FBV0E7UUFDVE8sSUFBSUEsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsS0FBS0EsR0FBR0EsQ0FBQ0EsSUFBSUEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsV0FBV0EsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7UUFDeEZBLE1BQU1BLENBQUNBLFVBQVVBLE1BQU1BLElBQUlBLENBQUNBO0lBQzlCQSxDQUFDQTtJQUVEUCxRQUFRQSxDQUFDQSxLQUFZQTtRQUNuQlEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDNUJBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBRW5DQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQTtZQUM5Q0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7UUFDckNBLENBQUNBO1FBRURBLE1BQU1BLENBQUNBLElBQUlBLGFBQWFBLENBQUNBLEVBQUVBLElBQUlBLEVBQUVBLE1BQU1BLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO0lBQ2xEQSxDQUFDQTtBQUNIUixDQUFDQTtBQUVEO0lBZUVTLFlBQVlBLE9BQWtEQTtRQUM1REMsSUFBSUEsQ0FBQ0EsUUFBUUEsR0FBR0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0E7UUFDakNBLElBQUlBLENBQUNBLFFBQVFBLEdBQUdBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBO0lBQ2xDQSxDQUFDQTtJQWpCREQsT0FBT0EsUUFBUUEsQ0FBQ0EsVUFBVUEsRUFBRUEsU0FBU0EsRUFBRUEsUUFBUUE7UUFDN0NFLE1BQU1BLENBQUNBLElBQUlBLFNBQVNBLENBQUNBO1lBQ25CQSxRQUFRQSxFQUFFQSxVQUFVQSxLQUFLQSxJQUFJQSxHQUFHQSxJQUFJQSxHQUFHQSxRQUFRQSxDQUFDQSxVQUFVQSxDQUFDQTtZQUMzREEsT0FBT0EsRUFBRUEsU0FBU0EsS0FBS0EsSUFBSUEsR0FBR0EsSUFBSUEsR0FBR0EsUUFBUUEsQ0FBQ0EsU0FBU0EsQ0FBQ0E7U0FDekRBLENBQUNBLENBQUNBO0lBQ0xBLENBQUNBO0lBRURGLE9BQU9BLEtBQUtBLENBQUNBLFFBQWtCQSxFQUFFQSxPQUFpQkE7UUFDaERHLE1BQU1BLENBQUNBLElBQUlBLFNBQVNBLENBQUNBLEVBQUVBLFFBQVFBLEVBQUVBLE9BQU9BLEVBQUVBLENBQUNBLENBQUNBO0lBQzlDQSxDQUFDQTtJQVVESCxXQUFXQTtRQUNUSSxJQUFJQSxFQUFFQSxRQUFRQSxFQUFFQSxRQUFRQSxFQUFFQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUNsQ0EsTUFBTUEsQ0FBQ0EsdUJBQXVCQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxRQUFRQSxHQUFHQSxNQUFNQSxhQUFhQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxRQUFRQSxHQUFHQSxNQUFNQSxJQUFJQSxDQUFDQTtJQUM1SEEsQ0FBQ0E7SUFFREosUUFBUUEsQ0FBQ0EsS0FBWUE7UUFDbkJLLE1BQU1BLElBQUlBLEtBQUtBLENBQUNBLDZDQUE2Q0EsQ0FBQ0EsQ0FBQ0E7SUFDakVBLENBQUNBO0FBQ0hMLENBQUNBO0FBRUQsV0FBVyxRQUFRLEdBQUc7SUFDcEIsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO0lBQ2xCLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSztDQUNqQixDQUFDO0FBRUY7SUFHRU07UUFDRUMsSUFBSUEsQ0FBQ0EsVUFBVUEsR0FBR0EsRUFBRUEsQ0FBQ0E7SUFDdkJBLENBQUNBO0lBRURELFFBQVFBO1FBQ05FLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLGNBQWNBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBLENBQUNBLHFCQUFxQkE7SUFDeEVBLENBQUNBO0lBRURGLFFBQVFBLENBQUNBLElBQVdBO1FBQ2xCRyxNQUFNQSxDQUFDQSxlQUFlQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtJQUMvQkEsQ0FBQ0E7SUFFREgsTUFBTUEsQ0FBQ0EsTUFBY0EsRUFBRUEsSUFBVUE7UUFDL0JJLE1BQU1BLENBQUNBLElBQUlBLGFBQWFBLENBQUNBLEVBQUVBLE1BQU1BLEVBQUVBLElBQUlBLEVBQUVBLENBQUNBLENBQUNBO0lBQzdDQSxDQUFDQTtJQUVESixXQUFXQSxDQUFDQSxPQUFlQTtRQUN6QkssTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7SUFDcENBLENBQUNBO0lBRURMLFlBQVlBO1FBQ1ZNLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO0lBQzlCQSxDQUFDQTtJQUVETixVQUFVQSxDQUFDQSxHQUFXQSxFQUFFQSxLQUFhQTtRQUNuQ08sTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7SUFDdENBLENBQUNBO0lBRURQLFdBQVdBLENBQUNBLEdBQVdBLEVBQUVBLEtBQXNDQSxFQUFFQSxTQUFTQSxHQUFTQSxJQUFJQTtRQUNyRlEsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7SUFDdkNBLENBQUNBO0lBRURSLE1BQU1BLENBQUNBLElBQVlBLEVBQUVBLE1BQU1BLEdBQWdCQSxJQUFJQSxFQUFFQSxLQUFLQSxHQUFVQSxLQUFLQTtRQUNuRVMsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQUE7SUFDMUNBLENBQUNBO0FBQ0hULENBQUNBO0FBRUQseUVBQXlFO0FBQ3pFLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUc7SUFDckMsSUFBSSxVQUFVLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQzFELFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ25ELENBQUMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRztJQUMvQixlQUFlLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVMsR0FBRyxJQUFJO1FBQy9DLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==