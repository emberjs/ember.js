
/**
  Transforms dot invocation of closure components to be wrapped
  with the component helper. This allows for a more static invocation
  of the component.

  ```handlebars
 {{#my-component as |comps|}}
  {{comp.dropdown isOpen=false}}
 {{/my-component}}
  ```

  with

  ```handlebars
  {{#my-component as |comps|}}
    {{component comp.dropdown isOpen=false}}
  {{/my-component}}
  ```
  and

  ```handlebars
 {{#my-component as |comps|}}
  {{comp.dropdown isOpen}}
 {{/my-component}}
  ```

  with

  ```handlebars
  {{#my-component as |comps|}}
    {{component comp.dropdown isOpen}}
  {{/my-component}}
  ```

  and

  ```handlebars
  {{#my-component as |comps|}}
    {{#comp.dropdown}}Open{{/comp.dropdown}}
  {{/my-component}}
  ```

  with

  ```handlebars
  {{#my-component as |comps|}}
    {{#component comp.dropdown}}Open{{/component}}
  {{/my-component}}
  ```

  @private
  @class TransFormDotComponentInvocation
*/
export default function TransFormDotComponentInvocation() {
  // set later within Glimmer2 to the syntax package
  this.syntax = null;
}

TransFormDotComponentInvocation.prototype = {
  _isMulipartPath(path)  {
    if (path.parts && path.parts.length && path.parts.length > 1) {
      return true;
    } else {
      return false;
    }
  },

  _isInlineInvocation(path, params, hash) {
    if (this._isMulipartPath(path)) {
      if (params.length > 0 || hash.pairs.length > 0) {
        return true;
      }
    }

    return false;
  },

  _wrapInComponent(node, builder) {
    let component = node.path;
    let componentHelper = builder.path('component');
    node.path = componentHelper;
    node.params.unshift(component);
  },

  transform(ast) {
    let { traverse, builders: b } = this.syntax;

    traverse(ast, {
      MustacheStatement: (node) => {
        if (this._isInlineInvocation(node.path, node.params, node.hash)) {
          this._wrapInComponent(node, b);
        }
      },
      BlockStatement: (node) => {
        if (this._isMulipartPath(node.path)) {
          this._wrapInComponent(node, b)
        }
      }
    });

    return ast;
  }
};

