// ==========================================================================
// Project:   TestRunner.targetsController
// Copyright: ©2011 Apple Inc.
// ==========================================================================
/*global TestRunner */

/**

  The full set of targets available in the application.  This is populated
  automatically when you call loadTargets().

  @extends SC.ArrayController
*/
TestRunner.targetsController = SC.ArrayController.create(
/** @scope TestRunner.targetsController.prototype */ {

  /**
    Generates the root array of children objects whenever the target content
    changes.  Used in a tree node.
  */
  sourceRoot: function () {

    // break targets into their respective types.  Items that should not be
    // visible at the top level will not have a sort kind
    var kinds = {}, keys = [], kind, targets, ret;

    this.forEach(function (target) {
      kind = target.get('sortKind');

      if (kind) {
        targets = kinds[kind];
        if (!targets) { kinds[kind] = targets = []; }

        targets.push(target);
        if (keys.indexOf(kind) < 0) keys.push(kind);
      }
    }, this);

    // sort kinds alphabetically - with sproutcore at end and apps at top
    keys.sort();
    if (keys.indexOf('sproutcore') >= 0) {
      keys.removeObject('sproutcore').pushObject('sproutcore');
    }
    if (keys.indexOf('apps') >= 0) {
      keys.removeObject('apps').unshiftObject('apps');
    }

    // once divided into kinds, create group nodes for each kind
    ret = [];
    keys.forEach(function (kind) {
      targets = kinds[kind];

      var defKey = "SourceList.%@.isExpanded".fmt(kind),
          expanded = TestRunner.userDefaults.get(defKey);

      ret.push(SC.Object.create({
        displayName: "Kind.%@".fmt(kind).loc(),
        isExpanded: SC.none(expanded) ? (kind !== 'sproutcore') : expanded,
        children: targets.sortProperty('kind', 'displayName'),

        isExpandedDefaultKey: defKey,
        isExpandedDidChange: function () {
          TestRunner.userDefaults.set(this.get('isExpandedDefaultKey'), this.get('isExpanded'));
        }.observes('isExpanded')
      }));
    });

    return SC.Object.create({ children: ret, isExpanded: YES });

  }.property('[]').cacheable(),

  /**
    Send event when targets load.
  */
  statusDidChange: function () {
    if (this.get('status') === SC.Record.READY_CLEAN) {
      TestRunner.statechart.resumeGotoState();
    }
  }.observes('status')

});
