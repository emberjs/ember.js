var set = Ember.set,
    get = Ember.get;

if (Ember.FEATURES.isEnabled("computed-controller")) {
  module('Ember.computed - controller');

  test("Computed controllers should have correct types and references", function() {
    var PostController = Ember.Controller.extend({
      comments: Ember.computed.controller('comments', 'content.comments')
    });
    var CommentsController = Ember.ArrayController.extend({
      itemController: 'comment'
    });
    var CommentController = Ember.ObjectController.extend();

    var container = new Ember.Container();
    container.register('controller:post', PostController);
    container.register('controller:comments', CommentsController);
    container.register('controller:comment', CommentController);

    var postController = container.lookup('controller:post');
    var comment1 = {}, comment2 = {};
    set(postController, 'content', {comments: Ember.A([comment1, comment2])});
    var commentsController = get(postController, 'comments');
    var commentController = commentsController.objectAt(0);

    ok(commentsController instanceof CommentsController);
    ok(commentController instanceof CommentController);
    equal(get(commentController, 'content'), comment1);

    equal(get(commentController, 'parentController'), commentsController);
    equal(get(commentsController, 'parentController'), postController);

    equal(get(commentController, 'target'), commentsController);
    equal(get(commentsController, 'target'), postController);

    set(postController, 'content.comments', Ember.A());
    notEqual(commentsController, get(postController, 'comments'), 'changing content generates new controller');
  });

  test("Computed controllers send actions to their parent", function() {
    var actionsTriggered = 0;

    var container = new Ember.Container();
    container.register('controller:post', Ember.Controller.extend({
      comments: Ember.computed.controller('comments', 'foo'),
      foo: Ember.A([{}, {}]),
      actions: {
        test: function() {
          actionsTriggered++;
        }
      }
    }));
    container.register('controller:comments', Ember.ArrayController.extend({
      itemController: 'comment'
    }));
    container.register('controller:comment', Ember.ObjectController.extend());

    var postController = container.lookup('controller:post');
    var commentsController = get(postController, 'comments');
    var commentController = commentsController.objectAt(0);

    equal(actionsTriggered, 0);
    commentController.send('test');
    equal(actionsTriggered, 1);
    commentsController.send('test');
    equal(actionsTriggered, 2);
    postController.send('test');
    equal(actionsTriggered, 3);
  });

  test("Computed controllers should throw if controller is not defined", function() {
    var BadPostController = Ember.Controller.extend({
      comments: Ember.computed.controller('comments', 'missing')
    });
    var EvilPostController = Ember.Controller.extend({
      comments: Ember.computed.controller('foo', 'content.missing')
    });
    var CommentsController = Ember.ArrayController.extend();

    var container = new Ember.Container();
    container.register('controller:badPost', BadPostController);
    container.register('controller:evilPost', EvilPostController);
    container.register('controller:comments', CommentsController);

    var badPostController = container.lookup('controller:badPost');
    var commentsController = get(badPostController, 'comments');
    ok(commentsController instanceof CommentsController);
    equal(get(commentsController, 'content'), undefined);

    var evilPostController = container.lookup('controller:evilPost');
    throws(function() {
      get(evilPostController, 'comments');
    }, /Invalid Path/);
  });
}