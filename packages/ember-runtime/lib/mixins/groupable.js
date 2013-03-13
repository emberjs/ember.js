/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, set = Ember.set;

Ember.GroupableMixin = Ember.Mixin.create({
  groupedContent: Ember.computed('arrangedContent', 'groupBy', function() {
    var content = get(this, 'arrangedContent');
    if (!content) return;

    return this.group(content);
  }),

  group: function(collection) {
    var groupsMap = {};
    var groups = Ember.A([]);

    set(this, 'groupsMap', groupsMap);
    set(this, 'groups', groups);

    collection.forEach((function(object) {
      var group = this.groupFor(object);

      if (!group) return;

      group.get("content").pushObject(object);
    }), this);

    return groups;
  },

  groupFor: function(object) {
    var group, groupName, groupType, groups, groupsMap;

    groupsMap = this.get('groupsMap');
    groups = this.get('groups');
    groupName = this.extractGroup(object);

    if (!groupName) return;

    group = groupsMap[groupName];

    if (!group) {
      groupType = this.get('groupType');

      group = Ember.ArrayProxy.create({
        content: Ember.A([]),
        name: groupName
      })

      groupsMap[groupName] = group;
      groups.pushObject(group);
    }

    return group;
  },

  extractGroup: function(object) {
    return get(object, get(this, 'groupBy'));
  }
});
