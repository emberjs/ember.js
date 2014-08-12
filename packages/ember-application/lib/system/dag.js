import EmberError from "ember-metal/error";

function visit(vertex, fn, visited, path) {
  var name = vertex.name;
  var vertices = vertex.incoming;
  var names = vertex.incomingNames;
  var len = names.length;
  var i;

  if (!visited) {
    visited = {};
  }
  if (!path) {
    path = [];
  }
  if (visited.hasOwnProperty(name)) {
    return;
  }
  path.push(name);
  visited[name] = true;
  for (i = 0; i < len; i++) {
    visit(vertices[names[i]], fn, visited, path);
  }
  fn(vertex, path);
  path.pop();
}


/**
 * DAG stands for Directed acyclic graph.
 *
 * It is used to build a graph of dependencies checking that there isn't circular
 * dependencies. p.e Registering initializers with a certain precedence order.
 *
 * @class DAG
 * @constructor
 */
function DAG() {
  this.names = [];
  this.vertices = {};
}

/**
 * Adds a vertex entry to the graph unless it is already added.
 *
 * @private
 * @method add
 * @param {String} name The name of the vertex to add
 */
DAG.prototype.add = function(name) {
  if (!name) { return; }
  if (this.vertices.hasOwnProperty(name)) {
    return this.vertices[name];
  }
  var vertex = {
    name: name, incoming: {}, incomingNames: [], hasOutgoing: false, value: null
  };
  this.vertices[name] = vertex;
  this.names.push(name);
  return vertex;
};

/**
 * Adds a vertex to the graph and sets its value.
 *
 * @private
 * @method map
 * @param {String} name The name of the vertex.
 * @param         value The value to put in the vertex.
 */
DAG.prototype.map = function(name, value) {
  this.add(name).value = value;
};

/**
 * Connects the vertices with the given names, adding them to the graph if
 * necesary, only if this does not produce is any circular dependency.
 *
 * @private
 * @method addEdge
 * @param {String} fromName The name the vertex where the edge starts.
 * @param {String} toName The name the vertex where the edge ends.
 */
DAG.prototype.addEdge = function(fromName, toName) {
  if (!fromName || !toName || fromName === toName) {
    return;
  }
  var from = this.add(fromName), to = this.add(toName);
  if (to.incoming.hasOwnProperty(fromName)) {
    return;
  }
  function checkCycle(vertex, path) {
    if (vertex.name === toName) {
      throw new EmberError("cycle detected: " + toName + " <- " + path.join(" <- "));
    }
  }
  visit(from, checkCycle);
  from.hasOutgoing = true;
  to.incoming[fromName] = from;
  to.incomingNames.push(fromName);
};

/**
 * Visits all the vertex of the graph calling the given function with each one,
 * ensuring that the vertices are visited respecting their precedence.
 *
 * @method  topsort
 * @param {Function} fn The function to be invoked on each vertex.
 */
DAG.prototype.topsort = function(fn) {
  var visited = {};
  var vertices = this.vertices;
  var names = this.names;
  var len = names.length;
  var i, vertex;

  for (i = 0; i < len; i++) {
    vertex = vertices[names[i]];
    if (!vertex.hasOutgoing) {
      visit(vertex, fn, visited);
    }
  }
};

/**
 * Adds a vertex with the given name and value to the graph and joins it with the
 * vertices referenced in _before_ and _after_. If there isn't vertices with those
 * names, they are added too.
 *
 * If either _before_ or _after_ are falsy/empty, the added vertex will not have
 * an incoming/outgoing edge.
 *
 * @method addEdges
 * @param {String} name The name of the vertex to be added.
 * @param         value The value of that vertex.
 * @param        before An string or array of strings with the names of the vertices before
 *                      which this vertex must be visited.
 * @param         after An string or array of strings with the names of the vertex after
 *                      which this vertex must be visited.
 *
 */
DAG.prototype.addEdges = function(name, value, before, after) {
  var i;
  this.map(name, value);
  if (before) {
    if (typeof before === 'string') {
      this.addEdge(name, before);
    } else {
      for (i = 0; i < before.length; i++) {
        this.addEdge(name, before[i]);
      }
    }
  }
  if (after) {
    if (typeof after === 'string') {
      this.addEdge(after, name);
    } else {
      for (i = 0; i < after.length; i++) {
        this.addEdge(after[i], name);
      }
    }
  }
};

export default DAG;
