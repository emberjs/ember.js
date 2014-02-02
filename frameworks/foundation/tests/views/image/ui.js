// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test ok equals stop */

(function () {
  var logoURL = sc_static('test-image.png');

  var pane = SC.ControlTestPane.design()
    .add("image_loaded", SC.ImageView, {
      value: logoURL,
      layout : { width: 200, height: 300 },
      useImageQueue: NO,
      useCanvas: NO
    })
    .add('sprite_image', SC.ImageView, {
      layout: { width: 200, height: 300 },
      value: 'sprite-class',
      useCanvas: NO
    })
    .add('sprite_image_canvas', SC.ImageView, {
      layout: { width: 200, height: 300 },
      value: 'sprite-class'
      // Must use default calculated-property version of useCanvas.
    })
    .add('image_canvas', SC.ImageView, {
      layout: { width: 200, height: 300 },
      useCanvas: YES,
      value: logoURL
    })
    .add('canvas_not_loaded', SC.ImageView, {
      layout: { width: 200, height: 300 },
      useCanvas: YES
    })
    .add("image_not_loaded", SC.ImageView, {
      value: null,
      layout : { width: 200, height: 300 },
      useCanvas: NO
    })
    .add("empty_image", SC.ImageView, {
      value: null,
      layout : { width: 200, height: 300 }
    })
    .add('image_holder', SC.View, {
      layout: { width: 200, height: 200 }
    });

  module('SC.ImageView ui', pane.standardSetup());

  test("Verify that all the rendering properties of an image that is being loaded are correct", function () {
    var imageView = pane.view('image_not_loaded'),
        url;

    ok(imageView.get('isVisibleInWindow'), 'image_not_loaded is visible in window');

    SC.run(function () {
      imageView.set('value', logoURL);
    });
    ok(imageView.get('status') !== SC.IMAGE_STATE_LOADED, 'PRECOND - status should not be loaded (status=%@)'.fmt(imageView.get('status')));
    ok(imageView.get('status') === SC.IMAGE_STATE_LOADING, 'PRECOND - status should be loading (status=%@)'.fmt(imageView.get('status')));

    url = imageView.$('img').attr('src');
    ok((url.indexOf('base64')!=-1) || (url.indexOf('blank.gif')!=-1), "The src should be blank URL. url = %@".fmt(url));
  });

  test("Verify that all the rendering properties of an image that is loaded are correct", function () {
    var imageView = pane.view('image_loaded'),
        imgEl;

    ok(imageView.get('isVisibleInWindow'), 'image_loaded is visible in window');

    imageView.addObserver('status', this, function () {
      equals(SC.IMAGE_STATE_LOADED, imageView.get('status'), 'status should be loaded');

      // Status has changed, but the observer fires immediately, so pause in order to have the DOM updated
      setTimeout(function () {
        imgEl = imageView.$('img');
        ok(imgEl.attr('src').indexOf(logoURL) !== 0, "img src should be set to logoURL");

        window.start(); // continue the tests
        }, 100);
    });

    stop();
  });

  test("Verify that the tooltip is correctly being set as both the title and attribute (disabling localization for this test)", function () {
    var imageView = pane.view('image_loaded'),
        testToolTip = 'This is a test tooltip',
        imgEl;

    SC.run(function () {
      imageView.set('localization', NO);
      imageView.set('toolTip', testToolTip);
    });

    imageView.addObserver('status', this, function () {
      setTimeout(function () {
        imgEl = imageView.$('img');
        equals(imgEl.attr('title'), testToolTip, "title attribute");
        equals(imgEl.attr('alt'), testToolTip, "alt attribute");

        window.start(); // continue the tests
      }, 100);
    });

    stop();
  });


  test("Verify canvas rendering and properties", function () {
    var view = pane.view('image_canvas'),
        canvasEl = view.$();

    equals(canvasEl.attr('width'), 200, "The width of the canvas element should be set");
    equals(canvasEl.attr('height'), 300, "The height of the canvas element should be set");
  });

  test("Using imageQueue", function () {
    var imageHolder = pane.view('image_holder'),
        imageView1,
        imageView2,
        lastMod1,
        lastMod2;

    stop();

    // Only allow 1 image at a time
    SC.imageQueue.loadLimit = 1;

    // Add a random value so that the images appear as unique
    lastMod1 = Math.round(Math.random() * 100000);
    lastMod2 = Math.round(Math.random() * 100000);

    // Set the first view to load in the background (ie. it should load last although it was created first)
    imageView1 = SC.ImageView.create({
      value: logoURL + "?lastmod=" + lastMod1,
      canLoadInBackground: YES
    });
    imageView2 = SC.ImageView.create({
      value: logoURL + "?lastmod=" + lastMod2,
      canLoadInBackground: NO
    });

    // The second image should load first and the first not be loaded yet
    imageView2.addObserver('status', this, function () {
      equals(imageView2.get('status'), SC.IMAGE_STATE_LOADED, 'imageView2 status on imageView2 status change');
      equals(imageView1.get('status'), SC.IMAGE_STATE_LOADING, 'imageView1 status on imageView2 status change');
    });

    imageView1.addObserver('status', this, function () {
      equals(imageView2.get('status'), SC.IMAGE_STATE_LOADED, 'imageView2 status on imageView1 status change');
      equals(imageView1.get('status'), SC.IMAGE_STATE_LOADED, 'imageView1 status on imageView1 status change');

      window.start(); // starts the test runner
    });

    imageHolder.appendChild(imageView1);
    imageHolder.appendChild(imageView2);
  });

  function testScale(imageView, isImg) {
    stop();

    // Default is SC.FILL
    imageView.addObserver('status', this, function () {

      // Status has changed, but the observer fires immediately, so pause in order to have the DOM updated
      setTimeout(function () {
        var imgEl,
            innerFrame,
            testImg = !imageView.get('useCanvas');

        // Default is SC.FILL
        innerFrame  = imageView.get('innerFrame');
        equals(innerFrame.width, 588, "SC.FILL width");
        equals(innerFrame.height, 90, "SC.FILL height");
        if (testImg) {
          imgEl = imageView.$('img');

          equals(imgEl.css('width'), "588px", "SC.FILL width");
          equals(imgEl.css('height'), "90px", "SC.FILL height");
        }

        SC.run(function () {
          imageView.set('scale', SC.SCALE_NONE);
        });

        innerFrame = imageView.get('innerFrame');
        equals(innerFrame.width, 271, "SC.SCALE_NONE width");
        equals(innerFrame.height, 60, "SC.SCALE_NONE height");
        if (testImg) {
          equals(imgEl.css('width'), "271px", "SC.SCALE_NONE width");
          equals(imgEl.css('height'), "60px", "SC.SCALE_NONE height");
        }

        SC.run(function () {
          imageView.set('scale', SC.BEST_FILL);
        });

        innerFrame = imageView.get('innerFrame');
        equals(innerFrame.width, 588, "SC.BEST_FILL width");
        equals(innerFrame.height, 130, "SC.BEST_FILL height");
        if (testImg) {
          equals(imgEl.css('width'), "588px", "SC.BEST_FILL width");
          equals(imgEl.css('height'), "130px", "SC.BEST_FILL height");
        }

        SC.run(function () {
          imageView.set('scale', SC.BEST_FIT);
        });

        innerFrame = imageView.get('innerFrame');
        equals(innerFrame.width, 407, "SC.BEST_FIT width");
        equals(innerFrame.height, 90, "SC.BEST_FIT height");
        if (testImg) {
          equals(imgEl.css('width'), "407px", "SC.BEST_FIT width");
          equals(imgEl.css('height'), "90px", "SC.BEST_FIT height");
        }

        SC.run(function () {
          imageView.set('scale', SC.BEST_FIT_DOWN_ONLY);
        });

        innerFrame = imageView.get('innerFrame');
        equals(innerFrame.width, 271, "SC.BEST_FIT_DOWN_ONLY width (larger frame)");
        equals(innerFrame.height, 60, "SC.BEST_FIT_DOWN_ONLY height (larger frame)");
        if (testImg) {
          equals(imgEl.css('width'), "271px", "SC.BEST_FIT_DOWN_ONLY width (larger frame)");
          equals(imgEl.css('height'), "60px", "SC.BEST_FIT_DOWN_ONLY height (larger frame)");
        }

        SC.run(function () {
          if (!imageView.get('useStaticLayout')) {
            imageView.set('layout', { top: 0, left: 0, width: 147, height: 90 });

            innerFrame = imageView.get('innerFrame');
            equals(innerFrame.width, 147, "SC.BEST_FIT_DOWN_ONLY width (smaller size frame)");
            equals(innerFrame.height, 33, "SC.BEST_FIT_DOWN_ONLY height (smaller size frame)");
            if (testImg) {
              equals(imgEl.css('width'), "147px", "SC.BEST_FIT_DOWN_ONLY width (smaller size frame)");
              equals(imgEl.css('height'), "33px", "SC.BEST_FIT_DOWN_ONLY height (smaller size frame)");
            }
          }
        });


        window.start(); // starts the test runner
      }, 150);
    });
  }

  test("Scaling images (img)", function () {
    var imageHolder = pane.view('image_holder'),
        imageView;

    // The logo is 271x60
    imageView = SC.ImageView.create({
      value: logoURL + "?lastmod=" + Math.round(Math.random() * 100000),
      layout: { top: 0, left: 0, width: 588, height: 90 },
      useCanvas: NO
    });

    testScale(imageView);

    SC.run(function () {
      imageHolder.appendChild(imageView);
    });
  });

  test("Scaling images (img) with static layout", function () {
    var imageHolder = pane.view('image_holder'),
        imageView;

    // The logo is 271x60
    imageView = SC.ImageView.create({
      value: logoURL + "?lastmod=" + Math.round(Math.random() * 100000),
      // layout: { top: 0, left: 0, width: 588, height: 90 },
      useCanvas: NO,
      useStaticLayout: YES,

      render: function (context) {
        context.setStyle({ width: 588, height: 90 });

        sc_super();
      }
    });

    testScale(imageView);

    SC.run(function () {
      imageHolder.appendChild(imageView);
    });
  });

  test("Scaling images (canvas)", function () {
    var imageHolder = pane.view('image_holder'),
        imageView;

    // The logo is 271x60
    imageView = SC.ImageView.create({
      value: logoURL + "?lastmod=" + Math.round(Math.random() * 100000),
      layout: { top: 0, left: 0, width: 588, height: 90 }
    });

    testScale(imageView);

    SC.run(function () {
      imageHolder.appendChild(imageView);
    });
  });

  test("Scaling images (canvas) with static layout", function () {
    var imageHolder = pane.view('image_holder'),
        imageView;

    // The logo is 271x60
    imageView = SC.ImageView.create({
      value: logoURL + "?lastmod=" + Math.round(Math.random() * 100000),
      useStaticLayout: YES,

      render: function (context) {
        context.setStyle({ width: 588, height: 90 });

        sc_super();
      }
    });

    testScale(imageView);

    SC.run(function () {
      imageHolder.appendChild(imageView);
    });
  });

  function testAlign(imageView) {
    stop();

    // Default is SC.FILL
    imageView.addObserver('status', this, function () {
      // Status has changed, but the observer fires immediately, so pause in order to have the DOM updated
      setTimeout(function () {
        var imgEl,
            innerFrame,
            testImg = !imageView.get('useCanvas');

        // Default is SC.ALIGN_CENTER
        innerFrame = imageView.get('innerFrame');
        equals(innerFrame.y, 30, "SC.ALIGN_CENTER top");
        equals(innerFrame.x, 158.5, "SC.ALIGN_CENTER left");
        if (testImg) {
          imgEl = imageView.$('img');
          equals(imgEl.css('top'), "30px", "SC.ALIGN_CENTER top");
          equals(imgEl.css('left'), "159px", "SC.ALIGN_CENTER left");
        }

        SC.RunLoop.begin();
        imageView.set('align', SC.ALIGN_TOP_LEFT);
        SC.RunLoop.end();

        innerFrame = imageView.get('innerFrame');
        equals(innerFrame.y, 0, "SC.ALIGN_TOP_LEFT top");
        equals(innerFrame.x, 0, "SC.ALIGN_TOP_LEFT left");
        if (testImg) {
          equals(imgEl.css('top'), "0px", "SC.ALIGN_TOP_LEFT top");
          equals(imgEl.css('left'), "0px", "SC.ALIGN_TOP_LEFT left");
        }

        SC.RunLoop.begin();
        imageView.set('align', SC.ALIGN_TOP);
        SC.RunLoop.end();

        innerFrame = imageView.get('innerFrame');
        equals(innerFrame.y, 0, "SC.ALIGN_TOP top");
        equals(innerFrame.x, 158.5, "SC.ALIGN_TOP left");
        if (testImg) {
          equals(imgEl.css('top'), "0px", "SC.ALIGN_TOP top");
          equals(imgEl.css('left'), "159px", "SC.ALIGN_TOP left");
        }

        SC.RunLoop.begin();
        imageView.set('align', SC.ALIGN_TOP_RIGHT);
        SC.RunLoop.end();

        innerFrame = imageView.get('innerFrame');
        equals(innerFrame.y, 0, "SC.ALIGN_TOP_RIGHT top");
        equals(innerFrame.x, 317, "SC.ALIGN_TOP_RIGHT left");
        if (testImg) {
          equals(imgEl.css('top'), "0px", "SC.ALIGN_TOP_RIGHT top");
          equals(imgEl.css('left'), "317px", "SC.ALIGN_TOP_RIGHT left");
        }
        SC.RunLoop.begin();
        imageView.set('align', SC.ALIGN_RIGHT);
        SC.RunLoop.end();

        innerFrame = imageView.get('innerFrame');
        equals(innerFrame.y, 30, "SC.ALIGN_RIGHT top");
        equals(innerFrame.x, 317, "SC.ALIGN_RIGHT left");
        if (testImg) {
          equals(imgEl.css('top'), "30px", "SC.ALIGN_RIGHT top");
          equals(imgEl.css('left'), "317px", "SC.ALIGN_RIGHT left");
        }

        SC.RunLoop.begin();
        imageView.set('align', SC.ALIGN_BOTTOM_RIGHT);
        SC.RunLoop.end();

        innerFrame = imageView.get('innerFrame');
        equals(innerFrame.y, 60, "SC.ALIGN_BOTTOM_RIGHT top");
        equals(innerFrame.x, 317, "SC.ALIGN_BOTTOM_RIGHT left");
        if (testImg) {
          equals(imgEl.css('top'), "60px", "SC.ALIGN_BOTTOM_RIGHT top");
          equals(imgEl.css('left'), "317px", "SC.ALIGN_BOTTOM_RIGHT left");
        }

        SC.RunLoop.begin();
        imageView.set('align', SC.ALIGN_BOTTOM);
        SC.RunLoop.end();

        innerFrame = imageView.get('innerFrame');
        equals(innerFrame.y, 60, "SC.ALIGN_BOTTOM top");
        equals(innerFrame.x, 158.5, "SC.ALIGN_BOTTOM left");
        if (testImg) {
          equals(imgEl.css('top'), "60px", "SC.ALIGN_BOTTOM top");
          equals(imgEl.css('left'), "159px", "SC.ALIGN_BOTTOM left");
        }

        SC.RunLoop.begin();
        imageView.set('align', SC.ALIGN_BOTTOM_LEFT);
        SC.RunLoop.end();

        innerFrame = imageView.get('innerFrame');
        equals(innerFrame.y, 60, "SC.ALIGN_BOTTOM_LEFT top");
        equals(innerFrame.x, 0, "SC.ALIGN_BOTTOM_LEFT left");
        if (testImg) {
          equals(imgEl.css('top'), "60px", "SC.ALIGN_BOTTOM_LEFT top");
          equals(imgEl.css('left'), "0px", "SC.ALIGN_BOTTOM_LEFT left");
        }

        SC.RunLoop.begin();
        imageView.set('align', SC.ALIGN_LEFT);
        SC.RunLoop.end();

        innerFrame = imageView.get('innerFrame');
        equals(innerFrame.y, 30, "SC.ALIGN_LEFT top");
        equals(innerFrame.x, 0, "SC.ALIGN_LEFT left");
        if (testImg) {
          equals(imgEl.css('top'), "30px", "SC.ALIGN_LEFT top");
          equals(imgEl.css('left'), "0px", "SC.ALIGN_LEFT left");
        }

        window.start(); // starts the test runner
      }, 100);
    });
  }

  test("Aligning images (img)", function () {
    var imageHolder = pane.view('image_holder'),
        imageView;

    // The logo is 294x60
    imageView = SC.ImageView.create({
      value: logoURL + "?lastmod=" + Math.round(Math.random() * 100000),
      layout: { top: 0, left: 0, width: 588, height: 120 },
      useCanvas: NO,
      scale: SC.SCALE_NONE
    });

    testAlign(imageView);

    SC.run(function () {
      imageHolder.appendChild(imageView);
    });
  });

  test("Aligning images (img) with static layout", function () {
    var imageHolder = pane.view('image_holder'),
        imageView;

    // The logo is 294x60
    imageView = SC.ImageView.create({
      value: logoURL + "?lastmod=" + Math.round(Math.random() * 100000),
      layout: { top: 0, left: 0, width: 588, height: 120 },
      useCanvas: NO,
      useStaticLayout: YES,
      scale: SC.SCALE_NONE
    });

    testAlign(imageView);

    SC.run(function () {
      imageHolder.appendChild(imageView);
    });
  });

  test("Aligning images (canvas)", function () {
    var imageHolder = pane.view('image_holder'),
        imageView;

    // The logo is 294x60
    imageView = SC.ImageView.create({
      value: logoURL + "?lastmod=" + Math.round(Math.random() * 100000),
      layout: { top: 0, left: 0, width: 588, height: 120 },
      scale: SC.SCALE_NONE
    });

    testAlign(imageView);

    SC.run(function () {
      imageHolder.appendChild(imageView);
    });
  });

  test("Aligning images (canvas) with static layout", function () {
    var imageHolder = pane.view('image_holder'),
        imageView;

    // The logo is 294x60
    imageView = SC.ImageView.create({
      value: logoURL + "?lastmod=" + Math.round(Math.random() * 100000),
      layout: { top: 0, left: 0, width: 588, height: 120 },
      useStaticLayout: YES,
      scale: SC.SCALE_NONE
    });

    testAlign(imageView);

    SC.run(function () {
      imageHolder.appendChild(imageView);
    });
  });

  test("CSS class is applied for ImageView using a sprite for value", function () {
    var view = pane.view('sprite_image'),
        viewElem = view.$('img');

    ok(viewElem.hasClass('sprite-class'), "element given correct class");

    SC.run(function () {
      view.set('value', 'another-sprite');
    });

    ok(!viewElem.hasClass('sprite-class'), "When value changed, element has old class removed");
    ok(viewElem.hasClass('another-sprite'), "When value changed, element has new class added");

    SC.run(function () {
      view.set('value', null);
    });

    viewElem = view.$('img');
    ok(!viewElem.hasClass('another-sprite'), "When value removed, element has old class removed");
  });

  test("CSS class is applied for ImageView using a sprite for value while using canvas", function () {
    var view = pane.view('sprite_image_canvas'),
        viewElem = view.$();

    ok(viewElem.hasClass('sprite-class'), "element given correct class");

    SC.run(function () {
      view.set('value', 'another-sprite');
    });

    ok(!viewElem.hasClass('sprite-class'), "When value changed, element has old class removed");
    ok(viewElem.hasClass('another-sprite'), "When value changed, element has new class added");

    SC.run(function () {
      view.set('value', null);
    });

    viewElem = view.$();
    ok(!viewElem.hasClass('another-sprite'), "When value removed, element has old class removed");
  });


  test("Changing the type of image view updates the layer appropriately (with canvas)", function () {
    var view = pane.view('canvas_not_loaded'),
      jqEl = view.$(),
      el = jqEl[0],
      jqImgEl,
      imgEl;

    equals(el.innerHTML, '', "The empty image should have no inner HTML.");
    equals(el.tagName, 'CANVAS', "The empty image should be a CANVAS");

    // Set a sprite value.
    SC.run(function () {
      view.set('value', 'sprite-class');
    });

    jqEl = view.$();

    ok(jqEl.hasClass('sprite-class'), "The sprite image should have sprite-class class.");
    equals(el.innerHTML, '', "The sprite image should have no inner HTML.");

    // Set a URL value.
    SC.run(function () {
      view.set('value', logoURL);
    });

    jqEl = view.$();
    el = jqEl[0];

    ok(!jqEl.hasClass('sprite-class'), "The url image should no longer have sprite-class class.");
    equals(el.innerHTML, '', "The url image should have no inner HTML.");
    equals(el.tagName, 'CANVAS', "The url image should be a CANVAS");
  });

  test("Changing the type of image view updates the layer appropriately (without canvas)", function () {
    var view = pane.view('image_not_loaded'),
      jqEl = view.$('img'),
      el = jqEl[0],
      jqImgEl,
      imgEl;
    
    ok(!jqEl.attr('class'), "The empty image should have no class.");
    equals(el.tagName, 'IMG', "The empty image should be a IMG");

    // Set a sprite value.
    SC.run(function () {
      view.set('value', 'sprite-class');
    });

    jqEl = view.$('img');

    ok(jqEl.hasClass('sprite-class'), "The sprite image should have sprite-class class.");

    // Set a URL value.
    SC.run(function () {
      view.set('value', logoURL);
    });

    jqEl = view.$('img');

    ok(!jqEl.hasClass('sprite-class'), "The url image should no longer have sprite-class class.");
  });
})();

