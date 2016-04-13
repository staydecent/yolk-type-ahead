(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Use typed arrays if we can
 */

var FastArray = typeof Uint32Array === 'undefined' ? Array : Uint32Array;

/**
 * Bit vector
 */

function createBv(sizeInBits) {
  return new FastArray(Math.ceil(sizeInBits / 32));
}

function setBit(v, idx) {
  var r = idx % 32;
  var pos = (idx - r) / 32;

  v[pos] |= 1 << r;
}

function clearBit(v, idx) {
  var r = idx % 32;
  var pos = (idx - r) / 32;

  v[pos] &= ~(1 << r);
}

function getBit(v, idx) {
  var r = idx % 32;
  var pos = (idx - r) / 32;

  return !!(v[pos] & 1 << r);
}

/**
 * Exports
 */

exports.createBv = createBv;
exports.setBit = setBit;
exports.clearBit = clearBit;
exports.getBit = getBit;
},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
/**
 * cuid.js
 * Collision-resistant UID generator for browsers and node.
 * Sequential for fast db lookups and recency sorting.
 * Safe for element IDs and server-side lookups.
 *
 * Extracted from CLCTR
 *
 * Copyright (c) Eric Elliott 2012
 * MIT License
 */

/*global window, navigator, document, require, process, module */
(function (app) {
  'use strict';
  var namespace = 'cuid',
    c = 0,
    blockSize = 4,
    base = 36,
    discreteValues = Math.pow(base, blockSize),

    pad = function pad(num, size) {
      var s = "000000000" + num;
      return s.substr(s.length-size);
    },

    randomBlock = function randomBlock() {
      return pad((Math.random() *
            discreteValues << 0)
            .toString(base), blockSize);
    },

    safeCounter = function () {
      c = (c < discreteValues) ? c : 0;
      c++; // this is not subliminal
      return c - 1;
    },

    api = function cuid() {
      // Starting with a lowercase letter makes
      // it HTML element ID friendly.
      var letter = 'c', // hard-coded allows for sequential access

        // timestamp
        // warning: this exposes the exact date and time
        // that the uid was created.
        timestamp = (new Date().getTime()).toString(base),

        // Prevent same-machine collisions.
        counter,

        // A few chars to generate distinct ids for different
        // clients (so different computers are far less
        // likely to generate the same id)
        fingerprint = api.fingerprint(),

        // Grab some more chars from Math.random()
        random = randomBlock() + randomBlock();

        counter = pad(safeCounter().toString(base), blockSize);

      return  (letter + timestamp + counter + fingerprint + random);
    };

  api.slug = function slug() {
    var date = new Date().getTime().toString(36),
      counter,
      print = api.fingerprint().slice(0,1) +
        api.fingerprint().slice(-1),
      random = randomBlock().slice(-2);

      counter = safeCounter().toString(36).slice(-4);

    return date.slice(-2) +
      counter + print + random;
  };

  api.globalCount = function globalCount() {
    // We want to cache the results of this
    var cache = (function calc() {
        var i,
          count = 0;

        for (i in window) {
          count++;
        }

        return count;
      }());

    api.globalCount = function () { return cache; };
    return cache;
  };

  api.fingerprint = function browserPrint() {
    return pad((navigator.mimeTypes.length +
      navigator.userAgent.length).toString(36) +
      api.globalCount().toString(36), 4);
  };

  // don't change anything from here down.
  if (app.register) {
    app.register(namespace, api);
  } else if (typeof module !== 'undefined') {
    module.exports = api;
  } else {
    app[namespace] = api;
  }

}(this.applitude || this));

},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.REMOVE = exports.MOVE = exports.UPDATE = exports.CREATE = undefined;

var _bitVector = require('bit-vector');

/**
 * Actions
 */

var CREATE = 0; /**
                 * Imports
                 */

var UPDATE = 1;
var MOVE = 2;
var REMOVE = 3;

/**
 * dift
 */

function dift(prev, next, effect, key) {
  var pStartIdx = 0;
  var nStartIdx = 0;
  var pEndIdx = prev.length - 1;
  var nEndIdx = next.length - 1;
  var pStartItem = prev[pStartIdx];
  var nStartItem = next[nStartIdx];

  // List head is the same
  while (pStartIdx <= pEndIdx && nStartIdx <= nEndIdx && equal(pStartItem, nStartItem)) {
    effect(UPDATE, pStartItem, nStartItem, nStartIdx);
    pStartItem = prev[++pStartIdx];
    nStartItem = next[++nStartIdx];
  }

  // The above case is orders of magnitude more common than the others, so fast-path it
  if (nStartIdx > nEndIdx && pStartIdx > pEndIdx) {
    return;
  }

  var pEndItem = prev[pEndIdx];
  var nEndItem = next[nEndIdx];
  var movedFromFront = 0;

  // Reversed
  while (pStartIdx <= pEndIdx && nStartIdx <= nEndIdx && equal(pStartItem, nEndItem)) {
    effect(MOVE, pStartItem, nEndItem, pEndIdx - movedFromFront + 1);
    pStartItem = prev[++pStartIdx];
    nEndItem = next[--nEndIdx];
    ++movedFromFront;
  }

  // Reversed the other way (in case of e.g. reverse and append)
  while (pEndIdx >= pStartIdx && nStartIdx <= nEndIdx && equal(nStartItem, pEndItem)) {
    effect(MOVE, pEndItem, nStartItem, nStartIdx);
    pEndItem = prev[--pEndIdx];
    nStartItem = next[++nStartIdx];
    --movedFromFront;
  }

  // List tail is the same
  while (pEndIdx >= pStartIdx && nEndIdx >= nStartIdx && equal(pEndItem, nEndItem)) {
    effect(UPDATE, pEndItem, nEndItem, nEndIdx);
    pEndItem = prev[--pEndIdx];
    nEndItem = next[--nEndIdx];
  }

  if (pStartIdx > pEndIdx) {
    while (nStartIdx <= nEndIdx) {
      effect(CREATE, null, nStartItem, nStartIdx);
      nStartItem = next[++nStartIdx];
    }

    return;
  }

  if (nStartIdx > nEndIdx) {
    while (pStartIdx <= pEndIdx) {
      effect(REMOVE, pStartItem);
      pStartItem = prev[++pStartIdx];
    }

    return;
  }

  var created = 0;
  var pivotDest = null;
  var pivotIdx = pStartIdx - movedFromFront;
  var keepBase = pStartIdx;
  var keep = (0, _bitVector.createBv)(pEndIdx - pStartIdx);

  var prevMap = keyMap(prev, pStartIdx, pEndIdx + 1, key);

  for (; nStartIdx <= nEndIdx; nStartItem = next[++nStartIdx]) {
    var oldIdx = prevMap[key(nStartItem)];

    if (isUndefined(oldIdx)) {
      effect(CREATE, null, nStartItem, pivotIdx++);
      ++created;
    } else if (pStartIdx !== oldIdx) {
      (0, _bitVector.setBit)(keep, oldIdx - keepBase);
      effect(MOVE, prev[oldIdx], nStartItem, pivotIdx++);
    } else {
      pivotDest = nStartIdx;
    }
  }

  if (pivotDest !== null) {
    (0, _bitVector.setBit)(keep, 0);
    effect(MOVE, prev[pStartIdx], next[pivotDest], pivotDest);
  }

  // If there are no creations, then you have to
  // remove exactly max(prevLen - nextLen, 0) elements in this
  // diff. You have to remove one more for each element
  // that was created. This means once we have
  // removed that many, we can stop.
  var necessaryRemovals = prev.length - next.length + created;
  for (var removals = 0; removals < necessaryRemovals; pStartItem = prev[++pStartIdx]) {
    if (!(0, _bitVector.getBit)(keep, pStartIdx - keepBase)) {
      effect(REMOVE, pStartItem);
      ++removals;
    }
  }

  function equal(a, b) {
    return key(a) === key(b);
  }
}

function isUndefined(val) {
  return typeof val === 'undefined';
}

function keyMap(items, start, end, key) {
  var map = {};

  for (var i = start; i < end; ++i) {
    map[key(items[i])] = i;
  }

  return map;
}

/**
 * Exports
 */

exports.default = dift;
exports.CREATE = CREATE;
exports.UPDATE = UPDATE;
exports.MOVE = MOVE;
exports.REMOVE = REMOVE;
},{"bit-vector":1}],5:[function(require,module,exports){
var EvStore = require("ev-store")

module.exports = addEvent

function addEvent(target, type, handler) {
    var events = EvStore(target)
    var event = events[type]

    if (!event) {
        events[type] = handler
    } else if (Array.isArray(event)) {
        if (event.indexOf(handler) === -1) {
            event.push(handler)
        }
    } else if (event !== handler) {
        events[type] = [event, handler]
    }
}

},{"ev-store":11}],6:[function(require,module,exports){
var globalDocument = require("global/document")
var EvStore = require("ev-store")
var createStore = require("weakmap-shim/create-store")

var addEvent = require("./add-event.js")
var removeEvent = require("./remove-event.js")
var ProxyEvent = require("./proxy-event.js")

var HANDLER_STORE = createStore()

module.exports = DOMDelegator

function DOMDelegator(document) {
    if (!(this instanceof DOMDelegator)) {
        return new DOMDelegator(document);
    }

    document = document || globalDocument

    this.target = document.documentElement
    this.events = {}
    this.rawEventListeners = {}
    this.globalListeners = {}
}

DOMDelegator.prototype.addEventListener = addEvent
DOMDelegator.prototype.removeEventListener = removeEvent

DOMDelegator.allocateHandle =
    function allocateHandle(func) {
        var handle = new Handle()

        HANDLER_STORE(handle).func = func;

        return handle
    }

DOMDelegator.transformHandle =
    function transformHandle(handle, broadcast) {
        var func = HANDLER_STORE(handle).func

        return this.allocateHandle(function (ev) {
            broadcast(ev, func);
        })
    }

DOMDelegator.prototype.addGlobalEventListener =
    function addGlobalEventListener(eventName, fn) {
        var listeners = this.globalListeners[eventName] || [];
        if (listeners.indexOf(fn) === -1) {
            listeners.push(fn)
        }

        this.globalListeners[eventName] = listeners;
    }

DOMDelegator.prototype.removeGlobalEventListener =
    function removeGlobalEventListener(eventName, fn) {
        var listeners = this.globalListeners[eventName] || [];

        var index = listeners.indexOf(fn)
        if (index !== -1) {
            listeners.splice(index, 1)
        }
    }

DOMDelegator.prototype.listenTo = function listenTo(eventName) {
    if (!(eventName in this.events)) {
        this.events[eventName] = 0;
    }

    this.events[eventName]++;

    if (this.events[eventName] !== 1) {
        return
    }

    var listener = this.rawEventListeners[eventName]
    if (!listener) {
        listener = this.rawEventListeners[eventName] =
            createHandler(eventName, this)
    }

    this.target.addEventListener(eventName, listener, true)
}

DOMDelegator.prototype.unlistenTo = function unlistenTo(eventName) {
    if (!(eventName in this.events)) {
        this.events[eventName] = 0;
    }

    if (this.events[eventName] === 0) {
        throw new Error("already unlistened to event.");
    }

    this.events[eventName]--;

    if (this.events[eventName] !== 0) {
        return
    }

    var listener = this.rawEventListeners[eventName]

    if (!listener) {
        throw new Error("dom-delegator#unlistenTo: cannot " +
            "unlisten to " + eventName)
    }

    this.target.removeEventListener(eventName, listener, true)
}

function createHandler(eventName, delegator) {
    var globalListeners = delegator.globalListeners;
    var delegatorTarget = delegator.target;

    return handler

    function handler(ev) {
        var globalHandlers = globalListeners[eventName] || []

        if (globalHandlers.length > 0) {
            var globalEvent = new ProxyEvent(ev);
            globalEvent.currentTarget = delegatorTarget;
            callListeners(globalHandlers, globalEvent)
        }

        findAndInvokeListeners(ev.target, ev, eventName)
    }
}

function findAndInvokeListeners(elem, ev, eventName) {
    var listener = getListener(elem, eventName)

    if (listener && listener.handlers.length > 0) {
        var listenerEvent = new ProxyEvent(ev);
        listenerEvent.currentTarget = listener.currentTarget
        callListeners(listener.handlers, listenerEvent)

        if (listenerEvent._bubbles) {
            var nextTarget = listener.currentTarget.parentNode
            findAndInvokeListeners(nextTarget, ev, eventName)
        }
    }
}

function getListener(target, type) {
    // terminate recursion if parent is `null`
    if (target === null || typeof target === "undefined") {
        return null
    }

    var events = EvStore(target)
    // fetch list of handler fns for this event
    var handler = events[type]
    var allHandler = events.event

    if (!handler && !allHandler) {
        return getListener(target.parentNode, type)
    }

    var handlers = [].concat(handler || [], allHandler || [])
    return new Listener(target, handlers)
}

function callListeners(handlers, ev) {
    handlers.forEach(function (handler) {
        if (typeof handler === "function") {
            handler(ev)
        } else if (typeof handler.handleEvent === "function") {
            handler.handleEvent(ev)
        } else if (handler.type === "dom-delegator-handle") {
            HANDLER_STORE(handler).func(ev)
        } else {
            throw new Error("dom-delegator: unknown handler " +
                "found: " + JSON.stringify(handlers));
        }
    })
}

function Listener(target, handlers) {
    this.currentTarget = target
    this.handlers = handlers
}

function Handle() {
    this.type = "dom-delegator-handle"
}

},{"./add-event.js":5,"./proxy-event.js":9,"./remove-event.js":10,"ev-store":11,"global/document":12,"weakmap-shim/create-store":67}],7:[function(require,module,exports){
var Individual = require("individual")
var cuid = require("cuid")
var globalDocument = require("global/document")

var DOMDelegator = require("./dom-delegator.js")

var versionKey = "13"
var cacheKey = "__DOM_DELEGATOR_CACHE@" + versionKey
var cacheTokenKey = "__DOM_DELEGATOR_CACHE_TOKEN@" + versionKey
var delegatorCache = Individual(cacheKey, {
    delegators: {}
})
var commonEvents = [
    "blur", "change", "click",  "contextmenu", "dblclick",
    "error","focus", "focusin", "focusout", "input", "keydown",
    "keypress", "keyup", "load", "mousedown", "mouseup",
    "resize", "select", "submit", "touchcancel",
    "touchend", "touchstart", "unload"
]

/*  Delegator is a thin wrapper around a singleton `DOMDelegator`
        instance.

    Only one DOMDelegator should exist because we do not want
        duplicate event listeners bound to the DOM.

    `Delegator` will also `listenTo()` all events unless
        every caller opts out of it
*/
module.exports = Delegator

function Delegator(opts) {
    opts = opts || {}
    var document = opts.document || globalDocument

    var cacheKey = document[cacheTokenKey]

    if (!cacheKey) {
        cacheKey =
            document[cacheTokenKey] = cuid()
    }

    var delegator = delegatorCache.delegators[cacheKey]

    if (!delegator) {
        delegator = delegatorCache.delegators[cacheKey] =
            new DOMDelegator(document)
    }

    if (opts.defaultEvents !== false) {
        for (var i = 0; i < commonEvents.length; i++) {
            delegator.listenTo(commonEvents[i])
        }
    }

    return delegator
}

Delegator.allocateHandle = DOMDelegator.allocateHandle;
Delegator.transformHandle = DOMDelegator.transformHandle;

},{"./dom-delegator.js":6,"cuid":3,"global/document":12,"individual":8}],8:[function(require,module,exports){
(function (global){
var root = typeof window !== 'undefined' ?
    window : typeof global !== 'undefined' ?
    global : {};

module.exports = Individual

function Individual(key, value) {
    if (root[key]) {
        return root[key]
    }

    Object.defineProperty(root, key, {
        value: value
        , configurable: true
    })

    return value
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],9:[function(require,module,exports){
var inherits = require("inherits")

var ALL_PROPS = [
    "altKey", "bubbles", "cancelable", "ctrlKey",
    "eventPhase", "metaKey", "relatedTarget", "shiftKey",
    "target", "timeStamp", "type", "view", "which"
]
var KEY_PROPS = ["char", "charCode", "key", "keyCode"]
var MOUSE_PROPS = [
    "button", "buttons", "clientX", "clientY", "layerX",
    "layerY", "offsetX", "offsetY", "pageX", "pageY",
    "screenX", "screenY", "toElement"
]

var rkeyEvent = /^key|input/
var rmouseEvent = /^(?:mouse|pointer|contextmenu)|click/

module.exports = ProxyEvent

function ProxyEvent(ev) {
    if (!(this instanceof ProxyEvent)) {
        return new ProxyEvent(ev)
    }

    if (rkeyEvent.test(ev.type)) {
        return new KeyEvent(ev)
    } else if (rmouseEvent.test(ev.type)) {
        return new MouseEvent(ev)
    }

    for (var i = 0; i < ALL_PROPS.length; i++) {
        var propKey = ALL_PROPS[i]
        this[propKey] = ev[propKey]
    }

    this._rawEvent = ev
    this._bubbles = false;
}

ProxyEvent.prototype.preventDefault = function () {
    this._rawEvent.preventDefault()
}

ProxyEvent.prototype.startPropagation = function () {
    this._bubbles = true;
}

function MouseEvent(ev) {
    for (var i = 0; i < ALL_PROPS.length; i++) {
        var propKey = ALL_PROPS[i]
        this[propKey] = ev[propKey]
    }

    for (var j = 0; j < MOUSE_PROPS.length; j++) {
        var mousePropKey = MOUSE_PROPS[j]
        this[mousePropKey] = ev[mousePropKey]
    }

    this._rawEvent = ev
}

inherits(MouseEvent, ProxyEvent)

function KeyEvent(ev) {
    for (var i = 0; i < ALL_PROPS.length; i++) {
        var propKey = ALL_PROPS[i]
        this[propKey] = ev[propKey]
    }

    for (var j = 0; j < KEY_PROPS.length; j++) {
        var keyPropKey = KEY_PROPS[j]
        this[keyPropKey] = ev[keyPropKey]
    }

    this._rawEvent = ev
}

inherits(KeyEvent, ProxyEvent)

},{"inherits":15}],10:[function(require,module,exports){
var EvStore = require("ev-store")

module.exports = removeEvent

function removeEvent(target, type, handler) {
    var events = EvStore(target)
    var event = events[type]

    if (!event) {
        return
    } else if (Array.isArray(event)) {
        var index = event.indexOf(handler)
        if (index !== -1) {
            event.splice(index, 1)
        }
    } else if (event === handler) {
        events[type] = null
    }
}

},{"ev-store":11}],11:[function(require,module,exports){
'use strict';

var OneVersionConstraint = require('individual/one-version');

var MY_VERSION = '7';
OneVersionConstraint('ev-store', MY_VERSION);

var hashKey = '__EV_STORE_KEY@' + MY_VERSION;

module.exports = EvStore;

function EvStore(elem) {
    var hash = elem[hashKey];

    if (!hash) {
        hash = elem[hashKey] = {};
    }

    return hash;
}

},{"individual/one-version":14}],12:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"min-document":2}],13:[function(require,module,exports){
(function (global){
'use strict';

/*global window, global*/

var root = typeof window !== 'undefined' ?
    window : typeof global !== 'undefined' ?
    global : {};

module.exports = Individual;

function Individual(key, value) {
    if (key in root) {
        return root[key];
    }

    root[key] = value;

    return value;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],14:[function(require,module,exports){
'use strict';

var Individual = require('./index.js');

module.exports = OneVersion;

function OneVersion(moduleName, version, defaultValue) {
    var key = '__INDIVIDUAL_ONE_VERSION_' + moduleName;
    var enforceKey = key + '_ENFORCE_SINGLETON';

    var versionValue = Individual(enforceKey, version);

    if (versionValue !== version) {
        throw new Error('Can only have one copy of ' +
            moduleName + '.\n' +
            'You already have version ' + versionValue +
            ' installed.\n' +
            'This means you cannot install version ' + version);
    }

    return Individual(key, defaultValue);
}

},{"./index.js":13}],15:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],16:[function(require,module,exports){
'use strict';

var classIdSplit = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/;
var notClassId = /^\.|#/;

module.exports = parseTag;

function parseTag(tag, props) {
  if (!tag) {
    return 'DIV';
  }

  var noId = !(props.hasOwnProperty('id'));

  var tagParts = tag.split(classIdSplit);
  var tagName = null;

  if (notClassId.test(tagParts[1])) {
    tagName = 'DIV';
  }

  var classes, part, type, i;

  for (i = 0; i < tagParts.length; i++) {
    part = tagParts[i];

    if (!part) {
      continue;
    }

    type = part.charAt(0);

    if (!tagName) {
      tagName = part;
    } else if (type === '.') {
      classes = classes || [];
      classes.push(part.substring(1, part.length));
    } else if (type === '#' && noId) {
      props.id = part.substring(1, part.length);
    }
  }

  if (classes) {
    if (props.className) {
      classes.push(props.className);
    }

    props.className = classes.join(' ');
  }

  return props.namespace ? tagName : tagName.toUpperCase();
}

},{}],17:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Subject_1 = require('./Subject');
var throwError_1 = require('./util/throwError');
var ObjectUnsubscribedError_1 = require('./util/ObjectUnsubscribedError');
/**
 * @class BehaviorSubject<T>
 */
var BehaviorSubject = (function (_super) {
    __extends(BehaviorSubject, _super);
    function BehaviorSubject(_value) {
        _super.call(this);
        this._value = _value;
    }
    BehaviorSubject.prototype.getValue = function () {
        if (this.hasErrored) {
            throwError_1.throwError(this.errorValue);
        }
        else if (this.isUnsubscribed) {
            throwError_1.throwError(new ObjectUnsubscribedError_1.ObjectUnsubscribedError());
        }
        else {
            return this._value;
        }
    };
    Object.defineProperty(BehaviorSubject.prototype, "value", {
        get: function () {
            return this.getValue();
        },
        enumerable: true,
        configurable: true
    });
    BehaviorSubject.prototype._subscribe = function (subscriber) {
        var subscription = _super.prototype._subscribe.call(this, subscriber);
        if (subscription && !subscription.isUnsubscribed) {
            subscriber.next(this._value);
        }
        return subscription;
    };
    BehaviorSubject.prototype._next = function (value) {
        _super.prototype._next.call(this, this._value = value);
    };
    BehaviorSubject.prototype._error = function (err) {
        this.hasErrored = true;
        _super.prototype._error.call(this, this.errorValue = err);
    };
    return BehaviorSubject;
}(Subject_1.Subject));
exports.BehaviorSubject = BehaviorSubject;

},{"./Subject":22,"./util/ObjectUnsubscribedError":54,"./util/throwError":64}],18:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Subscriber_1 = require('./Subscriber');
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var InnerSubscriber = (function (_super) {
    __extends(InnerSubscriber, _super);
    function InnerSubscriber(parent, outerValue, outerIndex) {
        _super.call(this);
        this.parent = parent;
        this.outerValue = outerValue;
        this.outerIndex = outerIndex;
        this.index = 0;
    }
    InnerSubscriber.prototype._next = function (value) {
        this.parent.notifyNext(this.outerValue, value, this.outerIndex, this.index++, this);
    };
    InnerSubscriber.prototype._error = function (error) {
        this.parent.notifyError(error, this);
        this.unsubscribe();
    };
    InnerSubscriber.prototype._complete = function () {
        this.parent.notifyComplete(this);
        this.unsubscribe();
    };
    return InnerSubscriber;
}(Subscriber_1.Subscriber));
exports.InnerSubscriber = InnerSubscriber;

},{"./Subscriber":24}],19:[function(require,module,exports){
"use strict";
var root_1 = require('./util/root');
var observable_1 = require('./symbol/observable');
var toSubscriber_1 = require('./util/toSubscriber');
/**
 * A representation of any set of values over any amount of time. This the most basic building block
 * of RxJS.
 *
 * @class Observable<T>
 */
var Observable = (function () {
    /**
     * @constructor
     * @param {Function} subscribe the function that is  called when the Observable is
     * initially subscribed to. This function is given a Subscriber, to which new values
     * can be `next`ed, or an `error` method can be called to raise an error, or
     * `complete` can be called to notify of a successful completion.
     */
    function Observable(subscribe) {
        this._isScalar = false;
        if (subscribe) {
            this._subscribe = subscribe;
        }
    }
    /**
     * Creates a new Observable, with this Observable as the source, and the passed
     * operator defined as the new observable's operator.
     * @method lift
     * @param {Operator} operator the operator defining the operation to take on the observable
     * @return {Observable} a new observable with the Operator applied
     */
    Observable.prototype.lift = function (operator) {
        var observable = new Observable();
        observable.source = this;
        observable.operator = operator;
        return observable;
    };
    /**
     * Registers handlers for handling emitted values, error and completions from the observable, and
     *  executes the observable's subscriber function, which will take action to set up the underlying data stream
     * @method subscribe
     * @param {PartialObserver|Function} observerOrNext (optional) either an observer defining all functions to be called,
     *  or the first of three possible handlers, which is the handler for each value emitted from the observable.
     * @param {Function} error (optional) a handler for a terminal event resulting from an error. If no error handler is provided,
     *  the error will be thrown as unhandled
     * @param {Function} complete (optional) a handler for a terminal event resulting from successful completion.
     * @return {ISubscription} a subscription reference to the registered handlers
     */
    Observable.prototype.subscribe = function (observerOrNext, error, complete) {
        var operator = this.operator;
        var sink = toSubscriber_1.toSubscriber(observerOrNext, error, complete);
        sink.add(operator ? operator.call(sink, this) : this._subscribe(sink));
        if (sink.syncErrorThrowable) {
            sink.syncErrorThrowable = false;
            if (sink.syncErrorThrown) {
                throw sink.syncErrorValue;
            }
        }
        return sink;
    };
    /**
     * @method forEach
     * @param {Function} next a handler for each value emitted by the observable
     * @param {PromiseConstructor} [PromiseCtor] a constructor function used to instantiate the Promise
     * @return {Promise} a promise that either resolves on observable completion or
     *  rejects with the handled error
     */
    Observable.prototype.forEach = function (next, PromiseCtor) {
        var _this = this;
        if (!PromiseCtor) {
            if (root_1.root.Rx && root_1.root.Rx.config && root_1.root.Rx.config.Promise) {
                PromiseCtor = root_1.root.Rx.config.Promise;
            }
            else if (root_1.root.Promise) {
                PromiseCtor = root_1.root.Promise;
            }
        }
        if (!PromiseCtor) {
            throw new Error('no Promise impl found');
        }
        return new PromiseCtor(function (resolve, reject) {
            var subscription = _this.subscribe(function (value) {
                if (subscription) {
                    // if there is a subscription, then we can surmise
                    // the next handling is asynchronous. Any errors thrown
                    // need to be rejected explicitly and unsubscribe must be
                    // called manually
                    try {
                        next(value);
                    }
                    catch (err) {
                        reject(err);
                        subscription.unsubscribe();
                    }
                }
                else {
                    // if there is NO subscription, then we're getting a nexted
                    // value synchronously during subscription. We can just call it.
                    // If it errors, Observable's `subscribe` imple will ensure the
                    // unsubscription logic is called, then synchronously rethrow the error.
                    // After that, Promise will trap the error and send it
                    // down the rejection path.
                    next(value);
                }
            }, reject, resolve);
        });
    };
    Observable.prototype._subscribe = function (subscriber) {
        return this.source.subscribe(subscriber);
    };
    /**
     * An interop point defined by the es7-observable spec https://github.com/zenparsing/es-observable
     * @method Symbol.observable
     * @return {Observable} this instance of the observable
     */
    Observable.prototype[observable_1.$$observable] = function () {
        return this;
    };
    // HACK: Since TypeScript inherits static properties too, we have to
    // fight against TypeScript here so Subject can have a different static create signature
    /**
     * Creates a new cold Observable by calling the Observable constructor
     * @static true
     * @owner Observable
     * @method create
     * @param {Function} subscribe? the subscriber function to be passed to the Observable constructor
     * @return {Observable} a new cold observable
     */
    Observable.create = function (subscribe) {
        return new Observable(subscribe);
    };
    return Observable;
}());
exports.Observable = Observable;

},{"./symbol/observable":52,"./util/root":62,"./util/toSubscriber":65}],20:[function(require,module,exports){
"use strict";
exports.empty = {
    isUnsubscribed: true,
    next: function (value) { },
    error: function (err) { throw err; },
    complete: function () { }
};

},{}],21:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Subscriber_1 = require('./Subscriber');
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var OuterSubscriber = (function (_super) {
    __extends(OuterSubscriber, _super);
    function OuterSubscriber() {
        _super.apply(this, arguments);
    }
    OuterSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.destination.next(innerValue);
    };
    OuterSubscriber.prototype.notifyError = function (error, innerSub) {
        this.destination.error(error);
    };
    OuterSubscriber.prototype.notifyComplete = function (innerSub) {
        this.destination.complete();
    };
    return OuterSubscriber;
}(Subscriber_1.Subscriber));
exports.OuterSubscriber = OuterSubscriber;

},{"./Subscriber":24}],22:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Observable_1 = require('./Observable');
var Subscriber_1 = require('./Subscriber');
var Subscription_1 = require('./Subscription');
var SubjectSubscription_1 = require('./SubjectSubscription');
var rxSubscriber_1 = require('./symbol/rxSubscriber');
var throwError_1 = require('./util/throwError');
var ObjectUnsubscribedError_1 = require('./util/ObjectUnsubscribedError');
/**
 * @class Subject<T>
 */
var Subject = (function (_super) {
    __extends(Subject, _super);
    function Subject(destination, source) {
        _super.call(this);
        this.destination = destination;
        this.source = source;
        this.observers = [];
        this.isUnsubscribed = false;
        this.isStopped = false;
        this.hasErrored = false;
        this.dispatching = false;
        this.hasCompleted = false;
        this.source = source;
    }
    Subject.prototype.lift = function (operator) {
        var subject = new Subject(this.destination || this, this);
        subject.operator = operator;
        return subject;
    };
    Subject.prototype.add = function (subscription) {
        return Subscription_1.Subscription.prototype.add.call(this, subscription);
    };
    Subject.prototype.remove = function (subscription) {
        Subscription_1.Subscription.prototype.remove.call(this, subscription);
    };
    Subject.prototype.unsubscribe = function () {
        Subscription_1.Subscription.prototype.unsubscribe.call(this);
    };
    Subject.prototype._subscribe = function (subscriber) {
        if (this.source) {
            return this.source.subscribe(subscriber);
        }
        else {
            if (subscriber.isUnsubscribed) {
                return;
            }
            else if (this.hasErrored) {
                return subscriber.error(this.errorValue);
            }
            else if (this.hasCompleted) {
                return subscriber.complete();
            }
            this.throwIfUnsubscribed();
            var subscription = new SubjectSubscription_1.SubjectSubscription(this, subscriber);
            this.observers.push(subscriber);
            return subscription;
        }
    };
    Subject.prototype._unsubscribe = function () {
        this.source = null;
        this.isStopped = true;
        this.observers = null;
        this.destination = null;
    };
    Subject.prototype.next = function (value) {
        this.throwIfUnsubscribed();
        if (this.isStopped) {
            return;
        }
        this.dispatching = true;
        this._next(value);
        this.dispatching = false;
        if (this.hasErrored) {
            this._error(this.errorValue);
        }
        else if (this.hasCompleted) {
            this._complete();
        }
    };
    Subject.prototype.error = function (err) {
        this.throwIfUnsubscribed();
        if (this.isStopped) {
            return;
        }
        this.isStopped = true;
        this.hasErrored = true;
        this.errorValue = err;
        if (this.dispatching) {
            return;
        }
        this._error(err);
    };
    Subject.prototype.complete = function () {
        this.throwIfUnsubscribed();
        if (this.isStopped) {
            return;
        }
        this.isStopped = true;
        this.hasCompleted = true;
        if (this.dispatching) {
            return;
        }
        this._complete();
    };
    Subject.prototype.asObservable = function () {
        var observable = new SubjectObservable(this);
        return observable;
    };
    Subject.prototype._next = function (value) {
        if (this.destination) {
            this.destination.next(value);
        }
        else {
            this._finalNext(value);
        }
    };
    Subject.prototype._finalNext = function (value) {
        var index = -1;
        var observers = this.observers.slice(0);
        var len = observers.length;
        while (++index < len) {
            observers[index].next(value);
        }
    };
    Subject.prototype._error = function (err) {
        if (this.destination) {
            this.destination.error(err);
        }
        else {
            this._finalError(err);
        }
    };
    Subject.prototype._finalError = function (err) {
        var index = -1;
        var observers = this.observers;
        // optimization to block our SubjectSubscriptions from
        // splicing themselves out of the observers list one by one.
        this.observers = null;
        this.isUnsubscribed = true;
        if (observers) {
            var len = observers.length;
            while (++index < len) {
                observers[index].error(err);
            }
        }
        this.isUnsubscribed = false;
        this.unsubscribe();
    };
    Subject.prototype._complete = function () {
        if (this.destination) {
            this.destination.complete();
        }
        else {
            this._finalComplete();
        }
    };
    Subject.prototype._finalComplete = function () {
        var index = -1;
        var observers = this.observers;
        // optimization to block our SubjectSubscriptions from
        // splicing themselves out of the observers list one by one.
        this.observers = null;
        this.isUnsubscribed = true;
        if (observers) {
            var len = observers.length;
            while (++index < len) {
                observers[index].complete();
            }
        }
        this.isUnsubscribed = false;
        this.unsubscribe();
    };
    Subject.prototype.throwIfUnsubscribed = function () {
        if (this.isUnsubscribed) {
            throwError_1.throwError(new ObjectUnsubscribedError_1.ObjectUnsubscribedError());
        }
    };
    Subject.prototype[rxSubscriber_1.$$rxSubscriber] = function () {
        return new Subscriber_1.Subscriber(this);
    };
    Subject.create = function (destination, source) {
        return new Subject(destination, source);
    };
    return Subject;
}(Observable_1.Observable));
exports.Subject = Subject;
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SubjectObservable = (function (_super) {
    __extends(SubjectObservable, _super);
    function SubjectObservable(source) {
        _super.call(this);
        this.source = source;
    }
    return SubjectObservable;
}(Observable_1.Observable));

},{"./Observable":19,"./SubjectSubscription":23,"./Subscriber":24,"./Subscription":25,"./symbol/rxSubscriber":53,"./util/ObjectUnsubscribedError":54,"./util/throwError":64}],23:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Subscription_1 = require('./Subscription');
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SubjectSubscription = (function (_super) {
    __extends(SubjectSubscription, _super);
    function SubjectSubscription(subject, observer) {
        _super.call(this);
        this.subject = subject;
        this.observer = observer;
        this.isUnsubscribed = false;
    }
    SubjectSubscription.prototype.unsubscribe = function () {
        if (this.isUnsubscribed) {
            return;
        }
        this.isUnsubscribed = true;
        var subject = this.subject;
        var observers = subject.observers;
        this.subject = null;
        if (!observers || observers.length === 0 || subject.isUnsubscribed) {
            return;
        }
        var subscriberIndex = observers.indexOf(this.observer);
        if (subscriberIndex !== -1) {
            observers.splice(subscriberIndex, 1);
        }
    };
    return SubjectSubscription;
}(Subscription_1.Subscription));
exports.SubjectSubscription = SubjectSubscription;

},{"./Subscription":25}],24:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var isFunction_1 = require('./util/isFunction');
var Subscription_1 = require('./Subscription');
var rxSubscriber_1 = require('./symbol/rxSubscriber');
var Observer_1 = require('./Observer');
/**
 * Implements the {@link Observer} interface and extends the
 * {@link Subscription} class. While the {@link Observer} is the public API for
 * consuming the values of an {@link Observable}, all Observers get converted to
 * a Subscriber, in order to provide Subscription-like capabilities such as
 * `unsubscribe`. Subscriber is a common type in RxJS, and crucial for
 * implementing operators, but it is rarely used as a public API.
 *
 * @class Subscriber<T>
 */
var Subscriber = (function (_super) {
    __extends(Subscriber, _super);
    /**
     * @param {Observer|function(value: T): void} [destinationOrNext] A partially
     * defined Observer or a `next` callback function.
     * @param {function(e: ?any): void} [error] The `error` callback of an
     * Observer.
     * @param {function(): void} [complete] The `complete` callback of an
     * Observer.
     */
    function Subscriber(destinationOrNext, error, complete) {
        _super.call(this);
        this.syncErrorValue = null;
        this.syncErrorThrown = false;
        this.syncErrorThrowable = false;
        this.isStopped = false;
        switch (arguments.length) {
            case 0:
                this.destination = Observer_1.empty;
                break;
            case 1:
                if (!destinationOrNext) {
                    this.destination = Observer_1.empty;
                    break;
                }
                if (typeof destinationOrNext === 'object') {
                    if (destinationOrNext instanceof Subscriber) {
                        this.destination = destinationOrNext;
                        this.destination.add(this);
                    }
                    else {
                        this.syncErrorThrowable = true;
                        this.destination = new SafeSubscriber(this, destinationOrNext);
                    }
                    break;
                }
            default:
                this.syncErrorThrowable = true;
                this.destination = new SafeSubscriber(this, destinationOrNext, error, complete);
                break;
        }
    }
    /**
     * A static factory for a Subscriber, given a (potentially partial) definition
     * of an Observer.
     * @param {function(x: ?T): void} [next] The `next` callback of an Observer.
     * @param {function(e: ?any): void} [error] The `error` callback of an
     * Observer.
     * @param {function(): void} [complete] The `complete` callback of an
     * Observer.
     * @return {Subscriber<T>} A Subscriber wrapping the (partially defined)
     * Observer represented by the given arguments.
     */
    Subscriber.create = function (next, error, complete) {
        var subscriber = new Subscriber(next, error, complete);
        subscriber.syncErrorThrowable = false;
        return subscriber;
    };
    /**
     * The {@link Observer} callback to receive notifications of type `next` from
     * the Observable, with a value. The Observable may call this method 0 or more
     * times.
     * @param {T} [value] The `next` value.
     * @return {void}
     */
    Subscriber.prototype.next = function (value) {
        if (!this.isStopped) {
            this._next(value);
        }
    };
    /**
     * The {@link Observer} callback to receive notifications of type `error` from
     * the Observable, with an attached {@link Error}. Notifies the Observer that
     * the Observable has experienced an error condition.
     * @param {any} [err] The `error` exception.
     * @return {void}
     */
    Subscriber.prototype.error = function (err) {
        if (!this.isStopped) {
            this.isStopped = true;
            this._error(err);
        }
    };
    /**
     * The {@link Observer} callback to receive a valueless notification of type
     * `complete` from the Observable. Notifies the Observer that the Observable
     * has finished sending push-based notifications.
     * @return {void}
     */
    Subscriber.prototype.complete = function () {
        if (!this.isStopped) {
            this.isStopped = true;
            this._complete();
        }
    };
    Subscriber.prototype.unsubscribe = function () {
        if (this.isUnsubscribed) {
            return;
        }
        this.isStopped = true;
        _super.prototype.unsubscribe.call(this);
    };
    Subscriber.prototype._next = function (value) {
        this.destination.next(value);
    };
    Subscriber.prototype._error = function (err) {
        this.destination.error(err);
        this.unsubscribe();
    };
    Subscriber.prototype._complete = function () {
        this.destination.complete();
        this.unsubscribe();
    };
    Subscriber.prototype[rxSubscriber_1.$$rxSubscriber] = function () {
        return this;
    };
    return Subscriber;
}(Subscription_1.Subscription));
exports.Subscriber = Subscriber;
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SafeSubscriber = (function (_super) {
    __extends(SafeSubscriber, _super);
    function SafeSubscriber(_parent, observerOrNext, error, complete) {
        _super.call(this);
        this._parent = _parent;
        var next;
        var context = this;
        if (isFunction_1.isFunction(observerOrNext)) {
            next = observerOrNext;
        }
        else if (observerOrNext) {
            context = observerOrNext;
            next = observerOrNext.next;
            error = observerOrNext.error;
            complete = observerOrNext.complete;
            if (isFunction_1.isFunction(context.unsubscribe)) {
                this.add(context.unsubscribe.bind(context));
            }
            context.unsubscribe = this.unsubscribe.bind(this);
        }
        this._context = context;
        this._next = next;
        this._error = error;
        this._complete = complete;
    }
    SafeSubscriber.prototype.next = function (value) {
        if (!this.isStopped && this._next) {
            var _parent = this._parent;
            if (!_parent.syncErrorThrowable) {
                this.__tryOrUnsub(this._next, value);
            }
            else if (this.__tryOrSetError(_parent, this._next, value)) {
                this.unsubscribe();
            }
        }
    };
    SafeSubscriber.prototype.error = function (err) {
        if (!this.isStopped) {
            var _parent = this._parent;
            if (this._error) {
                if (!_parent.syncErrorThrowable) {
                    this.__tryOrUnsub(this._error, err);
                    this.unsubscribe();
                }
                else {
                    this.__tryOrSetError(_parent, this._error, err);
                    this.unsubscribe();
                }
            }
            else if (!_parent.syncErrorThrowable) {
                this.unsubscribe();
                throw err;
            }
            else {
                _parent.syncErrorValue = err;
                _parent.syncErrorThrown = true;
                this.unsubscribe();
            }
        }
    };
    SafeSubscriber.prototype.complete = function () {
        if (!this.isStopped) {
            var _parent = this._parent;
            if (this._complete) {
                if (!_parent.syncErrorThrowable) {
                    this.__tryOrUnsub(this._complete);
                    this.unsubscribe();
                }
                else {
                    this.__tryOrSetError(_parent, this._complete);
                    this.unsubscribe();
                }
            }
            else {
                this.unsubscribe();
            }
        }
    };
    SafeSubscriber.prototype.__tryOrUnsub = function (fn, value) {
        try {
            fn.call(this._context, value);
        }
        catch (err) {
            this.unsubscribe();
            throw err;
        }
    };
    SafeSubscriber.prototype.__tryOrSetError = function (parent, fn, value) {
        try {
            fn.call(this._context, value);
        }
        catch (err) {
            parent.syncErrorValue = err;
            parent.syncErrorThrown = true;
            return true;
        }
        return false;
    };
    SafeSubscriber.prototype._unsubscribe = function () {
        var _parent = this._parent;
        this._context = null;
        this._parent = null;
        _parent.unsubscribe();
    };
    return SafeSubscriber;
}(Subscriber));

},{"./Observer":20,"./Subscription":25,"./symbol/rxSubscriber":53,"./util/isFunction":58}],25:[function(require,module,exports){
"use strict";
var isArray_1 = require('./util/isArray');
var isObject_1 = require('./util/isObject');
var isFunction_1 = require('./util/isFunction');
var tryCatch_1 = require('./util/tryCatch');
var errorObject_1 = require('./util/errorObject');
var UnsubscriptionError_1 = require('./util/UnsubscriptionError');
/**
 * Represents a disposable resource, such as the execution of an Observable. A
 * Subscription has one important method, `unsubscribe`, that takes no argument
 * and just disposes the resource held by the subscription.
 *
 * Additionally, subscriptions may be grouped together through the `add()`
 * method, which will attach a child Subscription to the current Subscription.
 * When a Subscription is unsubscribed, all its children (and its grandchildren)
 * will be unsubscribed as well.
 *
 * @class Subscription
 */
var Subscription = (function () {
    /**
     * @param {function(): void} [unsubscribe] A function describing how to
     * perform the disposal of resources when the `unsubscribe` method is called.
     */
    function Subscription(unsubscribe) {
        /**
         * A flag to indicate whether this Subscription has already been unsubscribed.
         * @type {boolean}
         */
        this.isUnsubscribed = false;
        if (unsubscribe) {
            this._unsubscribe = unsubscribe;
        }
    }
    /**
     * Disposes the resources held by the subscription. May, for instance, cancel
     * an ongoing Observable execution or cancel any other type of work that
     * started when the Subscription was created.
     * @return {void}
     */
    Subscription.prototype.unsubscribe = function () {
        var hasErrors = false;
        var errors;
        if (this.isUnsubscribed) {
            return;
        }
        this.isUnsubscribed = true;
        var _a = this, _unsubscribe = _a._unsubscribe, _subscriptions = _a._subscriptions;
        this._subscriptions = null;
        if (isFunction_1.isFunction(_unsubscribe)) {
            var trial = tryCatch_1.tryCatch(_unsubscribe).call(this);
            if (trial === errorObject_1.errorObject) {
                hasErrors = true;
                (errors = errors || []).push(errorObject_1.errorObject.e);
            }
        }
        if (isArray_1.isArray(_subscriptions)) {
            var index = -1;
            var len = _subscriptions.length;
            while (++index < len) {
                var sub = _subscriptions[index];
                if (isObject_1.isObject(sub)) {
                    var trial = tryCatch_1.tryCatch(sub.unsubscribe).call(sub);
                    if (trial === errorObject_1.errorObject) {
                        hasErrors = true;
                        errors = errors || [];
                        var err = errorObject_1.errorObject.e;
                        if (err instanceof UnsubscriptionError_1.UnsubscriptionError) {
                            errors = errors.concat(err.errors);
                        }
                        else {
                            errors.push(err);
                        }
                    }
                }
            }
        }
        if (hasErrors) {
            throw new UnsubscriptionError_1.UnsubscriptionError(errors);
        }
    };
    /**
     * Adds a tear down to be called during the unsubscribe() of this
     * Subscription.
     *
     * If the tear down being added is a subscription that is already
     * unsubscribed, is the same reference `add` is being called on, or is
     * `Subscription.EMPTY`, it will not be added.
     *
     * If this subscription is already in an `isUnsubscribed` state, the passed
     * tear down logic will be executed immediately.
     *
     * @param {TeardownLogic} teardown The additional logic to execute on
     * teardown.
     * @return {Subscription} Returns the Subscription used or created to be
     * added to the inner subscriptions list. This Subscription can be used with
     * `remove()` to remove the passed teardown logic from the inner subscriptions
     * list.
     */
    Subscription.prototype.add = function (teardown) {
        if (!teardown || (teardown === this) || (teardown === Subscription.EMPTY)) {
            return;
        }
        var sub = teardown;
        switch (typeof teardown) {
            case 'function':
                sub = new Subscription(teardown);
            case 'object':
                if (sub.isUnsubscribed || typeof sub.unsubscribe !== 'function') {
                    break;
                }
                else if (this.isUnsubscribed) {
                    sub.unsubscribe();
                }
                else {
                    (this._subscriptions || (this._subscriptions = [])).push(sub);
                }
                break;
            default:
                throw new Error('Unrecognized teardown ' + teardown + ' added to Subscription.');
        }
        return sub;
    };
    /**
     * Removes a Subscription from the internal list of subscriptions that will
     * unsubscribe during the unsubscribe process of this Subscription.
     * @param {Subscription} subscription The subscription to remove.
     * @return {void}
     */
    Subscription.prototype.remove = function (subscription) {
        // HACK: This might be redundant because of the logic in `add()`
        if (subscription == null || (subscription === this) || (subscription === Subscription.EMPTY)) {
            return;
        }
        var subscriptions = this._subscriptions;
        if (subscriptions) {
            var subscriptionIndex = subscriptions.indexOf(subscription);
            if (subscriptionIndex !== -1) {
                subscriptions.splice(subscriptionIndex, 1);
            }
        }
    };
    Subscription.EMPTY = (function (empty) {
        empty.isUnsubscribed = true;
        return empty;
    }(new Subscription()));
    return Subscription;
}());
exports.Subscription = Subscription;

},{"./util/UnsubscriptionError":55,"./util/errorObject":56,"./util/isArray":57,"./util/isFunction":58,"./util/isObject":59,"./util/tryCatch":66}],26:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var combineLatest_1 = require('../../operator/combineLatest');
Observable_1.Observable.combineLatest = combineLatest_1.combineLatestStatic;

},{"../../Observable":19,"../../operator/combineLatest":40}],27:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var of_1 = require('../../observable/of');
Observable_1.Observable.of = of_1.of;

},{"../../Observable":19,"../../observable/of":39}],28:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var map_1 = require('../../operator/map');
Observable_1.Observable.prototype.map = map_1.map;

},{"../../Observable":19,"../../operator/map":42}],29:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var mapTo_1 = require('../../operator/mapTo');
Observable_1.Observable.prototype.mapTo = mapTo_1.mapTo;

},{"../../Observable":19,"../../operator/mapTo":43}],30:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var merge_1 = require('../../operator/merge');
Observable_1.Observable.prototype.merge = merge_1.merge;

},{"../../Observable":19,"../../operator/merge":44}],31:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var scan_1 = require('../../operator/scan');
Observable_1.Observable.prototype.scan = scan_1.scan;

},{"../../Observable":19,"../../operator/scan":47}],32:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var share_1 = require('../../operator/share');
Observable_1.Observable.prototype.share = share_1.share;

},{"../../Observable":19,"../../operator/share":48}],33:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var startWith_1 = require('../../operator/startWith');
Observable_1.Observable.prototype.startWith = startWith_1.startWith;

},{"../../Observable":19,"../../operator/startWith":49}],34:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var switchMap_1 = require('../../operator/switchMap');
Observable_1.Observable.prototype.switchMap = switchMap_1.switchMap;

},{"../../Observable":19,"../../operator/switchMap":50}],35:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Observable_1 = require('../Observable');
var ScalarObservable_1 = require('./ScalarObservable');
var EmptyObservable_1 = require('./EmptyObservable');
var isScheduler_1 = require('../util/isScheduler');
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var ArrayObservable = (function (_super) {
    __extends(ArrayObservable, _super);
    function ArrayObservable(array, scheduler) {
        _super.call(this);
        this.array = array;
        this.scheduler = scheduler;
        if (!scheduler && array.length === 1) {
            this._isScalar = true;
            this.value = array[0];
        }
    }
    ArrayObservable.create = function (array, scheduler) {
        return new ArrayObservable(array, scheduler);
    };
    /**
     * Creates an Observable that emits some values you specify as arguments,
     * immediately one after the other, and then emits a complete notification.
     *
     * <span class="informal">Emits the arguments you provide, then completes.
     * </span>
     *
     * <img src="./img/of.png" width="100%">
     *
     * This static operator is useful for creating a simple Observable that only
     * emits the arguments given, and the complete notification thereafter. It can
     * be used for composing with other Observables, such as with {@link concat}.
     * By default, it uses a `null` Scheduler, which means the `next`
     * notifications are sent synchronously, although with a different Scheduler
     * it is possible to determine when those notifications will be delivered.
     *
     * @example <caption>Emit 10, 20, 30, then 'a', 'b', 'c', then start ticking every second.</caption>
     * var numbers = Rx.Observable.of(10, 20, 30);
     * var letters = Rx.Observable.of('a', 'b', 'c');
     * var interval = Rx.Observable.interval(1000);
     * var result = numbers.concat(letters).concat(interval);
     * result.subscribe(x => console.log(x));
     *
     * @see {@link create}
     * @see {@link empty}
     * @see {@link never}
     * @see {@link throw}
     *
     * @param {...T} values Arguments that represent `next` values to be emitted.
     * @param {Scheduler} [scheduler] A {@link Scheduler} to use for scheduling
     * the emissions of the `next` notifications.
     * @return {Observable<T>} An Observable that emits each given input value.
     * @static true
     * @name of
     * @owner Observable
     */
    ArrayObservable.of = function () {
        var array = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            array[_i - 0] = arguments[_i];
        }
        var scheduler = array[array.length - 1];
        if (isScheduler_1.isScheduler(scheduler)) {
            array.pop();
        }
        else {
            scheduler = null;
        }
        var len = array.length;
        if (len > 1) {
            return new ArrayObservable(array, scheduler);
        }
        else if (len === 1) {
            return new ScalarObservable_1.ScalarObservable(array[0], scheduler);
        }
        else {
            return new EmptyObservable_1.EmptyObservable(scheduler);
        }
    };
    ArrayObservable.dispatch = function (state) {
        var array = state.array, index = state.index, count = state.count, subscriber = state.subscriber;
        if (index >= count) {
            subscriber.complete();
            return;
        }
        subscriber.next(array[index]);
        if (subscriber.isUnsubscribed) {
            return;
        }
        state.index = index + 1;
        this.schedule(state);
    };
    ArrayObservable.prototype._subscribe = function (subscriber) {
        var index = 0;
        var array = this.array;
        var count = array.length;
        var scheduler = this.scheduler;
        if (scheduler) {
            return scheduler.schedule(ArrayObservable.dispatch, 0, {
                array: array, index: index, count: count, subscriber: subscriber
            });
        }
        else {
            for (var i = 0; i < count && !subscriber.isUnsubscribed; i++) {
                subscriber.next(array[i]);
            }
            subscriber.complete();
        }
    };
    return ArrayObservable;
}(Observable_1.Observable));
exports.ArrayObservable = ArrayObservable;

},{"../Observable":19,"../util/isScheduler":61,"./EmptyObservable":37,"./ScalarObservable":38}],36:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Observable_1 = require('../Observable');
var Subscriber_1 = require('../Subscriber');
var Subscription_1 = require('../Subscription');
/**
 * @class ConnectableObservable<T>
 */
var ConnectableObservable = (function (_super) {
    __extends(ConnectableObservable, _super);
    function ConnectableObservable(source, subjectFactory) {
        _super.call(this);
        this.source = source;
        this.subjectFactory = subjectFactory;
    }
    ConnectableObservable.prototype._subscribe = function (subscriber) {
        return this.getSubject().subscribe(subscriber);
    };
    ConnectableObservable.prototype.getSubject = function () {
        var subject = this.subject;
        if (subject && !subject.isUnsubscribed) {
            return subject;
        }
        return (this.subject = this.subjectFactory());
    };
    ConnectableObservable.prototype.connect = function () {
        var source = this.source;
        var subscription = this.subscription;
        if (subscription && !subscription.isUnsubscribed) {
            return subscription;
        }
        subscription = source.subscribe(this.getSubject());
        subscription.add(new ConnectableSubscription(this));
        return (this.subscription = subscription);
    };
    ConnectableObservable.prototype.refCount = function () {
        return new RefCountObservable(this);
    };
    /**
     * This method is opened for `ConnectableSubscription`.
     * Not to call from others.
     */
    ConnectableObservable.prototype._closeSubscription = function () {
        this.subject = null;
        this.subscription = null;
    };
    return ConnectableObservable;
}(Observable_1.Observable));
exports.ConnectableObservable = ConnectableObservable;
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var ConnectableSubscription = (function (_super) {
    __extends(ConnectableSubscription, _super);
    function ConnectableSubscription(connectable) {
        _super.call(this);
        this.connectable = connectable;
    }
    ConnectableSubscription.prototype._unsubscribe = function () {
        var connectable = this.connectable;
        connectable._closeSubscription();
        this.connectable = null;
    };
    return ConnectableSubscription;
}(Subscription_1.Subscription));
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var RefCountObservable = (function (_super) {
    __extends(RefCountObservable, _super);
    function RefCountObservable(connectable, refCount) {
        if (refCount === void 0) { refCount = 0; }
        _super.call(this);
        this.connectable = connectable;
        this.refCount = refCount;
    }
    RefCountObservable.prototype._subscribe = function (subscriber) {
        var connectable = this.connectable;
        var refCountSubscriber = new RefCountSubscriber(subscriber, this);
        var subscription = connectable.subscribe(refCountSubscriber);
        if (!subscription.isUnsubscribed && ++this.refCount === 1) {
            refCountSubscriber.connection = this.connection = connectable.connect();
        }
        return subscription;
    };
    return RefCountObservable;
}(Observable_1.Observable));
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var RefCountSubscriber = (function (_super) {
    __extends(RefCountSubscriber, _super);
    function RefCountSubscriber(destination, refCountObservable) {
        _super.call(this, null);
        this.destination = destination;
        this.refCountObservable = refCountObservable;
        this.connection = refCountObservable.connection;
        destination.add(this);
    }
    RefCountSubscriber.prototype._next = function (value) {
        this.destination.next(value);
    };
    RefCountSubscriber.prototype._error = function (err) {
        this._resetConnectable();
        this.destination.error(err);
    };
    RefCountSubscriber.prototype._complete = function () {
        this._resetConnectable();
        this.destination.complete();
    };
    RefCountSubscriber.prototype._resetConnectable = function () {
        var observable = this.refCountObservable;
        var obsConnection = observable.connection;
        var subConnection = this.connection;
        if (subConnection && subConnection === obsConnection) {
            observable.refCount = 0;
            obsConnection.unsubscribe();
            observable.connection = null;
            this.unsubscribe();
        }
    };
    RefCountSubscriber.prototype._unsubscribe = function () {
        var observable = this.refCountObservable;
        if (observable.refCount === 0) {
            return;
        }
        if (--observable.refCount === 0) {
            var obsConnection = observable.connection;
            var subConnection = this.connection;
            if (subConnection && subConnection === obsConnection) {
                obsConnection.unsubscribe();
                observable.connection = null;
            }
        }
    };
    return RefCountSubscriber;
}(Subscriber_1.Subscriber));

},{"../Observable":19,"../Subscriber":24,"../Subscription":25}],37:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Observable_1 = require('../Observable');
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var EmptyObservable = (function (_super) {
    __extends(EmptyObservable, _super);
    function EmptyObservable(scheduler) {
        _super.call(this);
        this.scheduler = scheduler;
    }
    /**
     * Creates an Observable that emits no items to the Observer and immediately
     * emits a complete notification.
     *
     * <span class="informal">Just emits 'complete', and nothing else.
     * </span>
     *
     * <img src="./img/empty.png" width="100%">
     *
     * This static operator is useful for creating a simple Observable that only
     * emits the complete notification. It can be used for composing with other
     * Observables, such as in a {@link mergeMap}.
     *
     * @example <caption>Emit the number 7, then complete.</caption>
     * var result = Rx.Observable.empty().startWith(7);
     * result.subscribe(x => console.log(x));
     *
     * @example <caption>Map and flatten only odd numbers to the sequence 'a', 'b', 'c'</caption>
     * var interval = Rx.Observable.interval(1000);
     * var result = interval.mergeMap(x =>
     *   x % 2 === 1 ? Rx.Observable.of('a', 'b', 'c') : Rx.Observable.empty()
     * );
     * result.subscribe(x => console.log(x));
     *
     * @see {@link create}
     * @see {@link never}
     * @see {@link of}
     * @see {@link throw}
     *
     * @param {Scheduler} [scheduler] A {@link Scheduler} to use for scheduling
     * the emission of the complete notification.
     * @return {Observable} An "empty" Observable: emits only the complete
     * notification.
     * @static true
     * @name empty
     * @owner Observable
     */
    EmptyObservable.create = function (scheduler) {
        return new EmptyObservable(scheduler);
    };
    EmptyObservable.dispatch = function (arg) {
        var subscriber = arg.subscriber;
        subscriber.complete();
    };
    EmptyObservable.prototype._subscribe = function (subscriber) {
        var scheduler = this.scheduler;
        if (scheduler) {
            return scheduler.schedule(EmptyObservable.dispatch, 0, { subscriber: subscriber });
        }
        else {
            subscriber.complete();
        }
    };
    return EmptyObservable;
}(Observable_1.Observable));
exports.EmptyObservable = EmptyObservable;

},{"../Observable":19}],38:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Observable_1 = require('../Observable');
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var ScalarObservable = (function (_super) {
    __extends(ScalarObservable, _super);
    function ScalarObservable(value, scheduler) {
        _super.call(this);
        this.value = value;
        this.scheduler = scheduler;
        this._isScalar = true;
    }
    ScalarObservable.create = function (value, scheduler) {
        return new ScalarObservable(value, scheduler);
    };
    ScalarObservable.dispatch = function (state) {
        var done = state.done, value = state.value, subscriber = state.subscriber;
        if (done) {
            subscriber.complete();
            return;
        }
        subscriber.next(value);
        if (subscriber.isUnsubscribed) {
            return;
        }
        state.done = true;
        this.schedule(state);
    };
    ScalarObservable.prototype._subscribe = function (subscriber) {
        var value = this.value;
        var scheduler = this.scheduler;
        if (scheduler) {
            return scheduler.schedule(ScalarObservable.dispatch, 0, {
                done: false, value: value, subscriber: subscriber
            });
        }
        else {
            subscriber.next(value);
            if (!subscriber.isUnsubscribed) {
                subscriber.complete();
            }
        }
    };
    return ScalarObservable;
}(Observable_1.Observable));
exports.ScalarObservable = ScalarObservable;

},{"../Observable":19}],39:[function(require,module,exports){
"use strict";
var ArrayObservable_1 = require('./ArrayObservable');
exports.of = ArrayObservable_1.ArrayObservable.of;

},{"./ArrayObservable":35}],40:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ArrayObservable_1 = require('../observable/ArrayObservable');
var isArray_1 = require('../util/isArray');
var isScheduler_1 = require('../util/isScheduler');
var OuterSubscriber_1 = require('../OuterSubscriber');
var subscribeToResult_1 = require('../util/subscribeToResult');
/**
 * Combines multiple Observables to create an Observable whose values are
 * calculated from the latest values of each of its input Observables.
 *
 * <span class="informal">Whenever any input Observable emits a value, it
 * computes a formula using the latest values from all the inputs, then emits
 * the output of that formula.</span>
 *
 * <img src="./img/combineLatest.png" width="100%">
 *
 * `combineLatest` combines the values from this Observable with values from
 * Observables passed as arguments. This is done by subscribing to each
 * Observable, in order, and collecting an array of each of the most recent
 * values any time any of the input Observables emits, then either taking that
 * array and passing it as arguments to an optional `project` function and
 * emitting the return value of that, or just emitting the array of recent
 * values directly if there is no `project` function.
 *
 * @example <caption>Dynamically calculate the Body-Mass Index from an Observable of weight and one for height</caption>
 * var weight = Rx.Observable.of(70, 72, 76, 79, 75);
 * var height = Rx.Observable.of(1.76, 1.77, 1.78);
 * var bmi = weight.combineLatest(height, (w, h) => w / (h * h));
 * bmi.subscribe(x => console.log('BMI is ' + x));
 *
 * @see {@link combineAll}
 * @see {@link merge}
 * @see {@link withLatestFrom}
 *
 * @param {Observable} other An input Observable to combine with the source
 * Observable. More than one input Observables may be given as argument.
 * @param {function} [project] An optional function to project the values from
 * the combined latest values into a new value on the output Observable.
 * @return {Observable} An Observable of projected values from the most recent
 * values from each input Observable, or an array of the most recent values from
 * each input Observable.
 * @method combineLatest
 * @owner Observable
 */
function combineLatest() {
    var observables = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        observables[_i - 0] = arguments[_i];
    }
    var project = null;
    if (typeof observables[observables.length - 1] === 'function') {
        project = observables.pop();
    }
    // if the first and only other argument besides the resultSelector is an array
    // assume it's been called with `combineLatest([obs1, obs2, obs3], project)`
    if (observables.length === 1 && isArray_1.isArray(observables[0])) {
        observables = observables[0];
    }
    observables.unshift(this);
    return new ArrayObservable_1.ArrayObservable(observables).lift(new CombineLatestOperator(project));
}
exports.combineLatest = combineLatest;
/* tslint:enable:max-line-length */
/**
 * Combines the values from observables passed as arguments. This is done by subscribing
 * to each observable, in order, and collecting an array of each of the most recent values any time any of the observables
 * emits, then either taking that array and passing it as arguments to an option `project` function and emitting the return
 * value of that, or just emitting the array of recent values directly if there is no `project` function.
 * @param {...Observable} observables the observables to combine
 * @param {function} [project] an optional function to project the values from the combined recent values into a new value for emission.
 * @return {Observable} an observable of other projected values from the most recent values from each observable, or an array of each of
 * the most recent values from each observable.
 * @static true
 * @name combineLatest
 * @owner Observable
 */
function combineLatestStatic() {
    var observables = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        observables[_i - 0] = arguments[_i];
    }
    var project = null;
    var scheduler = null;
    if (isScheduler_1.isScheduler(observables[observables.length - 1])) {
        scheduler = observables.pop();
    }
    if (typeof observables[observables.length - 1] === 'function') {
        project = observables.pop();
    }
    // if the first and only other argument besides the resultSelector is an array
    // assume it's been called with `combineLatest([obs1, obs2, obs3], project)`
    if (observables.length === 1 && isArray_1.isArray(observables[0])) {
        observables = observables[0];
    }
    return new ArrayObservable_1.ArrayObservable(observables, scheduler).lift(new CombineLatestOperator(project));
}
exports.combineLatestStatic = combineLatestStatic;
var CombineLatestOperator = (function () {
    function CombineLatestOperator(project) {
        this.project = project;
    }
    CombineLatestOperator.prototype.call = function (subscriber, source) {
        return source._subscribe(new CombineLatestSubscriber(subscriber, this.project));
    };
    return CombineLatestOperator;
}());
exports.CombineLatestOperator = CombineLatestOperator;
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var CombineLatestSubscriber = (function (_super) {
    __extends(CombineLatestSubscriber, _super);
    function CombineLatestSubscriber(destination, project) {
        _super.call(this, destination);
        this.project = project;
        this.active = 0;
        this.values = [];
        this.observables = [];
        this.toRespond = [];
    }
    CombineLatestSubscriber.prototype._next = function (observable) {
        var toRespond = this.toRespond;
        toRespond.push(toRespond.length);
        this.observables.push(observable);
    };
    CombineLatestSubscriber.prototype._complete = function () {
        var observables = this.observables;
        var len = observables.length;
        if (len === 0) {
            this.destination.complete();
        }
        else {
            this.active = len;
            for (var i = 0; i < len; i++) {
                var observable = observables[i];
                this.add(subscribeToResult_1.subscribeToResult(this, observable, observable, i));
            }
        }
    };
    CombineLatestSubscriber.prototype.notifyComplete = function (unused) {
        if ((this.active -= 1) === 0) {
            this.destination.complete();
        }
    };
    CombineLatestSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        var values = this.values;
        values[outerIndex] = innerValue;
        var toRespond = this.toRespond;
        if (toRespond.length > 0) {
            var found = toRespond.indexOf(outerIndex);
            if (found !== -1) {
                toRespond.splice(found, 1);
            }
        }
        if (toRespond.length === 0) {
            if (this.project) {
                this._tryProject(values);
            }
            else {
                this.destination.next(values);
            }
        }
    };
    CombineLatestSubscriber.prototype._tryProject = function (values) {
        var result;
        try {
            result = this.project.apply(this, values);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this.destination.next(result);
    };
    return CombineLatestSubscriber;
}(OuterSubscriber_1.OuterSubscriber));
exports.CombineLatestSubscriber = CombineLatestSubscriber;

},{"../OuterSubscriber":21,"../observable/ArrayObservable":35,"../util/isArray":57,"../util/isScheduler":61,"../util/subscribeToResult":63}],41:[function(require,module,exports){
"use strict";
var isScheduler_1 = require('../util/isScheduler');
var ArrayObservable_1 = require('../observable/ArrayObservable');
var mergeAll_1 = require('./mergeAll');
/**
 * Creates an output Observable which sequentially emits all values from every
 * given input Observable after the current Observable.
 *
 * <span class="informal">Concatenates multiple Observables together by
 * sequentially emitting their values, one Observable after the other.</span>
 *
 * <img src="./img/concat.png" width="100%">
 *
 * Joins this Observable with multiple other Observables by subscribing to them
 * one at a time, starting with the source, and merging their results into the
 * output Observable. Will wait for each Observable to complete before moving
 * on to the next.
 *
 * @example <caption>Concatenate a timer counting from 0 to 3 with a synchronous sequence from 1 to 10</caption>
 * var timer = Rx.Observable.interval(1000).take(4);
 * var sequence = Rx.Observable.range(1, 10);
 * var result = timer.concat(sequence);
 * result.subscribe(x => console.log(x));
 *
 * @example <caption>Concatenate 3 Observables</caption>
 * var timer1 = Rx.Observable.interval(1000).take(10);
 * var timer2 = Rx.Observable.interval(2000).take(6);
 * var timer3 = Rx.Observable.interval(500).take(10);
 * var result = timer1.concat(timer2, timer3);
 * result.subscribe(x => console.log(x));
 *
 * @see {@link concatAll}
 * @see {@link concatMap}
 * @see {@link concatMapTo}
 *
 * @param {Observable} other An input Observable to concatenate after the source
 * Observable. More than one input Observables may be given as argument.
 * @param {Scheduler} [scheduler=null] An optional Scheduler to schedule each
 * Observable subscription on.
 * @return {Observable} All values of each passed Observable merged into a
 * single Observable, in order, in serial fashion.
 * @method concat
 * @owner Observable
 */
function concat() {
    var observables = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        observables[_i - 0] = arguments[_i];
    }
    return concatStatic.apply(void 0, [this].concat(observables));
}
exports.concat = concat;
/* tslint:enable:max-line-length */
/**
 * Creates an output Observable which sequentially emits all values from every
 * given input Observable after the current Observable.
 *
 * <span class="informal">Concatenates multiple Observables together by
 * sequentially emitting their values, one Observable after the other.</span>
 *
 * <img src="./img/concat.png" width="100%">
 *
 * Joins multiple Observables together by subscribing to them one at a time and
 * merging their results into the output Observable. Will wait for each
 * Observable to complete before moving on to the next.
 *
 * @example <caption>Concatenate a timer counting from 0 to 3 with a synchronous sequence from 1 to 10</caption>
 * var timer = Rx.Observable.interval(1000).take(4);
 * var sequence = Rx.Observable.range(1, 10);
 * var result = Rx.Observable.concat(timer, sequence);
 * result.subscribe(x => console.log(x));
 *
 * @example <caption>Concatenate 3 Observables</caption>
 * var timer1 = Rx.Observable.interval(1000).take(10);
 * var timer2 = Rx.Observable.interval(2000).take(6);
 * var timer3 = Rx.Observable.interval(500).take(10);
 * var result = Rx.Observable.concat(timer1, timer2, timer3);
 * result.subscribe(x => console.log(x));
 *
 * @see {@link concatAll}
 * @see {@link concatMap}
 * @see {@link concatMapTo}
 *
 * @param {Observable} input1 An input Observable to concatenate with others.
 * @param {Observable} input2 An input Observable to concatenate with others.
 * More than one input Observables may be given as argument.
 * @param {Scheduler} [scheduler=null] An optional Scheduler to schedule each
 * Observable subscription on.
 * @return {Observable} All values of each passed Observable merged into a
 * single Observable, in order, in serial fashion.
 * @static true
 * @name concat
 * @owner Observable
 */
function concatStatic() {
    var observables = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        observables[_i - 0] = arguments[_i];
    }
    var scheduler = null;
    var args = observables;
    if (isScheduler_1.isScheduler(args[observables.length - 1])) {
        scheduler = args.pop();
    }
    return new ArrayObservable_1.ArrayObservable(observables, scheduler).lift(new mergeAll_1.MergeAllOperator(1));
}
exports.concatStatic = concatStatic;

},{"../observable/ArrayObservable":35,"../util/isScheduler":61,"./mergeAll":45}],42:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Subscriber_1 = require('../Subscriber');
/**
 * Applies a given `project` function to each value emitted by the source
 * Observable, and emits the resulting values as an Observable.
 *
 * <span class="informal">Like [Array.prototype.map()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map),
 * it passes each source value through a transformation function to get
 * corresponding output values.</span>
 *
 * <img src="./img/map.png" width="100%">
 *
 * Similar to the well known `Array.prototype.map` function, this operator
 * applies a projection to each value and emits that projection in the output
 * Observable.
 *
 * @example <caption>Map every every click to the clientX position of that click</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var positions = clicks.map(ev => ev.clientX);
 * positions.subscribe(x => console.log(x));
 *
 * @see {@link mapTo}
 * @see {@link pluck}
 *
 * @param {function(value: T, index: number): R} project The function to apply
 * to each `value` emitted by the source Observable. The `index` parameter is
 * the number `i` for the i-th emission that has happened since the
 * subscription, starting from the number `0`.
 * @param {any} [thisArg] An optional argument to define what `this` is in the
 * `project` function.
 * @return {Observable<R>} An Observable that emits the values from the source
 * Observable transformed by the given `project` function.
 * @method map
 * @owner Observable
 */
function map(project, thisArg) {
    if (typeof project !== 'function') {
        throw new TypeError('argument is not a function. Are you looking for `mapTo()`?');
    }
    return this.lift(new MapOperator(project, thisArg));
}
exports.map = map;
var MapOperator = (function () {
    function MapOperator(project, thisArg) {
        this.project = project;
        this.thisArg = thisArg;
    }
    MapOperator.prototype.call = function (subscriber, source) {
        return source._subscribe(new MapSubscriber(subscriber, this.project, this.thisArg));
    };
    return MapOperator;
}());
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var MapSubscriber = (function (_super) {
    __extends(MapSubscriber, _super);
    function MapSubscriber(destination, project, thisArg) {
        _super.call(this, destination);
        this.project = project;
        this.count = 0;
        this.thisArg = thisArg || this;
    }
    // NOTE: This looks unoptimized, but it's actually purposefully NOT
    // using try/catch optimizations.
    MapSubscriber.prototype._next = function (value) {
        var result;
        try {
            result = this.project.call(this.thisArg, value, this.count++);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this.destination.next(result);
    };
    return MapSubscriber;
}(Subscriber_1.Subscriber));

},{"../Subscriber":24}],43:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Subscriber_1 = require('../Subscriber');
/**
 * Emits the given constant value on the output Observable every time the source
 * Observable emits a value.
 *
 * <span class="informal">Like {@link map}, but it maps every source value to
 * the same output value every time.</span>
 *
 * <img src="./img/mapTo.png" width="100%">
 *
 * Takes a constant `value` as argument, and emits that whenever the source
 * Observable emits a value. In other words, ignores the actual source value,
 * and simply uses the emission moment to know when to emit the given `value`.
 *
 * @example <caption>Map every every click to the string 'Hi'</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var greetings = clicks.mapTo('Hi');
 * greetings.subscribe(x => console.log(x));
 *
 * @see {@link map}
 *
 * @param {any} value The value to map each source value to.
 * @return {Observable} An Observable that emits the given `value` every time
 * the source Observable emits something.
 * @method mapTo
 * @owner Observable
 */
function mapTo(value) {
    return this.lift(new MapToOperator(value));
}
exports.mapTo = mapTo;
var MapToOperator = (function () {
    function MapToOperator(value) {
        this.value = value;
    }
    MapToOperator.prototype.call = function (subscriber, source) {
        return source._subscribe(new MapToSubscriber(subscriber, this.value));
    };
    return MapToOperator;
}());
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var MapToSubscriber = (function (_super) {
    __extends(MapToSubscriber, _super);
    function MapToSubscriber(destination, value) {
        _super.call(this, destination);
        this.value = value;
    }
    MapToSubscriber.prototype._next = function (x) {
        this.destination.next(this.value);
    };
    return MapToSubscriber;
}(Subscriber_1.Subscriber));

},{"../Subscriber":24}],44:[function(require,module,exports){
"use strict";
var ArrayObservable_1 = require('../observable/ArrayObservable');
var mergeAll_1 = require('./mergeAll');
var isScheduler_1 = require('../util/isScheduler');
/**
 * Creates an output Observable which concurrently emits all values from every
 * given input Observable.
 *
 * <span class="informal">Flattens multiple Observables together by blending
 * their values into one Observable.</span>
 *
 * <img src="./img/merge.png" width="100%">
 *
 * `merge` subscribes to each given input Observable (either the source or an
 * Observable given as argument), and simply forwards (without doing any
 * transformation) all the values from all the input Observables to the output
 * Observable. The output Observable only completes once all input Observables
 * have completed. Any error delivered by an input Observable will be immediately
 * emitted on the output Observable.
 *
 * @example <caption>Merge together two Observables: 1s interval and clicks</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var timer = Rx.Observable.interval(1000);
 * var clicksOrTimer = clicks.merge(timer);
 * clicksOrTimer.subscribe(x => console.log(x));
 *
 * @example <caption>Merge together 3 Observables, but only 2 run concurrently</caption>
 * var timer1 = Rx.Observable.interval(1000).take(10);
 * var timer2 = Rx.Observable.interval(2000).take(6);
 * var timer3 = Rx.Observable.interval(500).take(10);
 * var concurrent = 2; // the argument
 * var merged = timer1.merge(timer2, timer3, concurrent);
 * merged.subscribe(x => console.log(x));
 *
 * @see {@link mergeAll}
 * @see {@link mergeMap}
 * @see {@link mergeMapTo}
 * @see {@link mergeScan}
 *
 * @param {Observable} other An input Observable to merge with the source
 * Observable. More than one input Observables may be given as argument.
 * @param {number} [concurrent=Number.POSITIVE_INFINITY] Maximum number of input
 * Observables being subscribed to concurrently.
 * @param {Scheduler} [scheduler=null] The Scheduler to use for managing
 * concurrency of input Observables.
 * @return {Observable} an Observable that emits items that are the result of
 * every input Observable.
 * @method merge
 * @owner Observable
 */
function merge() {
    var observables = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        observables[_i - 0] = arguments[_i];
    }
    observables.unshift(this);
    return mergeStatic.apply(this, observables);
}
exports.merge = merge;
/* tslint:enable:max-line-length */
/**
 * Creates an output Observable which concurrently emits all values from every
 * given input Observable.
 *
 * <span class="informal">Flattens multiple Observables together by blending
 * their values into one Observable.</span>
 *
 * <img src="./img/merge.png" width="100%">
 *
 * `merge` subscribes to each given input Observable (as arguments), and simply
 * forwards (without doing any transformation) all the values from all the input
 * Observables to the output Observable. The output Observable only completes
 * once all input Observables have completed. Any error delivered by an input
 * Observable will be immediately emitted on the output Observable.
 *
 * @example <caption>Merge together two Observables: 1s interval and clicks</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var timer = Rx.Observable.interval(1000);
 * var clicksOrTimer = Rx.Observable.merge(clicks, timer);
 * clicksOrTimer.subscribe(x => console.log(x));
 *
 * @example <caption>Merge together 3 Observables, but only 2 run concurrently</caption>
 * var timer1 = Rx.Observable.interval(1000).take(10);
 * var timer2 = Rx.Observable.interval(2000).take(6);
 * var timer3 = Rx.Observable.interval(500).take(10);
 * var concurrent = 2; // the argument
 * var merged = Rx.Observable.merge(timer1, timer2, timer3, concurrent);
 * merged.subscribe(x => console.log(x));
 *
 * @see {@link mergeAll}
 * @see {@link mergeMap}
 * @see {@link mergeMapTo}
 * @see {@link mergeScan}
 *
 * @param {Observable} input1 An input Observable to merge with others.
 * @param {Observable} input2 An input Observable to merge with others.
 * @param {number} [concurrent=Number.POSITIVE_INFINITY] Maximum number of input
 * Observables being subscribed to concurrently.
 * @param {Scheduler} [scheduler=null] The Scheduler to use for managing
 * concurrency of input Observables.
 * @return {Observable} an Observable that emits items that are the result of
 * every input Observable.
 * @static true
 * @name merge
 * @owner Observable
 */
function mergeStatic() {
    var observables = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        observables[_i - 0] = arguments[_i];
    }
    var concurrent = Number.POSITIVE_INFINITY;
    var scheduler = null;
    var last = observables[observables.length - 1];
    if (isScheduler_1.isScheduler(last)) {
        scheduler = observables.pop();
        if (observables.length > 1 && typeof observables[observables.length - 1] === 'number') {
            concurrent = observables.pop();
        }
    }
    else if (typeof last === 'number') {
        concurrent = observables.pop();
    }
    if (observables.length === 1) {
        return observables[0];
    }
    return new ArrayObservable_1.ArrayObservable(observables, scheduler).lift(new mergeAll_1.MergeAllOperator(concurrent));
}
exports.mergeStatic = mergeStatic;

},{"../observable/ArrayObservable":35,"../util/isScheduler":61,"./mergeAll":45}],45:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var OuterSubscriber_1 = require('../OuterSubscriber');
var subscribeToResult_1 = require('../util/subscribeToResult');
/**
 * Converts a higher-order Observable into a first-order Observable which
 * concurrently delivers all values that are emitted on the inner Observables.
 *
 * <span class="informal">Flattens an Observable-of-Observables.</span>
 *
 * <img src="./img/mergeAll.png" width="100%">
 *
 * `mergeAll` subscribes to an Observable that emits Observables, also known as
 * a higher-order Observable. Each time it observes one of these emitted inner
 * Observables, it subscribes to that and delivers all the values from the
 * inner Observable on the output Observable. The output Observable only
 * completes once all inner Observables have completed. Any error delivered by
 * a inner Observable will be immediately emitted on the output Observable.
 *
 * @example <caption>Spawn a new interval Observable for each click event, and blend their outputs as one Observable</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var higherOrder = clicks.map((ev) => Rx.Observable.interval(1000));
 * var firstOrder = higherOrder.mergeAll();
 * firstOrder.subscribe(x => console.log(x));
 *
 * @example <caption>Count from 0 to 9 every second for each click, but only allow 2 concurrent timers</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var higherOrder = clicks.map((ev) => Rx.Observable.interval(1000).take(10));
 * var firstOrder = higherOrder.mergeAll(2);
 * firstOrder.subscribe(x => console.log(x));
 *
 * @see {@link combineAll}
 * @see {@link concatAll}
 * @see {@link exhaust}
 * @see {@link merge}
 * @see {@link mergeMap}
 * @see {@link mergeMapTo}
 * @see {@link mergeScan}
 * @see {@link switch}
 * @see {@link zipAll}
 *
 * @param {number} [concurrent=Number.POSITIVE_INFINITY] Maximum number of inner
 * Observables being subscribed to concurrently.
 * @return {Observable} An Observable that emits values coming from all the
 * inner Observables emitted by the source Observable.
 * @method mergeAll
 * @owner Observable
 */
function mergeAll(concurrent) {
    if (concurrent === void 0) { concurrent = Number.POSITIVE_INFINITY; }
    return this.lift(new MergeAllOperator(concurrent));
}
exports.mergeAll = mergeAll;
var MergeAllOperator = (function () {
    function MergeAllOperator(concurrent) {
        this.concurrent = concurrent;
    }
    MergeAllOperator.prototype.call = function (observer, source) {
        return source._subscribe(new MergeAllSubscriber(observer, this.concurrent));
    };
    return MergeAllOperator;
}());
exports.MergeAllOperator = MergeAllOperator;
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var MergeAllSubscriber = (function (_super) {
    __extends(MergeAllSubscriber, _super);
    function MergeAllSubscriber(destination, concurrent) {
        _super.call(this, destination);
        this.concurrent = concurrent;
        this.hasCompleted = false;
        this.buffer = [];
        this.active = 0;
    }
    MergeAllSubscriber.prototype._next = function (observable) {
        if (this.active < this.concurrent) {
            this.active++;
            this.add(subscribeToResult_1.subscribeToResult(this, observable));
        }
        else {
            this.buffer.push(observable);
        }
    };
    MergeAllSubscriber.prototype._complete = function () {
        this.hasCompleted = true;
        if (this.active === 0 && this.buffer.length === 0) {
            this.destination.complete();
        }
    };
    MergeAllSubscriber.prototype.notifyComplete = function (innerSub) {
        var buffer = this.buffer;
        this.remove(innerSub);
        this.active--;
        if (buffer.length > 0) {
            this._next(buffer.shift());
        }
        else if (this.active === 0 && this.hasCompleted) {
            this.destination.complete();
        }
    };
    return MergeAllSubscriber;
}(OuterSubscriber_1.OuterSubscriber));
exports.MergeAllSubscriber = MergeAllSubscriber;

},{"../OuterSubscriber":21,"../util/subscribeToResult":63}],46:[function(require,module,exports){
"use strict";
var ConnectableObservable_1 = require('../observable/ConnectableObservable');
/**
 * Returns an Observable that emits the results of invoking a specified selector on items
 * emitted by a ConnectableObservable that shares a single subscription to the underlying stream.
 *
 * <img src="./img/multicast.png" width="100%">
 *
 * @param {Function} selector - a function that can use the multicasted source stream
 * as many times as needed, without causing multiple subscriptions to the source stream.
 * Subscribers to the given source will receive all notifications of the source from the
 * time of the subscription forward.
 * @return {Observable} an Observable that emits the results of invoking the selector
 * on the items emitted by a `ConnectableObservable` that shares a single subscription to
 * the underlying stream.
 * @method multicast
 * @owner Observable
 */
function multicast(subjectOrSubjectFactory) {
    var subjectFactory;
    if (typeof subjectOrSubjectFactory === 'function') {
        subjectFactory = subjectOrSubjectFactory;
    }
    else {
        subjectFactory = function subjectFactory() {
            return subjectOrSubjectFactory;
        };
    }
    return new ConnectableObservable_1.ConnectableObservable(this, subjectFactory);
}
exports.multicast = multicast;

},{"../observable/ConnectableObservable":36}],47:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Subscriber_1 = require('../Subscriber');
/**
 * Applies an accumulation function over the source Observable, and returns each
 * intermediate result, with an optional seed value.
 *
 * <span class="informal">It's like {@link reduce}, but emits the current
 * accumulation whenever the source emits a value.</span>
 *
 * <img src="./img/scan.png" width="100%">
 *
 * Combines together all values emitted on the source, using an accumulator
 * function that knows how to join a new source value into the accumulation from
 * the past. Is similar to {@link reduce}, but emits the intermediate
 * accumulations.
 *
 * Returns an Observable that applies a specified `accumulator` function to each
 * item emitted by the source Observable. If a `seed` value is specified, then
 * that value will be used as the initial value for the accumulator. If no seed
 * value is specified, the first item of the source is used as the seed.
 *
 * @example <caption>Count the number of click events</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var ones = clicks.mapTo(1);
 * var seed = 0;
 * var count = ones.scan((acc, one) => acc + one, seed);
 * count.subscribe(x => console.log(x));
 *
 * @see {@link expand}
 * @see {@link mergeScan}
 * @see {@link reduce}
 *
 * @param {function(acc: R, value: T): R} accumulator The accumulator function
 * called on each source value.
 * @param {T|R} [seed] The initial accumulation value.
 * @return {Observable<R>} An observable of the accumulated values.
 * @method scan
 * @owner Observable
 */
function scan(accumulator, seed) {
    return this.lift(new ScanOperator(accumulator, seed));
}
exports.scan = scan;
var ScanOperator = (function () {
    function ScanOperator(accumulator, seed) {
        this.accumulator = accumulator;
        this.seed = seed;
    }
    ScanOperator.prototype.call = function (subscriber, source) {
        return source._subscribe(new ScanSubscriber(subscriber, this.accumulator, this.seed));
    };
    return ScanOperator;
}());
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var ScanSubscriber = (function (_super) {
    __extends(ScanSubscriber, _super);
    function ScanSubscriber(destination, accumulator, seed) {
        _super.call(this, destination);
        this.accumulator = accumulator;
        this.accumulatorSet = false;
        this.seed = seed;
        this.accumulator = accumulator;
        this.accumulatorSet = typeof seed !== 'undefined';
    }
    Object.defineProperty(ScanSubscriber.prototype, "seed", {
        get: function () {
            return this._seed;
        },
        set: function (value) {
            this.accumulatorSet = true;
            this._seed = value;
        },
        enumerable: true,
        configurable: true
    });
    ScanSubscriber.prototype._next = function (value) {
        if (!this.accumulatorSet) {
            this.seed = value;
            this.destination.next(value);
        }
        else {
            return this._tryNext(value);
        }
    };
    ScanSubscriber.prototype._tryNext = function (value) {
        var result;
        try {
            result = this.accumulator(this.seed, value);
        }
        catch (err) {
            this.destination.error(err);
        }
        this.seed = result;
        this.destination.next(result);
    };
    return ScanSubscriber;
}(Subscriber_1.Subscriber));

},{"../Subscriber":24}],48:[function(require,module,exports){
"use strict";
var multicast_1 = require('./multicast');
var Subject_1 = require('../Subject');
function shareSubjectFactory() {
    return new Subject_1.Subject();
}
/**
 * Returns a new Observable that multicasts (shares) the original Observable. As long as there is at least one
 * Subscriber this Observable will be subscribed and emitting data. When all subscribers have unsubscribed it will
 * unsubscribe from the source Observable. Because the Observable is multicasting it makes the stream `hot`.
 * This is an alias for .publish().refCount().
 *
 * <img src="./img/share.png" width="100%">
 *
 * @return {Observable<T>} an Observable that upon connection causes the source Observable to emit items to its Observers
 * @method share
 * @owner Observable
 */
function share() {
    return multicast_1.multicast.call(this, shareSubjectFactory).refCount();
}
exports.share = share;
;

},{"../Subject":22,"./multicast":46}],49:[function(require,module,exports){
"use strict";
var ArrayObservable_1 = require('../observable/ArrayObservable');
var ScalarObservable_1 = require('../observable/ScalarObservable');
var EmptyObservable_1 = require('../observable/EmptyObservable');
var concat_1 = require('./concat');
var isScheduler_1 = require('../util/isScheduler');
/**
 * Returns an Observable that emits the items in a specified Iterable before it begins to emit items emitted by the
 * source Observable.
 *
 * <img src="./img/startWith.png" width="100%">
 *
 * @param {Values} an Iterable that contains the items you want the modified Observable to emit first.
 * @return {Observable} an Observable that emits the items in the specified Iterable and then emits the items
 * emitted by the source Observable.
 * @method startWith
 * @owner Observable
 */
function startWith() {
    var array = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        array[_i - 0] = arguments[_i];
    }
    var scheduler = array[array.length - 1];
    if (isScheduler_1.isScheduler(scheduler)) {
        array.pop();
    }
    else {
        scheduler = null;
    }
    var len = array.length;
    if (len === 1) {
        return concat_1.concatStatic(new ScalarObservable_1.ScalarObservable(array[0], scheduler), this);
    }
    else if (len > 1) {
        return concat_1.concatStatic(new ArrayObservable_1.ArrayObservable(array, scheduler), this);
    }
    else {
        return concat_1.concatStatic(new EmptyObservable_1.EmptyObservable(scheduler), this);
    }
}
exports.startWith = startWith;

},{"../observable/ArrayObservable":35,"../observable/EmptyObservable":37,"../observable/ScalarObservable":38,"../util/isScheduler":61,"./concat":41}],50:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var OuterSubscriber_1 = require('../OuterSubscriber');
var subscribeToResult_1 = require('../util/subscribeToResult');
/**
 * Projects each source value to an Observable which is merged in the output
 * Observable, emitting values only from the most recently projected Observable.
 *
 * <span class="informal">Maps each value to an Observable, then flattens all of
 * these inner Observables using {@link switch}.</span>
 *
 * <img src="./img/switchMap.png" width="100%">
 *
 * Returns an Observable that emits items based on applying a function that you
 * supply to each item emitted by the source Observable, where that function
 * returns an (so-called "inner") Observable. Each time it observes one of these
 * inner Observables, the output Observable begins emitting the items emitted by
 * that inner Observable. When a new inner Observable is emitted, `switchMap`
 * stops emitting items from the earlier-emitted inner Observable and begins
 * emitting items from the new one. It continues to behave like this for
 * subsequent inner Observables.
 *
 * @example <caption>Rerun an interval Observable on every click event</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.switchMap((ev) => Rx.Observable.interval(1000));
 * result.subscribe(x => console.log(x));
 *
 * @see {@link concatMap}
 * @see {@link exhaustMap}
 * @see {@link mergeMap}
 * @see {@link switch}
 * @see {@link switchMapTo}
 *
 * @param {function(value: T, ?index: number): Observable} project A function
 * that, when applied to an item emitted by the source Observable, returns an
 * Observable.
 * @param {function(outerValue: T, innerValue: I, outerIndex: number, innerIndex: number): any} [resultSelector]
 * A function to produce the value on the output Observable based on the values
 * and the indices of the source (outer) emission and the inner Observable
 * emission. The arguments passed to this function are:
 * - `outerValue`: the value that came from the source
 * - `innerValue`: the value that came from the projected Observable
 * - `outerIndex`: the "index" of the value that came from the source
 * - `innerIndex`: the "index" of the value from the projected Observable
 * @return {Observable} An Observable that emits the result of applying the
 * projection function (and the optional `resultSelector`) to each item emitted
 * by the source Observable and taking only the values from the most recently
 * projected inner Observable.
 * @method switchMap
 * @owner Observable
 */
function switchMap(project, resultSelector) {
    return this.lift(new SwitchMapOperator(project, resultSelector));
}
exports.switchMap = switchMap;
var SwitchMapOperator = (function () {
    function SwitchMapOperator(project, resultSelector) {
        this.project = project;
        this.resultSelector = resultSelector;
    }
    SwitchMapOperator.prototype.call = function (subscriber, source) {
        return source._subscribe(new SwitchMapSubscriber(subscriber, this.project, this.resultSelector));
    };
    return SwitchMapOperator;
}());
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SwitchMapSubscriber = (function (_super) {
    __extends(SwitchMapSubscriber, _super);
    function SwitchMapSubscriber(destination, project, resultSelector) {
        _super.call(this, destination);
        this.project = project;
        this.resultSelector = resultSelector;
        this.index = 0;
    }
    SwitchMapSubscriber.prototype._next = function (value) {
        var result;
        var index = this.index++;
        try {
            result = this.project(value, index);
        }
        catch (error) {
            this.destination.error(error);
            return;
        }
        this._innerSub(result, value, index);
    };
    SwitchMapSubscriber.prototype._innerSub = function (result, value, index) {
        var innerSubscription = this.innerSubscription;
        if (innerSubscription) {
            innerSubscription.unsubscribe();
        }
        this.add(this.innerSubscription = subscribeToResult_1.subscribeToResult(this, result, value, index));
    };
    SwitchMapSubscriber.prototype._complete = function () {
        var innerSubscription = this.innerSubscription;
        if (!innerSubscription || innerSubscription.isUnsubscribed) {
            _super.prototype._complete.call(this);
        }
    };
    SwitchMapSubscriber.prototype._unsubscribe = function () {
        this.innerSubscription = null;
    };
    SwitchMapSubscriber.prototype.notifyComplete = function (innerSub) {
        this.remove(innerSub);
        this.innerSubscription = null;
        if (this.isStopped) {
            _super.prototype._complete.call(this);
        }
    };
    SwitchMapSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        if (this.resultSelector) {
            this._tryNotifyNext(outerValue, innerValue, outerIndex, innerIndex);
        }
        else {
            this.destination.next(innerValue);
        }
    };
    SwitchMapSubscriber.prototype._tryNotifyNext = function (outerValue, innerValue, outerIndex, innerIndex) {
        var result;
        try {
            result = this.resultSelector(outerValue, innerValue, outerIndex, innerIndex);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this.destination.next(result);
    };
    return SwitchMapSubscriber;
}(OuterSubscriber_1.OuterSubscriber));

},{"../OuterSubscriber":21,"../util/subscribeToResult":63}],51:[function(require,module,exports){
"use strict";
var root_1 = require('../util/root');
var Symbol = root_1.root.Symbol;
if (typeof Symbol === 'function') {
    if (Symbol.iterator) {
        exports.$$iterator = Symbol.iterator;
    }
    else if (typeof Symbol.for === 'function') {
        exports.$$iterator = Symbol.for('iterator');
    }
}
else {
    if (root_1.root.Set && typeof new root_1.root.Set()['@@iterator'] === 'function') {
        // Bug for mozilla version
        exports.$$iterator = '@@iterator';
    }
    else if (root_1.root.Map) {
        // es6-shim specific logic
        var keys = Object.getOwnPropertyNames(root_1.root.Map.prototype);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (key !== 'entries' && key !== 'size' && root_1.root.Map.prototype[key] === root_1.root.Map.prototype['entries']) {
                exports.$$iterator = key;
                break;
            }
        }
    }
    else {
        exports.$$iterator = '@@iterator';
    }
}

},{"../util/root":62}],52:[function(require,module,exports){
"use strict";
var root_1 = require('../util/root');
var Symbol = root_1.root.Symbol;
if (typeof Symbol === 'function') {
    if (Symbol.observable) {
        exports.$$observable = Symbol.observable;
    }
    else {
        if (typeof Symbol.for === 'function') {
            exports.$$observable = Symbol.for('observable');
        }
        else {
            exports.$$observable = Symbol('observable');
        }
        Symbol.observable = exports.$$observable;
    }
}
else {
    exports.$$observable = '@@observable';
}

},{"../util/root":62}],53:[function(require,module,exports){
"use strict";
var root_1 = require('../util/root');
var Symbol = root_1.root.Symbol;
exports.$$rxSubscriber = (typeof Symbol === 'function' && typeof Symbol.for === 'function') ?
    Symbol.for('rxSubscriber') : '@@rxSubscriber';

},{"../util/root":62}],54:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
 * An error thrown when an action is invalid because the object has been
 * unsubscribed.
 *
 * @see {@link Subject}
 * @see {@link BehaviorSubject}
 *
 * @class ObjectUnsubscribedError
 */
var ObjectUnsubscribedError = (function (_super) {
    __extends(ObjectUnsubscribedError, _super);
    function ObjectUnsubscribedError() {
        _super.call(this, 'object unsubscribed');
        this.name = 'ObjectUnsubscribedError';
    }
    return ObjectUnsubscribedError;
}(Error));
exports.ObjectUnsubscribedError = ObjectUnsubscribedError;

},{}],55:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
 * An error thrown when one or more errors have occurred during the
 * `unsubscribe` of a {@link Subscription}.
 */
var UnsubscriptionError = (function (_super) {
    __extends(UnsubscriptionError, _super);
    function UnsubscriptionError(errors) {
        _super.call(this);
        this.errors = errors;
        this.name = 'UnsubscriptionError';
        this.message = errors ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function (err, i) { return ((i + 1) + ") " + err.toString()); }).join('\n') : '';
    }
    return UnsubscriptionError;
}(Error));
exports.UnsubscriptionError = UnsubscriptionError;

},{}],56:[function(require,module,exports){
"use strict";
// typeof any so that it we don't have to cast when comparing a result to the error object
exports.errorObject = { e: {} };

},{}],57:[function(require,module,exports){
"use strict";
exports.isArray = Array.isArray || (function (x) { return x && typeof x.length === 'number'; });

},{}],58:[function(require,module,exports){
"use strict";
function isFunction(x) {
    return typeof x === 'function';
}
exports.isFunction = isFunction;

},{}],59:[function(require,module,exports){
"use strict";
function isObject(x) {
    return x != null && typeof x === 'object';
}
exports.isObject = isObject;

},{}],60:[function(require,module,exports){
"use strict";
function isPromise(value) {
    return value && typeof value.subscribe !== 'function' && typeof value.then === 'function';
}
exports.isPromise = isPromise;

},{}],61:[function(require,module,exports){
"use strict";
function isScheduler(value) {
    return value && typeof value.schedule === 'function';
}
exports.isScheduler = isScheduler;

},{}],62:[function(require,module,exports){
(function (global){
"use strict";
var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
};
exports.root = (objectTypes[typeof self] && self) || (objectTypes[typeof window] && window);
/* tslint:disable:no-unused-variable */
var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;
var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;
var freeGlobal = objectTypes[typeof global] && global;
if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
    exports.root = freeGlobal;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],63:[function(require,module,exports){
"use strict";
var root_1 = require('./root');
var isArray_1 = require('./isArray');
var isPromise_1 = require('./isPromise');
var Observable_1 = require('../Observable');
var iterator_1 = require('../symbol/iterator');
var observable_1 = require('../symbol/observable');
var InnerSubscriber_1 = require('../InnerSubscriber');
function subscribeToResult(outerSubscriber, result, outerValue, outerIndex) {
    var destination = new InnerSubscriber_1.InnerSubscriber(outerSubscriber, outerValue, outerIndex);
    if (destination.isUnsubscribed) {
        return;
    }
    if (result instanceof Observable_1.Observable) {
        if (result._isScalar) {
            destination.next(result.value);
            destination.complete();
            return;
        }
        else {
            return result.subscribe(destination);
        }
    }
    if (isArray_1.isArray(result)) {
        for (var i = 0, len = result.length; i < len && !destination.isUnsubscribed; i++) {
            destination.next(result[i]);
        }
        if (!destination.isUnsubscribed) {
            destination.complete();
        }
    }
    else if (isPromise_1.isPromise(result)) {
        result.then(function (value) {
            if (!destination.isUnsubscribed) {
                destination.next(value);
                destination.complete();
            }
        }, function (err) { return destination.error(err); })
            .then(null, function (err) {
            // Escaping the Promise trap: globally throw unhandled errors
            root_1.root.setTimeout(function () { throw err; });
        });
        return destination;
    }
    else if (typeof result[iterator_1.$$iterator] === 'function') {
        for (var _i = 0, _a = result; _i < _a.length; _i++) {
            var item = _a[_i];
            destination.next(item);
            if (destination.isUnsubscribed) {
                break;
            }
        }
        if (!destination.isUnsubscribed) {
            destination.complete();
        }
    }
    else if (typeof result[observable_1.$$observable] === 'function') {
        var obs = result[observable_1.$$observable]();
        if (typeof obs.subscribe !== 'function') {
            destination.error('invalid observable');
        }
        else {
            return obs.subscribe(new InnerSubscriber_1.InnerSubscriber(outerSubscriber, outerValue, outerIndex));
        }
    }
    else {
        destination.error(new TypeError('unknown type returned'));
    }
}
exports.subscribeToResult = subscribeToResult;

},{"../InnerSubscriber":18,"../Observable":19,"../symbol/iterator":51,"../symbol/observable":52,"./isArray":57,"./isPromise":60,"./root":62}],64:[function(require,module,exports){
"use strict";
function throwError(e) { throw e; }
exports.throwError = throwError;

},{}],65:[function(require,module,exports){
"use strict";
var Subscriber_1 = require('../Subscriber');
var rxSubscriber_1 = require('../symbol/rxSubscriber');
function toSubscriber(nextOrObserver, error, complete) {
    if (nextOrObserver && typeof nextOrObserver === 'object') {
        if (nextOrObserver instanceof Subscriber_1.Subscriber) {
            return nextOrObserver;
        }
        else if (typeof nextOrObserver[rxSubscriber_1.$$rxSubscriber] === 'function') {
            return nextOrObserver[rxSubscriber_1.$$rxSubscriber]();
        }
    }
    return new Subscriber_1.Subscriber(nextOrObserver, error, complete);
}
exports.toSubscriber = toSubscriber;

},{"../Subscriber":24,"../symbol/rxSubscriber":53}],66:[function(require,module,exports){
"use strict";
var errorObject_1 = require('./errorObject');
var tryCatchTarget;
function tryCatcher() {
    try {
        return tryCatchTarget.apply(this, arguments);
    }
    catch (e) {
        errorObject_1.errorObject.e = e;
        return errorObject_1.errorObject;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}
exports.tryCatch = tryCatch;
;

},{"./errorObject":56}],67:[function(require,module,exports){
var hiddenStore = require('./hidden-store.js');

module.exports = createStore;

function createStore() {
    var key = {};

    return function (obj) {
        if ((typeof obj !== 'object' || obj === null) &&
            typeof obj !== 'function'
        ) {
            throw new Error('Weakmap-shim: Key must be object')
        }

        var store = obj.valueOf(key);
        return store && store.identity === key ?
            store : hiddenStore(obj, key);
    };
}

},{"./hidden-store.js":68}],68:[function(require,module,exports){
module.exports = hiddenStore;

function hiddenStore(obj, key) {
    var store = { identity: key };
    var valueOf = obj.valueOf;

    Object.defineProperty(obj, "valueOf", {
        value: function (value) {
            return value !== key ?
                valueOf.apply(this, arguments) : store;
        },
        writable: true
    });

    return store;
}

},{}],69:[function(require,module,exports){
(function (global){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var CustomEvent = exports.CustomEvent = global.CustomEvent || function () {
  var DEFAULT_PARAMS = { bubbles: false, cancelable: false, detail: undefined };

  function _CustomEvent(_event, _params) {
    var params = _extends({}, DEFAULT_PARAMS, _params);
    var event = document.createEvent("CustomEvent");

    event.initCustomEvent(_event, params.bubbles, params.cancelable, params.detail);
    return event;
  }

  return _CustomEvent;
}();
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],70:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NodeProxy = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* @flow */

var _document = require('global/document');

var _document2 = _interopRequireDefault(_document);

var _propertyDescriptors = require('./propertyDescriptors');

var _eventDelegator = require('./eventDelegator');

var _mountable = require('./mountable');

var _is = require('./is');

var _get = require('./get');

var _set = require('./set');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NodeProxy = exports.NodeProxy = function () {
  function NodeProxy(node /*: HTMLElement*/) {
    _classCallCheck(this, NodeProxy);

    this._node = node;
  }

  _createClass(NodeProxy, [{
    key: 'emitMount',
    value: function emitMount(fn /*: Function*/) {
      (0, _mountable.emitMount)(this._node, fn);
    }
  }, {
    key: 'emitUnmount',
    value: function emitUnmount(fn /*: Function*/) {
      (0, _mountable.emitUnmount)(this._node, fn);
    }
  }, {
    key: 'children',
    value: function children() {
      return this._node.children;
    }
  }, {
    key: 'replaceChild',
    value: function replaceChild(childProxy /*: NodeProxy*/, index /*: number*/) {
      var node = this._node;
      var child = childProxy._node;
      var replaced = node.children[index];

      if ((0, _is.isDefined)(replaced)) {
        node.replaceChild(child, replaced);
      } else {
        node.appendChild(child);
      }
    }
  }, {
    key: 'insertChild',
    value: function insertChild(childProxy /*: NodeProxy*/, index /*: number*/) {
      var node = this._node;
      var child = childProxy._node;
      var before /*: Node*/ = node.children[index];

      if ((0, _is.isDefined)(before)) {
        node.insertBefore(child, before);
      } else {
        node.appendChild(child);
      }
    }
  }, {
    key: 'removeChild',
    value: function removeChild(childProxy /*: NodeProxy*/) {
      var node = this._node;
      var child = childProxy._node;
      node.removeChild(child);
    }
  }, {
    key: 'getAttribute',
    value: function getAttribute(key /*: string*/) {
      var node = this._node;
      var descriptor = (0, _get.get)(_propertyDescriptors.descriptors, key);

      if (!descriptor) {
        return (0, _get.get)(node, key);
      }

      if (descriptor.useEqualSetter) {
        return (0, _get.get)(node, descriptor.computed);
      }

      return node.getAttribute(descriptor.computed);
    }
  }, {
    key: 'setAttribute',
    value: function setAttribute(key /*: string*/, value /*: any*/) {
      var node = this._node;
      var descriptor = (0, _get.get)(_propertyDescriptors.descriptors, key);

      if (!descriptor) {
        (0, _set.set)(node, key, value);
        return;
      }

      var computed = descriptor.computed;


      if (descriptor.useEqualSetter) {
        (0, _set.set)(node, computed, value);
        return;
      }

      if (descriptor.hasBooleanValue && !value) {
        node.removeAttribute(computed);
        return;
      }

      if (descriptor.useEventListener) {
        (0, _eventDelegator.addEventListener)(node, computed, value);
        return;
      }

      node.setAttribute(computed, value);
    }
  }, {
    key: 'removeAttribute',
    value: function removeAttribute(key /*: string*/) {
      var node = this._node;
      var descriptor = (0, _get.get)(_propertyDescriptors.descriptors, key);

      if (!descriptor) {
        (0, _set.set)(node, key, undefined);
        return;
      }

      var computed = descriptor.computed;


      if (descriptor.useSetAttribute) {
        node.removeAttribute(computed);
        return;
      }

      if (descriptor.hasBooleanValue) {
        (0, _set.set)(node, computed, false);
        return;
      }

      if (descriptor.useEventListener) {
        (0, _eventDelegator.removeEventListener)(node, computed);
        return;
      }

      (0, _set.set)(node, computed, undefined);
    }
  }], [{
    key: 'createElement',
    value: function createElement(tagName /*: string*/) {
      var node /*: HTMLElement*/ = _document2.default.createElement(tagName);
      return new NodeProxy(node);
    }
  }, {
    key: 'querySelector',
    value: function querySelector(selector /*: string*/) {
      var node /*: HTMLElement*/ = _document2.default.querySelector(selector);
      return new NodeProxy(node);
    }
  }, {
    key: 'fromElement',
    value: function fromElement(node /*: HTMLElement*/) {
      return new NodeProxy(node);
    }
  }]);

  return NodeProxy;
}();
},{"./eventDelegator":83,"./get":86,"./is":89,"./mountable":91,"./propertyDescriptors":93,"./set":95,"global/document":12}],71:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VirtualComponent = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* @flow */

var _cuid = require('cuid');

var _cuid2 = _interopRequireDefault(_cuid);

var _createEventHandler2 = require('./createEventHandler');

var _createComponentProps = require('./createComponentProps');

var _createCompositeSubject = require('./createCompositeSubject');

var _createObservableFromArray = require('./createObservableFromArray');

var _symbol = require('./symbol');

var _set = require('./set');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*:: import type {Observable} from 'rxjs/Observable'*/
/*:: import type {Subject} from 'rxjs/Subject'*/
/*:: import type {NodeProxy} from './NodeProxy'*/
/*:: import type {VirtualElement} from './types'*/


var createCompositeArraySubject = (0, _createCompositeSubject.createCompositeSubject)(_createObservableFromArray.createObservableFromArray);

var appendUidToComponent = function appendUidToComponent(fn /*: Function*/) /*: string*/ {
  if (!fn[_symbol.$$componentUid]) {
    fn[_symbol.$$componentUid] = (0, _cuid2.default)();
  }

  return fn[_symbol.$$componentUid];
};

var VirtualComponent = exports.VirtualComponent = function () {
  function VirtualComponent(fn /*: Function*/, tagName /*: string*/, props /*: Object*/, children /*: Array<VirtualElement>*/, key /*:: ?: string*/) {
    _classCallCheck(this, VirtualComponent);

    this.key = key;
    this.tagName = tagName;
    this._fn = fn;
    this._props = props;
    this._children = children;
    this._eventHandlers = [];
  }

  _createClass(VirtualComponent, [{
    key: 'getNodeProxy',
    value: function getNodeProxy() {
      return this._instance.getNodeProxy();
    }
  }, {
    key: 'initialize',
    value: function initialize() {
      var _this = this;

      var props = this._props$ = (0, _createComponentProps.createComponentProps)(this._props);
      var children = this._children$ = createCompositeArraySubject(this._children);

      var _createEventHandler = function _createEventHandler() {
        var handler = _createEventHandler2.createEventHandler.apply(undefined, arguments);
        _this._eventHandlers.push(handler);
        return handler;
      };

      var instance = this._instance = this._fn.call(null, { props: props.asObject(), children: children, createEventHandler: _createEventHandler });
      instance.initialize();
    }
  }, {
    key: 'afterInsert',
    value: function afterInsert() {
      this._instance.afterInsert();
    }
  }, {
    key: 'patch',
    value: function patch(next /*: VirtualComponent*/) {
      next._eventHandlers = this._eventHandlers;
      next._instance = this._instance;
      next._props$ = this._props$;
      next._children$ = this._children$;

      this._eventHandlers = [];
      this._instance = null;
      this._props$ = null;
      this._children$ = null;

      next._props$.next(next._props);
      next._children$.next(next._children);
    }
  }, {
    key: 'beforeDestroy',
    value: function beforeDestroy() {
      this._instance.beforeDestroy();
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this._eventHandlers.forEach(function (h) {
        return !h.hasCompleted && h.complete();
      });
      this._instance.destroy();
      this._children.forEach(function (c) {
        return c.destroy();
      });
    }
  }, {
    key: 'insertChild',
    value: function insertChild(__child /*: any*/, __index /*: any*/) {}
  }, {
    key: 'moveChild',
    value: function moveChild(__child /*: any*/, __index /*: any*/) {}
  }, {
    key: 'removeChild',
    value: function removeChild(__child /*: any*/) {}
  }], [{
    key: 'create',
    value: function create(fn /*: Function*/, props /*: Object*/, children /*: Array<Observable|VirtualElement>*/) {
      var uid = appendUidToComponent(fn);

      return new VirtualComponent(fn, uid, props, children, props.key);
    }
  }]);

  return VirtualComponent;
}();

(0, _set.set)(VirtualComponent.prototype, _symbol.$$virtual, true);
},{"./createComponentProps":75,"./createCompositeSubject":76,"./createEventHandler":77,"./createObservableFromArray":79,"./set":95,"./symbol":96,"cuid":3}],72:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VirtualNode = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* @flow */

var _NodeProxy = require('./NodeProxy');

var _wrapText = require('./wrapText');

var _parseTag = require('./parseTag');

var _batchInsertMessages = require('./batchInsertMessages');

var _createPatchProperties = require('./createPatchProperties');

var _createPatchChildren = require('./createPatchChildren');

var _createCompositeSubject = require('./createCompositeSubject');

var _createNodeProps = require('./createNodeProps');

var _createObservableFromArray = require('./createObservableFromArray');

var _flatten = require('./flatten');

var _symbol = require('./symbol');

var _set = require('./set');

require('rxjs/add/operator/map');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*:: import type {Observable} from 'rxjs/Observable'*/
/*:: import type {Subject} from 'rxjs/Subject'*/
/*:: import type {Subscription} from 'rxjs/Subscription'*/
/*:: import type {VirtualElement, NodeProxyDecorator} from './types'*/


var createCompositePropSubject = (0, _createCompositeSubject.createCompositeSubject)(_createNodeProps.createNodeProps);
var createCompositeArraySubject = (0, _createCompositeSubject.createCompositeSubject)(_createObservableFromArray.createObservableFromArray);

var VirtualNode = exports.VirtualNode = function () {
  function VirtualNode(tagName /*: string*/, props /*: Object*/, children /*: Array<VirtualElement>*/, key /*:: ?: string*/) {
    _classCallCheck(this, VirtualNode);

    this.key = key;
    this.tagName = tagName;
    this._props = props;
    this._children = children;
    this._subscriptions = [];
  }

  _createClass(VirtualNode, [{
    key: 'getNodeProxy',
    value: function getNodeProxy() {
      return this._nodeProxy;
    }
  }, {
    key: 'initialize',
    value: function initialize() {
      var nodeProxy /*: NodeProxy*/ = this._nodeProxy = _NodeProxy.NodeProxy.createElement(this.tagName);
      var props$ /*: Subject<Object>*/ = this._props$ = createCompositePropSubject(this._props);
      var children$ /*: Subject<Array<VirtualNode>>*/ = this._children$ = createCompositeArraySubject(this._children);

      var nodeProxyDecorator /*: NodeProxyDecorator*/ = {
        insertChild: function insertChild(child /*: VirtualNode*/, index /*: number*/) {
          return (0, _batchInsertMessages.batchInsertMessages)(function (queue) {
            child.initialize();
            nodeProxy.insertChild(child.getNodeProxy(), index);
            queue.push(child);
          });
        },
        updateChild: function updateChild(previous /*: VirtualNode*/, next /*: VirtualNode*/) {
          previous.patch(next);
        },
        moveChild: function moveChild(previous /*: VirtualNode*/, next /*: VirtualNode*/, index /*: number*/) {
          previous.patch(next);
          nodeProxy.insertChild(next.getNodeProxy(), index);
        },
        removeChild: function removeChild(child /*: VirtualNode*/) {
          child.beforeDestroy();
          nodeProxy.removeChild(child.getNodeProxy());
          child.destroy();
        }
      };

      var propSub = props$.subscribe((0, _createPatchProperties.createPatchProperties)(nodeProxy));

      var childrenSub = children$.map(_flatten.flatten).map(_wrapText.wrapText).subscribe((0, _createPatchChildren.createPatchChildren)(nodeProxyDecorator));

      this._subscriptions.push(propSub);
      this._subscriptions.push(childrenSub);
    }
  }, {
    key: 'afterInsert',
    value: function afterInsert() {
      this._nodeProxy.emitMount(this._props.onMount);
    }
  }, {
    key: 'patch',
    value: function patch(next /*: VirtualNode*/) {
      next._nodeProxy = this._nodeProxy;
      next._props$ = this._props$;
      next._children$ = this._children$;

      next._props$.next(next._props);
      next._children$.next(next._children);
    }
  }, {
    key: 'beforeDestroy',
    value: function beforeDestroy() {
      this._nodeProxy.emitUnmount(this._props.onUnmount);
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this._subscriptions.forEach(function (s) {
        return s.unsubscribe();
      });
      this._children.forEach(function (c) {
        return c.destroy();
      });
    }
  }], [{
    key: 'create',
    value: function create(_tagName /*: string*/, props /*: Object*/, children /*: Array<VirtualNode|Observable>*/) {
      var tagName /*: string*/ = (0, _parseTag.parseTag)(_tagName, props);
      var key /*: string*/ = props.key || null;

      return new VirtualNode(tagName, props, children, key);
    }
  }]);

  return VirtualNode;
}();

(0, _set.set)(VirtualNode.prototype, _symbol.$$virtual, true);
},{"./NodeProxy":70,"./batchInsertMessages":74,"./createCompositeSubject":76,"./createNodeProps":78,"./createObservableFromArray":79,"./createPatchChildren":80,"./createPatchProperties":81,"./flatten":85,"./parseTag":92,"./set":95,"./symbol":96,"./wrapText":98,"rxjs/add/operator/map":28}],73:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.asObservable = asObservable;

var _Observable = require('rxjs/Observable');

var _is = require('./is');

require('rxjs/add/observable/of');

function asObservable(obj /*: any*/) /*: Observable<any>*/ {
  if ((0, _is.isObservable)(obj)) {
    return obj;
  }

  return _Observable.Observable.of(obj);
} /* @flow */
},{"./is":89,"rxjs/Observable":19,"rxjs/add/observable/of":27}],74:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.batchInsertMessages = batchInsertMessages;
/* @flow */

/*:: import type {VirtualNode} from './VirtualNode'*/
/*:: type Scope = {
  batchInProgress: boolean;
  queue: Array<VirtualNode>;
}*/


var scope /*: Scope*/ = {
  batchInProgress: false,
  queue: []
};

function flushQueue(queue /*: Array<VirtualNode>*/) /*: void*/ {
  while (queue.length > 0) {
    var vnode = scope.queue.pop();
    vnode.afterInsert();
  }
}

function batchInsertMessages(callback /*: Function*/, a /*: any*/, b /*: any*/, c /*: any*/) /*: any*/ {
  if (scope.batchInProgress) {
    return callback(scope.queue, a, b, c);
  }

  scope.batchInProgress = true;

  var result = callback(scope.queue, a, b, c);
  flushQueue(scope.queue);

  scope.batchInProgress = false;

  return result;
}
},{}],75:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createComponentProps = createComponentProps;

var _BehaviorSubject = require('rxjs/BehaviorSubject');

var _is = require('./is');

/* @flow */

/*:: type ComponentProps = {
  asObject (): Object,
  next (v: Object): void,
}*/
function createComponentProps(_props /*: Object*/) /*: ComponentProps*/ {
  var keys /*: Array<string>*/ = Object.keys(_props);
  var plainValueKeys /*: Object*/ = {};

  var props /*: Object*/ = {};
  var len /*: number*/ = keys.length;
  var i /*: number*/ = -1;

  while (++i < len) {
    var key = keys[i];
    var value = _props[key];

    if ((0, _is.isObservable)(value)) {
      props[key] = value;
    } else {
      plainValueKeys[key] = true;
      props[key] = new _BehaviorSubject.BehaviorSubject(value);
    }
  }

  return {
    asObject: function asObject() {
      return props;
    },
    next: function (_next) {
      function next(_x) {
        return _next.apply(this, arguments);
      }

      next.toString = function () {
        return _next.toString();
      };

      return next;
    }(function (next /*: Object*/) {
      var j /*: number*/ = -1;

      while (++j < len) {
        var _key /*: string*/ = keys[j];
        var _value /*: any*/ = next[_key];
        var old /*: any*/ = props[_key];

        if (plainValueKeys[_key]) {
          old.next(_value);
        } else if (_value !== old) {
          throw new Error('Observable prop "' + _key + '" changed to different observable');
        }
      }
    })
  };
}
},{"./is":89,"rxjs/BehaviorSubject":17}],76:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCompositeSubject = undefined;

var _Observable = require('rxjs/Observable');

var _Observer = require('rxjs/Observer');

var _Subject = require('rxjs/Subject');

var _Subscription = require('rxjs/Subscription');

var _BehaviorSubject = require('rxjs/BehaviorSubject');

require('rxjs/add/operator/switchMap');

/* @flow */

var createCompositeSubject = exports.createCompositeSubject = function createCompositeSubject(switchMapFn /*: Function*/) /*: Function*/ {
  return function (value /*: any*/) /*: Subject<any>*/ {
    var behavior /*: BehaviorSubject*/ = new _BehaviorSubject.BehaviorSubject(value);

    var observable /*: Observable*/ = _Observable.Observable.create(function (observer /*: Observer*/) /*: Function*/ {
      var subscription /*: Subscription*/ = behavior.switchMap(switchMapFn).subscribe(observer);
      return function () {
        return subscription.unsubscribe();
      };
    });

    return _Subject.Subject.create(behavior, observable);
  };
};
},{"rxjs/BehaviorSubject":17,"rxjs/Observable":19,"rxjs/Observer":20,"rxjs/Subject":22,"rxjs/Subscription":25,"rxjs/add/operator/switchMap":34}],77:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createEventHandler = createEventHandler;

var _Observable = require('rxjs/Observable');

var _Observer = require('rxjs/Observer');

var _Subject = require('rxjs/Subject');

var _Subscription = require('rxjs/Subscription');

var _is = require('./is');

require('rxjs/add/operator/map');

require('rxjs/add/operator/mapTo');

require('rxjs/add/operator/share');

/* @flow */

function wrapMapFn(obs /*: Subject*/, mapFn /*:: ?: any*/) /*: Observable*/ {
  var mapFnIsDefined /*: boolean*/ = (0, _is.isDefined)(mapFn);
  var mapFnIsFunction /*: boolean*/ = (0, _is.isFunction)(mapFn);

  if (mapFnIsDefined && mapFnIsFunction) {
    return obs.map(mapFn);
  } else if (mapFnIsDefined) {
    return obs.mapTo(mapFn);
  }

  return obs;
}

function createEventHandler(mapFn /*:: ?: any*/, init /*:: ?: any*/) /*: Subject*/ {
  var subject /*: Subject*/ = new _Subject.Subject();

  var observable /*: Observable*/ = _Observable.Observable.create(function (observer /*: Observer*/) /*: Function*/ {
    var subscription /*: Subscription*/ = wrapMapFn(subject, mapFn).subscribe(observer);

    if ((0, _is.isDefined)(init)) {
      observer.next(init);
    }

    return function () {
      subscription.unsubscribe();
    };
  });

  return _Subject.Subject.create(subject, observable.share());
}
},{"./is":89,"rxjs/Observable":19,"rxjs/Observer":20,"rxjs/Subject":22,"rxjs/Subscription":25,"rxjs/add/operator/map":28,"rxjs/add/operator/mapTo":29,"rxjs/add/operator/share":32}],78:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createNodeProps = createNodeProps;

var _Observable = require('rxjs/Observable');

var _eventsList = require('./eventsList');

var _asObservable = require('./asObservable');

var _is = require('./is');

require('rxjs/add/observable/of');

require('rxjs/add/observable/combineLatest');

/* @flow */

var wrapValue = function wrapValue(key, value) {
  if (_eventsList.eventListMap[key] && (0, _is.isSubject)(value)) {
    return (0, _asObservable.asObservable)(value.next.bind(value));
  }

  return (0, _asObservable.asObservable)(value);
};

function createNodeProps(obj /*: Object*/) /*: Observable<Object>*/ {
  if ((0, _is.isEmptyObject)(obj)) {
    return _Observable.Observable.of(obj);
  }

  var keys /*: Array<string>*/ = Object.keys(obj);
  var len /*: number*/ = keys.length;
  var values /*: Array<Observable>*/ = Array(len);
  var i /*: number*/ = -1;

  while (++i < len) {
    var key /*: string*/ = keys[i];
    var value /*: any*/ = obj[key];
    values[i] = wrapValue(key, value);
  }

  return _Observable.Observable.combineLatest(values, function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var newObj /*: Object*/ = {};
    i = -1;

    while (++i < len) {
      var _key2 /*: string*/ = keys[i];
      newObj[_key2] = args[i];
    }

    return newObj;
  });
}
},{"./asObservable":73,"./eventsList":84,"./is":89,"rxjs/Observable":19,"rxjs/add/observable/combineLatest":26,"rxjs/add/observable/of":27}],79:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createObservableFromArray = createObservableFromArray;

var _Observable = require('rxjs/Observable');

var _asObservable = require('./asObservable');

require('rxjs/add/observable/of');

require('rxjs/add/observable/combineLatest');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } } /* @flow */

function createObservableFromArray(arr /*: Array<any>*/) /*: Observable<Array<any>>*/ {
  if (arr.length === 0) {
    return _Observable.Observable.of(arr);
  }

  var observables /*: Array<Observable>*/ = arr.map(_asObservable.asObservable);

  return _Observable.Observable.combineLatest.apply(_Observable.Observable, _toConsumableArray(observables));
}
},{"./asObservable":73,"rxjs/Observable":19,"rxjs/add/observable/combineLatest":26,"rxjs/add/observable/of":27}],80:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createPatchChildren = undefined;

var _dift = require('dift');

var _dift2 = _interopRequireDefault(_dift);

var _keyIndex = require('./keyIndex');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* @flow */

/*:: import type {VirtualElement, NodeProxyDecorator} from './types'*/


var keyFn /*: Function*/ = function keyFn(a) {
  return a.key;
};

var patch = function patch(decorator /*: NodeProxyDecorator*/, previousChildren /*: Array<VirtualElement>*/, nextChildren /*: Array<VirtualElement>*/) /*: void*/ {
  var previousIndex = (0, _keyIndex.keyIndex)(previousChildren);
  var nextIndex = (0, _keyIndex.keyIndex)(nextChildren);

  function apply(type /*: number*/, previous /*: Object*/, next /*: Object*/, index /*: number*/) /*: void*/ {
    switch (type) {
      case _dift.CREATE:
        decorator.insertChild(next.vnode, index);
        break;
      case _dift.UPDATE:
        decorator.updateChild(previous.vnode, next.vnode, index);
        break;
      case _dift.MOVE:
        decorator.moveChild(previous.vnode, next.vnode, index);
        break;
      case _dift.REMOVE:
        decorator.removeChild(previous.vnode);
        break;
      default:
        return;
    }
  }

  (0, _dift2.default)(previousIndex, nextIndex, apply, keyFn);
};

var createPatchChildren = exports.createPatchChildren = function createPatchChildren(decorator /*: NodeProxyDecorator*/) /*: Function*/ {
  var previous /*: Array<VirtualElement>*/ = [];

  return function (next /*: Array<VirtualElement>*/) /*: Array<VirtualElement>*/ {
    if (previous.length !== 0 || next.length !== 0) {
      patch(decorator, previous, next);
    }

    previous = next;
    return next;
  };
};
},{"./keyIndex":90,"dift":4}],81:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createPatchProperties = createPatchProperties;
/* @flow */

/*:: import type {NodeProxy} from './NodeProxy'*/


function patchProperties(nodeProxy /*: NodeProxy*/, props /*: Object*/, oldProps /*: Object*/) /*: Object*/ {
  for (var key in props) {
    if (props[key] !== oldProps[key]) {
      nodeProxy.setAttribute(key, props[key]);
    }
  }

  for (var _key in oldProps) {
    if (!(_key in props)) {
      nodeProxy.removeAttribute(_key);
    }
  }

  return props;
}

function createPatchProperties(nodeProxy /*: NodeProxy*/) /*: Function*/ {
  var previous /*: Object*/ = {};

  return function (next /*: Object*/) /*: void*/ {
    previous = patchProperties(nodeProxy, next, previous);
  };
}
},{}],82:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/* @flow */

var emptyObject = exports.emptyObject = Object.freeze({});
},{}],83:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.removeEventListener = exports.addEventListener = undefined;

var _domDelegator = require('dom-delegator');

var _domDelegator2 = _interopRequireDefault(_domDelegator);

var _domDelegator3 = require('dom-delegator/dom-delegator');

var _domDelegator4 = _interopRequireDefault(_domDelegator3);

var _eventsList = require('./eventsList');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var delegator /*: DomDelegator*/ = (0, _domDelegator2.default)(); /* @flow */

var len /*: number*/ = _eventsList.eventsList.length;
var i /*: number*/ = -1;

while (++i < len) {
  var event /*: string*/ = _eventsList.eventsList[i].toLowerCase();
  delegator.listenTo(event);
}

var addEventListener = exports.addEventListener = delegator.addEventListener.bind(delegator);
var removeEventListener = exports.removeEventListener = delegator.removeEventListener.bind(delegator);
},{"./eventsList":84,"dom-delegator":7,"dom-delegator/dom-delegator":6}],84:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/* @flow */

var eventsList /*: Array<string>*/ = exports.eventsList = ["Abort", "Blur", "Cancel", "CanPlay", "CanPlayThrough", "Change", "Click", "CompositionStart", "CompositionUpdate", "CompositionEnd", "ContextMenu", "Copy", "CueChange", "Cut", "DblClick", "Drag", "DragEnd", "DragExit", "DragEnter", "DragLeave", "DragOver", "DragStart", "Drop", "DurationChange", "Emptied", "Encrypted", "Ended", "Error", "Focus", "FocusIn", "FocusOut", "Input", "Invalid", "KeyDown", "KeyPress", "KeyUp", "Load", "LoadedData", "LoadedMetaData", "LoadStart", "MouseDown", "MouseEnter", "MouseLeave", "MouseMove", "MouseOut", "MouseOver", "MouseUp", "Paste", "Pause", "Play", "Playing", "Progress", "RateChange", "Reset", "Resize", "Scroll", "Search", "Seeked", "Seeking", "Select", "Show", "Stalled", "Submit", "Suspend", "TimeUpdate", "Toggle", "TouchCancel", "TouchEnd", "TouchMove", "TouchStart", "VolumeChange", "Waiting", "Wheel",

// custom
"Mount", "Unmount"];

var eventListMap /*: Object*/ = exports.eventListMap = eventsList.reduce(function (acc, event) {
  acc["on" + event] = true;
  return acc;
}, {});
},{}],85:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.flatten = flatten;
/* @flow */

function flatten(arr /*: Array<any>*/) /*: Array<any>*/ {
  var len /*: number*/ = arr.length;
  var i /*: number*/ = -1;
  var result /*: Array<any>*/ = [];

  while (++i < len) {
    var member /*: any*/ = arr[i];

    if (Array.isArray(member)) {
      result = result.concat(flatten(member));
    } else {
      result.push(member);
    }
  }

  return result;
}
},{}],86:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.get = get;
function get(obj, key) {
  return obj[key];
}
},{}],87:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.h = h;

var _VirtualComponent = require('./VirtualComponent');

var _VirtualNode = require('./VirtualNode');

var _is = require('./is');

var _flatten = require('./flatten');

var _emptyObject = require('./emptyObject');

/*:: import type {VirtualElement} from './types'*/ /* @flow weak */

function h(tagName, _props) /*: VirtualElement*/ {
  for (var _len = arguments.length, _children = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    _children[_key - 2] = arguments[_key];
  }

  var children = (0, _flatten.flatten)(_children);
  var props = _props || _emptyObject.emptyObject;

  if ((0, _is.isString)(tagName)) {
    return _VirtualNode.VirtualNode.create(tagName, props, children);
  }

  return _VirtualComponent.VirtualComponent.create(tagName, props, children);
}
},{"./VirtualComponent":71,"./VirtualNode":72,"./emptyObject":82,"./flatten":85,"./is":89}],88:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.render = exports.h = undefined;

var _h = require('./h');

var _render = require('./render');

function Yolk() {}
Yolk.prototype = { h: _h.h, render: _render.render };

exports.h = _h.h;
exports.render = _render.render;
exports.default = new Yolk();
},{"./h":87,"./render":94}],89:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isDefined = isDefined;
exports.isEmptyObject = isEmptyObject;
exports.isFunction = isFunction;
exports.isNumber = isNumber;
exports.isObservable = isObservable;
exports.isString = isString;
exports.isSubject = isSubject;
exports.isVirtual = isVirtual;

var _Observable = require('rxjs/Observable');

var _Subject = require('rxjs/Subject');

var _symbol = require('./symbol');

function isDefined(obj /*: any*/) /*: boolean*/ {
  return typeof obj !== 'undefined';
} /* @flow */

function isEmptyObject(obj /*: any*/) /*: boolean*/ {
  return Object.keys(obj).length === 0;
}

function isFunction(obj /*: any*/) /*: boolean*/ {
  return Object.prototype.toString.call(obj) === '[object Function]';
}

function isNumber(obj /*: any*/) /*: boolean*/ {
  return typeof obj === 'number';
}

function isObservable(obj /*: any*/) /*: boolean*/ {
  return obj instanceof _Observable.Observable;
}

function isString(obj /*: any*/) /*: boolean*/ {
  return typeof obj === 'string';
}

function isSubject(obj /*: any*/) /*: boolean*/ {
  return obj instanceof _Subject.Subject;
}

function isVirtual(obj /*: any*/) /*: boolean*/ {
  return !!obj && obj[_symbol.$$virtual];
}
},{"./symbol":96,"rxjs/Observable":19,"rxjs/Subject":22}],90:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.keyIndex = keyIndex;
/* @flow */

/*:: import type {VirtualNode} from './VirtualNode'*/
function keyIndex(children /*: Array<VirtualNode>*/) /*: Array<Object>*/ {
  var len /*: number*/ = children.length;
  var arr /*: Array<Object>*/ = [];
  var i /*: number*/ = -1;

  while (++i < len) {
    var child /*: VirtualNode*/ = children[i];

    if (!child) {
      continue;
    }

    arr.push({
      key: child.key ? child.tagName + '-' + child.key : child.tagName,
      vnode: child
    });
  }

  return arr;
}
},{}],91:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.emitMount = emitMount;
exports.emitUnmount = emitUnmount;

var _CustomEvent = require('./CustomEvent');

var _is = require('./is');

/* @flow */

function emitMount(node /*: HTMLElement*/, fn /*: Function | void*/) /*: void*/ {
  if (((0, _is.isFunction)(fn) || (0, _is.isSubject)(fn)) && node.parentNode) {
    var event /*: CustomEvent*/ = new _CustomEvent.CustomEvent('mount');
    node.dispatchEvent(event);
  }
}

function emitUnmount(node /*: HTMLElement*/, fn /*: Function | void*/) /*: void*/ {
  if (((0, _is.isFunction)(fn) || (0, _is.isSubject)(fn)) && node.parentNode) {
    var event /*: CustomEvent*/ = new _CustomEvent.CustomEvent('unmount');
    node.dispatchEvent(event);
  }
}
},{"./CustomEvent":69,"./is":89}],92:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseTag = parseTag;

var _parseTag = require('parse-tag');

var _parseTag2 = _interopRequireDefault(_parseTag);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var TAG_IS_ONLY_LETTERS = /^[a-zA-Z]*$/;

function parseTag(_tagName, props) {
  var tagName = _tagName;

  if (!TAG_IS_ONLY_LETTERS.test(tagName)) {
    tagName = (0, _parseTag2.default)(_tagName, props).toLowerCase();
  }

  return tagName;
}
},{"parse-tag":16}],93:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.descriptors = undefined;

var _eventsList = require('./eventsList');

var HAS_LOWER_CASE /*: number*/ = 0x1; // transform key to all lowercase
/* @flow */

var HAS_DASHED_CASE /*: number*/ = 0x2; // transform key to dashed case
var HAS_EVENT_CASE /*: number*/ = 0x4; // transform key from onClick to click
var USE_EQUAL_SETTER /*: number*/ = 0x8; // props only settable with =
var USE_SET_ATTRIBUTE /*: number*/ = 0x10; // props only settable with setAttribute
var USE_EVENT_LISTENER /*: number*/ = 0x20; // props only settable with addEventListener
var HAS_BOOLEAN_VALUE /*: number*/ = 0x40; // props can only be booleans
var HAS_NUMBER_VALUE /*: number*/ = 0x80; // props can only be numbers
var IS_STAR /*: number*/ = 0x100; // props can be any dashed case, e.g. data-*

var DASHED_CASE_REGEX /*: RegExp*/ = /(?:^\w|[A-Z]|\b\w|\s+)/g;

function checkMask(value /*: number*/, bitmask /*: number*/) /*: boolean*/ {
  return (value & bitmask) === bitmask;
}

function makeDashedCase(letter /*: string*/, i /*: number*/) /*: string*/ {
  if (+letter === 0) {
    return '';
  }

  if (i === 0) {
    return letter.toLowerCase();
  }

  return '-' + letter.toLowerCase();
}

function computeName(name /*: string*/, hasLowerCase /*: boolean*/, hasDashedCase /*: boolean*/, hasEventCase /*: boolean*/) /*: string*/ {
  if (hasLowerCase) {
    return name.toLowerCase();
  } else if (hasDashedCase) {
    return name.replace(DASHED_CASE_REGEX, makeDashedCase);
  } else if (hasEventCase) {
    return name.substr(2).toLowerCase();
  }

  return name;
}

var props /*: Object*/ = {
  accept: USE_EQUAL_SETTER,
  acceptCharset: USE_EQUAL_SETTER | HAS_DASHED_CASE,
  accessKey: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  action: USE_EQUAL_SETTER,
  align: USE_EQUAL_SETTER,
  alt: USE_EQUAL_SETTER,
  async: USE_EQUAL_SETTER | HAS_BOOLEAN_VALUE,
  autoComplete: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  autoFocus: USE_EQUAL_SETTER | HAS_LOWER_CASE | HAS_BOOLEAN_VALUE,
  autoPlay: USE_EQUAL_SETTER | HAS_LOWER_CASE | HAS_BOOLEAN_VALUE,
  autoSave: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  bgColor: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  border: USE_EQUAL_SETTER,
  checked: USE_EQUAL_SETTER | HAS_BOOLEAN_VALUE,
  cite: USE_EQUAL_SETTER,
  className: USE_EQUAL_SETTER,
  color: USE_EQUAL_SETTER,
  colSpan: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  content: USE_EQUAL_SETTER,
  contentEditable: USE_EQUAL_SETTER | HAS_LOWER_CASE | HAS_BOOLEAN_VALUE,
  controls: USE_EQUAL_SETTER | HAS_BOOLEAN_VALUE,
  coords: USE_EQUAL_SETTER,
  default: USE_EQUAL_SETTER | HAS_BOOLEAN_VALUE,
  defer: USE_EQUAL_SETTER | HAS_BOOLEAN_VALUE,
  dir: USE_EQUAL_SETTER,
  dirName: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  disabled: USE_EQUAL_SETTER | HAS_BOOLEAN_VALUE,
  draggable: USE_EQUAL_SETTER | HAS_BOOLEAN_VALUE,
  dropZone: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  encType: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  for: USE_EQUAL_SETTER,
  headers: USE_EQUAL_SETTER,
  height: USE_EQUAL_SETTER,
  href: USE_EQUAL_SETTER,
  hrefLang: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  httpEquiv: USE_EQUAL_SETTER | HAS_DASHED_CASE,
  icon: USE_EQUAL_SETTER,
  id: USE_EQUAL_SETTER,
  isMap: USE_EQUAL_SETTER | HAS_LOWER_CASE | HAS_BOOLEAN_VALUE,
  itemProp: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  keyType: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  kind: USE_EQUAL_SETTER,
  label: USE_EQUAL_SETTER,
  lang: USE_EQUAL_SETTER,
  loop: USE_EQUAL_SETTER | HAS_BOOLEAN_VALUE,
  max: USE_EQUAL_SETTER,
  method: USE_EQUAL_SETTER,
  min: USE_EQUAL_SETTER,
  multiple: USE_EQUAL_SETTER | HAS_BOOLEAN_VALUE,
  name: USE_EQUAL_SETTER,
  noValidate: USE_EQUAL_SETTER | HAS_LOWER_CASE | HAS_BOOLEAN_VALUE,
  open: USE_EQUAL_SETTER | HAS_BOOLEAN_VALUE,
  optimum: USE_EQUAL_SETTER,
  pattern: USE_EQUAL_SETTER,
  ping: USE_EQUAL_SETTER,
  placeholder: USE_EQUAL_SETTER,
  poster: USE_EQUAL_SETTER,
  preload: USE_EQUAL_SETTER,
  radioGroup: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  readOnly: USE_EQUAL_SETTER | HAS_LOWER_CASE | HAS_BOOLEAN_VALUE,
  rel: USE_EQUAL_SETTER,
  required: USE_EQUAL_SETTER | HAS_BOOLEAN_VALUE,
  reversed: USE_EQUAL_SETTER | HAS_BOOLEAN_VALUE,
  role: USE_EQUAL_SETTER,
  rowSpan: USE_EQUAL_SETTER | HAS_LOWER_CASE | HAS_NUMBER_VALUE,
  sandbox: USE_EQUAL_SETTER,
  scope: USE_EQUAL_SETTER,
  seamless: USE_EQUAL_SETTER | HAS_BOOLEAN_VALUE,
  selected: USE_EQUAL_SETTER | HAS_BOOLEAN_VALUE,
  span: USE_EQUAL_SETTER | HAS_NUMBER_VALUE,
  src: USE_EQUAL_SETTER,
  srcDoc: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  srcLang: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  start: USE_EQUAL_SETTER | HAS_NUMBER_VALUE,
  step: USE_EQUAL_SETTER,
  summary: USE_EQUAL_SETTER,
  tabIndex: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  target: USE_EQUAL_SETTER,
  title: USE_EQUAL_SETTER,
  type: USE_EQUAL_SETTER,
  useMap: USE_EQUAL_SETTER | HAS_LOWER_CASE,
  value: USE_EQUAL_SETTER,
  width: USE_EQUAL_SETTER,
  wrap: USE_EQUAL_SETTER,

  allowFullScreen: USE_SET_ATTRIBUTE | HAS_LOWER_CASE | HAS_BOOLEAN_VALUE,
  allowTransparency: USE_SET_ATTRIBUTE | HAS_LOWER_CASE,
  capture: USE_SET_ATTRIBUTE | HAS_BOOLEAN_VALUE,
  charset: USE_SET_ATTRIBUTE,
  challenge: USE_SET_ATTRIBUTE,
  codeBase: USE_SET_ATTRIBUTE | HAS_LOWER_CASE,
  cols: USE_SET_ATTRIBUTE | HAS_NUMBER_VALUE,
  contextMenu: USE_SET_ATTRIBUTE | HAS_LOWER_CASE,
  dateTime: USE_SET_ATTRIBUTE | HAS_LOWER_CASE,
  form: USE_SET_ATTRIBUTE,
  formAction: USE_SET_ATTRIBUTE | HAS_LOWER_CASE,
  formEncType: USE_SET_ATTRIBUTE | HAS_LOWER_CASE,
  formMethod: USE_SET_ATTRIBUTE | HAS_LOWER_CASE,
  formTarget: USE_SET_ATTRIBUTE | HAS_LOWER_CASE,
  frameBorder: USE_SET_ATTRIBUTE | HAS_LOWER_CASE,
  hidden: USE_SET_ATTRIBUTE | HAS_BOOLEAN_VALUE,
  inputMode: USE_SET_ATTRIBUTE | HAS_LOWER_CASE,
  is: USE_SET_ATTRIBUTE,
  list: USE_SET_ATTRIBUTE,
  manifest: USE_SET_ATTRIBUTE,
  maxLength: USE_SET_ATTRIBUTE | HAS_LOWER_CASE,
  media: USE_SET_ATTRIBUTE,
  minLength: USE_SET_ATTRIBUTE | HAS_LOWER_CASE,
  rows: USE_SET_ATTRIBUTE | HAS_NUMBER_VALUE,
  size: USE_SET_ATTRIBUTE | HAS_NUMBER_VALUE,
  sizes: USE_SET_ATTRIBUTE,
  srcSet: USE_SET_ATTRIBUTE | HAS_LOWER_CASE,
  style: USE_SET_ATTRIBUTE,

  aria: IS_STAR,
  data: IS_STAR
};

_eventsList.eventsList.forEach(function (event) {
  props['on' + event] = USE_EVENT_LISTENER | HAS_EVENT_CASE;
});

var descriptors /*: Object*/ = {};
var keys /*: Array<string>*/ = Object.keys(props);
var len /*: number*/ = keys.length;
var i /*: number*/ = -1;

while (++i < len) {
  var key /*: string*/ = keys[i];
  var prop /*: number*/ = props[key];
  var hasLowerCase /*: boolean*/ = checkMask(prop, HAS_LOWER_CASE);
  var hasDashedCase /*: boolean*/ = checkMask(prop, HAS_DASHED_CASE);
  var hasEventCase /*: boolean*/ = checkMask(prop, HAS_EVENT_CASE);
  var useEqualSetter /*: boolean*/ = checkMask(prop, USE_EQUAL_SETTER);
  var useSetAttribute /*: boolean*/ = checkMask(prop, USE_SET_ATTRIBUTE);
  var useEventListener /*: boolean*/ = checkMask(prop, USE_EVENT_LISTENER);
  var hasBooleanValue /*: boolean*/ = checkMask(prop, HAS_BOOLEAN_VALUE);
  var hasNumberValue /*: boolean*/ = checkMask(prop, HAS_NUMBER_VALUE);
  var isStar /*: boolean*/ = checkMask(prop, IS_STAR);
  var computed /*: string*/ = computeName(key, hasLowerCase, hasDashedCase, hasEventCase);

  descriptors[key] = {
    useEqualSetter: useEqualSetter,
    useSetAttribute: useSetAttribute,
    useEventListener: useEventListener,
    hasBooleanValue: hasBooleanValue,
    hasNumberValue: hasNumberValue,
    isStar: isStar,
    computed: computed
  };
}

exports.descriptors = descriptors;
},{"./eventsList":84}],94:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.render = render;

var _batchInsertMessages = require('./batchInsertMessages');

var _NodeProxy = require('./NodeProxy');

var _is = require('./is');

var _symbol = require('./symbol');

var _types = require('./types');

function render(vnode /*: VirtualElement*/, node /*: HTMLElement*/) /*: void*/ {
  var containerProxy /*: NodeProxy*/ = _NodeProxy.NodeProxy.fromElement(node);
  var previous /*: VirtualElement*/ = containerProxy.getAttribute(_symbol.$$root);

  if ((0, _is.isDefined)(previous)) {
    previous.destroy();
  }

  (0, _batchInsertMessages.batchInsertMessages)(function (queue) {
    vnode.initialize();
    containerProxy.replaceChild(vnode.getNodeProxy(), 0);
    queue.push(vnode);
  });

  containerProxy.setAttribute(_symbol.$$root, vnode);
} /* @flow */
},{"./NodeProxy":70,"./batchInsertMessages":74,"./is":89,"./symbol":96,"./types":97}],95:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.set = set;
function set(obj, key, value) {
  obj[key] = value;
}
},{}],96:[function(require,module,exports){
(function (global){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _Symbol = global.Symbol;

var symbols = {
  $$virtual: "@@YOLK_VIRTUAL",
  $$componentUid: "@@YOLK_COMPONENT_UID",
  $$root: "@@YOLK_ROOT"
};

if (typeof _Symbol === "function") {
  if (typeof _Symbol.for === "function") {
    Object.keys(symbols).forEach(function (key) {
      symbols[key] = _Symbol.for(symbols[key]);
    });
  } else {
    Object.keys(symbols).forEach(function (key) {
      symbols[key] = _Symbol(symbols[key]);
    });
  }
}

var $$virtual = symbols.$$virtual;
var $$componentUid = symbols.$$componentUid;
var $$root = symbols.$$root;
exports.$$virtual = $$virtual;
exports.$$componentUid = $$componentUid;
exports.$$root = $$root;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],97:[function(require,module,exports){
'use strict';

/*:: import type {VirtualNode} from './VirtualNode'*/
/*:: import type {VirtualComponent} from './VirtualComponent'*/
/*:: export type VirtualElement = VirtualNode | VirtualComponent*/
/*:: export type NodeProxyDecorator = {
  insertChild (child: VirtualNode, index: number): void;
  updateChild (previous: VirtualNode, next: VirtualNode): void;
  moveChild (previous: VirtualNode, next: VirtualNode, index: number): void;
  removeChild (child: VirtualNode): void;
}*/
},{}],98:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.wrapText = wrapText;

var _h = require('./h');

var _VirtualNode = require('./VirtualNode');

var _is = require('./is');

function wrap(obj /*: any*/) /*: VirtualNode*/ {
  if ((0, _is.isVirtual)(obj)) {
    return obj;
  }

  return (0, _h.h)('span', { textContent: obj.toString() });
} /* @flow */

function wrapText(arr /*: Array<any>*/) /*: Array<VirtualNode>*/ {
  return arr.map(wrap);
}
},{"./VirtualNode":72,"./h":87,"./is":89}],99:[function(require,module,exports){
'use strict';

var _yolk = require('yolk');

require('rxjs/add/operator/merge');

require('rxjs/add/operator/scan');

require('rxjs/add/operator/startWith');

function TypeAhead(_ref) {
  var props = _ref.props;
  var children = _ref.children;
  var createEventHandler = _ref.createEventHandler;

  var title = props.title.map(function (title) {
    return 'Awesome ' + title;
  });
  var handlePlus = createEventHandler(1);
  var handleMinus = createEventHandler(-1);
  var count = handlePlus.merge(handleMinus).scan(function (x, y) {
    return x + y;
  }).startWith(0);

  return (0, _yolk.h)(
    'div',
    null,
    (0, _yolk.h)(
      'h1',
      null,
      title
    ),
    (0, _yolk.h)(
      'div',
      null,
      (0, _yolk.h)(
        'button',
        { id: 'plus', onClick: handlePlus },
        '+'
      ),
      (0, _yolk.h)(
        'button',
        { id: 'minus', onClick: handleMinus },
        '-'
      )
    ),
    (0, _yolk.h)(
      'div',
      null,
      (0, _yolk.h)(
        'span',
        null,
        'Count: ',
        count
      )
    ),
    children
  );
}

(0, _yolk.render)((0, _yolk.h)(
  TypeAhead,
  { title: 'TypeAhead' },
  'Type ahead my good friend'
), document.getElementById('container'));

},{"rxjs/add/operator/merge":30,"rxjs/add/operator/scan":31,"rxjs/add/operator/startWith":33,"yolk":88}]},{},[99])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYml0LXZlY3Rvci9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2N1aWQvZGlzdC9icm93c2VyLWN1aWQuanMiLCJub2RlX21vZHVsZXMvZGlmdC9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9hZGQtZXZlbnQuanMiLCJub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9kb20tZGVsZWdhdG9yLmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3IvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9ub2RlX21vZHVsZXMvaW5kaXZpZHVhbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL3Byb3h5LWV2ZW50LmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3IvcmVtb3ZlLWV2ZW50LmpzIiwibm9kZV9tb2R1bGVzL2V2LXN0b3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIm5vZGVfbW9kdWxlcy9pbmRpdmlkdWFsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2luZGl2aWR1YWwvb25lLXZlcnNpb24uanMiLCJub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9wYXJzZS10YWcvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnhqcy9CZWhhdmlvclN1YmplY3QuanMiLCJub2RlX21vZHVsZXMvcnhqcy9Jbm5lclN1YnNjcmliZXIuanMiLCJub2RlX21vZHVsZXMvcnhqcy9PYnNlcnZhYmxlLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvT2JzZXJ2ZXIuanMiLCJub2RlX21vZHVsZXMvcnhqcy9PdXRlclN1YnNjcmliZXIuanMiLCJub2RlX21vZHVsZXMvcnhqcy9TdWJqZWN0LmpzIiwibm9kZV9tb2R1bGVzL3J4anMvU3ViamVjdFN1YnNjcmlwdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL1N1YnNjcmliZXIuanMiLCJub2RlX21vZHVsZXMvcnhqcy9TdWJzY3JpcHRpb24uanMiLCJub2RlX21vZHVsZXMvcnhqcy9hZGQvb2JzZXJ2YWJsZS9jb21iaW5lTGF0ZXN0LmpzIiwibm9kZV9tb2R1bGVzL3J4anMvYWRkL29ic2VydmFibGUvb2YuanMiLCJub2RlX21vZHVsZXMvcnhqcy9hZGQvb3BlcmF0b3IvbWFwLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvYWRkL29wZXJhdG9yL21hcFRvLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvYWRkL29wZXJhdG9yL21lcmdlLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvYWRkL29wZXJhdG9yL3NjYW4uanMiLCJub2RlX21vZHVsZXMvcnhqcy9hZGQvb3BlcmF0b3Ivc2hhcmUuanMiLCJub2RlX21vZHVsZXMvcnhqcy9hZGQvb3BlcmF0b3Ivc3RhcnRXaXRoLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvYWRkL29wZXJhdG9yL3N3aXRjaE1hcC5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL29ic2VydmFibGUvQXJyYXlPYnNlcnZhYmxlLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb2JzZXJ2YWJsZS9Db25uZWN0YWJsZU9ic2VydmFibGUuanMiLCJub2RlX21vZHVsZXMvcnhqcy9vYnNlcnZhYmxlL0VtcHR5T2JzZXJ2YWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL29ic2VydmFibGUvU2NhbGFyT2JzZXJ2YWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL29ic2VydmFibGUvb2YuanMiLCJub2RlX21vZHVsZXMvcnhqcy9vcGVyYXRvci9jb21iaW5lTGF0ZXN0LmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3IvY29uY2F0LmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3IvbWFwLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3IvbWFwVG8uanMiLCJub2RlX21vZHVsZXMvcnhqcy9vcGVyYXRvci9tZXJnZS5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL29wZXJhdG9yL21lcmdlQWxsLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3IvbXVsdGljYXN0LmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3Ivc2Nhbi5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL29wZXJhdG9yL3NoYXJlLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3Ivc3RhcnRXaXRoLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3Ivc3dpdGNoTWFwLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvc3ltYm9sL2l0ZXJhdG9yLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvc3ltYm9sL29ic2VydmFibGUuanMiLCJub2RlX21vZHVsZXMvcnhqcy9zeW1ib2wvcnhTdWJzY3JpYmVyLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvdXRpbC9PYmplY3RVbnN1YnNjcmliZWRFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3V0aWwvVW5zdWJzY3JpcHRpb25FcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3V0aWwvZXJyb3JPYmplY3QuanMiLCJub2RlX21vZHVsZXMvcnhqcy91dGlsL2lzQXJyYXkuanMiLCJub2RlX21vZHVsZXMvcnhqcy91dGlsL2lzRnVuY3Rpb24uanMiLCJub2RlX21vZHVsZXMvcnhqcy91dGlsL2lzT2JqZWN0LmpzIiwibm9kZV9tb2R1bGVzL3J4anMvdXRpbC9pc1Byb21pc2UuanMiLCJub2RlX21vZHVsZXMvcnhqcy91dGlsL2lzU2NoZWR1bGVyLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvdXRpbC9yb290LmpzIiwibm9kZV9tb2R1bGVzL3J4anMvdXRpbC9zdWJzY3JpYmVUb1Jlc3VsdC5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3V0aWwvdGhyb3dFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3V0aWwvdG9TdWJzY3JpYmVyLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvdXRpbC90cnlDYXRjaC5qcyIsIm5vZGVfbW9kdWxlcy93ZWFrbWFwLXNoaW0vY3JlYXRlLXN0b3JlLmpzIiwibm9kZV9tb2R1bGVzL3dlYWttYXAtc2hpbS9oaWRkZW4tc3RvcmUuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvQ3VzdG9tRXZlbnQuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvTm9kZVByb3h5LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL1ZpcnR1YWxDb21wb25lbnQuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvVmlydHVhbE5vZGUuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvYXNPYnNlcnZhYmxlLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2JhdGNoSW5zZXJ0TWVzc2FnZXMuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvY3JlYXRlQ29tcG9uZW50UHJvcHMuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvY3JlYXRlQ29tcG9zaXRlU3ViamVjdC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9jcmVhdGVFdmVudEhhbmRsZXIuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvY3JlYXRlTm9kZVByb3BzLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2NyZWF0ZU9ic2VydmFibGVGcm9tQXJyYXkuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvY3JlYXRlUGF0Y2hDaGlsZHJlbi5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9jcmVhdGVQYXRjaFByb3BlcnRpZXMuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvZW1wdHlPYmplY3QuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvZXZlbnREZWxlZ2F0b3IuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvZXZlbnRzTGlzdC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9mbGF0dGVuLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2dldC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9oLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2lzLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2tleUluZGV4LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL21vdW50YWJsZS5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9wYXJzZVRhZy5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9wcm9wZXJ0eURlc2NyaXB0b3JzLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL3JlbmRlci5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9zZXQuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvc3ltYm9sLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL3R5cGVzLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL3dyYXBUZXh0LmpzIiwic3JjL2luZGV4LmpzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdkJBOztBQUVBOztBQUNBOztBQUNBOztBQUdBLFNBQVMsU0FBVCxPQUEwRDtNQUF0QyxtQkFBc0M7TUFBL0IseUJBQStCO01BQXJCLDZDQUFxQjs7QUFDeEQsTUFBTSxRQUFRLE1BQU0sS0FBTixDQUFZLEdBQVosQ0FBZ0I7d0JBQW9CO0dBQXBCLENBQXhCLENBRGtEO0FBRXhELE1BQU0sYUFBYSxtQkFBbUIsQ0FBbkIsQ0FBYixDQUZrRDtBQUd4RCxNQUFNLGNBQWMsbUJBQW1CLENBQUMsQ0FBRCxDQUFqQyxDQUhrRDtBQUl4RCxNQUFNLFFBQVEsV0FDQyxLQURELENBQ08sV0FEUCxFQUVDLElBRkQsQ0FFTSxVQUFDLENBQUQsRUFBSSxDQUFKO1dBQVUsSUFBSSxDQUFKO0dBQVYsQ0FGTixDQUdDLFNBSEQsQ0FHVyxDQUhYLENBQVIsQ0FKa0Q7O0FBU3hELFNBQ0U7OztJQUNFOzs7TUFBSyxLQUFMO0tBREY7SUFFRTs7O01BQ0U7O1VBQVEsSUFBRyxNQUFILEVBQVUsU0FBUyxVQUFULEVBQWxCOztPQURGO01BRUU7O1VBQVEsSUFBRyxPQUFILEVBQVcsU0FBUyxXQUFULEVBQW5COztPQUZGO0tBRkY7SUFNRTs7O01BQ0U7Ozs7UUFBYyxLQUFkO09BREY7S0FORjtJQVNHLFFBVEg7R0FERixDQVR3RDtDQUExRDs7QUF3QkEsa0JBQ0U7QUFBQyxXQUFEO0lBQVcsT0FBTSxXQUFOLEVBQVg7O0NBREYsRUFFRSxTQUFTLGNBQVQsQ0FBd0IsV0FBeEIsQ0FGRiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG4vKipcbiAqIFVzZSB0eXBlZCBhcnJheXMgaWYgd2UgY2FuXG4gKi9cblxudmFyIEZhc3RBcnJheSA9IHR5cGVvZiBVaW50MzJBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyBBcnJheSA6IFVpbnQzMkFycmF5O1xuXG4vKipcbiAqIEJpdCB2ZWN0b3JcbiAqL1xuXG5mdW5jdGlvbiBjcmVhdGVCdihzaXplSW5CaXRzKSB7XG4gIHJldHVybiBuZXcgRmFzdEFycmF5KE1hdGguY2VpbChzaXplSW5CaXRzIC8gMzIpKTtcbn1cblxuZnVuY3Rpb24gc2V0Qml0KHYsIGlkeCkge1xuICB2YXIgciA9IGlkeCAlIDMyO1xuICB2YXIgcG9zID0gKGlkeCAtIHIpIC8gMzI7XG5cbiAgdltwb3NdIHw9IDEgPDwgcjtcbn1cblxuZnVuY3Rpb24gY2xlYXJCaXQodiwgaWR4KSB7XG4gIHZhciByID0gaWR4ICUgMzI7XG4gIHZhciBwb3MgPSAoaWR4IC0gcikgLyAzMjtcblxuICB2W3Bvc10gJj0gfigxIDw8IHIpO1xufVxuXG5mdW5jdGlvbiBnZXRCaXQodiwgaWR4KSB7XG4gIHZhciByID0gaWR4ICUgMzI7XG4gIHZhciBwb3MgPSAoaWR4IC0gcikgLyAzMjtcblxuICByZXR1cm4gISEodltwb3NdICYgMSA8PCByKTtcbn1cblxuLyoqXG4gKiBFeHBvcnRzXG4gKi9cblxuZXhwb3J0cy5jcmVhdGVCdiA9IGNyZWF0ZUJ2O1xuZXhwb3J0cy5zZXRCaXQgPSBzZXRCaXQ7XG5leHBvcnRzLmNsZWFyQml0ID0gY2xlYXJCaXQ7XG5leHBvcnRzLmdldEJpdCA9IGdldEJpdDsiLCIiLCIvKipcbiAqIGN1aWQuanNcbiAqIENvbGxpc2lvbi1yZXNpc3RhbnQgVUlEIGdlbmVyYXRvciBmb3IgYnJvd3NlcnMgYW5kIG5vZGUuXG4gKiBTZXF1ZW50aWFsIGZvciBmYXN0IGRiIGxvb2t1cHMgYW5kIHJlY2VuY3kgc29ydGluZy5cbiAqIFNhZmUgZm9yIGVsZW1lbnQgSURzIGFuZCBzZXJ2ZXItc2lkZSBsb29rdXBzLlxuICpcbiAqIEV4dHJhY3RlZCBmcm9tIENMQ1RSXG4gKlxuICogQ29weXJpZ2h0IChjKSBFcmljIEVsbGlvdHQgMjAxMlxuICogTUlUIExpY2Vuc2VcbiAqL1xuXG4vKmdsb2JhbCB3aW5kb3csIG5hdmlnYXRvciwgZG9jdW1lbnQsIHJlcXVpcmUsIHByb2Nlc3MsIG1vZHVsZSAqL1xuKGZ1bmN0aW9uIChhcHApIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgbmFtZXNwYWNlID0gJ2N1aWQnLFxuICAgIGMgPSAwLFxuICAgIGJsb2NrU2l6ZSA9IDQsXG4gICAgYmFzZSA9IDM2LFxuICAgIGRpc2NyZXRlVmFsdWVzID0gTWF0aC5wb3coYmFzZSwgYmxvY2tTaXplKSxcblxuICAgIHBhZCA9IGZ1bmN0aW9uIHBhZChudW0sIHNpemUpIHtcbiAgICAgIHZhciBzID0gXCIwMDAwMDAwMDBcIiArIG51bTtcbiAgICAgIHJldHVybiBzLnN1YnN0cihzLmxlbmd0aC1zaXplKTtcbiAgICB9LFxuXG4gICAgcmFuZG9tQmxvY2sgPSBmdW5jdGlvbiByYW5kb21CbG9jaygpIHtcbiAgICAgIHJldHVybiBwYWQoKE1hdGgucmFuZG9tKCkgKlxuICAgICAgICAgICAgZGlzY3JldGVWYWx1ZXMgPDwgMClcbiAgICAgICAgICAgIC50b1N0cmluZyhiYXNlKSwgYmxvY2tTaXplKTtcbiAgICB9LFxuXG4gICAgc2FmZUNvdW50ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBjID0gKGMgPCBkaXNjcmV0ZVZhbHVlcykgPyBjIDogMDtcbiAgICAgIGMrKzsgLy8gdGhpcyBpcyBub3Qgc3VibGltaW5hbFxuICAgICAgcmV0dXJuIGMgLSAxO1xuICAgIH0sXG5cbiAgICBhcGkgPSBmdW5jdGlvbiBjdWlkKCkge1xuICAgICAgLy8gU3RhcnRpbmcgd2l0aCBhIGxvd2VyY2FzZSBsZXR0ZXIgbWFrZXNcbiAgICAgIC8vIGl0IEhUTUwgZWxlbWVudCBJRCBmcmllbmRseS5cbiAgICAgIHZhciBsZXR0ZXIgPSAnYycsIC8vIGhhcmQtY29kZWQgYWxsb3dzIGZvciBzZXF1ZW50aWFsIGFjY2Vzc1xuXG4gICAgICAgIC8vIHRpbWVzdGFtcFxuICAgICAgICAvLyB3YXJuaW5nOiB0aGlzIGV4cG9zZXMgdGhlIGV4YWN0IGRhdGUgYW5kIHRpbWVcbiAgICAgICAgLy8gdGhhdCB0aGUgdWlkIHdhcyBjcmVhdGVkLlxuICAgICAgICB0aW1lc3RhbXAgPSAobmV3IERhdGUoKS5nZXRUaW1lKCkpLnRvU3RyaW5nKGJhc2UpLFxuXG4gICAgICAgIC8vIFByZXZlbnQgc2FtZS1tYWNoaW5lIGNvbGxpc2lvbnMuXG4gICAgICAgIGNvdW50ZXIsXG5cbiAgICAgICAgLy8gQSBmZXcgY2hhcnMgdG8gZ2VuZXJhdGUgZGlzdGluY3QgaWRzIGZvciBkaWZmZXJlbnRcbiAgICAgICAgLy8gY2xpZW50cyAoc28gZGlmZmVyZW50IGNvbXB1dGVycyBhcmUgZmFyIGxlc3NcbiAgICAgICAgLy8gbGlrZWx5IHRvIGdlbmVyYXRlIHRoZSBzYW1lIGlkKVxuICAgICAgICBmaW5nZXJwcmludCA9IGFwaS5maW5nZXJwcmludCgpLFxuXG4gICAgICAgIC8vIEdyYWIgc29tZSBtb3JlIGNoYXJzIGZyb20gTWF0aC5yYW5kb20oKVxuICAgICAgICByYW5kb20gPSByYW5kb21CbG9jaygpICsgcmFuZG9tQmxvY2soKTtcblxuICAgICAgICBjb3VudGVyID0gcGFkKHNhZmVDb3VudGVyKCkudG9TdHJpbmcoYmFzZSksIGJsb2NrU2l6ZSk7XG5cbiAgICAgIHJldHVybiAgKGxldHRlciArIHRpbWVzdGFtcCArIGNvdW50ZXIgKyBmaW5nZXJwcmludCArIHJhbmRvbSk7XG4gICAgfTtcblxuICBhcGkuc2x1ZyA9IGZ1bmN0aW9uIHNsdWcoKSB7XG4gICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKS50b1N0cmluZygzNiksXG4gICAgICBjb3VudGVyLFxuICAgICAgcHJpbnQgPSBhcGkuZmluZ2VycHJpbnQoKS5zbGljZSgwLDEpICtcbiAgICAgICAgYXBpLmZpbmdlcnByaW50KCkuc2xpY2UoLTEpLFxuICAgICAgcmFuZG9tID0gcmFuZG9tQmxvY2soKS5zbGljZSgtMik7XG5cbiAgICAgIGNvdW50ZXIgPSBzYWZlQ291bnRlcigpLnRvU3RyaW5nKDM2KS5zbGljZSgtNCk7XG5cbiAgICByZXR1cm4gZGF0ZS5zbGljZSgtMikgK1xuICAgICAgY291bnRlciArIHByaW50ICsgcmFuZG9tO1xuICB9O1xuXG4gIGFwaS5nbG9iYWxDb3VudCA9IGZ1bmN0aW9uIGdsb2JhbENvdW50KCkge1xuICAgIC8vIFdlIHdhbnQgdG8gY2FjaGUgdGhlIHJlc3VsdHMgb2YgdGhpc1xuICAgIHZhciBjYWNoZSA9IChmdW5jdGlvbiBjYWxjKCkge1xuICAgICAgICB2YXIgaSxcbiAgICAgICAgICBjb3VudCA9IDA7XG5cbiAgICAgICAgZm9yIChpIGluIHdpbmRvdykge1xuICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICB9KCkpO1xuXG4gICAgYXBpLmdsb2JhbENvdW50ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gY2FjaGU7IH07XG4gICAgcmV0dXJuIGNhY2hlO1xuICB9O1xuXG4gIGFwaS5maW5nZXJwcmludCA9IGZ1bmN0aW9uIGJyb3dzZXJQcmludCgpIHtcbiAgICByZXR1cm4gcGFkKChuYXZpZ2F0b3IubWltZVR5cGVzLmxlbmd0aCArXG4gICAgICBuYXZpZ2F0b3IudXNlckFnZW50Lmxlbmd0aCkudG9TdHJpbmcoMzYpICtcbiAgICAgIGFwaS5nbG9iYWxDb3VudCgpLnRvU3RyaW5nKDM2KSwgNCk7XG4gIH07XG5cbiAgLy8gZG9uJ3QgY2hhbmdlIGFueXRoaW5nIGZyb20gaGVyZSBkb3duLlxuICBpZiAoYXBwLnJlZ2lzdGVyKSB7XG4gICAgYXBwLnJlZ2lzdGVyKG5hbWVzcGFjZSwgYXBpKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gYXBpO1xuICB9IGVsc2Uge1xuICAgIGFwcFtuYW1lc3BhY2VdID0gYXBpO1xuICB9XG5cbn0odGhpcy5hcHBsaXR1ZGUgfHwgdGhpcykpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5SRU1PVkUgPSBleHBvcnRzLk1PVkUgPSBleHBvcnRzLlVQREFURSA9IGV4cG9ydHMuQ1JFQVRFID0gdW5kZWZpbmVkO1xuXG52YXIgX2JpdFZlY3RvciA9IHJlcXVpcmUoJ2JpdC12ZWN0b3InKTtcblxuLyoqXG4gKiBBY3Rpb25zXG4gKi9cblxudmFyIENSRUFURSA9IDA7IC8qKlxuICAgICAgICAgICAgICAgICAqIEltcG9ydHNcbiAgICAgICAgICAgICAgICAgKi9cblxudmFyIFVQREFURSA9IDE7XG52YXIgTU9WRSA9IDI7XG52YXIgUkVNT1ZFID0gMztcblxuLyoqXG4gKiBkaWZ0XG4gKi9cblxuZnVuY3Rpb24gZGlmdChwcmV2LCBuZXh0LCBlZmZlY3QsIGtleSkge1xuICB2YXIgcFN0YXJ0SWR4ID0gMDtcbiAgdmFyIG5TdGFydElkeCA9IDA7XG4gIHZhciBwRW5kSWR4ID0gcHJldi5sZW5ndGggLSAxO1xuICB2YXIgbkVuZElkeCA9IG5leHQubGVuZ3RoIC0gMTtcbiAgdmFyIHBTdGFydEl0ZW0gPSBwcmV2W3BTdGFydElkeF07XG4gIHZhciBuU3RhcnRJdGVtID0gbmV4dFtuU3RhcnRJZHhdO1xuXG4gIC8vIExpc3QgaGVhZCBpcyB0aGUgc2FtZVxuICB3aGlsZSAocFN0YXJ0SWR4IDw9IHBFbmRJZHggJiYgblN0YXJ0SWR4IDw9IG5FbmRJZHggJiYgZXF1YWwocFN0YXJ0SXRlbSwgblN0YXJ0SXRlbSkpIHtcbiAgICBlZmZlY3QoVVBEQVRFLCBwU3RhcnRJdGVtLCBuU3RhcnRJdGVtLCBuU3RhcnRJZHgpO1xuICAgIHBTdGFydEl0ZW0gPSBwcmV2WysrcFN0YXJ0SWR4XTtcbiAgICBuU3RhcnRJdGVtID0gbmV4dFsrK25TdGFydElkeF07XG4gIH1cblxuICAvLyBUaGUgYWJvdmUgY2FzZSBpcyBvcmRlcnMgb2YgbWFnbml0dWRlIG1vcmUgY29tbW9uIHRoYW4gdGhlIG90aGVycywgc28gZmFzdC1wYXRoIGl0XG4gIGlmIChuU3RhcnRJZHggPiBuRW5kSWR4ICYmIHBTdGFydElkeCA+IHBFbmRJZHgpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgcEVuZEl0ZW0gPSBwcmV2W3BFbmRJZHhdO1xuICB2YXIgbkVuZEl0ZW0gPSBuZXh0W25FbmRJZHhdO1xuICB2YXIgbW92ZWRGcm9tRnJvbnQgPSAwO1xuXG4gIC8vIFJldmVyc2VkXG4gIHdoaWxlIChwU3RhcnRJZHggPD0gcEVuZElkeCAmJiBuU3RhcnRJZHggPD0gbkVuZElkeCAmJiBlcXVhbChwU3RhcnRJdGVtLCBuRW5kSXRlbSkpIHtcbiAgICBlZmZlY3QoTU9WRSwgcFN0YXJ0SXRlbSwgbkVuZEl0ZW0sIHBFbmRJZHggLSBtb3ZlZEZyb21Gcm9udCArIDEpO1xuICAgIHBTdGFydEl0ZW0gPSBwcmV2WysrcFN0YXJ0SWR4XTtcbiAgICBuRW5kSXRlbSA9IG5leHRbLS1uRW5kSWR4XTtcbiAgICArK21vdmVkRnJvbUZyb250O1xuICB9XG5cbiAgLy8gUmV2ZXJzZWQgdGhlIG90aGVyIHdheSAoaW4gY2FzZSBvZiBlLmcuIHJldmVyc2UgYW5kIGFwcGVuZClcbiAgd2hpbGUgKHBFbmRJZHggPj0gcFN0YXJ0SWR4ICYmIG5TdGFydElkeCA8PSBuRW5kSWR4ICYmIGVxdWFsKG5TdGFydEl0ZW0sIHBFbmRJdGVtKSkge1xuICAgIGVmZmVjdChNT1ZFLCBwRW5kSXRlbSwgblN0YXJ0SXRlbSwgblN0YXJ0SWR4KTtcbiAgICBwRW5kSXRlbSA9IHByZXZbLS1wRW5kSWR4XTtcbiAgICBuU3RhcnRJdGVtID0gbmV4dFsrK25TdGFydElkeF07XG4gICAgLS1tb3ZlZEZyb21Gcm9udDtcbiAgfVxuXG4gIC8vIExpc3QgdGFpbCBpcyB0aGUgc2FtZVxuICB3aGlsZSAocEVuZElkeCA+PSBwU3RhcnRJZHggJiYgbkVuZElkeCA+PSBuU3RhcnRJZHggJiYgZXF1YWwocEVuZEl0ZW0sIG5FbmRJdGVtKSkge1xuICAgIGVmZmVjdChVUERBVEUsIHBFbmRJdGVtLCBuRW5kSXRlbSwgbkVuZElkeCk7XG4gICAgcEVuZEl0ZW0gPSBwcmV2Wy0tcEVuZElkeF07XG4gICAgbkVuZEl0ZW0gPSBuZXh0Wy0tbkVuZElkeF07XG4gIH1cblxuICBpZiAocFN0YXJ0SWR4ID4gcEVuZElkeCkge1xuICAgIHdoaWxlIChuU3RhcnRJZHggPD0gbkVuZElkeCkge1xuICAgICAgZWZmZWN0KENSRUFURSwgbnVsbCwgblN0YXJ0SXRlbSwgblN0YXJ0SWR4KTtcbiAgICAgIG5TdGFydEl0ZW0gPSBuZXh0WysrblN0YXJ0SWR4XTtcbiAgICB9XG5cbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoblN0YXJ0SWR4ID4gbkVuZElkeCkge1xuICAgIHdoaWxlIChwU3RhcnRJZHggPD0gcEVuZElkeCkge1xuICAgICAgZWZmZWN0KFJFTU9WRSwgcFN0YXJ0SXRlbSk7XG4gICAgICBwU3RhcnRJdGVtID0gcHJldlsrK3BTdGFydElkeF07XG4gICAgfVxuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIGNyZWF0ZWQgPSAwO1xuICB2YXIgcGl2b3REZXN0ID0gbnVsbDtcbiAgdmFyIHBpdm90SWR4ID0gcFN0YXJ0SWR4IC0gbW92ZWRGcm9tRnJvbnQ7XG4gIHZhciBrZWVwQmFzZSA9IHBTdGFydElkeDtcbiAgdmFyIGtlZXAgPSAoMCwgX2JpdFZlY3Rvci5jcmVhdGVCdikocEVuZElkeCAtIHBTdGFydElkeCk7XG5cbiAgdmFyIHByZXZNYXAgPSBrZXlNYXAocHJldiwgcFN0YXJ0SWR4LCBwRW5kSWR4ICsgMSwga2V5KTtcblxuICBmb3IgKDsgblN0YXJ0SWR4IDw9IG5FbmRJZHg7IG5TdGFydEl0ZW0gPSBuZXh0WysrblN0YXJ0SWR4XSkge1xuICAgIHZhciBvbGRJZHggPSBwcmV2TWFwW2tleShuU3RhcnRJdGVtKV07XG5cbiAgICBpZiAoaXNVbmRlZmluZWQob2xkSWR4KSkge1xuICAgICAgZWZmZWN0KENSRUFURSwgbnVsbCwgblN0YXJ0SXRlbSwgcGl2b3RJZHgrKyk7XG4gICAgICArK2NyZWF0ZWQ7XG4gICAgfSBlbHNlIGlmIChwU3RhcnRJZHggIT09IG9sZElkeCkge1xuICAgICAgKDAsIF9iaXRWZWN0b3Iuc2V0Qml0KShrZWVwLCBvbGRJZHggLSBrZWVwQmFzZSk7XG4gICAgICBlZmZlY3QoTU9WRSwgcHJldltvbGRJZHhdLCBuU3RhcnRJdGVtLCBwaXZvdElkeCsrKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGl2b3REZXN0ID0gblN0YXJ0SWR4O1xuICAgIH1cbiAgfVxuXG4gIGlmIChwaXZvdERlc3QgIT09IG51bGwpIHtcbiAgICAoMCwgX2JpdFZlY3Rvci5zZXRCaXQpKGtlZXAsIDApO1xuICAgIGVmZmVjdChNT1ZFLCBwcmV2W3BTdGFydElkeF0sIG5leHRbcGl2b3REZXN0XSwgcGl2b3REZXN0KTtcbiAgfVxuXG4gIC8vIElmIHRoZXJlIGFyZSBubyBjcmVhdGlvbnMsIHRoZW4geW91IGhhdmUgdG9cbiAgLy8gcmVtb3ZlIGV4YWN0bHkgbWF4KHByZXZMZW4gLSBuZXh0TGVuLCAwKSBlbGVtZW50cyBpbiB0aGlzXG4gIC8vIGRpZmYuIFlvdSBoYXZlIHRvIHJlbW92ZSBvbmUgbW9yZSBmb3IgZWFjaCBlbGVtZW50XG4gIC8vIHRoYXQgd2FzIGNyZWF0ZWQuIFRoaXMgbWVhbnMgb25jZSB3ZSBoYXZlXG4gIC8vIHJlbW92ZWQgdGhhdCBtYW55LCB3ZSBjYW4gc3RvcC5cbiAgdmFyIG5lY2Vzc2FyeVJlbW92YWxzID0gcHJldi5sZW5ndGggLSBuZXh0Lmxlbmd0aCArIGNyZWF0ZWQ7XG4gIGZvciAodmFyIHJlbW92YWxzID0gMDsgcmVtb3ZhbHMgPCBuZWNlc3NhcnlSZW1vdmFsczsgcFN0YXJ0SXRlbSA9IHByZXZbKytwU3RhcnRJZHhdKSB7XG4gICAgaWYgKCEoMCwgX2JpdFZlY3Rvci5nZXRCaXQpKGtlZXAsIHBTdGFydElkeCAtIGtlZXBCYXNlKSkge1xuICAgICAgZWZmZWN0KFJFTU9WRSwgcFN0YXJ0SXRlbSk7XG4gICAgICArK3JlbW92YWxzO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGVxdWFsKGEsIGIpIHtcbiAgICByZXR1cm4ga2V5KGEpID09PSBrZXkoYik7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQodmFsKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJztcbn1cblxuZnVuY3Rpb24ga2V5TWFwKGl0ZW1zLCBzdGFydCwgZW5kLCBrZXkpIHtcbiAgdmFyIG1hcCA9IHt9O1xuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgbWFwW2tleShpdGVtc1tpXSldID0gaTtcbiAgfVxuXG4gIHJldHVybiBtYXA7XG59XG5cbi8qKlxuICogRXhwb3J0c1xuICovXG5cbmV4cG9ydHMuZGVmYXVsdCA9IGRpZnQ7XG5leHBvcnRzLkNSRUFURSA9IENSRUFURTtcbmV4cG9ydHMuVVBEQVRFID0gVVBEQVRFO1xuZXhwb3J0cy5NT1ZFID0gTU9WRTtcbmV4cG9ydHMuUkVNT1ZFID0gUkVNT1ZFOyIsInZhciBFdlN0b3JlID0gcmVxdWlyZShcImV2LXN0b3JlXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gYWRkRXZlbnRcblxuZnVuY3Rpb24gYWRkRXZlbnQodGFyZ2V0LCB0eXBlLCBoYW5kbGVyKSB7XG4gICAgdmFyIGV2ZW50cyA9IEV2U3RvcmUodGFyZ2V0KVxuICAgIHZhciBldmVudCA9IGV2ZW50c1t0eXBlXVxuXG4gICAgaWYgKCFldmVudCkge1xuICAgICAgICBldmVudHNbdHlwZV0gPSBoYW5kbGVyXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGV2ZW50KSkge1xuICAgICAgICBpZiAoZXZlbnQuaW5kZXhPZihoYW5kbGVyKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGV2ZW50LnB1c2goaGFuZGxlcilcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZXZlbnQgIT09IGhhbmRsZXIpIHtcbiAgICAgICAgZXZlbnRzW3R5cGVdID0gW2V2ZW50LCBoYW5kbGVyXVxuICAgIH1cbn1cbiIsInZhciBnbG9iYWxEb2N1bWVudCA9IHJlcXVpcmUoXCJnbG9iYWwvZG9jdW1lbnRcIilcbnZhciBFdlN0b3JlID0gcmVxdWlyZShcImV2LXN0b3JlXCIpXG52YXIgY3JlYXRlU3RvcmUgPSByZXF1aXJlKFwid2Vha21hcC1zaGltL2NyZWF0ZS1zdG9yZVwiKVxuXG52YXIgYWRkRXZlbnQgPSByZXF1aXJlKFwiLi9hZGQtZXZlbnQuanNcIilcbnZhciByZW1vdmVFdmVudCA9IHJlcXVpcmUoXCIuL3JlbW92ZS1ldmVudC5qc1wiKVxudmFyIFByb3h5RXZlbnQgPSByZXF1aXJlKFwiLi9wcm94eS1ldmVudC5qc1wiKVxuXG52YXIgSEFORExFUl9TVE9SRSA9IGNyZWF0ZVN0b3JlKClcblxubW9kdWxlLmV4cG9ydHMgPSBET01EZWxlZ2F0b3JcblxuZnVuY3Rpb24gRE9NRGVsZWdhdG9yKGRvY3VtZW50KSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIERPTURlbGVnYXRvcikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBET01EZWxlZ2F0b3IoZG9jdW1lbnQpO1xuICAgIH1cblxuICAgIGRvY3VtZW50ID0gZG9jdW1lbnQgfHwgZ2xvYmFsRG9jdW1lbnRcblxuICAgIHRoaXMudGFyZ2V0ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50XG4gICAgdGhpcy5ldmVudHMgPSB7fVxuICAgIHRoaXMucmF3RXZlbnRMaXN0ZW5lcnMgPSB7fVxuICAgIHRoaXMuZ2xvYmFsTGlzdGVuZXJzID0ge31cbn1cblxuRE9NRGVsZWdhdG9yLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gYWRkRXZlbnRcbkRPTURlbGVnYXRvci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IHJlbW92ZUV2ZW50XG5cbkRPTURlbGVnYXRvci5hbGxvY2F0ZUhhbmRsZSA9XG4gICAgZnVuY3Rpb24gYWxsb2NhdGVIYW5kbGUoZnVuYykge1xuICAgICAgICB2YXIgaGFuZGxlID0gbmV3IEhhbmRsZSgpXG5cbiAgICAgICAgSEFORExFUl9TVE9SRShoYW5kbGUpLmZ1bmMgPSBmdW5jO1xuXG4gICAgICAgIHJldHVybiBoYW5kbGVcbiAgICB9XG5cbkRPTURlbGVnYXRvci50cmFuc2Zvcm1IYW5kbGUgPVxuICAgIGZ1bmN0aW9uIHRyYW5zZm9ybUhhbmRsZShoYW5kbGUsIGJyb2FkY2FzdCkge1xuICAgICAgICB2YXIgZnVuYyA9IEhBTkRMRVJfU1RPUkUoaGFuZGxlKS5mdW5jXG5cbiAgICAgICAgcmV0dXJuIHRoaXMuYWxsb2NhdGVIYW5kbGUoZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICBicm9hZGNhc3QoZXYsIGZ1bmMpO1xuICAgICAgICB9KVxuICAgIH1cblxuRE9NRGVsZWdhdG9yLnByb3RvdHlwZS5hZGRHbG9iYWxFdmVudExpc3RlbmVyID1cbiAgICBmdW5jdGlvbiBhZGRHbG9iYWxFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZm4pIHtcbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2xvYmFsTGlzdGVuZXJzW2V2ZW50TmFtZV0gfHwgW107XG4gICAgICAgIGlmIChsaXN0ZW5lcnMuaW5kZXhPZihmbikgPT09IC0xKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMucHVzaChmbilcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZ2xvYmFsTGlzdGVuZXJzW2V2ZW50TmFtZV0gPSBsaXN0ZW5lcnM7XG4gICAgfVxuXG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLnJlbW92ZUdsb2JhbEV2ZW50TGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIHJlbW92ZUdsb2JhbEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBmbikge1xuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nbG9iYWxMaXN0ZW5lcnNbZXZlbnROYW1lXSB8fCBbXTtcblxuICAgICAgICB2YXIgaW5kZXggPSBsaXN0ZW5lcnMuaW5kZXhPZihmbilcbiAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgbGlzdGVuZXJzLnNwbGljZShpbmRleCwgMSlcbiAgICAgICAgfVxuICAgIH1cblxuRE9NRGVsZWdhdG9yLnByb3RvdHlwZS5saXN0ZW5UbyA9IGZ1bmN0aW9uIGxpc3RlblRvKGV2ZW50TmFtZSkge1xuICAgIGlmICghKGV2ZW50TmFtZSBpbiB0aGlzLmV2ZW50cykpIHtcbiAgICAgICAgdGhpcy5ldmVudHNbZXZlbnROYW1lXSA9IDA7XG4gICAgfVxuXG4gICAgdGhpcy5ldmVudHNbZXZlbnROYW1lXSsrO1xuXG4gICAgaWYgKHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0gIT09IDEpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdmFyIGxpc3RlbmVyID0gdGhpcy5yYXdFdmVudExpc3RlbmVyc1tldmVudE5hbWVdXG4gICAgaWYgKCFsaXN0ZW5lcikge1xuICAgICAgICBsaXN0ZW5lciA9IHRoaXMucmF3RXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXSA9XG4gICAgICAgICAgICBjcmVhdGVIYW5kbGVyKGV2ZW50TmFtZSwgdGhpcylcbiAgICB9XG5cbiAgICB0aGlzLnRhcmdldC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgbGlzdGVuZXIsIHRydWUpXG59XG5cbkRPTURlbGVnYXRvci5wcm90b3R5cGUudW5saXN0ZW5UbyA9IGZ1bmN0aW9uIHVubGlzdGVuVG8oZXZlbnROYW1lKSB7XG4gICAgaWYgKCEoZXZlbnROYW1lIGluIHRoaXMuZXZlbnRzKSkge1xuICAgICAgICB0aGlzLmV2ZW50c1tldmVudE5hbWVdID0gMDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5ldmVudHNbZXZlbnROYW1lXSA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJhbHJlYWR5IHVubGlzdGVuZWQgdG8gZXZlbnQuXCIpO1xuICAgIH1cblxuICAgIHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0tLTtcblxuICAgIGlmICh0aGlzLmV2ZW50c1tldmVudE5hbWVdICE9PSAwKSB7XG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHZhciBsaXN0ZW5lciA9IHRoaXMucmF3RXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXVxuXG4gICAgaWYgKCFsaXN0ZW5lcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJkb20tZGVsZWdhdG9yI3VubGlzdGVuVG86IGNhbm5vdCBcIiArXG4gICAgICAgICAgICBcInVubGlzdGVuIHRvIFwiICsgZXZlbnROYW1lKVxuICAgIH1cblxuICAgIHRoaXMudGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBsaXN0ZW5lciwgdHJ1ZSlcbn1cblxuZnVuY3Rpb24gY3JlYXRlSGFuZGxlcihldmVudE5hbWUsIGRlbGVnYXRvcikge1xuICAgIHZhciBnbG9iYWxMaXN0ZW5lcnMgPSBkZWxlZ2F0b3IuZ2xvYmFsTGlzdGVuZXJzO1xuICAgIHZhciBkZWxlZ2F0b3JUYXJnZXQgPSBkZWxlZ2F0b3IudGFyZ2V0O1xuXG4gICAgcmV0dXJuIGhhbmRsZXJcblxuICAgIGZ1bmN0aW9uIGhhbmRsZXIoZXYpIHtcbiAgICAgICAgdmFyIGdsb2JhbEhhbmRsZXJzID0gZ2xvYmFsTGlzdGVuZXJzW2V2ZW50TmFtZV0gfHwgW11cblxuICAgICAgICBpZiAoZ2xvYmFsSGFuZGxlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFyIGdsb2JhbEV2ZW50ID0gbmV3IFByb3h5RXZlbnQoZXYpO1xuICAgICAgICAgICAgZ2xvYmFsRXZlbnQuY3VycmVudFRhcmdldCA9IGRlbGVnYXRvclRhcmdldDtcbiAgICAgICAgICAgIGNhbGxMaXN0ZW5lcnMoZ2xvYmFsSGFuZGxlcnMsIGdsb2JhbEV2ZW50KVxuICAgICAgICB9XG5cbiAgICAgICAgZmluZEFuZEludm9rZUxpc3RlbmVycyhldi50YXJnZXQsIGV2LCBldmVudE5hbWUpXG4gICAgfVxufVxuXG5mdW5jdGlvbiBmaW5kQW5kSW52b2tlTGlzdGVuZXJzKGVsZW0sIGV2LCBldmVudE5hbWUpIHtcbiAgICB2YXIgbGlzdGVuZXIgPSBnZXRMaXN0ZW5lcihlbGVtLCBldmVudE5hbWUpXG5cbiAgICBpZiAobGlzdGVuZXIgJiYgbGlzdGVuZXIuaGFuZGxlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgbGlzdGVuZXJFdmVudCA9IG5ldyBQcm94eUV2ZW50KGV2KTtcbiAgICAgICAgbGlzdGVuZXJFdmVudC5jdXJyZW50VGFyZ2V0ID0gbGlzdGVuZXIuY3VycmVudFRhcmdldFxuICAgICAgICBjYWxsTGlzdGVuZXJzKGxpc3RlbmVyLmhhbmRsZXJzLCBsaXN0ZW5lckV2ZW50KVxuXG4gICAgICAgIGlmIChsaXN0ZW5lckV2ZW50Ll9idWJibGVzKSB7XG4gICAgICAgICAgICB2YXIgbmV4dFRhcmdldCA9IGxpc3RlbmVyLmN1cnJlbnRUYXJnZXQucGFyZW50Tm9kZVxuICAgICAgICAgICAgZmluZEFuZEludm9rZUxpc3RlbmVycyhuZXh0VGFyZ2V0LCBldiwgZXZlbnROYW1lKVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRMaXN0ZW5lcih0YXJnZXQsIHR5cGUpIHtcbiAgICAvLyB0ZXJtaW5hdGUgcmVjdXJzaW9uIGlmIHBhcmVudCBpcyBgbnVsbGBcbiAgICBpZiAodGFyZ2V0ID09PSBudWxsIHx8IHR5cGVvZiB0YXJnZXQgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG5cbiAgICB2YXIgZXZlbnRzID0gRXZTdG9yZSh0YXJnZXQpXG4gICAgLy8gZmV0Y2ggbGlzdCBvZiBoYW5kbGVyIGZucyBmb3IgdGhpcyBldmVudFxuICAgIHZhciBoYW5kbGVyID0gZXZlbnRzW3R5cGVdXG4gICAgdmFyIGFsbEhhbmRsZXIgPSBldmVudHMuZXZlbnRcblxuICAgIGlmICghaGFuZGxlciAmJiAhYWxsSGFuZGxlcikge1xuICAgICAgICByZXR1cm4gZ2V0TGlzdGVuZXIodGFyZ2V0LnBhcmVudE5vZGUsIHR5cGUpXG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZXJzID0gW10uY29uY2F0KGhhbmRsZXIgfHwgW10sIGFsbEhhbmRsZXIgfHwgW10pXG4gICAgcmV0dXJuIG5ldyBMaXN0ZW5lcih0YXJnZXQsIGhhbmRsZXJzKVxufVxuXG5mdW5jdGlvbiBjYWxsTGlzdGVuZXJzKGhhbmRsZXJzLCBldikge1xuICAgIGhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGhhbmRsZXIoZXYpXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGhhbmRsZXIuaGFuZGxlRXZlbnQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgaGFuZGxlci5oYW5kbGVFdmVudChldilcbiAgICAgICAgfSBlbHNlIGlmIChoYW5kbGVyLnR5cGUgPT09IFwiZG9tLWRlbGVnYXRvci1oYW5kbGVcIikge1xuICAgICAgICAgICAgSEFORExFUl9TVE9SRShoYW5kbGVyKS5mdW5jKGV2KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZG9tLWRlbGVnYXRvcjogdW5rbm93biBoYW5kbGVyIFwiICtcbiAgICAgICAgICAgICAgICBcImZvdW5kOiBcIiArIEpTT04uc3RyaW5naWZ5KGhhbmRsZXJzKSk7XG4gICAgICAgIH1cbiAgICB9KVxufVxuXG5mdW5jdGlvbiBMaXN0ZW5lcih0YXJnZXQsIGhhbmRsZXJzKSB7XG4gICAgdGhpcy5jdXJyZW50VGFyZ2V0ID0gdGFyZ2V0XG4gICAgdGhpcy5oYW5kbGVycyA9IGhhbmRsZXJzXG59XG5cbmZ1bmN0aW9uIEhhbmRsZSgpIHtcbiAgICB0aGlzLnR5cGUgPSBcImRvbS1kZWxlZ2F0b3ItaGFuZGxlXCJcbn1cbiIsInZhciBJbmRpdmlkdWFsID0gcmVxdWlyZShcImluZGl2aWR1YWxcIilcbnZhciBjdWlkID0gcmVxdWlyZShcImN1aWRcIilcbnZhciBnbG9iYWxEb2N1bWVudCA9IHJlcXVpcmUoXCJnbG9iYWwvZG9jdW1lbnRcIilcblxudmFyIERPTURlbGVnYXRvciA9IHJlcXVpcmUoXCIuL2RvbS1kZWxlZ2F0b3IuanNcIilcblxudmFyIHZlcnNpb25LZXkgPSBcIjEzXCJcbnZhciBjYWNoZUtleSA9IFwiX19ET01fREVMRUdBVE9SX0NBQ0hFQFwiICsgdmVyc2lvbktleVxudmFyIGNhY2hlVG9rZW5LZXkgPSBcIl9fRE9NX0RFTEVHQVRPUl9DQUNIRV9UT0tFTkBcIiArIHZlcnNpb25LZXlcbnZhciBkZWxlZ2F0b3JDYWNoZSA9IEluZGl2aWR1YWwoY2FjaGVLZXksIHtcbiAgICBkZWxlZ2F0b3JzOiB7fVxufSlcbnZhciBjb21tb25FdmVudHMgPSBbXG4gICAgXCJibHVyXCIsIFwiY2hhbmdlXCIsIFwiY2xpY2tcIiwgIFwiY29udGV4dG1lbnVcIiwgXCJkYmxjbGlja1wiLFxuICAgIFwiZXJyb3JcIixcImZvY3VzXCIsIFwiZm9jdXNpblwiLCBcImZvY3Vzb3V0XCIsIFwiaW5wdXRcIiwgXCJrZXlkb3duXCIsXG4gICAgXCJrZXlwcmVzc1wiLCBcImtleXVwXCIsIFwibG9hZFwiLCBcIm1vdXNlZG93blwiLCBcIm1vdXNldXBcIixcbiAgICBcInJlc2l6ZVwiLCBcInNlbGVjdFwiLCBcInN1Ym1pdFwiLCBcInRvdWNoY2FuY2VsXCIsXG4gICAgXCJ0b3VjaGVuZFwiLCBcInRvdWNoc3RhcnRcIiwgXCJ1bmxvYWRcIlxuXVxuXG4vKiAgRGVsZWdhdG9yIGlzIGEgdGhpbiB3cmFwcGVyIGFyb3VuZCBhIHNpbmdsZXRvbiBgRE9NRGVsZWdhdG9yYFxuICAgICAgICBpbnN0YW5jZS5cblxuICAgIE9ubHkgb25lIERPTURlbGVnYXRvciBzaG91bGQgZXhpc3QgYmVjYXVzZSB3ZSBkbyBub3Qgd2FudFxuICAgICAgICBkdXBsaWNhdGUgZXZlbnQgbGlzdGVuZXJzIGJvdW5kIHRvIHRoZSBET00uXG5cbiAgICBgRGVsZWdhdG9yYCB3aWxsIGFsc28gYGxpc3RlblRvKClgIGFsbCBldmVudHMgdW5sZXNzXG4gICAgICAgIGV2ZXJ5IGNhbGxlciBvcHRzIG91dCBvZiBpdFxuKi9cbm1vZHVsZS5leHBvcnRzID0gRGVsZWdhdG9yXG5cbmZ1bmN0aW9uIERlbGVnYXRvcihvcHRzKSB7XG4gICAgb3B0cyA9IG9wdHMgfHwge31cbiAgICB2YXIgZG9jdW1lbnQgPSBvcHRzLmRvY3VtZW50IHx8IGdsb2JhbERvY3VtZW50XG5cbiAgICB2YXIgY2FjaGVLZXkgPSBkb2N1bWVudFtjYWNoZVRva2VuS2V5XVxuXG4gICAgaWYgKCFjYWNoZUtleSkge1xuICAgICAgICBjYWNoZUtleSA9XG4gICAgICAgICAgICBkb2N1bWVudFtjYWNoZVRva2VuS2V5XSA9IGN1aWQoKVxuICAgIH1cblxuICAgIHZhciBkZWxlZ2F0b3IgPSBkZWxlZ2F0b3JDYWNoZS5kZWxlZ2F0b3JzW2NhY2hlS2V5XVxuXG4gICAgaWYgKCFkZWxlZ2F0b3IpIHtcbiAgICAgICAgZGVsZWdhdG9yID0gZGVsZWdhdG9yQ2FjaGUuZGVsZWdhdG9yc1tjYWNoZUtleV0gPVxuICAgICAgICAgICAgbmV3IERPTURlbGVnYXRvcihkb2N1bWVudClcbiAgICB9XG5cbiAgICBpZiAob3B0cy5kZWZhdWx0RXZlbnRzICE9PSBmYWxzZSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbW1vbkV2ZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZGVsZWdhdG9yLmxpc3RlblRvKGNvbW1vbkV2ZW50c1tpXSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWxlZ2F0b3Jcbn1cblxuRGVsZWdhdG9yLmFsbG9jYXRlSGFuZGxlID0gRE9NRGVsZWdhdG9yLmFsbG9jYXRlSGFuZGxlO1xuRGVsZWdhdG9yLnRyYW5zZm9ybUhhbmRsZSA9IERPTURlbGVnYXRvci50cmFuc2Zvcm1IYW5kbGU7XG4iLCJ2YXIgcm9vdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID9cbiAgICB3aW5kb3cgOiB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/XG4gICAgZ2xvYmFsIDoge307XG5cbm1vZHVsZS5leHBvcnRzID0gSW5kaXZpZHVhbFxuXG5mdW5jdGlvbiBJbmRpdmlkdWFsKGtleSwgdmFsdWUpIHtcbiAgICBpZiAocm9vdFtrZXldKSB7XG4gICAgICAgIHJldHVybiByb290W2tleV1cbiAgICB9XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocm9vdCwga2V5LCB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICAsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pXG5cbiAgICByZXR1cm4gdmFsdWVcbn1cbiIsInZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuXG52YXIgQUxMX1BST1BTID0gW1xuICAgIFwiYWx0S2V5XCIsIFwiYnViYmxlc1wiLCBcImNhbmNlbGFibGVcIiwgXCJjdHJsS2V5XCIsXG4gICAgXCJldmVudFBoYXNlXCIsIFwibWV0YUtleVwiLCBcInJlbGF0ZWRUYXJnZXRcIiwgXCJzaGlmdEtleVwiLFxuICAgIFwidGFyZ2V0XCIsIFwidGltZVN0YW1wXCIsIFwidHlwZVwiLCBcInZpZXdcIiwgXCJ3aGljaFwiXG5dXG52YXIgS0VZX1BST1BTID0gW1wiY2hhclwiLCBcImNoYXJDb2RlXCIsIFwia2V5XCIsIFwia2V5Q29kZVwiXVxudmFyIE1PVVNFX1BST1BTID0gW1xuICAgIFwiYnV0dG9uXCIsIFwiYnV0dG9uc1wiLCBcImNsaWVudFhcIiwgXCJjbGllbnRZXCIsIFwibGF5ZXJYXCIsXG4gICAgXCJsYXllcllcIiwgXCJvZmZzZXRYXCIsIFwib2Zmc2V0WVwiLCBcInBhZ2VYXCIsIFwicGFnZVlcIixcbiAgICBcInNjcmVlblhcIiwgXCJzY3JlZW5ZXCIsIFwidG9FbGVtZW50XCJcbl1cblxudmFyIHJrZXlFdmVudCA9IC9ea2V5fGlucHV0L1xudmFyIHJtb3VzZUV2ZW50ID0gL14oPzptb3VzZXxwb2ludGVyfGNvbnRleHRtZW51KXxjbGljay9cblxubW9kdWxlLmV4cG9ydHMgPSBQcm94eUV2ZW50XG5cbmZ1bmN0aW9uIFByb3h5RXZlbnQoZXYpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUHJveHlFdmVudCkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eUV2ZW50KGV2KVxuICAgIH1cblxuICAgIGlmIChya2V5RXZlbnQudGVzdChldi50eXBlKSkge1xuICAgICAgICByZXR1cm4gbmV3IEtleUV2ZW50KGV2KVxuICAgIH0gZWxzZSBpZiAocm1vdXNlRXZlbnQudGVzdChldi50eXBlKSkge1xuICAgICAgICByZXR1cm4gbmV3IE1vdXNlRXZlbnQoZXYpXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBBTExfUFJPUFMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByb3BLZXkgPSBBTExfUFJPUFNbaV1cbiAgICAgICAgdGhpc1twcm9wS2V5XSA9IGV2W3Byb3BLZXldXG4gICAgfVxuXG4gICAgdGhpcy5fcmF3RXZlbnQgPSBldlxuICAgIHRoaXMuX2J1YmJsZXMgPSBmYWxzZTtcbn1cblxuUHJveHlFdmVudC5wcm90b3R5cGUucHJldmVudERlZmF1bHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fcmF3RXZlbnQucHJldmVudERlZmF1bHQoKVxufVxuXG5Qcm94eUV2ZW50LnByb3RvdHlwZS5zdGFydFByb3BhZ2F0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2J1YmJsZXMgPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBNb3VzZUV2ZW50KGV2KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBBTExfUFJPUFMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByb3BLZXkgPSBBTExfUFJPUFNbaV1cbiAgICAgICAgdGhpc1twcm9wS2V5XSA9IGV2W3Byb3BLZXldXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBNT1VTRV9QUk9QUy5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIgbW91c2VQcm9wS2V5ID0gTU9VU0VfUFJPUFNbal1cbiAgICAgICAgdGhpc1ttb3VzZVByb3BLZXldID0gZXZbbW91c2VQcm9wS2V5XVxuICAgIH1cblxuICAgIHRoaXMuX3Jhd0V2ZW50ID0gZXZcbn1cblxuaW5oZXJpdHMoTW91c2VFdmVudCwgUHJveHlFdmVudClcblxuZnVuY3Rpb24gS2V5RXZlbnQoZXYpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IEFMTF9QUk9QUy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgcHJvcEtleSA9IEFMTF9QUk9QU1tpXVxuICAgICAgICB0aGlzW3Byb3BLZXldID0gZXZbcHJvcEtleV1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IEtFWV9QUk9QUy5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIga2V5UHJvcEtleSA9IEtFWV9QUk9QU1tqXVxuICAgICAgICB0aGlzW2tleVByb3BLZXldID0gZXZba2V5UHJvcEtleV1cbiAgICB9XG5cbiAgICB0aGlzLl9yYXdFdmVudCA9IGV2XG59XG5cbmluaGVyaXRzKEtleUV2ZW50LCBQcm94eUV2ZW50KVxuIiwidmFyIEV2U3RvcmUgPSByZXF1aXJlKFwiZXYtc3RvcmVcIilcblxubW9kdWxlLmV4cG9ydHMgPSByZW1vdmVFdmVudFxuXG5mdW5jdGlvbiByZW1vdmVFdmVudCh0YXJnZXQsIHR5cGUsIGhhbmRsZXIpIHtcbiAgICB2YXIgZXZlbnRzID0gRXZTdG9yZSh0YXJnZXQpXG4gICAgdmFyIGV2ZW50ID0gZXZlbnRzW3R5cGVdXG5cbiAgICBpZiAoIWV2ZW50KSB7XG4gICAgICAgIHJldHVyblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShldmVudCkpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gZXZlbnQuaW5kZXhPZihoYW5kbGVyKVxuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICBldmVudC5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGV2ZW50ID09PSBoYW5kbGVyKSB7XG4gICAgICAgIGV2ZW50c1t0eXBlXSA9IG51bGxcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBPbmVWZXJzaW9uQ29uc3RyYWludCA9IHJlcXVpcmUoJ2luZGl2aWR1YWwvb25lLXZlcnNpb24nKTtcblxudmFyIE1ZX1ZFUlNJT04gPSAnNyc7XG5PbmVWZXJzaW9uQ29uc3RyYWludCgnZXYtc3RvcmUnLCBNWV9WRVJTSU9OKTtcblxudmFyIGhhc2hLZXkgPSAnX19FVl9TVE9SRV9LRVlAJyArIE1ZX1ZFUlNJT047XG5cbm1vZHVsZS5leHBvcnRzID0gRXZTdG9yZTtcblxuZnVuY3Rpb24gRXZTdG9yZShlbGVtKSB7XG4gICAgdmFyIGhhc2ggPSBlbGVtW2hhc2hLZXldO1xuXG4gICAgaWYgKCFoYXNoKSB7XG4gICAgICAgIGhhc2ggPSBlbGVtW2hhc2hLZXldID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIGhhc2g7XG59XG4iLCJ2YXIgdG9wTGV2ZWwgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6XG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB7fVxudmFyIG1pbkRvYyA9IHJlcXVpcmUoJ21pbi1kb2N1bWVudCcpO1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jdW1lbnQ7XG59IGVsc2Uge1xuICAgIHZhciBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J107XG5cbiAgICBpZiAoIWRvY2N5KSB7XG4gICAgICAgIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXSA9IG1pbkRvYztcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY2N5O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKmdsb2JhbCB3aW5kb3csIGdsb2JhbCovXG5cbnZhciByb290ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgP1xuICAgIHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID9cbiAgICBnbG9iYWwgOiB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbmRpdmlkdWFsO1xuXG5mdW5jdGlvbiBJbmRpdmlkdWFsKGtleSwgdmFsdWUpIHtcbiAgICBpZiAoa2V5IGluIHJvb3QpIHtcbiAgICAgICAgcmV0dXJuIHJvb3Rba2V5XTtcbiAgICB9XG5cbiAgICByb290W2tleV0gPSB2YWx1ZTtcblxuICAgIHJldHVybiB2YWx1ZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEluZGl2aWR1YWwgPSByZXF1aXJlKCcuL2luZGV4LmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gT25lVmVyc2lvbjtcblxuZnVuY3Rpb24gT25lVmVyc2lvbihtb2R1bGVOYW1lLCB2ZXJzaW9uLCBkZWZhdWx0VmFsdWUpIHtcbiAgICB2YXIga2V5ID0gJ19fSU5ESVZJRFVBTF9PTkVfVkVSU0lPTl8nICsgbW9kdWxlTmFtZTtcbiAgICB2YXIgZW5mb3JjZUtleSA9IGtleSArICdfRU5GT1JDRV9TSU5HTEVUT04nO1xuXG4gICAgdmFyIHZlcnNpb25WYWx1ZSA9IEluZGl2aWR1YWwoZW5mb3JjZUtleSwgdmVyc2lvbik7XG5cbiAgICBpZiAodmVyc2lvblZhbHVlICE9PSB2ZXJzaW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG9ubHkgaGF2ZSBvbmUgY29weSBvZiAnICtcbiAgICAgICAgICAgIG1vZHVsZU5hbWUgKyAnLlxcbicgK1xuICAgICAgICAgICAgJ1lvdSBhbHJlYWR5IGhhdmUgdmVyc2lvbiAnICsgdmVyc2lvblZhbHVlICtcbiAgICAgICAgICAgICcgaW5zdGFsbGVkLlxcbicgK1xuICAgICAgICAgICAgJ1RoaXMgbWVhbnMgeW91IGNhbm5vdCBpbnN0YWxsIHZlcnNpb24gJyArIHZlcnNpb24pO1xuICAgIH1cblxuICAgIHJldHVybiBJbmRpdmlkdWFsKGtleSwgZGVmYXVsdFZhbHVlKTtcbn1cbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2xhc3NJZFNwbGl0ID0gLyhbXFwuI10/W2EtekEtWjAtOVxcdTAwN0YtXFx1RkZGRl86LV0rKS87XG52YXIgbm90Q2xhc3NJZCA9IC9eXFwufCMvO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBhcnNlVGFnO1xuXG5mdW5jdGlvbiBwYXJzZVRhZyh0YWcsIHByb3BzKSB7XG4gIGlmICghdGFnKSB7XG4gICAgcmV0dXJuICdESVYnO1xuICB9XG5cbiAgdmFyIG5vSWQgPSAhKHByb3BzLmhhc093blByb3BlcnR5KCdpZCcpKTtcblxuICB2YXIgdGFnUGFydHMgPSB0YWcuc3BsaXQoY2xhc3NJZFNwbGl0KTtcbiAgdmFyIHRhZ05hbWUgPSBudWxsO1xuXG4gIGlmIChub3RDbGFzc0lkLnRlc3QodGFnUGFydHNbMV0pKSB7XG4gICAgdGFnTmFtZSA9ICdESVYnO1xuICB9XG5cbiAgdmFyIGNsYXNzZXMsIHBhcnQsIHR5cGUsIGk7XG5cbiAgZm9yIChpID0gMDsgaSA8IHRhZ1BhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgcGFydCA9IHRhZ1BhcnRzW2ldO1xuXG4gICAgaWYgKCFwYXJ0KSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB0eXBlID0gcGFydC5jaGFyQXQoMCk7XG5cbiAgICBpZiAoIXRhZ05hbWUpIHtcbiAgICAgIHRhZ05hbWUgPSBwYXJ0O1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJy4nKSB7XG4gICAgICBjbGFzc2VzID0gY2xhc3NlcyB8fCBbXTtcbiAgICAgIGNsYXNzZXMucHVzaChwYXJ0LnN1YnN0cmluZygxLCBwYXJ0Lmxlbmd0aCkpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJyMnICYmIG5vSWQpIHtcbiAgICAgIHByb3BzLmlkID0gcGFydC5zdWJzdHJpbmcoMSwgcGFydC5sZW5ndGgpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChjbGFzc2VzKSB7XG4gICAgaWYgKHByb3BzLmNsYXNzTmFtZSkge1xuICAgICAgY2xhc3Nlcy5wdXNoKHByb3BzLmNsYXNzTmFtZSk7XG4gICAgfVxuXG4gICAgcHJvcHMuY2xhc3NOYW1lID0gY2xhc3Nlcy5qb2luKCcgJyk7XG4gIH1cblxuICByZXR1cm4gcHJvcHMubmFtZXNwYWNlID8gdGFnTmFtZSA6IHRhZ05hbWUudG9VcHBlckNhc2UoKTtcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgU3ViamVjdF8xID0gcmVxdWlyZSgnLi9TdWJqZWN0Jyk7XG52YXIgdGhyb3dFcnJvcl8xID0gcmVxdWlyZSgnLi91dGlsL3Rocm93RXJyb3InKTtcbnZhciBPYmplY3RVbnN1YnNjcmliZWRFcnJvcl8xID0gcmVxdWlyZSgnLi91dGlsL09iamVjdFVuc3Vic2NyaWJlZEVycm9yJyk7XG4vKipcbiAqIEBjbGFzcyBCZWhhdmlvclN1YmplY3Q8VD5cbiAqL1xudmFyIEJlaGF2aW9yU3ViamVjdCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJlaGF2aW9yU3ViamVjdCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCZWhhdmlvclN1YmplY3QoX3ZhbHVlKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLl92YWx1ZSA9IF92YWx1ZTtcbiAgICB9XG4gICAgQmVoYXZpb3JTdWJqZWN0LnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzRXJyb3JlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcl8xLnRocm93RXJyb3IodGhpcy5lcnJvclZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yXzEudGhyb3dFcnJvcihuZXcgT2JqZWN0VW5zdWJzY3JpYmVkRXJyb3JfMS5PYmplY3RVbnN1YnNjcmliZWRFcnJvcigpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl92YWx1ZTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEJlaGF2aW9yU3ViamVjdC5wcm90b3R5cGUsIFwidmFsdWVcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFZhbHVlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIEJlaGF2aW9yU3ViamVjdC5wcm90b3R5cGUuX3N1YnNjcmliZSA9IGZ1bmN0aW9uIChzdWJzY3JpYmVyKSB7XG4gICAgICAgIHZhciBzdWJzY3JpcHRpb24gPSBfc3VwZXIucHJvdG90eXBlLl9zdWJzY3JpYmUuY2FsbCh0aGlzLCBzdWJzY3JpYmVyKTtcbiAgICAgICAgaWYgKHN1YnNjcmlwdGlvbiAmJiAhc3Vic2NyaXB0aW9uLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICBzdWJzY3JpYmVyLm5leHQodGhpcy5fdmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgfTtcbiAgICBCZWhhdmlvclN1YmplY3QucHJvdG90eXBlLl9uZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIF9zdXBlci5wcm90b3R5cGUuX25leHQuY2FsbCh0aGlzLCB0aGlzLl92YWx1ZSA9IHZhbHVlKTtcbiAgICB9O1xuICAgIEJlaGF2aW9yU3ViamVjdC5wcm90b3R5cGUuX2Vycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB0aGlzLmhhc0Vycm9yZWQgPSB0cnVlO1xuICAgICAgICBfc3VwZXIucHJvdG90eXBlLl9lcnJvci5jYWxsKHRoaXMsIHRoaXMuZXJyb3JWYWx1ZSA9IGVycik7XG4gICAgfTtcbiAgICByZXR1cm4gQmVoYXZpb3JTdWJqZWN0O1xufShTdWJqZWN0XzEuU3ViamVjdCkpO1xuZXhwb3J0cy5CZWhhdmlvclN1YmplY3QgPSBCZWhhdmlvclN1YmplY3Q7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1CZWhhdmlvclN1YmplY3QuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuL1N1YnNjcmliZXInKTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgSW5uZXJTdWJzY3JpYmVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoSW5uZXJTdWJzY3JpYmVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIElubmVyU3Vic2NyaWJlcihwYXJlbnQsIG91dGVyVmFsdWUsIG91dGVySW5kZXgpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgICAgICB0aGlzLm91dGVyVmFsdWUgPSBvdXRlclZhbHVlO1xuICAgICAgICB0aGlzLm91dGVySW5kZXggPSBvdXRlckluZGV4O1xuICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICB9XG4gICAgSW5uZXJTdWJzY3JpYmVyLnByb3RvdHlwZS5fbmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLnBhcmVudC5ub3RpZnlOZXh0KHRoaXMub3V0ZXJWYWx1ZSwgdmFsdWUsIHRoaXMub3V0ZXJJbmRleCwgdGhpcy5pbmRleCsrLCB0aGlzKTtcbiAgICB9O1xuICAgIElubmVyU3Vic2NyaWJlci5wcm90b3R5cGUuX2Vycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIHRoaXMucGFyZW50Lm5vdGlmeUVycm9yKGVycm9yLCB0aGlzKTtcbiAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgIH07XG4gICAgSW5uZXJTdWJzY3JpYmVyLnByb3RvdHlwZS5fY29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucGFyZW50Lm5vdGlmeUNvbXBsZXRlKHRoaXMpO1xuICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgfTtcbiAgICByZXR1cm4gSW5uZXJTdWJzY3JpYmVyO1xufShTdWJzY3JpYmVyXzEuU3Vic2NyaWJlcikpO1xuZXhwb3J0cy5Jbm5lclN1YnNjcmliZXIgPSBJbm5lclN1YnNjcmliZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1Jbm5lclN1YnNjcmliZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgcm9vdF8xID0gcmVxdWlyZSgnLi91dGlsL3Jvb3QnKTtcbnZhciBvYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuL3N5bWJvbC9vYnNlcnZhYmxlJyk7XG52YXIgdG9TdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuL3V0aWwvdG9TdWJzY3JpYmVyJyk7XG4vKipcbiAqIEEgcmVwcmVzZW50YXRpb24gb2YgYW55IHNldCBvZiB2YWx1ZXMgb3ZlciBhbnkgYW1vdW50IG9mIHRpbWUuIFRoaXMgdGhlIG1vc3QgYmFzaWMgYnVpbGRpbmcgYmxvY2tcbiAqIG9mIFJ4SlMuXG4gKlxuICogQGNsYXNzIE9ic2VydmFibGU8VD5cbiAqL1xudmFyIE9ic2VydmFibGUgPSAoZnVuY3Rpb24gKCkge1xuICAgIC8qKlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IHN1YnNjcmliZSB0aGUgZnVuY3Rpb24gdGhhdCBpcyAgY2FsbGVkIHdoZW4gdGhlIE9ic2VydmFibGUgaXNcbiAgICAgKiBpbml0aWFsbHkgc3Vic2NyaWJlZCB0by4gVGhpcyBmdW5jdGlvbiBpcyBnaXZlbiBhIFN1YnNjcmliZXIsIHRvIHdoaWNoIG5ldyB2YWx1ZXNcbiAgICAgKiBjYW4gYmUgYG5leHRgZWQsIG9yIGFuIGBlcnJvcmAgbWV0aG9kIGNhbiBiZSBjYWxsZWQgdG8gcmFpc2UgYW4gZXJyb3IsIG9yXG4gICAgICogYGNvbXBsZXRlYCBjYW4gYmUgY2FsbGVkIHRvIG5vdGlmeSBvZiBhIHN1Y2Nlc3NmdWwgY29tcGxldGlvbi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBPYnNlcnZhYmxlKHN1YnNjcmliZSkge1xuICAgICAgICB0aGlzLl9pc1NjYWxhciA9IGZhbHNlO1xuICAgICAgICBpZiAoc3Vic2NyaWJlKSB7XG4gICAgICAgICAgICB0aGlzLl9zdWJzY3JpYmUgPSBzdWJzY3JpYmU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBPYnNlcnZhYmxlLCB3aXRoIHRoaXMgT2JzZXJ2YWJsZSBhcyB0aGUgc291cmNlLCBhbmQgdGhlIHBhc3NlZFxuICAgICAqIG9wZXJhdG9yIGRlZmluZWQgYXMgdGhlIG5ldyBvYnNlcnZhYmxlJ3Mgb3BlcmF0b3IuXG4gICAgICogQG1ldGhvZCBsaWZ0XG4gICAgICogQHBhcmFtIHtPcGVyYXRvcn0gb3BlcmF0b3IgdGhlIG9wZXJhdG9yIGRlZmluaW5nIHRoZSBvcGVyYXRpb24gdG8gdGFrZSBvbiB0aGUgb2JzZXJ2YWJsZVxuICAgICAqIEByZXR1cm4ge09ic2VydmFibGV9IGEgbmV3IG9ic2VydmFibGUgd2l0aCB0aGUgT3BlcmF0b3IgYXBwbGllZFxuICAgICAqL1xuICAgIE9ic2VydmFibGUucHJvdG90eXBlLmxpZnQgPSBmdW5jdGlvbiAob3BlcmF0b3IpIHtcbiAgICAgICAgdmFyIG9ic2VydmFibGUgPSBuZXcgT2JzZXJ2YWJsZSgpO1xuICAgICAgICBvYnNlcnZhYmxlLnNvdXJjZSA9IHRoaXM7XG4gICAgICAgIG9ic2VydmFibGUub3BlcmF0b3IgPSBvcGVyYXRvcjtcbiAgICAgICAgcmV0dXJuIG9ic2VydmFibGU7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcnMgaGFuZGxlcnMgZm9yIGhhbmRsaW5nIGVtaXR0ZWQgdmFsdWVzLCBlcnJvciBhbmQgY29tcGxldGlvbnMgZnJvbSB0aGUgb2JzZXJ2YWJsZSwgYW5kXG4gICAgICogIGV4ZWN1dGVzIHRoZSBvYnNlcnZhYmxlJ3Mgc3Vic2NyaWJlciBmdW5jdGlvbiwgd2hpY2ggd2lsbCB0YWtlIGFjdGlvbiB0byBzZXQgdXAgdGhlIHVuZGVybHlpbmcgZGF0YSBzdHJlYW1cbiAgICAgKiBAbWV0aG9kIHN1YnNjcmliZVxuICAgICAqIEBwYXJhbSB7UGFydGlhbE9ic2VydmVyfEZ1bmN0aW9ufSBvYnNlcnZlck9yTmV4dCAob3B0aW9uYWwpIGVpdGhlciBhbiBvYnNlcnZlciBkZWZpbmluZyBhbGwgZnVuY3Rpb25zIHRvIGJlIGNhbGxlZCxcbiAgICAgKiAgb3IgdGhlIGZpcnN0IG9mIHRocmVlIHBvc3NpYmxlIGhhbmRsZXJzLCB3aGljaCBpcyB0aGUgaGFuZGxlciBmb3IgZWFjaCB2YWx1ZSBlbWl0dGVkIGZyb20gdGhlIG9ic2VydmFibGUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZXJyb3IgKG9wdGlvbmFsKSBhIGhhbmRsZXIgZm9yIGEgdGVybWluYWwgZXZlbnQgcmVzdWx0aW5nIGZyb20gYW4gZXJyb3IuIElmIG5vIGVycm9yIGhhbmRsZXIgaXMgcHJvdmlkZWQsXG4gICAgICogIHRoZSBlcnJvciB3aWxsIGJlIHRocm93biBhcyB1bmhhbmRsZWRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb21wbGV0ZSAob3B0aW9uYWwpIGEgaGFuZGxlciBmb3IgYSB0ZXJtaW5hbCBldmVudCByZXN1bHRpbmcgZnJvbSBzdWNjZXNzZnVsIGNvbXBsZXRpb24uXG4gICAgICogQHJldHVybiB7SVN1YnNjcmlwdGlvbn0gYSBzdWJzY3JpcHRpb24gcmVmZXJlbmNlIHRvIHRoZSByZWdpc3RlcmVkIGhhbmRsZXJzXG4gICAgICovXG4gICAgT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlID0gZnVuY3Rpb24gKG9ic2VydmVyT3JOZXh0LCBlcnJvciwgY29tcGxldGUpIHtcbiAgICAgICAgdmFyIG9wZXJhdG9yID0gdGhpcy5vcGVyYXRvcjtcbiAgICAgICAgdmFyIHNpbmsgPSB0b1N1YnNjcmliZXJfMS50b1N1YnNjcmliZXIob2JzZXJ2ZXJPck5leHQsIGVycm9yLCBjb21wbGV0ZSk7XG4gICAgICAgIHNpbmsuYWRkKG9wZXJhdG9yID8gb3BlcmF0b3IuY2FsbChzaW5rLCB0aGlzKSA6IHRoaXMuX3N1YnNjcmliZShzaW5rKSk7XG4gICAgICAgIGlmIChzaW5rLnN5bmNFcnJvclRocm93YWJsZSkge1xuICAgICAgICAgICAgc2luay5zeW5jRXJyb3JUaHJvd2FibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChzaW5rLnN5bmNFcnJvclRocm93bikge1xuICAgICAgICAgICAgICAgIHRocm93IHNpbmsuc3luY0Vycm9yVmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNpbms7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBAbWV0aG9kIGZvckVhY2hcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0IGEgaGFuZGxlciBmb3IgZWFjaCB2YWx1ZSBlbWl0dGVkIGJ5IHRoZSBvYnNlcnZhYmxlXG4gICAgICogQHBhcmFtIHtQcm9taXNlQ29uc3RydWN0b3J9IFtQcm9taXNlQ3Rvcl0gYSBjb25zdHJ1Y3RvciBmdW5jdGlvbiB1c2VkIHRvIGluc3RhbnRpYXRlIHRoZSBQcm9taXNlXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgZWl0aGVyIHJlc29sdmVzIG9uIG9ic2VydmFibGUgY29tcGxldGlvbiBvclxuICAgICAqICByZWplY3RzIHdpdGggdGhlIGhhbmRsZWQgZXJyb3JcbiAgICAgKi9cbiAgICBPYnNlcnZhYmxlLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24gKG5leHQsIFByb21pc2VDdG9yKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmICghUHJvbWlzZUN0b3IpIHtcbiAgICAgICAgICAgIGlmIChyb290XzEucm9vdC5SeCAmJiByb290XzEucm9vdC5SeC5jb25maWcgJiYgcm9vdF8xLnJvb3QuUnguY29uZmlnLlByb21pc2UpIHtcbiAgICAgICAgICAgICAgICBQcm9taXNlQ3RvciA9IHJvb3RfMS5yb290LlJ4LmNvbmZpZy5Qcm9taXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAocm9vdF8xLnJvb3QuUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgIFByb21pc2VDdG9yID0gcm9vdF8xLnJvb3QuUHJvbWlzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIVByb21pc2VDdG9yKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vIFByb21pc2UgaW1wbCBmb3VuZCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZUN0b3IoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIHN1YnNjcmlwdGlvbiA9IF90aGlzLnN1YnNjcmliZShmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHRoZXJlIGlzIGEgc3Vic2NyaXB0aW9uLCB0aGVuIHdlIGNhbiBzdXJtaXNlXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBuZXh0IGhhbmRsaW5nIGlzIGFzeW5jaHJvbm91cy4gQW55IGVycm9ycyB0aHJvd25cbiAgICAgICAgICAgICAgICAgICAgLy8gbmVlZCB0byBiZSByZWplY3RlZCBleHBsaWNpdGx5IGFuZCB1bnN1YnNjcmliZSBtdXN0IGJlXG4gICAgICAgICAgICAgICAgICAgIC8vIGNhbGxlZCBtYW51YWxseVxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgdGhlcmUgaXMgTk8gc3Vic2NyaXB0aW9uLCB0aGVuIHdlJ3JlIGdldHRpbmcgYSBuZXh0ZWRcbiAgICAgICAgICAgICAgICAgICAgLy8gdmFsdWUgc3luY2hyb25vdXNseSBkdXJpbmcgc3Vic2NyaXB0aW9uLiBXZSBjYW4ganVzdCBjYWxsIGl0LlxuICAgICAgICAgICAgICAgICAgICAvLyBJZiBpdCBlcnJvcnMsIE9ic2VydmFibGUncyBgc3Vic2NyaWJlYCBpbXBsZSB3aWxsIGVuc3VyZSB0aGVcbiAgICAgICAgICAgICAgICAgICAgLy8gdW5zdWJzY3JpcHRpb24gbG9naWMgaXMgY2FsbGVkLCB0aGVuIHN5bmNocm9ub3VzbHkgcmV0aHJvdyB0aGUgZXJyb3IuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFmdGVyIHRoYXQsIFByb21pc2Ugd2lsbCB0cmFwIHRoZSBlcnJvciBhbmQgc2VuZCBpdFxuICAgICAgICAgICAgICAgICAgICAvLyBkb3duIHRoZSByZWplY3Rpb24gcGF0aC5cbiAgICAgICAgICAgICAgICAgICAgbmV4dCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgcmVqZWN0LCByZXNvbHZlKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlLnByb3RvdHlwZS5fc3Vic2NyaWJlID0gZnVuY3Rpb24gKHN1YnNjcmliZXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShzdWJzY3JpYmVyKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEFuIGludGVyb3AgcG9pbnQgZGVmaW5lZCBieSB0aGUgZXM3LW9ic2VydmFibGUgc3BlYyBodHRwczovL2dpdGh1Yi5jb20vemVucGFyc2luZy9lcy1vYnNlcnZhYmxlXG4gICAgICogQG1ldGhvZCBTeW1ib2wub2JzZXJ2YWJsZVxuICAgICAqIEByZXR1cm4ge09ic2VydmFibGV9IHRoaXMgaW5zdGFuY2Ugb2YgdGhlIG9ic2VydmFibGVcbiAgICAgKi9cbiAgICBPYnNlcnZhYmxlLnByb3RvdHlwZVtvYnNlcnZhYmxlXzEuJCRvYnNlcnZhYmxlXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICAvLyBIQUNLOiBTaW5jZSBUeXBlU2NyaXB0IGluaGVyaXRzIHN0YXRpYyBwcm9wZXJ0aWVzIHRvbywgd2UgaGF2ZSB0b1xuICAgIC8vIGZpZ2h0IGFnYWluc3QgVHlwZVNjcmlwdCBoZXJlIHNvIFN1YmplY3QgY2FuIGhhdmUgYSBkaWZmZXJlbnQgc3RhdGljIGNyZWF0ZSBzaWduYXR1cmVcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IGNvbGQgT2JzZXJ2YWJsZSBieSBjYWxsaW5nIHRoZSBPYnNlcnZhYmxlIGNvbnN0cnVjdG9yXG4gICAgICogQHN0YXRpYyB0cnVlXG4gICAgICogQG93bmVyIE9ic2VydmFibGVcbiAgICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IHN1YnNjcmliZT8gdGhlIHN1YnNjcmliZXIgZnVuY3Rpb24gdG8gYmUgcGFzc2VkIHRvIHRoZSBPYnNlcnZhYmxlIGNvbnN0cnVjdG9yXG4gICAgICogQHJldHVybiB7T2JzZXJ2YWJsZX0gYSBuZXcgY29sZCBvYnNlcnZhYmxlXG4gICAgICovXG4gICAgT2JzZXJ2YWJsZS5jcmVhdGUgPSBmdW5jdGlvbiAoc3Vic2NyaWJlKSB7XG4gICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZShzdWJzY3JpYmUpO1xuICAgIH07XG4gICAgcmV0dXJuIE9ic2VydmFibGU7XG59KCkpO1xuZXhwb3J0cy5PYnNlcnZhYmxlID0gT2JzZXJ2YWJsZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPU9ic2VydmFibGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5leHBvcnRzLmVtcHR5ID0ge1xuICAgIGlzVW5zdWJzY3JpYmVkOiB0cnVlLFxuICAgIG5leHQ6IGZ1bmN0aW9uICh2YWx1ZSkgeyB9LFxuICAgIGVycm9yOiBmdW5jdGlvbiAoZXJyKSB7IHRocm93IGVycjsgfSxcbiAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkgeyB9XG59O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9T2JzZXJ2ZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuL1N1YnNjcmliZXInKTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgT3V0ZXJTdWJzY3JpYmVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoT3V0ZXJTdWJzY3JpYmVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE91dGVyU3Vic2NyaWJlcigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE91dGVyU3Vic2NyaWJlci5wcm90b3R5cGUubm90aWZ5TmV4dCA9IGZ1bmN0aW9uIChvdXRlclZhbHVlLCBpbm5lclZhbHVlLCBvdXRlckluZGV4LCBpbm5lckluZGV4LCBpbm5lclN1Yikge1xuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLm5leHQoaW5uZXJWYWx1ZSk7XG4gICAgfTtcbiAgICBPdXRlclN1YnNjcmliZXIucHJvdG90eXBlLm5vdGlmeUVycm9yID0gZnVuY3Rpb24gKGVycm9yLCBpbm5lclN1Yikge1xuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmVycm9yKGVycm9yKTtcbiAgICB9O1xuICAgIE91dGVyU3Vic2NyaWJlci5wcm90b3R5cGUubm90aWZ5Q29tcGxldGUgPSBmdW5jdGlvbiAoaW5uZXJTdWIpIHtcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5jb21wbGV0ZSgpO1xuICAgIH07XG4gICAgcmV0dXJuIE91dGVyU3Vic2NyaWJlcjtcbn0oU3Vic2NyaWJlcl8xLlN1YnNjcmliZXIpKTtcbmV4cG9ydHMuT3V0ZXJTdWJzY3JpYmVyID0gT3V0ZXJTdWJzY3JpYmVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9T3V0ZXJTdWJzY3JpYmVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi9PYnNlcnZhYmxlJyk7XG52YXIgU3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi9TdWJzY3JpYmVyJyk7XG52YXIgU3Vic2NyaXB0aW9uXzEgPSByZXF1aXJlKCcuL1N1YnNjcmlwdGlvbicpO1xudmFyIFN1YmplY3RTdWJzY3JpcHRpb25fMSA9IHJlcXVpcmUoJy4vU3ViamVjdFN1YnNjcmlwdGlvbicpO1xudmFyIHJ4U3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi9zeW1ib2wvcnhTdWJzY3JpYmVyJyk7XG52YXIgdGhyb3dFcnJvcl8xID0gcmVxdWlyZSgnLi91dGlsL3Rocm93RXJyb3InKTtcbnZhciBPYmplY3RVbnN1YnNjcmliZWRFcnJvcl8xID0gcmVxdWlyZSgnLi91dGlsL09iamVjdFVuc3Vic2NyaWJlZEVycm9yJyk7XG4vKipcbiAqIEBjbGFzcyBTdWJqZWN0PFQ+XG4gKi9cbnZhciBTdWJqZWN0ID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoU3ViamVjdCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTdWJqZWN0KGRlc3RpbmF0aW9uLCBzb3VyY2UpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24gPSBkZXN0aW5hdGlvbjtcbiAgICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXJzID0gW107XG4gICAgICAgIHRoaXMuaXNVbnN1YnNjcmliZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5pc1N0b3BwZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNFcnJvcmVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNDb21wbGV0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgfVxuICAgIFN1YmplY3QucHJvdG90eXBlLmxpZnQgPSBmdW5jdGlvbiAob3BlcmF0b3IpIHtcbiAgICAgICAgdmFyIHN1YmplY3QgPSBuZXcgU3ViamVjdCh0aGlzLmRlc3RpbmF0aW9uIHx8IHRoaXMsIHRoaXMpO1xuICAgICAgICBzdWJqZWN0Lm9wZXJhdG9yID0gb3BlcmF0b3I7XG4gICAgICAgIHJldHVybiBzdWJqZWN0O1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKHN1YnNjcmlwdGlvbikge1xuICAgICAgICByZXR1cm4gU3Vic2NyaXB0aW9uXzEuU3Vic2NyaXB0aW9uLnByb3RvdHlwZS5hZGQuY2FsbCh0aGlzLCBzdWJzY3JpcHRpb24pO1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKHN1YnNjcmlwdGlvbikge1xuICAgICAgICBTdWJzY3JpcHRpb25fMS5TdWJzY3JpcHRpb24ucHJvdG90eXBlLnJlbW92ZS5jYWxsKHRoaXMsIHN1YnNjcmlwdGlvbik7XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgU3Vic2NyaXB0aW9uXzEuU3Vic2NyaXB0aW9uLnByb3RvdHlwZS51bnN1YnNjcmliZS5jYWxsKHRoaXMpO1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUuX3N1YnNjcmliZSA9IGZ1bmN0aW9uIChzdWJzY3JpYmVyKSB7XG4gICAgICAgIGlmICh0aGlzLnNvdXJjZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShzdWJzY3JpYmVyKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmIChzdWJzY3JpYmVyLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5oYXNFcnJvcmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YnNjcmliZXIuZXJyb3IodGhpcy5lcnJvclZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuaGFzQ29tcGxldGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMudGhyb3dJZlVuc3Vic2NyaWJlZCgpO1xuICAgICAgICAgICAgdmFyIHN1YnNjcmlwdGlvbiA9IG5ldyBTdWJqZWN0U3Vic2NyaXB0aW9uXzEuU3ViamVjdFN1YnNjcmlwdGlvbih0aGlzLCBzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIHRoaXMub2JzZXJ2ZXJzLnB1c2goc3Vic2NyaWJlcik7XG4gICAgICAgICAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS5fdW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc291cmNlID0gbnVsbDtcbiAgICAgICAgdGhpcy5pc1N0b3BwZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLm9ic2VydmVycyA9IG51bGw7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24gPSBudWxsO1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLnRocm93SWZVbnN1YnNjcmliZWQoKTtcbiAgICAgICAgaWYgKHRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kaXNwYXRjaGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuX25leHQodmFsdWUpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoaW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmhhc0Vycm9yZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKHRoaXMuZXJyb3JWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5oYXNDb21wbGV0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2NvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN1YmplY3QucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB0aGlzLnRocm93SWZVbnN1YnNjcmliZWQoKTtcbiAgICAgICAgaWYgKHRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pc1N0b3BwZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmhhc0Vycm9yZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmVycm9yVmFsdWUgPSBlcnI7XG4gICAgICAgIGlmICh0aGlzLmRpc3BhdGNoaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZXJyb3IoZXJyKTtcbiAgICB9O1xuICAgIFN1YmplY3QucHJvdG90eXBlLmNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnRocm93SWZVbnN1YnNjcmliZWQoKTtcbiAgICAgICAgaWYgKHRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pc1N0b3BwZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmhhc0NvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgIGlmICh0aGlzLmRpc3BhdGNoaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY29tcGxldGUoKTtcbiAgICB9O1xuICAgIFN1YmplY3QucHJvdG90eXBlLmFzT2JzZXJ2YWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9ic2VydmFibGUgPSBuZXcgU3ViamVjdE9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiBvYnNlcnZhYmxlO1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUuX25leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKHRoaXMuZGVzdGluYXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24ubmV4dCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9maW5hbE5leHQodmFsdWUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS5fZmluYWxOZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciBpbmRleCA9IC0xO1xuICAgICAgICB2YXIgb2JzZXJ2ZXJzID0gdGhpcy5vYnNlcnZlcnMuc2xpY2UoMCk7XG4gICAgICAgIHZhciBsZW4gPSBvYnNlcnZlcnMubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoKytpbmRleCA8IGxlbikge1xuICAgICAgICAgICAgb2JzZXJ2ZXJzW2luZGV4XS5uZXh0KHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUuX2Vycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICBpZiAodGhpcy5kZXN0aW5hdGlvbikge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5lcnJvcihlcnIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZmluYWxFcnJvcihlcnIpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS5fZmluYWxFcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gLTE7XG4gICAgICAgIHZhciBvYnNlcnZlcnMgPSB0aGlzLm9ic2VydmVycztcbiAgICAgICAgLy8gb3B0aW1pemF0aW9uIHRvIGJsb2NrIG91ciBTdWJqZWN0U3Vic2NyaXB0aW9ucyBmcm9tXG4gICAgICAgIC8vIHNwbGljaW5nIHRoZW1zZWx2ZXMgb3V0IG9mIHRoZSBvYnNlcnZlcnMgbGlzdCBvbmUgYnkgb25lLlxuICAgICAgICB0aGlzLm9ic2VydmVycyA9IG51bGw7XG4gICAgICAgIHRoaXMuaXNVbnN1YnNjcmliZWQgPSB0cnVlO1xuICAgICAgICBpZiAob2JzZXJ2ZXJzKSB7XG4gICAgICAgICAgICB2YXIgbGVuID0gb2JzZXJ2ZXJzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXJzW2luZGV4XS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXNVbnN1YnNjcmliZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUuX2NvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5kZXN0aW5hdGlvbikge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZmluYWxDb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS5fZmluYWxDb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gLTE7XG4gICAgICAgIHZhciBvYnNlcnZlcnMgPSB0aGlzLm9ic2VydmVycztcbiAgICAgICAgLy8gb3B0aW1pemF0aW9uIHRvIGJsb2NrIG91ciBTdWJqZWN0U3Vic2NyaXB0aW9ucyBmcm9tXG4gICAgICAgIC8vIHNwbGljaW5nIHRoZW1zZWx2ZXMgb3V0IG9mIHRoZSBvYnNlcnZlcnMgbGlzdCBvbmUgYnkgb25lLlxuICAgICAgICB0aGlzLm9ic2VydmVycyA9IG51bGw7XG4gICAgICAgIHRoaXMuaXNVbnN1YnNjcmliZWQgPSB0cnVlO1xuICAgICAgICBpZiAob2JzZXJ2ZXJzKSB7XG4gICAgICAgICAgICB2YXIgbGVuID0gb2JzZXJ2ZXJzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXJzW2luZGV4XS5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXNVbnN1YnNjcmliZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUudGhyb3dJZlVuc3Vic2NyaWJlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JfMS50aHJvd0Vycm9yKG5ldyBPYmplY3RVbnN1YnNjcmliZWRFcnJvcl8xLk9iamVjdFVuc3Vic2NyaWJlZEVycm9yKCkpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZVtyeFN1YnNjcmliZXJfMS4kJHJ4U3Vic2NyaWJlcl0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3Vic2NyaWJlcl8xLlN1YnNjcmliZXIodGhpcyk7XG4gICAgfTtcbiAgICBTdWJqZWN0LmNyZWF0ZSA9IGZ1bmN0aW9uIChkZXN0aW5hdGlvbiwgc291cmNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3ViamVjdChkZXN0aW5hdGlvbiwgc291cmNlKTtcbiAgICB9O1xuICAgIHJldHVybiBTdWJqZWN0O1xufShPYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZSkpO1xuZXhwb3J0cy5TdWJqZWN0ID0gU3ViamVjdDtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgU3ViamVjdE9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTdWJqZWN0T2JzZXJ2YWJsZSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTdWJqZWN0T2JzZXJ2YWJsZShzb3VyY2UpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgIH1cbiAgICByZXR1cm4gU3ViamVjdE9ic2VydmFibGU7XG59KE9ic2VydmFibGVfMS5PYnNlcnZhYmxlKSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1TdWJqZWN0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgU3Vic2NyaXB0aW9uXzEgPSByZXF1aXJlKCcuL1N1YnNjcmlwdGlvbicpO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBTdWJqZWN0U3Vic2NyaXB0aW9uID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoU3ViamVjdFN1YnNjcmlwdGlvbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTdWJqZWN0U3Vic2NyaXB0aW9uKHN1YmplY3QsIG9ic2VydmVyKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLnN1YmplY3QgPSBzdWJqZWN0O1xuICAgICAgICB0aGlzLm9ic2VydmVyID0gb2JzZXJ2ZXI7XG4gICAgICAgIHRoaXMuaXNVbnN1YnNjcmliZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgU3ViamVjdFN1YnNjcmlwdGlvbi5wcm90b3R5cGUudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pc1Vuc3Vic2NyaWJlZCA9IHRydWU7XG4gICAgICAgIHZhciBzdWJqZWN0ID0gdGhpcy5zdWJqZWN0O1xuICAgICAgICB2YXIgb2JzZXJ2ZXJzID0gc3ViamVjdC5vYnNlcnZlcnM7XG4gICAgICAgIHRoaXMuc3ViamVjdCA9IG51bGw7XG4gICAgICAgIGlmICghb2JzZXJ2ZXJzIHx8IG9ic2VydmVycy5sZW5ndGggPT09IDAgfHwgc3ViamVjdC5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdWJzY3JpYmVySW5kZXggPSBvYnNlcnZlcnMuaW5kZXhPZih0aGlzLm9ic2VydmVyKTtcbiAgICAgICAgaWYgKHN1YnNjcmliZXJJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIG9ic2VydmVycy5zcGxpY2Uoc3Vic2NyaWJlckluZGV4LCAxKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIFN1YmplY3RTdWJzY3JpcHRpb247XG59KFN1YnNjcmlwdGlvbl8xLlN1YnNjcmlwdGlvbikpO1xuZXhwb3J0cy5TdWJqZWN0U3Vic2NyaXB0aW9uID0gU3ViamVjdFN1YnNjcmlwdGlvbjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPVN1YmplY3RTdWJzY3JpcHRpb24uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBpc0Z1bmN0aW9uXzEgPSByZXF1aXJlKCcuL3V0aWwvaXNGdW5jdGlvbicpO1xudmFyIFN1YnNjcmlwdGlvbl8xID0gcmVxdWlyZSgnLi9TdWJzY3JpcHRpb24nKTtcbnZhciByeFN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4vc3ltYm9sL3J4U3Vic2NyaWJlcicpO1xudmFyIE9ic2VydmVyXzEgPSByZXF1aXJlKCcuL09ic2VydmVyJyk7XG4vKipcbiAqIEltcGxlbWVudHMgdGhlIHtAbGluayBPYnNlcnZlcn0gaW50ZXJmYWNlIGFuZCBleHRlbmRzIHRoZVxuICoge0BsaW5rIFN1YnNjcmlwdGlvbn0gY2xhc3MuIFdoaWxlIHRoZSB7QGxpbmsgT2JzZXJ2ZXJ9IGlzIHRoZSBwdWJsaWMgQVBJIGZvclxuICogY29uc3VtaW5nIHRoZSB2YWx1ZXMgb2YgYW4ge0BsaW5rIE9ic2VydmFibGV9LCBhbGwgT2JzZXJ2ZXJzIGdldCBjb252ZXJ0ZWQgdG9cbiAqIGEgU3Vic2NyaWJlciwgaW4gb3JkZXIgdG8gcHJvdmlkZSBTdWJzY3JpcHRpb24tbGlrZSBjYXBhYmlsaXRpZXMgc3VjaCBhc1xuICogYHVuc3Vic2NyaWJlYC4gU3Vic2NyaWJlciBpcyBhIGNvbW1vbiB0eXBlIGluIFJ4SlMsIGFuZCBjcnVjaWFsIGZvclxuICogaW1wbGVtZW50aW5nIG9wZXJhdG9ycywgYnV0IGl0IGlzIHJhcmVseSB1c2VkIGFzIGEgcHVibGljIEFQSS5cbiAqXG4gKiBAY2xhc3MgU3Vic2NyaWJlcjxUPlxuICovXG52YXIgU3Vic2NyaWJlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFN1YnNjcmliZXIsIF9zdXBlcik7XG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtPYnNlcnZlcnxmdW5jdGlvbih2YWx1ZTogVCk6IHZvaWR9IFtkZXN0aW5hdGlvbk9yTmV4dF0gQSBwYXJ0aWFsbHlcbiAgICAgKiBkZWZpbmVkIE9ic2VydmVyIG9yIGEgYG5leHRgIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb24oZTogP2FueSk6IHZvaWR9IFtlcnJvcl0gVGhlIGBlcnJvcmAgY2FsbGJhY2sgb2YgYW5cbiAgICAgKiBPYnNlcnZlci5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9uKCk6IHZvaWR9IFtjb21wbGV0ZV0gVGhlIGBjb21wbGV0ZWAgY2FsbGJhY2sgb2YgYW5cbiAgICAgKiBPYnNlcnZlci5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBTdWJzY3JpYmVyKGRlc3RpbmF0aW9uT3JOZXh0LCBlcnJvciwgY29tcGxldGUpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuc3luY0Vycm9yVmFsdWUgPSBudWxsO1xuICAgICAgICB0aGlzLnN5bmNFcnJvclRocm93biA9IGZhbHNlO1xuICAgICAgICB0aGlzLnN5bmNFcnJvclRocm93YWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlzU3RvcHBlZCA9IGZhbHNlO1xuICAgICAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uID0gT2JzZXJ2ZXJfMS5lbXB0eTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICBpZiAoIWRlc3RpbmF0aW9uT3JOZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24gPSBPYnNlcnZlcl8xLmVtcHR5O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBkZXN0aW5hdGlvbk9yTmV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlc3RpbmF0aW9uT3JOZXh0IGluc3RhbmNlb2YgU3Vic2NyaWJlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbiA9IGRlc3RpbmF0aW9uT3JOZXh0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5hZGQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN5bmNFcnJvclRocm93YWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uID0gbmV3IFNhZmVTdWJzY3JpYmVyKHRoaXMsIGRlc3RpbmF0aW9uT3JOZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRoaXMuc3luY0Vycm9yVGhyb3dhYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uID0gbmV3IFNhZmVTdWJzY3JpYmVyKHRoaXMsIGRlc3RpbmF0aW9uT3JOZXh0LCBlcnJvciwgY29tcGxldGUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEEgc3RhdGljIGZhY3RvcnkgZm9yIGEgU3Vic2NyaWJlciwgZ2l2ZW4gYSAocG90ZW50aWFsbHkgcGFydGlhbCkgZGVmaW5pdGlvblxuICAgICAqIG9mIGFuIE9ic2VydmVyLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb24oeDogP1QpOiB2b2lkfSBbbmV4dF0gVGhlIGBuZXh0YCBjYWxsYmFjayBvZiBhbiBPYnNlcnZlci5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9uKGU6ID9hbnkpOiB2b2lkfSBbZXJyb3JdIFRoZSBgZXJyb3JgIGNhbGxiYWNrIG9mIGFuXG4gICAgICogT2JzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbigpOiB2b2lkfSBbY29tcGxldGVdIFRoZSBgY29tcGxldGVgIGNhbGxiYWNrIG9mIGFuXG4gICAgICogT2JzZXJ2ZXIuXG4gICAgICogQHJldHVybiB7U3Vic2NyaWJlcjxUPn0gQSBTdWJzY3JpYmVyIHdyYXBwaW5nIHRoZSAocGFydGlhbGx5IGRlZmluZWQpXG4gICAgICogT2JzZXJ2ZXIgcmVwcmVzZW50ZWQgYnkgdGhlIGdpdmVuIGFyZ3VtZW50cy5cbiAgICAgKi9cbiAgICBTdWJzY3JpYmVyLmNyZWF0ZSA9IGZ1bmN0aW9uIChuZXh0LCBlcnJvciwgY29tcGxldGUpIHtcbiAgICAgICAgdmFyIHN1YnNjcmliZXIgPSBuZXcgU3Vic2NyaWJlcihuZXh0LCBlcnJvciwgY29tcGxldGUpO1xuICAgICAgICBzdWJzY3JpYmVyLnN5bmNFcnJvclRocm93YWJsZSA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gc3Vic2NyaWJlcjtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFRoZSB7QGxpbmsgT2JzZXJ2ZXJ9IGNhbGxiYWNrIHRvIHJlY2VpdmUgbm90aWZpY2F0aW9ucyBvZiB0eXBlIGBuZXh0YCBmcm9tXG4gICAgICogdGhlIE9ic2VydmFibGUsIHdpdGggYSB2YWx1ZS4gVGhlIE9ic2VydmFibGUgbWF5IGNhbGwgdGhpcyBtZXRob2QgMCBvciBtb3JlXG4gICAgICogdGltZXMuXG4gICAgICogQHBhcmFtIHtUfSBbdmFsdWVdIFRoZSBgbmV4dGAgdmFsdWUuXG4gICAgICogQHJldHVybiB7dm9pZH1cbiAgICAgKi9cbiAgICBTdWJzY3JpYmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmICghdGhpcy5pc1N0b3BwZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX25leHQodmFsdWUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBUaGUge0BsaW5rIE9ic2VydmVyfSBjYWxsYmFjayB0byByZWNlaXZlIG5vdGlmaWNhdGlvbnMgb2YgdHlwZSBgZXJyb3JgIGZyb21cbiAgICAgKiB0aGUgT2JzZXJ2YWJsZSwgd2l0aCBhbiBhdHRhY2hlZCB7QGxpbmsgRXJyb3J9LiBOb3RpZmllcyB0aGUgT2JzZXJ2ZXIgdGhhdFxuICAgICAqIHRoZSBPYnNlcnZhYmxlIGhhcyBleHBlcmllbmNlZCBhbiBlcnJvciBjb25kaXRpb24uXG4gICAgICogQHBhcmFtIHthbnl9IFtlcnJdIFRoZSBgZXJyb3JgIGV4Y2VwdGlvbi5cbiAgICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgICAqL1xuICAgIFN1YnNjcmliZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICBpZiAoIXRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgICAgICB0aGlzLmlzU3RvcHBlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lcnJvcihlcnIpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBUaGUge0BsaW5rIE9ic2VydmVyfSBjYWxsYmFjayB0byByZWNlaXZlIGEgdmFsdWVsZXNzIG5vdGlmaWNhdGlvbiBvZiB0eXBlXG4gICAgICogYGNvbXBsZXRlYCBmcm9tIHRoZSBPYnNlcnZhYmxlLiBOb3RpZmllcyB0aGUgT2JzZXJ2ZXIgdGhhdCB0aGUgT2JzZXJ2YWJsZVxuICAgICAqIGhhcyBmaW5pc2hlZCBzZW5kaW5nIHB1c2gtYmFzZWQgbm90aWZpY2F0aW9ucy5cbiAgICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgICAqL1xuICAgIFN1YnNjcmliZXIucHJvdG90eXBlLmNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgICAgICB0aGlzLmlzU3RvcHBlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdWJzY3JpYmVyLnByb3RvdHlwZS51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlzU3RvcHBlZCA9IHRydWU7XG4gICAgICAgIF9zdXBlci5wcm90b3R5cGUudW5zdWJzY3JpYmUuY2FsbCh0aGlzKTtcbiAgICB9O1xuICAgIFN1YnNjcmliZXIucHJvdG90eXBlLl9uZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24ubmV4dCh2YWx1ZSk7XG4gICAgfTtcbiAgICBTdWJzY3JpYmVyLnByb3RvdHlwZS5fZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24uZXJyb3IoZXJyKTtcbiAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgIH07XG4gICAgU3Vic2NyaWJlci5wcm90b3R5cGUuX2NvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmNvbXBsZXRlKCk7XG4gICAgICAgIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICB9O1xuICAgIFN1YnNjcmliZXIucHJvdG90eXBlW3J4U3Vic2NyaWJlcl8xLiQkcnhTdWJzY3JpYmVyXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICByZXR1cm4gU3Vic2NyaWJlcjtcbn0oU3Vic2NyaXB0aW9uXzEuU3Vic2NyaXB0aW9uKSk7XG5leHBvcnRzLlN1YnNjcmliZXIgPSBTdWJzY3JpYmVyO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBTYWZlU3Vic2NyaWJlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFNhZmVTdWJzY3JpYmVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFNhZmVTdWJzY3JpYmVyKF9wYXJlbnQsIG9ic2VydmVyT3JOZXh0LCBlcnJvciwgY29tcGxldGUpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuX3BhcmVudCA9IF9wYXJlbnQ7XG4gICAgICAgIHZhciBuZXh0O1xuICAgICAgICB2YXIgY29udGV4dCA9IHRoaXM7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uXzEuaXNGdW5jdGlvbihvYnNlcnZlck9yTmV4dCkpIHtcbiAgICAgICAgICAgIG5leHQgPSBvYnNlcnZlck9yTmV4dDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChvYnNlcnZlck9yTmV4dCkge1xuICAgICAgICAgICAgY29udGV4dCA9IG9ic2VydmVyT3JOZXh0O1xuICAgICAgICAgICAgbmV4dCA9IG9ic2VydmVyT3JOZXh0Lm5leHQ7XG4gICAgICAgICAgICBlcnJvciA9IG9ic2VydmVyT3JOZXh0LmVycm9yO1xuICAgICAgICAgICAgY29tcGxldGUgPSBvYnNlcnZlck9yTmV4dC5jb21wbGV0ZTtcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uXzEuaXNGdW5jdGlvbihjb250ZXh0LnVuc3Vic2NyaWJlKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkKGNvbnRleHQudW5zdWJzY3JpYmUuYmluZChjb250ZXh0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250ZXh0LnVuc3Vic2NyaWJlID0gdGhpcy51bnN1YnNjcmliZS5iaW5kKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICB0aGlzLl9uZXh0ID0gbmV4dDtcbiAgICAgICAgdGhpcy5fZXJyb3IgPSBlcnJvcjtcbiAgICAgICAgdGhpcy5fY29tcGxldGUgPSBjb21wbGV0ZTtcbiAgICB9XG4gICAgU2FmZVN1YnNjcmliZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzU3RvcHBlZCAmJiB0aGlzLl9uZXh0KSB7XG4gICAgICAgICAgICB2YXIgX3BhcmVudCA9IHRoaXMuX3BhcmVudDtcbiAgICAgICAgICAgIGlmICghX3BhcmVudC5zeW5jRXJyb3JUaHJvd2FibGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9fdHJ5T3JVbnN1Yih0aGlzLl9uZXh0LCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzLl9fdHJ5T3JTZXRFcnJvcihfcGFyZW50LCB0aGlzLl9uZXh0LCB2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFNhZmVTdWJzY3JpYmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzU3RvcHBlZCkge1xuICAgICAgICAgICAgdmFyIF9wYXJlbnQgPSB0aGlzLl9wYXJlbnQ7XG4gICAgICAgICAgICBpZiAodGhpcy5fZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoIV9wYXJlbnQuc3luY0Vycm9yVGhyb3dhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX190cnlPclVuc3ViKHRoaXMuX2Vycm9yLCBlcnIpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fdHJ5T3JTZXRFcnJvcihfcGFyZW50LCB0aGlzLl9lcnJvciwgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCFfcGFyZW50LnN5bmNFcnJvclRocm93YWJsZSkge1xuICAgICAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBfcGFyZW50LnN5bmNFcnJvclZhbHVlID0gZXJyO1xuICAgICAgICAgICAgICAgIF9wYXJlbnQuc3luY0Vycm9yVGhyb3duID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFNhZmVTdWJzY3JpYmVyLnByb3RvdHlwZS5jb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzU3RvcHBlZCkge1xuICAgICAgICAgICAgdmFyIF9wYXJlbnQgPSB0aGlzLl9wYXJlbnQ7XG4gICAgICAgICAgICBpZiAodGhpcy5fY29tcGxldGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIV9wYXJlbnQuc3luY0Vycm9yVGhyb3dhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX190cnlPclVuc3ViKHRoaXMuX2NvbXBsZXRlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3RyeU9yU2V0RXJyb3IoX3BhcmVudCwgdGhpcy5fY29tcGxldGUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBTYWZlU3Vic2NyaWJlci5wcm90b3R5cGUuX190cnlPclVuc3ViID0gZnVuY3Rpb24gKGZuLCB2YWx1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZm4uY2FsbCh0aGlzLl9jb250ZXh0LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTYWZlU3Vic2NyaWJlci5wcm90b3R5cGUuX190cnlPclNldEVycm9yID0gZnVuY3Rpb24gKHBhcmVudCwgZm4sIHZhbHVlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmbi5jYWxsKHRoaXMuX2NvbnRleHQsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBwYXJlbnQuc3luY0Vycm9yVmFsdWUgPSBlcnI7XG4gICAgICAgICAgICBwYXJlbnQuc3luY0Vycm9yVGhyb3duID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIFNhZmVTdWJzY3JpYmVyLnByb3RvdHlwZS5fdW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfcGFyZW50ID0gdGhpcy5fcGFyZW50O1xuICAgICAgICB0aGlzLl9jb250ZXh0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fcGFyZW50ID0gbnVsbDtcbiAgICAgICAgX3BhcmVudC51bnN1YnNjcmliZSgpO1xuICAgIH07XG4gICAgcmV0dXJuIFNhZmVTdWJzY3JpYmVyO1xufShTdWJzY3JpYmVyKSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1TdWJzY3JpYmVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIGlzQXJyYXlfMSA9IHJlcXVpcmUoJy4vdXRpbC9pc0FycmF5Jyk7XG52YXIgaXNPYmplY3RfMSA9IHJlcXVpcmUoJy4vdXRpbC9pc09iamVjdCcpO1xudmFyIGlzRnVuY3Rpb25fMSA9IHJlcXVpcmUoJy4vdXRpbC9pc0Z1bmN0aW9uJyk7XG52YXIgdHJ5Q2F0Y2hfMSA9IHJlcXVpcmUoJy4vdXRpbC90cnlDYXRjaCcpO1xudmFyIGVycm9yT2JqZWN0XzEgPSByZXF1aXJlKCcuL3V0aWwvZXJyb3JPYmplY3QnKTtcbnZhciBVbnN1YnNjcmlwdGlvbkVycm9yXzEgPSByZXF1aXJlKCcuL3V0aWwvVW5zdWJzY3JpcHRpb25FcnJvcicpO1xuLyoqXG4gKiBSZXByZXNlbnRzIGEgZGlzcG9zYWJsZSByZXNvdXJjZSwgc3VjaCBhcyB0aGUgZXhlY3V0aW9uIG9mIGFuIE9ic2VydmFibGUuIEFcbiAqIFN1YnNjcmlwdGlvbiBoYXMgb25lIGltcG9ydGFudCBtZXRob2QsIGB1bnN1YnNjcmliZWAsIHRoYXQgdGFrZXMgbm8gYXJndW1lbnRcbiAqIGFuZCBqdXN0IGRpc3Bvc2VzIHRoZSByZXNvdXJjZSBoZWxkIGJ5IHRoZSBzdWJzY3JpcHRpb24uXG4gKlxuICogQWRkaXRpb25hbGx5LCBzdWJzY3JpcHRpb25zIG1heSBiZSBncm91cGVkIHRvZ2V0aGVyIHRocm91Z2ggdGhlIGBhZGQoKWBcbiAqIG1ldGhvZCwgd2hpY2ggd2lsbCBhdHRhY2ggYSBjaGlsZCBTdWJzY3JpcHRpb24gdG8gdGhlIGN1cnJlbnQgU3Vic2NyaXB0aW9uLlxuICogV2hlbiBhIFN1YnNjcmlwdGlvbiBpcyB1bnN1YnNjcmliZWQsIGFsbCBpdHMgY2hpbGRyZW4gKGFuZCBpdHMgZ3JhbmRjaGlsZHJlbilcbiAqIHdpbGwgYmUgdW5zdWJzY3JpYmVkIGFzIHdlbGwuXG4gKlxuICogQGNsYXNzIFN1YnNjcmlwdGlvblxuICovXG52YXIgU3Vic2NyaXB0aW9uID0gKGZ1bmN0aW9uICgpIHtcbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9uKCk6IHZvaWR9IFt1bnN1YnNjcmliZV0gQSBmdW5jdGlvbiBkZXNjcmliaW5nIGhvdyB0b1xuICAgICAqIHBlcmZvcm0gdGhlIGRpc3Bvc2FsIG9mIHJlc291cmNlcyB3aGVuIHRoZSBgdW5zdWJzY3JpYmVgIG1ldGhvZCBpcyBjYWxsZWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gU3Vic2NyaXB0aW9uKHVuc3Vic2NyaWJlKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBIGZsYWcgdG8gaW5kaWNhdGUgd2hldGhlciB0aGlzIFN1YnNjcmlwdGlvbiBoYXMgYWxyZWFkeSBiZWVuIHVuc3Vic2NyaWJlZC5cbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmlzVW5zdWJzY3JpYmVkID0gZmFsc2U7XG4gICAgICAgIGlmICh1bnN1YnNjcmliZSkge1xuICAgICAgICAgICAgdGhpcy5fdW5zdWJzY3JpYmUgPSB1bnN1YnNjcmliZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBEaXNwb3NlcyB0aGUgcmVzb3VyY2VzIGhlbGQgYnkgdGhlIHN1YnNjcmlwdGlvbi4gTWF5LCBmb3IgaW5zdGFuY2UsIGNhbmNlbFxuICAgICAqIGFuIG9uZ29pbmcgT2JzZXJ2YWJsZSBleGVjdXRpb24gb3IgY2FuY2VsIGFueSBvdGhlciB0eXBlIG9mIHdvcmsgdGhhdFxuICAgICAqIHN0YXJ0ZWQgd2hlbiB0aGUgU3Vic2NyaXB0aW9uIHdhcyBjcmVhdGVkLlxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgU3Vic2NyaXB0aW9uLnByb3RvdHlwZS51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhhc0Vycm9ycyA9IGZhbHNlO1xuICAgICAgICB2YXIgZXJyb3JzO1xuICAgICAgICBpZiAodGhpcy5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXNVbnN1YnNjcmliZWQgPSB0cnVlO1xuICAgICAgICB2YXIgX2EgPSB0aGlzLCBfdW5zdWJzY3JpYmUgPSBfYS5fdW5zdWJzY3JpYmUsIF9zdWJzY3JpcHRpb25zID0gX2EuX3N1YnNjcmlwdGlvbnM7XG4gICAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMgPSBudWxsO1xuICAgICAgICBpZiAoaXNGdW5jdGlvbl8xLmlzRnVuY3Rpb24oX3Vuc3Vic2NyaWJlKSkge1xuICAgICAgICAgICAgdmFyIHRyaWFsID0gdHJ5Q2F0Y2hfMS50cnlDYXRjaChfdW5zdWJzY3JpYmUpLmNhbGwodGhpcyk7XG4gICAgICAgICAgICBpZiAodHJpYWwgPT09IGVycm9yT2JqZWN0XzEuZXJyb3JPYmplY3QpIHtcbiAgICAgICAgICAgICAgICBoYXNFcnJvcnMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIChlcnJvcnMgPSBlcnJvcnMgfHwgW10pLnB1c2goZXJyb3JPYmplY3RfMS5lcnJvck9iamVjdC5lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNBcnJheV8xLmlzQXJyYXkoX3N1YnNjcmlwdGlvbnMpKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSAtMTtcbiAgICAgICAgICAgIHZhciBsZW4gPSBfc3Vic2NyaXB0aW9ucy5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoKytpbmRleCA8IGxlbikge1xuICAgICAgICAgICAgICAgIHZhciBzdWIgPSBfc3Vic2NyaXB0aW9uc1tpbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKGlzT2JqZWN0XzEuaXNPYmplY3Qoc3ViKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHJpYWwgPSB0cnlDYXRjaF8xLnRyeUNhdGNoKHN1Yi51bnN1YnNjcmliZSkuY2FsbChzdWIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHJpYWwgPT09IGVycm9yT2JqZWN0XzEuZXJyb3JPYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc0Vycm9ycyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcnMgPSBlcnJvcnMgfHwgW107XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZXJyID0gZXJyb3JPYmplY3RfMS5lcnJvck9iamVjdC5lO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIFVuc3Vic2NyaXB0aW9uRXJyb3JfMS5VbnN1YnNjcmlwdGlvbkVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JzID0gZXJyb3JzLmNvbmNhdChlcnIuZXJyb3JzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhhc0Vycm9ycykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFVuc3Vic2NyaXB0aW9uRXJyb3JfMS5VbnN1YnNjcmlwdGlvbkVycm9yKGVycm9ycyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEFkZHMgYSB0ZWFyIGRvd24gdG8gYmUgY2FsbGVkIGR1cmluZyB0aGUgdW5zdWJzY3JpYmUoKSBvZiB0aGlzXG4gICAgICogU3Vic2NyaXB0aW9uLlxuICAgICAqXG4gICAgICogSWYgdGhlIHRlYXIgZG93biBiZWluZyBhZGRlZCBpcyBhIHN1YnNjcmlwdGlvbiB0aGF0IGlzIGFscmVhZHlcbiAgICAgKiB1bnN1YnNjcmliZWQsIGlzIHRoZSBzYW1lIHJlZmVyZW5jZSBgYWRkYCBpcyBiZWluZyBjYWxsZWQgb24sIG9yIGlzXG4gICAgICogYFN1YnNjcmlwdGlvbi5FTVBUWWAsIGl0IHdpbGwgbm90IGJlIGFkZGVkLlxuICAgICAqXG4gICAgICogSWYgdGhpcyBzdWJzY3JpcHRpb24gaXMgYWxyZWFkeSBpbiBhbiBgaXNVbnN1YnNjcmliZWRgIHN0YXRlLCB0aGUgcGFzc2VkXG4gICAgICogdGVhciBkb3duIGxvZ2ljIHdpbGwgYmUgZXhlY3V0ZWQgaW1tZWRpYXRlbHkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1RlYXJkb3duTG9naWN9IHRlYXJkb3duIFRoZSBhZGRpdGlvbmFsIGxvZ2ljIHRvIGV4ZWN1dGUgb25cbiAgICAgKiB0ZWFyZG93bi5cbiAgICAgKiBAcmV0dXJuIHtTdWJzY3JpcHRpb259IFJldHVybnMgdGhlIFN1YnNjcmlwdGlvbiB1c2VkIG9yIGNyZWF0ZWQgdG8gYmVcbiAgICAgKiBhZGRlZCB0byB0aGUgaW5uZXIgc3Vic2NyaXB0aW9ucyBsaXN0LiBUaGlzIFN1YnNjcmlwdGlvbiBjYW4gYmUgdXNlZCB3aXRoXG4gICAgICogYHJlbW92ZSgpYCB0byByZW1vdmUgdGhlIHBhc3NlZCB0ZWFyZG93biBsb2dpYyBmcm9tIHRoZSBpbm5lciBzdWJzY3JpcHRpb25zXG4gICAgICogbGlzdC5cbiAgICAgKi9cbiAgICBTdWJzY3JpcHRpb24ucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uICh0ZWFyZG93bikge1xuICAgICAgICBpZiAoIXRlYXJkb3duIHx8ICh0ZWFyZG93biA9PT0gdGhpcykgfHwgKHRlYXJkb3duID09PSBTdWJzY3JpcHRpb24uRU1QVFkpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN1YiA9IHRlYXJkb3duO1xuICAgICAgICBzd2l0Y2ggKHR5cGVvZiB0ZWFyZG93bikge1xuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgIHN1YiA9IG5ldyBTdWJzY3JpcHRpb24odGVhcmRvd24pO1xuICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICBpZiAoc3ViLmlzVW5zdWJzY3JpYmVkIHx8IHR5cGVvZiBzdWIudW5zdWJzY3JpYmUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ViLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAodGhpcy5fc3Vic2NyaXB0aW9ucyB8fCAodGhpcy5fc3Vic2NyaXB0aW9ucyA9IFtdKSkucHVzaChzdWIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbnJlY29nbml6ZWQgdGVhcmRvd24gJyArIHRlYXJkb3duICsgJyBhZGRlZCB0byBTdWJzY3JpcHRpb24uJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1YjtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBTdWJzY3JpcHRpb24gZnJvbSB0aGUgaW50ZXJuYWwgbGlzdCBvZiBzdWJzY3JpcHRpb25zIHRoYXQgd2lsbFxuICAgICAqIHVuc3Vic2NyaWJlIGR1cmluZyB0aGUgdW5zdWJzY3JpYmUgcHJvY2VzcyBvZiB0aGlzIFN1YnNjcmlwdGlvbi5cbiAgICAgKiBAcGFyYW0ge1N1YnNjcmlwdGlvbn0gc3Vic2NyaXB0aW9uIFRoZSBzdWJzY3JpcHRpb24gdG8gcmVtb3ZlLlxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgU3Vic2NyaXB0aW9uLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICAgIC8vIEhBQ0s6IFRoaXMgbWlnaHQgYmUgcmVkdW5kYW50IGJlY2F1c2Ugb2YgdGhlIGxvZ2ljIGluIGBhZGQoKWBcbiAgICAgICAgaWYgKHN1YnNjcmlwdGlvbiA9PSBudWxsIHx8IChzdWJzY3JpcHRpb24gPT09IHRoaXMpIHx8IChzdWJzY3JpcHRpb24gPT09IFN1YnNjcmlwdGlvbi5FTVBUWSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3Vic2NyaXB0aW9ucyA9IHRoaXMuX3N1YnNjcmlwdGlvbnM7XG4gICAgICAgIGlmIChzdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgc3Vic2NyaXB0aW9uSW5kZXggPSBzdWJzY3JpcHRpb25zLmluZGV4T2Yoc3Vic2NyaXB0aW9uKTtcbiAgICAgICAgICAgIGlmIChzdWJzY3JpcHRpb25JbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBzdWJzY3JpcHRpb25zLnNwbGljZShzdWJzY3JpcHRpb25JbmRleCwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN1YnNjcmlwdGlvbi5FTVBUWSA9IChmdW5jdGlvbiAoZW1wdHkpIHtcbiAgICAgICAgZW1wdHkuaXNVbnN1YnNjcmliZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZW1wdHk7XG4gICAgfShuZXcgU3Vic2NyaXB0aW9uKCkpKTtcbiAgICByZXR1cm4gU3Vic2NyaXB0aW9uO1xufSgpKTtcbmV4cG9ydHMuU3Vic2NyaXB0aW9uID0gU3Vic2NyaXB0aW9uO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9U3Vic2NyaXB0aW9uLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uLy4uL09ic2VydmFibGUnKTtcbnZhciBjb21iaW5lTGF0ZXN0XzEgPSByZXF1aXJlKCcuLi8uLi9vcGVyYXRvci9jb21iaW5lTGF0ZXN0Jyk7XG5PYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZS5jb21iaW5lTGF0ZXN0ID0gY29tYmluZUxhdGVzdF8xLmNvbWJpbmVMYXRlc3RTdGF0aWM7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb21iaW5lTGF0ZXN0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uLy4uL09ic2VydmFibGUnKTtcbnZhciBvZl8xID0gcmVxdWlyZSgnLi4vLi4vb2JzZXJ2YWJsZS9vZicpO1xuT2JzZXJ2YWJsZV8xLk9ic2VydmFibGUub2YgPSBvZl8xLm9mO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9b2YuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vLi4vT2JzZXJ2YWJsZScpO1xudmFyIG1hcF8xID0gcmVxdWlyZSgnLi4vLi4vb3BlcmF0b3IvbWFwJyk7XG5PYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZS5wcm90b3R5cGUubWFwID0gbWFwXzEubWFwO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWFwLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uLy4uL09ic2VydmFibGUnKTtcbnZhciBtYXBUb18xID0gcmVxdWlyZSgnLi4vLi4vb3BlcmF0b3IvbWFwVG8nKTtcbk9ic2VydmFibGVfMS5PYnNlcnZhYmxlLnByb3RvdHlwZS5tYXBUbyA9IG1hcFRvXzEubWFwVG87XG4vLyMgc291cmNlTWFwcGluZ1VSTD1tYXBUby5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi8uLi9PYnNlcnZhYmxlJyk7XG52YXIgbWVyZ2VfMSA9IHJlcXVpcmUoJy4uLy4uL29wZXJhdG9yL21lcmdlJyk7XG5PYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZS5wcm90b3R5cGUubWVyZ2UgPSBtZXJnZV8xLm1lcmdlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWVyZ2UuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vLi4vT2JzZXJ2YWJsZScpO1xudmFyIHNjYW5fMSA9IHJlcXVpcmUoJy4uLy4uL29wZXJhdG9yL3NjYW4nKTtcbk9ic2VydmFibGVfMS5PYnNlcnZhYmxlLnByb3RvdHlwZS5zY2FuID0gc2Nhbl8xLnNjYW47XG4vLyMgc291cmNlTWFwcGluZ1VSTD1zY2FuLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uLy4uL09ic2VydmFibGUnKTtcbnZhciBzaGFyZV8xID0gcmVxdWlyZSgnLi4vLi4vb3BlcmF0b3Ivc2hhcmUnKTtcbk9ic2VydmFibGVfMS5PYnNlcnZhYmxlLnByb3RvdHlwZS5zaGFyZSA9IHNoYXJlXzEuc2hhcmU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1zaGFyZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi8uLi9PYnNlcnZhYmxlJyk7XG52YXIgc3RhcnRXaXRoXzEgPSByZXF1aXJlKCcuLi8uLi9vcGVyYXRvci9zdGFydFdpdGgnKTtcbk9ic2VydmFibGVfMS5PYnNlcnZhYmxlLnByb3RvdHlwZS5zdGFydFdpdGggPSBzdGFydFdpdGhfMS5zdGFydFdpdGg7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1zdGFydFdpdGguanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vLi4vT2JzZXJ2YWJsZScpO1xudmFyIHN3aXRjaE1hcF8xID0gcmVxdWlyZSgnLi4vLi4vb3BlcmF0b3Ivc3dpdGNoTWFwJyk7XG5PYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3dpdGNoTWFwID0gc3dpdGNoTWFwXzEuc3dpdGNoTWFwO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c3dpdGNoTWFwLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vT2JzZXJ2YWJsZScpO1xudmFyIFNjYWxhck9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4vU2NhbGFyT2JzZXJ2YWJsZScpO1xudmFyIEVtcHR5T2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi9FbXB0eU9ic2VydmFibGUnKTtcbnZhciBpc1NjaGVkdWxlcl8xID0gcmVxdWlyZSgnLi4vdXRpbC9pc1NjaGVkdWxlcicpO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKiBAaGlkZSB0cnVlXG4gKi9cbnZhciBBcnJheU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhBcnJheU9ic2VydmFibGUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQXJyYXlPYnNlcnZhYmxlKGFycmF5LCBzY2hlZHVsZXIpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbiAgICAgICAgdGhpcy5zY2hlZHVsZXIgPSBzY2hlZHVsZXI7XG4gICAgICAgIGlmICghc2NoZWR1bGVyICYmIGFycmF5Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgdGhpcy5faXNTY2FsYXIgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGFycmF5WzBdO1xuICAgICAgICB9XG4gICAgfVxuICAgIEFycmF5T2JzZXJ2YWJsZS5jcmVhdGUgPSBmdW5jdGlvbiAoYXJyYXksIHNjaGVkdWxlcikge1xuICAgICAgICByZXR1cm4gbmV3IEFycmF5T2JzZXJ2YWJsZShhcnJheSwgc2NoZWR1bGVyKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gT2JzZXJ2YWJsZSB0aGF0IGVtaXRzIHNvbWUgdmFsdWVzIHlvdSBzcGVjaWZ5IGFzIGFyZ3VtZW50cyxcbiAgICAgKiBpbW1lZGlhdGVseSBvbmUgYWZ0ZXIgdGhlIG90aGVyLCBhbmQgdGhlbiBlbWl0cyBhIGNvbXBsZXRlIG5vdGlmaWNhdGlvbi5cbiAgICAgKlxuICAgICAqIDxzcGFuIGNsYXNzPVwiaW5mb3JtYWxcIj5FbWl0cyB0aGUgYXJndW1lbnRzIHlvdSBwcm92aWRlLCB0aGVuIGNvbXBsZXRlcy5cbiAgICAgKiA8L3NwYW4+XG4gICAgICpcbiAgICAgKiA8aW1nIHNyYz1cIi4vaW1nL29mLnBuZ1wiIHdpZHRoPVwiMTAwJVwiPlxuICAgICAqXG4gICAgICogVGhpcyBzdGF0aWMgb3BlcmF0b3IgaXMgdXNlZnVsIGZvciBjcmVhdGluZyBhIHNpbXBsZSBPYnNlcnZhYmxlIHRoYXQgb25seVxuICAgICAqIGVtaXRzIHRoZSBhcmd1bWVudHMgZ2l2ZW4sIGFuZCB0aGUgY29tcGxldGUgbm90aWZpY2F0aW9uIHRoZXJlYWZ0ZXIuIEl0IGNhblxuICAgICAqIGJlIHVzZWQgZm9yIGNvbXBvc2luZyB3aXRoIG90aGVyIE9ic2VydmFibGVzLCBzdWNoIGFzIHdpdGgge0BsaW5rIGNvbmNhdH0uXG4gICAgICogQnkgZGVmYXVsdCwgaXQgdXNlcyBhIGBudWxsYCBTY2hlZHVsZXIsIHdoaWNoIG1lYW5zIHRoZSBgbmV4dGBcbiAgICAgKiBub3RpZmljYXRpb25zIGFyZSBzZW50IHN5bmNocm9ub3VzbHksIGFsdGhvdWdoIHdpdGggYSBkaWZmZXJlbnQgU2NoZWR1bGVyXG4gICAgICogaXQgaXMgcG9zc2libGUgdG8gZGV0ZXJtaW5lIHdoZW4gdGhvc2Ugbm90aWZpY2F0aW9ucyB3aWxsIGJlIGRlbGl2ZXJlZC5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxjYXB0aW9uPkVtaXQgMTAsIDIwLCAzMCwgdGhlbiAnYScsICdiJywgJ2MnLCB0aGVuIHN0YXJ0IHRpY2tpbmcgZXZlcnkgc2Vjb25kLjwvY2FwdGlvbj5cbiAgICAgKiB2YXIgbnVtYmVycyA9IFJ4Lk9ic2VydmFibGUub2YoMTAsIDIwLCAzMCk7XG4gICAgICogdmFyIGxldHRlcnMgPSBSeC5PYnNlcnZhYmxlLm9mKCdhJywgJ2InLCAnYycpO1xuICAgICAqIHZhciBpbnRlcnZhbCA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwMCk7XG4gICAgICogdmFyIHJlc3VsdCA9IG51bWJlcnMuY29uY2F0KGxldHRlcnMpLmNvbmNhdChpbnRlcnZhbCk7XG4gICAgICogcmVzdWx0LnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAgICAgKlxuICAgICAqIEBzZWUge0BsaW5rIGNyZWF0ZX1cbiAgICAgKiBAc2VlIHtAbGluayBlbXB0eX1cbiAgICAgKiBAc2VlIHtAbGluayBuZXZlcn1cbiAgICAgKiBAc2VlIHtAbGluayB0aHJvd31cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Li4uVH0gdmFsdWVzIEFyZ3VtZW50cyB0aGF0IHJlcHJlc2VudCBgbmV4dGAgdmFsdWVzIHRvIGJlIGVtaXR0ZWQuXG4gICAgICogQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXJdIEEge0BsaW5rIFNjaGVkdWxlcn0gdG8gdXNlIGZvciBzY2hlZHVsaW5nXG4gICAgICogdGhlIGVtaXNzaW9ucyBvZiB0aGUgYG5leHRgIG5vdGlmaWNhdGlvbnMuXG4gICAgICogQHJldHVybiB7T2JzZXJ2YWJsZTxUPn0gQW4gT2JzZXJ2YWJsZSB0aGF0IGVtaXRzIGVhY2ggZ2l2ZW4gaW5wdXQgdmFsdWUuXG4gICAgICogQHN0YXRpYyB0cnVlXG4gICAgICogQG5hbWUgb2ZcbiAgICAgKiBAb3duZXIgT2JzZXJ2YWJsZVxuICAgICAqL1xuICAgIEFycmF5T2JzZXJ2YWJsZS5vZiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFycmF5ID0gW107XG4gICAgICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgICAgICBhcnJheVtfaSAtIDBdID0gYXJndW1lbnRzW19pXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2NoZWR1bGVyID0gYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV07XG4gICAgICAgIGlmIChpc1NjaGVkdWxlcl8xLmlzU2NoZWR1bGVyKHNjaGVkdWxlcikpIHtcbiAgICAgICAgICAgIGFycmF5LnBvcCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2NoZWR1bGVyID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbGVuID0gYXJyYXkubGVuZ3RoO1xuICAgICAgICBpZiAobGVuID4gMSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBBcnJheU9ic2VydmFibGUoYXJyYXksIHNjaGVkdWxlcik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobGVuID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFNjYWxhck9ic2VydmFibGVfMS5TY2FsYXJPYnNlcnZhYmxlKGFycmF5WzBdLCBzY2hlZHVsZXIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBFbXB0eU9ic2VydmFibGVfMS5FbXB0eU9ic2VydmFibGUoc2NoZWR1bGVyKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQXJyYXlPYnNlcnZhYmxlLmRpc3BhdGNoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHZhciBhcnJheSA9IHN0YXRlLmFycmF5LCBpbmRleCA9IHN0YXRlLmluZGV4LCBjb3VudCA9IHN0YXRlLmNvdW50LCBzdWJzY3JpYmVyID0gc3RhdGUuc3Vic2NyaWJlcjtcbiAgICAgICAgaWYgKGluZGV4ID49IGNvdW50KSB7XG4gICAgICAgICAgICBzdWJzY3JpYmVyLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3Vic2NyaWJlci5uZXh0KGFycmF5W2luZGV4XSk7XG4gICAgICAgIGlmIChzdWJzY3JpYmVyLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUuaW5kZXggPSBpbmRleCArIDE7XG4gICAgICAgIHRoaXMuc2NoZWR1bGUoc3RhdGUpO1xuICAgIH07XG4gICAgQXJyYXlPYnNlcnZhYmxlLnByb3RvdHlwZS5fc3Vic2NyaWJlID0gZnVuY3Rpb24gKHN1YnNjcmliZXIpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gMDtcbiAgICAgICAgdmFyIGFycmF5ID0gdGhpcy5hcnJheTtcbiAgICAgICAgdmFyIGNvdW50ID0gYXJyYXkubGVuZ3RoO1xuICAgICAgICB2YXIgc2NoZWR1bGVyID0gdGhpcy5zY2hlZHVsZXI7XG4gICAgICAgIGlmIChzY2hlZHVsZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBzY2hlZHVsZXIuc2NoZWR1bGUoQXJyYXlPYnNlcnZhYmxlLmRpc3BhdGNoLCAwLCB7XG4gICAgICAgICAgICAgICAgYXJyYXk6IGFycmF5LCBpbmRleDogaW5kZXgsIGNvdW50OiBjb3VudCwgc3Vic2NyaWJlcjogc3Vic2NyaWJlclxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50ICYmICFzdWJzY3JpYmVyLmlzVW5zdWJzY3JpYmVkOyBpKyspIHtcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmVyLm5leHQoYXJyYXlbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gQXJyYXlPYnNlcnZhYmxlO1xufShPYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZSkpO1xuZXhwb3J0cy5BcnJheU9ic2VydmFibGUgPSBBcnJheU9ic2VydmFibGU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1BcnJheU9ic2VydmFibGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi9PYnNlcnZhYmxlJyk7XG52YXIgU3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi4vU3Vic2NyaWJlcicpO1xudmFyIFN1YnNjcmlwdGlvbl8xID0gcmVxdWlyZSgnLi4vU3Vic2NyaXB0aW9uJyk7XG4vKipcbiAqIEBjbGFzcyBDb25uZWN0YWJsZU9ic2VydmFibGU8VD5cbiAqL1xudmFyIENvbm5lY3RhYmxlT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKENvbm5lY3RhYmxlT2JzZXJ2YWJsZSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBDb25uZWN0YWJsZU9ic2VydmFibGUoc291cmNlLCBzdWJqZWN0RmFjdG9yeSkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICAgIHRoaXMuc3ViamVjdEZhY3RvcnkgPSBzdWJqZWN0RmFjdG9yeTtcbiAgICB9XG4gICAgQ29ubmVjdGFibGVPYnNlcnZhYmxlLnByb3RvdHlwZS5fc3Vic2NyaWJlID0gZnVuY3Rpb24gKHN1YnNjcmliZXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0U3ViamVjdCgpLnN1YnNjcmliZShzdWJzY3JpYmVyKTtcbiAgICB9O1xuICAgIENvbm5lY3RhYmxlT2JzZXJ2YWJsZS5wcm90b3R5cGUuZ2V0U3ViamVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHN1YmplY3QgPSB0aGlzLnN1YmplY3Q7XG4gICAgICAgIGlmIChzdWJqZWN0ICYmICFzdWJqZWN0LmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gc3ViamVjdDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHRoaXMuc3ViamVjdCA9IHRoaXMuc3ViamVjdEZhY3RvcnkoKSk7XG4gICAgfTtcbiAgICBDb25uZWN0YWJsZU9ic2VydmFibGUucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSB0aGlzLnNvdXJjZTtcbiAgICAgICAgdmFyIHN1YnNjcmlwdGlvbiA9IHRoaXMuc3Vic2NyaXB0aW9uO1xuICAgICAgICBpZiAoc3Vic2NyaXB0aW9uICYmICFzdWJzY3JpcHRpb24uaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgICAgIH1cbiAgICAgICAgc3Vic2NyaXB0aW9uID0gc291cmNlLnN1YnNjcmliZSh0aGlzLmdldFN1YmplY3QoKSk7XG4gICAgICAgIHN1YnNjcmlwdGlvbi5hZGQobmV3IENvbm5lY3RhYmxlU3Vic2NyaXB0aW9uKHRoaXMpKTtcbiAgICAgICAgcmV0dXJuICh0aGlzLnN1YnNjcmlwdGlvbiA9IHN1YnNjcmlwdGlvbik7XG4gICAgfTtcbiAgICBDb25uZWN0YWJsZU9ic2VydmFibGUucHJvdG90eXBlLnJlZkNvdW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IFJlZkNvdW50T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIG9wZW5lZCBmb3IgYENvbm5lY3RhYmxlU3Vic2NyaXB0aW9uYC5cbiAgICAgKiBOb3QgdG8gY2FsbCBmcm9tIG90aGVycy5cbiAgICAgKi9cbiAgICBDb25uZWN0YWJsZU9ic2VydmFibGUucHJvdG90eXBlLl9jbG9zZVN1YnNjcmlwdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5zdWJqZWN0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5zdWJzY3JpcHRpb24gPSBudWxsO1xuICAgIH07XG4gICAgcmV0dXJuIENvbm5lY3RhYmxlT2JzZXJ2YWJsZTtcbn0oT2JzZXJ2YWJsZV8xLk9ic2VydmFibGUpKTtcbmV4cG9ydHMuQ29ubmVjdGFibGVPYnNlcnZhYmxlID0gQ29ubmVjdGFibGVPYnNlcnZhYmxlO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBDb25uZWN0YWJsZVN1YnNjcmlwdGlvbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKENvbm5lY3RhYmxlU3Vic2NyaXB0aW9uLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIENvbm5lY3RhYmxlU3Vic2NyaXB0aW9uKGNvbm5lY3RhYmxlKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLmNvbm5lY3RhYmxlID0gY29ubmVjdGFibGU7XG4gICAgfVxuICAgIENvbm5lY3RhYmxlU3Vic2NyaXB0aW9uLnByb3RvdHlwZS5fdW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjb25uZWN0YWJsZSA9IHRoaXMuY29ubmVjdGFibGU7XG4gICAgICAgIGNvbm5lY3RhYmxlLl9jbG9zZVN1YnNjcmlwdGlvbigpO1xuICAgICAgICB0aGlzLmNvbm5lY3RhYmxlID0gbnVsbDtcbiAgICB9O1xuICAgIHJldHVybiBDb25uZWN0YWJsZVN1YnNjcmlwdGlvbjtcbn0oU3Vic2NyaXB0aW9uXzEuU3Vic2NyaXB0aW9uKSk7XG4vKipcbiAqIFdlIG5lZWQgdGhpcyBKU0RvYyBjb21tZW50IGZvciBhZmZlY3RpbmcgRVNEb2MuXG4gKiBAaWdub3JlXG4gKiBAZXh0ZW5kcyB7SWdub3JlZH1cbiAqL1xudmFyIFJlZkNvdW50T2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFJlZkNvdW50T2JzZXJ2YWJsZSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBSZWZDb3VudE9ic2VydmFibGUoY29ubmVjdGFibGUsIHJlZkNvdW50KSB7XG4gICAgICAgIGlmIChyZWZDb3VudCA9PT0gdm9pZCAwKSB7IHJlZkNvdW50ID0gMDsgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5jb25uZWN0YWJsZSA9IGNvbm5lY3RhYmxlO1xuICAgICAgICB0aGlzLnJlZkNvdW50ID0gcmVmQ291bnQ7XG4gICAgfVxuICAgIFJlZkNvdW50T2JzZXJ2YWJsZS5wcm90b3R5cGUuX3N1YnNjcmliZSA9IGZ1bmN0aW9uIChzdWJzY3JpYmVyKSB7XG4gICAgICAgIHZhciBjb25uZWN0YWJsZSA9IHRoaXMuY29ubmVjdGFibGU7XG4gICAgICAgIHZhciByZWZDb3VudFN1YnNjcmliZXIgPSBuZXcgUmVmQ291bnRTdWJzY3JpYmVyKHN1YnNjcmliZXIsIHRoaXMpO1xuICAgICAgICB2YXIgc3Vic2NyaXB0aW9uID0gY29ubmVjdGFibGUuc3Vic2NyaWJlKHJlZkNvdW50U3Vic2NyaWJlcik7XG4gICAgICAgIGlmICghc3Vic2NyaXB0aW9uLmlzVW5zdWJzY3JpYmVkICYmICsrdGhpcy5yZWZDb3VudCA9PT0gMSkge1xuICAgICAgICAgICAgcmVmQ291bnRTdWJzY3JpYmVyLmNvbm5lY3Rpb24gPSB0aGlzLmNvbm5lY3Rpb24gPSBjb25uZWN0YWJsZS5jb25uZWN0KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1YnNjcmlwdGlvbjtcbiAgICB9O1xuICAgIHJldHVybiBSZWZDb3VudE9ic2VydmFibGU7XG59KE9ic2VydmFibGVfMS5PYnNlcnZhYmxlKSk7XG4vKipcbiAqIFdlIG5lZWQgdGhpcyBKU0RvYyBjb21tZW50IGZvciBhZmZlY3RpbmcgRVNEb2MuXG4gKiBAaWdub3JlXG4gKiBAZXh0ZW5kcyB7SWdub3JlZH1cbiAqL1xudmFyIFJlZkNvdW50U3Vic2NyaWJlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFJlZkNvdW50U3Vic2NyaWJlciwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBSZWZDb3VudFN1YnNjcmliZXIoZGVzdGluYXRpb24sIHJlZkNvdW50T2JzZXJ2YWJsZSkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBudWxsKTtcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbiA9IGRlc3RpbmF0aW9uO1xuICAgICAgICB0aGlzLnJlZkNvdW50T2JzZXJ2YWJsZSA9IHJlZkNvdW50T2JzZXJ2YWJsZTtcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uID0gcmVmQ291bnRPYnNlcnZhYmxlLmNvbm5lY3Rpb247XG4gICAgICAgIGRlc3RpbmF0aW9uLmFkZCh0aGlzKTtcbiAgICB9XG4gICAgUmVmQ291bnRTdWJzY3JpYmVyLnByb3RvdHlwZS5fbmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLm5leHQodmFsdWUpO1xuICAgIH07XG4gICAgUmVmQ291bnRTdWJzY3JpYmVyLnByb3RvdHlwZS5fZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHRoaXMuX3Jlc2V0Q29ubmVjdGFibGUoKTtcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5lcnJvcihlcnIpO1xuICAgIH07XG4gICAgUmVmQ291bnRTdWJzY3JpYmVyLnByb3RvdHlwZS5fY29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3Jlc2V0Q29ubmVjdGFibGUoKTtcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5jb21wbGV0ZSgpO1xuICAgIH07XG4gICAgUmVmQ291bnRTdWJzY3JpYmVyLnByb3RvdHlwZS5fcmVzZXRDb25uZWN0YWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9ic2VydmFibGUgPSB0aGlzLnJlZkNvdW50T2JzZXJ2YWJsZTtcbiAgICAgICAgdmFyIG9ic0Nvbm5lY3Rpb24gPSBvYnNlcnZhYmxlLmNvbm5lY3Rpb247XG4gICAgICAgIHZhciBzdWJDb25uZWN0aW9uID0gdGhpcy5jb25uZWN0aW9uO1xuICAgICAgICBpZiAoc3ViQ29ubmVjdGlvbiAmJiBzdWJDb25uZWN0aW9uID09PSBvYnNDb25uZWN0aW9uKSB7XG4gICAgICAgICAgICBvYnNlcnZhYmxlLnJlZkNvdW50ID0gMDtcbiAgICAgICAgICAgIG9ic0Nvbm5lY3Rpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIG9ic2VydmFibGUuY29ubmVjdGlvbiA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFJlZkNvdW50U3Vic2NyaWJlci5wcm90b3R5cGUuX3Vuc3Vic2NyaWJlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb2JzZXJ2YWJsZSA9IHRoaXMucmVmQ291bnRPYnNlcnZhYmxlO1xuICAgICAgICBpZiAob2JzZXJ2YWJsZS5yZWZDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICgtLW9ic2VydmFibGUucmVmQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgIHZhciBvYnNDb25uZWN0aW9uID0gb2JzZXJ2YWJsZS5jb25uZWN0aW9uO1xuICAgICAgICAgICAgdmFyIHN1YkNvbm5lY3Rpb24gPSB0aGlzLmNvbm5lY3Rpb247XG4gICAgICAgICAgICBpZiAoc3ViQ29ubmVjdGlvbiAmJiBzdWJDb25uZWN0aW9uID09PSBvYnNDb25uZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgb2JzQ29ubmVjdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgIG9ic2VydmFibGUuY29ubmVjdGlvbiA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBSZWZDb3VudFN1YnNjcmliZXI7XG59KFN1YnNjcmliZXJfMS5TdWJzY3JpYmVyKSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1Db25uZWN0YWJsZU9ic2VydmFibGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi9PYnNlcnZhYmxlJyk7XG4vKipcbiAqIFdlIG5lZWQgdGhpcyBKU0RvYyBjb21tZW50IGZvciBhZmZlY3RpbmcgRVNEb2MuXG4gKiBAZXh0ZW5kcyB7SWdub3JlZH1cbiAqIEBoaWRlIHRydWVcbiAqL1xudmFyIEVtcHR5T2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEVtcHR5T2JzZXJ2YWJsZSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBFbXB0eU9ic2VydmFibGUoc2NoZWR1bGVyKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLnNjaGVkdWxlciA9IHNjaGVkdWxlcjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgbm8gaXRlbXMgdG8gdGhlIE9ic2VydmVyIGFuZCBpbW1lZGlhdGVseVxuICAgICAqIGVtaXRzIGEgY29tcGxldGUgbm90aWZpY2F0aW9uLlxuICAgICAqXG4gICAgICogPHNwYW4gY2xhc3M9XCJpbmZvcm1hbFwiPkp1c3QgZW1pdHMgJ2NvbXBsZXRlJywgYW5kIG5vdGhpbmcgZWxzZS5cbiAgICAgKiA8L3NwYW4+XG4gICAgICpcbiAgICAgKiA8aW1nIHNyYz1cIi4vaW1nL2VtcHR5LnBuZ1wiIHdpZHRoPVwiMTAwJVwiPlxuICAgICAqXG4gICAgICogVGhpcyBzdGF0aWMgb3BlcmF0b3IgaXMgdXNlZnVsIGZvciBjcmVhdGluZyBhIHNpbXBsZSBPYnNlcnZhYmxlIHRoYXQgb25seVxuICAgICAqIGVtaXRzIHRoZSBjb21wbGV0ZSBub3RpZmljYXRpb24uIEl0IGNhbiBiZSB1c2VkIGZvciBjb21wb3Npbmcgd2l0aCBvdGhlclxuICAgICAqIE9ic2VydmFibGVzLCBzdWNoIGFzIGluIGEge0BsaW5rIG1lcmdlTWFwfS5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxjYXB0aW9uPkVtaXQgdGhlIG51bWJlciA3LCB0aGVuIGNvbXBsZXRlLjwvY2FwdGlvbj5cbiAgICAgKiB2YXIgcmVzdWx0ID0gUnguT2JzZXJ2YWJsZS5lbXB0eSgpLnN0YXJ0V2l0aCg3KTtcbiAgICAgKiByZXN1bHQuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGNhcHRpb24+TWFwIGFuZCBmbGF0dGVuIG9ubHkgb2RkIG51bWJlcnMgdG8gdGhlIHNlcXVlbmNlICdhJywgJ2InLCAnYyc8L2NhcHRpb24+XG4gICAgICogdmFyIGludGVydmFsID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxMDAwKTtcbiAgICAgKiB2YXIgcmVzdWx0ID0gaW50ZXJ2YWwubWVyZ2VNYXAoeCA9PlxuICAgICAqICAgeCAlIDIgPT09IDEgPyBSeC5PYnNlcnZhYmxlLm9mKCdhJywgJ2InLCAnYycpIDogUnguT2JzZXJ2YWJsZS5lbXB0eSgpXG4gICAgICogKTtcbiAgICAgKiByZXN1bHQuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICAgICAqXG4gICAgICogQHNlZSB7QGxpbmsgY3JlYXRlfVxuICAgICAqIEBzZWUge0BsaW5rIG5ldmVyfVxuICAgICAqIEBzZWUge0BsaW5rIG9mfVxuICAgICAqIEBzZWUge0BsaW5rIHRocm93fVxuICAgICAqXG4gICAgICogQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXJdIEEge0BsaW5rIFNjaGVkdWxlcn0gdG8gdXNlIGZvciBzY2hlZHVsaW5nXG4gICAgICogdGhlIGVtaXNzaW9uIG9mIHRoZSBjb21wbGV0ZSBub3RpZmljYXRpb24uXG4gICAgICogQHJldHVybiB7T2JzZXJ2YWJsZX0gQW4gXCJlbXB0eVwiIE9ic2VydmFibGU6IGVtaXRzIG9ubHkgdGhlIGNvbXBsZXRlXG4gICAgICogbm90aWZpY2F0aW9uLlxuICAgICAqIEBzdGF0aWMgdHJ1ZVxuICAgICAqIEBuYW1lIGVtcHR5XG4gICAgICogQG93bmVyIE9ic2VydmFibGVcbiAgICAgKi9cbiAgICBFbXB0eU9ic2VydmFibGUuY3JlYXRlID0gZnVuY3Rpb24gKHNjaGVkdWxlcikge1xuICAgICAgICByZXR1cm4gbmV3IEVtcHR5T2JzZXJ2YWJsZShzY2hlZHVsZXIpO1xuICAgIH07XG4gICAgRW1wdHlPYnNlcnZhYmxlLmRpc3BhdGNoID0gZnVuY3Rpb24gKGFyZykge1xuICAgICAgICB2YXIgc3Vic2NyaWJlciA9IGFyZy5zdWJzY3JpYmVyO1xuICAgICAgICBzdWJzY3JpYmVyLmNvbXBsZXRlKCk7XG4gICAgfTtcbiAgICBFbXB0eU9ic2VydmFibGUucHJvdG90eXBlLl9zdWJzY3JpYmUgPSBmdW5jdGlvbiAoc3Vic2NyaWJlcikge1xuICAgICAgICB2YXIgc2NoZWR1bGVyID0gdGhpcy5zY2hlZHVsZXI7XG4gICAgICAgIGlmIChzY2hlZHVsZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBzY2hlZHVsZXIuc2NoZWR1bGUoRW1wdHlPYnNlcnZhYmxlLmRpc3BhdGNoLCAwLCB7IHN1YnNjcmliZXI6IHN1YnNjcmliZXIgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzdWJzY3JpYmVyLmNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBFbXB0eU9ic2VydmFibGU7XG59KE9ic2VydmFibGVfMS5PYnNlcnZhYmxlKSk7XG5leHBvcnRzLkVtcHR5T2JzZXJ2YWJsZSA9IEVtcHR5T2JzZXJ2YWJsZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUVtcHR5T2JzZXJ2YWJsZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uL09ic2VydmFibGUnKTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICogQGhpZGUgdHJ1ZVxuICovXG52YXIgU2NhbGFyT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFNjYWxhck9ic2VydmFibGUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gU2NhbGFyT2JzZXJ2YWJsZSh2YWx1ZSwgc2NoZWR1bGVyKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIHRoaXMuc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICAgICAgICB0aGlzLl9pc1NjYWxhciA9IHRydWU7XG4gICAgfVxuICAgIFNjYWxhck9ic2VydmFibGUuY3JlYXRlID0gZnVuY3Rpb24gKHZhbHVlLCBzY2hlZHVsZXIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTY2FsYXJPYnNlcnZhYmxlKHZhbHVlLCBzY2hlZHVsZXIpO1xuICAgIH07XG4gICAgU2NhbGFyT2JzZXJ2YWJsZS5kaXNwYXRjaCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICB2YXIgZG9uZSA9IHN0YXRlLmRvbmUsIHZhbHVlID0gc3RhdGUudmFsdWUsIHN1YnNjcmliZXIgPSBzdGF0ZS5zdWJzY3JpYmVyO1xuICAgICAgICBpZiAoZG9uZSkge1xuICAgICAgICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHN1YnNjcmliZXIubmV4dCh2YWx1ZSk7XG4gICAgICAgIGlmIChzdWJzY3JpYmVyLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUuZG9uZSA9IHRydWU7XG4gICAgICAgIHRoaXMuc2NoZWR1bGUoc3RhdGUpO1xuICAgIH07XG4gICAgU2NhbGFyT2JzZXJ2YWJsZS5wcm90b3R5cGUuX3N1YnNjcmliZSA9IGZ1bmN0aW9uIChzdWJzY3JpYmVyKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMudmFsdWU7XG4gICAgICAgIHZhciBzY2hlZHVsZXIgPSB0aGlzLnNjaGVkdWxlcjtcbiAgICAgICAgaWYgKHNjaGVkdWxlcikge1xuICAgICAgICAgICAgcmV0dXJuIHNjaGVkdWxlci5zY2hlZHVsZShTY2FsYXJPYnNlcnZhYmxlLmRpc3BhdGNoLCAwLCB7XG4gICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsIHZhbHVlOiB2YWx1ZSwgc3Vic2NyaWJlcjogc3Vic2NyaWJlclxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzdWJzY3JpYmVyLm5leHQodmFsdWUpO1xuICAgICAgICAgICAgaWYgKCFzdWJzY3JpYmVyLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gU2NhbGFyT2JzZXJ2YWJsZTtcbn0oT2JzZXJ2YWJsZV8xLk9ic2VydmFibGUpKTtcbmV4cG9ydHMuU2NhbGFyT2JzZXJ2YWJsZSA9IFNjYWxhck9ic2VydmFibGU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1TY2FsYXJPYnNlcnZhYmxlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIEFycmF5T2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi9BcnJheU9ic2VydmFibGUnKTtcbmV4cG9ydHMub2YgPSBBcnJheU9ic2VydmFibGVfMS5BcnJheU9ic2VydmFibGUub2Y7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1vZi5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIEFycmF5T2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vb2JzZXJ2YWJsZS9BcnJheU9ic2VydmFibGUnKTtcbnZhciBpc0FycmF5XzEgPSByZXF1aXJlKCcuLi91dGlsL2lzQXJyYXknKTtcbnZhciBpc1NjaGVkdWxlcl8xID0gcmVxdWlyZSgnLi4vdXRpbC9pc1NjaGVkdWxlcicpO1xudmFyIE91dGVyU3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi4vT3V0ZXJTdWJzY3JpYmVyJyk7XG52YXIgc3Vic2NyaWJlVG9SZXN1bHRfMSA9IHJlcXVpcmUoJy4uL3V0aWwvc3Vic2NyaWJlVG9SZXN1bHQnKTtcbi8qKlxuICogQ29tYmluZXMgbXVsdGlwbGUgT2JzZXJ2YWJsZXMgdG8gY3JlYXRlIGFuIE9ic2VydmFibGUgd2hvc2UgdmFsdWVzIGFyZVxuICogY2FsY3VsYXRlZCBmcm9tIHRoZSBsYXRlc3QgdmFsdWVzIG9mIGVhY2ggb2YgaXRzIGlucHV0IE9ic2VydmFibGVzLlxuICpcbiAqIDxzcGFuIGNsYXNzPVwiaW5mb3JtYWxcIj5XaGVuZXZlciBhbnkgaW5wdXQgT2JzZXJ2YWJsZSBlbWl0cyBhIHZhbHVlLCBpdFxuICogY29tcHV0ZXMgYSBmb3JtdWxhIHVzaW5nIHRoZSBsYXRlc3QgdmFsdWVzIGZyb20gYWxsIHRoZSBpbnB1dHMsIHRoZW4gZW1pdHNcbiAqIHRoZSBvdXRwdXQgb2YgdGhhdCBmb3JtdWxhLjwvc3Bhbj5cbiAqXG4gKiA8aW1nIHNyYz1cIi4vaW1nL2NvbWJpbmVMYXRlc3QucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gKlxuICogYGNvbWJpbmVMYXRlc3RgIGNvbWJpbmVzIHRoZSB2YWx1ZXMgZnJvbSB0aGlzIE9ic2VydmFibGUgd2l0aCB2YWx1ZXMgZnJvbVxuICogT2JzZXJ2YWJsZXMgcGFzc2VkIGFzIGFyZ3VtZW50cy4gVGhpcyBpcyBkb25lIGJ5IHN1YnNjcmliaW5nIHRvIGVhY2hcbiAqIE9ic2VydmFibGUsIGluIG9yZGVyLCBhbmQgY29sbGVjdGluZyBhbiBhcnJheSBvZiBlYWNoIG9mIHRoZSBtb3N0IHJlY2VudFxuICogdmFsdWVzIGFueSB0aW1lIGFueSBvZiB0aGUgaW5wdXQgT2JzZXJ2YWJsZXMgZW1pdHMsIHRoZW4gZWl0aGVyIHRha2luZyB0aGF0XG4gKiBhcnJheSBhbmQgcGFzc2luZyBpdCBhcyBhcmd1bWVudHMgdG8gYW4gb3B0aW9uYWwgYHByb2plY3RgIGZ1bmN0aW9uIGFuZFxuICogZW1pdHRpbmcgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGF0LCBvciBqdXN0IGVtaXR0aW5nIHRoZSBhcnJheSBvZiByZWNlbnRcbiAqIHZhbHVlcyBkaXJlY3RseSBpZiB0aGVyZSBpcyBubyBgcHJvamVjdGAgZnVuY3Rpb24uXG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+RHluYW1pY2FsbHkgY2FsY3VsYXRlIHRoZSBCb2R5LU1hc3MgSW5kZXggZnJvbSBhbiBPYnNlcnZhYmxlIG9mIHdlaWdodCBhbmQgb25lIGZvciBoZWlnaHQ8L2NhcHRpb24+XG4gKiB2YXIgd2VpZ2h0ID0gUnguT2JzZXJ2YWJsZS5vZig3MCwgNzIsIDc2LCA3OSwgNzUpO1xuICogdmFyIGhlaWdodCA9IFJ4Lk9ic2VydmFibGUub2YoMS43NiwgMS43NywgMS43OCk7XG4gKiB2YXIgYm1pID0gd2VpZ2h0LmNvbWJpbmVMYXRlc3QoaGVpZ2h0LCAodywgaCkgPT4gdyAvIChoICogaCkpO1xuICogYm1pLnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKCdCTUkgaXMgJyArIHgpKTtcbiAqXG4gKiBAc2VlIHtAbGluayBjb21iaW5lQWxsfVxuICogQHNlZSB7QGxpbmsgbWVyZ2V9XG4gKiBAc2VlIHtAbGluayB3aXRoTGF0ZXN0RnJvbX1cbiAqXG4gKiBAcGFyYW0ge09ic2VydmFibGV9IG90aGVyIEFuIGlucHV0IE9ic2VydmFibGUgdG8gY29tYmluZSB3aXRoIHRoZSBzb3VyY2VcbiAqIE9ic2VydmFibGUuIE1vcmUgdGhhbiBvbmUgaW5wdXQgT2JzZXJ2YWJsZXMgbWF5IGJlIGdpdmVuIGFzIGFyZ3VtZW50LlxuICogQHBhcmFtIHtmdW5jdGlvbn0gW3Byb2plY3RdIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRvIHByb2plY3QgdGhlIHZhbHVlcyBmcm9tXG4gKiB0aGUgY29tYmluZWQgbGF0ZXN0IHZhbHVlcyBpbnRvIGEgbmV3IHZhbHVlIG9uIHRoZSBvdXRwdXQgT2JzZXJ2YWJsZS5cbiAqIEByZXR1cm4ge09ic2VydmFibGV9IEFuIE9ic2VydmFibGUgb2YgcHJvamVjdGVkIHZhbHVlcyBmcm9tIHRoZSBtb3N0IHJlY2VudFxuICogdmFsdWVzIGZyb20gZWFjaCBpbnB1dCBPYnNlcnZhYmxlLCBvciBhbiBhcnJheSBvZiB0aGUgbW9zdCByZWNlbnQgdmFsdWVzIGZyb21cbiAqIGVhY2ggaW5wdXQgT2JzZXJ2YWJsZS5cbiAqIEBtZXRob2QgY29tYmluZUxhdGVzdFxuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gY29tYmluZUxhdGVzdCgpIHtcbiAgICB2YXIgb2JzZXJ2YWJsZXMgPSBbXTtcbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICBvYnNlcnZhYmxlc1tfaSAtIDBdID0gYXJndW1lbnRzW19pXTtcbiAgICB9XG4gICAgdmFyIHByb2plY3QgPSBudWxsO1xuICAgIGlmICh0eXBlb2Ygb2JzZXJ2YWJsZXNbb2JzZXJ2YWJsZXMubGVuZ3RoIC0gMV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcHJvamVjdCA9IG9ic2VydmFibGVzLnBvcCgpO1xuICAgIH1cbiAgICAvLyBpZiB0aGUgZmlyc3QgYW5kIG9ubHkgb3RoZXIgYXJndW1lbnQgYmVzaWRlcyB0aGUgcmVzdWx0U2VsZWN0b3IgaXMgYW4gYXJyYXlcbiAgICAvLyBhc3N1bWUgaXQncyBiZWVuIGNhbGxlZCB3aXRoIGBjb21iaW5lTGF0ZXN0KFtvYnMxLCBvYnMyLCBvYnMzXSwgcHJvamVjdClgXG4gICAgaWYgKG9ic2VydmFibGVzLmxlbmd0aCA9PT0gMSAmJiBpc0FycmF5XzEuaXNBcnJheShvYnNlcnZhYmxlc1swXSkpIHtcbiAgICAgICAgb2JzZXJ2YWJsZXMgPSBvYnNlcnZhYmxlc1swXTtcbiAgICB9XG4gICAgb2JzZXJ2YWJsZXMudW5zaGlmdCh0aGlzKTtcbiAgICByZXR1cm4gbmV3IEFycmF5T2JzZXJ2YWJsZV8xLkFycmF5T2JzZXJ2YWJsZShvYnNlcnZhYmxlcykubGlmdChuZXcgQ29tYmluZUxhdGVzdE9wZXJhdG9yKHByb2plY3QpKTtcbn1cbmV4cG9ydHMuY29tYmluZUxhdGVzdCA9IGNvbWJpbmVMYXRlc3Q7XG4vKiB0c2xpbnQ6ZW5hYmxlOm1heC1saW5lLWxlbmd0aCAqL1xuLyoqXG4gKiBDb21iaW5lcyB0aGUgdmFsdWVzIGZyb20gb2JzZXJ2YWJsZXMgcGFzc2VkIGFzIGFyZ3VtZW50cy4gVGhpcyBpcyBkb25lIGJ5IHN1YnNjcmliaW5nXG4gKiB0byBlYWNoIG9ic2VydmFibGUsIGluIG9yZGVyLCBhbmQgY29sbGVjdGluZyBhbiBhcnJheSBvZiBlYWNoIG9mIHRoZSBtb3N0IHJlY2VudCB2YWx1ZXMgYW55IHRpbWUgYW55IG9mIHRoZSBvYnNlcnZhYmxlc1xuICogZW1pdHMsIHRoZW4gZWl0aGVyIHRha2luZyB0aGF0IGFycmF5IGFuZCBwYXNzaW5nIGl0IGFzIGFyZ3VtZW50cyB0byBhbiBvcHRpb24gYHByb2plY3RgIGZ1bmN0aW9uIGFuZCBlbWl0dGluZyB0aGUgcmV0dXJuXG4gKiB2YWx1ZSBvZiB0aGF0LCBvciBqdXN0IGVtaXR0aW5nIHRoZSBhcnJheSBvZiByZWNlbnQgdmFsdWVzIGRpcmVjdGx5IGlmIHRoZXJlIGlzIG5vIGBwcm9qZWN0YCBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7Li4uT2JzZXJ2YWJsZX0gb2JzZXJ2YWJsZXMgdGhlIG9ic2VydmFibGVzIHRvIGNvbWJpbmVcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFtwcm9qZWN0XSBhbiBvcHRpb25hbCBmdW5jdGlvbiB0byBwcm9qZWN0IHRoZSB2YWx1ZXMgZnJvbSB0aGUgY29tYmluZWQgcmVjZW50IHZhbHVlcyBpbnRvIGEgbmV3IHZhbHVlIGZvciBlbWlzc2lvbi5cbiAqIEByZXR1cm4ge09ic2VydmFibGV9IGFuIG9ic2VydmFibGUgb2Ygb3RoZXIgcHJvamVjdGVkIHZhbHVlcyBmcm9tIHRoZSBtb3N0IHJlY2VudCB2YWx1ZXMgZnJvbSBlYWNoIG9ic2VydmFibGUsIG9yIGFuIGFycmF5IG9mIGVhY2ggb2ZcbiAqIHRoZSBtb3N0IHJlY2VudCB2YWx1ZXMgZnJvbSBlYWNoIG9ic2VydmFibGUuXG4gKiBAc3RhdGljIHRydWVcbiAqIEBuYW1lIGNvbWJpbmVMYXRlc3RcbiAqIEBvd25lciBPYnNlcnZhYmxlXG4gKi9cbmZ1bmN0aW9uIGNvbWJpbmVMYXRlc3RTdGF0aWMoKSB7XG4gICAgdmFyIG9ic2VydmFibGVzID0gW107XG4gICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgb2JzZXJ2YWJsZXNbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgfVxuICAgIHZhciBwcm9qZWN0ID0gbnVsbDtcbiAgICB2YXIgc2NoZWR1bGVyID0gbnVsbDtcbiAgICBpZiAoaXNTY2hlZHVsZXJfMS5pc1NjaGVkdWxlcihvYnNlcnZhYmxlc1tvYnNlcnZhYmxlcy5sZW5ndGggLSAxXSkpIHtcbiAgICAgICAgc2NoZWR1bGVyID0gb2JzZXJ2YWJsZXMucG9wKCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygb2JzZXJ2YWJsZXNbb2JzZXJ2YWJsZXMubGVuZ3RoIC0gMV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcHJvamVjdCA9IG9ic2VydmFibGVzLnBvcCgpO1xuICAgIH1cbiAgICAvLyBpZiB0aGUgZmlyc3QgYW5kIG9ubHkgb3RoZXIgYXJndW1lbnQgYmVzaWRlcyB0aGUgcmVzdWx0U2VsZWN0b3IgaXMgYW4gYXJyYXlcbiAgICAvLyBhc3N1bWUgaXQncyBiZWVuIGNhbGxlZCB3aXRoIGBjb21iaW5lTGF0ZXN0KFtvYnMxLCBvYnMyLCBvYnMzXSwgcHJvamVjdClgXG4gICAgaWYgKG9ic2VydmFibGVzLmxlbmd0aCA9PT0gMSAmJiBpc0FycmF5XzEuaXNBcnJheShvYnNlcnZhYmxlc1swXSkpIHtcbiAgICAgICAgb2JzZXJ2YWJsZXMgPSBvYnNlcnZhYmxlc1swXTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBBcnJheU9ic2VydmFibGVfMS5BcnJheU9ic2VydmFibGUob2JzZXJ2YWJsZXMsIHNjaGVkdWxlcikubGlmdChuZXcgQ29tYmluZUxhdGVzdE9wZXJhdG9yKHByb2plY3QpKTtcbn1cbmV4cG9ydHMuY29tYmluZUxhdGVzdFN0YXRpYyA9IGNvbWJpbmVMYXRlc3RTdGF0aWM7XG52YXIgQ29tYmluZUxhdGVzdE9wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDb21iaW5lTGF0ZXN0T3BlcmF0b3IocHJvamVjdCkge1xuICAgICAgICB0aGlzLnByb2plY3QgPSBwcm9qZWN0O1xuICAgIH1cbiAgICBDb21iaW5lTGF0ZXN0T3BlcmF0b3IucHJvdG90eXBlLmNhbGwgPSBmdW5jdGlvbiAoc3Vic2NyaWJlciwgc291cmNlKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2UuX3N1YnNjcmliZShuZXcgQ29tYmluZUxhdGVzdFN1YnNjcmliZXIoc3Vic2NyaWJlciwgdGhpcy5wcm9qZWN0KSk7XG4gICAgfTtcbiAgICByZXR1cm4gQ29tYmluZUxhdGVzdE9wZXJhdG9yO1xufSgpKTtcbmV4cG9ydHMuQ29tYmluZUxhdGVzdE9wZXJhdG9yID0gQ29tYmluZUxhdGVzdE9wZXJhdG9yO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBDb21iaW5lTGF0ZXN0U3Vic2NyaWJlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKENvbWJpbmVMYXRlc3RTdWJzY3JpYmVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIENvbWJpbmVMYXRlc3RTdWJzY3JpYmVyKGRlc3RpbmF0aW9uLCBwcm9qZWN0KSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlc3RpbmF0aW9uKTtcbiAgICAgICAgdGhpcy5wcm9qZWN0ID0gcHJvamVjdDtcbiAgICAgICAgdGhpcy5hY3RpdmUgPSAwO1xuICAgICAgICB0aGlzLnZhbHVlcyA9IFtdO1xuICAgICAgICB0aGlzLm9ic2VydmFibGVzID0gW107XG4gICAgICAgIHRoaXMudG9SZXNwb25kID0gW107XG4gICAgfVxuICAgIENvbWJpbmVMYXRlc3RTdWJzY3JpYmVyLnByb3RvdHlwZS5fbmV4dCA9IGZ1bmN0aW9uIChvYnNlcnZhYmxlKSB7XG4gICAgICAgIHZhciB0b1Jlc3BvbmQgPSB0aGlzLnRvUmVzcG9uZDtcbiAgICAgICAgdG9SZXNwb25kLnB1c2godG9SZXNwb25kLmxlbmd0aCk7XG4gICAgICAgIHRoaXMub2JzZXJ2YWJsZXMucHVzaChvYnNlcnZhYmxlKTtcbiAgICB9O1xuICAgIENvbWJpbmVMYXRlc3RTdWJzY3JpYmVyLnByb3RvdHlwZS5fY29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvYnNlcnZhYmxlcyA9IHRoaXMub2JzZXJ2YWJsZXM7XG4gICAgICAgIHZhciBsZW4gPSBvYnNlcnZhYmxlcy5sZW5ndGg7XG4gICAgICAgIGlmIChsZW4gPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24uY29tcGxldGUoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuYWN0aXZlID0gbGVuO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBvYnNlcnZhYmxlID0gb2JzZXJ2YWJsZXNbaV07XG4gICAgICAgICAgICAgICAgdGhpcy5hZGQoc3Vic2NyaWJlVG9SZXN1bHRfMS5zdWJzY3JpYmVUb1Jlc3VsdCh0aGlzLCBvYnNlcnZhYmxlLCBvYnNlcnZhYmxlLCBpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIENvbWJpbmVMYXRlc3RTdWJzY3JpYmVyLnByb3RvdHlwZS5ub3RpZnlDb21wbGV0ZSA9IGZ1bmN0aW9uICh1bnVzZWQpIHtcbiAgICAgICAgaWYgKCh0aGlzLmFjdGl2ZSAtPSAxKSA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDb21iaW5lTGF0ZXN0U3Vic2NyaWJlci5wcm90b3R5cGUubm90aWZ5TmV4dCA9IGZ1bmN0aW9uIChvdXRlclZhbHVlLCBpbm5lclZhbHVlLCBvdXRlckluZGV4LCBpbm5lckluZGV4LCBpbm5lclN1Yikge1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy52YWx1ZXM7XG4gICAgICAgIHZhbHVlc1tvdXRlckluZGV4XSA9IGlubmVyVmFsdWU7XG4gICAgICAgIHZhciB0b1Jlc3BvbmQgPSB0aGlzLnRvUmVzcG9uZDtcbiAgICAgICAgaWYgKHRvUmVzcG9uZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgZm91bmQgPSB0b1Jlc3BvbmQuaW5kZXhPZihvdXRlckluZGV4KTtcbiAgICAgICAgICAgIGlmIChmb3VuZCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICB0b1Jlc3BvbmQuc3BsaWNlKGZvdW5kLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodG9SZXNwb25kLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucHJvamVjdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3RyeVByb2plY3QodmFsdWVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24ubmV4dCh2YWx1ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBDb21iaW5lTGF0ZXN0U3Vic2NyaWJlci5wcm90b3R5cGUuX3RyeVByb2plY3QgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXN1bHQgPSB0aGlzLnByb2plY3QuYXBwbHkodGhpcywgdmFsdWVzKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmVycm9yKGVycik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5uZXh0KHJlc3VsdCk7XG4gICAgfTtcbiAgICByZXR1cm4gQ29tYmluZUxhdGVzdFN1YnNjcmliZXI7XG59KE91dGVyU3Vic2NyaWJlcl8xLk91dGVyU3Vic2NyaWJlcikpO1xuZXhwb3J0cy5Db21iaW5lTGF0ZXN0U3Vic2NyaWJlciA9IENvbWJpbmVMYXRlc3RTdWJzY3JpYmVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29tYmluZUxhdGVzdC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBpc1NjaGVkdWxlcl8xID0gcmVxdWlyZSgnLi4vdXRpbC9pc1NjaGVkdWxlcicpO1xudmFyIEFycmF5T2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vb2JzZXJ2YWJsZS9BcnJheU9ic2VydmFibGUnKTtcbnZhciBtZXJnZUFsbF8xID0gcmVxdWlyZSgnLi9tZXJnZUFsbCcpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBPYnNlcnZhYmxlIHdoaWNoIHNlcXVlbnRpYWxseSBlbWl0cyBhbGwgdmFsdWVzIGZyb20gZXZlcnlcbiAqIGdpdmVuIGlucHV0IE9ic2VydmFibGUgYWZ0ZXIgdGhlIGN1cnJlbnQgT2JzZXJ2YWJsZS5cbiAqXG4gKiA8c3BhbiBjbGFzcz1cImluZm9ybWFsXCI+Q29uY2F0ZW5hdGVzIG11bHRpcGxlIE9ic2VydmFibGVzIHRvZ2V0aGVyIGJ5XG4gKiBzZXF1ZW50aWFsbHkgZW1pdHRpbmcgdGhlaXIgdmFsdWVzLCBvbmUgT2JzZXJ2YWJsZSBhZnRlciB0aGUgb3RoZXIuPC9zcGFuPlxuICpcbiAqIDxpbWcgc3JjPVwiLi9pbWcvY29uY2F0LnBuZ1wiIHdpZHRoPVwiMTAwJVwiPlxuICpcbiAqIEpvaW5zIHRoaXMgT2JzZXJ2YWJsZSB3aXRoIG11bHRpcGxlIG90aGVyIE9ic2VydmFibGVzIGJ5IHN1YnNjcmliaW5nIHRvIHRoZW1cbiAqIG9uZSBhdCBhIHRpbWUsIHN0YXJ0aW5nIHdpdGggdGhlIHNvdXJjZSwgYW5kIG1lcmdpbmcgdGhlaXIgcmVzdWx0cyBpbnRvIHRoZVxuICogb3V0cHV0IE9ic2VydmFibGUuIFdpbGwgd2FpdCBmb3IgZWFjaCBPYnNlcnZhYmxlIHRvIGNvbXBsZXRlIGJlZm9yZSBtb3ZpbmdcbiAqIG9uIHRvIHRoZSBuZXh0LlxuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPkNvbmNhdGVuYXRlIGEgdGltZXIgY291bnRpbmcgZnJvbSAwIHRvIDMgd2l0aCBhIHN5bmNocm9ub3VzIHNlcXVlbmNlIGZyb20gMSB0byAxMDwvY2FwdGlvbj5cbiAqIHZhciB0aW1lciA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwMCkudGFrZSg0KTtcbiAqIHZhciBzZXF1ZW5jZSA9IFJ4Lk9ic2VydmFibGUucmFuZ2UoMSwgMTApO1xuICogdmFyIHJlc3VsdCA9IHRpbWVyLmNvbmNhdChzZXF1ZW5jZSk7XG4gKiByZXN1bHQuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPkNvbmNhdGVuYXRlIDMgT2JzZXJ2YWJsZXM8L2NhcHRpb24+XG4gKiB2YXIgdGltZXIxID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxMDAwKS50YWtlKDEwKTtcbiAqIHZhciB0aW1lcjIgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDIwMDApLnRha2UoNik7XG4gKiB2YXIgdGltZXIzID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCg1MDApLnRha2UoMTApO1xuICogdmFyIHJlc3VsdCA9IHRpbWVyMS5jb25jYXQodGltZXIyLCB0aW1lcjMpO1xuICogcmVzdWx0LnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAc2VlIHtAbGluayBjb25jYXRBbGx9XG4gKiBAc2VlIHtAbGluayBjb25jYXRNYXB9XG4gKiBAc2VlIHtAbGluayBjb25jYXRNYXBUb31cbiAqXG4gKiBAcGFyYW0ge09ic2VydmFibGV9IG90aGVyIEFuIGlucHV0IE9ic2VydmFibGUgdG8gY29uY2F0ZW5hdGUgYWZ0ZXIgdGhlIHNvdXJjZVxuICogT2JzZXJ2YWJsZS4gTW9yZSB0aGFuIG9uZSBpbnB1dCBPYnNlcnZhYmxlcyBtYXkgYmUgZ2l2ZW4gYXMgYXJndW1lbnQuXG4gKiBAcGFyYW0ge1NjaGVkdWxlcn0gW3NjaGVkdWxlcj1udWxsXSBBbiBvcHRpb25hbCBTY2hlZHVsZXIgdG8gc2NoZWR1bGUgZWFjaFxuICogT2JzZXJ2YWJsZSBzdWJzY3JpcHRpb24gb24uXG4gKiBAcmV0dXJuIHtPYnNlcnZhYmxlfSBBbGwgdmFsdWVzIG9mIGVhY2ggcGFzc2VkIE9ic2VydmFibGUgbWVyZ2VkIGludG8gYVxuICogc2luZ2xlIE9ic2VydmFibGUsIGluIG9yZGVyLCBpbiBzZXJpYWwgZmFzaGlvbi5cbiAqIEBtZXRob2QgY29uY2F0XG4gKiBAb3duZXIgT2JzZXJ2YWJsZVxuICovXG5mdW5jdGlvbiBjb25jYXQoKSB7XG4gICAgdmFyIG9ic2VydmFibGVzID0gW107XG4gICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgb2JzZXJ2YWJsZXNbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgfVxuICAgIHJldHVybiBjb25jYXRTdGF0aWMuYXBwbHkodm9pZCAwLCBbdGhpc10uY29uY2F0KG9ic2VydmFibGVzKSk7XG59XG5leHBvcnRzLmNvbmNhdCA9IGNvbmNhdDtcbi8qIHRzbGludDplbmFibGU6bWF4LWxpbmUtbGVuZ3RoICovXG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IE9ic2VydmFibGUgd2hpY2ggc2VxdWVudGlhbGx5IGVtaXRzIGFsbCB2YWx1ZXMgZnJvbSBldmVyeVxuICogZ2l2ZW4gaW5wdXQgT2JzZXJ2YWJsZSBhZnRlciB0aGUgY3VycmVudCBPYnNlcnZhYmxlLlxuICpcbiAqIDxzcGFuIGNsYXNzPVwiaW5mb3JtYWxcIj5Db25jYXRlbmF0ZXMgbXVsdGlwbGUgT2JzZXJ2YWJsZXMgdG9nZXRoZXIgYnlcbiAqIHNlcXVlbnRpYWxseSBlbWl0dGluZyB0aGVpciB2YWx1ZXMsIG9uZSBPYnNlcnZhYmxlIGFmdGVyIHRoZSBvdGhlci48L3NwYW4+XG4gKlxuICogPGltZyBzcmM9XCIuL2ltZy9jb25jYXQucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gKlxuICogSm9pbnMgbXVsdGlwbGUgT2JzZXJ2YWJsZXMgdG9nZXRoZXIgYnkgc3Vic2NyaWJpbmcgdG8gdGhlbSBvbmUgYXQgYSB0aW1lIGFuZFxuICogbWVyZ2luZyB0aGVpciByZXN1bHRzIGludG8gdGhlIG91dHB1dCBPYnNlcnZhYmxlLiBXaWxsIHdhaXQgZm9yIGVhY2hcbiAqIE9ic2VydmFibGUgdG8gY29tcGxldGUgYmVmb3JlIG1vdmluZyBvbiB0byB0aGUgbmV4dC5cbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5Db25jYXRlbmF0ZSBhIHRpbWVyIGNvdW50aW5nIGZyb20gMCB0byAzIHdpdGggYSBzeW5jaHJvbm91cyBzZXF1ZW5jZSBmcm9tIDEgdG8gMTA8L2NhcHRpb24+XG4gKiB2YXIgdGltZXIgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMDApLnRha2UoNCk7XG4gKiB2YXIgc2VxdWVuY2UgPSBSeC5PYnNlcnZhYmxlLnJhbmdlKDEsIDEwKTtcbiAqIHZhciByZXN1bHQgPSBSeC5PYnNlcnZhYmxlLmNvbmNhdCh0aW1lciwgc2VxdWVuY2UpO1xuICogcmVzdWx0LnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5Db25jYXRlbmF0ZSAzIE9ic2VydmFibGVzPC9jYXB0aW9uPlxuICogdmFyIHRpbWVyMSA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwMCkudGFrZSgxMCk7XG4gKiB2YXIgdGltZXIyID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgyMDAwKS50YWtlKDYpO1xuICogdmFyIHRpbWVyMyA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoNTAwKS50YWtlKDEwKTtcbiAqIHZhciByZXN1bHQgPSBSeC5PYnNlcnZhYmxlLmNvbmNhdCh0aW1lcjEsIHRpbWVyMiwgdGltZXIzKTtcbiAqIHJlc3VsdC5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gKlxuICogQHNlZSB7QGxpbmsgY29uY2F0QWxsfVxuICogQHNlZSB7QGxpbmsgY29uY2F0TWFwfVxuICogQHNlZSB7QGxpbmsgY29uY2F0TWFwVG99XG4gKlxuICogQHBhcmFtIHtPYnNlcnZhYmxlfSBpbnB1dDEgQW4gaW5wdXQgT2JzZXJ2YWJsZSB0byBjb25jYXRlbmF0ZSB3aXRoIG90aGVycy5cbiAqIEBwYXJhbSB7T2JzZXJ2YWJsZX0gaW5wdXQyIEFuIGlucHV0IE9ic2VydmFibGUgdG8gY29uY2F0ZW5hdGUgd2l0aCBvdGhlcnMuXG4gKiBNb3JlIHRoYW4gb25lIGlucHV0IE9ic2VydmFibGVzIG1heSBiZSBnaXZlbiBhcyBhcmd1bWVudC5cbiAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyPW51bGxdIEFuIG9wdGlvbmFsIFNjaGVkdWxlciB0byBzY2hlZHVsZSBlYWNoXG4gKiBPYnNlcnZhYmxlIHN1YnNjcmlwdGlvbiBvbi5cbiAqIEByZXR1cm4ge09ic2VydmFibGV9IEFsbCB2YWx1ZXMgb2YgZWFjaCBwYXNzZWQgT2JzZXJ2YWJsZSBtZXJnZWQgaW50byBhXG4gKiBzaW5nbGUgT2JzZXJ2YWJsZSwgaW4gb3JkZXIsIGluIHNlcmlhbCBmYXNoaW9uLlxuICogQHN0YXRpYyB0cnVlXG4gKiBAbmFtZSBjb25jYXRcbiAqIEBvd25lciBPYnNlcnZhYmxlXG4gKi9cbmZ1bmN0aW9uIGNvbmNhdFN0YXRpYygpIHtcbiAgICB2YXIgb2JzZXJ2YWJsZXMgPSBbXTtcbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICBvYnNlcnZhYmxlc1tfaSAtIDBdID0gYXJndW1lbnRzW19pXTtcbiAgICB9XG4gICAgdmFyIHNjaGVkdWxlciA9IG51bGw7XG4gICAgdmFyIGFyZ3MgPSBvYnNlcnZhYmxlcztcbiAgICBpZiAoaXNTY2hlZHVsZXJfMS5pc1NjaGVkdWxlcihhcmdzW29ic2VydmFibGVzLmxlbmd0aCAtIDFdKSkge1xuICAgICAgICBzY2hlZHVsZXIgPSBhcmdzLnBvcCgpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEFycmF5T2JzZXJ2YWJsZV8xLkFycmF5T2JzZXJ2YWJsZShvYnNlcnZhYmxlcywgc2NoZWR1bGVyKS5saWZ0KG5ldyBtZXJnZUFsbF8xLk1lcmdlQWxsT3BlcmF0b3IoMSkpO1xufVxuZXhwb3J0cy5jb25jYXRTdGF0aWMgPSBjb25jYXRTdGF0aWM7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb25jYXQuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuLi9TdWJzY3JpYmVyJyk7XG4vKipcbiAqIEFwcGxpZXMgYSBnaXZlbiBgcHJvamVjdGAgZnVuY3Rpb24gdG8gZWFjaCB2YWx1ZSBlbWl0dGVkIGJ5IHRoZSBzb3VyY2VcbiAqIE9ic2VydmFibGUsIGFuZCBlbWl0cyB0aGUgcmVzdWx0aW5nIHZhbHVlcyBhcyBhbiBPYnNlcnZhYmxlLlxuICpcbiAqIDxzcGFuIGNsYXNzPVwiaW5mb3JtYWxcIj5MaWtlIFtBcnJheS5wcm90b3R5cGUubWFwKCldKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L21hcCksXG4gKiBpdCBwYXNzZXMgZWFjaCBzb3VyY2UgdmFsdWUgdGhyb3VnaCBhIHRyYW5zZm9ybWF0aW9uIGZ1bmN0aW9uIHRvIGdldFxuICogY29ycmVzcG9uZGluZyBvdXRwdXQgdmFsdWVzLjwvc3Bhbj5cbiAqXG4gKiA8aW1nIHNyYz1cIi4vaW1nL21hcC5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAqXG4gKiBTaW1pbGFyIHRvIHRoZSB3ZWxsIGtub3duIGBBcnJheS5wcm90b3R5cGUubWFwYCBmdW5jdGlvbiwgdGhpcyBvcGVyYXRvclxuICogYXBwbGllcyBhIHByb2plY3Rpb24gdG8gZWFjaCB2YWx1ZSBhbmQgZW1pdHMgdGhhdCBwcm9qZWN0aW9uIGluIHRoZSBvdXRwdXRcbiAqIE9ic2VydmFibGUuXG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+TWFwIGV2ZXJ5IGV2ZXJ5IGNsaWNrIHRvIHRoZSBjbGllbnRYIHBvc2l0aW9uIG9mIHRoYXQgY2xpY2s8L2NhcHRpb24+XG4gKiB2YXIgY2xpY2tzID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoZG9jdW1lbnQsICdjbGljaycpO1xuICogdmFyIHBvc2l0aW9ucyA9IGNsaWNrcy5tYXAoZXYgPT4gZXYuY2xpZW50WCk7XG4gKiBwb3NpdGlvbnMuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICpcbiAqIEBzZWUge0BsaW5rIG1hcFRvfVxuICogQHNlZSB7QGxpbmsgcGx1Y2t9XG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbih2YWx1ZTogVCwgaW5kZXg6IG51bWJlcik6IFJ9IHByb2plY3QgVGhlIGZ1bmN0aW9uIHRvIGFwcGx5XG4gKiB0byBlYWNoIGB2YWx1ZWAgZW1pdHRlZCBieSB0aGUgc291cmNlIE9ic2VydmFibGUuIFRoZSBgaW5kZXhgIHBhcmFtZXRlciBpc1xuICogdGhlIG51bWJlciBgaWAgZm9yIHRoZSBpLXRoIGVtaXNzaW9uIHRoYXQgaGFzIGhhcHBlbmVkIHNpbmNlIHRoZVxuICogc3Vic2NyaXB0aW9uLCBzdGFydGluZyBmcm9tIHRoZSBudW1iZXIgYDBgLlxuICogQHBhcmFtIHthbnl9IFt0aGlzQXJnXSBBbiBvcHRpb25hbCBhcmd1bWVudCB0byBkZWZpbmUgd2hhdCBgdGhpc2AgaXMgaW4gdGhlXG4gKiBgcHJvamVjdGAgZnVuY3Rpb24uXG4gKiBAcmV0dXJuIHtPYnNlcnZhYmxlPFI+fSBBbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgdGhlIHZhbHVlcyBmcm9tIHRoZSBzb3VyY2VcbiAqIE9ic2VydmFibGUgdHJhbnNmb3JtZWQgYnkgdGhlIGdpdmVuIGBwcm9qZWN0YCBmdW5jdGlvbi5cbiAqIEBtZXRob2QgbWFwXG4gKiBAb3duZXIgT2JzZXJ2YWJsZVxuICovXG5mdW5jdGlvbiBtYXAocHJvamVjdCwgdGhpc0FyZykge1xuICAgIGlmICh0eXBlb2YgcHJvamVjdCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBpcyBub3QgYSBmdW5jdGlvbi4gQXJlIHlvdSBsb29raW5nIGZvciBgbWFwVG8oKWA/Jyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmxpZnQobmV3IE1hcE9wZXJhdG9yKHByb2plY3QsIHRoaXNBcmcpKTtcbn1cbmV4cG9ydHMubWFwID0gbWFwO1xudmFyIE1hcE9wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBNYXBPcGVyYXRvcihwcm9qZWN0LCB0aGlzQXJnKSB7XG4gICAgICAgIHRoaXMucHJvamVjdCA9IHByb2plY3Q7XG4gICAgICAgIHRoaXMudGhpc0FyZyA9IHRoaXNBcmc7XG4gICAgfVxuICAgIE1hcE9wZXJhdG9yLnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gKHN1YnNjcmliZXIsIHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gc291cmNlLl9zdWJzY3JpYmUobmV3IE1hcFN1YnNjcmliZXIoc3Vic2NyaWJlciwgdGhpcy5wcm9qZWN0LCB0aGlzLnRoaXNBcmcpKTtcbiAgICB9O1xuICAgIHJldHVybiBNYXBPcGVyYXRvcjtcbn0oKSk7XG4vKipcbiAqIFdlIG5lZWQgdGhpcyBKU0RvYyBjb21tZW50IGZvciBhZmZlY3RpbmcgRVNEb2MuXG4gKiBAaWdub3JlXG4gKiBAZXh0ZW5kcyB7SWdub3JlZH1cbiAqL1xudmFyIE1hcFN1YnNjcmliZXIgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNYXBTdWJzY3JpYmVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1hcFN1YnNjcmliZXIoZGVzdGluYXRpb24sIHByb2plY3QsIHRoaXNBcmcpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVzdGluYXRpb24pO1xuICAgICAgICB0aGlzLnByb2plY3QgPSBwcm9qZWN0O1xuICAgICAgICB0aGlzLmNvdW50ID0gMDtcbiAgICAgICAgdGhpcy50aGlzQXJnID0gdGhpc0FyZyB8fCB0aGlzO1xuICAgIH1cbiAgICAvLyBOT1RFOiBUaGlzIGxvb2tzIHVub3B0aW1pemVkLCBidXQgaXQncyBhY3R1YWxseSBwdXJwb3NlZnVsbHkgTk9UXG4gICAgLy8gdXNpbmcgdHJ5L2NhdGNoIG9wdGltaXphdGlvbnMuXG4gICAgTWFwU3Vic2NyaWJlci5wcm90b3R5cGUuX25leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMucHJvamVjdC5jYWxsKHRoaXMudGhpc0FyZywgdmFsdWUsIHRoaXMuY291bnQrKyk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5lcnJvcihlcnIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24ubmV4dChyZXN1bHQpO1xuICAgIH07XG4gICAgcmV0dXJuIE1hcFN1YnNjcmliZXI7XG59KFN1YnNjcmliZXJfMS5TdWJzY3JpYmVyKSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1tYXAuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuLi9TdWJzY3JpYmVyJyk7XG4vKipcbiAqIEVtaXRzIHRoZSBnaXZlbiBjb25zdGFudCB2YWx1ZSBvbiB0aGUgb3V0cHV0IE9ic2VydmFibGUgZXZlcnkgdGltZSB0aGUgc291cmNlXG4gKiBPYnNlcnZhYmxlIGVtaXRzIGEgdmFsdWUuXG4gKlxuICogPHNwYW4gY2xhc3M9XCJpbmZvcm1hbFwiPkxpa2Uge0BsaW5rIG1hcH0sIGJ1dCBpdCBtYXBzIGV2ZXJ5IHNvdXJjZSB2YWx1ZSB0b1xuICogdGhlIHNhbWUgb3V0cHV0IHZhbHVlIGV2ZXJ5IHRpbWUuPC9zcGFuPlxuICpcbiAqIDxpbWcgc3JjPVwiLi9pbWcvbWFwVG8ucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gKlxuICogVGFrZXMgYSBjb25zdGFudCBgdmFsdWVgIGFzIGFyZ3VtZW50LCBhbmQgZW1pdHMgdGhhdCB3aGVuZXZlciB0aGUgc291cmNlXG4gKiBPYnNlcnZhYmxlIGVtaXRzIGEgdmFsdWUuIEluIG90aGVyIHdvcmRzLCBpZ25vcmVzIHRoZSBhY3R1YWwgc291cmNlIHZhbHVlLFxuICogYW5kIHNpbXBseSB1c2VzIHRoZSBlbWlzc2lvbiBtb21lbnQgdG8ga25vdyB3aGVuIHRvIGVtaXQgdGhlIGdpdmVuIGB2YWx1ZWAuXG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+TWFwIGV2ZXJ5IGV2ZXJ5IGNsaWNrIHRvIHRoZSBzdHJpbmcgJ0hpJzwvY2FwdGlvbj5cbiAqIHZhciBjbGlja3MgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChkb2N1bWVudCwgJ2NsaWNrJyk7XG4gKiB2YXIgZ3JlZXRpbmdzID0gY2xpY2tzLm1hcFRvKCdIaScpO1xuICogZ3JlZXRpbmdzLnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAc2VlIHtAbGluayBtYXB9XG4gKlxuICogQHBhcmFtIHthbnl9IHZhbHVlIFRoZSB2YWx1ZSB0byBtYXAgZWFjaCBzb3VyY2UgdmFsdWUgdG8uXG4gKiBAcmV0dXJuIHtPYnNlcnZhYmxlfSBBbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgdGhlIGdpdmVuIGB2YWx1ZWAgZXZlcnkgdGltZVxuICogdGhlIHNvdXJjZSBPYnNlcnZhYmxlIGVtaXRzIHNvbWV0aGluZy5cbiAqIEBtZXRob2QgbWFwVG9cbiAqIEBvd25lciBPYnNlcnZhYmxlXG4gKi9cbmZ1bmN0aW9uIG1hcFRvKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMubGlmdChuZXcgTWFwVG9PcGVyYXRvcih2YWx1ZSkpO1xufVxuZXhwb3J0cy5tYXBUbyA9IG1hcFRvO1xudmFyIE1hcFRvT3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1hcFRvT3BlcmF0b3IodmFsdWUpIHtcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgIH1cbiAgICBNYXBUb09wZXJhdG9yLnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gKHN1YnNjcmliZXIsIHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gc291cmNlLl9zdWJzY3JpYmUobmV3IE1hcFRvU3Vic2NyaWJlcihzdWJzY3JpYmVyLCB0aGlzLnZhbHVlKSk7XG4gICAgfTtcbiAgICByZXR1cm4gTWFwVG9PcGVyYXRvcjtcbn0oKSk7XG4vKipcbiAqIFdlIG5lZWQgdGhpcyBKU0RvYyBjb21tZW50IGZvciBhZmZlY3RpbmcgRVNEb2MuXG4gKiBAaWdub3JlXG4gKiBAZXh0ZW5kcyB7SWdub3JlZH1cbiAqL1xudmFyIE1hcFRvU3Vic2NyaWJlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1hcFRvU3Vic2NyaWJlciwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNYXBUb1N1YnNjcmliZXIoZGVzdGluYXRpb24sIHZhbHVlKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlc3RpbmF0aW9uKTtcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgIH1cbiAgICBNYXBUb1N1YnNjcmliZXIucHJvdG90eXBlLl9uZXh0ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5uZXh0KHRoaXMudmFsdWUpO1xuICAgIH07XG4gICAgcmV0dXJuIE1hcFRvU3Vic2NyaWJlcjtcbn0oU3Vic2NyaWJlcl8xLlN1YnNjcmliZXIpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1hcFRvLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIEFycmF5T2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vb2JzZXJ2YWJsZS9BcnJheU9ic2VydmFibGUnKTtcbnZhciBtZXJnZUFsbF8xID0gcmVxdWlyZSgnLi9tZXJnZUFsbCcpO1xudmFyIGlzU2NoZWR1bGVyXzEgPSByZXF1aXJlKCcuLi91dGlsL2lzU2NoZWR1bGVyJyk7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IE9ic2VydmFibGUgd2hpY2ggY29uY3VycmVudGx5IGVtaXRzIGFsbCB2YWx1ZXMgZnJvbSBldmVyeVxuICogZ2l2ZW4gaW5wdXQgT2JzZXJ2YWJsZS5cbiAqXG4gKiA8c3BhbiBjbGFzcz1cImluZm9ybWFsXCI+RmxhdHRlbnMgbXVsdGlwbGUgT2JzZXJ2YWJsZXMgdG9nZXRoZXIgYnkgYmxlbmRpbmdcbiAqIHRoZWlyIHZhbHVlcyBpbnRvIG9uZSBPYnNlcnZhYmxlLjwvc3Bhbj5cbiAqXG4gKiA8aW1nIHNyYz1cIi4vaW1nL21lcmdlLnBuZ1wiIHdpZHRoPVwiMTAwJVwiPlxuICpcbiAqIGBtZXJnZWAgc3Vic2NyaWJlcyB0byBlYWNoIGdpdmVuIGlucHV0IE9ic2VydmFibGUgKGVpdGhlciB0aGUgc291cmNlIG9yIGFuXG4gKiBPYnNlcnZhYmxlIGdpdmVuIGFzIGFyZ3VtZW50KSwgYW5kIHNpbXBseSBmb3J3YXJkcyAod2l0aG91dCBkb2luZyBhbnlcbiAqIHRyYW5zZm9ybWF0aW9uKSBhbGwgdGhlIHZhbHVlcyBmcm9tIGFsbCB0aGUgaW5wdXQgT2JzZXJ2YWJsZXMgdG8gdGhlIG91dHB1dFxuICogT2JzZXJ2YWJsZS4gVGhlIG91dHB1dCBPYnNlcnZhYmxlIG9ubHkgY29tcGxldGVzIG9uY2UgYWxsIGlucHV0IE9ic2VydmFibGVzXG4gKiBoYXZlIGNvbXBsZXRlZC4gQW55IGVycm9yIGRlbGl2ZXJlZCBieSBhbiBpbnB1dCBPYnNlcnZhYmxlIHdpbGwgYmUgaW1tZWRpYXRlbHlcbiAqIGVtaXR0ZWQgb24gdGhlIG91dHB1dCBPYnNlcnZhYmxlLlxuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPk1lcmdlIHRvZ2V0aGVyIHR3byBPYnNlcnZhYmxlczogMXMgaW50ZXJ2YWwgYW5kIGNsaWNrczwvY2FwdGlvbj5cbiAqIHZhciBjbGlja3MgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChkb2N1bWVudCwgJ2NsaWNrJyk7XG4gKiB2YXIgdGltZXIgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMDApO1xuICogdmFyIGNsaWNrc09yVGltZXIgPSBjbGlja3MubWVyZ2UodGltZXIpO1xuICogY2xpY2tzT3JUaW1lci5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+TWVyZ2UgdG9nZXRoZXIgMyBPYnNlcnZhYmxlcywgYnV0IG9ubHkgMiBydW4gY29uY3VycmVudGx5PC9jYXB0aW9uPlxuICogdmFyIHRpbWVyMSA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwMCkudGFrZSgxMCk7XG4gKiB2YXIgdGltZXIyID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgyMDAwKS50YWtlKDYpO1xuICogdmFyIHRpbWVyMyA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoNTAwKS50YWtlKDEwKTtcbiAqIHZhciBjb25jdXJyZW50ID0gMjsgLy8gdGhlIGFyZ3VtZW50XG4gKiB2YXIgbWVyZ2VkID0gdGltZXIxLm1lcmdlKHRpbWVyMiwgdGltZXIzLCBjb25jdXJyZW50KTtcbiAqIG1lcmdlZC5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gKlxuICogQHNlZSB7QGxpbmsgbWVyZ2VBbGx9XG4gKiBAc2VlIHtAbGluayBtZXJnZU1hcH1cbiAqIEBzZWUge0BsaW5rIG1lcmdlTWFwVG99XG4gKiBAc2VlIHtAbGluayBtZXJnZVNjYW59XG4gKlxuICogQHBhcmFtIHtPYnNlcnZhYmxlfSBvdGhlciBBbiBpbnB1dCBPYnNlcnZhYmxlIHRvIG1lcmdlIHdpdGggdGhlIHNvdXJjZVxuICogT2JzZXJ2YWJsZS4gTW9yZSB0aGFuIG9uZSBpbnB1dCBPYnNlcnZhYmxlcyBtYXkgYmUgZ2l2ZW4gYXMgYXJndW1lbnQuXG4gKiBAcGFyYW0ge251bWJlcn0gW2NvbmN1cnJlbnQ9TnVtYmVyLlBPU0lUSVZFX0lORklOSVRZXSBNYXhpbXVtIG51bWJlciBvZiBpbnB1dFxuICogT2JzZXJ2YWJsZXMgYmVpbmcgc3Vic2NyaWJlZCB0byBjb25jdXJyZW50bHkuXG4gKiBAcGFyYW0ge1NjaGVkdWxlcn0gW3NjaGVkdWxlcj1udWxsXSBUaGUgU2NoZWR1bGVyIHRvIHVzZSBmb3IgbWFuYWdpbmdcbiAqIGNvbmN1cnJlbmN5IG9mIGlucHV0IE9ic2VydmFibGVzLlxuICogQHJldHVybiB7T2JzZXJ2YWJsZX0gYW4gT2JzZXJ2YWJsZSB0aGF0IGVtaXRzIGl0ZW1zIHRoYXQgYXJlIHRoZSByZXN1bHQgb2ZcbiAqIGV2ZXJ5IGlucHV0IE9ic2VydmFibGUuXG4gKiBAbWV0aG9kIG1lcmdlXG4gKiBAb3duZXIgT2JzZXJ2YWJsZVxuICovXG5mdW5jdGlvbiBtZXJnZSgpIHtcbiAgICB2YXIgb2JzZXJ2YWJsZXMgPSBbXTtcbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICBvYnNlcnZhYmxlc1tfaSAtIDBdID0gYXJndW1lbnRzW19pXTtcbiAgICB9XG4gICAgb2JzZXJ2YWJsZXMudW5zaGlmdCh0aGlzKTtcbiAgICByZXR1cm4gbWVyZ2VTdGF0aWMuYXBwbHkodGhpcywgb2JzZXJ2YWJsZXMpO1xufVxuZXhwb3J0cy5tZXJnZSA9IG1lcmdlO1xuLyogdHNsaW50OmVuYWJsZTptYXgtbGluZS1sZW5ndGggKi9cbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgT2JzZXJ2YWJsZSB3aGljaCBjb25jdXJyZW50bHkgZW1pdHMgYWxsIHZhbHVlcyBmcm9tIGV2ZXJ5XG4gKiBnaXZlbiBpbnB1dCBPYnNlcnZhYmxlLlxuICpcbiAqIDxzcGFuIGNsYXNzPVwiaW5mb3JtYWxcIj5GbGF0dGVucyBtdWx0aXBsZSBPYnNlcnZhYmxlcyB0b2dldGhlciBieSBibGVuZGluZ1xuICogdGhlaXIgdmFsdWVzIGludG8gb25lIE9ic2VydmFibGUuPC9zcGFuPlxuICpcbiAqIDxpbWcgc3JjPVwiLi9pbWcvbWVyZ2UucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gKlxuICogYG1lcmdlYCBzdWJzY3JpYmVzIHRvIGVhY2ggZ2l2ZW4gaW5wdXQgT2JzZXJ2YWJsZSAoYXMgYXJndW1lbnRzKSwgYW5kIHNpbXBseVxuICogZm9yd2FyZHMgKHdpdGhvdXQgZG9pbmcgYW55IHRyYW5zZm9ybWF0aW9uKSBhbGwgdGhlIHZhbHVlcyBmcm9tIGFsbCB0aGUgaW5wdXRcbiAqIE9ic2VydmFibGVzIHRvIHRoZSBvdXRwdXQgT2JzZXJ2YWJsZS4gVGhlIG91dHB1dCBPYnNlcnZhYmxlIG9ubHkgY29tcGxldGVzXG4gKiBvbmNlIGFsbCBpbnB1dCBPYnNlcnZhYmxlcyBoYXZlIGNvbXBsZXRlZC4gQW55IGVycm9yIGRlbGl2ZXJlZCBieSBhbiBpbnB1dFxuICogT2JzZXJ2YWJsZSB3aWxsIGJlIGltbWVkaWF0ZWx5IGVtaXR0ZWQgb24gdGhlIG91dHB1dCBPYnNlcnZhYmxlLlxuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPk1lcmdlIHRvZ2V0aGVyIHR3byBPYnNlcnZhYmxlczogMXMgaW50ZXJ2YWwgYW5kIGNsaWNrczwvY2FwdGlvbj5cbiAqIHZhciBjbGlja3MgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChkb2N1bWVudCwgJ2NsaWNrJyk7XG4gKiB2YXIgdGltZXIgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMDApO1xuICogdmFyIGNsaWNrc09yVGltZXIgPSBSeC5PYnNlcnZhYmxlLm1lcmdlKGNsaWNrcywgdGltZXIpO1xuICogY2xpY2tzT3JUaW1lci5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+TWVyZ2UgdG9nZXRoZXIgMyBPYnNlcnZhYmxlcywgYnV0IG9ubHkgMiBydW4gY29uY3VycmVudGx5PC9jYXB0aW9uPlxuICogdmFyIHRpbWVyMSA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwMCkudGFrZSgxMCk7XG4gKiB2YXIgdGltZXIyID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgyMDAwKS50YWtlKDYpO1xuICogdmFyIHRpbWVyMyA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoNTAwKS50YWtlKDEwKTtcbiAqIHZhciBjb25jdXJyZW50ID0gMjsgLy8gdGhlIGFyZ3VtZW50XG4gKiB2YXIgbWVyZ2VkID0gUnguT2JzZXJ2YWJsZS5tZXJnZSh0aW1lcjEsIHRpbWVyMiwgdGltZXIzLCBjb25jdXJyZW50KTtcbiAqIG1lcmdlZC5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gKlxuICogQHNlZSB7QGxpbmsgbWVyZ2VBbGx9XG4gKiBAc2VlIHtAbGluayBtZXJnZU1hcH1cbiAqIEBzZWUge0BsaW5rIG1lcmdlTWFwVG99XG4gKiBAc2VlIHtAbGluayBtZXJnZVNjYW59XG4gKlxuICogQHBhcmFtIHtPYnNlcnZhYmxlfSBpbnB1dDEgQW4gaW5wdXQgT2JzZXJ2YWJsZSB0byBtZXJnZSB3aXRoIG90aGVycy5cbiAqIEBwYXJhbSB7T2JzZXJ2YWJsZX0gaW5wdXQyIEFuIGlucHV0IE9ic2VydmFibGUgdG8gbWVyZ2Ugd2l0aCBvdGhlcnMuXG4gKiBAcGFyYW0ge251bWJlcn0gW2NvbmN1cnJlbnQ9TnVtYmVyLlBPU0lUSVZFX0lORklOSVRZXSBNYXhpbXVtIG51bWJlciBvZiBpbnB1dFxuICogT2JzZXJ2YWJsZXMgYmVpbmcgc3Vic2NyaWJlZCB0byBjb25jdXJyZW50bHkuXG4gKiBAcGFyYW0ge1NjaGVkdWxlcn0gW3NjaGVkdWxlcj1udWxsXSBUaGUgU2NoZWR1bGVyIHRvIHVzZSBmb3IgbWFuYWdpbmdcbiAqIGNvbmN1cnJlbmN5IG9mIGlucHV0IE9ic2VydmFibGVzLlxuICogQHJldHVybiB7T2JzZXJ2YWJsZX0gYW4gT2JzZXJ2YWJsZSB0aGF0IGVtaXRzIGl0ZW1zIHRoYXQgYXJlIHRoZSByZXN1bHQgb2ZcbiAqIGV2ZXJ5IGlucHV0IE9ic2VydmFibGUuXG4gKiBAc3RhdGljIHRydWVcbiAqIEBuYW1lIG1lcmdlXG4gKiBAb3duZXIgT2JzZXJ2YWJsZVxuICovXG5mdW5jdGlvbiBtZXJnZVN0YXRpYygpIHtcbiAgICB2YXIgb2JzZXJ2YWJsZXMgPSBbXTtcbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICBvYnNlcnZhYmxlc1tfaSAtIDBdID0gYXJndW1lbnRzW19pXTtcbiAgICB9XG4gICAgdmFyIGNvbmN1cnJlbnQgPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG4gICAgdmFyIHNjaGVkdWxlciA9IG51bGw7XG4gICAgdmFyIGxhc3QgPSBvYnNlcnZhYmxlc1tvYnNlcnZhYmxlcy5sZW5ndGggLSAxXTtcbiAgICBpZiAoaXNTY2hlZHVsZXJfMS5pc1NjaGVkdWxlcihsYXN0KSkge1xuICAgICAgICBzY2hlZHVsZXIgPSBvYnNlcnZhYmxlcy5wb3AoKTtcbiAgICAgICAgaWYgKG9ic2VydmFibGVzLmxlbmd0aCA+IDEgJiYgdHlwZW9mIG9ic2VydmFibGVzW29ic2VydmFibGVzLmxlbmd0aCAtIDFdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgY29uY3VycmVudCA9IG9ic2VydmFibGVzLnBvcCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBsYXN0ID09PSAnbnVtYmVyJykge1xuICAgICAgICBjb25jdXJyZW50ID0gb2JzZXJ2YWJsZXMucG9wKCk7XG4gICAgfVxuICAgIGlmIChvYnNlcnZhYmxlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIG9ic2VydmFibGVzWzBdO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEFycmF5T2JzZXJ2YWJsZV8xLkFycmF5T2JzZXJ2YWJsZShvYnNlcnZhYmxlcywgc2NoZWR1bGVyKS5saWZ0KG5ldyBtZXJnZUFsbF8xLk1lcmdlQWxsT3BlcmF0b3IoY29uY3VycmVudCkpO1xufVxuZXhwb3J0cy5tZXJnZVN0YXRpYyA9IG1lcmdlU3RhdGljO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWVyZ2UuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBPdXRlclN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4uL091dGVyU3Vic2NyaWJlcicpO1xudmFyIHN1YnNjcmliZVRvUmVzdWx0XzEgPSByZXF1aXJlKCcuLi91dGlsL3N1YnNjcmliZVRvUmVzdWx0Jyk7XG4vKipcbiAqIENvbnZlcnRzIGEgaGlnaGVyLW9yZGVyIE9ic2VydmFibGUgaW50byBhIGZpcnN0LW9yZGVyIE9ic2VydmFibGUgd2hpY2hcbiAqIGNvbmN1cnJlbnRseSBkZWxpdmVycyBhbGwgdmFsdWVzIHRoYXQgYXJlIGVtaXR0ZWQgb24gdGhlIGlubmVyIE9ic2VydmFibGVzLlxuICpcbiAqIDxzcGFuIGNsYXNzPVwiaW5mb3JtYWxcIj5GbGF0dGVucyBhbiBPYnNlcnZhYmxlLW9mLU9ic2VydmFibGVzLjwvc3Bhbj5cbiAqXG4gKiA8aW1nIHNyYz1cIi4vaW1nL21lcmdlQWxsLnBuZ1wiIHdpZHRoPVwiMTAwJVwiPlxuICpcbiAqIGBtZXJnZUFsbGAgc3Vic2NyaWJlcyB0byBhbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgT2JzZXJ2YWJsZXMsIGFsc28ga25vd24gYXNcbiAqIGEgaGlnaGVyLW9yZGVyIE9ic2VydmFibGUuIEVhY2ggdGltZSBpdCBvYnNlcnZlcyBvbmUgb2YgdGhlc2UgZW1pdHRlZCBpbm5lclxuICogT2JzZXJ2YWJsZXMsIGl0IHN1YnNjcmliZXMgdG8gdGhhdCBhbmQgZGVsaXZlcnMgYWxsIHRoZSB2YWx1ZXMgZnJvbSB0aGVcbiAqIGlubmVyIE9ic2VydmFibGUgb24gdGhlIG91dHB1dCBPYnNlcnZhYmxlLiBUaGUgb3V0cHV0IE9ic2VydmFibGUgb25seVxuICogY29tcGxldGVzIG9uY2UgYWxsIGlubmVyIE9ic2VydmFibGVzIGhhdmUgY29tcGxldGVkLiBBbnkgZXJyb3IgZGVsaXZlcmVkIGJ5XG4gKiBhIGlubmVyIE9ic2VydmFibGUgd2lsbCBiZSBpbW1lZGlhdGVseSBlbWl0dGVkIG9uIHRoZSBvdXRwdXQgT2JzZXJ2YWJsZS5cbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5TcGF3biBhIG5ldyBpbnRlcnZhbCBPYnNlcnZhYmxlIGZvciBlYWNoIGNsaWNrIGV2ZW50LCBhbmQgYmxlbmQgdGhlaXIgb3V0cHV0cyBhcyBvbmUgT2JzZXJ2YWJsZTwvY2FwdGlvbj5cbiAqIHZhciBjbGlja3MgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChkb2N1bWVudCwgJ2NsaWNrJyk7XG4gKiB2YXIgaGlnaGVyT3JkZXIgPSBjbGlja3MubWFwKChldikgPT4gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxMDAwKSk7XG4gKiB2YXIgZmlyc3RPcmRlciA9IGhpZ2hlck9yZGVyLm1lcmdlQWxsKCk7XG4gKiBmaXJzdE9yZGVyLnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5Db3VudCBmcm9tIDAgdG8gOSBldmVyeSBzZWNvbmQgZm9yIGVhY2ggY2xpY2ssIGJ1dCBvbmx5IGFsbG93IDIgY29uY3VycmVudCB0aW1lcnM8L2NhcHRpb24+XG4gKiB2YXIgY2xpY2tzID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoZG9jdW1lbnQsICdjbGljaycpO1xuICogdmFyIGhpZ2hlck9yZGVyID0gY2xpY2tzLm1hcCgoZXYpID0+IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwMCkudGFrZSgxMCkpO1xuICogdmFyIGZpcnN0T3JkZXIgPSBoaWdoZXJPcmRlci5tZXJnZUFsbCgyKTtcbiAqIGZpcnN0T3JkZXIuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICpcbiAqIEBzZWUge0BsaW5rIGNvbWJpbmVBbGx9XG4gKiBAc2VlIHtAbGluayBjb25jYXRBbGx9XG4gKiBAc2VlIHtAbGluayBleGhhdXN0fVxuICogQHNlZSB7QGxpbmsgbWVyZ2V9XG4gKiBAc2VlIHtAbGluayBtZXJnZU1hcH1cbiAqIEBzZWUge0BsaW5rIG1lcmdlTWFwVG99XG4gKiBAc2VlIHtAbGluayBtZXJnZVNjYW59XG4gKiBAc2VlIHtAbGluayBzd2l0Y2h9XG4gKiBAc2VlIHtAbGluayB6aXBBbGx9XG4gKlxuICogQHBhcmFtIHtudW1iZXJ9IFtjb25jdXJyZW50PU51bWJlci5QT1NJVElWRV9JTkZJTklUWV0gTWF4aW11bSBudW1iZXIgb2YgaW5uZXJcbiAqIE9ic2VydmFibGVzIGJlaW5nIHN1YnNjcmliZWQgdG8gY29uY3VycmVudGx5LlxuICogQHJldHVybiB7T2JzZXJ2YWJsZX0gQW4gT2JzZXJ2YWJsZSB0aGF0IGVtaXRzIHZhbHVlcyBjb21pbmcgZnJvbSBhbGwgdGhlXG4gKiBpbm5lciBPYnNlcnZhYmxlcyBlbWl0dGVkIGJ5IHRoZSBzb3VyY2UgT2JzZXJ2YWJsZS5cbiAqIEBtZXRob2QgbWVyZ2VBbGxcbiAqIEBvd25lciBPYnNlcnZhYmxlXG4gKi9cbmZ1bmN0aW9uIG1lcmdlQWxsKGNvbmN1cnJlbnQpIHtcbiAgICBpZiAoY29uY3VycmVudCA9PT0gdm9pZCAwKSB7IGNvbmN1cnJlbnQgPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7IH1cbiAgICByZXR1cm4gdGhpcy5saWZ0KG5ldyBNZXJnZUFsbE9wZXJhdG9yKGNvbmN1cnJlbnQpKTtcbn1cbmV4cG9ydHMubWVyZ2VBbGwgPSBtZXJnZUFsbDtcbnZhciBNZXJnZUFsbE9wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBNZXJnZUFsbE9wZXJhdG9yKGNvbmN1cnJlbnQpIHtcbiAgICAgICAgdGhpcy5jb25jdXJyZW50ID0gY29uY3VycmVudDtcbiAgICB9XG4gICAgTWVyZ2VBbGxPcGVyYXRvci5wcm90b3R5cGUuY2FsbCA9IGZ1bmN0aW9uIChvYnNlcnZlciwgc291cmNlKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2UuX3N1YnNjcmliZShuZXcgTWVyZ2VBbGxTdWJzY3JpYmVyKG9ic2VydmVyLCB0aGlzLmNvbmN1cnJlbnQpKTtcbiAgICB9O1xuICAgIHJldHVybiBNZXJnZUFsbE9wZXJhdG9yO1xufSgpKTtcbmV4cG9ydHMuTWVyZ2VBbGxPcGVyYXRvciA9IE1lcmdlQWxsT3BlcmF0b3I7XG4vKipcbiAqIFdlIG5lZWQgdGhpcyBKU0RvYyBjb21tZW50IGZvciBhZmZlY3RpbmcgRVNEb2MuXG4gKiBAaWdub3JlXG4gKiBAZXh0ZW5kcyB7SWdub3JlZH1cbiAqL1xudmFyIE1lcmdlQWxsU3Vic2NyaWJlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1lcmdlQWxsU3Vic2NyaWJlciwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNZXJnZUFsbFN1YnNjcmliZXIoZGVzdGluYXRpb24sIGNvbmN1cnJlbnQpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVzdGluYXRpb24pO1xuICAgICAgICB0aGlzLmNvbmN1cnJlbnQgPSBjb25jdXJyZW50O1xuICAgICAgICB0aGlzLmhhc0NvbXBsZXRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IFtdO1xuICAgICAgICB0aGlzLmFjdGl2ZSA9IDA7XG4gICAgfVxuICAgIE1lcmdlQWxsU3Vic2NyaWJlci5wcm90b3R5cGUuX25leHQgPSBmdW5jdGlvbiAob2JzZXJ2YWJsZSkge1xuICAgICAgICBpZiAodGhpcy5hY3RpdmUgPCB0aGlzLmNvbmN1cnJlbnQpIHtcbiAgICAgICAgICAgIHRoaXMuYWN0aXZlKys7XG4gICAgICAgICAgICB0aGlzLmFkZChzdWJzY3JpYmVUb1Jlc3VsdF8xLnN1YnNjcmliZVRvUmVzdWx0KHRoaXMsIG9ic2VydmFibGUpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyLnB1c2gob2JzZXJ2YWJsZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1lcmdlQWxsU3Vic2NyaWJlci5wcm90b3R5cGUuX2NvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmhhc0NvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgIGlmICh0aGlzLmFjdGl2ZSA9PT0gMCAmJiB0aGlzLmJ1ZmZlci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24uY29tcGxldGUoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTWVyZ2VBbGxTdWJzY3JpYmVyLnByb3RvdHlwZS5ub3RpZnlDb21wbGV0ZSA9IGZ1bmN0aW9uIChpbm5lclN1Yikge1xuICAgICAgICB2YXIgYnVmZmVyID0gdGhpcy5idWZmZXI7XG4gICAgICAgIHRoaXMucmVtb3ZlKGlubmVyU3ViKTtcbiAgICAgICAgdGhpcy5hY3RpdmUtLTtcbiAgICAgICAgaWYgKGJ1ZmZlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLl9uZXh0KGJ1ZmZlci5zaGlmdCgpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLmFjdGl2ZSA9PT0gMCAmJiB0aGlzLmhhc0NvbXBsZXRlZCkge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gTWVyZ2VBbGxTdWJzY3JpYmVyO1xufShPdXRlclN1YnNjcmliZXJfMS5PdXRlclN1YnNjcmliZXIpKTtcbmV4cG9ydHMuTWVyZ2VBbGxTdWJzY3JpYmVyID0gTWVyZ2VBbGxTdWJzY3JpYmVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWVyZ2VBbGwuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgQ29ubmVjdGFibGVPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi9vYnNlcnZhYmxlL0Nvbm5lY3RhYmxlT2JzZXJ2YWJsZScpO1xuLyoqXG4gKiBSZXR1cm5zIGFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyB0aGUgcmVzdWx0cyBvZiBpbnZva2luZyBhIHNwZWNpZmllZCBzZWxlY3RvciBvbiBpdGVtc1xuICogZW1pdHRlZCBieSBhIENvbm5lY3RhYmxlT2JzZXJ2YWJsZSB0aGF0IHNoYXJlcyBhIHNpbmdsZSBzdWJzY3JpcHRpb24gdG8gdGhlIHVuZGVybHlpbmcgc3RyZWFtLlxuICpcbiAqIDxpbWcgc3JjPVwiLi9pbWcvbXVsdGljYXN0LnBuZ1wiIHdpZHRoPVwiMTAwJVwiPlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHNlbGVjdG9yIC0gYSBmdW5jdGlvbiB0aGF0IGNhbiB1c2UgdGhlIG11bHRpY2FzdGVkIHNvdXJjZSBzdHJlYW1cbiAqIGFzIG1hbnkgdGltZXMgYXMgbmVlZGVkLCB3aXRob3V0IGNhdXNpbmcgbXVsdGlwbGUgc3Vic2NyaXB0aW9ucyB0byB0aGUgc291cmNlIHN0cmVhbS5cbiAqIFN1YnNjcmliZXJzIHRvIHRoZSBnaXZlbiBzb3VyY2Ugd2lsbCByZWNlaXZlIGFsbCBub3RpZmljYXRpb25zIG9mIHRoZSBzb3VyY2UgZnJvbSB0aGVcbiAqIHRpbWUgb2YgdGhlIHN1YnNjcmlwdGlvbiBmb3J3YXJkLlxuICogQHJldHVybiB7T2JzZXJ2YWJsZX0gYW4gT2JzZXJ2YWJsZSB0aGF0IGVtaXRzIHRoZSByZXN1bHRzIG9mIGludm9raW5nIHRoZSBzZWxlY3RvclxuICogb24gdGhlIGl0ZW1zIGVtaXR0ZWQgYnkgYSBgQ29ubmVjdGFibGVPYnNlcnZhYmxlYCB0aGF0IHNoYXJlcyBhIHNpbmdsZSBzdWJzY3JpcHRpb24gdG9cbiAqIHRoZSB1bmRlcmx5aW5nIHN0cmVhbS5cbiAqIEBtZXRob2QgbXVsdGljYXN0XG4gKiBAb3duZXIgT2JzZXJ2YWJsZVxuICovXG5mdW5jdGlvbiBtdWx0aWNhc3Qoc3ViamVjdE9yU3ViamVjdEZhY3RvcnkpIHtcbiAgICB2YXIgc3ViamVjdEZhY3Rvcnk7XG4gICAgaWYgKHR5cGVvZiBzdWJqZWN0T3JTdWJqZWN0RmFjdG9yeSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBzdWJqZWN0RmFjdG9yeSA9IHN1YmplY3RPclN1YmplY3RGYWN0b3J5O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc3ViamVjdEZhY3RvcnkgPSBmdW5jdGlvbiBzdWJqZWN0RmFjdG9yeSgpIHtcbiAgICAgICAgICAgIHJldHVybiBzdWJqZWN0T3JTdWJqZWN0RmFjdG9yeTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBDb25uZWN0YWJsZU9ic2VydmFibGVfMS5Db25uZWN0YWJsZU9ic2VydmFibGUodGhpcywgc3ViamVjdEZhY3RvcnkpO1xufVxuZXhwb3J0cy5tdWx0aWNhc3QgPSBtdWx0aWNhc3Q7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1tdWx0aWNhc3QuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuLi9TdWJzY3JpYmVyJyk7XG4vKipcbiAqIEFwcGxpZXMgYW4gYWNjdW11bGF0aW9uIGZ1bmN0aW9uIG92ZXIgdGhlIHNvdXJjZSBPYnNlcnZhYmxlLCBhbmQgcmV0dXJucyBlYWNoXG4gKiBpbnRlcm1lZGlhdGUgcmVzdWx0LCB3aXRoIGFuIG9wdGlvbmFsIHNlZWQgdmFsdWUuXG4gKlxuICogPHNwYW4gY2xhc3M9XCJpbmZvcm1hbFwiPkl0J3MgbGlrZSB7QGxpbmsgcmVkdWNlfSwgYnV0IGVtaXRzIHRoZSBjdXJyZW50XG4gKiBhY2N1bXVsYXRpb24gd2hlbmV2ZXIgdGhlIHNvdXJjZSBlbWl0cyBhIHZhbHVlLjwvc3Bhbj5cbiAqXG4gKiA8aW1nIHNyYz1cIi4vaW1nL3NjYW4ucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gKlxuICogQ29tYmluZXMgdG9nZXRoZXIgYWxsIHZhbHVlcyBlbWl0dGVkIG9uIHRoZSBzb3VyY2UsIHVzaW5nIGFuIGFjY3VtdWxhdG9yXG4gKiBmdW5jdGlvbiB0aGF0IGtub3dzIGhvdyB0byBqb2luIGEgbmV3IHNvdXJjZSB2YWx1ZSBpbnRvIHRoZSBhY2N1bXVsYXRpb24gZnJvbVxuICogdGhlIHBhc3QuIElzIHNpbWlsYXIgdG8ge0BsaW5rIHJlZHVjZX0sIGJ1dCBlbWl0cyB0aGUgaW50ZXJtZWRpYXRlXG4gKiBhY2N1bXVsYXRpb25zLlxuICpcbiAqIFJldHVybnMgYW4gT2JzZXJ2YWJsZSB0aGF0IGFwcGxpZXMgYSBzcGVjaWZpZWQgYGFjY3VtdWxhdG9yYCBmdW5jdGlvbiB0byBlYWNoXG4gKiBpdGVtIGVtaXR0ZWQgYnkgdGhlIHNvdXJjZSBPYnNlcnZhYmxlLiBJZiBhIGBzZWVkYCB2YWx1ZSBpcyBzcGVjaWZpZWQsIHRoZW5cbiAqIHRoYXQgdmFsdWUgd2lsbCBiZSB1c2VkIGFzIHRoZSBpbml0aWFsIHZhbHVlIGZvciB0aGUgYWNjdW11bGF0b3IuIElmIG5vIHNlZWRcbiAqIHZhbHVlIGlzIHNwZWNpZmllZCwgdGhlIGZpcnN0IGl0ZW0gb2YgdGhlIHNvdXJjZSBpcyB1c2VkIGFzIHRoZSBzZWVkLlxuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPkNvdW50IHRoZSBudW1iZXIgb2YgY2xpY2sgZXZlbnRzPC9jYXB0aW9uPlxuICogdmFyIGNsaWNrcyA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGRvY3VtZW50LCAnY2xpY2snKTtcbiAqIHZhciBvbmVzID0gY2xpY2tzLm1hcFRvKDEpO1xuICogdmFyIHNlZWQgPSAwO1xuICogdmFyIGNvdW50ID0gb25lcy5zY2FuKChhY2MsIG9uZSkgPT4gYWNjICsgb25lLCBzZWVkKTtcbiAqIGNvdW50LnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAc2VlIHtAbGluayBleHBhbmR9XG4gKiBAc2VlIHtAbGluayBtZXJnZVNjYW59XG4gKiBAc2VlIHtAbGluayByZWR1Y2V9XG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbihhY2M6IFIsIHZhbHVlOiBUKTogUn0gYWNjdW11bGF0b3IgVGhlIGFjY3VtdWxhdG9yIGZ1bmN0aW9uXG4gKiBjYWxsZWQgb24gZWFjaCBzb3VyY2UgdmFsdWUuXG4gKiBAcGFyYW0ge1R8Un0gW3NlZWRdIFRoZSBpbml0aWFsIGFjY3VtdWxhdGlvbiB2YWx1ZS5cbiAqIEByZXR1cm4ge09ic2VydmFibGU8Uj59IEFuIG9ic2VydmFibGUgb2YgdGhlIGFjY3VtdWxhdGVkIHZhbHVlcy5cbiAqIEBtZXRob2Qgc2NhblxuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gc2NhbihhY2N1bXVsYXRvciwgc2VlZCkge1xuICAgIHJldHVybiB0aGlzLmxpZnQobmV3IFNjYW5PcGVyYXRvcihhY2N1bXVsYXRvciwgc2VlZCkpO1xufVxuZXhwb3J0cy5zY2FuID0gc2NhbjtcbnZhciBTY2FuT3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFNjYW5PcGVyYXRvcihhY2N1bXVsYXRvciwgc2VlZCkge1xuICAgICAgICB0aGlzLmFjY3VtdWxhdG9yID0gYWNjdW11bGF0b3I7XG4gICAgICAgIHRoaXMuc2VlZCA9IHNlZWQ7XG4gICAgfVxuICAgIFNjYW5PcGVyYXRvci5wcm90b3R5cGUuY2FsbCA9IGZ1bmN0aW9uIChzdWJzY3JpYmVyLCBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5fc3Vic2NyaWJlKG5ldyBTY2FuU3Vic2NyaWJlcihzdWJzY3JpYmVyLCB0aGlzLmFjY3VtdWxhdG9yLCB0aGlzLnNlZWQpKTtcbiAgICB9O1xuICAgIHJldHVybiBTY2FuT3BlcmF0b3I7XG59KCkpO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBTY2FuU3Vic2NyaWJlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFNjYW5TdWJzY3JpYmVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFNjYW5TdWJzY3JpYmVyKGRlc3RpbmF0aW9uLCBhY2N1bXVsYXRvciwgc2VlZCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZXN0aW5hdGlvbik7XG4gICAgICAgIHRoaXMuYWNjdW11bGF0b3IgPSBhY2N1bXVsYXRvcjtcbiAgICAgICAgdGhpcy5hY2N1bXVsYXRvclNldCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnNlZWQgPSBzZWVkO1xuICAgICAgICB0aGlzLmFjY3VtdWxhdG9yID0gYWNjdW11bGF0b3I7XG4gICAgICAgIHRoaXMuYWNjdW11bGF0b3JTZXQgPSB0eXBlb2Ygc2VlZCAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTY2FuU3Vic2NyaWJlci5wcm90b3R5cGUsIFwic2VlZFwiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NlZWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLmFjY3VtdWxhdG9yU2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX3NlZWQgPSB2YWx1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgU2NhblN1YnNjcmliZXIucHJvdG90eXBlLl9uZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmICghdGhpcy5hY2N1bXVsYXRvclNldCkge1xuICAgICAgICAgICAgdGhpcy5zZWVkID0gdmFsdWU7XG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLm5leHQodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3RyeU5leHQodmFsdWUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTY2FuU3Vic2NyaWJlci5wcm90b3R5cGUuX3RyeU5leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMuYWNjdW11bGF0b3IodGhpcy5zZWVkLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5lcnJvcihlcnIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2VlZCA9IHJlc3VsdDtcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5uZXh0KHJlc3VsdCk7XG4gICAgfTtcbiAgICByZXR1cm4gU2NhblN1YnNjcmliZXI7XG59KFN1YnNjcmliZXJfMS5TdWJzY3JpYmVyKSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1zY2FuLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIG11bHRpY2FzdF8xID0gcmVxdWlyZSgnLi9tdWx0aWNhc3QnKTtcbnZhciBTdWJqZWN0XzEgPSByZXF1aXJlKCcuLi9TdWJqZWN0Jyk7XG5mdW5jdGlvbiBzaGFyZVN1YmplY3RGYWN0b3J5KCkge1xuICAgIHJldHVybiBuZXcgU3ViamVjdF8xLlN1YmplY3QoKTtcbn1cbi8qKlxuICogUmV0dXJucyBhIG5ldyBPYnNlcnZhYmxlIHRoYXQgbXVsdGljYXN0cyAoc2hhcmVzKSB0aGUgb3JpZ2luYWwgT2JzZXJ2YWJsZS4gQXMgbG9uZyBhcyB0aGVyZSBpcyBhdCBsZWFzdCBvbmVcbiAqIFN1YnNjcmliZXIgdGhpcyBPYnNlcnZhYmxlIHdpbGwgYmUgc3Vic2NyaWJlZCBhbmQgZW1pdHRpbmcgZGF0YS4gV2hlbiBhbGwgc3Vic2NyaWJlcnMgaGF2ZSB1bnN1YnNjcmliZWQgaXQgd2lsbFxuICogdW5zdWJzY3JpYmUgZnJvbSB0aGUgc291cmNlIE9ic2VydmFibGUuIEJlY2F1c2UgdGhlIE9ic2VydmFibGUgaXMgbXVsdGljYXN0aW5nIGl0IG1ha2VzIHRoZSBzdHJlYW0gYGhvdGAuXG4gKiBUaGlzIGlzIGFuIGFsaWFzIGZvciAucHVibGlzaCgpLnJlZkNvdW50KCkuXG4gKlxuICogPGltZyBzcmM9XCIuL2ltZy9zaGFyZS5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAqXG4gKiBAcmV0dXJuIHtPYnNlcnZhYmxlPFQ+fSBhbiBPYnNlcnZhYmxlIHRoYXQgdXBvbiBjb25uZWN0aW9uIGNhdXNlcyB0aGUgc291cmNlIE9ic2VydmFibGUgdG8gZW1pdCBpdGVtcyB0byBpdHMgT2JzZXJ2ZXJzXG4gKiBAbWV0aG9kIHNoYXJlXG4gKiBAb3duZXIgT2JzZXJ2YWJsZVxuICovXG5mdW5jdGlvbiBzaGFyZSgpIHtcbiAgICByZXR1cm4gbXVsdGljYXN0XzEubXVsdGljYXN0LmNhbGwodGhpcywgc2hhcmVTdWJqZWN0RmFjdG9yeSkucmVmQ291bnQoKTtcbn1cbmV4cG9ydHMuc2hhcmUgPSBzaGFyZTtcbjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXNoYXJlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIEFycmF5T2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vb2JzZXJ2YWJsZS9BcnJheU9ic2VydmFibGUnKTtcbnZhciBTY2FsYXJPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi9vYnNlcnZhYmxlL1NjYWxhck9ic2VydmFibGUnKTtcbnZhciBFbXB0eU9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uL29ic2VydmFibGUvRW1wdHlPYnNlcnZhYmxlJyk7XG52YXIgY29uY2F0XzEgPSByZXF1aXJlKCcuL2NvbmNhdCcpO1xudmFyIGlzU2NoZWR1bGVyXzEgPSByZXF1aXJlKCcuLi91dGlsL2lzU2NoZWR1bGVyJyk7XG4vKipcbiAqIFJldHVybnMgYW4gT2JzZXJ2YWJsZSB0aGF0IGVtaXRzIHRoZSBpdGVtcyBpbiBhIHNwZWNpZmllZCBJdGVyYWJsZSBiZWZvcmUgaXQgYmVnaW5zIHRvIGVtaXQgaXRlbXMgZW1pdHRlZCBieSB0aGVcbiAqIHNvdXJjZSBPYnNlcnZhYmxlLlxuICpcbiAqIDxpbWcgc3JjPVwiLi9pbWcvc3RhcnRXaXRoLnBuZ1wiIHdpZHRoPVwiMTAwJVwiPlxuICpcbiAqIEBwYXJhbSB7VmFsdWVzfSBhbiBJdGVyYWJsZSB0aGF0IGNvbnRhaW5zIHRoZSBpdGVtcyB5b3Ugd2FudCB0aGUgbW9kaWZpZWQgT2JzZXJ2YWJsZSB0byBlbWl0IGZpcnN0LlxuICogQHJldHVybiB7T2JzZXJ2YWJsZX0gYW4gT2JzZXJ2YWJsZSB0aGF0IGVtaXRzIHRoZSBpdGVtcyBpbiB0aGUgc3BlY2lmaWVkIEl0ZXJhYmxlIGFuZCB0aGVuIGVtaXRzIHRoZSBpdGVtc1xuICogZW1pdHRlZCBieSB0aGUgc291cmNlIE9ic2VydmFibGUuXG4gKiBAbWV0aG9kIHN0YXJ0V2l0aFxuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gc3RhcnRXaXRoKCkge1xuICAgIHZhciBhcnJheSA9IFtdO1xuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgIGFycmF5W19pIC0gMF0gPSBhcmd1bWVudHNbX2ldO1xuICAgIH1cbiAgICB2YXIgc2NoZWR1bGVyID0gYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV07XG4gICAgaWYgKGlzU2NoZWR1bGVyXzEuaXNTY2hlZHVsZXIoc2NoZWR1bGVyKSkge1xuICAgICAgICBhcnJheS5wb3AoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHNjaGVkdWxlciA9IG51bGw7XG4gICAgfVxuICAgIHZhciBsZW4gPSBhcnJheS5sZW5ndGg7XG4gICAgaWYgKGxlbiA9PT0gMSkge1xuICAgICAgICByZXR1cm4gY29uY2F0XzEuY29uY2F0U3RhdGljKG5ldyBTY2FsYXJPYnNlcnZhYmxlXzEuU2NhbGFyT2JzZXJ2YWJsZShhcnJheVswXSwgc2NoZWR1bGVyKSwgdGhpcyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGxlbiA+IDEpIHtcbiAgICAgICAgcmV0dXJuIGNvbmNhdF8xLmNvbmNhdFN0YXRpYyhuZXcgQXJyYXlPYnNlcnZhYmxlXzEuQXJyYXlPYnNlcnZhYmxlKGFycmF5LCBzY2hlZHVsZXIpLCB0aGlzKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBjb25jYXRfMS5jb25jYXRTdGF0aWMobmV3IEVtcHR5T2JzZXJ2YWJsZV8xLkVtcHR5T2JzZXJ2YWJsZShzY2hlZHVsZXIpLCB0aGlzKTtcbiAgICB9XG59XG5leHBvcnRzLnN0YXJ0V2l0aCA9IHN0YXJ0V2l0aDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXN0YXJ0V2l0aC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIE91dGVyU3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi4vT3V0ZXJTdWJzY3JpYmVyJyk7XG52YXIgc3Vic2NyaWJlVG9SZXN1bHRfMSA9IHJlcXVpcmUoJy4uL3V0aWwvc3Vic2NyaWJlVG9SZXN1bHQnKTtcbi8qKlxuICogUHJvamVjdHMgZWFjaCBzb3VyY2UgdmFsdWUgdG8gYW4gT2JzZXJ2YWJsZSB3aGljaCBpcyBtZXJnZWQgaW4gdGhlIG91dHB1dFxuICogT2JzZXJ2YWJsZSwgZW1pdHRpbmcgdmFsdWVzIG9ubHkgZnJvbSB0aGUgbW9zdCByZWNlbnRseSBwcm9qZWN0ZWQgT2JzZXJ2YWJsZS5cbiAqXG4gKiA8c3BhbiBjbGFzcz1cImluZm9ybWFsXCI+TWFwcyBlYWNoIHZhbHVlIHRvIGFuIE9ic2VydmFibGUsIHRoZW4gZmxhdHRlbnMgYWxsIG9mXG4gKiB0aGVzZSBpbm5lciBPYnNlcnZhYmxlcyB1c2luZyB7QGxpbmsgc3dpdGNofS48L3NwYW4+XG4gKlxuICogPGltZyBzcmM9XCIuL2ltZy9zd2l0Y2hNYXAucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gKlxuICogUmV0dXJucyBhbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgaXRlbXMgYmFzZWQgb24gYXBwbHlpbmcgYSBmdW5jdGlvbiB0aGF0IHlvdVxuICogc3VwcGx5IHRvIGVhY2ggaXRlbSBlbWl0dGVkIGJ5IHRoZSBzb3VyY2UgT2JzZXJ2YWJsZSwgd2hlcmUgdGhhdCBmdW5jdGlvblxuICogcmV0dXJucyBhbiAoc28tY2FsbGVkIFwiaW5uZXJcIikgT2JzZXJ2YWJsZS4gRWFjaCB0aW1lIGl0IG9ic2VydmVzIG9uZSBvZiB0aGVzZVxuICogaW5uZXIgT2JzZXJ2YWJsZXMsIHRoZSBvdXRwdXQgT2JzZXJ2YWJsZSBiZWdpbnMgZW1pdHRpbmcgdGhlIGl0ZW1zIGVtaXR0ZWQgYnlcbiAqIHRoYXQgaW5uZXIgT2JzZXJ2YWJsZS4gV2hlbiBhIG5ldyBpbm5lciBPYnNlcnZhYmxlIGlzIGVtaXR0ZWQsIGBzd2l0Y2hNYXBgXG4gKiBzdG9wcyBlbWl0dGluZyBpdGVtcyBmcm9tIHRoZSBlYXJsaWVyLWVtaXR0ZWQgaW5uZXIgT2JzZXJ2YWJsZSBhbmQgYmVnaW5zXG4gKiBlbWl0dGluZyBpdGVtcyBmcm9tIHRoZSBuZXcgb25lLiBJdCBjb250aW51ZXMgdG8gYmVoYXZlIGxpa2UgdGhpcyBmb3JcbiAqIHN1YnNlcXVlbnQgaW5uZXIgT2JzZXJ2YWJsZXMuXG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+UmVydW4gYW4gaW50ZXJ2YWwgT2JzZXJ2YWJsZSBvbiBldmVyeSBjbGljayBldmVudDwvY2FwdGlvbj5cbiAqIHZhciBjbGlja3MgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChkb2N1bWVudCwgJ2NsaWNrJyk7XG4gKiB2YXIgcmVzdWx0ID0gY2xpY2tzLnN3aXRjaE1hcCgoZXYpID0+IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwMCkpO1xuICogcmVzdWx0LnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAc2VlIHtAbGluayBjb25jYXRNYXB9XG4gKiBAc2VlIHtAbGluayBleGhhdXN0TWFwfVxuICogQHNlZSB7QGxpbmsgbWVyZ2VNYXB9XG4gKiBAc2VlIHtAbGluayBzd2l0Y2h9XG4gKiBAc2VlIHtAbGluayBzd2l0Y2hNYXBUb31cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHZhbHVlOiBULCA/aW5kZXg6IG51bWJlcik6IE9ic2VydmFibGV9IHByb2plY3QgQSBmdW5jdGlvblxuICogdGhhdCwgd2hlbiBhcHBsaWVkIHRvIGFuIGl0ZW0gZW1pdHRlZCBieSB0aGUgc291cmNlIE9ic2VydmFibGUsIHJldHVybnMgYW5cbiAqIE9ic2VydmFibGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKG91dGVyVmFsdWU6IFQsIGlubmVyVmFsdWU6IEksIG91dGVySW5kZXg6IG51bWJlciwgaW5uZXJJbmRleDogbnVtYmVyKTogYW55fSBbcmVzdWx0U2VsZWN0b3JdXG4gKiBBIGZ1bmN0aW9uIHRvIHByb2R1Y2UgdGhlIHZhbHVlIG9uIHRoZSBvdXRwdXQgT2JzZXJ2YWJsZSBiYXNlZCBvbiB0aGUgdmFsdWVzXG4gKiBhbmQgdGhlIGluZGljZXMgb2YgdGhlIHNvdXJjZSAob3V0ZXIpIGVtaXNzaW9uIGFuZCB0aGUgaW5uZXIgT2JzZXJ2YWJsZVxuICogZW1pc3Npb24uIFRoZSBhcmd1bWVudHMgcGFzc2VkIHRvIHRoaXMgZnVuY3Rpb24gYXJlOlxuICogLSBgb3V0ZXJWYWx1ZWA6IHRoZSB2YWx1ZSB0aGF0IGNhbWUgZnJvbSB0aGUgc291cmNlXG4gKiAtIGBpbm5lclZhbHVlYDogdGhlIHZhbHVlIHRoYXQgY2FtZSBmcm9tIHRoZSBwcm9qZWN0ZWQgT2JzZXJ2YWJsZVxuICogLSBgb3V0ZXJJbmRleGA6IHRoZSBcImluZGV4XCIgb2YgdGhlIHZhbHVlIHRoYXQgY2FtZSBmcm9tIHRoZSBzb3VyY2VcbiAqIC0gYGlubmVySW5kZXhgOiB0aGUgXCJpbmRleFwiIG9mIHRoZSB2YWx1ZSBmcm9tIHRoZSBwcm9qZWN0ZWQgT2JzZXJ2YWJsZVxuICogQHJldHVybiB7T2JzZXJ2YWJsZX0gQW4gT2JzZXJ2YWJsZSB0aGF0IGVtaXRzIHRoZSByZXN1bHQgb2YgYXBwbHlpbmcgdGhlXG4gKiBwcm9qZWN0aW9uIGZ1bmN0aW9uIChhbmQgdGhlIG9wdGlvbmFsIGByZXN1bHRTZWxlY3RvcmApIHRvIGVhY2ggaXRlbSBlbWl0dGVkXG4gKiBieSB0aGUgc291cmNlIE9ic2VydmFibGUgYW5kIHRha2luZyBvbmx5IHRoZSB2YWx1ZXMgZnJvbSB0aGUgbW9zdCByZWNlbnRseVxuICogcHJvamVjdGVkIGlubmVyIE9ic2VydmFibGUuXG4gKiBAbWV0aG9kIHN3aXRjaE1hcFxuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gc3dpdGNoTWFwKHByb2plY3QsIHJlc3VsdFNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIHRoaXMubGlmdChuZXcgU3dpdGNoTWFwT3BlcmF0b3IocHJvamVjdCwgcmVzdWx0U2VsZWN0b3IpKTtcbn1cbmV4cG9ydHMuc3dpdGNoTWFwID0gc3dpdGNoTWFwO1xudmFyIFN3aXRjaE1hcE9wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTd2l0Y2hNYXBPcGVyYXRvcihwcm9qZWN0LCByZXN1bHRTZWxlY3Rvcikge1xuICAgICAgICB0aGlzLnByb2plY3QgPSBwcm9qZWN0O1xuICAgICAgICB0aGlzLnJlc3VsdFNlbGVjdG9yID0gcmVzdWx0U2VsZWN0b3I7XG4gICAgfVxuICAgIFN3aXRjaE1hcE9wZXJhdG9yLnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gKHN1YnNjcmliZXIsIHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gc291cmNlLl9zdWJzY3JpYmUobmV3IFN3aXRjaE1hcFN1YnNjcmliZXIoc3Vic2NyaWJlciwgdGhpcy5wcm9qZWN0LCB0aGlzLnJlc3VsdFNlbGVjdG9yKSk7XG4gICAgfTtcbiAgICByZXR1cm4gU3dpdGNoTWFwT3BlcmF0b3I7XG59KCkpO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBTd2l0Y2hNYXBTdWJzY3JpYmVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoU3dpdGNoTWFwU3Vic2NyaWJlciwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTd2l0Y2hNYXBTdWJzY3JpYmVyKGRlc3RpbmF0aW9uLCBwcm9qZWN0LCByZXN1bHRTZWxlY3Rvcikge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZXN0aW5hdGlvbik7XG4gICAgICAgIHRoaXMucHJvamVjdCA9IHByb2plY3Q7XG4gICAgICAgIHRoaXMucmVzdWx0U2VsZWN0b3IgPSByZXN1bHRTZWxlY3RvcjtcbiAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgfVxuICAgIFN3aXRjaE1hcFN1YnNjcmliZXIucHJvdG90eXBlLl9uZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMuaW5kZXgrKztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMucHJvamVjdCh2YWx1ZSwgaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5lcnJvcihlcnJvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5faW5uZXJTdWIocmVzdWx0LCB2YWx1ZSwgaW5kZXgpO1xuICAgIH07XG4gICAgU3dpdGNoTWFwU3Vic2NyaWJlci5wcm90b3R5cGUuX2lubmVyU3ViID0gZnVuY3Rpb24gKHJlc3VsdCwgdmFsdWUsIGluZGV4KSB7XG4gICAgICAgIHZhciBpbm5lclN1YnNjcmlwdGlvbiA9IHRoaXMuaW5uZXJTdWJzY3JpcHRpb247XG4gICAgICAgIGlmIChpbm5lclN1YnNjcmlwdGlvbikge1xuICAgICAgICAgICAgaW5uZXJTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFkZCh0aGlzLmlubmVyU3Vic2NyaXB0aW9uID0gc3Vic2NyaWJlVG9SZXN1bHRfMS5zdWJzY3JpYmVUb1Jlc3VsdCh0aGlzLCByZXN1bHQsIHZhbHVlLCBpbmRleCkpO1xuICAgIH07XG4gICAgU3dpdGNoTWFwU3Vic2NyaWJlci5wcm90b3R5cGUuX2NvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaW5uZXJTdWJzY3JpcHRpb24gPSB0aGlzLmlubmVyU3Vic2NyaXB0aW9uO1xuICAgICAgICBpZiAoIWlubmVyU3Vic2NyaXB0aW9uIHx8IGlubmVyU3Vic2NyaXB0aW9uLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICBfc3VwZXIucHJvdG90eXBlLl9jb21wbGV0ZS5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTd2l0Y2hNYXBTdWJzY3JpYmVyLnByb3RvdHlwZS5fdW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaW5uZXJTdWJzY3JpcHRpb24gPSBudWxsO1xuICAgIH07XG4gICAgU3dpdGNoTWFwU3Vic2NyaWJlci5wcm90b3R5cGUubm90aWZ5Q29tcGxldGUgPSBmdW5jdGlvbiAoaW5uZXJTdWIpIHtcbiAgICAgICAgdGhpcy5yZW1vdmUoaW5uZXJTdWIpO1xuICAgICAgICB0aGlzLmlubmVyU3Vic2NyaXB0aW9uID0gbnVsbDtcbiAgICAgICAgaWYgKHRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgICAgICBfc3VwZXIucHJvdG90eXBlLl9jb21wbGV0ZS5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTd2l0Y2hNYXBTdWJzY3JpYmVyLnByb3RvdHlwZS5ub3RpZnlOZXh0ID0gZnVuY3Rpb24gKG91dGVyVmFsdWUsIGlubmVyVmFsdWUsIG91dGVySW5kZXgsIGlubmVySW5kZXgsIGlubmVyU3ViKSB7XG4gICAgICAgIGlmICh0aGlzLnJlc3VsdFNlbGVjdG9yKSB7XG4gICAgICAgICAgICB0aGlzLl90cnlOb3RpZnlOZXh0KG91dGVyVmFsdWUsIGlubmVyVmFsdWUsIG91dGVySW5kZXgsIGlubmVySW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5uZXh0KGlubmVyVmFsdWUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTd2l0Y2hNYXBTdWJzY3JpYmVyLnByb3RvdHlwZS5fdHJ5Tm90aWZ5TmV4dCA9IGZ1bmN0aW9uIChvdXRlclZhbHVlLCBpbm5lclZhbHVlLCBvdXRlckluZGV4LCBpbm5lckluZGV4KSB7XG4gICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXN1bHQgPSB0aGlzLnJlc3VsdFNlbGVjdG9yKG91dGVyVmFsdWUsIGlubmVyVmFsdWUsIG91dGVySW5kZXgsIGlubmVySW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24uZXJyb3IoZXJyKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLm5leHQocmVzdWx0KTtcbiAgICB9O1xuICAgIHJldHVybiBTd2l0Y2hNYXBTdWJzY3JpYmVyO1xufShPdXRlclN1YnNjcmliZXJfMS5PdXRlclN1YnNjcmliZXIpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXN3aXRjaE1hcC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciByb290XzEgPSByZXF1aXJlKCcuLi91dGlsL3Jvb3QnKTtcbnZhciBTeW1ib2wgPSByb290XzEucm9vdC5TeW1ib2w7XG5pZiAodHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGlmIChTeW1ib2wuaXRlcmF0b3IpIHtcbiAgICAgICAgZXhwb3J0cy4kJGl0ZXJhdG9yID0gU3ltYm9sLml0ZXJhdG9yO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgU3ltYm9sLmZvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBleHBvcnRzLiQkaXRlcmF0b3IgPSBTeW1ib2wuZm9yKCdpdGVyYXRvcicpO1xuICAgIH1cbn1cbmVsc2Uge1xuICAgIGlmIChyb290XzEucm9vdC5TZXQgJiYgdHlwZW9mIG5ldyByb290XzEucm9vdC5TZXQoKVsnQEBpdGVyYXRvciddID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIEJ1ZyBmb3IgbW96aWxsYSB2ZXJzaW9uXG4gICAgICAgIGV4cG9ydHMuJCRpdGVyYXRvciA9ICdAQGl0ZXJhdG9yJztcbiAgICB9XG4gICAgZWxzZSBpZiAocm9vdF8xLnJvb3QuTWFwKSB7XG4gICAgICAgIC8vIGVzNi1zaGltIHNwZWNpZmljIGxvZ2ljXG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocm9vdF8xLnJvb3QuTWFwLnByb3RvdHlwZSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgICBpZiAoa2V5ICE9PSAnZW50cmllcycgJiYga2V5ICE9PSAnc2l6ZScgJiYgcm9vdF8xLnJvb3QuTWFwLnByb3RvdHlwZVtrZXldID09PSByb290XzEucm9vdC5NYXAucHJvdG90eXBlWydlbnRyaWVzJ10pIHtcbiAgICAgICAgICAgICAgICBleHBvcnRzLiQkaXRlcmF0b3IgPSBrZXk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGV4cG9ydHMuJCRpdGVyYXRvciA9ICdAQGl0ZXJhdG9yJztcbiAgICB9XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pdGVyYXRvci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciByb290XzEgPSByZXF1aXJlKCcuLi91dGlsL3Jvb3QnKTtcbnZhciBTeW1ib2wgPSByb290XzEucm9vdC5TeW1ib2w7XG5pZiAodHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGlmIChTeW1ib2wub2JzZXJ2YWJsZSkge1xuICAgICAgICBleHBvcnRzLiQkb2JzZXJ2YWJsZSA9IFN5bWJvbC5vYnNlcnZhYmxlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKHR5cGVvZiBTeW1ib2wuZm9yID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBleHBvcnRzLiQkb2JzZXJ2YWJsZSA9IFN5bWJvbC5mb3IoJ29ic2VydmFibGUnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGV4cG9ydHMuJCRvYnNlcnZhYmxlID0gU3ltYm9sKCdvYnNlcnZhYmxlJyk7XG4gICAgICAgIH1cbiAgICAgICAgU3ltYm9sLm9ic2VydmFibGUgPSBleHBvcnRzLiQkb2JzZXJ2YWJsZTtcbiAgICB9XG59XG5lbHNlIHtcbiAgICBleHBvcnRzLiQkb2JzZXJ2YWJsZSA9ICdAQG9ic2VydmFibGUnO1xufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9b2JzZXJ2YWJsZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciByb290XzEgPSByZXF1aXJlKCcuLi91dGlsL3Jvb3QnKTtcbnZhciBTeW1ib2wgPSByb290XzEucm9vdC5TeW1ib2w7XG5leHBvcnRzLiQkcnhTdWJzY3JpYmVyID0gKHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIFN5bWJvbC5mb3IgPT09ICdmdW5jdGlvbicpID9cbiAgICBTeW1ib2wuZm9yKCdyeFN1YnNjcmliZXInKSA6ICdAQHJ4U3Vic2NyaWJlcic7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1yeFN1YnNjcmliZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbi8qKlxuICogQW4gZXJyb3IgdGhyb3duIHdoZW4gYW4gYWN0aW9uIGlzIGludmFsaWQgYmVjYXVzZSB0aGUgb2JqZWN0IGhhcyBiZWVuXG4gKiB1bnN1YnNjcmliZWQuXG4gKlxuICogQHNlZSB7QGxpbmsgU3ViamVjdH1cbiAqIEBzZWUge0BsaW5rIEJlaGF2aW9yU3ViamVjdH1cbiAqXG4gKiBAY2xhc3MgT2JqZWN0VW5zdWJzY3JpYmVkRXJyb3JcbiAqL1xudmFyIE9iamVjdFVuc3Vic2NyaWJlZEVycm9yID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoT2JqZWN0VW5zdWJzY3JpYmVkRXJyb3IsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gT2JqZWN0VW5zdWJzY3JpYmVkRXJyb3IoKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsICdvYmplY3QgdW5zdWJzY3JpYmVkJyk7XG4gICAgICAgIHRoaXMubmFtZSA9ICdPYmplY3RVbnN1YnNjcmliZWRFcnJvcic7XG4gICAgfVxuICAgIHJldHVybiBPYmplY3RVbnN1YnNjcmliZWRFcnJvcjtcbn0oRXJyb3IpKTtcbmV4cG9ydHMuT2JqZWN0VW5zdWJzY3JpYmVkRXJyb3IgPSBPYmplY3RVbnN1YnNjcmliZWRFcnJvcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPU9iamVjdFVuc3Vic2NyaWJlZEVycm9yLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG4vKipcbiAqIEFuIGVycm9yIHRocm93biB3aGVuIG9uZSBvciBtb3JlIGVycm9ycyBoYXZlIG9jY3VycmVkIGR1cmluZyB0aGVcbiAqIGB1bnN1YnNjcmliZWAgb2YgYSB7QGxpbmsgU3Vic2NyaXB0aW9ufS5cbiAqL1xudmFyIFVuc3Vic2NyaXB0aW9uRXJyb3IgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhVbnN1YnNjcmlwdGlvbkVycm9yLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFVuc3Vic2NyaXB0aW9uRXJyb3IoZXJyb3JzKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLmVycm9ycyA9IGVycm9ycztcbiAgICAgICAgdGhpcy5uYW1lID0gJ1Vuc3Vic2NyaXB0aW9uRXJyb3InO1xuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBlcnJvcnMgPyBlcnJvcnMubGVuZ3RoICsgXCIgZXJyb3JzIG9jY3VycmVkIGR1cmluZyB1bnN1YnNjcmlwdGlvbjpcXG5cIiArIGVycm9ycy5tYXAoZnVuY3Rpb24gKGVyciwgaSkgeyByZXR1cm4gKChpICsgMSkgKyBcIikgXCIgKyBlcnIudG9TdHJpbmcoKSk7IH0pLmpvaW4oJ1xcbicpIDogJyc7XG4gICAgfVxuICAgIHJldHVybiBVbnN1YnNjcmlwdGlvbkVycm9yO1xufShFcnJvcikpO1xuZXhwb3J0cy5VbnN1YnNjcmlwdGlvbkVycm9yID0gVW5zdWJzY3JpcHRpb25FcnJvcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPVVuc3Vic2NyaXB0aW9uRXJyb3IuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG4vLyB0eXBlb2YgYW55IHNvIHRoYXQgaXQgd2UgZG9uJ3QgaGF2ZSB0byBjYXN0IHdoZW4gY29tcGFyaW5nIGEgcmVzdWx0IHRvIHRoZSBlcnJvciBvYmplY3RcbmV4cG9ydHMuZXJyb3JPYmplY3QgPSB7IGU6IHt9IH07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1lcnJvck9iamVjdC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbmV4cG9ydHMuaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgKGZ1bmN0aW9uICh4KSB7IHJldHVybiB4ICYmIHR5cGVvZiB4Lmxlbmd0aCA9PT0gJ251bWJlcic7IH0pO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aXNBcnJheS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbmZ1bmN0aW9uIGlzRnVuY3Rpb24oeCkge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pc0Z1bmN0aW9uLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuZnVuY3Rpb24gaXNPYmplY3QoeCkge1xuICAgIHJldHVybiB4ICE9IG51bGwgJiYgdHlwZW9mIHggPT09ICdvYmplY3QnO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aXNPYmplY3QuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5mdW5jdGlvbiBpc1Byb21pc2UodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlLnN1YnNjcmliZSAhPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgdmFsdWUudGhlbiA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNQcm9taXNlID0gaXNQcm9taXNlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aXNQcm9taXNlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuZnVuY3Rpb24gaXNTY2hlZHVsZXIodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlLnNjaGVkdWxlID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc1NjaGVkdWxlciA9IGlzU2NoZWR1bGVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aXNTY2hlZHVsZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgb2JqZWN0VHlwZXMgPSB7XG4gICAgJ2Jvb2xlYW4nOiBmYWxzZSxcbiAgICAnZnVuY3Rpb24nOiB0cnVlLFxuICAgICdvYmplY3QnOiB0cnVlLFxuICAgICdudW1iZXInOiBmYWxzZSxcbiAgICAnc3RyaW5nJzogZmFsc2UsXG4gICAgJ3VuZGVmaW5lZCc6IGZhbHNlXG59O1xuZXhwb3J0cy5yb290ID0gKG9iamVjdFR5cGVzW3R5cGVvZiBzZWxmXSAmJiBzZWxmKSB8fCAob2JqZWN0VHlwZXNbdHlwZW9mIHdpbmRvd10gJiYgd2luZG93KTtcbi8qIHRzbGludDpkaXNhYmxlOm5vLXVudXNlZC12YXJpYWJsZSAqL1xudmFyIGZyZWVFeHBvcnRzID0gb2JqZWN0VHlwZXNbdHlwZW9mIGV4cG9ydHNdICYmIGV4cG9ydHMgJiYgIWV4cG9ydHMubm9kZVR5cGUgJiYgZXhwb3J0cztcbnZhciBmcmVlTW9kdWxlID0gb2JqZWN0VHlwZXNbdHlwZW9mIG1vZHVsZV0gJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUgJiYgbW9kdWxlO1xudmFyIGZyZWVHbG9iYWwgPSBvYmplY3RUeXBlc1t0eXBlb2YgZ2xvYmFsXSAmJiBnbG9iYWw7XG5pZiAoZnJlZUdsb2JhbCAmJiAoZnJlZUdsb2JhbC5nbG9iYWwgPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbC53aW5kb3cgPT09IGZyZWVHbG9iYWwpKSB7XG4gICAgZXhwb3J0cy5yb290ID0gZnJlZUdsb2JhbDtcbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXJvb3QuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgcm9vdF8xID0gcmVxdWlyZSgnLi9yb290Jyk7XG52YXIgaXNBcnJheV8xID0gcmVxdWlyZSgnLi9pc0FycmF5Jyk7XG52YXIgaXNQcm9taXNlXzEgPSByZXF1aXJlKCcuL2lzUHJvbWlzZScpO1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uL09ic2VydmFibGUnKTtcbnZhciBpdGVyYXRvcl8xID0gcmVxdWlyZSgnLi4vc3ltYm9sL2l0ZXJhdG9yJyk7XG52YXIgb2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vc3ltYm9sL29ic2VydmFibGUnKTtcbnZhciBJbm5lclN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4uL0lubmVyU3Vic2NyaWJlcicpO1xuZnVuY3Rpb24gc3Vic2NyaWJlVG9SZXN1bHQob3V0ZXJTdWJzY3JpYmVyLCByZXN1bHQsIG91dGVyVmFsdWUsIG91dGVySW5kZXgpIHtcbiAgICB2YXIgZGVzdGluYXRpb24gPSBuZXcgSW5uZXJTdWJzY3JpYmVyXzEuSW5uZXJTdWJzY3JpYmVyKG91dGVyU3Vic2NyaWJlciwgb3V0ZXJWYWx1ZSwgb3V0ZXJJbmRleCk7XG4gICAgaWYgKGRlc3RpbmF0aW9uLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIE9ic2VydmFibGVfMS5PYnNlcnZhYmxlKSB7XG4gICAgICAgIGlmIChyZXN1bHQuX2lzU2NhbGFyKSB7XG4gICAgICAgICAgICBkZXN0aW5hdGlvbi5uZXh0KHJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICBkZXN0aW5hdGlvbi5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC5zdWJzY3JpYmUoZGVzdGluYXRpb24pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChpc0FycmF5XzEuaXNBcnJheShyZXN1bHQpKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSByZXN1bHQubGVuZ3RoOyBpIDwgbGVuICYmICFkZXN0aW5hdGlvbi5pc1Vuc3Vic2NyaWJlZDsgaSsrKSB7XG4gICAgICAgICAgICBkZXN0aW5hdGlvbi5uZXh0KHJlc3VsdFtpXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvbi5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgZGVzdGluYXRpb24uY29tcGxldGUoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChpc1Byb21pc2VfMS5pc1Byb21pc2UocmVzdWx0KSkge1xuICAgICAgICByZXN1bHQudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIGlmICghZGVzdGluYXRpb24uaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgICAgICBkZXN0aW5hdGlvbi5uZXh0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICBkZXN0aW5hdGlvbi5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7IHJldHVybiBkZXN0aW5hdGlvbi5lcnJvcihlcnIpOyB9KVxuICAgICAgICAgICAgLnRoZW4obnVsbCwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgLy8gRXNjYXBpbmcgdGhlIFByb21pc2UgdHJhcDogZ2xvYmFsbHkgdGhyb3cgdW5oYW5kbGVkIGVycm9yc1xuICAgICAgICAgICAgcm9vdF8xLnJvb3Quc2V0VGltZW91dChmdW5jdGlvbiAoKSB7IHRocm93IGVycjsgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZGVzdGluYXRpb247XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiByZXN1bHRbaXRlcmF0b3JfMS4kJGl0ZXJhdG9yXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBmb3IgKHZhciBfaSA9IDAsIF9hID0gcmVzdWx0OyBfaSA8IF9hLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgdmFyIGl0ZW0gPSBfYVtfaV07XG4gICAgICAgICAgICBkZXN0aW5hdGlvbi5uZXh0KGl0ZW0pO1xuICAgICAgICAgICAgaWYgKGRlc3RpbmF0aW9uLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvbi5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgZGVzdGluYXRpb24uY29tcGxldGUoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgcmVzdWx0W29ic2VydmFibGVfMS4kJG9ic2VydmFibGVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHZhciBvYnMgPSByZXN1bHRbb2JzZXJ2YWJsZV8xLiQkb2JzZXJ2YWJsZV0oKTtcbiAgICAgICAgaWYgKHR5cGVvZiBvYnMuc3Vic2NyaWJlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBkZXN0aW5hdGlvbi5lcnJvcignaW52YWxpZCBvYnNlcnZhYmxlJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gb2JzLnN1YnNjcmliZShuZXcgSW5uZXJTdWJzY3JpYmVyXzEuSW5uZXJTdWJzY3JpYmVyKG91dGVyU3Vic2NyaWJlciwgb3V0ZXJWYWx1ZSwgb3V0ZXJJbmRleCkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBkZXN0aW5hdGlvbi5lcnJvcihuZXcgVHlwZUVycm9yKCd1bmtub3duIHR5cGUgcmV0dXJuZWQnKSk7XG4gICAgfVxufVxuZXhwb3J0cy5zdWJzY3JpYmVUb1Jlc3VsdCA9IHN1YnNjcmliZVRvUmVzdWx0O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c3Vic2NyaWJlVG9SZXN1bHQuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5mdW5jdGlvbiB0aHJvd0Vycm9yKGUpIHsgdGhyb3cgZTsgfVxuZXhwb3J0cy50aHJvd0Vycm9yID0gdGhyb3dFcnJvcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXRocm93RXJyb3IuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgU3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi4vU3Vic2NyaWJlcicpO1xudmFyIHJ4U3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi4vc3ltYm9sL3J4U3Vic2NyaWJlcicpO1xuZnVuY3Rpb24gdG9TdWJzY3JpYmVyKG5leHRPck9ic2VydmVyLCBlcnJvciwgY29tcGxldGUpIHtcbiAgICBpZiAobmV4dE9yT2JzZXJ2ZXIgJiYgdHlwZW9mIG5leHRPck9ic2VydmVyID09PSAnb2JqZWN0Jykge1xuICAgICAgICBpZiAobmV4dE9yT2JzZXJ2ZXIgaW5zdGFuY2VvZiBTdWJzY3JpYmVyXzEuU3Vic2NyaWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIG5leHRPck9ic2VydmVyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBuZXh0T3JPYnNlcnZlcltyeFN1YnNjcmliZXJfMS4kJHJ4U3Vic2NyaWJlcl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXh0T3JPYnNlcnZlcltyeFN1YnNjcmliZXJfMS4kJHJ4U3Vic2NyaWJlcl0oKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IFN1YnNjcmliZXJfMS5TdWJzY3JpYmVyKG5leHRPck9ic2VydmVyLCBlcnJvciwgY29tcGxldGUpO1xufVxuZXhwb3J0cy50b1N1YnNjcmliZXIgPSB0b1N1YnNjcmliZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD10b1N1YnNjcmliZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgZXJyb3JPYmplY3RfMSA9IHJlcXVpcmUoJy4vZXJyb3JPYmplY3QnKTtcbnZhciB0cnlDYXRjaFRhcmdldDtcbmZ1bmN0aW9uIHRyeUNhdGNoZXIoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHRyeUNhdGNoVGFyZ2V0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGVycm9yT2JqZWN0XzEuZXJyb3JPYmplY3QuZSA9IGU7XG4gICAgICAgIHJldHVybiBlcnJvck9iamVjdF8xLmVycm9yT2JqZWN0O1xuICAgIH1cbn1cbmZ1bmN0aW9uIHRyeUNhdGNoKGZuKSB7XG4gICAgdHJ5Q2F0Y2hUYXJnZXQgPSBmbjtcbiAgICByZXR1cm4gdHJ5Q2F0Y2hlcjtcbn1cbmV4cG9ydHMudHJ5Q2F0Y2ggPSB0cnlDYXRjaDtcbjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXRyeUNhdGNoLmpzLm1hcCIsInZhciBoaWRkZW5TdG9yZSA9IHJlcXVpcmUoJy4vaGlkZGVuLXN0b3JlLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlU3RvcmU7XG5cbmZ1bmN0aW9uIGNyZWF0ZVN0b3JlKCkge1xuICAgIHZhciBrZXkgPSB7fTtcblxuICAgIHJldHVybiBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIGlmICgodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcgfHwgb2JqID09PSBudWxsKSAmJlxuICAgICAgICAgICAgdHlwZW9mIG9iaiAhPT0gJ2Z1bmN0aW9uJ1xuICAgICAgICApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignV2Vha21hcC1zaGltOiBLZXkgbXVzdCBiZSBvYmplY3QnKVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHN0b3JlID0gb2JqLnZhbHVlT2Yoa2V5KTtcbiAgICAgICAgcmV0dXJuIHN0b3JlICYmIHN0b3JlLmlkZW50aXR5ID09PSBrZXkgP1xuICAgICAgICAgICAgc3RvcmUgOiBoaWRkZW5TdG9yZShvYmosIGtleSk7XG4gICAgfTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaGlkZGVuU3RvcmU7XG5cbmZ1bmN0aW9uIGhpZGRlblN0b3JlKG9iaiwga2V5KSB7XG4gICAgdmFyIHN0b3JlID0geyBpZGVudGl0eToga2V5IH07XG4gICAgdmFyIHZhbHVlT2YgPSBvYmoudmFsdWVPZjtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIFwidmFsdWVPZlwiLCB7XG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZSAhPT0ga2V5ID9cbiAgICAgICAgICAgICAgICB2YWx1ZU9mLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgOiBzdG9yZTtcbiAgICAgICAgfSxcbiAgICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcblxuICAgIHJldHVybiBzdG9yZTtcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgQ3VzdG9tRXZlbnQgPSBleHBvcnRzLkN1c3RvbUV2ZW50ID0gZ2xvYmFsLkN1c3RvbUV2ZW50IHx8IGZ1bmN0aW9uICgpIHtcbiAgdmFyIERFRkFVTFRfUEFSQU1TID0geyBidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogZmFsc2UsIGRldGFpbDogdW5kZWZpbmVkIH07XG5cbiAgZnVuY3Rpb24gX0N1c3RvbUV2ZW50KF9ldmVudCwgX3BhcmFtcykge1xuICAgIHZhciBwYXJhbXMgPSBfZXh0ZW5kcyh7fSwgREVGQVVMVF9QQVJBTVMsIF9wYXJhbXMpO1xuICAgIHZhciBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiQ3VzdG9tRXZlbnRcIik7XG5cbiAgICBldmVudC5pbml0Q3VzdG9tRXZlbnQoX2V2ZW50LCBwYXJhbXMuYnViYmxlcywgcGFyYW1zLmNhbmNlbGFibGUsIHBhcmFtcy5kZXRhaWwpO1xuICAgIHJldHVybiBldmVudDtcbiAgfVxuXG4gIHJldHVybiBfQ3VzdG9tRXZlbnQ7XG59KCk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Ob2RlUHJveHkgPSB1bmRlZmluZWQ7XG5cbnZhciBfY3JlYXRlQ2xhc3MgPSBmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfSByZXR1cm4gZnVuY3Rpb24gKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9OyB9KCk7IC8qIEBmbG93ICovXG5cbnZhciBfZG9jdW1lbnQgPSByZXF1aXJlKCdnbG9iYWwvZG9jdW1lbnQnKTtcblxudmFyIF9kb2N1bWVudDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9kb2N1bWVudCk7XG5cbnZhciBfcHJvcGVydHlEZXNjcmlwdG9ycyA9IHJlcXVpcmUoJy4vcHJvcGVydHlEZXNjcmlwdG9ycycpO1xuXG52YXIgX2V2ZW50RGVsZWdhdG9yID0gcmVxdWlyZSgnLi9ldmVudERlbGVnYXRvcicpO1xuXG52YXIgX21vdW50YWJsZSA9IHJlcXVpcmUoJy4vbW91bnRhYmxlJyk7XG5cbnZhciBfaXMgPSByZXF1aXJlKCcuL2lzJyk7XG5cbnZhciBfZ2V0ID0gcmVxdWlyZSgnLi9nZXQnKTtcblxudmFyIF9zZXQgPSByZXF1aXJlKCcuL3NldCcpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG52YXIgTm9kZVByb3h5ID0gZXhwb3J0cy5Ob2RlUHJveHkgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIE5vZGVQcm94eShub2RlIC8qOiBIVE1MRWxlbWVudCovKSB7XG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIE5vZGVQcm94eSk7XG5cbiAgICB0aGlzLl9ub2RlID0gbm9kZTtcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhOb2RlUHJveHksIFt7XG4gICAga2V5OiAnZW1pdE1vdW50JyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gZW1pdE1vdW50KGZuIC8qOiBGdW5jdGlvbiovKSB7XG4gICAgICAoMCwgX21vdW50YWJsZS5lbWl0TW91bnQpKHRoaXMuX25vZGUsIGZuKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdlbWl0VW5tb3VudCcsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGVtaXRVbm1vdW50KGZuIC8qOiBGdW5jdGlvbiovKSB7XG4gICAgICAoMCwgX21vdW50YWJsZS5lbWl0VW5tb3VudCkodGhpcy5fbm9kZSwgZm4pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2NoaWxkcmVuJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gY2hpbGRyZW4oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fbm9kZS5jaGlsZHJlbjtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdyZXBsYWNlQ2hpbGQnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZXBsYWNlQ2hpbGQoY2hpbGRQcm94eSAvKjogTm9kZVByb3h5Ki8sIGluZGV4IC8qOiBudW1iZXIqLykge1xuICAgICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlO1xuICAgICAgdmFyIGNoaWxkID0gY2hpbGRQcm94eS5fbm9kZTtcbiAgICAgIHZhciByZXBsYWNlZCA9IG5vZGUuY2hpbGRyZW5baW5kZXhdO1xuXG4gICAgICBpZiAoKDAsIF9pcy5pc0RlZmluZWQpKHJlcGxhY2VkKSkge1xuICAgICAgICBub2RlLnJlcGxhY2VDaGlsZChjaGlsZCwgcmVwbGFjZWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZCk7XG4gICAgICB9XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnaW5zZXJ0Q2hpbGQnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBpbnNlcnRDaGlsZChjaGlsZFByb3h5IC8qOiBOb2RlUHJveHkqLywgaW5kZXggLyo6IG51bWJlciovKSB7XG4gICAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGU7XG4gICAgICB2YXIgY2hpbGQgPSBjaGlsZFByb3h5Ll9ub2RlO1xuICAgICAgdmFyIGJlZm9yZSAvKjogTm9kZSovID0gbm9kZS5jaGlsZHJlbltpbmRleF07XG5cbiAgICAgIGlmICgoMCwgX2lzLmlzRGVmaW5lZCkoYmVmb3JlKSkge1xuICAgICAgICBub2RlLmluc2VydEJlZm9yZShjaGlsZCwgYmVmb3JlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICAgICAgfVxuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ3JlbW92ZUNoaWxkJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVtb3ZlQ2hpbGQoY2hpbGRQcm94eSAvKjogTm9kZVByb3h5Ki8pIHtcbiAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZTtcbiAgICAgIHZhciBjaGlsZCA9IGNoaWxkUHJveHkuX25vZGU7XG4gICAgICBub2RlLnJlbW92ZUNoaWxkKGNoaWxkKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdnZXRBdHRyaWJ1dGUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBnZXRBdHRyaWJ1dGUoa2V5IC8qOiBzdHJpbmcqLykge1xuICAgICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlO1xuICAgICAgdmFyIGRlc2NyaXB0b3IgPSAoMCwgX2dldC5nZXQpKF9wcm9wZXJ0eURlc2NyaXB0b3JzLmRlc2NyaXB0b3JzLCBrZXkpO1xuXG4gICAgICBpZiAoIWRlc2NyaXB0b3IpIHtcbiAgICAgICAgcmV0dXJuICgwLCBfZ2V0LmdldCkobm9kZSwga2V5KTtcbiAgICAgIH1cblxuICAgICAgaWYgKGRlc2NyaXB0b3IudXNlRXF1YWxTZXR0ZXIpIHtcbiAgICAgICAgcmV0dXJuICgwLCBfZ2V0LmdldCkobm9kZSwgZGVzY3JpcHRvci5jb21wdXRlZCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBub2RlLmdldEF0dHJpYnV0ZShkZXNjcmlwdG9yLmNvbXB1dGVkKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdzZXRBdHRyaWJ1dGUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBzZXRBdHRyaWJ1dGUoa2V5IC8qOiBzdHJpbmcqLywgdmFsdWUgLyo6IGFueSovKSB7XG4gICAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGU7XG4gICAgICB2YXIgZGVzY3JpcHRvciA9ICgwLCBfZ2V0LmdldCkoX3Byb3BlcnR5RGVzY3JpcHRvcnMuZGVzY3JpcHRvcnMsIGtleSk7XG5cbiAgICAgIGlmICghZGVzY3JpcHRvcikge1xuICAgICAgICAoMCwgX3NldC5zZXQpKG5vZGUsIGtleSwgdmFsdWUpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBjb21wdXRlZCA9IGRlc2NyaXB0b3IuY29tcHV0ZWQ7XG5cblxuICAgICAgaWYgKGRlc2NyaXB0b3IudXNlRXF1YWxTZXR0ZXIpIHtcbiAgICAgICAgKDAsIF9zZXQuc2V0KShub2RlLCBjb21wdXRlZCwgdmFsdWUpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChkZXNjcmlwdG9yLmhhc0Jvb2xlYW5WYWx1ZSAmJiAhdmFsdWUpIHtcbiAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoY29tcHV0ZWQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChkZXNjcmlwdG9yLnVzZUV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgKDAsIF9ldmVudERlbGVnYXRvci5hZGRFdmVudExpc3RlbmVyKShub2RlLCBjb21wdXRlZCwgdmFsdWUpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIG5vZGUuc2V0QXR0cmlidXRlKGNvbXB1dGVkLCB2YWx1ZSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAncmVtb3ZlQXR0cmlidXRlJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVtb3ZlQXR0cmlidXRlKGtleSAvKjogc3RyaW5nKi8pIHtcbiAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZTtcbiAgICAgIHZhciBkZXNjcmlwdG9yID0gKDAsIF9nZXQuZ2V0KShfcHJvcGVydHlEZXNjcmlwdG9ycy5kZXNjcmlwdG9ycywga2V5KTtcblxuICAgICAgaWYgKCFkZXNjcmlwdG9yKSB7XG4gICAgICAgICgwLCBfc2V0LnNldCkobm9kZSwga2V5LCB1bmRlZmluZWQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBjb21wdXRlZCA9IGRlc2NyaXB0b3IuY29tcHV0ZWQ7XG5cblxuICAgICAgaWYgKGRlc2NyaXB0b3IudXNlU2V0QXR0cmlidXRlKSB7XG4gICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGNvbXB1dGVkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGVzY3JpcHRvci5oYXNCb29sZWFuVmFsdWUpIHtcbiAgICAgICAgKDAsIF9zZXQuc2V0KShub2RlLCBjb21wdXRlZCwgZmFsc2UpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChkZXNjcmlwdG9yLnVzZUV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgKDAsIF9ldmVudERlbGVnYXRvci5yZW1vdmVFdmVudExpc3RlbmVyKShub2RlLCBjb21wdXRlZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgKDAsIF9zZXQuc2V0KShub2RlLCBjb21wdXRlZCwgdW5kZWZpbmVkKTtcbiAgICB9XG4gIH1dLCBbe1xuICAgIGtleTogJ2NyZWF0ZUVsZW1lbnQnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjcmVhdGVFbGVtZW50KHRhZ05hbWUgLyo6IHN0cmluZyovKSB7XG4gICAgICB2YXIgbm9kZSAvKjogSFRNTEVsZW1lbnQqLyA9IF9kb2N1bWVudDIuZGVmYXVsdC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xuICAgICAgcmV0dXJuIG5ldyBOb2RlUHJveHkobm9kZSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAncXVlcnlTZWxlY3RvcicsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IgLyo6IHN0cmluZyovKSB7XG4gICAgICB2YXIgbm9kZSAvKjogSFRNTEVsZW1lbnQqLyA9IF9kb2N1bWVudDIuZGVmYXVsdC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICAgIHJldHVybiBuZXcgTm9kZVByb3h5KG5vZGUpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2Zyb21FbGVtZW50JyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gZnJvbUVsZW1lbnQobm9kZSAvKjogSFRNTEVsZW1lbnQqLykge1xuICAgICAgcmV0dXJuIG5ldyBOb2RlUHJveHkobm9kZSk7XG4gICAgfVxuICB9XSk7XG5cbiAgcmV0dXJuIE5vZGVQcm94eTtcbn0oKTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlZpcnR1YWxDb21wb25lbnQgPSB1bmRlZmluZWQ7XG5cbnZhciBfY3JlYXRlQ2xhc3MgPSBmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfSByZXR1cm4gZnVuY3Rpb24gKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9OyB9KCk7IC8qIEBmbG93ICovXG5cbnZhciBfY3VpZCA9IHJlcXVpcmUoJ2N1aWQnKTtcblxudmFyIF9jdWlkMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2N1aWQpO1xuXG52YXIgX2NyZWF0ZUV2ZW50SGFuZGxlcjIgPSByZXF1aXJlKCcuL2NyZWF0ZUV2ZW50SGFuZGxlcicpO1xuXG52YXIgX2NyZWF0ZUNvbXBvbmVudFByb3BzID0gcmVxdWlyZSgnLi9jcmVhdGVDb21wb25lbnRQcm9wcycpO1xuXG52YXIgX2NyZWF0ZUNvbXBvc2l0ZVN1YmplY3QgPSByZXF1aXJlKCcuL2NyZWF0ZUNvbXBvc2l0ZVN1YmplY3QnKTtcblxudmFyIF9jcmVhdGVPYnNlcnZhYmxlRnJvbUFycmF5ID0gcmVxdWlyZSgnLi9jcmVhdGVPYnNlcnZhYmxlRnJvbUFycmF5Jyk7XG5cbnZhciBfc3ltYm9sID0gcmVxdWlyZSgnLi9zeW1ib2wnKTtcblxudmFyIF9zZXQgPSByZXF1aXJlKCcuL3NldCcpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG4vKjo6IGltcG9ydCB0eXBlIHtPYnNlcnZhYmxlfSBmcm9tICdyeGpzL09ic2VydmFibGUnKi9cbi8qOjogaW1wb3J0IHR5cGUge1N1YmplY3R9IGZyb20gJ3J4anMvU3ViamVjdCcqL1xuLyo6OiBpbXBvcnQgdHlwZSB7Tm9kZVByb3h5fSBmcm9tICcuL05vZGVQcm94eScqL1xuLyo6OiBpbXBvcnQgdHlwZSB7VmlydHVhbEVsZW1lbnR9IGZyb20gJy4vdHlwZXMnKi9cblxuXG52YXIgY3JlYXRlQ29tcG9zaXRlQXJyYXlTdWJqZWN0ID0gKDAsIF9jcmVhdGVDb21wb3NpdGVTdWJqZWN0LmNyZWF0ZUNvbXBvc2l0ZVN1YmplY3QpKF9jcmVhdGVPYnNlcnZhYmxlRnJvbUFycmF5LmNyZWF0ZU9ic2VydmFibGVGcm9tQXJyYXkpO1xuXG52YXIgYXBwZW5kVWlkVG9Db21wb25lbnQgPSBmdW5jdGlvbiBhcHBlbmRVaWRUb0NvbXBvbmVudChmbiAvKjogRnVuY3Rpb24qLykgLyo6IHN0cmluZyovIHtcbiAgaWYgKCFmbltfc3ltYm9sLiQkY29tcG9uZW50VWlkXSkge1xuICAgIGZuW19zeW1ib2wuJCRjb21wb25lbnRVaWRdID0gKDAsIF9jdWlkMi5kZWZhdWx0KSgpO1xuICB9XG5cbiAgcmV0dXJuIGZuW19zeW1ib2wuJCRjb21wb25lbnRVaWRdO1xufTtcblxudmFyIFZpcnR1YWxDb21wb25lbnQgPSBleHBvcnRzLlZpcnR1YWxDb21wb25lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIFZpcnR1YWxDb21wb25lbnQoZm4gLyo6IEZ1bmN0aW9uKi8sIHRhZ05hbWUgLyo6IHN0cmluZyovLCBwcm9wcyAvKjogT2JqZWN0Ki8sIGNoaWxkcmVuIC8qOiBBcnJheTxWaXJ0dWFsRWxlbWVudD4qLywga2V5IC8qOjogPzogc3RyaW5nKi8pIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgVmlydHVhbENvbXBvbmVudCk7XG5cbiAgICB0aGlzLmtleSA9IGtleTtcbiAgICB0aGlzLnRhZ05hbWUgPSB0YWdOYW1lO1xuICAgIHRoaXMuX2ZuID0gZm47XG4gICAgdGhpcy5fcHJvcHMgPSBwcm9wcztcbiAgICB0aGlzLl9jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICAgIHRoaXMuX2V2ZW50SGFuZGxlcnMgPSBbXTtcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhWaXJ0dWFsQ29tcG9uZW50LCBbe1xuICAgIGtleTogJ2dldE5vZGVQcm94eScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGdldE5vZGVQcm94eSgpIHtcbiAgICAgIHJldHVybiB0aGlzLl9pbnN0YW5jZS5nZXROb2RlUHJveHkoKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdpbml0aWFsaXplJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgIHZhciBwcm9wcyA9IHRoaXMuX3Byb3BzJCA9ICgwLCBfY3JlYXRlQ29tcG9uZW50UHJvcHMuY3JlYXRlQ29tcG9uZW50UHJvcHMpKHRoaXMuX3Byb3BzKTtcbiAgICAgIHZhciBjaGlsZHJlbiA9IHRoaXMuX2NoaWxkcmVuJCA9IGNyZWF0ZUNvbXBvc2l0ZUFycmF5U3ViamVjdCh0aGlzLl9jaGlsZHJlbik7XG5cbiAgICAgIHZhciBfY3JlYXRlRXZlbnRIYW5kbGVyID0gZnVuY3Rpb24gX2NyZWF0ZUV2ZW50SGFuZGxlcigpIHtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSBfY3JlYXRlRXZlbnRIYW5kbGVyMi5jcmVhdGVFdmVudEhhbmRsZXIuYXBwbHkodW5kZWZpbmVkLCBhcmd1bWVudHMpO1xuICAgICAgICBfdGhpcy5fZXZlbnRIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgICAgICByZXR1cm4gaGFuZGxlcjtcbiAgICAgIH07XG5cbiAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXMuX2luc3RhbmNlID0gdGhpcy5fZm4uY2FsbChudWxsLCB7IHByb3BzOiBwcm9wcy5hc09iamVjdCgpLCBjaGlsZHJlbjogY2hpbGRyZW4sIGNyZWF0ZUV2ZW50SGFuZGxlcjogX2NyZWF0ZUV2ZW50SGFuZGxlciB9KTtcbiAgICAgIGluc3RhbmNlLmluaXRpYWxpemUoKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdhZnRlckluc2VydCcsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGFmdGVySW5zZXJ0KCkge1xuICAgICAgdGhpcy5faW5zdGFuY2UuYWZ0ZXJJbnNlcnQoKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdwYXRjaCcsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHBhdGNoKG5leHQgLyo6IFZpcnR1YWxDb21wb25lbnQqLykge1xuICAgICAgbmV4dC5fZXZlbnRIYW5kbGVycyA9IHRoaXMuX2V2ZW50SGFuZGxlcnM7XG4gICAgICBuZXh0Ll9pbnN0YW5jZSA9IHRoaXMuX2luc3RhbmNlO1xuICAgICAgbmV4dC5fcHJvcHMkID0gdGhpcy5fcHJvcHMkO1xuICAgICAgbmV4dC5fY2hpbGRyZW4kID0gdGhpcy5fY2hpbGRyZW4kO1xuXG4gICAgICB0aGlzLl9ldmVudEhhbmRsZXJzID0gW107XG4gICAgICB0aGlzLl9pbnN0YW5jZSA9IG51bGw7XG4gICAgICB0aGlzLl9wcm9wcyQgPSBudWxsO1xuICAgICAgdGhpcy5fY2hpbGRyZW4kID0gbnVsbDtcblxuICAgICAgbmV4dC5fcHJvcHMkLm5leHQobmV4dC5fcHJvcHMpO1xuICAgICAgbmV4dC5fY2hpbGRyZW4kLm5leHQobmV4dC5fY2hpbGRyZW4pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2JlZm9yZURlc3Ryb3knLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBiZWZvcmVEZXN0cm95KCkge1xuICAgICAgdGhpcy5faW5zdGFuY2UuYmVmb3JlRGVzdHJveSgpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2Rlc3Ryb3knLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgICAgdGhpcy5fZXZlbnRIYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uIChoKSB7XG4gICAgICAgIHJldHVybiAhaC5oYXNDb21wbGV0ZWQgJiYgaC5jb21wbGV0ZSgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLl9pbnN0YW5jZS5kZXN0cm95KCk7XG4gICAgICB0aGlzLl9jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChjKSB7XG4gICAgICAgIHJldHVybiBjLmRlc3Ryb3koKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2luc2VydENoaWxkJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gaW5zZXJ0Q2hpbGQoX19jaGlsZCAvKjogYW55Ki8sIF9faW5kZXggLyo6IGFueSovKSB7fVxuICB9LCB7XG4gICAga2V5OiAnbW92ZUNoaWxkJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gbW92ZUNoaWxkKF9fY2hpbGQgLyo6IGFueSovLCBfX2luZGV4IC8qOiBhbnkqLykge31cbiAgfSwge1xuICAgIGtleTogJ3JlbW92ZUNoaWxkJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVtb3ZlQ2hpbGQoX19jaGlsZCAvKjogYW55Ki8pIHt9XG4gIH1dLCBbe1xuICAgIGtleTogJ2NyZWF0ZScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNyZWF0ZShmbiAvKjogRnVuY3Rpb24qLywgcHJvcHMgLyo6IE9iamVjdCovLCBjaGlsZHJlbiAvKjogQXJyYXk8T2JzZXJ2YWJsZXxWaXJ0dWFsRWxlbWVudD4qLykge1xuICAgICAgdmFyIHVpZCA9IGFwcGVuZFVpZFRvQ29tcG9uZW50KGZuKTtcblxuICAgICAgcmV0dXJuIG5ldyBWaXJ0dWFsQ29tcG9uZW50KGZuLCB1aWQsIHByb3BzLCBjaGlsZHJlbiwgcHJvcHMua2V5KTtcbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gVmlydHVhbENvbXBvbmVudDtcbn0oKTtcblxuKDAsIF9zZXQuc2V0KShWaXJ0dWFsQ29tcG9uZW50LnByb3RvdHlwZSwgX3N5bWJvbC4kJHZpcnR1YWwsIHRydWUpOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuVmlydHVhbE5vZGUgPSB1bmRlZmluZWQ7XG5cbnZhciBfY3JlYXRlQ2xhc3MgPSBmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfSByZXR1cm4gZnVuY3Rpb24gKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9OyB9KCk7IC8qIEBmbG93ICovXG5cbnZhciBfTm9kZVByb3h5ID0gcmVxdWlyZSgnLi9Ob2RlUHJveHknKTtcblxudmFyIF93cmFwVGV4dCA9IHJlcXVpcmUoJy4vd3JhcFRleHQnKTtcblxudmFyIF9wYXJzZVRhZyA9IHJlcXVpcmUoJy4vcGFyc2VUYWcnKTtcblxudmFyIF9iYXRjaEluc2VydE1lc3NhZ2VzID0gcmVxdWlyZSgnLi9iYXRjaEluc2VydE1lc3NhZ2VzJyk7XG5cbnZhciBfY3JlYXRlUGF0Y2hQcm9wZXJ0aWVzID0gcmVxdWlyZSgnLi9jcmVhdGVQYXRjaFByb3BlcnRpZXMnKTtcblxudmFyIF9jcmVhdGVQYXRjaENoaWxkcmVuID0gcmVxdWlyZSgnLi9jcmVhdGVQYXRjaENoaWxkcmVuJyk7XG5cbnZhciBfY3JlYXRlQ29tcG9zaXRlU3ViamVjdCA9IHJlcXVpcmUoJy4vY3JlYXRlQ29tcG9zaXRlU3ViamVjdCcpO1xuXG52YXIgX2NyZWF0ZU5vZGVQcm9wcyA9IHJlcXVpcmUoJy4vY3JlYXRlTm9kZVByb3BzJyk7XG5cbnZhciBfY3JlYXRlT2JzZXJ2YWJsZUZyb21BcnJheSA9IHJlcXVpcmUoJy4vY3JlYXRlT2JzZXJ2YWJsZUZyb21BcnJheScpO1xuXG52YXIgX2ZsYXR0ZW4gPSByZXF1aXJlKCcuL2ZsYXR0ZW4nKTtcblxudmFyIF9zeW1ib2wgPSByZXF1aXJlKCcuL3N5bWJvbCcpO1xuXG52YXIgX3NldCA9IHJlcXVpcmUoJy4vc2V0Jyk7XG5cbnJlcXVpcmUoJ3J4anMvYWRkL29wZXJhdG9yL21hcCcpO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG4vKjo6IGltcG9ydCB0eXBlIHtPYnNlcnZhYmxlfSBmcm9tICdyeGpzL09ic2VydmFibGUnKi9cbi8qOjogaW1wb3J0IHR5cGUge1N1YmplY3R9IGZyb20gJ3J4anMvU3ViamVjdCcqL1xuLyo6OiBpbXBvcnQgdHlwZSB7U3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzL1N1YnNjcmlwdGlvbicqL1xuLyo6OiBpbXBvcnQgdHlwZSB7VmlydHVhbEVsZW1lbnQsIE5vZGVQcm94eURlY29yYXRvcn0gZnJvbSAnLi90eXBlcycqL1xuXG5cbnZhciBjcmVhdGVDb21wb3NpdGVQcm9wU3ViamVjdCA9ICgwLCBfY3JlYXRlQ29tcG9zaXRlU3ViamVjdC5jcmVhdGVDb21wb3NpdGVTdWJqZWN0KShfY3JlYXRlTm9kZVByb3BzLmNyZWF0ZU5vZGVQcm9wcyk7XG52YXIgY3JlYXRlQ29tcG9zaXRlQXJyYXlTdWJqZWN0ID0gKDAsIF9jcmVhdGVDb21wb3NpdGVTdWJqZWN0LmNyZWF0ZUNvbXBvc2l0ZVN1YmplY3QpKF9jcmVhdGVPYnNlcnZhYmxlRnJvbUFycmF5LmNyZWF0ZU9ic2VydmFibGVGcm9tQXJyYXkpO1xuXG52YXIgVmlydHVhbE5vZGUgPSBleHBvcnRzLlZpcnR1YWxOb2RlID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBWaXJ0dWFsTm9kZSh0YWdOYW1lIC8qOiBzdHJpbmcqLywgcHJvcHMgLyo6IE9iamVjdCovLCBjaGlsZHJlbiAvKjogQXJyYXk8VmlydHVhbEVsZW1lbnQ+Ki8sIGtleSAvKjo6ID86IHN0cmluZyovKSB7XG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIFZpcnR1YWxOb2RlKTtcblxuICAgIHRoaXMua2V5ID0ga2V5O1xuICAgIHRoaXMudGFnTmFtZSA9IHRhZ05hbWU7XG4gICAgdGhpcy5fcHJvcHMgPSBwcm9wcztcbiAgICB0aGlzLl9jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMgPSBbXTtcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhWaXJ0dWFsTm9kZSwgW3tcbiAgICBrZXk6ICdnZXROb2RlUHJveHknLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBnZXROb2RlUHJveHkoKSB7XG4gICAgICByZXR1cm4gdGhpcy5fbm9kZVByb3h5O1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2luaXRpYWxpemUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xuICAgICAgdmFyIG5vZGVQcm94eSAvKjogTm9kZVByb3h5Ki8gPSB0aGlzLl9ub2RlUHJveHkgPSBfTm9kZVByb3h5Lk5vZGVQcm94eS5jcmVhdGVFbGVtZW50KHRoaXMudGFnTmFtZSk7XG4gICAgICB2YXIgcHJvcHMkIC8qOiBTdWJqZWN0PE9iamVjdD4qLyA9IHRoaXMuX3Byb3BzJCA9IGNyZWF0ZUNvbXBvc2l0ZVByb3BTdWJqZWN0KHRoaXMuX3Byb3BzKTtcbiAgICAgIHZhciBjaGlsZHJlbiQgLyo6IFN1YmplY3Q8QXJyYXk8VmlydHVhbE5vZGU+PiovID0gdGhpcy5fY2hpbGRyZW4kID0gY3JlYXRlQ29tcG9zaXRlQXJyYXlTdWJqZWN0KHRoaXMuX2NoaWxkcmVuKTtcblxuICAgICAgdmFyIG5vZGVQcm94eURlY29yYXRvciAvKjogTm9kZVByb3h5RGVjb3JhdG9yKi8gPSB7XG4gICAgICAgIGluc2VydENoaWxkOiBmdW5jdGlvbiBpbnNlcnRDaGlsZChjaGlsZCAvKjogVmlydHVhbE5vZGUqLywgaW5kZXggLyo6IG51bWJlciovKSB7XG4gICAgICAgICAgcmV0dXJuICgwLCBfYmF0Y2hJbnNlcnRNZXNzYWdlcy5iYXRjaEluc2VydE1lc3NhZ2VzKShmdW5jdGlvbiAocXVldWUpIHtcbiAgICAgICAgICAgIGNoaWxkLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIG5vZGVQcm94eS5pbnNlcnRDaGlsZChjaGlsZC5nZXROb2RlUHJveHkoKSwgaW5kZXgpO1xuICAgICAgICAgICAgcXVldWUucHVzaChjaGlsZCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHVwZGF0ZUNoaWxkOiBmdW5jdGlvbiB1cGRhdGVDaGlsZChwcmV2aW91cyAvKjogVmlydHVhbE5vZGUqLywgbmV4dCAvKjogVmlydHVhbE5vZGUqLykge1xuICAgICAgICAgIHByZXZpb3VzLnBhdGNoKG5leHQpO1xuICAgICAgICB9LFxuICAgICAgICBtb3ZlQ2hpbGQ6IGZ1bmN0aW9uIG1vdmVDaGlsZChwcmV2aW91cyAvKjogVmlydHVhbE5vZGUqLywgbmV4dCAvKjogVmlydHVhbE5vZGUqLywgaW5kZXggLyo6IG51bWJlciovKSB7XG4gICAgICAgICAgcHJldmlvdXMucGF0Y2gobmV4dCk7XG4gICAgICAgICAgbm9kZVByb3h5Lmluc2VydENoaWxkKG5leHQuZ2V0Tm9kZVByb3h5KCksIGluZGV4KTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVtb3ZlQ2hpbGQ6IGZ1bmN0aW9uIHJlbW92ZUNoaWxkKGNoaWxkIC8qOiBWaXJ0dWFsTm9kZSovKSB7XG4gICAgICAgICAgY2hpbGQuYmVmb3JlRGVzdHJveSgpO1xuICAgICAgICAgIG5vZGVQcm94eS5yZW1vdmVDaGlsZChjaGlsZC5nZXROb2RlUHJveHkoKSk7XG4gICAgICAgICAgY2hpbGQuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB2YXIgcHJvcFN1YiA9IHByb3BzJC5zdWJzY3JpYmUoKDAsIF9jcmVhdGVQYXRjaFByb3BlcnRpZXMuY3JlYXRlUGF0Y2hQcm9wZXJ0aWVzKShub2RlUHJveHkpKTtcblxuICAgICAgdmFyIGNoaWxkcmVuU3ViID0gY2hpbGRyZW4kLm1hcChfZmxhdHRlbi5mbGF0dGVuKS5tYXAoX3dyYXBUZXh0LndyYXBUZXh0KS5zdWJzY3JpYmUoKDAsIF9jcmVhdGVQYXRjaENoaWxkcmVuLmNyZWF0ZVBhdGNoQ2hpbGRyZW4pKG5vZGVQcm94eURlY29yYXRvcikpO1xuXG4gICAgICB0aGlzLl9zdWJzY3JpcHRpb25zLnB1c2gocHJvcFN1Yik7XG4gICAgICB0aGlzLl9zdWJzY3JpcHRpb25zLnB1c2goY2hpbGRyZW5TdWIpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2FmdGVySW5zZXJ0JyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gYWZ0ZXJJbnNlcnQoKSB7XG4gICAgICB0aGlzLl9ub2RlUHJveHkuZW1pdE1vdW50KHRoaXMuX3Byb3BzLm9uTW91bnQpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ3BhdGNoJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gcGF0Y2gobmV4dCAvKjogVmlydHVhbE5vZGUqLykge1xuICAgICAgbmV4dC5fbm9kZVByb3h5ID0gdGhpcy5fbm9kZVByb3h5O1xuICAgICAgbmV4dC5fcHJvcHMkID0gdGhpcy5fcHJvcHMkO1xuICAgICAgbmV4dC5fY2hpbGRyZW4kID0gdGhpcy5fY2hpbGRyZW4kO1xuXG4gICAgICBuZXh0Ll9wcm9wcyQubmV4dChuZXh0Ll9wcm9wcyk7XG4gICAgICBuZXh0Ll9jaGlsZHJlbiQubmV4dChuZXh0Ll9jaGlsZHJlbik7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnYmVmb3JlRGVzdHJveScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGJlZm9yZURlc3Ryb3koKSB7XG4gICAgICB0aGlzLl9ub2RlUHJveHkuZW1pdFVubW91bnQodGhpcy5fcHJvcHMub25Vbm1vdW50KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdkZXN0cm95JyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAocykge1xuICAgICAgICByZXR1cm4gcy51bnN1YnNjcmliZSgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLl9jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChjKSB7XG4gICAgICAgIHJldHVybiBjLmRlc3Ryb3koKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfV0sIFt7XG4gICAga2V5OiAnY3JlYXRlJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gY3JlYXRlKF90YWdOYW1lIC8qOiBzdHJpbmcqLywgcHJvcHMgLyo6IE9iamVjdCovLCBjaGlsZHJlbiAvKjogQXJyYXk8VmlydHVhbE5vZGV8T2JzZXJ2YWJsZT4qLykge1xuICAgICAgdmFyIHRhZ05hbWUgLyo6IHN0cmluZyovID0gKDAsIF9wYXJzZVRhZy5wYXJzZVRhZykoX3RhZ05hbWUsIHByb3BzKTtcbiAgICAgIHZhciBrZXkgLyo6IHN0cmluZyovID0gcHJvcHMua2V5IHx8IG51bGw7XG5cbiAgICAgIHJldHVybiBuZXcgVmlydHVhbE5vZGUodGFnTmFtZSwgcHJvcHMsIGNoaWxkcmVuLCBrZXkpO1xuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBWaXJ0dWFsTm9kZTtcbn0oKTtcblxuKDAsIF9zZXQuc2V0KShWaXJ0dWFsTm9kZS5wcm90b3R5cGUsIF9zeW1ib2wuJCR2aXJ0dWFsLCB0cnVlKTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmFzT2JzZXJ2YWJsZSA9IGFzT2JzZXJ2YWJsZTtcblxudmFyIF9PYnNlcnZhYmxlID0gcmVxdWlyZSgncnhqcy9PYnNlcnZhYmxlJyk7XG5cbnZhciBfaXMgPSByZXF1aXJlKCcuL2lzJyk7XG5cbnJlcXVpcmUoJ3J4anMvYWRkL29ic2VydmFibGUvb2YnKTtcblxuZnVuY3Rpb24gYXNPYnNlcnZhYmxlKG9iaiAvKjogYW55Ki8pIC8qOiBPYnNlcnZhYmxlPGFueT4qLyB7XG4gIGlmICgoMCwgX2lzLmlzT2JzZXJ2YWJsZSkob2JqKSkge1xuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICByZXR1cm4gX09ic2VydmFibGUuT2JzZXJ2YWJsZS5vZihvYmopO1xufSAvKiBAZmxvdyAqLyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuYmF0Y2hJbnNlcnRNZXNzYWdlcyA9IGJhdGNoSW5zZXJ0TWVzc2FnZXM7XG4vKiBAZmxvdyAqL1xuXG4vKjo6IGltcG9ydCB0eXBlIHtWaXJ0dWFsTm9kZX0gZnJvbSAnLi9WaXJ0dWFsTm9kZScqL1xuLyo6OiB0eXBlIFNjb3BlID0ge1xuICBiYXRjaEluUHJvZ3Jlc3M6IGJvb2xlYW47XG4gIHF1ZXVlOiBBcnJheTxWaXJ0dWFsTm9kZT47XG59Ki9cblxuXG52YXIgc2NvcGUgLyo6IFNjb3BlKi8gPSB7XG4gIGJhdGNoSW5Qcm9ncmVzczogZmFsc2UsXG4gIHF1ZXVlOiBbXVxufTtcblxuZnVuY3Rpb24gZmx1c2hRdWV1ZShxdWV1ZSAvKjogQXJyYXk8VmlydHVhbE5vZGU+Ki8pIC8qOiB2b2lkKi8ge1xuICB3aGlsZSAocXVldWUubGVuZ3RoID4gMCkge1xuICAgIHZhciB2bm9kZSA9IHNjb3BlLnF1ZXVlLnBvcCgpO1xuICAgIHZub2RlLmFmdGVySW5zZXJ0KCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYmF0Y2hJbnNlcnRNZXNzYWdlcyhjYWxsYmFjayAvKjogRnVuY3Rpb24qLywgYSAvKjogYW55Ki8sIGIgLyo6IGFueSovLCBjIC8qOiBhbnkqLykgLyo6IGFueSovIHtcbiAgaWYgKHNjb3BlLmJhdGNoSW5Qcm9ncmVzcykge1xuICAgIHJldHVybiBjYWxsYmFjayhzY29wZS5xdWV1ZSwgYSwgYiwgYyk7XG4gIH1cblxuICBzY29wZS5iYXRjaEluUHJvZ3Jlc3MgPSB0cnVlO1xuXG4gIHZhciByZXN1bHQgPSBjYWxsYmFjayhzY29wZS5xdWV1ZSwgYSwgYiwgYyk7XG4gIGZsdXNoUXVldWUoc2NvcGUucXVldWUpO1xuXG4gIHNjb3BlLmJhdGNoSW5Qcm9ncmVzcyA9IGZhbHNlO1xuXG4gIHJldHVybiByZXN1bHQ7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5jcmVhdGVDb21wb25lbnRQcm9wcyA9IGNyZWF0ZUNvbXBvbmVudFByb3BzO1xuXG52YXIgX0JlaGF2aW9yU3ViamVjdCA9IHJlcXVpcmUoJ3J4anMvQmVoYXZpb3JTdWJqZWN0Jyk7XG5cbnZhciBfaXMgPSByZXF1aXJlKCcuL2lzJyk7XG5cbi8qIEBmbG93ICovXG5cbi8qOjogdHlwZSBDb21wb25lbnRQcm9wcyA9IHtcbiAgYXNPYmplY3QgKCk6IE9iamVjdCxcbiAgbmV4dCAodjogT2JqZWN0KTogdm9pZCxcbn0qL1xuZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50UHJvcHMoX3Byb3BzIC8qOiBPYmplY3QqLykgLyo6IENvbXBvbmVudFByb3BzKi8ge1xuICB2YXIga2V5cyAvKjogQXJyYXk8c3RyaW5nPiovID0gT2JqZWN0LmtleXMoX3Byb3BzKTtcbiAgdmFyIHBsYWluVmFsdWVLZXlzIC8qOiBPYmplY3QqLyA9IHt9O1xuXG4gIHZhciBwcm9wcyAvKjogT2JqZWN0Ki8gPSB7fTtcbiAgdmFyIGxlbiAvKjogbnVtYmVyKi8gPSBrZXlzLmxlbmd0aDtcbiAgdmFyIGkgLyo6IG51bWJlciovID0gLTE7XG5cbiAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgIHZhciB2YWx1ZSA9IF9wcm9wc1trZXldO1xuXG4gICAgaWYgKCgwLCBfaXMuaXNPYnNlcnZhYmxlKSh2YWx1ZSkpIHtcbiAgICAgIHByb3BzW2tleV0gPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGxhaW5WYWx1ZUtleXNba2V5XSA9IHRydWU7XG4gICAgICBwcm9wc1trZXldID0gbmV3IF9CZWhhdmlvclN1YmplY3QuQmVoYXZpb3JTdWJqZWN0KHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFzT2JqZWN0OiBmdW5jdGlvbiBhc09iamVjdCgpIHtcbiAgICAgIHJldHVybiBwcm9wcztcbiAgICB9LFxuICAgIG5leHQ6IGZ1bmN0aW9uIChfbmV4dCkge1xuICAgICAgZnVuY3Rpb24gbmV4dChfeCkge1xuICAgICAgICByZXR1cm4gX25leHQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH1cblxuICAgICAgbmV4dC50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIF9uZXh0LnRvU3RyaW5nKCk7XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gbmV4dDtcbiAgICB9KGZ1bmN0aW9uIChuZXh0IC8qOiBPYmplY3QqLykge1xuICAgICAgdmFyIGogLyo6IG51bWJlciovID0gLTE7XG5cbiAgICAgIHdoaWxlICgrK2ogPCBsZW4pIHtcbiAgICAgICAgdmFyIF9rZXkgLyo6IHN0cmluZyovID0ga2V5c1tqXTtcbiAgICAgICAgdmFyIF92YWx1ZSAvKjogYW55Ki8gPSBuZXh0W19rZXldO1xuICAgICAgICB2YXIgb2xkIC8qOiBhbnkqLyA9IHByb3BzW19rZXldO1xuXG4gICAgICAgIGlmIChwbGFpblZhbHVlS2V5c1tfa2V5XSkge1xuICAgICAgICAgIG9sZC5uZXh0KF92YWx1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoX3ZhbHVlICE9PSBvbGQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ09ic2VydmFibGUgcHJvcCBcIicgKyBfa2V5ICsgJ1wiIGNoYW5nZWQgdG8gZGlmZmVyZW50IG9ic2VydmFibGUnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH07XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5jcmVhdGVDb21wb3NpdGVTdWJqZWN0ID0gdW5kZWZpbmVkO1xuXG52YXIgX09ic2VydmFibGUgPSByZXF1aXJlKCdyeGpzL09ic2VydmFibGUnKTtcblxudmFyIF9PYnNlcnZlciA9IHJlcXVpcmUoJ3J4anMvT2JzZXJ2ZXInKTtcblxudmFyIF9TdWJqZWN0ID0gcmVxdWlyZSgncnhqcy9TdWJqZWN0Jyk7XG5cbnZhciBfU3Vic2NyaXB0aW9uID0gcmVxdWlyZSgncnhqcy9TdWJzY3JpcHRpb24nKTtcblxudmFyIF9CZWhhdmlvclN1YmplY3QgPSByZXF1aXJlKCdyeGpzL0JlaGF2aW9yU3ViamVjdCcpO1xuXG5yZXF1aXJlKCdyeGpzL2FkZC9vcGVyYXRvci9zd2l0Y2hNYXAnKTtcblxuLyogQGZsb3cgKi9cblxudmFyIGNyZWF0ZUNvbXBvc2l0ZVN1YmplY3QgPSBleHBvcnRzLmNyZWF0ZUNvbXBvc2l0ZVN1YmplY3QgPSBmdW5jdGlvbiBjcmVhdGVDb21wb3NpdGVTdWJqZWN0KHN3aXRjaE1hcEZuIC8qOiBGdW5jdGlvbiovKSAvKjogRnVuY3Rpb24qLyB7XG4gIHJldHVybiBmdW5jdGlvbiAodmFsdWUgLyo6IGFueSovKSAvKjogU3ViamVjdDxhbnk+Ki8ge1xuICAgIHZhciBiZWhhdmlvciAvKjogQmVoYXZpb3JTdWJqZWN0Ki8gPSBuZXcgX0JlaGF2aW9yU3ViamVjdC5CZWhhdmlvclN1YmplY3QodmFsdWUpO1xuXG4gICAgdmFyIG9ic2VydmFibGUgLyo6IE9ic2VydmFibGUqLyA9IF9PYnNlcnZhYmxlLk9ic2VydmFibGUuY3JlYXRlKGZ1bmN0aW9uIChvYnNlcnZlciAvKjogT2JzZXJ2ZXIqLykgLyo6IEZ1bmN0aW9uKi8ge1xuICAgICAgdmFyIHN1YnNjcmlwdGlvbiAvKjogU3Vic2NyaXB0aW9uKi8gPSBiZWhhdmlvci5zd2l0Y2hNYXAoc3dpdGNoTWFwRm4pLnN1YnNjcmliZShvYnNlcnZlcik7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIF9TdWJqZWN0LlN1YmplY3QuY3JlYXRlKGJlaGF2aW9yLCBvYnNlcnZhYmxlKTtcbiAgfTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5jcmVhdGVFdmVudEhhbmRsZXIgPSBjcmVhdGVFdmVudEhhbmRsZXI7XG5cbnZhciBfT2JzZXJ2YWJsZSA9IHJlcXVpcmUoJ3J4anMvT2JzZXJ2YWJsZScpO1xuXG52YXIgX09ic2VydmVyID0gcmVxdWlyZSgncnhqcy9PYnNlcnZlcicpO1xuXG52YXIgX1N1YmplY3QgPSByZXF1aXJlKCdyeGpzL1N1YmplY3QnKTtcblxudmFyIF9TdWJzY3JpcHRpb24gPSByZXF1aXJlKCdyeGpzL1N1YnNjcmlwdGlvbicpO1xuXG52YXIgX2lzID0gcmVxdWlyZSgnLi9pcycpO1xuXG5yZXF1aXJlKCdyeGpzL2FkZC9vcGVyYXRvci9tYXAnKTtcblxucmVxdWlyZSgncnhqcy9hZGQvb3BlcmF0b3IvbWFwVG8nKTtcblxucmVxdWlyZSgncnhqcy9hZGQvb3BlcmF0b3Ivc2hhcmUnKTtcblxuLyogQGZsb3cgKi9cblxuZnVuY3Rpb24gd3JhcE1hcEZuKG9icyAvKjogU3ViamVjdCovLCBtYXBGbiAvKjo6ID86IGFueSovKSAvKjogT2JzZXJ2YWJsZSovIHtcbiAgdmFyIG1hcEZuSXNEZWZpbmVkIC8qOiBib29sZWFuKi8gPSAoMCwgX2lzLmlzRGVmaW5lZCkobWFwRm4pO1xuICB2YXIgbWFwRm5Jc0Z1bmN0aW9uIC8qOiBib29sZWFuKi8gPSAoMCwgX2lzLmlzRnVuY3Rpb24pKG1hcEZuKTtcblxuICBpZiAobWFwRm5Jc0RlZmluZWQgJiYgbWFwRm5Jc0Z1bmN0aW9uKSB7XG4gICAgcmV0dXJuIG9icy5tYXAobWFwRm4pO1xuICB9IGVsc2UgaWYgKG1hcEZuSXNEZWZpbmVkKSB7XG4gICAgcmV0dXJuIG9icy5tYXBUbyhtYXBGbik7XG4gIH1cblxuICByZXR1cm4gb2JzO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFdmVudEhhbmRsZXIobWFwRm4gLyo6OiA/OiBhbnkqLywgaW5pdCAvKjo6ID86IGFueSovKSAvKjogU3ViamVjdCovIHtcbiAgdmFyIHN1YmplY3QgLyo6IFN1YmplY3QqLyA9IG5ldyBfU3ViamVjdC5TdWJqZWN0KCk7XG5cbiAgdmFyIG9ic2VydmFibGUgLyo6IE9ic2VydmFibGUqLyA9IF9PYnNlcnZhYmxlLk9ic2VydmFibGUuY3JlYXRlKGZ1bmN0aW9uIChvYnNlcnZlciAvKjogT2JzZXJ2ZXIqLykgLyo6IEZ1bmN0aW9uKi8ge1xuICAgIHZhciBzdWJzY3JpcHRpb24gLyo6IFN1YnNjcmlwdGlvbiovID0gd3JhcE1hcEZuKHN1YmplY3QsIG1hcEZuKS5zdWJzY3JpYmUob2JzZXJ2ZXIpO1xuXG4gICAgaWYgKCgwLCBfaXMuaXNEZWZpbmVkKShpbml0KSkge1xuICAgICAgb2JzZXJ2ZXIubmV4dChpbml0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgfTtcbiAgfSk7XG5cbiAgcmV0dXJuIF9TdWJqZWN0LlN1YmplY3QuY3JlYXRlKHN1YmplY3QsIG9ic2VydmFibGUuc2hhcmUoKSk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5jcmVhdGVOb2RlUHJvcHMgPSBjcmVhdGVOb2RlUHJvcHM7XG5cbnZhciBfT2JzZXJ2YWJsZSA9IHJlcXVpcmUoJ3J4anMvT2JzZXJ2YWJsZScpO1xuXG52YXIgX2V2ZW50c0xpc3QgPSByZXF1aXJlKCcuL2V2ZW50c0xpc3QnKTtcblxudmFyIF9hc09ic2VydmFibGUgPSByZXF1aXJlKCcuL2FzT2JzZXJ2YWJsZScpO1xuXG52YXIgX2lzID0gcmVxdWlyZSgnLi9pcycpO1xuXG5yZXF1aXJlKCdyeGpzL2FkZC9vYnNlcnZhYmxlL29mJyk7XG5cbnJlcXVpcmUoJ3J4anMvYWRkL29ic2VydmFibGUvY29tYmluZUxhdGVzdCcpO1xuXG4vKiBAZmxvdyAqL1xuXG52YXIgd3JhcFZhbHVlID0gZnVuY3Rpb24gd3JhcFZhbHVlKGtleSwgdmFsdWUpIHtcbiAgaWYgKF9ldmVudHNMaXN0LmV2ZW50TGlzdE1hcFtrZXldICYmICgwLCBfaXMuaXNTdWJqZWN0KSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gKDAsIF9hc09ic2VydmFibGUuYXNPYnNlcnZhYmxlKSh2YWx1ZS5uZXh0LmJpbmQodmFsdWUpKTtcbiAgfVxuXG4gIHJldHVybiAoMCwgX2FzT2JzZXJ2YWJsZS5hc09ic2VydmFibGUpKHZhbHVlKTtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZU5vZGVQcm9wcyhvYmogLyo6IE9iamVjdCovKSAvKjogT2JzZXJ2YWJsZTxPYmplY3Q+Ki8ge1xuICBpZiAoKDAsIF9pcy5pc0VtcHR5T2JqZWN0KShvYmopKSB7XG4gICAgcmV0dXJuIF9PYnNlcnZhYmxlLk9ic2VydmFibGUub2Yob2JqKTtcbiAgfVxuXG4gIHZhciBrZXlzIC8qOiBBcnJheTxzdHJpbmc+Ki8gPSBPYmplY3Qua2V5cyhvYmopO1xuICB2YXIgbGVuIC8qOiBudW1iZXIqLyA9IGtleXMubGVuZ3RoO1xuICB2YXIgdmFsdWVzIC8qOiBBcnJheTxPYnNlcnZhYmxlPiovID0gQXJyYXkobGVuKTtcbiAgdmFyIGkgLyo6IG51bWJlciovID0gLTE7XG5cbiAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgIHZhciBrZXkgLyo6IHN0cmluZyovID0ga2V5c1tpXTtcbiAgICB2YXIgdmFsdWUgLyo6IGFueSovID0gb2JqW2tleV07XG4gICAgdmFsdWVzW2ldID0gd3JhcFZhbHVlKGtleSwgdmFsdWUpO1xuICB9XG5cbiAgcmV0dXJuIF9PYnNlcnZhYmxlLk9ic2VydmFibGUuY29tYmluZUxhdGVzdCh2YWx1ZXMsIGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4pLCBfa2V5ID0gMDsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgYXJnc1tfa2V5XSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICB9XG5cbiAgICB2YXIgbmV3T2JqIC8qOiBPYmplY3QqLyA9IHt9O1xuICAgIGkgPSAtMTtcblxuICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgIHZhciBfa2V5MiAvKjogc3RyaW5nKi8gPSBrZXlzW2ldO1xuICAgICAgbmV3T2JqW19rZXkyXSA9IGFyZ3NbaV07XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld09iajtcbiAgfSk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5jcmVhdGVPYnNlcnZhYmxlRnJvbUFycmF5ID0gY3JlYXRlT2JzZXJ2YWJsZUZyb21BcnJheTtcblxudmFyIF9PYnNlcnZhYmxlID0gcmVxdWlyZSgncnhqcy9PYnNlcnZhYmxlJyk7XG5cbnZhciBfYXNPYnNlcnZhYmxlID0gcmVxdWlyZSgnLi9hc09ic2VydmFibGUnKTtcblxucmVxdWlyZSgncnhqcy9hZGQvb2JzZXJ2YWJsZS9vZicpO1xuXG5yZXF1aXJlKCdyeGpzL2FkZC9vYnNlcnZhYmxlL2NvbWJpbmVMYXRlc3QnKTtcblxuZnVuY3Rpb24gX3RvQ29uc3VtYWJsZUFycmF5KGFycikgeyBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7IGZvciAodmFyIGkgPSAwLCBhcnIyID0gQXJyYXkoYXJyLmxlbmd0aCk7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHsgYXJyMltpXSA9IGFycltpXTsgfSByZXR1cm4gYXJyMjsgfSBlbHNlIHsgcmV0dXJuIEFycmF5LmZyb20oYXJyKTsgfSB9IC8qIEBmbG93ICovXG5cbmZ1bmN0aW9uIGNyZWF0ZU9ic2VydmFibGVGcm9tQXJyYXkoYXJyIC8qOiBBcnJheTxhbnk+Ki8pIC8qOiBPYnNlcnZhYmxlPEFycmF5PGFueT4+Ki8ge1xuICBpZiAoYXJyLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBfT2JzZXJ2YWJsZS5PYnNlcnZhYmxlLm9mKGFycik7XG4gIH1cblxuICB2YXIgb2JzZXJ2YWJsZXMgLyo6IEFycmF5PE9ic2VydmFibGU+Ki8gPSBhcnIubWFwKF9hc09ic2VydmFibGUuYXNPYnNlcnZhYmxlKTtcblxuICByZXR1cm4gX09ic2VydmFibGUuT2JzZXJ2YWJsZS5jb21iaW5lTGF0ZXN0LmFwcGx5KF9PYnNlcnZhYmxlLk9ic2VydmFibGUsIF90b0NvbnN1bWFibGVBcnJheShvYnNlcnZhYmxlcykpO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuY3JlYXRlUGF0Y2hDaGlsZHJlbiA9IHVuZGVmaW5lZDtcblxudmFyIF9kaWZ0ID0gcmVxdWlyZSgnZGlmdCcpO1xuXG52YXIgX2RpZnQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfZGlmdCk7XG5cbnZhciBfa2V5SW5kZXggPSByZXF1aXJlKCcuL2tleUluZGV4Jyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbi8qIEBmbG93ICovXG5cbi8qOjogaW1wb3J0IHR5cGUge1ZpcnR1YWxFbGVtZW50LCBOb2RlUHJveHlEZWNvcmF0b3J9IGZyb20gJy4vdHlwZXMnKi9cblxuXG52YXIga2V5Rm4gLyo6IEZ1bmN0aW9uKi8gPSBmdW5jdGlvbiBrZXlGbihhKSB7XG4gIHJldHVybiBhLmtleTtcbn07XG5cbnZhciBwYXRjaCA9IGZ1bmN0aW9uIHBhdGNoKGRlY29yYXRvciAvKjogTm9kZVByb3h5RGVjb3JhdG9yKi8sIHByZXZpb3VzQ2hpbGRyZW4gLyo6IEFycmF5PFZpcnR1YWxFbGVtZW50PiovLCBuZXh0Q2hpbGRyZW4gLyo6IEFycmF5PFZpcnR1YWxFbGVtZW50PiovKSAvKjogdm9pZCovIHtcbiAgdmFyIHByZXZpb3VzSW5kZXggPSAoMCwgX2tleUluZGV4LmtleUluZGV4KShwcmV2aW91c0NoaWxkcmVuKTtcbiAgdmFyIG5leHRJbmRleCA9ICgwLCBfa2V5SW5kZXgua2V5SW5kZXgpKG5leHRDaGlsZHJlbik7XG5cbiAgZnVuY3Rpb24gYXBwbHkodHlwZSAvKjogbnVtYmVyKi8sIHByZXZpb3VzIC8qOiBPYmplY3QqLywgbmV4dCAvKjogT2JqZWN0Ki8sIGluZGV4IC8qOiBudW1iZXIqLykgLyo6IHZvaWQqLyB7XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICBjYXNlIF9kaWZ0LkNSRUFURTpcbiAgICAgICAgZGVjb3JhdG9yLmluc2VydENoaWxkKG5leHQudm5vZGUsIGluZGV4KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIF9kaWZ0LlVQREFURTpcbiAgICAgICAgZGVjb3JhdG9yLnVwZGF0ZUNoaWxkKHByZXZpb3VzLnZub2RlLCBuZXh0LnZub2RlLCBpbmRleCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBfZGlmdC5NT1ZFOlxuICAgICAgICBkZWNvcmF0b3IubW92ZUNoaWxkKHByZXZpb3VzLnZub2RlLCBuZXh0LnZub2RlLCBpbmRleCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBfZGlmdC5SRU1PVkU6XG4gICAgICAgIGRlY29yYXRvci5yZW1vdmVDaGlsZChwcmV2aW91cy52bm9kZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuXG4gICgwLCBfZGlmdDIuZGVmYXVsdCkocHJldmlvdXNJbmRleCwgbmV4dEluZGV4LCBhcHBseSwga2V5Rm4pO1xufTtcblxudmFyIGNyZWF0ZVBhdGNoQ2hpbGRyZW4gPSBleHBvcnRzLmNyZWF0ZVBhdGNoQ2hpbGRyZW4gPSBmdW5jdGlvbiBjcmVhdGVQYXRjaENoaWxkcmVuKGRlY29yYXRvciAvKjogTm9kZVByb3h5RGVjb3JhdG9yKi8pIC8qOiBGdW5jdGlvbiovIHtcbiAgdmFyIHByZXZpb3VzIC8qOiBBcnJheTxWaXJ0dWFsRWxlbWVudD4qLyA9IFtdO1xuXG4gIHJldHVybiBmdW5jdGlvbiAobmV4dCAvKjogQXJyYXk8VmlydHVhbEVsZW1lbnQ+Ki8pIC8qOiBBcnJheTxWaXJ0dWFsRWxlbWVudD4qLyB7XG4gICAgaWYgKHByZXZpb3VzLmxlbmd0aCAhPT0gMCB8fCBuZXh0Lmxlbmd0aCAhPT0gMCkge1xuICAgICAgcGF0Y2goZGVjb3JhdG9yLCBwcmV2aW91cywgbmV4dCk7XG4gICAgfVxuXG4gICAgcHJldmlvdXMgPSBuZXh0O1xuICAgIHJldHVybiBuZXh0O1xuICB9O1xufTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmNyZWF0ZVBhdGNoUHJvcGVydGllcyA9IGNyZWF0ZVBhdGNoUHJvcGVydGllcztcbi8qIEBmbG93ICovXG5cbi8qOjogaW1wb3J0IHR5cGUge05vZGVQcm94eX0gZnJvbSAnLi9Ob2RlUHJveHknKi9cblxuXG5mdW5jdGlvbiBwYXRjaFByb3BlcnRpZXMobm9kZVByb3h5IC8qOiBOb2RlUHJveHkqLywgcHJvcHMgLyo6IE9iamVjdCovLCBvbGRQcm9wcyAvKjogT2JqZWN0Ki8pIC8qOiBPYmplY3QqLyB7XG4gIGZvciAodmFyIGtleSBpbiBwcm9wcykge1xuICAgIGlmIChwcm9wc1trZXldICE9PSBvbGRQcm9wc1trZXldKSB7XG4gICAgICBub2RlUHJveHkuc2V0QXR0cmlidXRlKGtleSwgcHJvcHNba2V5XSk7XG4gICAgfVxuICB9XG5cbiAgZm9yICh2YXIgX2tleSBpbiBvbGRQcm9wcykge1xuICAgIGlmICghKF9rZXkgaW4gcHJvcHMpKSB7XG4gICAgICBub2RlUHJveHkucmVtb3ZlQXR0cmlidXRlKF9rZXkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwcm9wcztcbn1cblxuZnVuY3Rpb24gY3JlYXRlUGF0Y2hQcm9wZXJ0aWVzKG5vZGVQcm94eSAvKjogTm9kZVByb3h5Ki8pIC8qOiBGdW5jdGlvbiovIHtcbiAgdmFyIHByZXZpb3VzIC8qOiBPYmplY3QqLyA9IHt9O1xuXG4gIHJldHVybiBmdW5jdGlvbiAobmV4dCAvKjogT2JqZWN0Ki8pIC8qOiB2b2lkKi8ge1xuICAgIHByZXZpb3VzID0gcGF0Y2hQcm9wZXJ0aWVzKG5vZGVQcm94eSwgbmV4dCwgcHJldmlvdXMpO1xuICB9O1xufSIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuLyogQGZsb3cgKi9cblxudmFyIGVtcHR5T2JqZWN0ID0gZXhwb3J0cy5lbXB0eU9iamVjdCA9IE9iamVjdC5mcmVlemUoe30pOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGV4cG9ydHMuYWRkRXZlbnRMaXN0ZW5lciA9IHVuZGVmaW5lZDtcblxudmFyIF9kb21EZWxlZ2F0b3IgPSByZXF1aXJlKCdkb20tZGVsZWdhdG9yJyk7XG5cbnZhciBfZG9tRGVsZWdhdG9yMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2RvbURlbGVnYXRvcik7XG5cbnZhciBfZG9tRGVsZWdhdG9yMyA9IHJlcXVpcmUoJ2RvbS1kZWxlZ2F0b3IvZG9tLWRlbGVnYXRvcicpO1xuXG52YXIgX2RvbURlbGVnYXRvcjQgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9kb21EZWxlZ2F0b3IzKTtcblxudmFyIF9ldmVudHNMaXN0ID0gcmVxdWlyZSgnLi9ldmVudHNMaXN0Jyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbnZhciBkZWxlZ2F0b3IgLyo6IERvbURlbGVnYXRvciovID0gKDAsIF9kb21EZWxlZ2F0b3IyLmRlZmF1bHQpKCk7IC8qIEBmbG93ICovXG5cbnZhciBsZW4gLyo6IG51bWJlciovID0gX2V2ZW50c0xpc3QuZXZlbnRzTGlzdC5sZW5ndGg7XG52YXIgaSAvKjogbnVtYmVyKi8gPSAtMTtcblxud2hpbGUgKCsraSA8IGxlbikge1xuICB2YXIgZXZlbnQgLyo6IHN0cmluZyovID0gX2V2ZW50c0xpc3QuZXZlbnRzTGlzdFtpXS50b0xvd2VyQ2FzZSgpO1xuICBkZWxlZ2F0b3IubGlzdGVuVG8oZXZlbnQpO1xufVxuXG52YXIgYWRkRXZlbnRMaXN0ZW5lciA9IGV4cG9ydHMuYWRkRXZlbnRMaXN0ZW5lciA9IGRlbGVnYXRvci5hZGRFdmVudExpc3RlbmVyLmJpbmQoZGVsZWdhdG9yKTtcbnZhciByZW1vdmVFdmVudExpc3RlbmVyID0gZXhwb3J0cy5yZW1vdmVFdmVudExpc3RlbmVyID0gZGVsZWdhdG9yLnJlbW92ZUV2ZW50TGlzdGVuZXIuYmluZChkZWxlZ2F0b3IpOyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuLyogQGZsb3cgKi9cblxudmFyIGV2ZW50c0xpc3QgLyo6IEFycmF5PHN0cmluZz4qLyA9IGV4cG9ydHMuZXZlbnRzTGlzdCA9IFtcIkFib3J0XCIsIFwiQmx1clwiLCBcIkNhbmNlbFwiLCBcIkNhblBsYXlcIiwgXCJDYW5QbGF5VGhyb3VnaFwiLCBcIkNoYW5nZVwiLCBcIkNsaWNrXCIsIFwiQ29tcG9zaXRpb25TdGFydFwiLCBcIkNvbXBvc2l0aW9uVXBkYXRlXCIsIFwiQ29tcG9zaXRpb25FbmRcIiwgXCJDb250ZXh0TWVudVwiLCBcIkNvcHlcIiwgXCJDdWVDaGFuZ2VcIiwgXCJDdXRcIiwgXCJEYmxDbGlja1wiLCBcIkRyYWdcIiwgXCJEcmFnRW5kXCIsIFwiRHJhZ0V4aXRcIiwgXCJEcmFnRW50ZXJcIiwgXCJEcmFnTGVhdmVcIiwgXCJEcmFnT3ZlclwiLCBcIkRyYWdTdGFydFwiLCBcIkRyb3BcIiwgXCJEdXJhdGlvbkNoYW5nZVwiLCBcIkVtcHRpZWRcIiwgXCJFbmNyeXB0ZWRcIiwgXCJFbmRlZFwiLCBcIkVycm9yXCIsIFwiRm9jdXNcIiwgXCJGb2N1c0luXCIsIFwiRm9jdXNPdXRcIiwgXCJJbnB1dFwiLCBcIkludmFsaWRcIiwgXCJLZXlEb3duXCIsIFwiS2V5UHJlc3NcIiwgXCJLZXlVcFwiLCBcIkxvYWRcIiwgXCJMb2FkZWREYXRhXCIsIFwiTG9hZGVkTWV0YURhdGFcIiwgXCJMb2FkU3RhcnRcIiwgXCJNb3VzZURvd25cIiwgXCJNb3VzZUVudGVyXCIsIFwiTW91c2VMZWF2ZVwiLCBcIk1vdXNlTW92ZVwiLCBcIk1vdXNlT3V0XCIsIFwiTW91c2VPdmVyXCIsIFwiTW91c2VVcFwiLCBcIlBhc3RlXCIsIFwiUGF1c2VcIiwgXCJQbGF5XCIsIFwiUGxheWluZ1wiLCBcIlByb2dyZXNzXCIsIFwiUmF0ZUNoYW5nZVwiLCBcIlJlc2V0XCIsIFwiUmVzaXplXCIsIFwiU2Nyb2xsXCIsIFwiU2VhcmNoXCIsIFwiU2Vla2VkXCIsIFwiU2Vla2luZ1wiLCBcIlNlbGVjdFwiLCBcIlNob3dcIiwgXCJTdGFsbGVkXCIsIFwiU3VibWl0XCIsIFwiU3VzcGVuZFwiLCBcIlRpbWVVcGRhdGVcIiwgXCJUb2dnbGVcIiwgXCJUb3VjaENhbmNlbFwiLCBcIlRvdWNoRW5kXCIsIFwiVG91Y2hNb3ZlXCIsIFwiVG91Y2hTdGFydFwiLCBcIlZvbHVtZUNoYW5nZVwiLCBcIldhaXRpbmdcIiwgXCJXaGVlbFwiLFxuXG4vLyBjdXN0b21cblwiTW91bnRcIiwgXCJVbm1vdW50XCJdO1xuXG52YXIgZXZlbnRMaXN0TWFwIC8qOiBPYmplY3QqLyA9IGV4cG9ydHMuZXZlbnRMaXN0TWFwID0gZXZlbnRzTGlzdC5yZWR1Y2UoZnVuY3Rpb24gKGFjYywgZXZlbnQpIHtcbiAgYWNjW1wib25cIiArIGV2ZW50XSA9IHRydWU7XG4gIHJldHVybiBhY2M7XG59LCB7fSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmZsYXR0ZW4gPSBmbGF0dGVuO1xuLyogQGZsb3cgKi9cblxuZnVuY3Rpb24gZmxhdHRlbihhcnIgLyo6IEFycmF5PGFueT4qLykgLyo6IEFycmF5PGFueT4qLyB7XG4gIHZhciBsZW4gLyo6IG51bWJlciovID0gYXJyLmxlbmd0aDtcbiAgdmFyIGkgLyo6IG51bWJlciovID0gLTE7XG4gIHZhciByZXN1bHQgLyo6IEFycmF5PGFueT4qLyA9IFtdO1xuXG4gIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICB2YXIgbWVtYmVyIC8qOiBhbnkqLyA9IGFycltpXTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KG1lbWJlcikpIHtcbiAgICAgIHJlc3VsdCA9IHJlc3VsdC5jb25jYXQoZmxhdHRlbihtZW1iZXIpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnB1c2gobWVtYmVyKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufSIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5nZXQgPSBnZXQ7XG5mdW5jdGlvbiBnZXQob2JqLCBrZXkpIHtcbiAgcmV0dXJuIG9ialtrZXldO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuaCA9IGg7XG5cbnZhciBfVmlydHVhbENvbXBvbmVudCA9IHJlcXVpcmUoJy4vVmlydHVhbENvbXBvbmVudCcpO1xuXG52YXIgX1ZpcnR1YWxOb2RlID0gcmVxdWlyZSgnLi9WaXJ0dWFsTm9kZScpO1xuXG52YXIgX2lzID0gcmVxdWlyZSgnLi9pcycpO1xuXG52YXIgX2ZsYXR0ZW4gPSByZXF1aXJlKCcuL2ZsYXR0ZW4nKTtcblxudmFyIF9lbXB0eU9iamVjdCA9IHJlcXVpcmUoJy4vZW1wdHlPYmplY3QnKTtcblxuLyo6OiBpbXBvcnQgdHlwZSB7VmlydHVhbEVsZW1lbnR9IGZyb20gJy4vdHlwZXMnKi8gLyogQGZsb3cgd2VhayAqL1xuXG5mdW5jdGlvbiBoKHRhZ05hbWUsIF9wcm9wcykgLyo6IFZpcnR1YWxFbGVtZW50Ki8ge1xuICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgX2NoaWxkcmVuID0gQXJyYXkoX2xlbiA+IDIgPyBfbGVuIC0gMiA6IDApLCBfa2V5ID0gMjsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgIF9jaGlsZHJlbltfa2V5IC0gMl0gPSBhcmd1bWVudHNbX2tleV07XG4gIH1cblxuICB2YXIgY2hpbGRyZW4gPSAoMCwgX2ZsYXR0ZW4uZmxhdHRlbikoX2NoaWxkcmVuKTtcbiAgdmFyIHByb3BzID0gX3Byb3BzIHx8IF9lbXB0eU9iamVjdC5lbXB0eU9iamVjdDtcblxuICBpZiAoKDAsIF9pcy5pc1N0cmluZykodGFnTmFtZSkpIHtcbiAgICByZXR1cm4gX1ZpcnR1YWxOb2RlLlZpcnR1YWxOb2RlLmNyZWF0ZSh0YWdOYW1lLCBwcm9wcywgY2hpbGRyZW4pO1xuICB9XG5cbiAgcmV0dXJuIF9WaXJ0dWFsQ29tcG9uZW50LlZpcnR1YWxDb21wb25lbnQuY3JlYXRlKHRhZ05hbWUsIHByb3BzLCBjaGlsZHJlbik7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5yZW5kZXIgPSBleHBvcnRzLmggPSB1bmRlZmluZWQ7XG5cbnZhciBfaCA9IHJlcXVpcmUoJy4vaCcpO1xuXG52YXIgX3JlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyJyk7XG5cbmZ1bmN0aW9uIFlvbGsoKSB7fVxuWW9say5wcm90b3R5cGUgPSB7IGg6IF9oLmgsIHJlbmRlcjogX3JlbmRlci5yZW5kZXIgfTtcblxuZXhwb3J0cy5oID0gX2guaDtcbmV4cG9ydHMucmVuZGVyID0gX3JlbmRlci5yZW5kZXI7XG5leHBvcnRzLmRlZmF1bHQgPSBuZXcgWW9saygpOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuaXNEZWZpbmVkID0gaXNEZWZpbmVkO1xuZXhwb3J0cy5pc0VtcHR5T2JqZWN0ID0gaXNFbXB0eU9iamVjdDtcbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5leHBvcnRzLmlzT2JzZXJ2YWJsZSA9IGlzT2JzZXJ2YWJsZTtcbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcbmV4cG9ydHMuaXNTdWJqZWN0ID0gaXNTdWJqZWN0O1xuZXhwb3J0cy5pc1ZpcnR1YWwgPSBpc1ZpcnR1YWw7XG5cbnZhciBfT2JzZXJ2YWJsZSA9IHJlcXVpcmUoJ3J4anMvT2JzZXJ2YWJsZScpO1xuXG52YXIgX1N1YmplY3QgPSByZXF1aXJlKCdyeGpzL1N1YmplY3QnKTtcblxudmFyIF9zeW1ib2wgPSByZXF1aXJlKCcuL3N5bWJvbCcpO1xuXG5mdW5jdGlvbiBpc0RlZmluZWQob2JqIC8qOiBhbnkqLykgLyo6IGJvb2xlYW4qLyB7XG4gIHJldHVybiB0eXBlb2Ygb2JqICE9PSAndW5kZWZpbmVkJztcbn0gLyogQGZsb3cgKi9cblxuZnVuY3Rpb24gaXNFbXB0eU9iamVjdChvYmogLyo6IGFueSovKSAvKjogYm9vbGVhbiovIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9iaikubGVuZ3RoID09PSAwO1xufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKG9iaiAvKjogYW55Ki8pIC8qOiBib29sZWFuKi8ge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKG9iaiAvKjogYW55Ki8pIC8qOiBib29sZWFuKi8ge1xuICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JzZXJ2YWJsZShvYmogLyo6IGFueSovKSAvKjogYm9vbGVhbiovIHtcbiAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIF9PYnNlcnZhYmxlLk9ic2VydmFibGU7XG59XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKG9iaiAvKjogYW55Ki8pIC8qOiBib29sZWFuKi8ge1xuICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ3N0cmluZyc7XG59XG5cbmZ1bmN0aW9uIGlzU3ViamVjdChvYmogLyo6IGFueSovKSAvKjogYm9vbGVhbiovIHtcbiAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIF9TdWJqZWN0LlN1YmplY3Q7XG59XG5cbmZ1bmN0aW9uIGlzVmlydHVhbChvYmogLyo6IGFueSovKSAvKjogYm9vbGVhbiovIHtcbiAgcmV0dXJuICEhb2JqICYmIG9ialtfc3ltYm9sLiQkdmlydHVhbF07XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5rZXlJbmRleCA9IGtleUluZGV4O1xuLyogQGZsb3cgKi9cblxuLyo6OiBpbXBvcnQgdHlwZSB7VmlydHVhbE5vZGV9IGZyb20gJy4vVmlydHVhbE5vZGUnKi9cbmZ1bmN0aW9uIGtleUluZGV4KGNoaWxkcmVuIC8qOiBBcnJheTxWaXJ0dWFsTm9kZT4qLykgLyo6IEFycmF5PE9iamVjdD4qLyB7XG4gIHZhciBsZW4gLyo6IG51bWJlciovID0gY2hpbGRyZW4ubGVuZ3RoO1xuICB2YXIgYXJyIC8qOiBBcnJheTxPYmplY3Q+Ki8gPSBbXTtcbiAgdmFyIGkgLyo6IG51bWJlciovID0gLTE7XG5cbiAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgIHZhciBjaGlsZCAvKjogVmlydHVhbE5vZGUqLyA9IGNoaWxkcmVuW2ldO1xuXG4gICAgaWYgKCFjaGlsZCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgYXJyLnB1c2goe1xuICAgICAga2V5OiBjaGlsZC5rZXkgPyBjaGlsZC50YWdOYW1lICsgJy0nICsgY2hpbGQua2V5IDogY2hpbGQudGFnTmFtZSxcbiAgICAgIHZub2RlOiBjaGlsZFxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGFycjtcbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmVtaXRNb3VudCA9IGVtaXRNb3VudDtcbmV4cG9ydHMuZW1pdFVubW91bnQgPSBlbWl0VW5tb3VudDtcblxudmFyIF9DdXN0b21FdmVudCA9IHJlcXVpcmUoJy4vQ3VzdG9tRXZlbnQnKTtcblxudmFyIF9pcyA9IHJlcXVpcmUoJy4vaXMnKTtcblxuLyogQGZsb3cgKi9cblxuZnVuY3Rpb24gZW1pdE1vdW50KG5vZGUgLyo6IEhUTUxFbGVtZW50Ki8sIGZuIC8qOiBGdW5jdGlvbiB8IHZvaWQqLykgLyo6IHZvaWQqLyB7XG4gIGlmICgoKDAsIF9pcy5pc0Z1bmN0aW9uKShmbikgfHwgKDAsIF9pcy5pc1N1YmplY3QpKGZuKSkgJiYgbm9kZS5wYXJlbnROb2RlKSB7XG4gICAgdmFyIGV2ZW50IC8qOiBDdXN0b21FdmVudCovID0gbmV3IF9DdXN0b21FdmVudC5DdXN0b21FdmVudCgnbW91bnQnKTtcbiAgICBub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVtaXRVbm1vdW50KG5vZGUgLyo6IEhUTUxFbGVtZW50Ki8sIGZuIC8qOiBGdW5jdGlvbiB8IHZvaWQqLykgLyo6IHZvaWQqLyB7XG4gIGlmICgoKDAsIF9pcy5pc0Z1bmN0aW9uKShmbikgfHwgKDAsIF9pcy5pc1N1YmplY3QpKGZuKSkgJiYgbm9kZS5wYXJlbnROb2RlKSB7XG4gICAgdmFyIGV2ZW50IC8qOiBDdXN0b21FdmVudCovID0gbmV3IF9DdXN0b21FdmVudC5DdXN0b21FdmVudCgndW5tb3VudCcpO1xuICAgIG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gIH1cbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnBhcnNlVGFnID0gcGFyc2VUYWc7XG5cbnZhciBfcGFyc2VUYWcgPSByZXF1aXJlKCdwYXJzZS10YWcnKTtcblxudmFyIF9wYXJzZVRhZzIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9wYXJzZVRhZyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbnZhciBUQUdfSVNfT05MWV9MRVRURVJTID0gL15bYS16QS1aXSokLztcblxuZnVuY3Rpb24gcGFyc2VUYWcoX3RhZ05hbWUsIHByb3BzKSB7XG4gIHZhciB0YWdOYW1lID0gX3RhZ05hbWU7XG5cbiAgaWYgKCFUQUdfSVNfT05MWV9MRVRURVJTLnRlc3QodGFnTmFtZSkpIHtcbiAgICB0YWdOYW1lID0gKDAsIF9wYXJzZVRhZzIuZGVmYXVsdCkoX3RhZ05hbWUsIHByb3BzKS50b0xvd2VyQ2FzZSgpO1xuICB9XG5cbiAgcmV0dXJuIHRhZ05hbWU7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZXNjcmlwdG9ycyA9IHVuZGVmaW5lZDtcblxudmFyIF9ldmVudHNMaXN0ID0gcmVxdWlyZSgnLi9ldmVudHNMaXN0Jyk7XG5cbnZhciBIQVNfTE9XRVJfQ0FTRSAvKjogbnVtYmVyKi8gPSAweDE7IC8vIHRyYW5zZm9ybSBrZXkgdG8gYWxsIGxvd2VyY2FzZVxuLyogQGZsb3cgKi9cblxudmFyIEhBU19EQVNIRURfQ0FTRSAvKjogbnVtYmVyKi8gPSAweDI7IC8vIHRyYW5zZm9ybSBrZXkgdG8gZGFzaGVkIGNhc2VcbnZhciBIQVNfRVZFTlRfQ0FTRSAvKjogbnVtYmVyKi8gPSAweDQ7IC8vIHRyYW5zZm9ybSBrZXkgZnJvbSBvbkNsaWNrIHRvIGNsaWNrXG52YXIgVVNFX0VRVUFMX1NFVFRFUiAvKjogbnVtYmVyKi8gPSAweDg7IC8vIHByb3BzIG9ubHkgc2V0dGFibGUgd2l0aCA9XG52YXIgVVNFX1NFVF9BVFRSSUJVVEUgLyo6IG51bWJlciovID0gMHgxMDsgLy8gcHJvcHMgb25seSBzZXR0YWJsZSB3aXRoIHNldEF0dHJpYnV0ZVxudmFyIFVTRV9FVkVOVF9MSVNURU5FUiAvKjogbnVtYmVyKi8gPSAweDIwOyAvLyBwcm9wcyBvbmx5IHNldHRhYmxlIHdpdGggYWRkRXZlbnRMaXN0ZW5lclxudmFyIEhBU19CT09MRUFOX1ZBTFVFIC8qOiBudW1iZXIqLyA9IDB4NDA7IC8vIHByb3BzIGNhbiBvbmx5IGJlIGJvb2xlYW5zXG52YXIgSEFTX05VTUJFUl9WQUxVRSAvKjogbnVtYmVyKi8gPSAweDgwOyAvLyBwcm9wcyBjYW4gb25seSBiZSBudW1iZXJzXG52YXIgSVNfU1RBUiAvKjogbnVtYmVyKi8gPSAweDEwMDsgLy8gcHJvcHMgY2FuIGJlIGFueSBkYXNoZWQgY2FzZSwgZS5nLiBkYXRhLSpcblxudmFyIERBU0hFRF9DQVNFX1JFR0VYIC8qOiBSZWdFeHAqLyA9IC8oPzpeXFx3fFtBLVpdfFxcYlxcd3xcXHMrKS9nO1xuXG5mdW5jdGlvbiBjaGVja01hc2sodmFsdWUgLyo6IG51bWJlciovLCBiaXRtYXNrIC8qOiBudW1iZXIqLykgLyo6IGJvb2xlYW4qLyB7XG4gIHJldHVybiAodmFsdWUgJiBiaXRtYXNrKSA9PT0gYml0bWFzaztcbn1cblxuZnVuY3Rpb24gbWFrZURhc2hlZENhc2UobGV0dGVyIC8qOiBzdHJpbmcqLywgaSAvKjogbnVtYmVyKi8pIC8qOiBzdHJpbmcqLyB7XG4gIGlmICgrbGV0dGVyID09PSAwKSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgaWYgKGkgPT09IDApIHtcbiAgICByZXR1cm4gbGV0dGVyLnRvTG93ZXJDYXNlKCk7XG4gIH1cblxuICByZXR1cm4gJy0nICsgbGV0dGVyLnRvTG93ZXJDYXNlKCk7XG59XG5cbmZ1bmN0aW9uIGNvbXB1dGVOYW1lKG5hbWUgLyo6IHN0cmluZyovLCBoYXNMb3dlckNhc2UgLyo6IGJvb2xlYW4qLywgaGFzRGFzaGVkQ2FzZSAvKjogYm9vbGVhbiovLCBoYXNFdmVudENhc2UgLyo6IGJvb2xlYW4qLykgLyo6IHN0cmluZyovIHtcbiAgaWYgKGhhc0xvd2VyQ2FzZSkge1xuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKCk7XG4gIH0gZWxzZSBpZiAoaGFzRGFzaGVkQ2FzZSkge1xuICAgIHJldHVybiBuYW1lLnJlcGxhY2UoREFTSEVEX0NBU0VfUkVHRVgsIG1ha2VEYXNoZWRDYXNlKTtcbiAgfSBlbHNlIGlmIChoYXNFdmVudENhc2UpIHtcbiAgICByZXR1cm4gbmFtZS5zdWJzdHIoMikudG9Mb3dlckNhc2UoKTtcbiAgfVxuXG4gIHJldHVybiBuYW1lO1xufVxuXG52YXIgcHJvcHMgLyo6IE9iamVjdCovID0ge1xuICBhY2NlcHQ6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGFjY2VwdENoYXJzZXQ6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfREFTSEVEX0NBU0UsXG4gIGFjY2Vzc0tleTogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICBhY3Rpb246IFVTRV9FUVVBTF9TRVRURVIsXG4gIGFsaWduOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBhbHQ6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGFzeW5jOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIGF1dG9Db21wbGV0ZTogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICBhdXRvRm9jdXM6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBhdXRvUGxheTogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIGF1dG9TYXZlOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGJnQ29sb3I6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgYm9yZGVyOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBjaGVja2VkOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIGNpdGU6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGNsYXNzTmFtZTogVVNFX0VRVUFMX1NFVFRFUixcbiAgY29sb3I6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGNvbFNwYW46IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgY29udGVudDogVVNFX0VRVUFMX1NFVFRFUixcbiAgY29udGVudEVkaXRhYmxlOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgY29udHJvbHM6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgY29vcmRzOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBkZWZhdWx0OiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIGRlZmVyOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIGRpcjogVVNFX0VRVUFMX1NFVFRFUixcbiAgZGlyTmFtZTogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICBkaXNhYmxlZDogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBkcmFnZ2FibGU6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgZHJvcFpvbmU6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgZW5jVHlwZTogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICBmb3I6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGhlYWRlcnM6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGhlaWdodDogVVNFX0VRVUFMX1NFVFRFUixcbiAgaHJlZjogVVNFX0VRVUFMX1NFVFRFUixcbiAgaHJlZkxhbmc6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgaHR0cEVxdWl2OiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0RBU0hFRF9DQVNFLFxuICBpY29uOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBpZDogVVNFX0VRVUFMX1NFVFRFUixcbiAgaXNNYXA6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBpdGVtUHJvcDogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICBrZXlUeXBlOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGtpbmQ6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGxhYmVsOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBsYW5nOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBsb29wOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIG1heDogVVNFX0VRVUFMX1NFVFRFUixcbiAgbWV0aG9kOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBtaW46IFVTRV9FUVVBTF9TRVRURVIsXG4gIG11bHRpcGxlOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIG5hbWU6IFVTRV9FUVVBTF9TRVRURVIsXG4gIG5vVmFsaWRhdGU6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBvcGVuOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIG9wdGltdW06IFVTRV9FUVVBTF9TRVRURVIsXG4gIHBhdHRlcm46IFVTRV9FUVVBTF9TRVRURVIsXG4gIHBpbmc6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHBsYWNlaG9sZGVyOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBwb3N0ZXI6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHByZWxvYWQ6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHJhZGlvR3JvdXA6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgcmVhZE9ubHk6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICByZWw6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHJlcXVpcmVkOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIHJldmVyc2VkOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIHJvbGU6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHJvd1NwYW46IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSB8IEhBU19OVU1CRVJfVkFMVUUsXG4gIHNhbmRib3g6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHNjb3BlOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBzZWFtbGVzczogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBzZWxlY3RlZDogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBzcGFuOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX05VTUJFUl9WQUxVRSxcbiAgc3JjOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBzcmNEb2M6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgc3JjTGFuZzogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICBzdGFydDogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19OVU1CRVJfVkFMVUUsXG4gIHN0ZXA6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHN1bW1hcnk6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHRhYkluZGV4OiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIHRhcmdldDogVVNFX0VRVUFMX1NFVFRFUixcbiAgdGl0bGU6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHR5cGU6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHVzZU1hcDogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICB2YWx1ZTogVVNFX0VRVUFMX1NFVFRFUixcbiAgd2lkdGg6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHdyYXA6IFVTRV9FUVVBTF9TRVRURVIsXG5cbiAgYWxsb3dGdWxsU2NyZWVuOiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19MT1dFUl9DQVNFIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIGFsbG93VHJhbnNwYXJlbmN5OiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19MT1dFUl9DQVNFLFxuICBjYXB0dXJlOiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBjaGFyc2V0OiBVU0VfU0VUX0FUVFJJQlVURSxcbiAgY2hhbGxlbmdlOiBVU0VfU0VUX0FUVFJJQlVURSxcbiAgY29kZUJhc2U6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGNvbHM6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX05VTUJFUl9WQUxVRSxcbiAgY29udGV4dE1lbnU6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGRhdGVUaW1lOiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19MT1dFUl9DQVNFLFxuICBmb3JtOiBVU0VfU0VUX0FUVFJJQlVURSxcbiAgZm9ybUFjdGlvbjogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgZm9ybUVuY1R5cGU6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGZvcm1NZXRob2Q6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGZvcm1UYXJnZXQ6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGZyYW1lQm9yZGVyOiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19MT1dFUl9DQVNFLFxuICBoaWRkZW46IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIGlucHV0TW9kZTogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgaXM6IFVTRV9TRVRfQVRUUklCVVRFLFxuICBsaXN0OiBVU0VfU0VUX0FUVFJJQlVURSxcbiAgbWFuaWZlc3Q6IFVTRV9TRVRfQVRUUklCVVRFLFxuICBtYXhMZW5ndGg6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0xPV0VSX0NBU0UsXG4gIG1lZGlhOiBVU0VfU0VUX0FUVFJJQlVURSxcbiAgbWluTGVuZ3RoOiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19MT1dFUl9DQVNFLFxuICByb3dzOiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19OVU1CRVJfVkFMVUUsXG4gIHNpemU6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX05VTUJFUl9WQUxVRSxcbiAgc2l6ZXM6IFVTRV9TRVRfQVRUUklCVVRFLFxuICBzcmNTZXQ6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0xPV0VSX0NBU0UsXG4gIHN0eWxlOiBVU0VfU0VUX0FUVFJJQlVURSxcblxuICBhcmlhOiBJU19TVEFSLFxuICBkYXRhOiBJU19TVEFSXG59O1xuXG5fZXZlbnRzTGlzdC5ldmVudHNMaXN0LmZvckVhY2goZnVuY3Rpb24gKGV2ZW50KSB7XG4gIHByb3BzWydvbicgKyBldmVudF0gPSBVU0VfRVZFTlRfTElTVEVORVIgfCBIQVNfRVZFTlRfQ0FTRTtcbn0pO1xuXG52YXIgZGVzY3JpcHRvcnMgLyo6IE9iamVjdCovID0ge307XG52YXIga2V5cyAvKjogQXJyYXk8c3RyaW5nPiovID0gT2JqZWN0LmtleXMocHJvcHMpO1xudmFyIGxlbiAvKjogbnVtYmVyKi8gPSBrZXlzLmxlbmd0aDtcbnZhciBpIC8qOiBudW1iZXIqLyA9IC0xO1xuXG53aGlsZSAoKytpIDwgbGVuKSB7XG4gIHZhciBrZXkgLyo6IHN0cmluZyovID0ga2V5c1tpXTtcbiAgdmFyIHByb3AgLyo6IG51bWJlciovID0gcHJvcHNba2V5XTtcbiAgdmFyIGhhc0xvd2VyQ2FzZSAvKjogYm9vbGVhbiovID0gY2hlY2tNYXNrKHByb3AsIEhBU19MT1dFUl9DQVNFKTtcbiAgdmFyIGhhc0Rhc2hlZENhc2UgLyo6IGJvb2xlYW4qLyA9IGNoZWNrTWFzayhwcm9wLCBIQVNfREFTSEVEX0NBU0UpO1xuICB2YXIgaGFzRXZlbnRDYXNlIC8qOiBib29sZWFuKi8gPSBjaGVja01hc2socHJvcCwgSEFTX0VWRU5UX0NBU0UpO1xuICB2YXIgdXNlRXF1YWxTZXR0ZXIgLyo6IGJvb2xlYW4qLyA9IGNoZWNrTWFzayhwcm9wLCBVU0VfRVFVQUxfU0VUVEVSKTtcbiAgdmFyIHVzZVNldEF0dHJpYnV0ZSAvKjogYm9vbGVhbiovID0gY2hlY2tNYXNrKHByb3AsIFVTRV9TRVRfQVRUUklCVVRFKTtcbiAgdmFyIHVzZUV2ZW50TGlzdGVuZXIgLyo6IGJvb2xlYW4qLyA9IGNoZWNrTWFzayhwcm9wLCBVU0VfRVZFTlRfTElTVEVORVIpO1xuICB2YXIgaGFzQm9vbGVhblZhbHVlIC8qOiBib29sZWFuKi8gPSBjaGVja01hc2socHJvcCwgSEFTX0JPT0xFQU5fVkFMVUUpO1xuICB2YXIgaGFzTnVtYmVyVmFsdWUgLyo6IGJvb2xlYW4qLyA9IGNoZWNrTWFzayhwcm9wLCBIQVNfTlVNQkVSX1ZBTFVFKTtcbiAgdmFyIGlzU3RhciAvKjogYm9vbGVhbiovID0gY2hlY2tNYXNrKHByb3AsIElTX1NUQVIpO1xuICB2YXIgY29tcHV0ZWQgLyo6IHN0cmluZyovID0gY29tcHV0ZU5hbWUoa2V5LCBoYXNMb3dlckNhc2UsIGhhc0Rhc2hlZENhc2UsIGhhc0V2ZW50Q2FzZSk7XG5cbiAgZGVzY3JpcHRvcnNba2V5XSA9IHtcbiAgICB1c2VFcXVhbFNldHRlcjogdXNlRXF1YWxTZXR0ZXIsXG4gICAgdXNlU2V0QXR0cmlidXRlOiB1c2VTZXRBdHRyaWJ1dGUsXG4gICAgdXNlRXZlbnRMaXN0ZW5lcjogdXNlRXZlbnRMaXN0ZW5lcixcbiAgICBoYXNCb29sZWFuVmFsdWU6IGhhc0Jvb2xlYW5WYWx1ZSxcbiAgICBoYXNOdW1iZXJWYWx1ZTogaGFzTnVtYmVyVmFsdWUsXG4gICAgaXNTdGFyOiBpc1N0YXIsXG4gICAgY29tcHV0ZWQ6IGNvbXB1dGVkXG4gIH07XG59XG5cbmV4cG9ydHMuZGVzY3JpcHRvcnMgPSBkZXNjcmlwdG9yczsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnJlbmRlciA9IHJlbmRlcjtcblxudmFyIF9iYXRjaEluc2VydE1lc3NhZ2VzID0gcmVxdWlyZSgnLi9iYXRjaEluc2VydE1lc3NhZ2VzJyk7XG5cbnZhciBfTm9kZVByb3h5ID0gcmVxdWlyZSgnLi9Ob2RlUHJveHknKTtcblxudmFyIF9pcyA9IHJlcXVpcmUoJy4vaXMnKTtcblxudmFyIF9zeW1ib2wgPSByZXF1aXJlKCcuL3N5bWJvbCcpO1xuXG52YXIgX3R5cGVzID0gcmVxdWlyZSgnLi90eXBlcycpO1xuXG5mdW5jdGlvbiByZW5kZXIodm5vZGUgLyo6IFZpcnR1YWxFbGVtZW50Ki8sIG5vZGUgLyo6IEhUTUxFbGVtZW50Ki8pIC8qOiB2b2lkKi8ge1xuICB2YXIgY29udGFpbmVyUHJveHkgLyo6IE5vZGVQcm94eSovID0gX05vZGVQcm94eS5Ob2RlUHJveHkuZnJvbUVsZW1lbnQobm9kZSk7XG4gIHZhciBwcmV2aW91cyAvKjogVmlydHVhbEVsZW1lbnQqLyA9IGNvbnRhaW5lclByb3h5LmdldEF0dHJpYnV0ZShfc3ltYm9sLiQkcm9vdCk7XG5cbiAgaWYgKCgwLCBfaXMuaXNEZWZpbmVkKShwcmV2aW91cykpIHtcbiAgICBwcmV2aW91cy5kZXN0cm95KCk7XG4gIH1cblxuICAoMCwgX2JhdGNoSW5zZXJ0TWVzc2FnZXMuYmF0Y2hJbnNlcnRNZXNzYWdlcykoZnVuY3Rpb24gKHF1ZXVlKSB7XG4gICAgdm5vZGUuaW5pdGlhbGl6ZSgpO1xuICAgIGNvbnRhaW5lclByb3h5LnJlcGxhY2VDaGlsZCh2bm9kZS5nZXROb2RlUHJveHkoKSwgMCk7XG4gICAgcXVldWUucHVzaCh2bm9kZSk7XG4gIH0pO1xuXG4gIGNvbnRhaW5lclByb3h5LnNldEF0dHJpYnV0ZShfc3ltYm9sLiQkcm9vdCwgdm5vZGUpO1xufSAvKiBAZmxvdyAqLyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zZXQgPSBzZXQ7XG5mdW5jdGlvbiBzZXQob2JqLCBrZXksIHZhbHVlKSB7XG4gIG9ialtrZXldID0gdmFsdWU7XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG52YXIgX1N5bWJvbCA9IGdsb2JhbC5TeW1ib2w7XG5cbnZhciBzeW1ib2xzID0ge1xuICAkJHZpcnR1YWw6IFwiQEBZT0xLX1ZJUlRVQUxcIixcbiAgJCRjb21wb25lbnRVaWQ6IFwiQEBZT0xLX0NPTVBPTkVOVF9VSURcIixcbiAgJCRyb290OiBcIkBAWU9MS19ST09UXCJcbn07XG5cbmlmICh0eXBlb2YgX1N5bWJvbCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gIGlmICh0eXBlb2YgX1N5bWJvbC5mb3IgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIE9iamVjdC5rZXlzKHN5bWJvbHMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgc3ltYm9sc1trZXldID0gX1N5bWJvbC5mb3Ioc3ltYm9sc1trZXldKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBPYmplY3Qua2V5cyhzeW1ib2xzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIHN5bWJvbHNba2V5XSA9IF9TeW1ib2woc3ltYm9sc1trZXldKTtcbiAgICB9KTtcbiAgfVxufVxuXG52YXIgJCR2aXJ0dWFsID0gc3ltYm9scy4kJHZpcnR1YWw7XG52YXIgJCRjb21wb25lbnRVaWQgPSBzeW1ib2xzLiQkY29tcG9uZW50VWlkO1xudmFyICQkcm9vdCA9IHN5bWJvbHMuJCRyb290O1xuZXhwb3J0cy4kJHZpcnR1YWwgPSAkJHZpcnR1YWw7XG5leHBvcnRzLiQkY29tcG9uZW50VWlkID0gJCRjb21wb25lbnRVaWQ7XG5leHBvcnRzLiQkcm9vdCA9ICQkcm9vdDsiLCIndXNlIHN0cmljdCc7XG5cbi8qOjogaW1wb3J0IHR5cGUge1ZpcnR1YWxOb2RlfSBmcm9tICcuL1ZpcnR1YWxOb2RlJyovXG4vKjo6IGltcG9ydCB0eXBlIHtWaXJ0dWFsQ29tcG9uZW50fSBmcm9tICcuL1ZpcnR1YWxDb21wb25lbnQnKi9cbi8qOjogZXhwb3J0IHR5cGUgVmlydHVhbEVsZW1lbnQgPSBWaXJ0dWFsTm9kZSB8IFZpcnR1YWxDb21wb25lbnQqL1xuLyo6OiBleHBvcnQgdHlwZSBOb2RlUHJveHlEZWNvcmF0b3IgPSB7XG4gIGluc2VydENoaWxkIChjaGlsZDogVmlydHVhbE5vZGUsIGluZGV4OiBudW1iZXIpOiB2b2lkO1xuICB1cGRhdGVDaGlsZCAocHJldmlvdXM6IFZpcnR1YWxOb2RlLCBuZXh0OiBWaXJ0dWFsTm9kZSk6IHZvaWQ7XG4gIG1vdmVDaGlsZCAocHJldmlvdXM6IFZpcnR1YWxOb2RlLCBuZXh0OiBWaXJ0dWFsTm9kZSwgaW5kZXg6IG51bWJlcik6IHZvaWQ7XG4gIHJlbW92ZUNoaWxkIChjaGlsZDogVmlydHVhbE5vZGUpOiB2b2lkO1xufSovIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy53cmFwVGV4dCA9IHdyYXBUZXh0O1xuXG52YXIgX2ggPSByZXF1aXJlKCcuL2gnKTtcblxudmFyIF9WaXJ0dWFsTm9kZSA9IHJlcXVpcmUoJy4vVmlydHVhbE5vZGUnKTtcblxudmFyIF9pcyA9IHJlcXVpcmUoJy4vaXMnKTtcblxuZnVuY3Rpb24gd3JhcChvYmogLyo6IGFueSovKSAvKjogVmlydHVhbE5vZGUqLyB7XG4gIGlmICgoMCwgX2lzLmlzVmlydHVhbCkob2JqKSkge1xuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICByZXR1cm4gKDAsIF9oLmgpKCdzcGFuJywgeyB0ZXh0Q29udGVudDogb2JqLnRvU3RyaW5nKCkgfSk7XG59IC8qIEBmbG93ICovXG5cbmZ1bmN0aW9uIHdyYXBUZXh0KGFyciAvKjogQXJyYXk8YW55PiovKSAvKjogQXJyYXk8VmlydHVhbE5vZGU+Ki8ge1xuICByZXR1cm4gYXJyLm1hcCh3cmFwKTtcbn0iLCJpbXBvcnQge2gsIHJlbmRlcn0gZnJvbSAneW9saydcblxuaW1wb3J0ICdyeGpzL2FkZC9vcGVyYXRvci9tZXJnZSdcbmltcG9ydCAncnhqcy9hZGQvb3BlcmF0b3Ivc2NhbidcbmltcG9ydCAncnhqcy9hZGQvb3BlcmF0b3Ivc3RhcnRXaXRoJ1xuXG5cbmZ1bmN0aW9uIFR5cGVBaGVhZCh7cHJvcHMsIGNoaWxkcmVuLCBjcmVhdGVFdmVudEhhbmRsZXJ9KSB7XG4gIGNvbnN0IHRpdGxlID0gcHJvcHMudGl0bGUubWFwKHRpdGxlID0+IGBBd2Vzb21lICR7dGl0bGV9YClcbiAgY29uc3QgaGFuZGxlUGx1cyA9IGNyZWF0ZUV2ZW50SGFuZGxlcigxKVxuICBjb25zdCBoYW5kbGVNaW51cyA9IGNyZWF0ZUV2ZW50SGFuZGxlcigtMSlcbiAgY29uc3QgY291bnQgPSBoYW5kbGVQbHVzXG4gICAgICAgICAgICAgICAgLm1lcmdlKGhhbmRsZU1pbnVzKVxuICAgICAgICAgICAgICAgIC5zY2FuKCh4LCB5KSA9PiB4ICsgeSlcbiAgICAgICAgICAgICAgICAuc3RhcnRXaXRoKDApXG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2PlxuICAgICAgPGgxPnt0aXRsZX08L2gxPlxuICAgICAgPGRpdj5cbiAgICAgICAgPGJ1dHRvbiBpZD1cInBsdXNcIiBvbkNsaWNrPXtoYW5kbGVQbHVzfT4rPC9idXR0b24+XG4gICAgICAgIDxidXR0b24gaWQ9XCJtaW51c1wiIG9uQ2xpY2s9e2hhbmRsZU1pbnVzfT4tPC9idXR0b24+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXY+XG4gICAgICAgIDxzcGFuPkNvdW50OiB7Y291bnR9PC9zcGFuPlxuICAgICAgPC9kaXY+XG4gICAgICB7Y2hpbGRyZW59XG4gICAgPC9kaXY+XG4gIClcbn1cblxucmVuZGVyKFxuICA8VHlwZUFoZWFkIHRpdGxlPVwiVHlwZUFoZWFkXCI+VHlwZSBhaGVhZCBteSBnb29kIGZyaWVuZDwvVHlwZUFoZWFkPixcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbnRhaW5lcicpXG4pXG4iXX0=
