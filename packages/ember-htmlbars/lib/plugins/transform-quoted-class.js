import Walker from "htmlbars-compiler/walker";

function buildConcatASTNode(){
  return {
    hash: {
      pairs: [],
      type: 'Hash'
    },
    path: {
      parts: ['concat'],
      original: 'concat',
      type: 'PathExpression'
    },
    params: [],
    type: "SubExpression"
  };
}

function buildStringASTNode(string){
  return {
    type: 'StringLiteral',
    value: string,
    original: string
  };
}

/**
  An HTMLBars AST transformation that replaces all instances of

  ```handlebars
  <div class="{{foo}}-bar {{baz}} bup"></div>
  ```

  with

  ```handlebars
  <div class=[{{foo}}-bar, {{baz}}, bup]></div>
  ```

  @private
  @param {AST} The AST to be transformed.
*/
export default function(ast) {
  var walker = new Walker();

  walker.visit(ast, function(node) {
    var attribute = findClassAttribute(node);
    if (attribute) {
      var quotedValues = [];
      var values = attribute.value;

      var eachIndex = 0;
      var eachValue, currentValue, parts, containsNonStringLiterals;
      var i, l;
      while (eachValue = values[eachIndex]) {
        if (eachValue.type === 'StringLiteral') {
          parts = eachValue.value.split(' ');
          for (i=0,l=parts.length;i<l;i++) {
            if (parts[i].length > 0) {
              if (!currentValue) {
                currentValue = buildConcatASTNode();
                quotedValues.push(currentValue);
              }
              currentValue.params.push(
                buildStringASTNode(parts[i])
              );
            } else if (currentValue) {
              currentValue = null;
            }
          }
        } else {
          containsNonStringLiterals = true;
          if (!currentValue) {
            currentValue = buildConcatASTNode();
            quotedValues.push(currentValue);
          }
          currentValue.params.push(eachValue);
        }
        eachIndex++;
      }

      if (containsNonStringLiterals) {
        attribute.value = quotedValues;
      }
    }
  });

  return ast;
}

function findClassAttribute(node) {
  if (node.type !== 'ElementNode' || !node.attributes || node.attributes.length === 0) {
    return null;
  }

  for (var i=0, l=node.attributes.length;i<l;i++) {
    if (node.attributes[i].name === 'class' && node.attributes[i].quoted) {
      return node.attributes[i];
    }
  }

  return null;
}
