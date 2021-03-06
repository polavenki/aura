/*
 * Copyright (C) 2013 salesforce.com, inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 
({
/*
* ========================= 
* PUBLIC HELPER METHODS
* =========================
*/
    init : function(component) {
        var scrollerWrapperDOM  = this._getScrollerWrapper(component),
            scrollerOptions     = this._mapAuraScrollerOptions(component),
            scrollerNamespace   = this.getScrollerNamespace(component),
            ScrollerConstructor = scrollerNamespace.constructor,
            scrollerInstance    = new ScrollerConstructor(scrollerWrapperDOM, scrollerOptions);
        
        this._attachAuraEvents(component, scrollerInstance);
        this.setScollerInstance(component, scrollerInstance);

    },
    getScrollerInstance: function (component) {
        return component._scroller;
    },
    setScollerInstance: function (component, scrollerInstance) {
        var helper = this;
        component._scroller = scrollerInstance;
        
        component.getScrollerInstance = function () {
            return helper.getScrollerInstance(this);
        }

        component.getScrollerNamespace = function () {
            return helper.getScrollerNamespace(this);
        }

        // For debugging purposes...
       // #if {"excludeModes" : ["PRODUCTION"]}
            var scrollerNS = this.getScrollerNamespace(component),
                instances  = scrollerNS.instances || (scrollerNS.instances = {});
            instances[component.getGlobalId()] = scrollerInstance;
        // #end
    },
    getScrollerNamespace: function (component) {
        if (typeof window.__S === "undefined") {
            this._bootstrapScroller();
        }
        return window.__S;
    },
    handleScrollTo : function(component, event) {
        var scroller = this.getScrollerInstance(component),
            params   = event.getParams(),
            dest     = params.destination,
            time     = params.time,
            x        = params.xcoord || 0,
            y        = params.ycoord || 0;

        if (dest === 'custom') {
            scroller.scrollTo(x, y, time);
        } else if (dest === 'top' || dest === 'left') {
            scroller.scrollToTop(time);
        } else if (dest === 'bottom' || dest === 'right') {
            scroller.scrollToBottom(time);
        }
    },
    handleScrollBy: function (component, event) {
        var scroller = this.getScrollerInstance(component),
            params   = event.getParams(),
            time     = params.time,
            deltaX   = params.deltaX || 0,
            deltaY   = params.deltaY || 0;

        scroller.scrollTo(scroller.x + deltaX, scroller.y + deltaY, time);
    },
    swapShowMore: function (cmp, newValue) {
        var scroller = this.getScrollerInstance(cmp);
        if (scroller && scroller.togglePullToLoadMore) {
            scroller.togglePullToLoadMore(newValue);
        }
    },
    swapRefresh: function (cmp, newValue) {
        var scroller = this.getScrollerInstance(cmp);
        if (scroller && scroller.togglePullToRefresh) {
            scroller.togglePullToRefresh(newValue);
        }
    },
/*
* ========================= 
* PRIVATE HELPER METHODS
* =========================
*/
    /*
    * @_bind: 
    * Receives a method and an array of arguments 
    * Returns a function binding the current context and concatenating the original args with the news ones returned
    */
    _bind: function (method) {
        var context = this, 
            xArgs   = Array.prototype.slice.call(arguments, 1);

        return function () {
            method.apply(context, xArgs.concat(Array.prototype.slice.call(arguments)));
        }
    },
    _getScrollerWrapper: function (component) {
        return component.find('scrollWrapper').getElement();
    },
    
    _getPullToRefreshConfig: function (component) {
        var nativeScroller = component.get('v.useNativeScroller');
        return {
            labelPull     : nativeScroller ? component.get('v.pullToRefreshClick'): component.get("v.pullToRefreshPull"),
            labelRelease  : component.get("v.pullToRefreshRelease"),
            labelUpdate   : component.get("v.pullToRefreshUpdating"),
            labelSubtitle : component.get("v.pullToRefreshSubtitle"),
            labelError    : component.get("v.pullToRefreshError")
        }
    },
    _getPullToLoadMoreConfig: function (component) {
        var nativeScroller = component.get('v.useNativeScroller');
        return {
            labelPull     : nativeScroller ? component.get('v.pullToShowMoreClick') : component.get("v.pullToShowMorePull"),
            labelRelease  : component.get("v.pullToShowMoreRelease"),
            labelUpdate   : component.get("v.pullToShowMoreUpdating"),
            labelSubtitle : component.get("v.pullToShowMoreSubtitle"),
            labelError    : component.get("v.pullToShowMoreError")
        }
    },
    _getInfiniteLoadingConfig: function (component) {
        var self               = this,
            auraDataProvider   = component.get('v.infiniteLoadingDataProvider'),
            dataProviderBridge = function (callback) {
                if (auraDataProvider) {
                    auraDataProvider.run(callback);
                } else {
                    callback({error:'Invalid Provider'});
                }
            };

        return {
            threshold    : component.get('v.infiniteLoadingThreshold'),
            dataProvider : dataProviderBridge
        }
    },
    _getPlugins: function (component) {
        var rawPlugins      = component.get('v.plugins') || '',
            plugins         = (rawPlugins && rawPlugins.split(',')) || [],
            corePlugins     = [],
            scrollbars      = component.get('v.showScrollbars'),
            snap            = component.get('v.snap'),
            endless         = component.get('v.endless'),
            infiniteLoading = component.get('v.infiniteLoading');

        // If the attributes are true add the core plugins to the scroller plugin array
        scrollbars      && corePlugins.push('Indicators');
        snap            && corePlugins.push('Snap');
        endless         && corePlugins.push('Endless');
        infiniteLoading && corePlugins.push('InfiniteLoading');

        return corePlugins.concat(plugins);
    },
    _mapAuraScrollerOptions: function (component) {
        var device                = $A.get('$Browser'),
            cssTransition         = component.get('v.useCSSTransition'),
            canRefresh            = component.get('v.canRefresh'),
            canShowMore           = component.get('v.canShowMore'),

            // scroller properties check
            useNativeScroller     = component.get('v.useNativeScroller'),
            enabled               = component.get('v.enabled'),
            width                 = component.get('v.width'),
            height                = component.get('v.height'),
            scroll                = component.get('v.scroll'),
            scrollbars            = component.get('v.showScrollbars'),
            gpuOptimization       = component.get('v.gpuOptimization'),

            // For now, default android and ios to use CSSTransitions
            useCSSTransition      = typeof cssTransition === "boolean" ? cssTransition : (!gpuOptimization && (device.isIOS || device.isAndroid)),
            
            snap                  = component.get('v.snapType'),
            bindToWrapper         = component.get('v.bindEventsToScroller'),
            plugins               = this._getPlugins(component),

            auraOnPullToRefresh   = component.get('v.onPullToRefresh'),
            auraOnPullToLoadMore  = component.get('v.onPullToShowMore'),
            auraInfiniteLoading   = component.get('v.infiniteLoadingDataProvider'),

            pullToRefresh         = canRefresh,
            pullToLoadMore        = canShowMore,
            infiniteLoading       = auraInfiniteLoading && component.get('v.infiniteLoading'),

            pullToRefreshConfig   = this._getPullToRefreshConfig(component),
            pullToLoadMoreConfig  = this._getPullToLoadMoreConfig(component),
            infiniteLoadingConfig = this._getInfiniteLoadingConfig(component);
        
        return {
            enabled               : useNativeScroller ? false : enabled,
            useNativeScroller     : useNativeScroller,
            itemWidth             : width,
            itemHeight            : height,
            scroll                : scroll,
            scrollbars            : scrollbars,
            useCSSTransition      : useCSSTransition,
            bindToWrapper         : bindToWrapper,
            gpuOptimization       : gpuOptimization,

            pullToRefresh         : pullToRefresh,
            pullToLoadMore        : pullToLoadMore,
            infiniteLoading       : !!infiniteLoading,
            
            onPullToRefresh       : auraOnPullToRefresh  && this._bind(this._bridgeScrollerCallback, component, auraOnPullToRefresh),
            onPullToLoadMore      : auraOnPullToLoadMore && this._bind(this._bridgeScrollerCallback, component, auraOnPullToLoadMore),
            pullToRefreshConfig   : pullToRefreshConfig,
            pullToLoadMoreConfig  : pullToLoadMoreConfig,
            infiniteLoadingConfig : infiniteLoadingConfig,

            plugins               : plugins
        };
    },
    _bridgeScrollerCallback: function (component, auraAction, callback) {
        var timeout   = 5000,
            triggered = false;

        // If the callback was not triggered after a big timeout, call it manually with an error
        window.setTimeout(function () {
            if (!triggered) {
                callback({
                    /*labelError: 'Callback never called...'*/
                });
            }
        }, timeout);

        $A.run(function () {
            auraAction.run(function () {
                triggered = true;
                callback.apply(this, arguments);
            });    
        });
        
    },
    _bridgeScrollerAction: function (component, scrollerInstance, actionName) {
        var attrActionName = 'on' + actionName.charAt(0).toUpperCase() + actionName.slice(1),
            action = component.get("v." + attrActionName);

        if (action) {
            scrollerInstance.on(actionName, function () {
                action.run.apply(action, arguments);
            });
        }
    },
    _preventDefault: function (e) {
        e.preventDefault();
    },
    _attachAuraEvents: function (component, scrollerInstance) {
        var events = [
                'beforeScrollStart',
                'scrollStart',
                'scrollMove',
                'scrollEnd'
            ], wrapper;

        if (component.get('v.preventDefaultOnMove')) {
            wrapper = this._getScrollerWrapper(component);
            wrapper.addEventListener('touchmove', this._preventDefault, false);
        }

        if (component.get('v.useNativeScroller')) {
            this._attachClickEventsToPullsTo(component, scrollerInstance);
        }

        for (var i = 0; i < events.length; i++) {
            this._bridgeScrollerAction(component, scrollerInstance, events[i]);
        }

        this._stopNativeDragging(component);
        this._captureClickEvents(component, scrollerInstance);
    },
    /*
    * If we use native scrolling pullToShowMore and pullToRefresh will render as part of the scroller
    * We need to attach the click events so we can trigger the same funcionality
    */
    _attachClickEventsToPullsTo: function (cmp, scrollerInstance) {
        var wrapper        = scrollerInstance.wrapper,
            pullToRefresh  = wrapper.getElementsByClassName('pullToRefresh')[0],
            pullToLoadMore = wrapper.getElementsByClassName('pullToLoadMore')[0];

        if (pullToRefresh) {
            pullToRefresh.addEventListener('click', function () {
                scrollerInstance.triggerPTR();
            }, false);
        }

        if (pullToLoadMore) {
            pullToLoadMore.addEventListener('click', function () {
                scrollerInstance._triggerPTL();
            }, false);
        }
    },

    /*
    * @_stopNativeDraggin
    * Preventsthe native dragging functionality of for desktop browsers.
    * Removes the undesired dragging effect if click happens within an anchor or li elements.
    */
    _stopNativeDragging: function (component) {
        var wrapper = this._getScrollerWrapper(component);
        wrapper.ondragstart = function () { return false; }; //testing
    },
    /*
    * @_captureClickEvents:
    *
    * Due to the way aura handles click events (attaching the handler directly to the DOM element (no delegation mechanism))
    * We need to handle the click event in the capture face, and if the scroller didn't move, let  the event flow and let aura handle the event.
    * Otherwise a click will be fired even when you have moved the scroller which presents a huge usability issue.
    * This function will make the click pointers and touch events work properly across devices/platforms
    */
    _captureClickEvents: function (component, scroller) {
        var wrapper = this._getScrollerWrapper(component);

        wrapper.addEventListener('click', function (e) {
            if (scroller.moved) {
                e.cancelBubble = true;
                e.stopPropagation();
            }
        }, true)
    },
    deactivate: function(component) {
        var namespace = this.getScrollerNamespace(),
            scroller  = this.getScrollerInstance(component),
            wrapper   = this._getScrollerWrapper(component);

        if (component.get('v.preventDefaultOnMove')) {
            wrapper.removeEventListener('touchmove', this._preventDefault, false);
        }

        // #if {"excludeModes" : ["PRODUCTION"]}
        delete namespace.instances[component.getGlobalId()];
        // #end

        if (scroller) {
            scroller.destroy();
        }

       delete component._scroller;
    },

