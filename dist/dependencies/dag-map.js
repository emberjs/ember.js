/**
 * A topologically ordered map of key/value pairs with a simple API for adding constraints.
 *
 * Edges can forward reference keys that have not been added yet (the forward reference will
 * map the key to undefined).
 */
var DAG = (function () {
    function DAG() {
        this._vertices = new Vertices();
    }
    /**
     * Adds a key/value pair with dependencies on other key/value pairs.
     *
     * @public
     * @param key    The key of the vertex to be added.
     * @param value  The value of that vertex.
     * @param before A key or array of keys of the vertices that must
     *               be visited before this vertex.
     * @param after  An string or array of strings with the keys of the
     *               vertices that must be after this vertex is visited.
     */
    DAG.prototype.add = function (key, value, before, after) {
        if (!key)
            throw new Error('argument `key` is required');
        var vertices = this._vertices;
        var v = vertices.add(key);
        v.val = value;
        if (before) {
            if (typeof before === "string") {
                vertices.addEdge(v, vertices.add(before));
            }
            else {
                for (var i = 0; i < before.length; i++) {
                    vertices.addEdge(v, vertices.add(before[i]));
                }
            }
        }
        if (after) {
            if (typeof after === "string") {
                vertices.addEdge(vertices.add(after), v);
            }
            else {
                for (var i = 0; i < after.length; i++) {
                    vertices.addEdge(vertices.add(after[i]), v);
                }
            }
        }
    };
    /**
     * @deprecated please use add.
     */
    DAG.prototype.addEdges = function (key, value, before, after) {
        this.add(key, value, before, after);
    };
    /**
     * Visits key/value pairs in topological order.
     *
     * @public
     * @param callback The function to be invoked with each key/value.
     */
    DAG.prototype.each = function (callback) {
        this._vertices.walk(callback);
    };
    /**
     * @deprecated please use each.
     */
    DAG.prototype.topsort = function (callback) {
        this.each(callback);
    };
    return DAG;
}());
export default DAG;
/** @private */
var Vertices = (function () {
    function Vertices() {
        this.length = 0;
        this.stack = new IntStack();
        this.path = new IntStack();
        this.result = new IntStack();
    }
    Vertices.prototype.add = function (key) {
        if (!key)
            throw new Error("missing key");
        var l = this.length | 0;
        var vertex;
        for (var i = 0; i < l; i++) {
            vertex = this[i];
            if (vertex.key === key)
                return vertex;
        }
        this.length = l + 1;
        return this[l] = {
            idx: l,
            key: key,
            val: undefined,
            out: false,
            flag: false,
            length: 0
        };
    };
    Vertices.prototype.addEdge = function (v, w) {
        this.check(v, w.key);
        var l = w.length | 0;
        for (var i = 0; i < l; i++) {
            if (w[i] === v.idx)
                return;
        }
        w.length = l + 1;
        w[l] = v.idx;
        v.out = true;
    };
    Vertices.prototype.walk = function (cb) {
        this.reset();
        for (var i = 0; i < this.length; i++) {
            var vertex = this[i];
            if (vertex.out)
                continue;
            this.visit(vertex, "");
        }
        this.each(this.result, cb);
    };
    Vertices.prototype.check = function (v, w) {
        if (v.key === w) {
            throw new Error("cycle detected: " + w + " <- " + w);
        }
        // quick check
        if (v.length === 0)
            return;
        // shallow check
        for (var i = 0; i < v.length; i++) {
            var key = this[v[i]].key;
            if (key === w) {
                throw new Error("cycle detected: " + w + " <- " + v.key + " <- " + w);
            }
        }
        // deep check
        this.reset();
        this.visit(v, w);
        if (this.path.length > 0) {
            var msg_1 = "cycle detected: " + w;
            this.each(this.path, function (key) {
                msg_1 += " <- " + key;
            });
            throw new Error(msg_1);
        }
    };
    Vertices.prototype.reset = function () {
        this.stack.length = 0;
        this.path.length = 0;
        this.result.length = 0;
        for (var i = 0, l = this.length; i < l; i++) {
            this[i].flag = false;
        }
    };
    Vertices.prototype.visit = function (start, search) {
        var _a = this, stack = _a.stack, path = _a.path, result = _a.result;
        stack.push(start.idx);
        while (stack.length) {
            var index = stack.pop() | 0;
            if (index >= 0) {
                // enter
                var vertex = this[index];
                if (vertex.flag)
                    continue;
                vertex.flag = true;
                path.push(index);
                if (search === vertex.key)
                    break;
                // push exit
                stack.push(~index);
                this.pushIncoming(vertex);
            }
            else {
                // exit
                path.pop();
                result.push(~index);
            }
        }
    };
    Vertices.prototype.pushIncoming = function (incomming) {
        var stack = this.stack;
        for (var i = incomming.length - 1; i >= 0; i--) {
            var index = incomming[i];
            if (!this[index].flag) {
                stack.push(index);
            }
        }
    };
    Vertices.prototype.each = function (indices, cb) {
        for (var i = 0, l = indices.length; i < l; i++) {
            var vertex = this[indices[i]];
            cb(vertex.key, vertex.val);
        }
    };
    return Vertices;
}());
/** @private */
var IntStack = (function () {
    function IntStack() {
        this.length = 0;
    }
    IntStack.prototype.push = function (n) {
        this[this.length++] = n | 0;
    };
    IntStack.prototype.pop = function () {
        return this[--this.length] | 0;
    };
    return IntStack;
}());
