/* eslint no-cond-assign:0 */
import DebugPort from './debug-port';
import RenderTree from '@ember/debug/ember-inspector-support/libs/render-tree';
import ViewInspection from '@ember/debug/ember-inspector-support/libs/view-inspection';
import bound from '@ember/debug/ember-inspector-support/utils/bound-method';

export default class extends DebugPort {
  get adapter() {
    return this.namespace?.adapter;
  }
  get objectInspector() {
    return this.namespace?.objectInspector;
  }

  static {
    this.prototype.portNamespace = 'view';

    this.prototype.messages = {
      getTree({ immediate }) {
        this.sendTree(immediate);
      },

      showInspection({ id, pin }) {
        this.viewInspection.show(id, pin);
      },

      hideInspection() {
        this.viewInspection.hide();
      },

      inspectViews({ inspect }) {
        if (inspect) {
          this.startInspecting();
        } else {
          this.stopInspecting();
        }
      },

      scrollIntoView({ id }) {
        this.renderTree.scrollIntoView(id);
      },

      inspectElement({ id }) {
        this.renderTree.inspectElement(id);
      },

      contextMenu() {
        let { lastRightClicked } = this;
        this.lastRightClicked = null;
        this.inspectNearest(lastRightClicked);
      },
    };
  }

  init() {
    super.init();

    let renderTree = (this.renderTree = new RenderTree({
      owner: this.getOwner(),
      retainObject: bound(
        this.objectInspector,
        this.objectInspector.retainObject
      ),
      releaseObject: bound(
        this.objectInspector,
        this.objectInspector.releaseObject
      ),
      inspectNode: bound(this, this.inspectNode),
    }));

    this.viewInspection = new ViewInspection({
      renderTree,
      objectInspector: this.objectInspector,
      didShow: bound(this, this.didShowInspection),
      didHide: bound(this, this.didHideInspection),
      didStartInspecting: bound(this, this.didStartInspecting),
      didStopInspecting: bound(this, this.didStopInspecting),
    });

    this.setupListeners();
  }

  setupListeners() {
    this.lastRightClicked = null;
    this.scheduledSendTree = null;
    window.addEventListener('mousedown', bound(this, this.onRightClick));
    window.addEventListener('resize', bound(this, this.onResize));
  }

  cleanupListeners() {
    this.lastRightClicked = null;

    window.removeEventListener('mousedown', bound(this, this.onRightClick));
    window.removeEventListener('resize', bound(this, this.onResize));

    if (this.scheduledSendTree) {
      window.clearTimeout(this.scheduledSendTree);
      this.scheduledSendTree = null;
    }
  }

  onRightClick(event) {
    if (event.button === 2) {
      this.lastRightClicked = event.target;
    }
  }

  onResize() {
    // TODO hide or redraw highlight/tooltip
  }

  inspectNearest(node) {
    let renderNode = this.viewInspection.inspectNearest(node);

    if (!renderNode) {
      this.adapter.log('No Ember component found.');
    }
  }

  willDestroy() {
    super.willDestroy();
    this.cleanupListeners();
    this.viewInspection.teardown();
    this.renderTree.teardown();
  }

  /**
   * Opens the "Elements" tab and selects the given DOM node. Doesn't work in all
   * browsers/addons (only in the Chrome and FF devtools addons at the time of writing).
   *
   * @method inspectNode
   * @param  {Node} node The DOM node to inspect
   */
  inspectNode(node) {
    this.adapter.inspectValue(node);
  }

  sendTree(immediate = false) {
    if (immediate) {
      this.send(true);
      return;
    }

    if (this.scheduledSendTree) {
      return;
    }

    this.scheduledSendTree = window.setTimeout(() => {
      this.send();
      this.scheduledSendTree = null;
    }, 250);
  }

  send() {
    if (this.isDestroying || this.isDestroyed) {
      return;
    }

    this.sendMessage('renderTree', {
      tree: this.renderTree.build(),
    });
  }

  startInspecting() {
    this.viewInspection.start();
  }

  stopInspecting() {
    this.viewInspection.stop();
  }

  didShowInspection(id, pin) {
    if (pin) {
      this.sendMessage('inspectComponent', { id });
    } else {
      this.sendMessage('previewComponent', { id });
    }
  }

  didHideInspection(id, pin) {
    this.sendMessage('cancelSelection', { id, pin });
  }

  didStartInspecting() {
    this.sendMessage('startInspecting', {});
  }

  didStopInspecting() {
    this.sendMessage('stopInspecting', {});
  }

  getOwner() {
    return this.namespace?.owner;
  }
}