/*
* <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
* ============================================================================= 
*
*   _____                _ _             ___    ___  
*  / ____|              | | |           |__ \  / _ \ 
* | (___   ___ _ __ ___ | | | ___ _ __     ) || | | |
*  \___ \ / __| '__/ _ \| | |/ _ \ '__|   / / | | | |
*  ____) | (__| | | (_) | | |  __/ |     / /_ | |_| |
* |_____/ \___|_|  \___/|_|_|\___|_|    |____(_)___/ 
*                                                    
*
* SCROLLER VANILLA JS BOOTSTRAP!
* DO NOT TOUCH BEYOND THIS POINT MANUALLY!
*
* IF YOU WANT TO MODIFY THIS CODE those are the steps:
* 
*    1. Clone this repo:  https://git.soma.salesforce.com/UI/scroller and follow the instructions there to test and modify the code
*    2. Once you have your changes tested and ready to go, run "grunt aurabuild" to genereate a transpiled version of the Scroller for Aura. The results are in the /build folder
*    3. Copy the content of the file right after this comments. Make sure you don't break anything in the SFDC/P4 world!
*
* NEVER UPDATE THIS CODE WITHOUT UPDATING THE ORIGINAL GIT REPO!!!    
* ALSO, BEFORE MODIFYING ANYTHING, PLEASE TALK TO Diego (@dval) or Nihar (@ndandekar)
*
* =============================================================================
* <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
*/
_bootstrapScroller: function () {
    this._initScrollerDependencies();
    this._initScroller();
    this._initScrollerPlugins();
},
_initScrollerDependencies: function () {
    !function(a){a.__S||(a.__S={plugins:{}}),a.DEBUG=function(b){return b?console:{warn:function(){a.console.warn.apply(console,arguments)},log:function(){}}}("#debug"===a.document.location.hash)}(window),function(a){Array.prototype.forEach||(Array.prototype.forEach=function(a){"use strict";if(void 0===this||null===this)throw new TypeError;var b=Object(this),c=b.length>>>0;if("function"!=typeof a)throw new TypeError;for(var d=arguments.length>=2?arguments[1]:void 0,e=0;c>e;e++)e in b&&a.call(d,b[e],e,b)});var b,c,d,e=a.__S||(a.__S={}),f=a.document.documentElement.style,g=["webkit","Moz","ms"],h=!1,i=!1;if("transition"in f)h=!0,c="";else for(d=0;d<g.length;d++)b=g[d]+"Transition","undefined"!==f.transform&&(h=!0,c=g[d]);if("undefined"!=typeof f.transform)i=!0;else for(d=0;d<g.length;d++)b=g[d]+"Transform","undefined"!=typeof f[b]&&(i=!0,c=g[d]);e.support={prefix:c,transition:h,transform:i,matrix:!(!a.WebKitCSSMatrix&&!a.MSCSSMatrix),touch:"ontouchstart"in a,pointers:a.navigator.pointerEnabled,msPointers:a.navigator.msPointerEnabled}}(window),function(a){function b(b,c){for(var d=["Top","Right","Bottom","Left"],e=a.getComputedStyle(c),f="width"===b,g=f?1:0,h=0;4>g;g+=2)h+=parseInt(e["margin"+d[g]],10);return h+(f?c.offsetWidth:c.offsetHeight)}var c=a.__S||(a.__S={}),d=c.support,e=d&&d.prefix,f={};return d?(d.transition&&d.transform&&(f=""!==e?{transform:e+"Transform",transitionTimingFunction:e+"TransitionTimingFunction",transitionDuration:e+"TransitionDuration",transformOrigin:e+"TransformOrigin",boxSizing:e+"BoxSizing",matrix:a.WebKitCSSMatrix||a.MSCSSMatrix}:{transform:"transform",transitionTimingFunction:"transitionTimingFunction",transitionDuration:"transitionDuration",transformOrigin:"transformOrigin",boxSizing:"boxSizing",matrix:a.WebKitCSSMatrix||a.MSCSSMatrix}),f.getHeight=function(a){return b("height",a)},f.getWidth=function(a){return b("width",a)},void(c.styles=f)):void a.console.log("Scroller Dependency error! browser support detection needed")}(window),function(a){"use strict";var b=a.__S||(a.__S={}),c={simpleMerge:function(a,b){var c,d={};for(c in a)d[c]=a[c];for(c in b)d[c]=b[c];return d},parseDOM:function(b){var c;return b&&b.length?"string"==typeof b?(c=a.document.createElement("div"),c.innerHTML=b,Array.prototype.slice.call(c.children,0)):Array.prototype.slice.call(b,0):void 0},bind:function(a,b,c,d){a.addEventListener(b,c,!!d)},unbind:function(a,b,c,d){a.removeEventListener(b,c,!!d)}};b.helpers=c}(window),function(a){for(var b=0,c=["ms","moz","webkit","o"],d=0;d<c.length&&!a.requestAnimationFrame;++d)a.requestAnimationFrame=a[c[d]+"RequestAnimationFrame"],a.cancelAnimationFrame=a[c[d]+"CancelAnimationFrame"]||a[c[d]+"CancelRequestAnimationFrame"];a.requestAnimationFrame||(a.requestAnimationFrame=function(c){var d=(new Date).getTime(),e=Math.max(0,16-(d-b)),f=a.setTimeout(function(){c(d+e)},e);return b=d+e,f}),a.cancelAnimationFrame||(a.cancelAnimationFrame=function(b){a.clearTimeout(b)})}(window),function(a){function b(a){if(this._element=a,a.className!=this._classCache){if(this._classCache=a.className,!this._classCache)return;var b,c=this._classCache.replace(/^\s+|\s+$/g,"").split(/\s+/);for(b=0;b<c.length;b++)h.call(this,c[b])}}function c(a,b){a.className=b.join(" ")}function d(a,b,c){Object.defineProperty?Object.defineProperty(a,b,{get:c}):a.__defineGetter__(b,c)}if(!("undefined"==typeof a.Element||"classList"in document.documentElement)){Array.prototype.indexOf||(Array.prototype.indexOf=function(a,b){for(var c=b||0,d=this.length;d>c;c++)if(this[c]===a)return c;return-1});var e=Array.prototype,f=e.indexOf,g=e.slice,h=e.push,i=e.splice,j=e.join;b.prototype={add:function(a){this.contains(a)||(h.call(this,a),c(this._element,g.call(this,0)))},contains:function(a){return-1!==f.call(this,a)},item:function(a){return this[a]||null},remove:function(a){var b=f.call(this,a);-1!==b&&(i.call(this,b,1),c(this._element,g.call(this,0)))},toString:function(){return j.call(this," ")},toggle:function(a){return this.contains(a)?this.remove(a):this.add(a),this.contains(a)}},window.DOMTokenList=b,d(Element.prototype,"classList",function(){return new b(this)})}}(window),function(a){"use strict";function b(a,b,c,e){function f(a,b){return 1-3*b+3*a}function g(a,b){return 3*b-6*a}function h(a){return 3*a}function i(a,b,c){return((f(b,c)*a+g(b,c))*a+h(b))*a}function j(a,b,c){return 3*f(b,c)*a*a+2*g(b,c)*a+h(b)}function k(b){var e,f,g,h=b,k=d;for(g=0;k>g;g++){if(e=j(h,a,c),0===e)return h;f=i(h,a,c)-b,h-=f/e}return h}var l;return l=function(d){return a==b&&c==e?d:i(k(d),b,e)},l.toString=function(){return"cubic-bezier("+a+", "+b+", "+c+", "+e+")"},l}var c=a.__S||(a.__S={}),d=4;c.CubicBezier=b}(window);
},
_initScrollerPlugins: function () {
    this._initSurfaceManagerPlugin();
    this._initPullToRefreshPlugin();
    this._initPullToLoadMorePlugin();
    this._initIndicatorsPlugin();
    this._initInfiniteLoadingPlugin();
    this._initEndlessPlugin();
    this._initSnapPlugin();
},
_initScroller: function () {
    (function (w) {
    "use strict";

    // GLOBALS UTILS
    var NOW            = Date.now || function () { return new Date().getTime(); },
        RAF            = w.requestAnimationFrame,
        CAF            = w.cancelAnimationFrame,

    // NAMESPACES
        SCROLLER       = w.__S || {},
        PLUGINS        = SCROLLER.plugins,
        HELPERS        = SCROLLER.helpers,
        SUPPORT        = SCROLLER.support,
        STYLES         = SCROLLER.styles,
        CubicBezier    = SCROLLER.CubicBezier,

    // Distinguish type of touch events so they don't conflict in certain contexts, 
    // like Dual gestures on Windows Tablets or in ChromeDevTools 
    // (bug where enabling touch gestures, it fire both types)
        EVENT_TYPE = {
            touchstart : 1,
            touchmove  : 1,
            touchend   : 1,

            mousedown : 2,
            mousemove : 2,
            mouseup   : 2,

            pointerdown : 3,
            pointermove : 3,
            pointerup   : 3,

            MSPointerDown : 4,
            MSPointerMove : 4,
            MSPointerUp   : 4
        },

        SCROLL_VERTICAL      = 'vertical',
        SCROLL_HORIZONTAL    = 'horizontal',

        ACTION_RESET         = 'reset',
        ACTION_LOCK          = 'lock',
        ACTION_GESTURE_START = 'gestureStart',
        ACTION_GESTURE_MOVE  = 'gestureMove',
        ACTION_ANIM_MOVING   = 'animationMove',
        ACTION_ANIM_END      = 'animationEnd',

        HOOK_BEFORE          = 'before',
        HOOK_AFTER           = 'after',

        // Functions easings for either animations or RAF
        EASING_REGULAR = CubicBezier(0.33, 0.66, 0.66, 1),
        EASING_BOUNCE  = CubicBezier(0.33, 0.33, 0.66, 0.81),
        EASING = {
            regular : {
                style : EASING_REGULAR.toString(),
                fn    : EASING_REGULAR
            },
            bounce : {
                style : EASING_BOUNCE.toString(),
                fn    : EASING_BOUNCE,
            }
        },
        // Default options
        DEFAULTS = {
            enabled               : true,
            bounceTime            : 600,
            useCSSTransition      : false,
            dualListeners         : false,
            minThreshold          : 5,     // It should be in the [0, 10] range
            minDirectionThreshold : 2,    // It should be smaller than minThreshold
            lockOnDirection       : null,
            itemHeight            : null,
            itemWidth             : null,
            bindToWrapper         : false,
            scroll                : SCROLL_VERTICAL,
            pullToRefresh         : false,
            pullToLoadMore        : false,
            scrollbars            : false,
            infiniteLoading       : false,
            gpuOptimization       : true
        },

        ACCELERATION_CONSTANT = 0.0005,
        MOUSE_WHEEL_SPEED     = 20,
        MOUSE_WHEEL_INVERTED  = false;

    function Scroller (el, config) {
        config || (config = {});
        this.x    = 0;
        this.y    = 0;

        this._setConfig(config);
        this._setElement(el);
        this._setSize();
        this._initializeEvents();
        this._initializePlugins(config);
        this._initialize();

        this._handleEvents('bind');
    }

    //STATICS
    Scroller.DEFAULTS              = DEFAULTS;
    Scroller.CubicBezier           = CubicBezier;
    Scroller.EASING_REGULAR        = EASING_REGULAR;
    Scroller.EASING_BOUNCE         = EASING_BOUNCE;
    Scroller.EASING                = EASING;
    Scroller.ACCELERATION_CONSTANT = ACCELERATION_CONSTANT;
    Scroller.SCROLL_VERTICAL       = SCROLL_VERTICAL;
    Scroller.SCROLL_HORIZONTAL     = SCROLL_HORIZONTAL;
    Scroller.MOUSE_WHEEL_SPEED     = MOUSE_WHEEL_SPEED;
    Scroller.MOUSE_WHEEL_INVERTED  = MOUSE_WHEEL_INVERTED;
    Scroller.plugins               = PLUGINS;

    Scroller.prototype = {
        _initialize: function () {
            this._fire('_initialize');
        },
        _initializePlugins: function (cfg) {
            var userPlugins    = this.opts.plugins,
                SurfaceManager = PLUGINS.SurfaceManager,
                PullToRefresh  = PLUGINS.PullToRefresh,
                PullToLoadMore = PLUGINS.PullToLoadMore,
                enableSM       = !this.opts.useCSSTransition && this.opts.gpuOptimization,
                enablePTR      = this.opts.onPullToRefresh,
                enablePTL      = this.opts.onPullToLoadMore;
            
            if (enablePTR && PullToRefresh)  this.plug(PullToRefresh);
            if (enablePTL && PullToLoadMore) this.plug(PullToLoadMore);
            if (enableSM  && SurfaceManager) this.plug(SurfaceManager);

            if (userPlugins) {
                for (var i = 0; i < userPlugins.length; i++) {
                    this.plug(userPlugins[i]);
                }    
            }
        },
        _initializeEvents: function () {
            this._events = {};
        },
        _mergeConfigOptions: function (cfg, toMerge) {
            return HELPERS.simpleMerge(cfg, toMerge);
        },
        _setConfig: function (cfg) {
            var opts = this.opts = this._mergeConfigOptions(DEFAULTS, cfg);

            // Config vars
            this.enabled               = opts.enabled;
            this.scroll                = opts.scroll;
            this.itemHeight            = opts.itemHeight;
            this.itemWidth             = opts.itemWidth;

            this.acceleration          = ACCELERATION_CONSTANT;
            this.scrollVertical        = this.scroll === SCROLL_VERTICAL;
            
            // Consistency guards
            if (opts.infiniteLoading && opts.pullToLoadMore) {
                w.DEBUG.warn('You cannot have infiniteLoading and pullToShowMore at the same time. Switching to infiniteLoading');
                this.opts.pullToLoadMore = false;
            }

            if (!this.scrollVertical && (opts.pullToRefresh || opts.pullToLoadMore)) {
                DEBUG.warn('The attributes: pullToRefresh or pullToShowMore are not available in horizontal mode yet. Switching them to false');
                this.opts.pullToRefresh  = false;
                this.opts.pullToLoadMore = false;
            }
        },
        _setElement: function (el) {
            this.wrapper       = typeof el == 'string' ? w.document.querySelector(el) : el;
            this.scroller      = this.wrapper.children[0];
            this.scrollerStyle = this.scroller.style;

            this.scroller.classList.add('scroller');
            this.scroller.classList.add( this.scrollVertical ? 'scroll-vertical' : 'scroll-horizontal');
        },
        _setWrapperSize: function () {
            this.wrapperWidth  = this.wrapper.clientWidth;
            this.wrapperHeight = this.wrapper.clientHeight;
            this.wrapperSize   = this.scrollVertical ? this.wrapperHeight : this.wrapperWidth;
        },
        _setSize: function () {
            var ptl_offset = this._ptlThreshold || 0;

            this._setWrapperSize();
            this._sizePullToShowMore();

            this.scrollerWidth  = this.scroller.offsetWidth;
            this.scrollerHeight = this.opts.pullToLoadMore ? this.scroller.offsetHeight - ptl_offset : this.scroller.offsetHeight;

            this.maxScrollX     = this.wrapperWidth  - this.scrollerWidth;
            this.maxScrollY     = this.wrapperHeight - this.scrollerHeight;

            this.maxScrollX     = this.maxScrollX > 0 ? 0 : this.maxScrollX;
            this.maxScrollY     = this.maxScrollY > 0 ? 0 : this.maxScrollY;

            this.hasScrollX     = this.maxScrollX < 0;
            this.hasScrollY     = this.maxScrollY < 0;

        },
        _sizePullToShowMore: function () {
            // To be overriden by pull-to-show-more plugin
        },
        _destroy: function () {
            this._handleEvents('unbind');
        },
    /* 
    * ==================================================
    * Event handling and bindings
    * ================================================== 
    */
        _handleEvents: function (action) {
            var eventType = action === 'bind' ? HELPERS.bind : HELPERS.unbind,
                wrapper   = this.wrapper,
                target    = this.opts.bindToWrapper ? wrapper : window,
                pHandlers = false,
                scroller  = this.scroller;

            eventType(window, 'orientationchange', this);
            eventType(window, 'resize', this);

            // if ( this.options.click ) {
                 //eventType(target, 'click', this, true);
            // }

            if (SUPPORT.touch && !this.opts.disableTouch && !pHandlers) {
                eventType(wrapper, 'touchstart',  this);
                eventType(target,  'touchmove',   this);
                eventType(target,  'touchcancel', this);
                eventType(target,  'touchend',    this);
            } 

            if ((SUPPORT.pointers || SUPPORT.msPointers) && !this.opts.disablePointers) {
                if (SUPPORT.pointers) {
                    eventType(wrapper, 'pointerdown',   this);
                    eventType(target,  'pointermove',   this);
                    eventType(target,  'pointercancel', this);
                    eventType(target,  'pointerup',     this);
                } else {
                    eventType(wrapper, 'MSPointerDown',   this);
                    eventType(target,  'MSPointerMove',   this);
                    eventType(target,  'MSPointerCancel', this);
                    eventType(target,  'MSPointerUp',     this);
                }
                pHandlers = true;
            }

            if (!this.opts.disableMouse && (!pHandlers || (pHandlers && this.opts.dualListeners))) {
                eventType(wrapper, 'mousedown',   this);
                eventType(target,  'mousemove',   this);
                eventType(target,  'mousecancel', this);
                eventType(target,  'mouseup',     this);
            }

            if (!this.opts.disableWheel) {
                eventType(wrapper, 'wheel', this);
                eventType(wrapper, 'mousewheel', this);
                eventType(wrapper, 'DOMMouseScroll', this);
            }

            eventType(this.scroller, 'transitionend', this);
            eventType(this.scroller, SUPPORT.prefix + 'TransitionEnd', this);
            
        },
        _fire: function (eventType, action) {
            var eventQueue = this._events[eventType],
                eventFncs  = eventQueue && eventQueue.length,
                params     = Array.prototype.slice.call(arguments, 1),
                ePayload;
                
            if (eventFncs) {
                for (var i = 0; i < eventFncs; i++) {
                    ePayload = eventQueue[i];
                    ePayload.fn.apply(ePayload.context || this, params);
                }
            }
        },
        _hook: function (when, method, hookFn) {
            var self         = this,
                toHookMethod = this[method];
            
            if (toHookMethod) {
                if (when === HOOK_AFTER) {
                    this[method] = function () {
                        toHookMethod.apply(this, arguments);
                        hookFn.apply(this, arguments);
                    };
                } else if (when === HOOK_BEFORE) {
                    this[method] = function () {
                        hookFn.apply(this, arguments);
                        toHookMethod.apply(this, arguments);
                    };
                }
            }
        },
        handleEvent: function (e) {
            switch ( e.type ) {
                case 'touchstart':
                case 'pointerdown':
                case 'MSPointerDown':
                case 'mousedown':
                    this._start(e);
                    break;
                case 'touchmove':
                case 'pointermove':
                case 'MSPointerMove':
                case 'mousemove':
                    this._move(e);
                    break;
                case 'touchend':
                case 'pointerup':
                case 'MSPointerUp':
                case 'mouseup':
                case 'touchcancel':
                case 'pointercancel':
                case 'MSPointerCancel':
                case 'mousecancel':
                    this._end(e);
                    break;
                case 'orientationchange':
                case 'resize':
                    this.resize();
                    break;
                case 'transitionend':
                case SUPPORT.prefix + 'TransitionEnd':
                    this._transitionEnd(e);
                    break;
                case 'wheel':
                case 'DOMMouseScroll':
                case 'mousewheel':
                    this._wheel(e);
                    break;
                case 'keydown':
                    this._key(e);
                    break;
                case 'click':
                    if ( !e._constructed ) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    break;
            }
        },
    /* 
    * ==================================================
    * Scroller gestures
    * ================================================== 
    */
        _start: function (e) {
            if ( !this.enabled || (this._initiated && EVENT_TYPE[e.type] !== this._initiated)) {
                return;
            }

            var point = e.touches ? e.touches[0] : e,
                pos;

            this._initiated      = EVENT_TYPE[e.type]; // for onMove mouse check and other contexts
            this.moved           = false;  // for onMove threshold check
            this.distX           = 0;
            this.distY           = 0;
            this.scrollDirection = null;

            this._transitionTime();   // removes time on transition (reset CSS timing)
            this._isAnimating = false; // reset animation

            if (this._isScrolling) {
                this._stopMomentum();
                this._isScrolling = false;
                // if a link was clicked, stop that from happening
                e.preventDefault();
            }

            this.startX    = this.x;
            this.startY    = this.y;
            this.pointX    = point.pageX;
            this.pointY    = point.pageY;
            this.startTime = NOW();

            this._fire('beforeScrollStart', ACTION_GESTURE_START, e);
        },

        _startMoveRAF: function () {
            var self = this;
            function moveStep (t) {
                self._translate(self.x, self.y);
                self._update();
                self._fire('scrollMove', ACTION_GESTURE_MOVE, self.x, self.y);
                self._rafMoving = RAF(moveStep);
            }
            moveStep();
        },
        _endMoveRAF: function () {
            CAF(this._rafMoving);
        },
        _update: function () {
            this._fire('_update');
        },

        _needsLocking: function () {
            return  this.opts.lockOnDirection &&
                    this.scrollDirection &&
                    this.opts.lockOnDirection === this.scrollDirection;
        },
        lockScroller: function () {
            this._initiated = false;
            this._fire(ACTION_LOCK, this.scrollDirection);
        },
        _getScollDirection: function (absX, absY) {
            var treshold = this.opts.minDirectionThreshold;
            this.scrollDirection =
                (absX > absY + treshold) ? SCROLL_HORIZONTAL : 
                (absY > absX + treshold) ? SCROLL_VERTICAL :
                null;

            return this.scrollDirection;
        },
        _isOutOfScroll: function (x, y) {
            return this.scrollVertical ? (y > 0 || y < this.maxScrollY) : (x > 0 || x < this.maxScrollX);
        },
        _setNormalizedXY: function (x, y) {
            if (this.scrollVertical) {
                this.x = 0;
                this.y = y;    
            } else {
                this.x = x;
                this.y = 0;
            }
        },
        _move: function (e) {
            if (!this.enabled || (EVENT_TYPE[e.type] !== this._initiated)) {
                return;
            }

            var point     = e.touches ? e.touches[0] : e,
                deltaX    = point.pageX - this.pointX,
                deltaY    = point.pageY - this.pointY,
                timestamp = NOW(),
                newX, newY, absDistX, absDistY;

            if (!this.moved && (deltaX || deltaY)) {
                this.moved = true;
                this._translate(this.x, this.y);
                this._fire('scrollStart', ACTION_GESTURE_START);
                if (!this.opts.useCSSTransition) {
                    this._startMoveRAF();
                }
            }

            this.pointX  = point.pageX;
            this.pointY  = point.pageY;
            this.distX   = this.distX + deltaX;
            this.distY   = this.distY + deltaY;
            absDistX     = Math.abs(this.distX);
            absDistY     = Math.abs(this.distY);
            newX         = this.x + deltaX;
            newY         = this.y + deltaY;

            // If there is minThrehold do not start moving until the distance is over it.
            if (this.opts.minThreshold && (absDistX < this.opts.minThreshold && absDistY < this.opts.minThreshold)) {
                this._fire('scrollMove', ACTION_GESTURE_MOVE, this.x, this.y);
                return;
            }

            // Calculate and expose the gesture direction
            e.scrollDirection = this.scrollDirection || this._getScollDirection(absDistX, absDistY);

            if (this._needsLocking()) {
                this.lockScroller();
            }

            // Reduce scrollability (slowdown) when dragging beyond the scroll limits
            if (this._isOutOfScroll(newX, newY)) {
                newY = this.y + deltaY / 3;
                newX = this.x + deltaX / 3;
            }

            // Scroll one direction at the time (set zero values on the other direction)
            this._setNormalizedXY(newX, newY);

            if (this.opts.useCSSTransition) {
                // update per event basis (non RAF), to avoid small animation gap on touchend
                this._translate(this.x, this.y);
                this._fire('scrollMove', ACTION_GESTURE_MOVE, this.x, this.y);
            }

            // This is to reduce variability and to keep track only on the recent past of the gesture
            if (timestamp - this.startTime > 300) {
                this.startTime = timestamp;
                this.startX = this.x;
                this.startY = this.y;
            }
        },
        _end: function (e) {
            if (!this.enabled || EVENT_TYPE[e.type] !== this._initiated) {
                return;
            }
            //reset move
            this._endMoveRAF();
            this._initiated = false;

            //No movement
            if (!this.moved) {
                //TODO: Tap/Click?
                return;
            }

            var duration = NOW() - this.startTime,
                time     = 0,
                bounce   = EASING.regular,
                momentum;

            this._translate(this.x, this.y);

            //if its outside the boundaries before scrolling, just snap and return
            if (this._resetPosition(this.opts.bounceTime)) {
                return;
            }

            this._isScrolling = true;

            //calculate the destination, speed based of gesture
            if (this.scrollVertical) {
                momentum = this._momentum(this.y, this.startY, duration, this.maxScrollY, this.wrapperHeight);
                this._scrollTo(0, momentum.destination, momentum.time, momentum.bounce);
            } else {
                momentum = this._momentum(this.x, this.startX, duration, this.maxScrollX, this.wrapperWidth);
                this._scrollTo(momentum.destination, 0, momentum.time, momentum.bounce);
            }
        },
        _wheel: function (e) {
            if (!this.enabled) {
                return;
            }
            //stop defaults
            e.preventDefault();
            e.stopPropagation();

            var self                 = this,
                mouseWheelSpeed      = Scroller.MOUSE_WHEEL_SPEED,
                invertWheelDirection = Scroller.MOUSE_WHEEL_INVERTED ? -1 : 1,
                wheelDeltaX, wheelDeltaY,newX, newY;

            // TODO: This code was taken from iScroll, 
            // We may refactor this after testing it in all browsers.

            if ( 'deltaX' in e ) {
                wheelDeltaX = -e.deltaX;
                wheelDeltaY = -e.deltaY;
            } else if ( 'wheelDeltaX' in e ) {
                wheelDeltaX = e.wheelDeltaX / 120 * mouseWheelSpeed;
                wheelDeltaY = e.wheelDeltaY / 120 * mouseWheelSpeed;
            } else if ( 'wheelDelta' in e ) {
                wheelDeltaX = wheelDeltaY = e.wheelDelta / 120 * mouseWheelSpeed;
            } else if ( 'detail' in e ) {
                wheelDeltaX = wheelDeltaY = -e.detail / 3 * mouseWheelSpeed;
            } else {
                return;
            }

            wheelDeltaX *= invertWheelDirection;
            wheelDeltaY *= invertWheelDirection;

            if (!this.scrollVertical) {
                wheelDeltaX = wheelDeltaY;
                wheelDeltaY = 0;
            }

            newX = this.x + Math.round(this.hasScrollX ? wheelDeltaX : 0);
            newY = this.y + Math.round(this.hasScrollY ? wheelDeltaY : 0);

            if ( newX > 0 ) {
                newX = 0;
            } else if ( newX < this.maxScrollX ) {
                newX = this.maxScrollX;
            }

            if ( newY > 0 ) {
                newY = 0;
            } else if ( newY < this.maxScrollY ) {
                newY = this.maxScrollY;
            }

            this.x = newX;
            this.y = newY;

            if (!this._rafWheel) {
                this._rafWheel = RAF(function (t) {
                    self._isScrolling = true;
                    self.distY = wheelDeltaY;
                    self.distX = wheelDeltaX;
                    self._wheelRAF();
                });
            }
    },
    _wheelRAF: function () {
        this._translate(this.x, this.y);
        this._update();
        this._rafWheel    = false;
        self._isScrolling = false;
    },

    /* 
    * ==================================================
    * Scroller Maths and calculation
    * ================================================== 
    */
        _getVelocity: function (current, start, time) {
            var distance = current - start,
                velocity = distance / time;
            return velocity;
        },
        _computeMomentum: function (velocity, current) {
            var acceleration = this.acceleration * (velocity < 0 ?  1 : -1),
                distance     = -(velocity * velocity) / (2 * acceleration),
                time         = -velocity / acceleration;
            return {
                destination : distance + current,
                time        : time
            };
        },
        _computeSnap: function (start, end, velocity, current) {
            var destination = start + (end / 2) * (velocity / 8);
            return {
                destination : destination,
                time        : Math.abs((destination - current) / velocity)
            };

        },
        _momentum: function (current, start, duration, lowerMargin, wrapperSize) {
            var velocity = this._getVelocity(current, start, duration),
                momentum = this._computeMomentum(velocity, current);
            // Beyond the scrollable area (bottom)
            if (momentum.destination < lowerMargin) {
                momentum = this._computeSnap(lowerMargin, wrapperSize, velocity, current);
                momentum.bounce = EASING.bounce;

            // Beyond the scrollable area (top)
            } else if (momentum.destination > 0) {
                momentum = this._computeSnap(0, wrapperSize, velocity, current);
                momentum.bounce = EASING.bounce;
            }

            return momentum;

        },
        _stopMomentum: function () {
            var transform = STYLES.transform,
                style, matrix, x, y;

            if (this.opts.useCSSTransition) {
                if (SUPPORT.matrix) {
                    style  = w.getComputedStyle(this.scroller, null);
                    matrix = new STYLES.matrix(style[transform]);
                    this.scrollerStyle[transform] = '';
                    x = matrix.m41; 
                    y = matrix.m42;
                } else {
                    matrix = matrix[transform].split(')')[0].split(', ');
                    x = +(matrix[12] || matrix[4]);
                    y = +(matrix[13] || matrix[5]);
                } 
                this._translate(x, y);
            } else {
                CAF(this._rafReq); // Cancel Animation Frame
            }
        },
        _customResetPosition: function () {
            return this.opts.pullToRefresh || this.opts.pullToLoadMore;
        },
        _resetPosition: function (time, forceReset) {
            time || (time = 0);

            var x = this.x,
                y = this.y,
                custom;

            if (this._customResetPosition()) {
                if (this.opts.pullToRefresh && this.isTriggeredPTR()) {
                    custom = this.getResetPositionPTR();
                } else if (this.opts.pullToLoadMore && this.isTriggeredPTL()) {
                    custom = this.resetPositionPTL();
                }
            }

            if (custom) {
                y    = custom.y;
                x    = custom.x;
                time = custom.time || time;

            } else {
                // outside boundaries top
                if (!this.hasScrollY || this.y > 0) {
                    y = 0;

                // outside boundaries bottom
                } else if (this.y < this.maxScrollY) {
                    y = this.maxScrollY;
                }

                // outsede left
                if (!this.hasScrollX || this.x > 0 ) {
                    x = 0;

                //outside right
                } else if (this.x < this.maxScrollX) {
                    x = this.maxScrollX;
                }
            } 

            if (y == this.y && x == this.x) {
                return false;
            }

            this._scrollTo(x, y, time, EASING.regular);
            return true;
        },
        _transitionEasing: function (easing) {
            this.scrollerStyle[STYLES.transitionTimingFunction] = easing;
        },
        _transitionTime: function (time) {
                time || (time = 0);
                this.scrollerStyle[STYLES.transitionDuration] = time + 'ms';
        },
        _translate: function (x, y) {
            this.scrollerStyle[STYLES.transform] = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,' + x +',' + y +', 0, 1)';
            this.x = x;
            this.y = y;
        },
        _transitionEnd: function (e) {
            if (this.opts.useCSSTransition && e.target === this.scroller) {
                this._transitionTime();
                if (!this._resetPosition(this.opts.bounceTime)) {
                    this._isScrolling  = false;
                    this._fire('scrollEnd', ACTION_ANIM_END);
                }    
            }
        },
        _animate: function (x, y, duration, easingFn) {
            var self      = this,
                startX    = this.x,
                startY    = this.y,
                startTime = NOW(),
                destTime  = startTime + duration;

            function step () {
                var now = NOW(),
                    newX, newY, easing;

                if (now >= destTime ) {
                    self._isAnimating = false;
                    self._rafReq = null;
                    self._translate(x, y);

                    if (!self._resetPosition(self.opts.bounceTime)) {
                        self._fire('scrollEnd', ACTION_ANIM_END);
                    }
                    return;
                }

                now    = ( now - startTime ) / duration;
                easing = easingFn(now);
                newX   = ( x - startX ) * easing + startX;
                newY   = ( y - startY ) * easing + startY;

                self._translate(newX, newY);
                self._fire('scrollMove', ACTION_ANIM_MOVING, newX, newY);
                self._update();

                if (self._isAnimating) {
                    self._rafReq = RAF(step);
                }
            }
            this._isAnimating = true;
            step();
        },
        _prependData: function (items) {
            var docfrag = w.document.createDocumentFragment(),
                scrollerContainer = this.scroller,
                ptrContainer = scrollerContainer.firstChild;

            items.forEach(function (i) {
                docfrag.appendChild(i);
            });    

            if (scrollerContainer.lastChild === ptrContainer) {
                scrollerContainer.appendChild(docfrag);
            } else {
                scrollerContainer.insertBefore(docfrag, ptrContainer.nextSibling);
            }
        },
        _appendData: function (items) {
            var docfrag           = w.document.createDocumentFragment(),
                scrollerContainer = this.scroller,
                i;

            for (i = 0 ; i < items.length; i++) {
                docfrag.appendChild(items[i]);
            }
            scrollerContainer.appendChild(docfrag);
        },
        _scrollTo: function (x, y, time, easing) {
            easing || (easing = EASING.regular);

            if (!time || this.opts.useCSSTransition) {
                this._transitionEasing(easing.style);
                this._transitionTime(time);
                this._translate(x, y);
                this._update();
                if (!time) {
                    this._isScrolling = false;
                }
            } else {
                this._animate(x, y, time, easing.fn);
            }
        },

        /* ====================== PUBLIC API ====================== */
        on: function (eventType, fn, context) {
            var eventQueue = this._events[eventType] || (this._events[eventType] = []);
            eventQueue.push({
                fn      : fn,
                context : context
            });
        },
        resize: function (e) {
            var self = this;
            RAF(function () {
                // NOTE: Check the translate(0,0), we do it so when we get narrow width, the scroll position may not exist anymore
                // We should be able to calculate the new (x,y) position
                self._translate(0,0);
                self._setSize();    
            });
        },
        refresh: function () {
            var self = this;
            if (!this._rafRefresh) {
                this._rafRefresh = RAF(function () {
                    self._setSize();
                    self._rafRefresh = null;
                });
            }
        },
        plug: function (plugin) {
            var ScrollerPlugin = typeof plugin === "string" ? PLUGINS[plugin] : plugin,
                protoExtension =  ScrollerPlugin.prototype,
                whiteList      = ['init'],
                methodName;
                
            for (methodName in protoExtension) {
                if (whiteList.indexOf(methodName) === -1) {
                    this[methodName] = protoExtension[methodName];
                }
            }

            if (protoExtension.init) {
                protoExtension.init.call(this); 
            }
        },
        scrollTo: function (x, y, time) {
            if (this.x !== x || this.y !== y) {
                this._stopMomentum();

                //emulate gesture
                this.distX = x - this.x;
                this.distY = y - this.y;
                this._isScrolling = true;

                this._scrollTo.apply(this, arguments);
            }
        },
        scrollToTop: function (time, easing) {
            this.scrollTo(0, 0, time, easing);
        },
        scrollToBottom: function (time, easing) {
            var x = this.maxScrollX,
                y = this.maxScrollY;
            if (this.scrollVertical) {
                x = 0;
            } else {
                y = 0;
            }

            this.scrollTo(x, y, time, easing);
        },
        prependItems: function (data) {
            var parsedData = HELPERS.parseDOM(data);
            if (parsedData) {
                this._prependData(parsedData);
                this._setSize();    
            }
        },
        appendItems: function (data) {
            var parsedData = HELPERS.parseDOM(data);
            if (parsedData) {
                this._appendData(parsedData);
                this._setSize();
            }
        },
        destroy: function () {
            this._destroy();
            this._fire('destroy');
        }
    };

    w.Scroller = SCROLLER.constructor = Scroller;

}(window));
},
_initSurfaceManagerPlugin: function () {
    (function (w) {        
    "use strict";

    var SCROLLER = w.__S || (w.__S = {}), //NAMESPACE
        PLUGINS  = SCROLLER.plugins || (SCROLLER.plugins = {}),
        STYLES   = SCROLLER.styles,
        HELPERS  = SCROLLER.helpers,
        RAF      = w.requestAnimationFrame,
        INITIAL_SURFACES = 10;
    
    function SurfaceManager() {}

    SurfaceManager.prototype = {
        /* Bootstrap function */
        init: function () {
            this.surfacesPositioned = [];
            this.surfacesPool       = [];
            this.items              = [];

            this.on('_initialize', this._initializeSurfaceManager);
            this.on('_update', this._updateSurfaceManager);
            this.on('destroy', this._destroySurfaceManager);
        },
        _initializeSurfaceManager: function () {
            this._bootstrapItems();
            this._initializeSurfaces();
            this._setActiveOffset();
            this._initializePositions();
            this._setInfiniteScrollerSize();
        },
        _destroySurfaceManager: function () {
            var docfrag = w.document.createDocumentFragment();

            this.items.forEach(function (i) {docfrag.appendChild(i.dom);});
            this.scroller.innerHTML = '';
            this.scroller.appendChild(docfrag);

            this.items              = [];
            this.surfacesPool       = [];
            this.surfacesPositioned = [];
        },
        _bootstrapItems: function () {
            var skipPtr  = this.opts.pullToRefresh ? 1 : 0,
                domItems = Array.prototype.slice.call(this.scroller.children, skipPtr),
                size     = domItems.length,
                items    = [],
                item, itemStyle, i;

            if (size) {
                for (i = 0; i < size; i++) {
                    item = domItems[i];
                    items[i] = {dom : item};
                    this.scroller.removeChild(item);
                }
            }

            this.items = items;
        },
        _setActiveOffset: function () {
              this.activeOffset = 0.9 * (this.scrollVertical ? this.wrapperHeight: this.wrapperWidth);
        },
        _initializePositions: function () {
            var items         = this.items,
                windowSize    = this.scrollVertical ? this.wrapperHeight : this.wrapperWidth,
                positioned    = this.surfacesPositioned,
                itemsSize     = items.length,
                sizeNotCover  = true,
                sizeNeeded    = windowSize + 2 * this.activeOffset,
                heightSum     = 0,
                i = 0,
                item, surface, height;

            for (; i < itemsSize && sizeNotCover; i++) {
                item          = items[i];
                surface       = this._getAvailableSurface();
                heightSum     += this._attachItemInSurface(item, surface, {index: i, offset: heightSum});
                sizeNotCover  = heightSum < sizeNeeded;
                positioned[i] = surface;
            }
        },
        
        _createSurfaceDOM: function (options, domContent) {
            options || (options = {});

            var rawSurface   = w.document.createElement('div'),
                surfaceStyle = rawSurface.style;

            rawSurface.className = options['class'] ? 'surface ' + options['class'] : 'surface';
            surfaceStyle.height  = options.height && options.height + 'px';
            surfaceStyle.width   = options.width && options.width + 'px';
            surfaceStyle[STYLES.transform] = 'scale3d(0.0001, 0.0001, 1)';

            if (domContent) {
                rawSurface.appendChild(domContent);
            }

            return rawSurface;
        },
        
        _createSurface: function (options, domContent) {
            options || (options = {});

            var surfaceDOM = this._createSurfaceDOM(options, domContent);

            return {
                dom          : surfaceDOM,
                contentIndex : options.index,
                content      : domContent,
                state        : 0,
                offset       : 0,
                width        : 0,
                height       : 0
            };
        },
        _createSurfaces : function (size, options) {
            options || (options = {}); 

            var surfaces = [], i;

            for ( i = 0; i < size; i++) {
                surfaces.push(this._createSurface(options));
            }

            return surfaces;
        },
        _getSurfaceTotalOffset: function (surface) {
            return surface.offset + (this.scrollVertical ? surface.height : surface.width);
        },
        _attachItemInSurface: function (item, surface, config) {
            var offset = config.offset,
                index  = config.index,
                width, height, offsetX = 0, offsetY = 0;

            // recalc styles
            surface.dom.appendChild(item.dom); 

            // this will force a layout
            height = surface.dom.offsetHeight; 
            width  = surface.dom.offsetWidth; 

            if (this.scrollVertical) {
                offsetY = config.preCalculateSize ?  offset - height : offset;
            } else {
                offsetX = config.preCalculateSize ?  offset - width : offset;
            }
            
            surface.dom.style[STYLES.transform] = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,' + offsetX +',' + offsetY +', 0, 1)';

            surface.state       = 1;
            surface.contentIndex = index;
            surface.content      = item;
            surface.height       = height;
            surface.width        = width;
            surface.offset       = offsetY || offsetX;

            return this.scrollVertical ? height : width;
        },
        _dettachItemInSurface: function (surface) {
            surface.state        = 0;
            surface.contentIndex = null;
            surface.content      = null;
            surface.height       = null;
            surface.width        = null;
            surface.offset       = null;
            
            surface.dom.removeChild(surface.dom.firstChild);
            
        },
        _attachSurfaces: function (surfaces) {
            var docfrag = w.document.createDocumentFragment(),
                surface, i;

            for (i = 0 ; i < surfaces.length; i++) {
                surface = surfaces[i];
                docfrag.appendChild(surface.dom);
                this.surfacesPool.push(surface);
            }

            this.scroller.appendChild(docfrag);
        },
        _getAvailableSurface: function () {
            var pool = this.surfacesPool,
                surfaces, surface;

            for (var i = 0; i < pool.length; i++) {
                surface = pool[i];
                if (!surface.state) {
                    return surface;
                }
            }

            // if we arrive here no surface available
            surfaces = this._createSurfaces(1);
            this._attachSurfaces(surfaces);

            // call again with the new surfaces
            return this._getAvailableSurface();

        },
        _emptyScroller: function () {
            return !(this.opts.pullToLoadMore ? this.items.length - 1 : this.items.length);
        },
        _initializeSurfaces: function () {
            var items       = this.items,
                numSurfaces = Math.min(INITIAL_SURFACES, items.length),
                surfaces    = this._createSurfaces(numSurfaces);

            this._attachSurfaces(surfaces);
        },
        _resetSurfaces: function () {
            var surfaces      = this.surfacesPositioned,
                surfacesCount = surfaces.length,
                surface;

            for (var i = 0; i < surfacesCount; i++) {
                surface = surfaces.shift();
                this._dettachItemInSurface(surface);
            }
        },
        _mod: function (index) {
            return index;
        },
        _positionBeingUsed: function (index) {
            var topSurface       = this._positionedSurfacesFirst(),
                bottomSurface    = this._positionedSurfacesLast();

            return index === topSurface.contentIndex || index === bottomSurface.contentIndex;
        },
        _positionedSurfacesFirst: function () {
            return this.surfacesPositioned[0];
        },
        _positionedSurfacesLast: function () {
            var p = this.surfacesPositioned;
            return p[p.length - 1];
        },
        _positionedSurfacesPush: function () {
            var bottomSurface    = this._positionedSurfacesLast(),
                bottomSurfaceEnd = this._getSurfaceTotalOffset(bottomSurface),
                index            = this._mod(bottomSurface.contentIndex + 1),
                payload          = {index: index, offset: bottomSurfaceEnd},
                surface;

                if (!this._positionBeingUsed(index)) {
                    surface = this._getAvailableSurface();
                    this._attachItemInSurface(this.items[index], surface, payload);
                    this.surfacesPositioned.push(surface);
                    w.DEBUG.log('PUSH   ', Date.now());
                    return surface;

                } else {
                    return bottomSurface;
                }
        },
        _positionedSurfacesPop: function () {
            w.DEBUG.log('POP    ', Date.now());
            var surface = this.surfacesPositioned.pop();
            this._dettachItemInSurface(surface);
            return this._positionedSurfacesLast();
        },
        _positionedSurfacesUnshift: function () {
            var topSurface = this._positionedSurfacesFirst(),
                index      = this._mod(topSurface.contentIndex - 1),
                payload    = {index: index, offset: topSurface.offset, preCalculateSize: true},
                surface;

            if (!this._positionBeingUsed(index)) {
                surface = this._getAvailableSurface();
                this._attachItemInSurface(this.items[index], surface, payload);
                this.surfacesPositioned.unshift(surface);
                w.DEBUG.log('UNSHIFT', Date.now());
                return surface;
            } else {
                return topSurface;    
            }
        },
        _positionedSurfacesShift: function () {
            w.DEBUG.log('SHIFT  ', Date.now());
            var surface = this.surfacesPositioned.shift();
            this._dettachItemInSurface(surface);
            return this._positionedSurfacesFirst();
        },
        _itemsLeft: function (end) {
            var firstIndex = this._positionedSurfacesFirst().contentIndex,
                lastIndex  = this._positionedSurfacesLast().contentIndex,
                count      = this.items.length - 1,
                left;

            left = end === 'top' ? firstIndex > 0 
                 : end === 'bottom' ? lastIndex < count 
                 : firstIndex > 0 || lastIndex < count;

            //DEBUG.log(firstIndex, lastIndex, this.items.length, end ,'>>>' , left);

            return left;
        },
        _getBoundaries: function (coord, size) {
            var offsetSize       = this.activeOffset,
                abs             = Math.abs(coord);

            return {
                top    : abs - offsetSize > 0 ? abs - offsetSize : 0,
                bottom : abs + size + offsetSize
            };
        },
        _updateAllowed: function (current) {
            return current.pos < 0 && ((this._isScrolling || Math.abs(current.dist) > 10));
        },
        _recycleSurface: function (side) {
            return true;
        },
        _getPosition: function (vertical) {
            if (this.scrollVertical) {
                return {
                    pos  : this.y,
                    dist : this.distY,
                    size : this.wrapperHeight,
                    maxScroll : this.maxScrollY
                };
            } else {
                return {
                    pos  : this.x,
                    dist : this.distX,
                    size : this.wrapperWidth,
                    maxScroll : this.maxScrollX
                };
            }
        },
        _updateSurfaceManager: function () {
            if (this._emptyScroller()) return;

            var self             = this,
                current          = this._getPosition(),
                boundaries       = this._getBoundaries(current.pos, current.size),
                itemsLeft        = this._itemsLeft('bottom'),
                // surfaces
                topSurface       = this._positionedSurfacesFirst(),
                topSurfaceEnd    = this._getSurfaceTotalOffset(topSurface),
                bottomSurface    = this._positionedSurfacesLast(),
                bottomSurfaceEnd = bottomSurface.offset,
                // vars
                yieldTask        = false,
                inUse            = false,
                surface, index, payload;

            // Don't update anything is the move gesture is not large enough and we are not scrolling
            if (!this._updateAllowed(current)) {
                return;
            }

            // IF we are in the middle of an animation (_isScrolling: true), 
            // AND there is no more items to swap
            // AND the scroll position is beyond the scrollable area (+ 1/4 of the size)
            // THEN: RESET POSITION
            if (this._isScrolling && !itemsLeft && current.pos < (current.maxScroll - (current.size / 4))) {
                this._isAnimating  = false;
                this._isScrolling  = false;
                this._stopMomentum();
                RAF(function () {
                    self._resetPosition(self.opts.bounceTime);
                });
            }
            // Scrolling down
            if (current.dist < 0) {
                // PUSH | Add elements to the end when the last surface is inside the lowerBound limit.
                while (this._itemsLeft('bottom') && bottomSurfaceEnd < boundaries.bottom && !inUse) {
                    surface = this._positionedSurfacesPush();
                    if (surface === bottomSurface) {
                        inUse = true;
                    } else {
                        bottomSurface    = surface;
                        bottomSurfaceEnd = bottomSurface.offset;
                        yieldTask        = true;    
                    }
                }
                
                if (yieldTask) return this._setInfiniteScrollerSize();

                // SHIFT | Remove elements from the top that are out of the upperBound region.
                while (boundaries.top > topSurfaceEnd && this._recycleSurface('top')) {
                    topSurface    = this._positionedSurfacesShift();
                    topSurfaceEnd = this._getSurfaceTotalOffset(topSurface);
                    yieldTask     = true;
                }

            // User is Scrolling up
            } else {
                // UNSHIFT | Add elements on the beggining of the slist
                while (topSurface.offset > boundaries.top && !inUse) {
                    surface = this._positionedSurfacesUnshift();
                    if (surface === topSurface) {
                        inUse = true;
                    } else {
                        topSurface    = surface;
                        topSurfaceEnd = this._getSurfaceTotalOffset(topSurface);
                        yieldTask     = true;
                    }
                }
                
                if (yieldTask) return this._setInfiniteScrollerSize();

                // POP | Remove from the end
                while (bottomSurfaceEnd > boundaries.bottom && this._itemsLeft('top') && this._recycleSurface('bottom')) {
                    bottomSurface = this._positionedSurfacesPop();
                    bottomSurfaceEnd = bottomSurface.offset;
                    yieldTask        = true;
                }
            }

            if (yieldTask) return this._setInfiniteScrollerSize();
        },
        _setInfiniteScrollerSize: function () {
            var positioned = this.surfacesPositioned,
                items      = this.items,
                size       = this.scrollVertical ? this.wrapperHeight : this.wrapperWidth,
                ptlEnabled = this.opts.pullToLoadMore && this._ptlIsEnabled(),
                lastPos    = ptlEnabled ? positioned.length - 3 : positioned.length - 1,
                last       = positioned[lastPos],
                itemsSize  = this.opts.pullToLoadMore ? items.length - 1 : items.length,
                itemsLeft, offset, ptrSize;

            if (positioned.length <= 0) {
                return;
            }

            itemsLeft = last.contentIndex < itemsSize - (ptlEnabled ? 2 : 1);
            offset    = last.offset + (this.scrollVertical ? last.height : last.width);

            if (this.scrollVertical) {
                this.maxScrollY = itemsLeft ? Number.NEGATIVE_INFINITY : size - offset;
                this.maxScrollY = this.maxScrollY > 0 ? 0 : this.maxScrollY;
            } else {
                this.maxScrollX = itemsLeft ? Number.NEGATIVE_INFINITY : size - offset;
                this.maxScrollX = this.maxScrollX > 0 ? 0 : this.maxScrollX;
            }

            this.hasScrollY = this.maxScrollY < 0;
            this.hasScrollX = this.maxScrollX < 0;

            if (ptlEnabled) {
                this._setInfinitePullToShowMoreSpacer(offset);
            }
        },
         _setInfinitePullToShowMoreSpacer: function (bottomOffset) {
            if (this.ptlSpacerSize <= 0) {
                return;
            }
            var diff        = this.wrapperHeight - bottomOffset,
                spaceBottom = diff > 0,
                positioned  = this.surfacesPositioned,
                last        = positioned[positioned.length -1],
                surface     = last && last.dom;

            this.ptlSpacerSize = spaceBottom ? diff : 0;
            this.ptlSpacer.style.height = this.ptlSpacerSize + 'px';

            if (surface) {
                diff = spaceBottom ? this.wrapperHeight : bottomOffset;
                surface.style[STYLES.transform] = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,' + diff + ', 0, 1)';
            }
        },
        _appendPullToLoad: function () {
            var ptr_container = this._createPullToLoadMarkup();
            this.items.push({ptl: true, dom: ptr_container});

            this.ptlDOM  = ptr_container;
            this.ptlIcon = ptr_container.firstChild;

            this._ptlSnapTime = 200; 
            this._ptlEnabled  = true;

            if (this.maxScrollY >= 0) {
                this._ptlToggle('disable');
            }
        },
        resize: function () {
            var self = this;
            this._stopMomentum();
            RAF(function (t) {
                self._setWrapperSize();
                self.refresh();
                self._scrollTo(0, 0);
            });
        },
        refresh: function () {
            this._resetSurfaces();
            this._initializePositions();
            this._setInfiniteScrollerSize();
        },
        _prependData: function (data) {
            var item, i;
            for (i = 0; i < data.length; i++) {
                item = {dom: data[i]};
                this.items.unshift(item);
            }
        },
        _appendData: function (data) {
            var ptl, item, i, spacer;

            //remove pulltoLoadMoreSurface
            if (this.opts.pullToLoadMore) {
                ptl    = this.items.pop();
                this._positionedSurfacesPop();
                spacer = this.items.pop();
                this._positionedSurfacesPop();
            }

            for (i = 0; i < data.length; i++) {
                item = {dom: data[i]};
                this.items.push(item);
            }

            if (this.opts.pullToLoadMore) {
                //add the back as the last item again
                this.items.push(spacer);
                this.items.push(ptl);
            }
        },
        prependItems: function (items) {
            var parsedData = HELPERS.parseDOM(items);
            if (parsedData) {
                this._prependData(parsedData);
                this.refresh();    
            }
        },
        appendItems: function (items) {
            var parsedData = HELPERS.parseDOM(items);
            if (parsedData) {
                this._appendData(parsedData);
                this._updateSurfaceManager();
            }
        },
    };   

    SCROLLER.SurfaceManager = PLUGINS.SurfaceManager = SurfaceManager;
    
}(window));
},
_initIndicatorsPlugin: function () {
    (function (w) {        

    var SCROLLER = w.__S || (w.__S = {}), //NAMESPACE
        NOW      = Date.now || function () { return new Date().getTime(); },
        RAF      = w.requestAnimationFrame,
        STYLES   = SCROLLER.styles,
        HELPERS  = SCROLLER.helpers,
        PLUGINS  = SCROLLER.plugins || (SCROLLER.plugins = {}),

        DEFAULTS_INDICATOR = {
            interactive : false,
            resize      : true,
            snap        : true
        },

        DEFAULT_STYLE_SCROLLBAR = [
            'position:absolute',
            'z-index:9999'
        ].join(';'),

        DEFAULT_STYLE_INDICATOR = [
            '-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box',
            'position:absolute',
            'background:rgba(0,0,0,0.5)',
            'border:1px solid rgba(255,255,255,0.9)',
            'border-radius:3px'
        ].join(';'),

        DEFAULT_STYLE_VERTICAL_SB = [
            '',
            'height:7px',
            'left:2px',
            'right:2px',
            'bottom:0'
        ].join(';'),
        DEFAULT_STYLE_HORIZONTAL_SB = [
            '',
            'width:7px',
            'bottom:2px',
            'top:2px',
            'right:1px'
        ].join(';'),

        FULL_INDICATOR_RATIO = -0.1;

    function Indicator (scroller, options) {
        this.wrapper        = typeof options.el === 'string' ? document.querySelector(options.el) : options.el;
        this.indicator      = this.wrapper.children[0];
        this.indicatorStyle = this.indicator.style;
        this.scroller       = scroller;
        this.opts           = HELPERS.simpleMerge(DEFAULTS_INDICATOR, options);
        this.scrollVertical = scroller.scrollVertical;

        this.sizeRatioX   = 1;
        this.sizeRatioY   = 1;
        this.maxPosX      = 0;
        this.maxPosY      = 0;
        this.virtualSizeX = 1;
        this.virtualSizeY = 1;

        if (this.opts.interactive) {
            if (!this.opts.disableTouch) {
                HELPERS.bind(this.indicator, 'touchstart', this);
                HELPERS.bind(window, 'touchend', this);
            }
            if (!this.opts.disablePointer) {
                HELPERS.bind(this.indicator, 'MSPointerDown', this);
                HELPERS.bind(window, 'MSPointerUp', this);
            }
            if (!this.opts.disableMouse) {
                HELPERS.bind(this.indicator, 'mousedown', this);
                HELPERS.bind(window, 'mouseup', this);
            }
        }
    }

    Indicator.prototype = {
        handleEvent: function (e) {
            switch ( e.type ) {
                case 'touchstart':
                case 'MSPointerDown':
                case 'mousedown':
                    this._start(e);
                    break;
                case 'touchmove':
                case 'MSPointerMove':
                case 'mousemove':
                    this._move(e);
                    break;
                case 'touchend':
                case 'MSPointerUp':
                case 'mouseup':
                case 'touchcancel':
                case 'MSPointerCancel':
                case 'mousecancel':
                    this._end(e);
                    break;
            }
        },

        destroy: function () {
            if ( this.opts.interactive ) {
                HELPERS.unbind(this.indicator, 'touchstart', this);
                HELPERS.unbind(this.indicator, 'MSPointerDown', this);
                HELPERS.unbind(this.indicator, 'mousedown', this);

                HELPERS.unbind(window, 'touchmove', this);
                HELPERS.unbind(window, 'MSPointerMove', this);
                HELPERS.unbind(window, 'mousemove', this);

                HELPERS.unbind(window, 'touchend', this);
                HELPERS.unbind(window, 'MSPointerUp', this);
                HELPERS.unbind(window, 'mouseup', this);
            }
        },

        _start: function (e) {
            var point = e.touches ? e.touches[0] : e;

            e.preventDefault();
            e.stopPropagation();

            this.transitionTime(0);

            this.initiated  = true;
            this.moved      = false;
            this.lastPointX = point.pageX;
            this.lastPointY = point.pageY;
            this.startTime  = NOW();

            if (!this.opts.disableTouch) {
                HELPERS.bind(window, 'touchmove', this);
            }
            if (!this.opts.disablePointer) {
                HELPERS.bind(window, 'MSPointerMove', this);
            }
            if ( !this.opts.disableMouse ) {
                HELPERS.bind(window, 'mousemove', this);
            }
        },

        _move: function (e) {
            var point     = e.touches ? e.touches[0] : e,
                timestamp = NOW(),
                deltaX, deltaY, newX, newY;

            e.preventDefault();
            e.stopPropagation();

            this.moved = true;

            deltaX = point.pageX - this.lastPointX;
            deltaY = point.pageY - this.lastPointY;

            this.lastPointX = point.pageX;
            this.lastPointY = point.pageY;

            newX = this.x + deltaX;
            newY = this.y + deltaY;

            this._pos(newX, newY);

            this.x = newX;
            this.y = newY;
        },

        _end: function (e) {
            if (!this.initiated) {
                return;
            }

            this.initiated = false;

            e.preventDefault();
            e.stopPropagation();

            HELPERS.unbind(window, 'touchmove', this);
            HELPERS.unbind(window, 'MSPointerMove', this);
            HELPERS.unbind(window, 'mousemove', this);
        },
        _pos: function (x, y) {
            var self = this;

            if ( x < 0 ) {
                x = 0;
            } else if ( x > this.maxPosX ) {
                x = this.maxPosX;
            }

            if ( y < 0 ) {
                y = 0;
            } else if ( y > this.maxPosY ) {
                y = this.maxPosY;
            }

            x = !this.scrollVertical ? Math.round(x / this.sizeRatioX) : this.scroller.x;
            y = this.scrollVertical  ? Math.round(y / this.sizeRatioY) : this.scroller.y;

            if (!this._rafPos) {
                this._rafPos = RAF(function (t) {
                    self._posRAF(x, y);
                });
            }
        },
        _posRAF: function (x, y) {
            this.scroller.scrollTo(x, y);
            this._rafPos = false;
        },

        transitionTime: function (time) {
            time = time || 0;
            this.indicatorStyle[STYLES.transitionDuration] = time + 'ms';
        },

        transitionEasing: function (easing) {
            this.indicatorStyle[STYLES.transitionTimingFunction] = easing;
        },
        getCurrentSizes: function () {
            if (this.scrollVertical) {
                return {
                    virtual     : this.virtualSizeY,
                    wrapperSize : this.wrapperHeight,
                    maxScroll   : this.scroller.maxScrollY
                };
            } else {
                return {
                    virtual     : this.virtualSizeX,
                    wrapperSize : this.wrapperWidth,
                    maxScroll   : this.scroller.maxScrollX
                };
            }
        },
        getVirtualScrollSize: function () {
            var s = this.getCurrentSizes();
            if (s.virtual < s.wrapperSize) {
                return Math.abs(s.maxScroll) || s.wrapperSize;
            } else {
                return s.virtual;
            }
        },
        getVirtualMaxSize: function (scrollSize) {
            var s = this.getCurrentSizes();
                return s.maxScroll === -Infinity ? -scrollSize :
                (s.virtual ? s.wrapperSize - scrollSize : s.maxScroll);
        },
        refresh: function () {
            this.transitionTime(0);

            var scroller      = this.scroller,
                wHeight       = this.wrapperHeight = this.wrapper.offsetHeight, // possible relayout
                wWidth        = this.wrapperWidth  = this.wrapper.offsetWidth,
                size          = this.scrollVertical ? wHeight : wWidth,
                scrollSize    = Math.max(this.getVirtualScrollSize(), size),
                maxScroll     = this.getVirtualMaxSize(scrollSize),
                indicatorSize = Math.max(Math.round(size * size / scrollSize), 8);

           if (this.scrollVertical) {
                if (this.opts.resize) {
                    this.indicatorHeight       = indicatorSize;
                    this.indicatorStyle.height = this.indicatorHeight + 'px';    
                } else {
                    this.indicatorHeight = this.indicator.offsetHeight;
                }
                
                this.maxPosY               = size - this.indicatorHeight;
                this.minBoundaryY          = 0; 
                this.maxBoundaryY          = this.maxPosY;
                this.sizeRatioY            = this.maxPosY / maxScroll || FULL_INDICATOR_RATIO;
                this.height                = this.indicatorHeight;
            } else {
                if (this.opts.resize) {
                    this.indicatorWidth       = indicatorSize;
                    this.indicatorStyle.width = this.indicatorWidth + 'px';    
                } else {
                    this.indicatorWidth = this.indicator.offsetWidth;
                }
                this.maxPosX               = size - this.indicatorWidth;
                this.minBoundaryX          = 0; 
                this.maxBoundaryX          = this.maxPosX;
                this.sizeRatioX            = this.maxPosX / maxScroll || FULL_INDICATOR_RATIO;
                this.width                 = this.indicatorWidth;
            }

            this.updatePosition();
        },

        _updatePositionAbstractProperties: function (x, y) {
            if (this.scrollVertical) {
                return {
                    posRatio      : y,
                    indicatorSize : this.indicatorHeight,
                    size          : this.height,
                    minBoundary   : this.minBoundaryY,
                    maxBoundary   : this.maxBoundaryY,
                    maxPos        : this.maxPosY 
                };
            } else {
                return {
                    posRatio      : x,
                    indicatorSize : this.indicatorWidth,
                    size          : this.width,
                    minBoundary   : this.minBoundaryX,
                    maxBoundary   : this.maxBoundaryX,
                    maxPos        : this.maxPosX 
                };
            }
        },
        updatePosition: function () {
            var x      = this.sizeRatioX * this.scroller.x,
                y      = this.sizeRatioY * this.scroller.y,
                s      = this._updatePositionAbstractProperties(x, y),
                pos    = s.posRatio,
                scaleX = 1,
                scaleY = 1,
                scale,
                tmpSize;

            if (pos < s.minBoundary) {
                tmpSize = this.opts.snap ? Math.max(s.indicatorSize + s.posRatio * 3, 8) : s.indicatorSize;
                scale   = tmpSize / s.size;
                pos     = s.minBoundary - ((s.size - tmpSize) / 2);

            } else if (pos > s.maxBoundary) {
                tmpSize = this.opts.snap ? Math.max(s.indicatorSize - (s.posRatio - s.maxPos) * 3, 8): s.indicatorSize;
                scale   = tmpSize / s.size;
                pos     = s.maxPos + ((s.size - tmpSize) / 2);
            }

            if (scale) {
                if (this.scrollVertical) {
                    scaleY = scale; y = pos;   
                } else {
                    scaleX = scale; x = pos;
                }
            } 

            this.x = x;
            this.y = y;

            this.indicatorStyle[STYLES.transform] = 'matrix3d(' + scaleX +',0,0,0,0,' + scaleY + ',0,0,0,0,1,0,' + x +',' + y +', 0, 1)';
        }
    };


    /*
    * ==================================
    * INDICATORS MANAGER CLASS
    * ==================================
    */
    function Indicators () {}

    Indicators.prototype = {
        init: function () {
            this._indicators = [];
            this._virtualScroll = 0;

            this.on('_initialize', this._initializeIndicators);
            this.on('_update', this._updateIndicators);

            this._hook('after', '_transitionTime', this._transitionTimeIndicators);
            this._hook('after', '_transitionEasing', this._transitionEasingIndicators);
            this._hook('after', '_translate', this._updateIndicators);
            this._hook('after', '_setInfiniteScrollerSize', this._setVirtualScrollSize);
        },
        _initializeIndicators: function () {
            var self = this;
            if (this.opts.scrollbars) {
                this._createDefaultScrollbars(this.opts.scrollbars);
            }
            if (this.opts.indicators) {
                this.opts.indicators.forEach(function (i) {self.addIndicator(i.el, i.config)});
            }

            this._initVirtualScrollSize();                
        },
        _initVirtualScrollSize: function () {
            var hasScroll     = this.scrollVertical ? this.hasScrollY : this.hasScrollX,
                virtualSize   = this.scrollVertical ? 'virtualSizeY'  : 'virtualSizeX',
                virtualScroll = hasScroll ? this._virtualScroll : 0;

            this._indicators.forEach(function (i) {
                i[virtualSize] = virtualScroll;
                i.refresh();
            });
        },
        _setVirtualScrollSize: function () {
            var last          = this._positionedSurfacesLast(),
                virtualScroll = last.offset + (this.scrollVertical ? last.height : last.width),
                virtualSize   = this.scrollVertical ? 'virtualSizeY' : 'virtualSizeX';

            if (virtualScroll > this._virtualScroll) {
                this._virtualScroll = virtualScroll;
                this._indicators.forEach(function (i){
                    i[virtualSize] = virtualScroll;
                    i.refresh();
                });
            }
        },
        _updateIndicators: function () {
            this._indicators.forEach(function (i) {i.updatePosition();});
         },
         _transitionTimeIndicators: function (time) {
            time || (time = 0);
            this._indicators.forEach(function (i) {i.transitionTime(time);});
         },
         _transitionEasingIndicators: function (easing) {
            this._indicators.forEach(function (i) {i.transitionEasing(easing);});
         },
        _createDefaultScrollbars: function (config) {
            var interactive = true,  // TODO:
                customStyle = false, // Move those two as params
                scrollbar   = this._createDefaultScrollbar(this.scrollVertical, interactive, customStyle);
            this.wrapper.appendChild(scrollbar);
            
            this._indicators.push(new Indicator(this, {
                el          : scrollbar,
                interactive : interactive,
            }));
        },
        _createDefaultScrollbar: function (vertical, interactive, customStyle) {
            var scrollbar            = w.document.createElement('div'),
                indicator            = w.document.createElement('div'),
                inlineStyleScrollbar = DEFAULT_STYLE_SCROLLBAR,
                inlineStyleIndicator = DEFAULT_STYLE_INDICATOR;

            indicator.className     = 'scrollbar';
            indicator.style.cssText = inlineStyleIndicator;

            if (!vertical) {
                if (!customStyle) {
                    scrollbar.style.cssText += inlineStyleScrollbar + DEFAULT_STYLE_VERTICAL_SB;
                    indicator.style.height   = '100%';
                }
                scrollbar.className = 'scrollbar-horizontal';
            } else {
                if (!customStyle) {
                    scrollbar.style.cssText += inlineStyleScrollbar + DEFAULT_STYLE_HORIZONTAL_SB;
                    indicator.style.width    = '100%';
                }
                scrollbar.className = 'scrollbar-vertical';
            }

            if (!interactive) {
                scrollbar.style.pointerEvents = 'none';
            }

            scrollbar.appendChild(indicator);
            return scrollbar;
        },
        /* PLUBLIC API*/
        addIndicator: function (el, cfg) {
            cfg || (cfg = {});
            cfg.el = el;
            var indicator = new Indicator(this, cfg);

            this._indicators.push(indicator);
            indicator.refresh();
        }
    };
    
    Indicators.Indicator = Indicator;
    PLUGINS.Indicators   = Indicators;

}(window)); 
},
_initPullToRefreshPlugin: function () {
    (function (w) {        
    // NAMESPACES
    var SCROLLER = w.__S || (w.__S = {}), 
        RAF      = w.requestAnimationFrame,
        PLUGINS  = SCROLLER.plugins || (SCROLLER.plugins = {}),

        CONFIG_DEFAULTS = {
            labelPull     : 'Pull down to refresh...',
            labelRelease  : 'Release to refresh...',
            labelUpdate   : 'Loading...',
            labelSubtitle : '',
            labelError    : 'Error on pull to refresh'
        },
        PULL_TO_SNAP_TIME  = 200,
        ERROR_TIMEOUT      = 1000,
        CLASS_UPDATE_STATE = 'update',
        CLASS_PULL_STATE   = 'pull',
        CLASS_ICON         = 'icon',
        CLASS_ERROR        = 'error',
        CLASS_LABEL        = 'label',
        CLASS_SUBTITLE     = 'sub',
        CLASS_PTR          = 'pullToRefresh';
    
    function PullToRefresh() {}

    PullToRefresh.prototype = {
        init: function () {
            this._mergePullToRefreshConfig();
            this.on('_initialize', this._appendPullToRefresh);
            this.on('scrollMove', this._onScrollMovePTR);
            this.on('_customResetPosition', this._onResetPositionPTR);
        },
        _mergePullToRefreshConfig: function () {
            this.opts.pullToRefreshConfig = this._mergeConfigOptions(CONFIG_DEFAULTS, this.opts.pullToRefreshConfig);
        },
        _createPullToRefreshMarkup: function () {
            var ptr_container = w.document.createElement('div'),
                pullLabel     = this.opts.pullToRefreshConfig.labelPull,
                subtitleLabel = this.opts.pullToRefreshConfig.labelSubtitle;

            ptr_container.innerHTML = [
                '<span class="' + CLASS_ICON + '"></span>',
                '<span class="' + CLASS_LABEL + '">' + pullLabel + '</span>',
                '<span class="' + CLASS_SUBTITLE + '">' + subtitleLabel + '</span>'
                ].join('');

            ptr_container.className = 'pullToRefresh';

            return ptr_container;
        },
         _appendPullToRefresh: function () {
            var ptr_container = this._createPullToRefreshMarkup();
            if (this.scroller.firstChild) {
                this.scroller.insertBefore(ptr_container, this.scroller.firstChild);
            } else {
                this.scroller.appendChild(ptr_container);
            }

            this.ptrDOM   = ptr_container;
            this.ptrIcon  = ptr_container.getElementsByClassName(CLASS_ICON)[0];
            this.ptrLabel = ptr_container.getElementsByClassName(CLASS_LABEL)[0];

            this._ptrThreshold  = ptr_container.offsetHeight; //relayout
            this._ptrSnapTime   = PULL_TO_SNAP_TIME;

            this.togglePullToRefresh(this.opts.pullToRefresh, true);
        },
        _onResetPositionPTR: function (time) {
            if (this._ptrTriggered) {
                var y    = this._getPTRSize();

                time = time || this._getPTRSnapTime();
                this._scrollTo(0, y, time);
            } else {
                this._resetPosition(time, true);
            }
        },
        _setPTRLoadingState: function (enable) {
            if (enable) {
                this.ptrDOM.classList.add(CLASS_UPDATE_STATE);
                this.ptrLabel.textContent = this.opts.pullToRefreshConfig.labelUpdate;
                this._ptrLoading          = true;
            } else {
                this.ptrDOM.classList.remove(CLASS_UPDATE_STATE);
                this.ptrDOM.classList.remove(CLASS_PULL_STATE);
                this.ptrLabel.textContent = this.opts.pullToRefreshConfig.labelPull;
                this._ptrLoading = false;
            }
        },
        _setPullState: function (enable) {
            if (enable) {
                this.ptrDOM.classList.add(CLASS_PULL_STATE);
                this.ptrLabel.textContent = this.opts.pullToRefreshConfig.labelRelease;
                this._ptrTriggered = true;    
            } else {
                this.ptrDOM.classList.remove(CLASS_PULL_STATE);
                this.ptrLabel.textContent = this.opts.pullToRefreshConfig.labelPull;
                this._ptrTriggered = false;
            }
        },
        _setPTRErrorState: function (error) {
            var labelError = this.opts.pullToRefreshConfig.labelError;
            // error == false remove error state
            if (typeof error === 'boolean' && !error) {
                this.ptrDOM.classList.remove(CLASS_ERROR);
                this._setPullState(false);
            } else {
                this._setPTRLoadingState(false);
                this.ptrDOM.classList.add(CLASS_ERROR);
                this.ptrLabel.textContent = error.labelError || labelError;
            }
        },
        _onScrollMovePTR: function (action, x, y) {
            if (action === 'gestureMove' && y > 0) {
                this._needsPullToRefresh(y);
            }
        },
         _needsPullToRefresh: function (ypos) {
            if (this._ptrTriggered && ypos < this._ptrThreshold) {
                this._setPullState(false);
            } else if (!this._ptrTriggered && ypos > this._ptrThreshold) {
                this._setPullState(true);
            }
        },
        _ptrToggle: function (action, force) {
            var ptr = this.ptrDOM;

            if (!ptr) return;

            if (action === 'disable' && (this.opts.pullToRefresh || force)) {
                ptr.style.display = 'none';
                this._ptrThreshold = 0;
                this.opts.pullToRefresh = false;

            } else if (action === 'enable' && (!this.opts.pullToRefresh || force)) {
                ptr.style.display = ''; 
                this._ptrThreshold = ptr.offsetHeight;
                this.opts.pullToRefresh = true;
            }
        },
        _ptrExecTrigger: function () {
            var self = this,
                ptrDataProvider = this.opts.onPullToRefresh,
                callback = function () {
                    self._ptrExecTriggerCallback.apply(self, arguments);
                };

            if (ptrDataProvider) {
                ptrDataProvider(callback);
            } else {
                w.setTimeout(function (){
                    self._ptrExecTriggerCallback('handler not defined');
                }, 600);
            }
        },
        _ptrExecTriggerCallback: function (err, data) {
            var self = this;
            if (err) {
                this._setPTRErrorState(err);
                this._ptrTriggered = false;
                w.setTimeout(function () {
                    self._resetPosition(self._ptrSnapTime);
                    self._setPTRErrorState(false);
                }, ERROR_TIMEOUT);
            } else {
                this.prependItems(data);
                this._ptrTriggered = false;
                this._setPTRLoadingState(false);

                RAF(function() {
                    self._resetPosition(self._ptrSnapTime);
                });
            }
            
        },
        /*
        * ==================================
        * PUBLIC API
        * ==================================
        */
        isTriggeredPTR: function () {
            return this._ptrTriggered;
        },
        getPTRSize: function () {
            return this._ptrThreshold;
        },
        getPTRSnapTime: function () {
            return this._ptrSnapTime;
        },
        triggerPTR: function () {
            this._ptrExecTrigger();
        },
        getResetPositionPTR: function () {
            if (!this._triggerPTRAfterReset) {
                this._triggerPTRAfterReset = true;
                this._setPTRLoadingState(true);
            } else {
                this._triggerPTRAfterReset = false;
                this.triggerPTR();
            }
            return {
                x    : this.x,
                y    : this.getPTRSize(),
                time : this.getPTRSnapTime()
            };
        },
        togglePullToRefresh: function (enabled, force) {
            var hasToggleArg = enabled !== undefined,
                toggleStr = hasToggleArg ? enabled ? 'enable' : 'disable' : '';

            if (hasToggleArg) {
                this._ptrToggle(toggleStr, force);
            } else {
                this._ptrToggle(this.opts.pullToRefresh ? 'disable' : 'enable', force);
            }
        }
    };   

    PLUGINS.PullToRefresh = PullToRefresh;

}(window));
},
_initPullToLoadMorePlugin: function () {
    (function (w) {        

    var SCROLLER = w.__S || (w.__S = {}), //NAMESPACE
        RAF      = w.requestAnimationFrame,
        PLUGINS  = SCROLLER.plugins || (SCROLLER.plugins = {}),

        CONFIG_DEFAULTS = {
            labelPull     : 'Pull up to show more',
            labelRelease  : 'Release to show more',
            labelUpdate   : 'Updating...',
            labelSubtitle : '',
            labelError    : 'Error on pull to load more'
        },
        
        PULL_TO_SNAP_TIME  = 200,
        ERROR_TIMEOUT      = 1000,
        CLASS_UPDATE_STATE = 'update',
        CLASS_PULL_STATE   = 'pull',
        CLASS_ICON         = 'icon',
        CLASS_ERROR        = 'error',
        CLASS_LABEL        = 'label',
        CLASS_SUBTITLE     = 'sub',
        CLASS_PTL          = 'pullToLoadMore';
    
    function PullToLoadMore() {}

    PullToLoadMore.prototype = {
        init: function () {
            this._mergePullToLoadMoreConfig();
            this.on('_initialize', this._appendPullToLoad);
            this.on('scrollMove', this._onScrollMovePTL);
        },
        _mergePullToLoadMoreConfig: function () {
            this.opts.pullToLoadMoreConfig = this._mergeConfigOptions(CONFIG_DEFAULTS, this.opts.pullToLoadMoreConfig);
        },
        
        _triggerPTL: function () {
            //set waiting state
            this._setPTLLoadingState(true);
            this._ptlExecTrigger();
        },
        _createPullToLoadMarkup: function () {
            var ptl_container = w.document.createElement('div'),
            pullLabel     = this.opts.pullToLoadMoreConfig.labelPull,
            subtitleLabel = this.opts.pullToLoadMoreConfig.labelSubtitle;

            ptl_container.innerHTML = [
                '<span class="' + CLASS_ICON + '"></span>',
                '<span class="' + CLASS_LABEL + '">' + pullLabel + '</span>',
                '<span class="' + CLASS_SUBTITLE + '">' + subtitleLabel + '</span>'
                ].join('');

            ptl_container.className = CLASS_PTL;
            return ptl_container;
        },
        _createPullToLoadSpacer: function () {
            var ptl_spacer = w.document.createElement('div');
            ptl_spacer.classList.add('spacer-pull-to-load-more');

            return ptl_spacer;
        },
        _sizePullToShowMore: function () {
            var spacer = this.ptlSpacer;
                diff   = this.wrapperHeight - spacer.offsetTop;

            diff = diff > 0 ? diff: 0;

            if (diff !== this.ptlSpacerSize) {
                this.ptlSpacerSize = diff;   
                spacer.style.height = this.ptlSpacerSize + 'px';
            }
        },
        _appendPullToLoad: function () {
            var ptl_container = this._createPullToLoadMarkup();
                ptl_spacer    = this._createPullToLoadSpacer();

            this.scroller.appendChild(ptl_spacer);
            this.scroller.appendChild(ptl_container);

            this.ptlSpacer = ptl_spacer;
            this.ptlDOM    = ptl_container;
            this.ptlIcon   = ptl_container.firstChild;
            this.ptlLabel  = ptl_container.getElementsByClassName(CLASS_LABEL)[0];

            this._ptlThreshold  = ptl_container.offsetHeight;
            this._ptlSnapTime   = PULL_TO_SNAP_TIME; 
            this.togglePullToLoadMore(this.opts.pullToLoadMore, true);

            this._setSize();
        },
        _appendData: function (items) {
            var docfrag = w.document.createDocumentFragment(),
                scrollerContainer = this.scroller,
                ptlContainer = this.ptlSpacer;

            items.forEach(function (i) {
                docfrag.appendChild(i);
            });

            if (ptlContainer) {
                scrollerContainer.insertBefore(docfrag, ptlContainer);
            } else {
                scrollerContainer.appendChild(docfrag);
            }
        },
        _ptlIsEnabled: function () {
            return this.opts.pullToLoadMore;
        },
        _ptlToggle: function (action, force) {
            var ptl = this.ptlDOM;

            if (!ptl) return;

            if (action === 'disable' && (this.opts.pullToLoadMore || force)) {
                ptl.style.display = 'none';
                this._ptlThreshold = 0;
                this.opts.pullToLoadMore = false;

            } else if (action === 'enable' && (!this.opts.pullToLoadMore || force)) {
                ptl.style.display = ''; 
                this._ptlThreshold = ptl.offsetHeight;
                this.opts.pullToLoadMore = true;
            }
        },
        _onScrollMovePTL: function (action, x, y) {
            if (action === 'gestureMove' && y < this.maxScrollY) {
                this._needsPullToLoadMore(y);
            }
        },
        _needsPullToLoadMore: function (ypos) {
            if (!this.opts.pullToLoadMore) return;
            var threshold = this.maxScrollY - this._ptlThreshold;

            if (this._ptlTriggered && ypos > threshold) {
                this._setPTLPullState(false);
                this._ptlTriggered = false;

            } else if (!this._ptlTriggered && ypos < threshold) {
                this._setPTLPullState(true);
                this._ptlTriggered = true;
            }
        },
        _setPTLPullState: function (enable) {
            if (enable) {
                this.ptlDOM.classList.add(CLASS_PULL_STATE);
                this.ptlLabel.textContent = this.opts.pullToLoadMoreConfig.labelRelease;
                this._ptlTriggered = true;    
            } else {
                this.ptlDOM.classList.remove(CLASS_PULL_STATE);
                this.ptlLabel.textContent = this.opts.pullToLoadMoreConfig.labelPull;
                this._ptlTriggered = false;
            }
        },
        _setPTLLoadingState: function (enable) {
            if (enable) {
                this.ptlDOM.classList.add(CLASS_UPDATE_STATE);
                this.ptlLabel.textContent = this.opts.pullToLoadMoreConfig.labelUpdate;
                this._ptlLoading          = true;
            } else {
                this.ptlDOM.classList.remove(CLASS_UPDATE_STATE);
                this.ptlDOM.classList.remove(CLASS_PULL_STATE);
                this.ptlLabel.textContent = this.opts.pullToLoadMoreConfig.labelPull;
                this._ptlLoading = false;
            }
        },
        _setPTLErrorState: function (error) {
            var labelError = this.opts.pullToLoadMoreConfig.labelError;
            // error == false remove error state
            if (typeof error === 'boolean' && !error) {
                this.ptlDOM.classList.remove(CLASS_ERROR);
                this._setPTLPullState(false);
            } else {
                this._setPTLLoadingState(false);
                this.ptlDOM.classList.add(CLASS_ERROR);
                this.ptlLabel.textContent = error.labelError || labelError;
            }
        },
         _ptlExecTrigger: function () {
            var self = this,
                ptrDataProvider = this.opts.onPullToLoadMore,
                callback = function () {
                    self._ptlExecTriggerCallback.apply(self, arguments);
                };

            if (ptrDataProvider) {
                ptrDataProvider(callback);
            } else {
                w.setTimeout(function (){
                    self._ptlExecTriggerCallback('no fnc');
                }, 600);
            }
        },
        _ptlExecTriggerCallback: function (err, items) {
            var self = this;
            if (err) {
                this._setPTLErrorState(err);
                this._ptlTriggered = false;
                w.setTimeout(function () {
                    self._resetPosition(self._ptlSnapTime);
                    self._setPTLErrorState(false);
                }, ERROR_TIMEOUT);
            } else {
                this.appendItems(items);
                this._ptlTriggered = false;
                this._setPTLLoadingState(false);

                RAF(function() {
                    self._resetPosition(self._ptlSnapTime);
                });
            }
        },
        /*
        * ==================================
        * PUBLIC API
        * ==================================
        */
        getPTLSize: function () {
            return this._ptlThreshold;
        },
        getPTLSnapTime: function () {
            return this._ptlSnapTime;
        },
        isTriggeredPTL: function () {
            return this._ptlTriggered;
        },
        resetPositionPTL: function () {
            if (!this._triggerPTLAfterReset) {
                this._triggerPTLAfterReset = true;
                this._setPTLLoadingState(true);
            } else {
                this._triggerPTLAfterReset = false;
                this._triggerPTL();
            }
            return {
                x    : this.x,
                y    : this.maxScrollY - this.getPTLSize(),
                time : this.getPTLSnapTime()
            };    
        },
        togglePullToLoadMore: function (enabled, force) {
            var hasToggleArg = enabled !== undefined,
                toggleStr = hasToggleArg ? enabled ? 'enable' : 'disable' : '';

            if (hasToggleArg) {
                this._ptlToggle(toggleStr, force);
            } else {
                this._ptlToggle(this.opts.pullToLoadMore ? 'disable' : 'enable', force);
            }
        }
    };   

    PLUGINS.PullToLoadMore = PullToLoadMore;

}(window));
},
_initInfiniteLoadingPlugin: function () {
    (function (w) {        
    // NAMESPACES
    var SCROLLER = w.__S || (w.__S = {}), 
        PLUGINS  = SCROLLER.plugins || (SCROLLER.plugins = {}),

        CONFIG_DEFAULTS = {
            labelNoData : 'No more data to display',
            threshold   : null
        },
        CLASS_FETCHING = 'loading';
    
    function InfiniteLoading () {}

    InfiniteLoading.prototype = {
        init: function () {
            this._mergeInfiniteLoading();
            this.on('_initialize', this._initInfiniteLoading);
        },
        _mergeInfiniteLoading: function () {
            this.opts.infiniteLoadingConfig = this._mergeConfigOptions(
                CONFIG_DEFAULTS, 
                this.opts.infiniteLoadingConfig
            );
        },
        _initInfiniteLoading: function () {
            var ilConfig       = this.opts.infiniteLoadingConfig,
                thresholdCheck = this.opts.gpuOptimization ? this._checkItemsthreshold : this._checkLoadingThreshold;

            if (!this.opts.infiniteLoading || !ilConfig.dataProvider) {
                w.DEBUG.warn('InfiniteLoading will not work because there is no data provider or is not activated');
                return;
            }

            this.on('scrollMove', thresholdCheck);
            this.on('scrollEnd',  thresholdCheck);
            this._itemsThreshold = this.items && this.items.length || 10;
        },
        _triggerInfiniteLoadingDataProvider: function () {
            var self            = this,
                ilDataProvider  = this.opts.infiniteLoadingConfig.dataProvider,
                callback        = function () {
                    self._infiniteLoadingTriggerCallback.apply(self, arguments);
                };

            if (ilDataProvider) {
                w.DEBUG.log('fetching data');
                this._ilFetchingData = true;
                ilDataProvider(callback);
            } else {
                this._infiniteLoadingTriggerCallback('noop');
            }
        },
        _infiniteLoadingTriggerCallback: function (err, payload) {
            if (!err) {
                // the payload returns an array, append it.
                if (payload instanceof Array && payload.length) {
                    w.DEBUG.log('Data fetched!');
                    this.appendItems(payload);

                // the user manually added the dom elements (wrong thing, but we support it..)
                } else if (payload === 'refresh') {
                    w.DEBUG.log('InfiniteLoading: refresh!');
                    this.refresh();

                // If the payload is not "refresh" or an Array, we assume there is no more data.
                } else {
                    this._ilNoMoreData = true;
                    w.DEBUG.log('No More data!');
                }
            }
            this._ilFetchingData = false;
        },
        // This check is done when surfaceManager is enabled
        _checkItemsthreshold: function (action) {
            if (this._ilNoMoreData || this._ilFetchingData) {
                return;
            }

            var lastIndex  = this._positionedSurfacesLast().contentIndex;
                count      = this.items.length - 1;
                threshold  = this._itemsThreshold;

            if (count - lastIndex < threshold) {
                this._triggerInfiniteLoadingDataProvider();
            }
        },
        // This check is done when surfaceManager is disabled
        _checkLoadingThreshold: function (action, x, y) {
            if (this._ilNoMoreData || this._ilFetchingData) {
                return;
            }

            var config = this.opts.infiniteLoadingConfig,
                delta, threshold, pos, size;

            x || (x = this.x);
            y || (y = this.y);

            if (this.scrollVertical) {
                pos  = y;
                size = this.scrollerWidth;
            } else {
                pos  = x;
                size = this.scrollerHeight; 
            }

            threshold = config.threshold || 3 * size;
            delta     = size + pos; // pos is negative

            if (delta < threshold) {
                this._triggerInfiniteLoadingDataProvider();
            }
        },
        /* PUBLIC API */
        fetchData: function () {
            this._triggerInfiniteLoadingDataProvider();
        },
        unlockFetchData: function () {
            this._ilNoMoreData = false;
        },
        lockFetchData: function () {
            this._ilNoMoreData = true;
        }
    };   

    PLUGINS.InfiniteLoading = InfiniteLoading;

}(window));
},
_initEndlessPlugin: function () {
    (function (w) {        

    var SCROLLER = w.__S || (w.__S = {}), //NAMESPACE
        PLUGINS  = SCROLLER.plugins || (SCROLLER.plugins = {});
    
    function Endless() {}

    Endless.prototype = {
        init: function () {
            this.endless = true;
        },
        _itemsLeft: function () {
            return true;
        },
        _mod: function (index) {
            var n = this.items.length;
            return ((index % n) + n) % n;
        },
        _setActiveOffset: function () {
              this.activeOffset = (this.scrollVertical ? this.wrapperHeight: this.wrapperWidth) - 5;
        },
        _momentum: function (current, start, duration, lowerMargin, wrapperSize) {
            var velocity = this._getVelocity(current, start, duration),
                momentum = this._computeMomentum(velocity, current);
            return momentum;
        },
        _resetPosition: function () {
            return false;
        },
        _isOutOfScroll: function () {
            return false;
        },
        _updateAllowed: function (current) {
            return this._isScrolling || (Math.abs(current.dist) > 5);
        },
        _getBoundaries: function (pos, size) {
            return {
                top    : -pos - size,
                bottom : -pos + size + this.activeOffset
            };
        },
        _recycleEnableTest: function () {
            return true;
        },
         _initializePositions: function () {
            var items         = this.items,
                itemsSize     = items.length,
                positioned    = this.surfacesPositioned,
                sizeNotCover  = true,
                sizeNeeded    = this.wrapperSize + this.activeOffset,
                heightSum     = 0,
                i,j,
                item, surface, height;

            for (i = 0; i < itemsSize && sizeNotCover; i++) {
                item          = items[i];
                surface       = this._getAvailableSurface();
                heightSum     += this._attachItemInSurface(item, surface, {index: i, offset: heightSum});
                sizeNotCover  = heightSum < sizeNeeded;
                positioned[i] = surface;
            }

            sizeNotCover = true;
            heightSum    = 0;
            sizeNeeded   = this.activeOffset;

            if (i === itemsSize || !sizeNotCover) {
                w.console.log('[WARNING - SCROLLER ENDLESS PLUGIN] - Items are not sufficient to fulfill all scrollable area');
            }
            
            for (j = itemsSize - 1; j >= i && sizeNotCover; j--) {
                item          = items[j];
                surface       = this._getAvailableSurface();
                heightSum     += this._attachItemInSurface(item, surface, {index: j, offset: positioned[0].offset, preCalculateSize: true});
                positioned.unshift(surface);
                sizeNotCover = heightSum < sizeNeeded;
            }

            this._setInfiniteScrollerSize();
        },
        
    };   

    PLUGINS.Endless = Endless;

}(window));
},
_initSnapPlugin: function () {
    (function (w) {        

    var SCROLLER    = w.__S || (w.__S = {}), //NAMESPACE
        STATICS     = SCROLLER.constructor,
        PLUGINS     = SCROLLER.plugins || (SCROLLER.plugins = {}),
        STYLES      = SCROLLER.styles,
        EASING      = STATICS.EASING,
        BOUNCE_BACK = 200,
        SNAP_SOFT   = 'soft',
        SNAP_STICKY = 'sticky',
        SNAPSIZE_RATIO = 2,
        MAX_SNAP_TIME  = 600;
    
    function Snap() {}

    Snap.prototype = {
        init: function () {
            this._bindSnap();
        },
        _bindSnap: function () {
            this.on('beforeScrollStart', this._snapStart);
        },
        _snapStart: function () {
            this.initX = this.startX;
            this.initY = this.startY;
        },
        _getNearesOffset: function (offset) {
            var s = this.surfacesPositioned;
        },
        _afterEnd: function () {
            var current, dest, time;
            if (!this.moved) {
                current = this._getSnapPosition();
                if (current.init % current.minSnap) {
                    dest = Math.round(current.init / current.snapSize) * current.snapSize;
                    time = BOUNCE_BACK;

                    if (this.scrollVertical) {
                        this.scrollTo(0, dest, time);
                    } else {
                        this.scrollTo(dest, 0 , time);
                    }
                    
                }
            }
        },
        _getSnapSize: function (vertical) {
            return  vertical ? this.itemHeight || this.wrapperHeight : this.itemWidth || this.wrapperWidth;
        },
        _getSnapPosition: function (vertical) {
            var current;
            if (this.scrollVertical) { 
                current  = {
                    snapSize : this._getSnapSize(true),
                    dist     : this.distY,
                    init     : this.initY
                };
            } else {
                current = {
                    snapSize : this._getSnapSize(),
                    dist     : this.distX,
                    init     : this.initX
                };
            }
            current.minSnap = current.snapSize / SNAPSIZE_RATIO;
            return current;
        },
        _momentum: function () {
               if (this.opts.snap === SNAP_SOFT) {
                    return this._momentumSnapSoft.apply(this, arguments);
               } else {
                    return this._momentumSnapSticky.apply(this, arguments);
               }
        },
        _momentumSnapSticky: function (current, start, duration, lowerMargin, wrapperSize) {
            var velocity = this._getVelocity(current, start, duration),
                momentum = this._momentumSnapSoft.apply(this, arguments),
                position = this._getSnapPosition(),
                snapSize = position.snapSize,
                initSnap = Math.round(position.init / snapSize) * snapSize,
                dest, time;

            if (Math.abs(position.init - momentum.destination) < position.minSnap) {
                momentum = {
                    destination : Math.round(position.init / position.snapSize) * position.snapSize,
                    time        : BOUNCE_BACK,
                    snapBack    : true
                };
            } else {
                dest = initSnap + (momentum.destination > current ? snapSize: -snapSize);
                time = Math.abs((current - dest) / velocity);
                momentum = {
                    destination : dest,
                    time        : Math.min(time, MAX_SNAP_TIME)
                };
            }

            return momentum;
        },
        _momentumSnapSoft: function (current, start, duration, lowerMargin, wrapperSize) {
            var velocity = this._getVelocity(current, start, duration),
                momentum = this._computeMomentum(velocity, current),
                pos      = this._getSnapPosition(),
                dist, time;

            if (!this.endless && momentum.destination > 0) {
                momentum        = this._computeSnap(0, wrapperSize, velocity, current);
                momentum.bounce = EASING.bounce;

            } else if (momentum.destination < lowerMargin) {
                momentum        = this._computeSnap(lowerMargin, wrapperSize, velocity, current);
                momentum.bounce = EASING.bounce;

            } else {
                dist = Math.round(momentum.destination / pos.snapSize) * pos.snapSize;
                time = Math.abs(current - dist) < pos.minSnap ? BOUNCE_BACK : Math.abs((dist - current) / velocity);

                momentum = {
                    destination : dist,
                    time        : time
                };

            }
            return momentum;
        }
    };   

    PLUGINS.Snap = Snap;

}(window));
}
})
