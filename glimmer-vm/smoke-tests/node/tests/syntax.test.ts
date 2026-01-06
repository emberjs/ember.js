import { preprocess } from '@glimmer/syntax';
import { describe, it, expect } from 'vitest';

describe('@glimmer/syntax', () => {
  it('process()', () => {
    expect(preprocess('<h1></h1>')).toMatchInlineSnapshot(`
      {
        "blockParams": [],
        "body": [
          {
            "attributes": [],
            "blockParams": [],
            "children": [],
            "closeTag": {
              "end": {
                "column": 9,
                "line": 1,
              },
              "start": {
                "column": 4,
                "line": 1,
              },
            },
            "comments": [],
            "loc": {
              "end": {
                "column": 9,
                "line": 1,
              },
              "start": {
                "column": 0,
                "line": 1,
              },
            },
            "modifiers": [],
            "openTag": {
              "end": {
                "column": 4,
                "line": 1,
              },
              "start": {
                "column": 0,
                "line": 1,
              },
            },
            "params": [],
            "path": {
              "head": {
                "loc": {
                  "end": {
                    "column": 3,
                    "line": 1,
                  },
                  "start": {
                    "column": 1,
                    "line": 1,
                  },
                },
                "name": "h1",
                "original": "h1",
                "type": "VarHead",
              },
              "loc": {
                "end": {
                  "column": 3,
                  "line": 1,
                },
                "start": {
                  "column": 1,
                  "line": 1,
                },
              },
              "original": "h1",
              "tail": [],
              "type": "PathExpression",
            },
            "selfClosing": false,
            "tag": "h1",
            "type": "ElementNode",
          },
        ],
        "loc": {
          "end": {
            "column": 9,
            "line": 1,
          },
          "start": {
            "column": 0,
            "line": 1,
          },
        },
        "type": "Template",
      }
    `);
  });
});
