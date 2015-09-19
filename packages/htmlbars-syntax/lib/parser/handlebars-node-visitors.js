import b from "../builders";
import { appendChild } from "../utils";
export default {
    Program: function (program) {
        var body = [];
        var node = b.program(body, program.blockParams, program.loc);
        var i, l = program.body.length;
        this.elementStack.push(node);
        if (l === 0) {
            return this.elementStack.pop();
        }
        for (i = 0; i < l; i++) {
            this.acceptNode(program.body[i]);
        }
        // Ensure that that the element stack is balanced properly.
        var poppedNode = this.elementStack.pop();
        if (poppedNode !== node) {
            throw new Error("Unclosed element `" + poppedNode.tag + "` (on line " + poppedNode.loc.start.line + ").");
        }
        return node;
    },
    BlockStatement: function (block) {
        delete block.inverseStrip;
        delete block.openString;
        delete block.closeStrip;
        if (this.tokenizer.state === 'comment') {
            this.appendToCommentData('{{' + this.sourceForMustache(block) + '}}');
            return;
        }
        if (this.tokenizer.state !== 'comment' && this.tokenizer.state !== 'data' && this.tokenizer.state !== 'beforeData') {
            throw new Error("A block may only be used inside an HTML element or another block.");
        }
        block = acceptCommonNodes(this, block);
        var program = block.program ? this.acceptNode(block.program) : null;
        var inverse = block.inverse ? this.acceptNode(block.inverse) : null;
        var node = b.block(block.path, block.params, block.hash, program, inverse, block.loc);
        var parentProgram = this.currentElement();
        appendChild(parentProgram, node);
    },
    MustacheStatement: function (rawMustache) {
        let tokenizer = this.tokenizer;
        let { path, params, hash, escaped, loc } = rawMustache;
        let mustache = b.mustache(path, params, hash, !escaped, loc);
        if (tokenizer.state === 'comment') {
            this.appendToCommentData('{{' + this.sourceForMustache(mustache) + '}}');
            return;
        }
        acceptCommonNodes(this, mustache);
        switch (tokenizer.state) {
            // Tag helpers
            case "tagName":
                addElementModifier(this.currentNode, mustache);
                tokenizer.state = "beforeAttributeName";
                break;
            case "beforeAttributeName":
                addElementModifier(this.currentNode, mustache);
                break;
            case "attributeName":
            case "afterAttributeName":
                this.beginAttributeValue(false);
                this.finishAttributeValue();
                addElementModifier(this.currentNode, mustache);
                tokenizer.state = "beforeAttributeName";
                break;
            case "afterAttributeValueQuoted":
                addElementModifier(this.currentNode, mustache);
                tokenizer.state = "beforeAttributeName";
                break;
            // Attribute values
            case "beforeAttributeValue":
                appendDynamicAttributeValuePart(this.currentAttribute, mustache);
                tokenizer.state = 'attributeValueUnquoted';
                break;
            case "attributeValueDoubleQuoted":
            case "attributeValueSingleQuoted":
            case "attributeValueUnquoted":
                appendDynamicAttributeValuePart(this.currentAttribute, mustache);
                break;
            // TODO: Only append child when the tokenizer state makes
            // sense to do so, otherwise throw an error.
            default:
                appendChild(this.currentElement(), mustache);
        }
        return mustache;
    },
    ContentStatement: function (content) {
        var changeLines = 0;
        if (content.rightStripped) {
            changeLines = leadingNewlineDifference(content.original, content.value);
        }
        this.tokenizer.line = this.tokenizer.line + changeLines;
        this.tokenizer.tokenizePart(content.value);
        this.tokenizer.flushData();
    },
    CommentStatement: function (comment) {
        return comment;
    },
    PartialStatement: function (partial) {
        appendChild(this.currentElement(), partial);
        return partial;
    },
    SubExpression: function (sexpr) {
        return acceptCommonNodes(this, sexpr);
    },
    PathExpression: function (path) {
        delete path.data;
        delete path.depth;
        return path;
    },
    Hash: function (hash) {
        for (var i = 0; i < hash.pairs.length; i++) {
            this.acceptNode(hash.pairs[i].value);
        }
        return hash;
    },
    StringLiteral: function () { },
    BooleanLiteral: function () { },
    NumberLiteral: function () { },
    UndefinedLiteral: function () { },
    NullLiteral: function () { }
};
function leadingNewlineDifference(original, value) {
    if (value === '') {
        // if it is empty, just return the count of newlines
        // in original
        return original.split("\n").length - 1;
    }
    // otherwise, return the number of newlines prior to
    // `value`
    var difference = original.split(value)[0];
    var lines = difference.split(/\n/);
    return lines.length - 1;
}
function acceptCommonNodes(compiler, node) {
    compiler.acceptNode(node.path);
    if (node.params) {
        for (var i = 0; i < node.params.length; i++) {
            compiler.acceptNode(node.params[i]);
        }
    }
    else {
        node.params = [];
    }
    if (node.hash) {
        compiler.acceptNode(node.hash);
    }
    else {
        node.hash = b.hash();
    }
    return node;
}
function addElementModifier(element, mustache) {
    let { path, params, hash, loc } = mustache;
    let modifier = b.elementModifier(path, params, hash, loc);
    element.modifiers.push(modifier);
}
function appendDynamicAttributeValuePart(attribute, part) {
    attribute.isDynamic = true;
    attribute.parts.push(part);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFuZGxlYmFycy1ub2RlLXZpc2l0b3JzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2h0bWxiYXJzLXN5bnRheC9saWIvcGFyc2VyL2hhbmRsZWJhcnMtbm9kZS12aXNpdG9ycy50cyJdLCJuYW1lcyI6WyJsZWFkaW5nTmV3bGluZURpZmZlcmVuY2UiLCJhY2NlcHRDb21tb25Ob2RlcyIsImFkZEVsZW1lbnRNb2RpZmllciIsImFwcGVuZER5bmFtaWNBdHRyaWJ1dGVWYWx1ZVBhcnQiXSwibWFwcGluZ3MiOiJPQUFPLENBQUMsTUFBTSxhQUFhO09BQ3BCLEVBQUUsV0FBVyxFQUFFLE1BQU0sVUFBVTtBQUV0QyxlQUFlO0lBRWIsT0FBTyxFQUFFLFVBQVMsT0FBTztRQUN2QixJQUFJLElBQUksR0FBRyxFQUFFLENBQUM7UUFDZCxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7UUFFL0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFN0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUFDLENBQUM7UUFFaEQsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUVELDJEQUEyRDtRQUMzRCxJQUFJLFVBQVUsR0FB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