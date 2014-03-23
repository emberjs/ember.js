import { Placeholder, append, clear } from './placeholder';

var splice = Array.prototype.splice;

export function PlaceholderList(placeholder) {
  this.placeholder = placeholder;
  this.placeholders = [];
}

PlaceholderList.prototype.append = function (nodes) {
  this.replace(this.placeholders.length, 0, nodes);
};

PlaceholderList.prototype.insert = function (index, nodes) {
  this.replace(index, 0, nodes);
};

PlaceholderList.prototype.remove = function (index, length) {
  this.replace(index, length);
};

PlaceholderList.prototype.clear = function () {
  this.placeholder.clear();
  this.placeholders.length = 0;
};

PlaceholderList.prototype.replace = function (index, removedLength, addedNodes) {
  var placeholder = this.placeholder,
    parent = this.placeholder.parent(),
    placeholders = this.placeholders,
    before = index > 0 ? placeholders[index-1] : null,
    after = index+removedLength < placeholders.length ? placeholders[index+removedLength] : null,
    start = before === null ? placeholder.start : (before.end === null ? parent.lastChild : before.end.previousSibling),
    end   = after === null ? placeholder.end : (after.start === null ? parent.firstChild : after.start.nextSibling),
    addedLength = addedNodes === undefined ? 0 : addedNodes.length,
    args, i, current;

  if (removedLength > 0) {
    clear(parent, start, end);
  }

  if (addedLength === 0) {
    if (before !== null) {
      before.end = end;
    }
    if (after !== null) {
      after.start = start;
    }
    placeholders.splice(index, removedLength);
    return;
  }

  args = new Array(addedLength+2);
  for (i=0; i<addedLength; i++) {
    append(parent, end, addedNodes[i]);
    if (before !== null) {
      before.end = start.nextSibling;
    }
    args[i+2] = current = new Placeholder(parent, start, end);
    start = end === null ? parent.lastChild : end.previousSibling;
    before = current;
  }

  if (after !== null) {
    after.start = end.previousSibling;
  }

  args[0] = index;
  args[1] = removedLength;

  splice.apply(placeholders, args);
};

/*
0 <div>a</div> null b
1 <div>b</div> a c -> a (start.nextSibling === i)
     <-- <div>i</div> start === b end === c
2 <div>c</div> b d  -> (end.previousSibling === i) d
3 <div>d</div> c null
*/

/* start == a  and  end == d
0 <div>a</div> null b > null d > null end
1 - <div>b</div> a c
2 - <div>c</div> b d
3 <div>d</div> c null > a null > start null
*/
