import { UpdatableReference } from 'glimmer-object-reference';
import { TestEnvironment as DemoEnvironment } from 'glimmer-test-helpers';

function RingBuffer(capacity) {
  this.capacity = capacity;
  this.head     = 0;
  this.items    = new Array(capacity);
  this.length = 0;
}

RingBuffer.prototype.push = function(item) {
  this.items[this.head] = item;

  this.length++;
  this.head++;
  this.head %= this.capacity;
};

RingBuffer.prototype.remove = function(i) {
  this.length--;
  this.items[i] = undefined;
};

RingBuffer.prototype.forEach = function(callback, thisArg) {
  for (let i=0, l=this.items.length; i<l; i++) {
    if (this.items[i] === undefined) continue;
    callback.call(thisArg, this.items[i], i);
  }
};

function Point(timestamp, x, y) {
  this.key = null;
  this.timestamp = timestamp;

  this.x = x;
  this.y = y;
  this.size = 0.0;
  this.opacity = 1.0;
};

Point.prototype.update = function(index, currentTimestamp) {
  let delta = currentTimestamp - this.timestamp;

  this.size    = Math.max(delta/10, 0);
  this.opacity = Math.exp(-delta/250);
  this.key = String(index);
};

export function start() {
  let env = new DemoEnvironment();

  const TEMPLATES = {};

  Array.prototype.slice.call(document.querySelectorAll("[data-template-name]")).forEach(function(node) {
    let name   = node.getAttribute("data-template-name"),
        source = node.textContent;

    TEMPLATES[name] = env.compile(source);
  });

  let data = {
    width:  window.innerWidth,
    height: window.innerHeight,
    points: new RingBuffer(500), // in practice we only have 100-200 circles on screen
    count:  0,
    // fps:    0
  };

  let output = document.getElementById('output');
  let self = new UpdatableReference(data);
  let result = TEMPLATES['application'].render(self, env, { appendTo: output });

  window.addEventListener("resize", function() {
    data.width  = window.innerWidth;
    data.height = window.innerHeight;
  });

  document.addEventListener("mousemove", function(e) {
    data.points.push( new Point(window.performance.now(), e.layerX, e.layerY) );
  });

  function tick() {
    let timestamp = window.performance.now();

    data.count = 0;

    data.points.forEach(function(point, i) {
      if (point) {
        point.update(i, timestamp);

        if (point.opacity > 0.001) {
          data.count++;
        } else {
          data.points.remove(i);
        }
      }
    });

    self.update(data);
    result.rerender();

    window.requestAnimationFrame(tick);
  }

  tick();
}
