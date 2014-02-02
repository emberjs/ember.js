SC.mixin( /** @scope SC */ {
  /**
    This function is similar to SC.metricsForString, but takes an extra argument after the string and before the exampleElement.
    That extra argument is *maxWidth*, which is the maximum allowable width in which the string can be displayed. This function
    will find the narrowest width (within *maxWidth*) that keeps the text at the same number of lines it would've normally wrapped
    to had it simply been put in a container of width *maxWidth*.

    If you have text that's 900 pixels wide on a single line, but pass *maxWidth* as 800, the metrics that will be returned will
    specify a height of two lines' worth of text, but a width of only around 450 pixels. The width this function determines will
    cause the text to be split as evenly as possible over both lines.

    If your text is 1500 pixels wide and *maxWidth* is 800, the width you'll get back will be approximately 750 pixels, because
    the 1500 horizontal pixels of text will still fit within two lines.

    If your text grows beyond 1600 horizontal pixels, it'll wrap to three lines. Suppose you have 1700 pixels of text. This much
    text would require three lines at 800px per line, but this function will return you a width of approximately 1700/3 pixels,
    in order to fill out the third line of text so it isn't just ~100px long.

    A binary search is used to find the optimimum width. There's no way to ask the browser this question, so the answer must be
    searched for. Understandably, this can cause a lot of measurements, which are NOT cheap.

    Therefore, very aggressive caching is used in order to get out of having to perform the search. The final optimimum width is a
    result of all the following values:

      - The string itself
      - The styles on the exampleElement
      - The classNames passed in
      - Whether ignoreEscape is YES or NO

    The caching goes against all of these in order to remember results. Note that maxWidth, though an argument, isn't one of them;
    this means that the optimal width will be searched for only once per distinct *number of lines of text* for a given string and
    styling. However, due to the fact that a passed exampleElement can have different styles a subsequent time it's passed in (but
    still remains the same object with the same GUID, etc), caching will not be enabled unless you either pass in a style string
    instead of an element, or unless your element has *cacheableForMetrics: YES* as a key on it. In most situations, the styles on
    an element won't change from call to call, so this is purely defensive and for arguably infrequent benefit, but it's good
    insurance. If you set the *cacheableForMetrics* key to YES on your exampleElement, caching will kick in, and repeated calls to
    this function will cease to have any appreciable amortized cost.

    The caching works by detecting and constructing known intervals of width for each number of lines required by widths in those
    intervals. As soon as you get a result from this function, it remembers that any width between the width it returned and the
    maxWidth you gave it will return that same result. This also applies to maxWidths greater than the with you passed in, up
    until the width at which the text can fit inside maxWidth with one fewer line break. However, at this point, the function
    can't know how MUCH larger maxWidth can get before getting to the next widest setting. A simple check can be done at this point
    to determine if the existing cached result can be used: if the height of the string at the new maxWidth is the same as the
    cached height, then we know the string didn't fit onto one fewer line, so return the cached value. If we did this check, we
    could return very quickly after only one string measurement, but EACH time we increase the maxWidth we'll have to do a new
    string measurement to check that we didn't end up with horizontal room for one fewer line. Because of this, instead of doing
    the check, the function will perform its binary search to go all the way UP to the minimum maxWidth at which one fewer line
    can be used to fit the text. After caching this value, all subsequent calls to the function will result in no string
    measurements as long as all the maxWidths are within the interval determined to lead to the cached result. So, the second call
    can in some cases be more expensive than it needs to be, but this saves A LOT of expense on all subsequent calls. The less
    often one calls metricsForString, the happier one's life is.

    The amount of time this function will take ranges from 0 to maybe 35ms on an old, slow machine, and, when used for window
    resizing, you'll see 35, 20, 0, 0, 0, ..., 0, 0, 35, 0, 0, 0, ..., 0, 0, 35, 0, 0, 0, ..., 0, 0, 0, 35, 0, 0, 0, ...
    After resizing through all the different caching intervals, the function will always execute quickly... under 1ms nearly always.
    The expensive calls are when a caching interval is crossed and a new cached set of metrics for the new number of lines of text
    must be calculated. And in reality, the number of sub-millisecond function calls will be much greater relative to the number
    of expensive calls, because window resizing just works like that.

    @param {String} string The text whose width you wish to optimize within your maximum width preference.

    @param {Number} maxWidth The maximum width the text is allowed to span, period. Can have "px" afterwards. Need not be a whole
                             number. It will be stripped of "px", and/or rounded up to the nearest integer, if necessary.

    @param {Element/String} exampleElement The element whose styles will be used to measure the width and height of the string.
                                           You can pass a string of CSSText here if you wish, just as with SC.metricsForString.

    @param {String} [classNames] Optional. Any class names you wish to also put on the measurement element.

    @param {Boolean} [ignoreEscape] Optional. If true, HTML in your string will not be escaped. If false or omitted, any HTML
                                              characters will be escaped for the measurement. If it's omitted where it should be
                                              true for correct results, the metrics returned will usually be much bigger than
                                              otherwise required.
  */
  bestStringMetricsForMaxWidth: function(string,maxWidth,exampleElement,classNames,ignoreEscape) {
    if(!maxWidth) { SC.warn("When calling bestMetricsForWidth, the second argument, maxWidth, is required. There's no reason to call this without a maxWidth."); return undefined; }
    maxWidth = Math.ceil(parseFloat(maxWidth));
    var                me = arguments.callee,
              exIsElement = SC.typeOf(exampleElement||(exampleElement=""))!==SC.T_STRING,
            savedMaxWidth = exIsElement ? exampleElement.style.maxWidth : undefined,
                    cache = (!exIsElement || exampleElement.cacheableForMetrics) ?
                              SC.cacheSlotFor(exampleElement,classNames,ignoreEscape,string) :
                              undefined,
                 applyMax = exIsElement ?
                              (me._applyMaxToEl||(me._applyMaxToEl=function(el,width) { el.style.maxWidth = width+"px"; return el; })) :
                              (me._applyMaxToStr||(me._applyMaxToStr=function(str,width) { return str.replace(/max-width:[^;]*;/g,'') + " max-width:"+width+"px"; })),
                removeMax = exIsElement ?
                              (me._removeMaxFromEl||(me._removeMaxFromEl=function(el) { el.style.maxWidth = "none"; return el; })) :
                              (me._removeMaxFromStr||(me._removeMaxFromStr=function(str) { return str.replace(/max-width:[^;]*;/g,'') + " max-width:none"; })),
          searchingUpward = false;
    if(cache) {
      cache.list || (cache.list = [{width: Infinity, height:0}]);
      for(var i=1,l=cache.list.length,inner,outer,ret; i<l && !ret; i++) {
        inner = cache.list[i];
        outer = cache.list[i-1];
        if(!inner || !inner.width) continue;
        if(maxWidth>=inner.width) {
          if((outer && outer.width) || (maxWidth<=inner.maxWidth)) {
            // console.error('returning from cache,',CW.Anim.enumerate(inner));
            return inner;
          }
          // searchingUpward = true;  //commented because this is currently problematic. If this remains false, duplicate work will be done if increasing in maxWidth since previous calls, but at least the results will be correct.
          ret = inner;
        }
      }
    }
    var            exEl = applyMax(exampleElement,maxWidth),
                metrics = SC.metricsForString(string,exEl,classNames,ignoreEscape),
        necessaryHeight = metrics.height,
          oneLineHeight = cache ? cache.parent.height || (cache.parent.height=SC.metricsForString('W',exEl,classNames).height) : SC.metricsForString('W',exEl,classNames).height,
                  lines = Math.round( necessaryHeight / oneLineHeight );
    if(searchingUpward) { lines--; necessaryHeight=lines*oneLineHeight; }
    if(necessaryHeight > oneLineHeight) {
      var hi = searchingUpward ? Math.ceil(metrics.width*2.5) : metrics.width,
          lo = searchingUpward ? metrics.width : Math.floor(metrics.width/2.5),
          middle ,
          now = new Date()*1,
          count = 0;
      while(hi-lo>1 || (metrics.height>necessaryHeight&&!searchingUpward) || (metrics.height<necessaryHeight&&searchingUpward)) {
        count++;
        middle = (hi+lo)/2;
        exEl = applyMax(exEl,middle);
        metrics = SC.metricsForString(string,exEl,classNames,ignoreEscape);
        if(metrics.height>necessaryHeight) lo = middle;
        else                               hi = middle;
      }
      metrics.width = Math.ceil(middle);
      metrics.height = necessaryHeight;
      metrics.maxWidth = maxWidth;
      metrics.lineHeight = oneLineHeight;
      metrics.lines = lines;
      metrics.searchPerformed = true;
      metrics.searchTime = new Date()*1 - now;
      metrics.searchCount = count;
    } else {
      if(searchingUpward) metrics = SC.metricsForString(string,exEl=removeMax(exEl),classNames,ignoreEscape);
      metrics.maxWidth = maxWidth;
      metrics.lineHeight = oneLineHeight;
      metrics.lines = lines;
      metrics.searchPerformed = false;
    }
    metrics.browserCorrection = 0;
    if(SC.browser.isIE) metrics.browserCorrection = 1;
    if(SC.browser.isMozilla) metrics.browserCorrection = 1;
    metrics.width = Math.min(maxWidth,metrics.width+metrics.browserCorrection);
    if(cache) {
      var entry = cache.list[lines];
      if(entry && entry.maxWidth<maxWidth) entry.maxWidth = maxWidth;
      if(!entry) entry = cache.list[lines] = metrics;
    }
    if(exIsElement) exEl.style.maxWidth = savedMaxWidth;
    ret = searchingUpward ? ret : metrics;
    // console.error('returning at end'+(searchingUpward?" after searching upward and finding"+CW.Anim.enumerate(metrics):"")+'. Returned value is ',CW.Anim.enumerate(ret));
    return ret;
  },

  /**
    Supply any number of arguments of any type, and this function will return you a hash associated with all those arguments.
    Call it twice with the same arguments in the same order, and the hash is the same. This is great for getting out of
    calculations whose answers depend on many different variables.

    @param {anything} your-arguments Any set of arguments whatsoever. If the FIRST argument is an array (including Arguments
                                     arrays), all other arguments will be ignored and the array will be treated as if its
                                     values at its numerical indices were passed in themselves as individual arguments.
    @returns {Hash} A cached workspace mapped to the ordered *n*-tuple of arguments passed into it.
  */
  cacheSlotFor: function() {
    var     me = arguments.callee.caller,
          curr = me.cache || (me.cache={});
    if(!arguments[0]) return curr;
    var   args = (arguments[0] instanceof Array || arguments[0].callee) ? arguments[0] : arguments,
        length = args.length,
           arg ,
             i ;
    for(i=0; i<length; i++) {
      if(typeof (arg=args[i]) === "object")
        arg = SC.guidFor(arg);
      curr = curr[arg] || (curr[arg]={parent:curr});
    }
    return curr;
  },

  /**
    Returns a wrapped copy of your function that caches its results according to its arguments. This function itself is cached, so
    the function you receive when you pass in a particular function will always be the same function.

    How was does this function handle its own caching? Using itself, of course! :-D

    Use this only on functions without side effects you depend on, and only on functions whose outputs depend entirely on their
    arguments and on nothing else external to them that could change.
  */
  cachedVersionOf: function() {
    var ret = function(func) {
      var ret = function() {     var cache = SC.cacheSlotFor(arguments);
                                 return cache.result || (cache.result = arguments.callee.func.apply(this,arguments));    };
      ret.func = func;
      return ret;
    };
    return ret(ret);
  }()
});
