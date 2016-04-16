(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var toType = function(val) {
  var str = ({}).toString.call(val);
  return str.toLowerCase().slice(8, -1);
};

var checkArgTypes = function(args, types) {
  args = Array.prototype.slice.call(args);
  
  var len = args.length;
  var x = 0;
  var givenType;
  var expectedType;

  while (x < len) {
    givenType = toType(args[x]);
    expectedType = types[x];
    
    if (givenType !== expectedType) {
      throw new TypeError("Expected '"+expectedType+"' given '"+givenType+"' for argument at index "+x);
    }

    x++;
  }
};

checkArgTypes.prototype.toType = toType;

module.exports = checkArgTypes;

},{}],2:[function(require,module,exports){
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

},{"./Subject":7,"./util/ObjectUnsubscribedError":43,"./util/throwError":53}],3:[function(require,module,exports){
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

},{"./Subscriber":9}],4:[function(require,module,exports){
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

},{"./symbol/observable":41,"./util/root":51,"./util/toSubscriber":54}],5:[function(require,module,exports){
"use strict";
exports.empty = {
    isUnsubscribed: true,
    next: function (value) { },
    error: function (err) { throw err; },
    complete: function () { }
};

},{}],6:[function(require,module,exports){
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

},{"./Subscriber":9}],7:[function(require,module,exports){
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

},{"./Observable":4,"./SubjectSubscription":8,"./Subscriber":9,"./Subscription":10,"./symbol/rxSubscriber":42,"./util/ObjectUnsubscribedError":43,"./util/throwError":53}],8:[function(require,module,exports){
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

},{"./Subscription":10}],9:[function(require,module,exports){
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

},{"./Observer":5,"./Subscription":10,"./symbol/rxSubscriber":42,"./util/isFunction":47}],10:[function(require,module,exports){
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

},{"./util/UnsubscriptionError":44,"./util/errorObject":45,"./util/isArray":46,"./util/isFunction":47,"./util/isObject":48,"./util/tryCatch":55}],11:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var combineLatest_1 = require('../../operator/combineLatest');
Observable_1.Observable.combineLatest = combineLatest_1.combineLatestStatic;

},{"../../Observable":4,"../../operator/combineLatest":27}],12:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var of_1 = require('../../observable/of');
Observable_1.Observable.of = of_1.of;

},{"../../Observable":4,"../../observable/of":26}],13:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var filter_1 = require('../../operator/filter');
Observable_1.Observable.prototype.filter = filter_1.filter;

},{"../../Observable":4,"../../operator/filter":29}],14:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var map_1 = require('../../operator/map');
Observable_1.Observable.prototype.map = map_1.map;

},{"../../Observable":4,"../../operator/map":30}],15:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var mapTo_1 = require('../../operator/mapTo');
Observable_1.Observable.prototype.mapTo = mapTo_1.mapTo;

},{"../../Observable":4,"../../operator/mapTo":31}],16:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var merge_1 = require('../../operator/merge');
Observable_1.Observable.prototype.merge = merge_1.merge;

},{"../../Observable":4,"../../operator/merge":32}],17:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var scan_1 = require('../../operator/scan');
Observable_1.Observable.prototype.scan = scan_1.scan;

},{"../../Observable":4,"../../operator/scan":35}],18:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var share_1 = require('../../operator/share');
Observable_1.Observable.prototype.share = share_1.share;

},{"../../Observable":4,"../../operator/share":36}],19:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var startWith_1 = require('../../operator/startWith');
Observable_1.Observable.prototype.startWith = startWith_1.startWith;

},{"../../Observable":4,"../../operator/startWith":37}],20:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var switchMap_1 = require('../../operator/switchMap');
Observable_1.Observable.prototype.switchMap = switchMap_1.switchMap;

},{"../../Observable":4,"../../operator/switchMap":38}],21:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var withLatestFrom_1 = require('../../operator/withLatestFrom');
Observable_1.Observable.prototype.withLatestFrom = withLatestFrom_1.withLatestFrom;

},{"../../Observable":4,"../../operator/withLatestFrom":39}],22:[function(require,module,exports){
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

},{"../Observable":4,"../util/isScheduler":50,"./EmptyObservable":24,"./ScalarObservable":25}],23:[function(require,module,exports){
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

},{"../Observable":4,"../Subscriber":9,"../Subscription":10}],24:[function(require,module,exports){
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

},{"../Observable":4}],25:[function(require,module,exports){
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

},{"../Observable":4}],26:[function(require,module,exports){
"use strict";
var ArrayObservable_1 = require('./ArrayObservable');
exports.of = ArrayObservable_1.ArrayObservable.of;

},{"./ArrayObservable":22}],27:[function(require,module,exports){
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

},{"../OuterSubscriber":6,"../observable/ArrayObservable":22,"../util/isArray":46,"../util/isScheduler":50,"../util/subscribeToResult":52}],28:[function(require,module,exports){
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

},{"../observable/ArrayObservable":22,"../util/isScheduler":50,"./mergeAll":33}],29:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Subscriber_1 = require('../Subscriber');
/**
 * Filter items emitted by the source Observable by only emitting those that
 * satisfy a specified predicate.
 *
 * <span class="informal">Like
 * [Array.prototype.filter()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter),
 * it only emits a value from the source if it passes a criterion function.</span>
 *
 * <img src="./img/filter.png" width="100%">
 *
 * Similar to the well-known `Array.prototype.filter` method, this operator
 * takes values from the source Observable, passes them through a `predicate`
 * function and only emits those values that yielded `true`.
 *
 * @example <caption>Emit only click events whose target was a DIV element</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var clicksOnDivs = clicks.filter(ev => ev.target.tagName === 'DIV');
 * clicksOnDivs.subscribe(x => console.log(x));
 *
 * @see {@link distinct}
 * @see {@link distinctKey}
 * @see {@link distinctUntilChanged}
 * @see {@link distinctUntilKeyChanged}
 * @see {@link ignoreElements}
 * @see {@link partition}
 * @see {@link skip}
 *
 * @param {function(value: T, index: number): boolean} predicate A function that
 * evaluates each value emitted by the source Observable. If it returns `true`,
 * the value is emitted, if `false` the value is not passed to the output
 * Observable. The `index` parameter is the number `i` for the i-th source
 * emission that has happened since the subscription, starting from the number
 * `0`.
 * @param {any} [thisArg] An optional argument to determine the value of `this`
 * in the `predicate` function.
 * @return {Observable} An Observable of values from the source that were
 * allowed by the `predicate` function.
 * @method filter
 * @owner Observable
 */
function filter(predicate, thisArg) {
    return this.lift(new FilterOperator(predicate, thisArg));
}
exports.filter = filter;
var FilterOperator = (function () {
    function FilterOperator(predicate, thisArg) {
        this.predicate = predicate;
        this.thisArg = thisArg;
    }
    FilterOperator.prototype.call = function (subscriber, source) {
        return source._subscribe(new FilterSubscriber(subscriber, this.predicate, this.thisArg));
    };
    return FilterOperator;
}());
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var FilterSubscriber = (function (_super) {
    __extends(FilterSubscriber, _super);
    function FilterSubscriber(destination, predicate, thisArg) {
        _super.call(this, destination);
        this.predicate = predicate;
        this.thisArg = thisArg;
        this.count = 0;
        this.predicate = predicate;
    }
    // the try catch block below is left specifically for
    // optimization and perf reasons. a tryCatcher is not necessary here.
    FilterSubscriber.prototype._next = function (value) {
        var result;
        try {
            result = this.predicate.call(this.thisArg, value, this.count++);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        if (result) {
            this.destination.next(value);
        }
    };
    return FilterSubscriber;
}(Subscriber_1.Subscriber));

},{"../Subscriber":9}],30:[function(require,module,exports){
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

},{"../Subscriber":9}],31:[function(require,module,exports){
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

},{"../Subscriber":9}],32:[function(require,module,exports){
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

},{"../observable/ArrayObservable":22,"../util/isScheduler":50,"./mergeAll":33}],33:[function(require,module,exports){
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

},{"../OuterSubscriber":6,"../util/subscribeToResult":52}],34:[function(require,module,exports){
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

},{"../observable/ConnectableObservable":23}],35:[function(require,module,exports){
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

},{"../Subscriber":9}],36:[function(require,module,exports){
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

},{"../Subject":7,"./multicast":34}],37:[function(require,module,exports){
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

},{"../observable/ArrayObservable":22,"../observable/EmptyObservable":24,"../observable/ScalarObservable":25,"../util/isScheduler":50,"./concat":28}],38:[function(require,module,exports){
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

},{"../OuterSubscriber":6,"../util/subscribeToResult":52}],39:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var OuterSubscriber_1 = require('../OuterSubscriber');
var subscribeToResult_1 = require('../util/subscribeToResult');
/**
 * Combines the source Observable with other Observables to create an Observable
 * whose values are calculated from the latest values of each, only when the
 * source emits.
 *
 * <span class="informal">Whenever the source Observable emits a value, it
 * computes a formula using that value plus the latest values from other input
 * Observables, then emits the output of that formula.</span>
 *
 * <img src="./img/withLatestFrom.png" width="100%">
 *
 * `withLatestFrom` combines each value from the source Observable (the
 * instance) with the latest values from the other input Observables only when
 * the source emits a value, optionally using a `project` function to determine
 * the value to be emitted on the output Observable. All input Observables must
 * emit at least one value before the output Observable will emit a value.
 *
 * @example <caption>On every click event, emit an array with the latest timer event plus the click event</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var timer = Rx.Observable.interval(1000);
 * var result = clicks.withLatestFrom(timer);
 * result.subscribe(x => console.log(x));
 *
 * @see {@link combineLatest}
 *
 * @param {Observable} other An input Observable to combine with the source
 * Observable. More than one input Observables may be given as argument.
 * @param {Function} [project] Projection function for combining values
 * together. Receives all values in order of the Observables passed, where the
 * first parameter is a value from the source Observable. (e.g.
 * `a.withLatestFrom(b, c, (a1, b1, c1) => a1 + b1 + c1)`). If this is not
 * passed, arrays will be emitted on the output Observable.
 * @return {Observable} An Observable of projected values from the most recent
 * values from each input Observable, or an array of the most recent values from
 * each input Observable.
 * @method withLatestFrom
 * @owner Observable
 */
function withLatestFrom() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i - 0] = arguments[_i];
    }
    var project;
    if (typeof args[args.length - 1] === 'function') {
        project = args.pop();
    }
    var observables = args;
    return this.lift(new WithLatestFromOperator(observables, project));
}
exports.withLatestFrom = withLatestFrom;
/* tslint:enable:max-line-length */
var WithLatestFromOperator = (function () {
    function WithLatestFromOperator(observables, project) {
        this.observables = observables;
        this.project = project;
    }
    WithLatestFromOperator.prototype.call = function (subscriber, source) {
        return source._subscribe(new WithLatestFromSubscriber(subscriber, this.observables, this.project));
    };
    return WithLatestFromOperator;
}());
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var WithLatestFromSubscriber = (function (_super) {
    __extends(WithLatestFromSubscriber, _super);
    function WithLatestFromSubscriber(destination, observables, project) {
        _super.call(this, destination);
        this.observables = observables;
        this.project = project;
        this.toRespond = [];
        var len = observables.length;
        this.values = new Array(len);
        for (var i = 0; i < len; i++) {
            this.toRespond.push(i);
        }
        for (var i = 0; i < len; i++) {
            var observable = observables[i];
            this.add(subscribeToResult_1.subscribeToResult(this, observable, observable, i));
        }
    }
    WithLatestFromSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.values[outerIndex] = innerValue;
        var toRespond = this.toRespond;
        if (toRespond.length > 0) {
            var found = toRespond.indexOf(outerIndex);
            if (found !== -1) {
                toRespond.splice(found, 1);
            }
        }
    };
    WithLatestFromSubscriber.prototype.notifyComplete = function () {
        // noop
    };
    WithLatestFromSubscriber.prototype._next = function (value) {
        if (this.toRespond.length === 0) {
            var args = [value].concat(this.values);
            if (this.project) {
                this._tryProject(args);
            }
            else {
                this.destination.next(args);
            }
        }
    };
    WithLatestFromSubscriber.prototype._tryProject = function (args) {
        var result;
        try {
            result = this.project.apply(this, args);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this.destination.next(result);
    };
    return WithLatestFromSubscriber;
}(OuterSubscriber_1.OuterSubscriber));

},{"../OuterSubscriber":6,"../util/subscribeToResult":52}],40:[function(require,module,exports){
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

},{"../util/root":51}],41:[function(require,module,exports){
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

},{"../util/root":51}],42:[function(require,module,exports){
"use strict";
var root_1 = require('../util/root');
var Symbol = root_1.root.Symbol;
exports.$$rxSubscriber = (typeof Symbol === 'function' && typeof Symbol.for === 'function') ?
    Symbol.for('rxSubscriber') : '@@rxSubscriber';

},{"../util/root":51}],43:[function(require,module,exports){
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

},{}],44:[function(require,module,exports){
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

},{}],45:[function(require,module,exports){
"use strict";
// typeof any so that it we don't have to cast when comparing a result to the error object
exports.errorObject = { e: {} };

},{}],46:[function(require,module,exports){
"use strict";
exports.isArray = Array.isArray || (function (x) { return x && typeof x.length === 'number'; });

},{}],47:[function(require,module,exports){
"use strict";
function isFunction(x) {
    return typeof x === 'function';
}
exports.isFunction = isFunction;

},{}],48:[function(require,module,exports){
"use strict";
function isObject(x) {
    return x != null && typeof x === 'object';
}
exports.isObject = isObject;

},{}],49:[function(require,module,exports){
"use strict";
function isPromise(value) {
    return value && typeof value.subscribe !== 'function' && typeof value.then === 'function';
}
exports.isPromise = isPromise;

},{}],50:[function(require,module,exports){
"use strict";
function isScheduler(value) {
    return value && typeof value.schedule === 'function';
}
exports.isScheduler = isScheduler;

},{}],51:[function(require,module,exports){
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

},{}],52:[function(require,module,exports){
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

},{"../InnerSubscriber":3,"../Observable":4,"../symbol/iterator":40,"../symbol/observable":41,"./isArray":46,"./isPromise":49,"./root":51}],53:[function(require,module,exports){
"use strict";
function throwError(e) { throw e; }
exports.throwError = throwError;

},{}],54:[function(require,module,exports){
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

},{"../Subscriber":9,"../symbol/rxSubscriber":42}],55:[function(require,module,exports){
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

},{"./errorObject":45}],56:[function(require,module,exports){

},{}],57:[function(require,module,exports){
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

},{}],58:[function(require,module,exports){
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
},{"./eventDelegator":71,"./get":74,"./is":77,"./mountable":79,"./propertyDescriptors":81,"./set":83,"global/document":100}],59:[function(require,module,exports){
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
},{"./createComponentProps":63,"./createCompositeSubject":64,"./createEventHandler":65,"./createObservableFromArray":67,"./set":83,"./symbol":84,"cuid":87}],60:[function(require,module,exports){
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
},{"./NodeProxy":58,"./batchInsertMessages":62,"./createCompositeSubject":64,"./createNodeProps":66,"./createObservableFromArray":67,"./createPatchChildren":68,"./createPatchProperties":69,"./flatten":73,"./parseTag":80,"./set":83,"./symbol":84,"./wrapText":86,"rxjs/add/operator/map":14}],61:[function(require,module,exports){
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
},{"./is":77,"rxjs/Observable":4,"rxjs/add/observable/of":12}],62:[function(require,module,exports){
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
},{}],63:[function(require,module,exports){
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
},{"./is":77,"rxjs/BehaviorSubject":2}],64:[function(require,module,exports){
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
},{"rxjs/BehaviorSubject":2,"rxjs/Observable":4,"rxjs/Observer":5,"rxjs/Subject":7,"rxjs/Subscription":10,"rxjs/add/operator/switchMap":20}],65:[function(require,module,exports){
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
},{"./is":77,"rxjs/Observable":4,"rxjs/Observer":5,"rxjs/Subject":7,"rxjs/Subscription":10,"rxjs/add/operator/map":14,"rxjs/add/operator/mapTo":15,"rxjs/add/operator/share":18}],66:[function(require,module,exports){
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
},{"./asObservable":61,"./eventsList":72,"./is":77,"rxjs/Observable":4,"rxjs/add/observable/combineLatest":11,"rxjs/add/observable/of":12}],67:[function(require,module,exports){
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
},{"./asObservable":61,"rxjs/Observable":4,"rxjs/add/observable/combineLatest":11,"rxjs/add/observable/of":12}],68:[function(require,module,exports){
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
},{"./keyIndex":78,"dift":88}],69:[function(require,module,exports){
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
},{}],70:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/* @flow */

var emptyObject = exports.emptyObject = Object.freeze({});
},{}],71:[function(require,module,exports){
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
},{"./eventsList":72,"dom-delegator":92,"dom-delegator/dom-delegator":91}],72:[function(require,module,exports){
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
},{}],73:[function(require,module,exports){
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
},{}],74:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.get = get;
function get(obj, key) {
  return obj[key];
}
},{}],75:[function(require,module,exports){
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
},{"./VirtualComponent":59,"./VirtualNode":60,"./emptyObject":70,"./flatten":73,"./is":77}],76:[function(require,module,exports){
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
},{"./h":75,"./render":82}],77:[function(require,module,exports){
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
},{"./symbol":84,"rxjs/Observable":4,"rxjs/Subject":7}],78:[function(require,module,exports){
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
},{}],79:[function(require,module,exports){
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
},{"./CustomEvent":57,"./is":77}],80:[function(require,module,exports){
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
},{"parse-tag":103}],81:[function(require,module,exports){
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
},{"./eventsList":72}],82:[function(require,module,exports){
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
},{"./NodeProxy":58,"./batchInsertMessages":62,"./is":77,"./symbol":84,"./types":85}],83:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.set = set;
function set(obj, key, value) {
  obj[key] = value;
}
},{}],84:[function(require,module,exports){
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

},{}],85:[function(require,module,exports){
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
},{}],86:[function(require,module,exports){
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
},{"./VirtualNode":60,"./h":75,"./is":77}],87:[function(require,module,exports){
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

},{}],88:[function(require,module,exports){
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
},{"bit-vector":89}],89:[function(require,module,exports){
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
},{}],90:[function(require,module,exports){
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

},{"ev-store":99}],91:[function(require,module,exports){
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

},{"./add-event.js":90,"./proxy-event.js":97,"./remove-event.js":98,"ev-store":99,"global/document":100,"weakmap-shim/create-store":95}],92:[function(require,module,exports){
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

},{"./dom-delegator.js":91,"cuid":87,"global/document":100,"individual":93}],93:[function(require,module,exports){
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

},{}],94:[function(require,module,exports){
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

},{}],95:[function(require,module,exports){
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

},{"./hidden-store.js":96}],96:[function(require,module,exports){
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

},{}],97:[function(require,module,exports){
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

},{"inherits":94}],98:[function(require,module,exports){
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

},{"ev-store":99}],99:[function(require,module,exports){
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

},{"individual/one-version":102}],100:[function(require,module,exports){
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

},{"min-document":56}],101:[function(require,module,exports){
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

},{}],102:[function(require,module,exports){
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

},{"./index.js":101}],103:[function(require,module,exports){
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

},{}],104:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _checkArgTypes = require('check-arg-types');

var _checkArgTypes2 = _interopRequireDefault(_checkArgTypes);

var _yolk = require('yolk');

var _BehaviorSubject = require('rxjs/BehaviorSubject');

require('rxjs/add/operator/filter');

require('rxjs/add/operator/merge');

require('rxjs/add/operator/scan');

require('rxjs/add/operator/startWith');

require('rxjs/add/operator/withLatestFrom');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = TypeAhead;


var INITIAL_POS = 0;
var KEY = {
  UP: 38,
  DOWN: 40,
  ENTER: 13,
  ESC: 27
};
var KEY_VALUES = [KEY.UP, KEY.DOWN, KEY.ENTER, KEY.ESC];

function TypeAhead(_ref) {
  var props = _ref.props;
  var createEventHandler = _ref.createEventHandler;

  props = setDefaultProps(props);

  if (!props.search) {
    throw new Error('You need to provide a search function');
  }

  // Setup our events and streams
  // ----

  var handleInput = createEventHandler(function (ev) {
    return ev.target.value;
  });
  var displayValue = new _BehaviorSubject.BehaviorSubject('');
  handleInput.subscribe(displayValue); // displayValue === ev.target.value
  handleInput.filter(function (val) {
    return val && val.length >= props.threshold;
  }).subscribe(getSearchResults);

  var handleKeyUp = createEventHandler(function (ev) {
    return ev.keyCode;
  });
  handleKeyUp

  // One of our `KEYS` was pressed
  .filter(function (keyCode) {
    return KEY_VALUES.indexOf(keyCode) > -1;
  })

  // Combine `keyCode` with `displayValue` in an object
  .withLatestFrom(displayValue, function (keyCode, val) {
    return { keyCode: keyCode, val: val };
  })

  // Continue if the length of the user input is >= our threshold
  .filter(function (_ref2) {
    var val = _ref2.val;
    return val && val.length >= props.threshold;
  })

  // Ok, do stuff depending on the `keyCode`
  .subscribe(handleKeyCodes);

  // Set any template data
  // ----

  var classes = ['type-ahead-holder'];
  if (props.showSuggestions) {
    classes.push('type-ahead-suggestions-visible');
  }

  var ListItem = function ListItem(suggestion, index) {
    var classes = ['type-ahead-list-item'];
    if (index === props.currPos) {
      classes.push('active');
    }
    return (0, _yolk.h)(
      'li',
      { className: classes },
      suggestion
    );
  };

  return (0, _yolk.h)(
    'div',
    { className: classes },
    (0, _yolk.h)(
      'h1',
      null,
      props.title,
      ' (',
      props.suggestions.map(function (x) {
        return x.length;
      }),
      ')'
    ),
    (0, _yolk.h)('input', {
      placeholder: props.placeholder,
      value: displayValue,
      onInput: handleInput,
      onKeyUp: handleKeyUp
      //ng-blur="props.onBlur()"
      , className: 'type-ahead-input' }),
    (0, _yolk.h)(
      'ul',
      { className: 'type-ahead-list' },
      props.suggestions.map(ListItem)
    )
  );

  function getSearchResults(val) {
    props.search.next(val);
    var sub = props.search.filter(function (val) {
      return _checkArgTypes2.default.prototype.toType(val) === 'array';
    }).subscribe(function (results) {
      props.currPos = INITIAL_POS;
      props.suggestions = results;
      props.showSuggestions = results.length && val && val.length >= props.threshold;
    });
    sub.unsubscribe();
  }

  function handleKeyCodes(_ref3) {
    var keyCode = _ref3.keyCode;
    var val = _ref3.val;

    console.debug('handleKeyCodes', keyCode, val, props);
    switch (keyCode) {
      case KEY.UP:
        if (props.currPos > 0) {
          props.currPos--;
        }
        break;
      case KEY.DOWN:
        var max = props.suggestions.length - 1;
        if (props.currPos < max || props.currPos === INITIAL_POS) {
          props.currPos++;
        }
        break;
      case KEY.ENTER:
        console.debug('handleSelection', props.suggestions[props.currPos] || val);
        break;
      case KEY.ESC:
        props.showSuggestions = false;
    }
  }
}

function setDefaultProps(props) {
  props.currPos = props.currPos || INITIAL_POS;
  props.suggestions = props.suggestions || new _BehaviorSubject.BehaviorSubject([]);
  props.showSuggestions = props.showSuggestions || false;
  props.threshold = props.threshold || 2;
  props.limit = props.limit || Infinity;
  props.delay = props.delay || 100;
  return props;
}

},{"check-arg-types":1,"rxjs/BehaviorSubject":2,"rxjs/add/operator/filter":13,"rxjs/add/operator/merge":16,"rxjs/add/operator/scan":17,"rxjs/add/operator/startWith":19,"rxjs/add/operator/withLatestFrom":21,"yolk":76}],105:[function(require,module,exports){
'use strict';

var _yolk = require('yolk');

var _BehaviorSubject = require('rxjs/BehaviorSubject');

var _checkArgTypes = require('check-arg-types');

var _checkArgTypes2 = _interopRequireDefault(_checkArgTypes);

var _TypeAhead = require('./TypeAhead.jsx');

var _TypeAhead2 = _interopRequireDefault(_TypeAhead);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var search = new _BehaviorSubject.BehaviorSubject('');
search.filter(function (val) {
  return _checkArgTypes2.default.prototype.toType(val) === 'string';
}).subscribe(function (str) {
  return search.next(['array', 'of', 'string', 'results']);
});

(0, _yolk.render)((0, _yolk.h)(
  _TypeAhead2.default,
  { title: 'TypeAhead', search: search },
  'Type ahead my good friend'
), document.getElementById('container'));

},{"./TypeAhead.jsx":104,"check-arg-types":1,"rxjs/BehaviorSubject":2,"yolk":76}]},{},[105])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL2NoZWNrLWFyZy10eXBlcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL0JlaGF2aW9yU3ViamVjdC5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL0lubmVyU3Vic2NyaWJlci5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL09ic2VydmFibGUuanMiLCJub2RlX21vZHVsZXMvcnhqcy9PYnNlcnZlci5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL091dGVyU3Vic2NyaWJlci5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL1N1YmplY3QuanMiLCJub2RlX21vZHVsZXMvcnhqcy9TdWJqZWN0U3Vic2NyaXB0aW9uLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvU3Vic2NyaWJlci5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL1N1YnNjcmlwdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL2FkZC9vYnNlcnZhYmxlL2NvbWJpbmVMYXRlc3QuanMiLCJub2RlX21vZHVsZXMvcnhqcy9hZGQvb2JzZXJ2YWJsZS9vZi5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL2FkZC9vcGVyYXRvci9maWx0ZXIuanMiLCJub2RlX21vZHVsZXMvcnhqcy9hZGQvb3BlcmF0b3IvbWFwLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvYWRkL29wZXJhdG9yL21hcFRvLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvYWRkL29wZXJhdG9yL21lcmdlLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvYWRkL29wZXJhdG9yL3NjYW4uanMiLCJub2RlX21vZHVsZXMvcnhqcy9hZGQvb3BlcmF0b3Ivc2hhcmUuanMiLCJub2RlX21vZHVsZXMvcnhqcy9hZGQvb3BlcmF0b3Ivc3RhcnRXaXRoLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvYWRkL29wZXJhdG9yL3N3aXRjaE1hcC5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL2FkZC9vcGVyYXRvci93aXRoTGF0ZXN0RnJvbS5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL29ic2VydmFibGUvQXJyYXlPYnNlcnZhYmxlLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb2JzZXJ2YWJsZS9Db25uZWN0YWJsZU9ic2VydmFibGUuanMiLCJub2RlX21vZHVsZXMvcnhqcy9vYnNlcnZhYmxlL0VtcHR5T2JzZXJ2YWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL29ic2VydmFibGUvU2NhbGFyT2JzZXJ2YWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL29ic2VydmFibGUvb2YuanMiLCJub2RlX21vZHVsZXMvcnhqcy9vcGVyYXRvci9jb21iaW5lTGF0ZXN0LmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3IvY29uY2F0LmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3IvZmlsdGVyLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3IvbWFwLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3IvbWFwVG8uanMiLCJub2RlX21vZHVsZXMvcnhqcy9vcGVyYXRvci9tZXJnZS5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL29wZXJhdG9yL21lcmdlQWxsLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3IvbXVsdGljYXN0LmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3Ivc2Nhbi5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL29wZXJhdG9yL3NoYXJlLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3Ivc3RhcnRXaXRoLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3Ivc3dpdGNoTWFwLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3Ivd2l0aExhdGVzdEZyb20uanMiLCJub2RlX21vZHVsZXMvcnhqcy9zeW1ib2wvaXRlcmF0b3IuanMiLCJub2RlX21vZHVsZXMvcnhqcy9zeW1ib2wvb2JzZXJ2YWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3N5bWJvbC9yeFN1YnNjcmliZXIuanMiLCJub2RlX21vZHVsZXMvcnhqcy91dGlsL09iamVjdFVuc3Vic2NyaWJlZEVycm9yLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvdXRpbC9VbnN1YnNjcmlwdGlvbkVycm9yLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvdXRpbC9lcnJvck9iamVjdC5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3V0aWwvaXNBcnJheS5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3V0aWwvaXNGdW5jdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3V0aWwvaXNPYmplY3QuanMiLCJub2RlX21vZHVsZXMvcnhqcy91dGlsL2lzUHJvbWlzZS5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3V0aWwvaXNTY2hlZHVsZXIuanMiLCJub2RlX21vZHVsZXMvcnhqcy91dGlsL3Jvb3QuanMiLCJub2RlX21vZHVsZXMvcnhqcy91dGlsL3N1YnNjcmliZVRvUmVzdWx0LmpzIiwibm9kZV9tb2R1bGVzL3J4anMvdXRpbC90aHJvd0Vycm9yLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvdXRpbC90b1N1YnNjcmliZXIuanMiLCJub2RlX21vZHVsZXMvcnhqcy91dGlsL3RyeUNhdGNoLmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXJlc29sdmUvZW1wdHkuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvQ3VzdG9tRXZlbnQuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvTm9kZVByb3h5LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL1ZpcnR1YWxDb21wb25lbnQuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvVmlydHVhbE5vZGUuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvYXNPYnNlcnZhYmxlLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2JhdGNoSW5zZXJ0TWVzc2FnZXMuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvY3JlYXRlQ29tcG9uZW50UHJvcHMuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvY3JlYXRlQ29tcG9zaXRlU3ViamVjdC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9jcmVhdGVFdmVudEhhbmRsZXIuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvY3JlYXRlTm9kZVByb3BzLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2NyZWF0ZU9ic2VydmFibGVGcm9tQXJyYXkuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvY3JlYXRlUGF0Y2hDaGlsZHJlbi5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9jcmVhdGVQYXRjaFByb3BlcnRpZXMuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvZW1wdHlPYmplY3QuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvZXZlbnREZWxlZ2F0b3IuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvZXZlbnRzTGlzdC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9mbGF0dGVuLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2dldC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9oLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2lzLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2tleUluZGV4LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL21vdW50YWJsZS5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9wYXJzZVRhZy5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9wcm9wZXJ0eURlc2NyaXB0b3JzLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL3JlbmRlci5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9zZXQuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvc3ltYm9sLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL3R5cGVzLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL3dyYXBUZXh0LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbm9kZV9tb2R1bGVzL2N1aWQvZGlzdC9icm93c2VyLWN1aWQuanMiLCJub2RlX21vZHVsZXMveW9say9ub2RlX21vZHVsZXMvZGlmdC9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMveW9say9ub2RlX21vZHVsZXMvZGlmdC9ub2RlX21vZHVsZXMvYml0LXZlY3Rvci9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMveW9say9ub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9hZGQtZXZlbnQuanMiLCJub2RlX21vZHVsZXMveW9say9ub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9kb20tZGVsZWdhdG9yLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3IvaW5kZXguanMiLCJub2RlX21vZHVsZXMveW9say9ub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9ub2RlX21vZHVsZXMvaW5kaXZpZHVhbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL25vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3Ivbm9kZV9tb2R1bGVzL3dlYWttYXAtc2hpbS9jcmVhdGUtc3RvcmUuanMiLCJub2RlX21vZHVsZXMveW9say9ub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9ub2RlX21vZHVsZXMvd2Vha21hcC1zaGltL2hpZGRlbi1zdG9yZS5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL25vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL3Byb3h5LWV2ZW50LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3IvcmVtb3ZlLWV2ZW50LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbm9kZV9tb2R1bGVzL2V2LXN0b3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL25vZGVfbW9kdWxlcy9pbmRpdmlkdWFsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbm9kZV9tb2R1bGVzL2luZGl2aWR1YWwvb25lLXZlcnNpb24uanMiLCJub2RlX21vZHVsZXMveW9say9ub2RlX21vZHVsZXMvcGFyc2UtdGFnL2luZGV4LmpzIiwic3JjL1R5cGVBaGVhZC5qc3giLCJzcmMvaW5kZXguanN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7OztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7OztBQ3BEQTs7OztBQUNBOztBQUNBOztBQUVBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOzs7O2tCQUVlOzs7QUFHZixJQUFNLGNBQWMsQ0FBZDtBQUNOLElBQU0sTUFBTTtBQUNWLE1BQUksRUFBSjtBQUNBLFFBQU0sRUFBTjtBQUNBLFNBQU8sRUFBUDtBQUNBLE9BQUssRUFBTDtDQUpJO0FBTU4sSUFBTSxhQUFhLENBQUMsSUFBSSxFQUFKLEVBQVEsSUFBSSxJQUFKLEVBQVUsSUFBSSxLQUFKLEVBQVcsSUFBSSxHQUFKLENBQTNDOztBQUVOLFNBQVMsU0FBVCxPQUFnRDtNQUE1QixtQkFBNEI7TUFBckIsNkNBQXFCOztBQUM5QyxVQUFRLGdCQUFnQixLQUFoQixDQUFSLENBRDhDOztBQUc5QyxNQUFJLENBQUMsTUFBTSxNQUFOLEVBQWM7QUFDakIsVUFBTSxJQUFJLEtBQUosQ0FBVSx1Q0FBVixDQUFOLENBRGlCO0dBQW5COzs7OztBQUg4QyxNQVV4QyxjQUFjLG1CQUFtQjtXQUFNLEdBQUcsTUFBSCxDQUFVLEtBQVY7R0FBTixDQUFqQyxDQVZ3QztBQVc5QyxNQUFNLGVBQWUscUNBQW9CLEVBQXBCLENBQWYsQ0FYd0M7QUFZOUMsY0FBWSxTQUFaLENBQXNCLFlBQXRCO0FBWjhDLGFBYTlDLENBQ0csTUFESCxDQUNVO1dBQU8sT0FBTyxJQUFJLE1BQUosSUFBYyxNQUFNLFNBQU47R0FBNUIsQ0FEVixDQUVHLFNBRkgsQ0FFYSxnQkFGYixFQWI4Qzs7QUFpQjlDLE1BQU0sY0FBYyxtQkFBbUI7V0FBTSxHQUFHLE9BQUg7R0FBTixDQUFqQyxDQWpCd0M7QUFrQjlDOzs7R0FHRyxNQUhILENBR1U7V0FBVyxXQUFXLE9BQVgsQ0FBbUIsT0FBbkIsSUFBOEIsQ0FBQyxDQUFEO0dBQXpDOzs7QUFIVixHQU1HLGNBTkgsQ0FNa0IsWUFObEIsRUFNZ0MsVUFBQyxPQUFELEVBQVUsR0FBVjtXQUFtQixFQUFDLGdCQUFELEVBQVUsUUFBVjtHQUFuQjs7O0FBTmhDLEdBU0csTUFUSCxDQVNVO1FBQUU7V0FBUyxPQUFPLElBQUksTUFBSixJQUFjLE1BQU0sU0FBTjtHQUFoQzs7O0FBVFYsR0FZRyxTQVpILENBWWEsY0FaYjs7Ozs7QUFsQjhDLE1BbUMxQyxVQUFVLENBQUMsbUJBQUQsQ0FBVixDQW5DMEM7QUFvQzlDLE1BQUksTUFBTSxlQUFOLEVBQXVCO0FBQ3pCLFlBQVEsSUFBUixDQUFhLGdDQUFiLEVBRHlCO0dBQTNCOztBQUlBLE1BQU0sV0FBVyxTQUFYLFFBQVcsQ0FBQyxVQUFELEVBQWEsS0FBYixFQUF1QjtBQUN0QyxRQUFJLFVBQVUsQ0FBQyxzQkFBRCxDQUFWLENBRGtDO0FBRXRDLFFBQUksVUFBVSxNQUFNLE9BQU4sRUFBZTtBQUMzQixjQUFRLElBQVIsQ0FBYSxRQUFiLEVBRDJCO0tBQTdCO0FBR0EsV0FBTzs7UUFBSSxXQUFXLE9BQVgsRUFBSjtNQUF5QixVQUF6QjtLQUFQLENBTHNDO0dBQXZCLENBeEM2Qjs7QUFnRDlDLFNBQ0U7O01BQUssV0FBVyxPQUFYLEVBQUw7SUFDRTs7O01BQUssTUFBTSxLQUFOO1VBQUw7TUFBb0IsTUFBTSxXQUFOLENBQWtCLEdBQWxCLENBQXNCO2VBQUssRUFBRSxNQUFGO09BQUwsQ0FBMUM7O0tBREY7SUFFRTtBQUNFLG1CQUFhLE1BQU0sV0FBTjtBQUNiLGFBQU8sWUFBUDtBQUNBLGVBQVMsV0FBVDtBQUNBLGVBQVMsV0FBVDs7UUFFQSxXQUFVLGtCQUFWLEVBTkYsQ0FGRjtJQVVFOztRQUFJLFdBQVUsaUJBQVYsRUFBSjtNQUNHLE1BQU0sV0FBTixDQUFrQixHQUFsQixDQUFzQixRQUF0QixDQURIO0tBVkY7R0FERixDQWhEOEM7O0FBaUU5QyxXQUFTLGdCQUFULENBQTBCLEdBQTFCLEVBQStCO0FBQzdCLFVBQU0sTUFBTixDQUFhLElBQWIsQ0FBa0IsR0FBbEIsRUFENkI7QUFFN0IsUUFBTSxNQUFNLE1BQU0sTUFBTixDQUNULE1BRFMsQ0FDRjthQUFPLHdCQUFNLFNBQU4sQ0FBZ0IsTUFBaEIsQ0FBdUIsR0FBdkIsTUFBZ0MsT0FBaEM7S0FBUCxDQURFLENBRVQsU0FGUyxDQUVDLG1CQUFXO0FBQ3BCLFlBQU0sT0FBTixHQUFnQixXQUFoQixDQURvQjtBQUVwQixZQUFNLFdBQU4sR0FBb0IsT0FBcEIsQ0FGb0I7QUFHcEIsWUFBTSxlQUFOLEdBQXdCLFFBQVEsTUFBUixJQUFrQixHQUFsQixJQUF5QixJQUFJLE1BQUosSUFBYyxNQUFNLFNBQU4sQ0FIM0M7S0FBWCxDQUZQLENBRnVCO0FBUzdCLFFBQUksV0FBSixHQVQ2QjtHQUEvQjs7QUFZQSxXQUFTLGNBQVQsUUFBd0M7UUFBZix3QkFBZTtRQUFOLGdCQUFNOztBQUN0QyxZQUFRLEtBQVIsQ0FBYyxnQkFBZCxFQUFnQyxPQUFoQyxFQUF5QyxHQUF6QyxFQUE4QyxLQUE5QyxFQURzQztBQUV0QyxZQUFRLE9BQVI7QUFDRSxXQUFLLElBQUksRUFBSjtBQUNILFlBQUksTUFBTSxPQUFOLEdBQWdCLENBQWhCLEVBQW1CO0FBQ3JCLGdCQUFNLE9BQU4sR0FEcUI7U0FBdkI7QUFHQSxjQUpGO0FBREYsV0FNTyxJQUFJLElBQUo7QUFDSCxZQUFJLE1BQU0sTUFBTSxXQUFOLENBQWtCLE1BQWxCLEdBQTJCLENBQTNCLENBRFo7QUFFRSxZQUFJLE1BQU0sT0FBTixHQUFnQixHQUFoQixJQUF1QixNQUFNLE9BQU4sS0FBa0IsV0FBbEIsRUFBK0I7QUFDeEQsZ0JBQU0sT0FBTixHQUR3RDtTQUExRDtBQUdBLGNBTEY7QUFORixXQVlPLElBQUksS0FBSjtBQUNILGdCQUFRLEtBQVIsQ0FBYyxpQkFBZCxFQUFpQyxNQUFNLFdBQU4sQ0FBa0IsTUFBTSxPQUFOLENBQWxCLElBQW9DLEdBQXBDLENBQWpDLENBREY7QUFFRSxjQUZGO0FBWkYsV0FlTyxJQUFJLEdBQUo7QUFDSCxjQUFNLGVBQU4sR0FBd0IsS0FBeEIsQ0FERjtBQWZGLEtBRnNDO0dBQXhDO0NBN0VGOztBQW9HQSxTQUFTLGVBQVQsQ0FBeUIsS0FBekIsRUFBZ0M7QUFDOUIsUUFBTSxPQUFOLEdBQWdCLE1BQU0sT0FBTixJQUFpQixXQUFqQixDQURjO0FBRTlCLFFBQU0sV0FBTixHQUFvQixNQUFNLFdBQU4sSUFBcUIscUNBQW9CLEVBQXBCLENBQXJCLENBRlU7QUFHOUIsUUFBTSxlQUFOLEdBQXdCLE1BQU0sZUFBTixJQUF5QixLQUF6QixDQUhNO0FBSTlCLFFBQU0sU0FBTixHQUFrQixNQUFNLFNBQU4sSUFBbUIsQ0FBbkIsQ0FKWTtBQUs5QixRQUFNLEtBQU4sR0FBYyxNQUFNLEtBQU4sSUFBZSxRQUFmLENBTGdCO0FBTTlCLFFBQU0sS0FBTixHQUFjLE1BQU0sS0FBTixJQUFlLEdBQWYsQ0FOZ0I7QUFPOUIsU0FBTyxLQUFQLENBUDhCO0NBQWhDOzs7OztBQzFIQTs7QUFDQTs7QUFDQTs7OztBQUVBOzs7Ozs7QUFHQSxJQUFNLFNBQVMscUNBQW9CLEVBQXBCLENBQVQ7QUFDTixPQUNHLE1BREgsQ0FDVTtTQUFPLHdCQUFNLFNBQU4sQ0FBZ0IsTUFBaEIsQ0FBdUIsR0FBdkIsTUFBZ0MsUUFBaEM7Q0FBUCxDQURWLENBRUcsU0FGSCxDQUVhO1NBQU8sT0FBTyxJQUFQLENBQVksQ0FBQyxPQUFELEVBQVUsSUFBVixFQUFnQixRQUFoQixFQUEwQixTQUExQixDQUFaO0NBQVAsQ0FGYjs7QUFJQSxrQkFDRTs7SUFBVyxPQUFNLFdBQU4sRUFBa0IsUUFBUSxNQUFSLEVBQTdCOztDQURGLEVBRUUsU0FBUyxjQUFULENBQXdCLFdBQXhCLENBRkYiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIHRvVHlwZSA9IGZ1bmN0aW9uKHZhbCkge1xuICB2YXIgc3RyID0gKHt9KS50b1N0cmluZy5jYWxsKHZhbCk7XG4gIHJldHVybiBzdHIudG9Mb3dlckNhc2UoKS5zbGljZSg4LCAtMSk7XG59O1xuXG52YXIgY2hlY2tBcmdUeXBlcyA9IGZ1bmN0aW9uKGFyZ3MsIHR5cGVzKSB7XG4gIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmdzKTtcbiAgXG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHggPSAwO1xuICB2YXIgZ2l2ZW5UeXBlO1xuICB2YXIgZXhwZWN0ZWRUeXBlO1xuXG4gIHdoaWxlICh4IDwgbGVuKSB7XG4gICAgZ2l2ZW5UeXBlID0gdG9UeXBlKGFyZ3NbeF0pO1xuICAgIGV4cGVjdGVkVHlwZSA9IHR5cGVzW3hdO1xuICAgIFxuICAgIGlmIChnaXZlblR5cGUgIT09IGV4cGVjdGVkVHlwZSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkICdcIitleHBlY3RlZFR5cGUrXCInIGdpdmVuICdcIitnaXZlblR5cGUrXCInIGZvciBhcmd1bWVudCBhdCBpbmRleCBcIit4KTtcbiAgICB9XG5cbiAgICB4Kys7XG4gIH1cbn07XG5cbmNoZWNrQXJnVHlwZXMucHJvdG90eXBlLnRvVHlwZSA9IHRvVHlwZTtcblxubW9kdWxlLmV4cG9ydHMgPSBjaGVja0FyZ1R5cGVzO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBTdWJqZWN0XzEgPSByZXF1aXJlKCcuL1N1YmplY3QnKTtcbnZhciB0aHJvd0Vycm9yXzEgPSByZXF1aXJlKCcuL3V0aWwvdGhyb3dFcnJvcicpO1xudmFyIE9iamVjdFVuc3Vic2NyaWJlZEVycm9yXzEgPSByZXF1aXJlKCcuL3V0aWwvT2JqZWN0VW5zdWJzY3JpYmVkRXJyb3InKTtcbi8qKlxuICogQGNsYXNzIEJlaGF2aW9yU3ViamVjdDxUPlxuICovXG52YXIgQmVoYXZpb3JTdWJqZWN0ID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQmVoYXZpb3JTdWJqZWN0LCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJlaGF2aW9yU3ViamVjdChfdmFsdWUpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gX3ZhbHVlO1xuICAgIH1cbiAgICBCZWhhdmlvclN1YmplY3QucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5oYXNFcnJvcmVkKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yXzEudGhyb3dFcnJvcih0aGlzLmVycm9yVmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JfMS50aHJvd0Vycm9yKG5ldyBPYmplY3RVbnN1YnNjcmliZWRFcnJvcl8xLk9iamVjdFVuc3Vic2NyaWJlZEVycm9yKCkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQmVoYXZpb3JTdWJqZWN0LnByb3RvdHlwZSwgXCJ2YWx1ZVwiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VmFsdWUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgQmVoYXZpb3JTdWJqZWN0LnByb3RvdHlwZS5fc3Vic2NyaWJlID0gZnVuY3Rpb24gKHN1YnNjcmliZXIpIHtcbiAgICAgICAgdmFyIHN1YnNjcmlwdGlvbiA9IF9zdXBlci5wcm90b3R5cGUuX3N1YnNjcmliZS5jYWxsKHRoaXMsIHN1YnNjcmliZXIpO1xuICAgICAgICBpZiAoc3Vic2NyaXB0aW9uICYmICFzdWJzY3JpcHRpb24uaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgIHN1YnNjcmliZXIubmV4dCh0aGlzLl92YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1YnNjcmlwdGlvbjtcbiAgICB9O1xuICAgIEJlaGF2aW9yU3ViamVjdC5wcm90b3R5cGUuX25leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5fbmV4dC5jYWxsKHRoaXMsIHRoaXMuX3ZhbHVlID0gdmFsdWUpO1xuICAgIH07XG4gICAgQmVoYXZpb3JTdWJqZWN0LnByb3RvdHlwZS5fZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHRoaXMuaGFzRXJyb3JlZCA9IHRydWU7XG4gICAgICAgIF9zdXBlci5wcm90b3R5cGUuX2Vycm9yLmNhbGwodGhpcywgdGhpcy5lcnJvclZhbHVlID0gZXJyKTtcbiAgICB9O1xuICAgIHJldHVybiBCZWhhdmlvclN1YmplY3Q7XG59KFN1YmplY3RfMS5TdWJqZWN0KSk7XG5leHBvcnRzLkJlaGF2aW9yU3ViamVjdCA9IEJlaGF2aW9yU3ViamVjdDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUJlaGF2aW9yU3ViamVjdC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIFN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4vU3Vic2NyaWJlcicpO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBJbm5lclN1YnNjcmliZXIgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhJbm5lclN1YnNjcmliZXIsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gSW5uZXJTdWJzY3JpYmVyKHBhcmVudCwgb3V0ZXJWYWx1ZSwgb3V0ZXJJbmRleCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgICAgIHRoaXMub3V0ZXJWYWx1ZSA9IG91dGVyVmFsdWU7XG4gICAgICAgIHRoaXMub3V0ZXJJbmRleCA9IG91dGVySW5kZXg7XG4gICAgICAgIHRoaXMuaW5kZXggPSAwO1xuICAgIH1cbiAgICBJbm5lclN1YnNjcmliZXIucHJvdG90eXBlLl9uZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMucGFyZW50Lm5vdGlmeU5leHQodGhpcy5vdXRlclZhbHVlLCB2YWx1ZSwgdGhpcy5vdXRlckluZGV4LCB0aGlzLmluZGV4KyssIHRoaXMpO1xuICAgIH07XG4gICAgSW5uZXJTdWJzY3JpYmVyLnByb3RvdHlwZS5fZXJyb3IgPSBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgdGhpcy5wYXJlbnQubm90aWZ5RXJyb3IoZXJyb3IsIHRoaXMpO1xuICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgfTtcbiAgICBJbm5lclN1YnNjcmliZXIucHJvdG90eXBlLl9jb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5wYXJlbnQubm90aWZ5Q29tcGxldGUodGhpcyk7XG4gICAgICAgIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICB9O1xuICAgIHJldHVybiBJbm5lclN1YnNjcmliZXI7XG59KFN1YnNjcmliZXJfMS5TdWJzY3JpYmVyKSk7XG5leHBvcnRzLklubmVyU3Vic2NyaWJlciA9IElubmVyU3Vic2NyaWJlcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUlubmVyU3Vic2NyaWJlci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciByb290XzEgPSByZXF1aXJlKCcuL3V0aWwvcm9vdCcpO1xudmFyIG9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4vc3ltYm9sL29ic2VydmFibGUnKTtcbnZhciB0b1N1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4vdXRpbC90b1N1YnNjcmliZXInKTtcbi8qKlxuICogQSByZXByZXNlbnRhdGlvbiBvZiBhbnkgc2V0IG9mIHZhbHVlcyBvdmVyIGFueSBhbW91bnQgb2YgdGltZS4gVGhpcyB0aGUgbW9zdCBiYXNpYyBidWlsZGluZyBibG9ja1xuICogb2YgUnhKUy5cbiAqXG4gKiBAY2xhc3MgT2JzZXJ2YWJsZTxUPlxuICovXG52YXIgT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgLyoqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gc3Vic2NyaWJlIHRoZSBmdW5jdGlvbiB0aGF0IGlzICBjYWxsZWQgd2hlbiB0aGUgT2JzZXJ2YWJsZSBpc1xuICAgICAqIGluaXRpYWxseSBzdWJzY3JpYmVkIHRvLiBUaGlzIGZ1bmN0aW9uIGlzIGdpdmVuIGEgU3Vic2NyaWJlciwgdG8gd2hpY2ggbmV3IHZhbHVlc1xuICAgICAqIGNhbiBiZSBgbmV4dGBlZCwgb3IgYW4gYGVycm9yYCBtZXRob2QgY2FuIGJlIGNhbGxlZCB0byByYWlzZSBhbiBlcnJvciwgb3JcbiAgICAgKiBgY29tcGxldGVgIGNhbiBiZSBjYWxsZWQgdG8gbm90aWZ5IG9mIGEgc3VjY2Vzc2Z1bCBjb21wbGV0aW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIE9ic2VydmFibGUoc3Vic2NyaWJlKSB7XG4gICAgICAgIHRoaXMuX2lzU2NhbGFyID0gZmFsc2U7XG4gICAgICAgIGlmIChzdWJzY3JpYmUpIHtcbiAgICAgICAgICAgIHRoaXMuX3N1YnNjcmliZSA9IHN1YnNjcmliZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IE9ic2VydmFibGUsIHdpdGggdGhpcyBPYnNlcnZhYmxlIGFzIHRoZSBzb3VyY2UsIGFuZCB0aGUgcGFzc2VkXG4gICAgICogb3BlcmF0b3IgZGVmaW5lZCBhcyB0aGUgbmV3IG9ic2VydmFibGUncyBvcGVyYXRvci5cbiAgICAgKiBAbWV0aG9kIGxpZnRcbiAgICAgKiBAcGFyYW0ge09wZXJhdG9yfSBvcGVyYXRvciB0aGUgb3BlcmF0b3IgZGVmaW5pbmcgdGhlIG9wZXJhdGlvbiB0byB0YWtlIG9uIHRoZSBvYnNlcnZhYmxlXG4gICAgICogQHJldHVybiB7T2JzZXJ2YWJsZX0gYSBuZXcgb2JzZXJ2YWJsZSB3aXRoIHRoZSBPcGVyYXRvciBhcHBsaWVkXG4gICAgICovXG4gICAgT2JzZXJ2YWJsZS5wcm90b3R5cGUubGlmdCA9IGZ1bmN0aW9uIChvcGVyYXRvcikge1xuICAgICAgICB2YXIgb2JzZXJ2YWJsZSA9IG5ldyBPYnNlcnZhYmxlKCk7XG4gICAgICAgIG9ic2VydmFibGUuc291cmNlID0gdGhpcztcbiAgICAgICAgb2JzZXJ2YWJsZS5vcGVyYXRvciA9IG9wZXJhdG9yO1xuICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVycyBoYW5kbGVycyBmb3IgaGFuZGxpbmcgZW1pdHRlZCB2YWx1ZXMsIGVycm9yIGFuZCBjb21wbGV0aW9ucyBmcm9tIHRoZSBvYnNlcnZhYmxlLCBhbmRcbiAgICAgKiAgZXhlY3V0ZXMgdGhlIG9ic2VydmFibGUncyBzdWJzY3JpYmVyIGZ1bmN0aW9uLCB3aGljaCB3aWxsIHRha2UgYWN0aW9uIHRvIHNldCB1cCB0aGUgdW5kZXJseWluZyBkYXRhIHN0cmVhbVxuICAgICAqIEBtZXRob2Qgc3Vic2NyaWJlXG4gICAgICogQHBhcmFtIHtQYXJ0aWFsT2JzZXJ2ZXJ8RnVuY3Rpb259IG9ic2VydmVyT3JOZXh0IChvcHRpb25hbCkgZWl0aGVyIGFuIG9ic2VydmVyIGRlZmluaW5nIGFsbCBmdW5jdGlvbnMgdG8gYmUgY2FsbGVkLFxuICAgICAqICBvciB0aGUgZmlyc3Qgb2YgdGhyZWUgcG9zc2libGUgaGFuZGxlcnMsIHdoaWNoIGlzIHRoZSBoYW5kbGVyIGZvciBlYWNoIHZhbHVlIGVtaXR0ZWQgZnJvbSB0aGUgb2JzZXJ2YWJsZS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBlcnJvciAob3B0aW9uYWwpIGEgaGFuZGxlciBmb3IgYSB0ZXJtaW5hbCBldmVudCByZXN1bHRpbmcgZnJvbSBhbiBlcnJvci4gSWYgbm8gZXJyb3IgaGFuZGxlciBpcyBwcm92aWRlZCxcbiAgICAgKiAgdGhlIGVycm9yIHdpbGwgYmUgdGhyb3duIGFzIHVuaGFuZGxlZFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbXBsZXRlIChvcHRpb25hbCkgYSBoYW5kbGVyIGZvciBhIHRlcm1pbmFsIGV2ZW50IHJlc3VsdGluZyBmcm9tIHN1Y2Nlc3NmdWwgY29tcGxldGlvbi5cbiAgICAgKiBAcmV0dXJuIHtJU3Vic2NyaXB0aW9ufSBhIHN1YnNjcmlwdGlvbiByZWZlcmVuY2UgdG8gdGhlIHJlZ2lzdGVyZWQgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmUgPSBmdW5jdGlvbiAob2JzZXJ2ZXJPck5leHQsIGVycm9yLCBjb21wbGV0ZSkge1xuICAgICAgICB2YXIgb3BlcmF0b3IgPSB0aGlzLm9wZXJhdG9yO1xuICAgICAgICB2YXIgc2luayA9IHRvU3Vic2NyaWJlcl8xLnRvU3Vic2NyaWJlcihvYnNlcnZlck9yTmV4dCwgZXJyb3IsIGNvbXBsZXRlKTtcbiAgICAgICAgc2luay5hZGQob3BlcmF0b3IgPyBvcGVyYXRvci5jYWxsKHNpbmssIHRoaXMpIDogdGhpcy5fc3Vic2NyaWJlKHNpbmspKTtcbiAgICAgICAgaWYgKHNpbmsuc3luY0Vycm9yVGhyb3dhYmxlKSB7XG4gICAgICAgICAgICBzaW5rLnN5bmNFcnJvclRocm93YWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKHNpbmsuc3luY0Vycm9yVGhyb3duKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgc2luay5zeW5jRXJyb3JWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2luaztcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEBtZXRob2QgZm9yRWFjaFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHQgYSBoYW5kbGVyIGZvciBlYWNoIHZhbHVlIGVtaXR0ZWQgYnkgdGhlIG9ic2VydmFibGVcbiAgICAgKiBAcGFyYW0ge1Byb21pc2VDb25zdHJ1Y3Rvcn0gW1Byb21pc2VDdG9yXSBhIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHVzZWQgdG8gaW5zdGFudGlhdGUgdGhlIFByb21pc2VcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgdGhhdCBlaXRoZXIgcmVzb2x2ZXMgb24gb2JzZXJ2YWJsZSBjb21wbGV0aW9uIG9yXG4gICAgICogIHJlamVjdHMgd2l0aCB0aGUgaGFuZGxlZCBlcnJvclxuICAgICAqL1xuICAgIE9ic2VydmFibGUucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiAobmV4dCwgUHJvbWlzZUN0b3IpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgaWYgKCFQcm9taXNlQ3Rvcikge1xuICAgICAgICAgICAgaWYgKHJvb3RfMS5yb290LlJ4ICYmIHJvb3RfMS5yb290LlJ4LmNvbmZpZyAmJiByb290XzEucm9vdC5SeC5jb25maWcuUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgIFByb21pc2VDdG9yID0gcm9vdF8xLnJvb3QuUnguY29uZmlnLlByb21pc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChyb290XzEucm9vdC5Qcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgUHJvbWlzZUN0b3IgPSByb290XzEucm9vdC5Qcm9taXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghUHJvbWlzZUN0b3IpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gUHJvbWlzZSBpbXBsIGZvdW5kJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlQ3RvcihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgc3Vic2NyaXB0aW9uID0gX3RoaXMuc3Vic2NyaWJlKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChzdWJzY3JpcHRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgdGhlcmUgaXMgYSBzdWJzY3JpcHRpb24sIHRoZW4gd2UgY2FuIHN1cm1pc2VcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIG5leHQgaGFuZGxpbmcgaXMgYXN5bmNocm9ub3VzLiBBbnkgZXJyb3JzIHRocm93blxuICAgICAgICAgICAgICAgICAgICAvLyBuZWVkIHRvIGJlIHJlamVjdGVkIGV4cGxpY2l0bHkgYW5kIHVuc3Vic2NyaWJlIG11c3QgYmVcbiAgICAgICAgICAgICAgICAgICAgLy8gY2FsbGVkIG1hbnVhbGx5XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiB0aGVyZSBpcyBOTyBzdWJzY3JpcHRpb24sIHRoZW4gd2UncmUgZ2V0dGluZyBhIG5leHRlZFxuICAgICAgICAgICAgICAgICAgICAvLyB2YWx1ZSBzeW5jaHJvbm91c2x5IGR1cmluZyBzdWJzY3JpcHRpb24uIFdlIGNhbiBqdXN0IGNhbGwgaXQuXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIGl0IGVycm9ycywgT2JzZXJ2YWJsZSdzIGBzdWJzY3JpYmVgIGltcGxlIHdpbGwgZW5zdXJlIHRoZVxuICAgICAgICAgICAgICAgICAgICAvLyB1bnN1YnNjcmlwdGlvbiBsb2dpYyBpcyBjYWxsZWQsIHRoZW4gc3luY2hyb25vdXNseSByZXRocm93IHRoZSBlcnJvci5cbiAgICAgICAgICAgICAgICAgICAgLy8gQWZ0ZXIgdGhhdCwgUHJvbWlzZSB3aWxsIHRyYXAgdGhlIGVycm9yIGFuZCBzZW5kIGl0XG4gICAgICAgICAgICAgICAgICAgIC8vIGRvd24gdGhlIHJlamVjdGlvbiBwYXRoLlxuICAgICAgICAgICAgICAgICAgICBuZXh0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCByZWplY3QsIHJlc29sdmUpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIE9ic2VydmFibGUucHJvdG90eXBlLl9zdWJzY3JpYmUgPSBmdW5jdGlvbiAoc3Vic2NyaWJlcikge1xuICAgICAgICByZXR1cm4gdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKHN1YnNjcmliZXIpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQW4gaW50ZXJvcCBwb2ludCBkZWZpbmVkIGJ5IHRoZSBlczctb2JzZXJ2YWJsZSBzcGVjIGh0dHBzOi8vZ2l0aHViLmNvbS96ZW5wYXJzaW5nL2VzLW9ic2VydmFibGVcbiAgICAgKiBAbWV0aG9kIFN5bWJvbC5vYnNlcnZhYmxlXG4gICAgICogQHJldHVybiB7T2JzZXJ2YWJsZX0gdGhpcyBpbnN0YW5jZSBvZiB0aGUgb2JzZXJ2YWJsZVxuICAgICAqL1xuICAgIE9ic2VydmFibGUucHJvdG90eXBlW29ic2VydmFibGVfMS4kJG9ic2VydmFibGVdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIC8vIEhBQ0s6IFNpbmNlIFR5cGVTY3JpcHQgaW5oZXJpdHMgc3RhdGljIHByb3BlcnRpZXMgdG9vLCB3ZSBoYXZlIHRvXG4gICAgLy8gZmlnaHQgYWdhaW5zdCBUeXBlU2NyaXB0IGhlcmUgc28gU3ViamVjdCBjYW4gaGF2ZSBhIGRpZmZlcmVudCBzdGF0aWMgY3JlYXRlIHNpZ25hdHVyZVxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgY29sZCBPYnNlcnZhYmxlIGJ5IGNhbGxpbmcgdGhlIE9ic2VydmFibGUgY29uc3RydWN0b3JcbiAgICAgKiBAc3RhdGljIHRydWVcbiAgICAgKiBAb3duZXIgT2JzZXJ2YWJsZVxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gc3Vic2NyaWJlPyB0aGUgc3Vic2NyaWJlciBmdW5jdGlvbiB0byBiZSBwYXNzZWQgdG8gdGhlIE9ic2VydmFibGUgY29uc3RydWN0b3JcbiAgICAgKiBAcmV0dXJuIHtPYnNlcnZhYmxlfSBhIG5ldyBjb2xkIG9ic2VydmFibGVcbiAgICAgKi9cbiAgICBPYnNlcnZhYmxlLmNyZWF0ZSA9IGZ1bmN0aW9uIChzdWJzY3JpYmUpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlKHN1YnNjcmliZSk7XG4gICAgfTtcbiAgICByZXR1cm4gT2JzZXJ2YWJsZTtcbn0oKSk7XG5leHBvcnRzLk9ic2VydmFibGUgPSBPYnNlcnZhYmxlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9T2JzZXJ2YWJsZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbmV4cG9ydHMuZW1wdHkgPSB7XG4gICAgaXNVbnN1YnNjcmliZWQ6IHRydWUsXG4gICAgbmV4dDogZnVuY3Rpb24gKHZhbHVlKSB7IH0sXG4gICAgZXJyb3I6IGZ1bmN0aW9uIChlcnIpIHsgdGhyb3cgZXJyOyB9LFxuICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7IH1cbn07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1PYnNlcnZlci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIFN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4vU3Vic2NyaWJlcicpO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBPdXRlclN1YnNjcmliZXIgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhPdXRlclN1YnNjcmliZXIsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gT3V0ZXJTdWJzY3JpYmVyKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgT3V0ZXJTdWJzY3JpYmVyLnByb3RvdHlwZS5ub3RpZnlOZXh0ID0gZnVuY3Rpb24gKG91dGVyVmFsdWUsIGlubmVyVmFsdWUsIG91dGVySW5kZXgsIGlubmVySW5kZXgsIGlubmVyU3ViKSB7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24ubmV4dChpbm5lclZhbHVlKTtcbiAgICB9O1xuICAgIE91dGVyU3Vic2NyaWJlci5wcm90b3R5cGUubm90aWZ5RXJyb3IgPSBmdW5jdGlvbiAoZXJyb3IsIGlubmVyU3ViKSB7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24uZXJyb3IoZXJyb3IpO1xuICAgIH07XG4gICAgT3V0ZXJTdWJzY3JpYmVyLnByb3RvdHlwZS5ub3RpZnlDb21wbGV0ZSA9IGZ1bmN0aW9uIChpbm5lclN1Yikge1xuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmNvbXBsZXRlKCk7XG4gICAgfTtcbiAgICByZXR1cm4gT3V0ZXJTdWJzY3JpYmVyO1xufShTdWJzY3JpYmVyXzEuU3Vic2NyaWJlcikpO1xuZXhwb3J0cy5PdXRlclN1YnNjcmliZXIgPSBPdXRlclN1YnNjcmliZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1PdXRlclN1YnNjcmliZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuL09ic2VydmFibGUnKTtcbnZhciBTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuL1N1YnNjcmliZXInKTtcbnZhciBTdWJzY3JpcHRpb25fMSA9IHJlcXVpcmUoJy4vU3Vic2NyaXB0aW9uJyk7XG52YXIgU3ViamVjdFN1YnNjcmlwdGlvbl8xID0gcmVxdWlyZSgnLi9TdWJqZWN0U3Vic2NyaXB0aW9uJyk7XG52YXIgcnhTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuL3N5bWJvbC9yeFN1YnNjcmliZXInKTtcbnZhciB0aHJvd0Vycm9yXzEgPSByZXF1aXJlKCcuL3V0aWwvdGhyb3dFcnJvcicpO1xudmFyIE9iamVjdFVuc3Vic2NyaWJlZEVycm9yXzEgPSByZXF1aXJlKCcuL3V0aWwvT2JqZWN0VW5zdWJzY3JpYmVkRXJyb3InKTtcbi8qKlxuICogQGNsYXNzIFN1YmplY3Q8VD5cbiAqL1xudmFyIFN1YmplY3QgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTdWJqZWN0LCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFN1YmplY3QoZGVzdGluYXRpb24sIHNvdXJjZSkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbiA9IGRlc3RpbmF0aW9uO1xuICAgICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgICAgdGhpcy5vYnNlcnZlcnMgPSBbXTtcbiAgICAgICAgdGhpcy5pc1Vuc3Vic2NyaWJlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlzU3RvcHBlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc0Vycm9yZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaGluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc0NvbXBsZXRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICB9XG4gICAgU3ViamVjdC5wcm90b3R5cGUubGlmdCA9IGZ1bmN0aW9uIChvcGVyYXRvcikge1xuICAgICAgICB2YXIgc3ViamVjdCA9IG5ldyBTdWJqZWN0KHRoaXMuZGVzdGluYXRpb24gfHwgdGhpcywgdGhpcyk7XG4gICAgICAgIHN1YmplY3Qub3BlcmF0b3IgPSBvcGVyYXRvcjtcbiAgICAgICAgcmV0dXJuIHN1YmplY3Q7XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICAgIHJldHVybiBTdWJzY3JpcHRpb25fMS5TdWJzY3JpcHRpb24ucHJvdG90eXBlLmFkZC5jYWxsKHRoaXMsIHN1YnNjcmlwdGlvbik7XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICAgIFN1YnNjcmlwdGlvbl8xLlN1YnNjcmlwdGlvbi5wcm90b3R5cGUucmVtb3ZlLmNhbGwodGhpcywgc3Vic2NyaXB0aW9uKTtcbiAgICB9O1xuICAgIFN1YmplY3QucHJvdG90eXBlLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBTdWJzY3JpcHRpb25fMS5TdWJzY3JpcHRpb24ucHJvdG90eXBlLnVuc3Vic2NyaWJlLmNhbGwodGhpcyk7XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS5fc3Vic2NyaWJlID0gZnVuY3Rpb24gKHN1YnNjcmliZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuc291cmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKHN1YnNjcmliZXIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKHN1YnNjcmliZXIuaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzLmhhc0Vycm9yZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3Vic2NyaWJlci5lcnJvcih0aGlzLmVycm9yVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5oYXNDb21wbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy50aHJvd0lmVW5zdWJzY3JpYmVkKCk7XG4gICAgICAgICAgICB2YXIgc3Vic2NyaXB0aW9uID0gbmV3IFN1YmplY3RTdWJzY3JpcHRpb25fMS5TdWJqZWN0U3Vic2NyaXB0aW9uKHRoaXMsIHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgdGhpcy5vYnNlcnZlcnMucHVzaChzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN1YmplY3QucHJvdG90eXBlLl91bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5zb3VyY2UgPSBudWxsO1xuICAgICAgICB0aGlzLmlzU3RvcHBlZCA9IHRydWU7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXJzID0gbnVsbDtcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbiA9IG51bGw7XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMudGhyb3dJZlVuc3Vic2NyaWJlZCgpO1xuICAgICAgICBpZiAodGhpcy5pc1N0b3BwZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRpc3BhdGNoaW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fbmV4dCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hpbmcgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuaGFzRXJyb3JlZCkge1xuICAgICAgICAgICAgdGhpcy5fZXJyb3IodGhpcy5lcnJvclZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLmhhc0NvbXBsZXRlZCkge1xuICAgICAgICAgICAgdGhpcy5fY29tcGxldGUoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHRoaXMudGhyb3dJZlVuc3Vic2NyaWJlZCgpO1xuICAgICAgICBpZiAodGhpcy5pc1N0b3BwZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlzU3RvcHBlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuaGFzRXJyb3JlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuZXJyb3JWYWx1ZSA9IGVycjtcbiAgICAgICAgaWYgKHRoaXMuZGlzcGF0Y2hpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9lcnJvcihlcnIpO1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUuY29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMudGhyb3dJZlVuc3Vic2NyaWJlZCgpO1xuICAgICAgICBpZiAodGhpcy5pc1N0b3BwZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlzU3RvcHBlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuaGFzQ29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKHRoaXMuZGlzcGF0Y2hpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9jb21wbGV0ZSgpO1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUuYXNPYnNlcnZhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb2JzZXJ2YWJsZSA9IG5ldyBTdWJqZWN0T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgcmV0dXJuIG9ic2VydmFibGU7XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS5fbmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAodGhpcy5kZXN0aW5hdGlvbikge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5uZXh0KHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2ZpbmFsTmV4dCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN1YmplY3QucHJvdG90eXBlLl9maW5hbE5leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gLTE7XG4gICAgICAgIHZhciBvYnNlcnZlcnMgPSB0aGlzLm9ic2VydmVycy5zbGljZSgwKTtcbiAgICAgICAgdmFyIGxlbiA9IG9ic2VydmVycy5sZW5ndGg7XG4gICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBvYnNlcnZlcnNbaW5kZXhdLm5leHQodmFsdWUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS5fZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGlmICh0aGlzLmRlc3RpbmF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmVycm9yKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9maW5hbEVycm9yKGVycik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN1YmplY3QucHJvdG90eXBlLl9maW5hbEVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB2YXIgaW5kZXggPSAtMTtcbiAgICAgICAgdmFyIG9ic2VydmVycyA9IHRoaXMub2JzZXJ2ZXJzO1xuICAgICAgICAvLyBvcHRpbWl6YXRpb24gdG8gYmxvY2sgb3VyIFN1YmplY3RTdWJzY3JpcHRpb25zIGZyb21cbiAgICAgICAgLy8gc3BsaWNpbmcgdGhlbXNlbHZlcyBvdXQgb2YgdGhlIG9ic2VydmVycyBsaXN0IG9uZSBieSBvbmUuXG4gICAgICAgIHRoaXMub2JzZXJ2ZXJzID0gbnVsbDtcbiAgICAgICAgdGhpcy5pc1Vuc3Vic2NyaWJlZCA9IHRydWU7XG4gICAgICAgIGlmIChvYnNlcnZlcnMpIHtcbiAgICAgICAgICAgIHZhciBsZW4gPSBvYnNlcnZlcnMubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICBvYnNlcnZlcnNbaW5kZXhdLmVycm9yKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pc1Vuc3Vic2NyaWJlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS5fY29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmRlc3RpbmF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9maW5hbENvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN1YmplY3QucHJvdG90eXBlLl9maW5hbENvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaW5kZXggPSAtMTtcbiAgICAgICAgdmFyIG9ic2VydmVycyA9IHRoaXMub2JzZXJ2ZXJzO1xuICAgICAgICAvLyBvcHRpbWl6YXRpb24gdG8gYmxvY2sgb3VyIFN1YmplY3RTdWJzY3JpcHRpb25zIGZyb21cbiAgICAgICAgLy8gc3BsaWNpbmcgdGhlbXNlbHZlcyBvdXQgb2YgdGhlIG9ic2VydmVycyBsaXN0IG9uZSBieSBvbmUuXG4gICAgICAgIHRoaXMub2JzZXJ2ZXJzID0gbnVsbDtcbiAgICAgICAgdGhpcy5pc1Vuc3Vic2NyaWJlZCA9IHRydWU7XG4gICAgICAgIGlmIChvYnNlcnZlcnMpIHtcbiAgICAgICAgICAgIHZhciBsZW4gPSBvYnNlcnZlcnMubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICBvYnNlcnZlcnNbaW5kZXhdLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pc1Vuc3Vic2NyaWJlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS50aHJvd0lmVW5zdWJzY3JpYmVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcl8xLnRocm93RXJyb3IobmV3IE9iamVjdFVuc3Vic2NyaWJlZEVycm9yXzEuT2JqZWN0VW5zdWJzY3JpYmVkRXJyb3IoKSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN1YmplY3QucHJvdG90eXBlW3J4U3Vic2NyaWJlcl8xLiQkcnhTdWJzY3JpYmVyXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdWJzY3JpYmVyXzEuU3Vic2NyaWJlcih0aGlzKTtcbiAgICB9O1xuICAgIFN1YmplY3QuY3JlYXRlID0gZnVuY3Rpb24gKGRlc3RpbmF0aW9uLCBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdWJqZWN0KGRlc3RpbmF0aW9uLCBzb3VyY2UpO1xuICAgIH07XG4gICAgcmV0dXJuIFN1YmplY3Q7XG59KE9ic2VydmFibGVfMS5PYnNlcnZhYmxlKSk7XG5leHBvcnRzLlN1YmplY3QgPSBTdWJqZWN0O1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBTdWJqZWN0T2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFN1YmplY3RPYnNlcnZhYmxlLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFN1YmplY3RPYnNlcnZhYmxlKHNvdXJjZSkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgfVxuICAgIHJldHVybiBTdWJqZWN0T2JzZXJ2YWJsZTtcbn0oT2JzZXJ2YWJsZV8xLk9ic2VydmFibGUpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPVN1YmplY3QuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBTdWJzY3JpcHRpb25fMSA9IHJlcXVpcmUoJy4vU3Vic2NyaXB0aW9uJyk7XG4vKipcbiAqIFdlIG5lZWQgdGhpcyBKU0RvYyBjb21tZW50IGZvciBhZmZlY3RpbmcgRVNEb2MuXG4gKiBAaWdub3JlXG4gKiBAZXh0ZW5kcyB7SWdub3JlZH1cbiAqL1xudmFyIFN1YmplY3RTdWJzY3JpcHRpb24gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTdWJqZWN0U3Vic2NyaXB0aW9uLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFN1YmplY3RTdWJzY3JpcHRpb24oc3ViamVjdCwgb2JzZXJ2ZXIpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuc3ViamVjdCA9IHN1YmplY3Q7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXIgPSBvYnNlcnZlcjtcbiAgICAgICAgdGhpcy5pc1Vuc3Vic2NyaWJlZCA9IGZhbHNlO1xuICAgIH1cbiAgICBTdWJqZWN0U3Vic2NyaXB0aW9uLnByb3RvdHlwZS51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlzVW5zdWJzY3JpYmVkID0gdHJ1ZTtcbiAgICAgICAgdmFyIHN1YmplY3QgPSB0aGlzLnN1YmplY3Q7XG4gICAgICAgIHZhciBvYnNlcnZlcnMgPSBzdWJqZWN0Lm9ic2VydmVycztcbiAgICAgICAgdGhpcy5zdWJqZWN0ID0gbnVsbDtcbiAgICAgICAgaWYgKCFvYnNlcnZlcnMgfHwgb2JzZXJ2ZXJzLmxlbmd0aCA9PT0gMCB8fCBzdWJqZWN0LmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN1YnNjcmliZXJJbmRleCA9IG9ic2VydmVycy5pbmRleE9mKHRoaXMub2JzZXJ2ZXIpO1xuICAgICAgICBpZiAoc3Vic2NyaWJlckluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgb2JzZXJ2ZXJzLnNwbGljZShzdWJzY3JpYmVySW5kZXgsIDEpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gU3ViamVjdFN1YnNjcmlwdGlvbjtcbn0oU3Vic2NyaXB0aW9uXzEuU3Vic2NyaXB0aW9uKSk7XG5leHBvcnRzLlN1YmplY3RTdWJzY3JpcHRpb24gPSBTdWJqZWN0U3Vic2NyaXB0aW9uO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9U3ViamVjdFN1YnNjcmlwdGlvbi5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIGlzRnVuY3Rpb25fMSA9IHJlcXVpcmUoJy4vdXRpbC9pc0Z1bmN0aW9uJyk7XG52YXIgU3Vic2NyaXB0aW9uXzEgPSByZXF1aXJlKCcuL1N1YnNjcmlwdGlvbicpO1xudmFyIHJ4U3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi9zeW1ib2wvcnhTdWJzY3JpYmVyJyk7XG52YXIgT2JzZXJ2ZXJfMSA9IHJlcXVpcmUoJy4vT2JzZXJ2ZXInKTtcbi8qKlxuICogSW1wbGVtZW50cyB0aGUge0BsaW5rIE9ic2VydmVyfSBpbnRlcmZhY2UgYW5kIGV4dGVuZHMgdGhlXG4gKiB7QGxpbmsgU3Vic2NyaXB0aW9ufSBjbGFzcy4gV2hpbGUgdGhlIHtAbGluayBPYnNlcnZlcn0gaXMgdGhlIHB1YmxpYyBBUEkgZm9yXG4gKiBjb25zdW1pbmcgdGhlIHZhbHVlcyBvZiBhbiB7QGxpbmsgT2JzZXJ2YWJsZX0sIGFsbCBPYnNlcnZlcnMgZ2V0IGNvbnZlcnRlZCB0b1xuICogYSBTdWJzY3JpYmVyLCBpbiBvcmRlciB0byBwcm92aWRlIFN1YnNjcmlwdGlvbi1saWtlIGNhcGFiaWxpdGllcyBzdWNoIGFzXG4gKiBgdW5zdWJzY3JpYmVgLiBTdWJzY3JpYmVyIGlzIGEgY29tbW9uIHR5cGUgaW4gUnhKUywgYW5kIGNydWNpYWwgZm9yXG4gKiBpbXBsZW1lbnRpbmcgb3BlcmF0b3JzLCBidXQgaXQgaXMgcmFyZWx5IHVzZWQgYXMgYSBwdWJsaWMgQVBJLlxuICpcbiAqIEBjbGFzcyBTdWJzY3JpYmVyPFQ+XG4gKi9cbnZhciBTdWJzY3JpYmVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoU3Vic2NyaWJlciwgX3N1cGVyKTtcbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge09ic2VydmVyfGZ1bmN0aW9uKHZhbHVlOiBUKTogdm9pZH0gW2Rlc3RpbmF0aW9uT3JOZXh0XSBBIHBhcnRpYWxseVxuICAgICAqIGRlZmluZWQgT2JzZXJ2ZXIgb3IgYSBgbmV4dGAgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbihlOiA/YW55KTogdm9pZH0gW2Vycm9yXSBUaGUgYGVycm9yYCBjYWxsYmFjayBvZiBhblxuICAgICAqIE9ic2VydmVyLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb24oKTogdm9pZH0gW2NvbXBsZXRlXSBUaGUgYGNvbXBsZXRlYCBjYWxsYmFjayBvZiBhblxuICAgICAqIE9ic2VydmVyLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFN1YnNjcmliZXIoZGVzdGluYXRpb25Pck5leHQsIGVycm9yLCBjb21wbGV0ZSkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5zeW5jRXJyb3JWYWx1ZSA9IG51bGw7XG4gICAgICAgIHRoaXMuc3luY0Vycm9yVGhyb3duID0gZmFsc2U7XG4gICAgICAgIHRoaXMuc3luY0Vycm9yVGhyb3dhYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaXNTdG9wcGVkID0gZmFsc2U7XG4gICAgICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24gPSBPYnNlcnZlcl8xLmVtcHR5O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgIGlmICghZGVzdGluYXRpb25Pck5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbiA9IE9ic2VydmVyXzEuZW1wdHk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGRlc3RpbmF0aW9uT3JOZXh0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGVzdGluYXRpb25Pck5leHQgaW5zdGFuY2VvZiBTdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uID0gZGVzdGluYXRpb25Pck5leHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmFkZCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3luY0Vycm9yVGhyb3dhYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24gPSBuZXcgU2FmZVN1YnNjcmliZXIodGhpcywgZGVzdGluYXRpb25Pck5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhpcy5zeW5jRXJyb3JUaHJvd2FibGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24gPSBuZXcgU2FmZVN1YnNjcmliZXIodGhpcywgZGVzdGluYXRpb25Pck5leHQsIGVycm9yLCBjb21wbGV0ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogQSBzdGF0aWMgZmFjdG9yeSBmb3IgYSBTdWJzY3JpYmVyLCBnaXZlbiBhIChwb3RlbnRpYWxseSBwYXJ0aWFsKSBkZWZpbml0aW9uXG4gICAgICogb2YgYW4gT2JzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbih4OiA/VCk6IHZvaWR9IFtuZXh0XSBUaGUgYG5leHRgIGNhbGxiYWNrIG9mIGFuIE9ic2VydmVyLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb24oZTogP2FueSk6IHZvaWR9IFtlcnJvcl0gVGhlIGBlcnJvcmAgY2FsbGJhY2sgb2YgYW5cbiAgICAgKiBPYnNlcnZlci5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9uKCk6IHZvaWR9IFtjb21wbGV0ZV0gVGhlIGBjb21wbGV0ZWAgY2FsbGJhY2sgb2YgYW5cbiAgICAgKiBPYnNlcnZlci5cbiAgICAgKiBAcmV0dXJuIHtTdWJzY3JpYmVyPFQ+fSBBIFN1YnNjcmliZXIgd3JhcHBpbmcgdGhlIChwYXJ0aWFsbHkgZGVmaW5lZClcbiAgICAgKiBPYnNlcnZlciByZXByZXNlbnRlZCBieSB0aGUgZ2l2ZW4gYXJndW1lbnRzLlxuICAgICAqL1xuICAgIFN1YnNjcmliZXIuY3JlYXRlID0gZnVuY3Rpb24gKG5leHQsIGVycm9yLCBjb21wbGV0ZSkge1xuICAgICAgICB2YXIgc3Vic2NyaWJlciA9IG5ldyBTdWJzY3JpYmVyKG5leHQsIGVycm9yLCBjb21wbGV0ZSk7XG4gICAgICAgIHN1YnNjcmliZXIuc3luY0Vycm9yVGhyb3dhYmxlID0gZmFsc2U7XG4gICAgICAgIHJldHVybiBzdWJzY3JpYmVyO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogVGhlIHtAbGluayBPYnNlcnZlcn0gY2FsbGJhY2sgdG8gcmVjZWl2ZSBub3RpZmljYXRpb25zIG9mIHR5cGUgYG5leHRgIGZyb21cbiAgICAgKiB0aGUgT2JzZXJ2YWJsZSwgd2l0aCBhIHZhbHVlLiBUaGUgT2JzZXJ2YWJsZSBtYXkgY2FsbCB0aGlzIG1ldGhvZCAwIG9yIG1vcmVcbiAgICAgKiB0aW1lcy5cbiAgICAgKiBAcGFyYW0ge1R9IFt2YWx1ZV0gVGhlIGBuZXh0YCB2YWx1ZS5cbiAgICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgICAqL1xuICAgIFN1YnNjcmliZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzU3RvcHBlZCkge1xuICAgICAgICAgICAgdGhpcy5fbmV4dCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFRoZSB7QGxpbmsgT2JzZXJ2ZXJ9IGNhbGxiYWNrIHRvIHJlY2VpdmUgbm90aWZpY2F0aW9ucyBvZiB0eXBlIGBlcnJvcmAgZnJvbVxuICAgICAqIHRoZSBPYnNlcnZhYmxlLCB3aXRoIGFuIGF0dGFjaGVkIHtAbGluayBFcnJvcn0uIE5vdGlmaWVzIHRoZSBPYnNlcnZlciB0aGF0XG4gICAgICogdGhlIE9ic2VydmFibGUgaGFzIGV4cGVyaWVuY2VkIGFuIGVycm9yIGNvbmRpdGlvbi5cbiAgICAgKiBAcGFyYW0ge2FueX0gW2Vycl0gVGhlIGBlcnJvcmAgZXhjZXB0aW9uLlxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgU3Vic2NyaWJlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGlmICghdGhpcy5pc1N0b3BwZWQpIHtcbiAgICAgICAgICAgIHRoaXMuaXNTdG9wcGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKGVycik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFRoZSB7QGxpbmsgT2JzZXJ2ZXJ9IGNhbGxiYWNrIHRvIHJlY2VpdmUgYSB2YWx1ZWxlc3Mgbm90aWZpY2F0aW9uIG9mIHR5cGVcbiAgICAgKiBgY29tcGxldGVgIGZyb20gdGhlIE9ic2VydmFibGUuIE5vdGlmaWVzIHRoZSBPYnNlcnZlciB0aGF0IHRoZSBPYnNlcnZhYmxlXG4gICAgICogaGFzIGZpbmlzaGVkIHNlbmRpbmcgcHVzaC1iYXNlZCBub3RpZmljYXRpb25zLlxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgU3Vic2NyaWJlci5wcm90b3R5cGUuY29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghdGhpcy5pc1N0b3BwZWQpIHtcbiAgICAgICAgICAgIHRoaXMuaXNTdG9wcGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX2NvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN1YnNjcmliZXIucHJvdG90eXBlLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXNTdG9wcGVkID0gdHJ1ZTtcbiAgICAgICAgX3N1cGVyLnByb3RvdHlwZS51bnN1YnNjcmliZS5jYWxsKHRoaXMpO1xuICAgIH07XG4gICAgU3Vic2NyaWJlci5wcm90b3R5cGUuX25leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5uZXh0KHZhbHVlKTtcbiAgICB9O1xuICAgIFN1YnNjcmliZXIucHJvdG90eXBlLl9lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5lcnJvcihlcnIpO1xuICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgfTtcbiAgICBTdWJzY3JpYmVyLnByb3RvdHlwZS5fY29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24uY29tcGxldGUoKTtcbiAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgIH07XG4gICAgU3Vic2NyaWJlci5wcm90b3R5cGVbcnhTdWJzY3JpYmVyXzEuJCRyeFN1YnNjcmliZXJdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIHJldHVybiBTdWJzY3JpYmVyO1xufShTdWJzY3JpcHRpb25fMS5TdWJzY3JpcHRpb24pKTtcbmV4cG9ydHMuU3Vic2NyaWJlciA9IFN1YnNjcmliZXI7XG4vKipcbiAqIFdlIG5lZWQgdGhpcyBKU0RvYyBjb21tZW50IGZvciBhZmZlY3RpbmcgRVNEb2MuXG4gKiBAaWdub3JlXG4gKiBAZXh0ZW5kcyB7SWdub3JlZH1cbiAqL1xudmFyIFNhZmVTdWJzY3JpYmVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoU2FmZVN1YnNjcmliZXIsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gU2FmZVN1YnNjcmliZXIoX3BhcmVudCwgb2JzZXJ2ZXJPck5leHQsIGVycm9yLCBjb21wbGV0ZSkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5fcGFyZW50ID0gX3BhcmVudDtcbiAgICAgICAgdmFyIG5leHQ7XG4gICAgICAgIHZhciBjb250ZXh0ID0gdGhpcztcbiAgICAgICAgaWYgKGlzRnVuY3Rpb25fMS5pc0Z1bmN0aW9uKG9ic2VydmVyT3JOZXh0KSkge1xuICAgICAgICAgICAgbmV4dCA9IG9ic2VydmVyT3JOZXh0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG9ic2VydmVyT3JOZXh0KSB7XG4gICAgICAgICAgICBjb250ZXh0ID0gb2JzZXJ2ZXJPck5leHQ7XG4gICAgICAgICAgICBuZXh0ID0gb2JzZXJ2ZXJPck5leHQubmV4dDtcbiAgICAgICAgICAgIGVycm9yID0gb2JzZXJ2ZXJPck5leHQuZXJyb3I7XG4gICAgICAgICAgICBjb21wbGV0ZSA9IG9ic2VydmVyT3JOZXh0LmNvbXBsZXRlO1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb25fMS5pc0Z1bmN0aW9uKGNvbnRleHQudW5zdWJzY3JpYmUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGQoY29udGV4dC51bnN1YnNjcmliZS5iaW5kKGNvbnRleHQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRleHQudW5zdWJzY3JpYmUgPSB0aGlzLnVuc3Vic2NyaWJlLmJpbmQodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgIHRoaXMuX25leHQgPSBuZXh0O1xuICAgICAgICB0aGlzLl9lcnJvciA9IGVycm9yO1xuICAgICAgICB0aGlzLl9jb21wbGV0ZSA9IGNvbXBsZXRlO1xuICAgIH1cbiAgICBTYWZlU3Vic2NyaWJlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAoIXRoaXMuaXNTdG9wcGVkICYmIHRoaXMuX25leHQpIHtcbiAgICAgICAgICAgIHZhciBfcGFyZW50ID0gdGhpcy5fcGFyZW50O1xuICAgICAgICAgICAgaWYgKCFfcGFyZW50LnN5bmNFcnJvclRocm93YWJsZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX190cnlPclVuc3ViKHRoaXMuX25leHQsIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuX190cnlPclNldEVycm9yKF9wYXJlbnQsIHRoaXMuX25leHQsIHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgU2FmZVN1YnNjcmliZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICBpZiAoIXRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgICAgICB2YXIgX3BhcmVudCA9IHRoaXMuX3BhcmVudDtcbiAgICAgICAgICAgIGlmICh0aGlzLl9lcnJvcikge1xuICAgICAgICAgICAgICAgIGlmICghX3BhcmVudC5zeW5jRXJyb3JUaHJvd2FibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3RyeU9yVW5zdWIodGhpcy5fZXJyb3IsIGVycik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX190cnlPclNldEVycm9yKF9wYXJlbnQsIHRoaXMuX2Vycm9yLCBlcnIpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoIV9wYXJlbnQuc3luY0Vycm9yVGhyb3dhYmxlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIF9wYXJlbnQuc3luY0Vycm9yVmFsdWUgPSBlcnI7XG4gICAgICAgICAgICAgICAgX3BhcmVudC5zeW5jRXJyb3JUaHJvd24gPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgU2FmZVN1YnNjcmliZXIucHJvdG90eXBlLmNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgICAgICB2YXIgX3BhcmVudCA9IHRoaXMuX3BhcmVudDtcbiAgICAgICAgICAgIGlmICh0aGlzLl9jb21wbGV0ZSkge1xuICAgICAgICAgICAgICAgIGlmICghX3BhcmVudC5zeW5jRXJyb3JUaHJvd2FibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3RyeU9yVW5zdWIodGhpcy5fY29tcGxldGUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fdHJ5T3JTZXRFcnJvcihfcGFyZW50LCB0aGlzLl9jb21wbGV0ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFNhZmVTdWJzY3JpYmVyLnByb3RvdHlwZS5fX3RyeU9yVW5zdWIgPSBmdW5jdGlvbiAoZm4sIHZhbHVlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmbi5jYWxsKHRoaXMuX2NvbnRleHQsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFNhZmVTdWJzY3JpYmVyLnByb3RvdHlwZS5fX3RyeU9yU2V0RXJyb3IgPSBmdW5jdGlvbiAocGFyZW50LCBmbiwgdmFsdWUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZuLmNhbGwodGhpcy5fY29udGV4dCwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHBhcmVudC5zeW5jRXJyb3JWYWx1ZSA9IGVycjtcbiAgICAgICAgICAgIHBhcmVudC5zeW5jRXJyb3JUaHJvd24gPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgU2FmZVN1YnNjcmliZXIucHJvdG90eXBlLl91bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIF9wYXJlbnQgPSB0aGlzLl9wYXJlbnQ7XG4gICAgICAgIHRoaXMuX2NvbnRleHQgPSBudWxsO1xuICAgICAgICB0aGlzLl9wYXJlbnQgPSBudWxsO1xuICAgICAgICBfcGFyZW50LnVuc3Vic2NyaWJlKCk7XG4gICAgfTtcbiAgICByZXR1cm4gU2FmZVN1YnNjcmliZXI7XG59KFN1YnNjcmliZXIpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPVN1YnNjcmliZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgaXNBcnJheV8xID0gcmVxdWlyZSgnLi91dGlsL2lzQXJyYXknKTtcbnZhciBpc09iamVjdF8xID0gcmVxdWlyZSgnLi91dGlsL2lzT2JqZWN0Jyk7XG52YXIgaXNGdW5jdGlvbl8xID0gcmVxdWlyZSgnLi91dGlsL2lzRnVuY3Rpb24nKTtcbnZhciB0cnlDYXRjaF8xID0gcmVxdWlyZSgnLi91dGlsL3RyeUNhdGNoJyk7XG52YXIgZXJyb3JPYmplY3RfMSA9IHJlcXVpcmUoJy4vdXRpbC9lcnJvck9iamVjdCcpO1xudmFyIFVuc3Vic2NyaXB0aW9uRXJyb3JfMSA9IHJlcXVpcmUoJy4vdXRpbC9VbnN1YnNjcmlwdGlvbkVycm9yJyk7XG4vKipcbiAqIFJlcHJlc2VudHMgYSBkaXNwb3NhYmxlIHJlc291cmNlLCBzdWNoIGFzIHRoZSBleGVjdXRpb24gb2YgYW4gT2JzZXJ2YWJsZS4gQVxuICogU3Vic2NyaXB0aW9uIGhhcyBvbmUgaW1wb3J0YW50IG1ldGhvZCwgYHVuc3Vic2NyaWJlYCwgdGhhdCB0YWtlcyBubyBhcmd1bWVudFxuICogYW5kIGp1c3QgZGlzcG9zZXMgdGhlIHJlc291cmNlIGhlbGQgYnkgdGhlIHN1YnNjcmlwdGlvbi5cbiAqXG4gKiBBZGRpdGlvbmFsbHksIHN1YnNjcmlwdGlvbnMgbWF5IGJlIGdyb3VwZWQgdG9nZXRoZXIgdGhyb3VnaCB0aGUgYGFkZCgpYFxuICogbWV0aG9kLCB3aGljaCB3aWxsIGF0dGFjaCBhIGNoaWxkIFN1YnNjcmlwdGlvbiB0byB0aGUgY3VycmVudCBTdWJzY3JpcHRpb24uXG4gKiBXaGVuIGEgU3Vic2NyaXB0aW9uIGlzIHVuc3Vic2NyaWJlZCwgYWxsIGl0cyBjaGlsZHJlbiAoYW5kIGl0cyBncmFuZGNoaWxkcmVuKVxuICogd2lsbCBiZSB1bnN1YnNjcmliZWQgYXMgd2VsbC5cbiAqXG4gKiBAY2xhc3MgU3Vic2NyaXB0aW9uXG4gKi9cbnZhciBTdWJzY3JpcHRpb24gPSAoZnVuY3Rpb24gKCkge1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb24oKTogdm9pZH0gW3Vuc3Vic2NyaWJlXSBBIGZ1bmN0aW9uIGRlc2NyaWJpbmcgaG93IHRvXG4gICAgICogcGVyZm9ybSB0aGUgZGlzcG9zYWwgb2YgcmVzb3VyY2VzIHdoZW4gdGhlIGB1bnN1YnNjcmliZWAgbWV0aG9kIGlzIGNhbGxlZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBTdWJzY3JpcHRpb24odW5zdWJzY3JpYmUpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEEgZmxhZyB0byBpbmRpY2F0ZSB3aGV0aGVyIHRoaXMgU3Vic2NyaXB0aW9uIGhhcyBhbHJlYWR5IGJlZW4gdW5zdWJzY3JpYmVkLlxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaXNVbnN1YnNjcmliZWQgPSBmYWxzZTtcbiAgICAgICAgaWYgKHVuc3Vic2NyaWJlKSB7XG4gICAgICAgICAgICB0aGlzLl91bnN1YnNjcmliZSA9IHVuc3Vic2NyaWJlO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIERpc3Bvc2VzIHRoZSByZXNvdXJjZXMgaGVsZCBieSB0aGUgc3Vic2NyaXB0aW9uLiBNYXksIGZvciBpbnN0YW5jZSwgY2FuY2VsXG4gICAgICogYW4gb25nb2luZyBPYnNlcnZhYmxlIGV4ZWN1dGlvbiBvciBjYW5jZWwgYW55IG90aGVyIHR5cGUgb2Ygd29yayB0aGF0XG4gICAgICogc3RhcnRlZCB3aGVuIHRoZSBTdWJzY3JpcHRpb24gd2FzIGNyZWF0ZWQuXG4gICAgICogQHJldHVybiB7dm9pZH1cbiAgICAgKi9cbiAgICBTdWJzY3JpcHRpb24ucHJvdG90eXBlLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaGFzRXJyb3JzID0gZmFsc2U7XG4gICAgICAgIHZhciBlcnJvcnM7XG4gICAgICAgIGlmICh0aGlzLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pc1Vuc3Vic2NyaWJlZCA9IHRydWU7XG4gICAgICAgIHZhciBfYSA9IHRoaXMsIF91bnN1YnNjcmliZSA9IF9hLl91bnN1YnNjcmliZSwgX3N1YnNjcmlwdGlvbnMgPSBfYS5fc3Vic2NyaXB0aW9ucztcbiAgICAgICAgdGhpcy5fc3Vic2NyaXB0aW9ucyA9IG51bGw7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uXzEuaXNGdW5jdGlvbihfdW5zdWJzY3JpYmUpKSB7XG4gICAgICAgICAgICB2YXIgdHJpYWwgPSB0cnlDYXRjaF8xLnRyeUNhdGNoKF91bnN1YnNjcmliZSkuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIGlmICh0cmlhbCA9PT0gZXJyb3JPYmplY3RfMS5lcnJvck9iamVjdCkge1xuICAgICAgICAgICAgICAgIGhhc0Vycm9ycyA9IHRydWU7XG4gICAgICAgICAgICAgICAgKGVycm9ycyA9IGVycm9ycyB8fCBbXSkucHVzaChlcnJvck9iamVjdF8xLmVycm9yT2JqZWN0LmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpc0FycmF5XzEuaXNBcnJheShfc3Vic2NyaXB0aW9ucykpIHtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IC0xO1xuICAgICAgICAgICAgdmFyIGxlbiA9IF9zdWJzY3JpcHRpb25zLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN1YiA9IF9zdWJzY3JpcHRpb25zW2luZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoaXNPYmplY3RfMS5pc09iamVjdChzdWIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0cmlhbCA9IHRyeUNhdGNoXzEudHJ5Q2F0Y2goc3ViLnVuc3Vic2NyaWJlKS5jYWxsKHN1Yik7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0cmlhbCA9PT0gZXJyb3JPYmplY3RfMS5lcnJvck9iamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFzRXJyb3JzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9ycyA9IGVycm9ycyB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlcnIgPSBlcnJvck9iamVjdF8xLmVycm9yT2JqZWN0LmU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgVW5zdWJzY3JpcHRpb25FcnJvcl8xLlVuc3Vic2NyaXB0aW9uRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcnMgPSBlcnJvcnMuY29uY2F0KGVyci5lcnJvcnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaGFzRXJyb3JzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVW5zdWJzY3JpcHRpb25FcnJvcl8xLlVuc3Vic2NyaXB0aW9uRXJyb3IoZXJyb3JzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgLyoqXG4gICAgICogQWRkcyBhIHRlYXIgZG93biB0byBiZSBjYWxsZWQgZHVyaW5nIHRoZSB1bnN1YnNjcmliZSgpIG9mIHRoaXNcbiAgICAgKiBTdWJzY3JpcHRpb24uXG4gICAgICpcbiAgICAgKiBJZiB0aGUgdGVhciBkb3duIGJlaW5nIGFkZGVkIGlzIGEgc3Vic2NyaXB0aW9uIHRoYXQgaXMgYWxyZWFkeVxuICAgICAqIHVuc3Vic2NyaWJlZCwgaXMgdGhlIHNhbWUgcmVmZXJlbmNlIGBhZGRgIGlzIGJlaW5nIGNhbGxlZCBvbiwgb3IgaXNcbiAgICAgKiBgU3Vic2NyaXB0aW9uLkVNUFRZYCwgaXQgd2lsbCBub3QgYmUgYWRkZWQuXG4gICAgICpcbiAgICAgKiBJZiB0aGlzIHN1YnNjcmlwdGlvbiBpcyBhbHJlYWR5IGluIGFuIGBpc1Vuc3Vic2NyaWJlZGAgc3RhdGUsIHRoZSBwYXNzZWRcbiAgICAgKiB0ZWFyIGRvd24gbG9naWMgd2lsbCBiZSBleGVjdXRlZCBpbW1lZGlhdGVseS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7VGVhcmRvd25Mb2dpY30gdGVhcmRvd24gVGhlIGFkZGl0aW9uYWwgbG9naWMgdG8gZXhlY3V0ZSBvblxuICAgICAqIHRlYXJkb3duLlxuICAgICAqIEByZXR1cm4ge1N1YnNjcmlwdGlvbn0gUmV0dXJucyB0aGUgU3Vic2NyaXB0aW9uIHVzZWQgb3IgY3JlYXRlZCB0byBiZVxuICAgICAqIGFkZGVkIHRvIHRoZSBpbm5lciBzdWJzY3JpcHRpb25zIGxpc3QuIFRoaXMgU3Vic2NyaXB0aW9uIGNhbiBiZSB1c2VkIHdpdGhcbiAgICAgKiBgcmVtb3ZlKClgIHRvIHJlbW92ZSB0aGUgcGFzc2VkIHRlYXJkb3duIGxvZ2ljIGZyb20gdGhlIGlubmVyIHN1YnNjcmlwdGlvbnNcbiAgICAgKiBsaXN0LlxuICAgICAqL1xuICAgIFN1YnNjcmlwdGlvbi5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKHRlYXJkb3duKSB7XG4gICAgICAgIGlmICghdGVhcmRvd24gfHwgKHRlYXJkb3duID09PSB0aGlzKSB8fCAodGVhcmRvd24gPT09IFN1YnNjcmlwdGlvbi5FTVBUWSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3ViID0gdGVhcmRvd247XG4gICAgICAgIHN3aXRjaCAodHlwZW9mIHRlYXJkb3duKSB7XG4gICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgc3ViID0gbmV3IFN1YnNjcmlwdGlvbih0ZWFyZG93bik7XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICAgIGlmIChzdWIuaXNVbnN1YnNjcmliZWQgfHwgdHlwZW9mIHN1Yi51bnN1YnNjcmliZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgICAgICAgICBzdWIudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzLl9zdWJzY3JpcHRpb25zIHx8ICh0aGlzLl9zdWJzY3JpcHRpb25zID0gW10pKS5wdXNoKHN1Yik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VucmVjb2duaXplZCB0ZWFyZG93biAnICsgdGVhcmRvd24gKyAnIGFkZGVkIHRvIFN1YnNjcmlwdGlvbi4nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ViO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBhIFN1YnNjcmlwdGlvbiBmcm9tIHRoZSBpbnRlcm5hbCBsaXN0IG9mIHN1YnNjcmlwdGlvbnMgdGhhdCB3aWxsXG4gICAgICogdW5zdWJzY3JpYmUgZHVyaW5nIHRoZSB1bnN1YnNjcmliZSBwcm9jZXNzIG9mIHRoaXMgU3Vic2NyaXB0aW9uLlxuICAgICAqIEBwYXJhbSB7U3Vic2NyaXB0aW9ufSBzdWJzY3JpcHRpb24gVGhlIHN1YnNjcmlwdGlvbiB0byByZW1vdmUuXG4gICAgICogQHJldHVybiB7dm9pZH1cbiAgICAgKi9cbiAgICBTdWJzY3JpcHRpb24ucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChzdWJzY3JpcHRpb24pIHtcbiAgICAgICAgLy8gSEFDSzogVGhpcyBtaWdodCBiZSByZWR1bmRhbnQgYmVjYXVzZSBvZiB0aGUgbG9naWMgaW4gYGFkZCgpYFxuICAgICAgICBpZiAoc3Vic2NyaXB0aW9uID09IG51bGwgfHwgKHN1YnNjcmlwdGlvbiA9PT0gdGhpcykgfHwgKHN1YnNjcmlwdGlvbiA9PT0gU3Vic2NyaXB0aW9uLkVNUFRZKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdWJzY3JpcHRpb25zID0gdGhpcy5fc3Vic2NyaXB0aW9ucztcbiAgICAgICAgaWYgKHN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBzdWJzY3JpcHRpb25JbmRleCA9IHN1YnNjcmlwdGlvbnMuaW5kZXhPZihzdWJzY3JpcHRpb24pO1xuICAgICAgICAgICAgaWYgKHN1YnNjcmlwdGlvbkluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHN1YnNjcmlwdGlvbnMuc3BsaWNlKHN1YnNjcmlwdGlvbkluZGV4LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgU3Vic2NyaXB0aW9uLkVNUFRZID0gKGZ1bmN0aW9uIChlbXB0eSkge1xuICAgICAgICBlbXB0eS5pc1Vuc3Vic2NyaWJlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBlbXB0eTtcbiAgICB9KG5ldyBTdWJzY3JpcHRpb24oKSkpO1xuICAgIHJldHVybiBTdWJzY3JpcHRpb247XG59KCkpO1xuZXhwb3J0cy5TdWJzY3JpcHRpb24gPSBTdWJzY3JpcHRpb247XG4vLyMgc291cmNlTWFwcGluZ1VSTD1TdWJzY3JpcHRpb24uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vLi4vT2JzZXJ2YWJsZScpO1xudmFyIGNvbWJpbmVMYXRlc3RfMSA9IHJlcXVpcmUoJy4uLy4uL29wZXJhdG9yL2NvbWJpbmVMYXRlc3QnKTtcbk9ic2VydmFibGVfMS5PYnNlcnZhYmxlLmNvbWJpbmVMYXRlc3QgPSBjb21iaW5lTGF0ZXN0XzEuY29tYmluZUxhdGVzdFN0YXRpYztcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvbWJpbmVMYXRlc3QuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vLi4vT2JzZXJ2YWJsZScpO1xudmFyIG9mXzEgPSByZXF1aXJlKCcuLi8uLi9vYnNlcnZhYmxlL29mJyk7XG5PYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZS5vZiA9IG9mXzEub2Y7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1vZi5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi8uLi9PYnNlcnZhYmxlJyk7XG52YXIgZmlsdGVyXzEgPSByZXF1aXJlKCcuLi8uLi9vcGVyYXRvci9maWx0ZXInKTtcbk9ic2VydmFibGVfMS5PYnNlcnZhYmxlLnByb3RvdHlwZS5maWx0ZXIgPSBmaWx0ZXJfMS5maWx0ZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1maWx0ZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vLi4vT2JzZXJ2YWJsZScpO1xudmFyIG1hcF8xID0gcmVxdWlyZSgnLi4vLi4vb3BlcmF0b3IvbWFwJyk7XG5PYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZS5wcm90b3R5cGUubWFwID0gbWFwXzEubWFwO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWFwLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uLy4uL09ic2VydmFibGUnKTtcbnZhciBtYXBUb18xID0gcmVxdWlyZSgnLi4vLi4vb3BlcmF0b3IvbWFwVG8nKTtcbk9ic2VydmFibGVfMS5PYnNlcnZhYmxlLnByb3RvdHlwZS5tYXBUbyA9IG1hcFRvXzEubWFwVG87XG4vLyMgc291cmNlTWFwcGluZ1VSTD1tYXBUby5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi8uLi9PYnNlcnZhYmxlJyk7XG52YXIgbWVyZ2VfMSA9IHJlcXVpcmUoJy4uLy4uL29wZXJhdG9yL21lcmdlJyk7XG5PYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZS5wcm90b3R5cGUubWVyZ2UgPSBtZXJnZV8xLm1lcmdlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWVyZ2UuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vLi4vT2JzZXJ2YWJsZScpO1xudmFyIHNjYW5fMSA9IHJlcXVpcmUoJy4uLy4uL29wZXJhdG9yL3NjYW4nKTtcbk9ic2VydmFibGVfMS5PYnNlcnZhYmxlLnByb3RvdHlwZS5zY2FuID0gc2Nhbl8xLnNjYW47XG4vLyMgc291cmNlTWFwcGluZ1VSTD1zY2FuLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uLy4uL09ic2VydmFibGUnKTtcbnZhciBzaGFyZV8xID0gcmVxdWlyZSgnLi4vLi4vb3BlcmF0b3Ivc2hhcmUnKTtcbk9ic2VydmFibGVfMS5PYnNlcnZhYmxlLnByb3RvdHlwZS5zaGFyZSA9IHNoYXJlXzEuc2hhcmU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1zaGFyZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi8uLi9PYnNlcnZhYmxlJyk7XG52YXIgc3RhcnRXaXRoXzEgPSByZXF1aXJlKCcuLi8uLi9vcGVyYXRvci9zdGFydFdpdGgnKTtcbk9ic2VydmFibGVfMS5PYnNlcnZhYmxlLnByb3RvdHlwZS5zdGFydFdpdGggPSBzdGFydFdpdGhfMS5zdGFydFdpdGg7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1zdGFydFdpdGguanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vLi4vT2JzZXJ2YWJsZScpO1xudmFyIHN3aXRjaE1hcF8xID0gcmVxdWlyZSgnLi4vLi4vb3BlcmF0b3Ivc3dpdGNoTWFwJyk7XG5PYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3dpdGNoTWFwID0gc3dpdGNoTWFwXzEuc3dpdGNoTWFwO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c3dpdGNoTWFwLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uLy4uL09ic2VydmFibGUnKTtcbnZhciB3aXRoTGF0ZXN0RnJvbV8xID0gcmVxdWlyZSgnLi4vLi4vb3BlcmF0b3Ivd2l0aExhdGVzdEZyb20nKTtcbk9ic2VydmFibGVfMS5PYnNlcnZhYmxlLnByb3RvdHlwZS53aXRoTGF0ZXN0RnJvbSA9IHdpdGhMYXRlc3RGcm9tXzEud2l0aExhdGVzdEZyb207XG4vLyMgc291cmNlTWFwcGluZ1VSTD13aXRoTGF0ZXN0RnJvbS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uL09ic2VydmFibGUnKTtcbnZhciBTY2FsYXJPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuL1NjYWxhck9ic2VydmFibGUnKTtcbnZhciBFbXB0eU9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4vRW1wdHlPYnNlcnZhYmxlJyk7XG52YXIgaXNTY2hlZHVsZXJfMSA9IHJlcXVpcmUoJy4uL3V0aWwvaXNTY2hlZHVsZXInKTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICogQGhpZGUgdHJ1ZVxuICovXG52YXIgQXJyYXlPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQXJyYXlPYnNlcnZhYmxlLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEFycmF5T2JzZXJ2YWJsZShhcnJheSwgc2NoZWR1bGVyKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG4gICAgICAgIHRoaXMuc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICAgICAgICBpZiAoIXNjaGVkdWxlciAmJiBhcnJheS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHRoaXMuX2lzU2NhbGFyID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBhcnJheVswXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBBcnJheU9ic2VydmFibGUuY3JlYXRlID0gZnVuY3Rpb24gKGFycmF5LCBzY2hlZHVsZXIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBBcnJheU9ic2VydmFibGUoYXJyYXksIHNjaGVkdWxlcik7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyBzb21lIHZhbHVlcyB5b3Ugc3BlY2lmeSBhcyBhcmd1bWVudHMsXG4gICAgICogaW1tZWRpYXRlbHkgb25lIGFmdGVyIHRoZSBvdGhlciwgYW5kIHRoZW4gZW1pdHMgYSBjb21wbGV0ZSBub3RpZmljYXRpb24uXG4gICAgICpcbiAgICAgKiA8c3BhbiBjbGFzcz1cImluZm9ybWFsXCI+RW1pdHMgdGhlIGFyZ3VtZW50cyB5b3UgcHJvdmlkZSwgdGhlbiBjb21wbGV0ZXMuXG4gICAgICogPC9zcGFuPlxuICAgICAqXG4gICAgICogPGltZyBzcmM9XCIuL2ltZy9vZi5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAgICAgKlxuICAgICAqIFRoaXMgc3RhdGljIG9wZXJhdG9yIGlzIHVzZWZ1bCBmb3IgY3JlYXRpbmcgYSBzaW1wbGUgT2JzZXJ2YWJsZSB0aGF0IG9ubHlcbiAgICAgKiBlbWl0cyB0aGUgYXJndW1lbnRzIGdpdmVuLCBhbmQgdGhlIGNvbXBsZXRlIG5vdGlmaWNhdGlvbiB0aGVyZWFmdGVyLiBJdCBjYW5cbiAgICAgKiBiZSB1c2VkIGZvciBjb21wb3Npbmcgd2l0aCBvdGhlciBPYnNlcnZhYmxlcywgc3VjaCBhcyB3aXRoIHtAbGluayBjb25jYXR9LlxuICAgICAqIEJ5IGRlZmF1bHQsIGl0IHVzZXMgYSBgbnVsbGAgU2NoZWR1bGVyLCB3aGljaCBtZWFucyB0aGUgYG5leHRgXG4gICAgICogbm90aWZpY2F0aW9ucyBhcmUgc2VudCBzeW5jaHJvbm91c2x5LCBhbHRob3VnaCB3aXRoIGEgZGlmZmVyZW50IFNjaGVkdWxlclxuICAgICAqIGl0IGlzIHBvc3NpYmxlIHRvIGRldGVybWluZSB3aGVuIHRob3NlIG5vdGlmaWNhdGlvbnMgd2lsbCBiZSBkZWxpdmVyZWQuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8Y2FwdGlvbj5FbWl0IDEwLCAyMCwgMzAsIHRoZW4gJ2EnLCAnYicsICdjJywgdGhlbiBzdGFydCB0aWNraW5nIGV2ZXJ5IHNlY29uZC48L2NhcHRpb24+XG4gICAgICogdmFyIG51bWJlcnMgPSBSeC5PYnNlcnZhYmxlLm9mKDEwLCAyMCwgMzApO1xuICAgICAqIHZhciBsZXR0ZXJzID0gUnguT2JzZXJ2YWJsZS5vZignYScsICdiJywgJ2MnKTtcbiAgICAgKiB2YXIgaW50ZXJ2YWwgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMDApO1xuICAgICAqIHZhciByZXN1bHQgPSBudW1iZXJzLmNvbmNhdChsZXR0ZXJzKS5jb25jYXQoaW50ZXJ2YWwpO1xuICAgICAqIHJlc3VsdC5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gICAgICpcbiAgICAgKiBAc2VlIHtAbGluayBjcmVhdGV9XG4gICAgICogQHNlZSB7QGxpbmsgZW1wdHl9XG4gICAgICogQHNlZSB7QGxpbmsgbmV2ZXJ9XG4gICAgICogQHNlZSB7QGxpbmsgdGhyb3d9XG4gICAgICpcbiAgICAgKiBAcGFyYW0gey4uLlR9IHZhbHVlcyBBcmd1bWVudHMgdGhhdCByZXByZXNlbnQgYG5leHRgIHZhbHVlcyB0byBiZSBlbWl0dGVkLlxuICAgICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSBBIHtAbGluayBTY2hlZHVsZXJ9IHRvIHVzZSBmb3Igc2NoZWR1bGluZ1xuICAgICAqIHRoZSBlbWlzc2lvbnMgb2YgdGhlIGBuZXh0YCBub3RpZmljYXRpb25zLlxuICAgICAqIEByZXR1cm4ge09ic2VydmFibGU8VD59IEFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyBlYWNoIGdpdmVuIGlucHV0IHZhbHVlLlxuICAgICAqIEBzdGF0aWMgdHJ1ZVxuICAgICAqIEBuYW1lIG9mXG4gICAgICogQG93bmVyIE9ic2VydmFibGVcbiAgICAgKi9cbiAgICBBcnJheU9ic2VydmFibGUub2YgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhcnJheSA9IFtdO1xuICAgICAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgYXJyYXlbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNjaGVkdWxlciA9IGFycmF5W2FycmF5Lmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAoaXNTY2hlZHVsZXJfMS5pc1NjaGVkdWxlcihzY2hlZHVsZXIpKSB7XG4gICAgICAgICAgICBhcnJheS5wb3AoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNjaGVkdWxlciA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGxlbiA9IGFycmF5Lmxlbmd0aDtcbiAgICAgICAgaWYgKGxlbiA+IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQXJyYXlPYnNlcnZhYmxlKGFycmF5LCBzY2hlZHVsZXIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGxlbiA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBTY2FsYXJPYnNlcnZhYmxlXzEuU2NhbGFyT2JzZXJ2YWJsZShhcnJheVswXSwgc2NoZWR1bGVyKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRW1wdHlPYnNlcnZhYmxlXzEuRW1wdHlPYnNlcnZhYmxlKHNjaGVkdWxlcik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEFycmF5T2JzZXJ2YWJsZS5kaXNwYXRjaCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICB2YXIgYXJyYXkgPSBzdGF0ZS5hcnJheSwgaW5kZXggPSBzdGF0ZS5pbmRleCwgY291bnQgPSBzdGF0ZS5jb3VudCwgc3Vic2NyaWJlciA9IHN0YXRlLnN1YnNjcmliZXI7XG4gICAgICAgIGlmIChpbmRleCA+PSBjb3VudCkge1xuICAgICAgICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHN1YnNjcmliZXIubmV4dChhcnJheVtpbmRleF0pO1xuICAgICAgICBpZiAoc3Vic2NyaWJlci5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmluZGV4ID0gaW5kZXggKyAxO1xuICAgICAgICB0aGlzLnNjaGVkdWxlKHN0YXRlKTtcbiAgICB9O1xuICAgIEFycmF5T2JzZXJ2YWJsZS5wcm90b3R5cGUuX3N1YnNjcmliZSA9IGZ1bmN0aW9uIChzdWJzY3JpYmVyKSB7XG4gICAgICAgIHZhciBpbmRleCA9IDA7XG4gICAgICAgIHZhciBhcnJheSA9IHRoaXMuYXJyYXk7XG4gICAgICAgIHZhciBjb3VudCA9IGFycmF5Lmxlbmd0aDtcbiAgICAgICAgdmFyIHNjaGVkdWxlciA9IHRoaXMuc2NoZWR1bGVyO1xuICAgICAgICBpZiAoc2NoZWR1bGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gc2NoZWR1bGVyLnNjaGVkdWxlKEFycmF5T2JzZXJ2YWJsZS5kaXNwYXRjaCwgMCwge1xuICAgICAgICAgICAgICAgIGFycmF5OiBhcnJheSwgaW5kZXg6IGluZGV4LCBjb3VudDogY291bnQsIHN1YnNjcmliZXI6IHN1YnNjcmliZXJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudCAmJiAhc3Vic2NyaWJlci5pc1Vuc3Vic2NyaWJlZDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlci5uZXh0KGFycmF5W2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIEFycmF5T2JzZXJ2YWJsZTtcbn0oT2JzZXJ2YWJsZV8xLk9ic2VydmFibGUpKTtcbmV4cG9ydHMuQXJyYXlPYnNlcnZhYmxlID0gQXJyYXlPYnNlcnZhYmxlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9QXJyYXlPYnNlcnZhYmxlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vT2JzZXJ2YWJsZScpO1xudmFyIFN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4uL1N1YnNjcmliZXInKTtcbnZhciBTdWJzY3JpcHRpb25fMSA9IHJlcXVpcmUoJy4uL1N1YnNjcmlwdGlvbicpO1xuLyoqXG4gKiBAY2xhc3MgQ29ubmVjdGFibGVPYnNlcnZhYmxlPFQ+XG4gKi9cbnZhciBDb25uZWN0YWJsZU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhDb25uZWN0YWJsZU9ic2VydmFibGUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQ29ubmVjdGFibGVPYnNlcnZhYmxlKHNvdXJjZSwgc3ViamVjdEZhY3RvcnkpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgICB0aGlzLnN1YmplY3RGYWN0b3J5ID0gc3ViamVjdEZhY3Rvcnk7XG4gICAgfVxuICAgIENvbm5lY3RhYmxlT2JzZXJ2YWJsZS5wcm90b3R5cGUuX3N1YnNjcmliZSA9IGZ1bmN0aW9uIChzdWJzY3JpYmVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFN1YmplY3QoKS5zdWJzY3JpYmUoc3Vic2NyaWJlcik7XG4gICAgfTtcbiAgICBDb25uZWN0YWJsZU9ic2VydmFibGUucHJvdG90eXBlLmdldFN1YmplY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzdWJqZWN0ID0gdGhpcy5zdWJqZWN0O1xuICAgICAgICBpZiAoc3ViamVjdCAmJiAhc3ViamVjdC5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHN1YmplY3Q7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICh0aGlzLnN1YmplY3QgPSB0aGlzLnN1YmplY3RGYWN0b3J5KCkpO1xuICAgIH07XG4gICAgQ29ubmVjdGFibGVPYnNlcnZhYmxlLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc291cmNlID0gdGhpcy5zb3VyY2U7XG4gICAgICAgIHZhciBzdWJzY3JpcHRpb24gPSB0aGlzLnN1YnNjcmlwdGlvbjtcbiAgICAgICAgaWYgKHN1YnNjcmlwdGlvbiAmJiAhc3Vic2NyaXB0aW9uLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuICAgICAgICB9XG4gICAgICAgIHN1YnNjcmlwdGlvbiA9IHNvdXJjZS5zdWJzY3JpYmUodGhpcy5nZXRTdWJqZWN0KCkpO1xuICAgICAgICBzdWJzY3JpcHRpb24uYWRkKG5ldyBDb25uZWN0YWJsZVN1YnNjcmlwdGlvbih0aGlzKSk7XG4gICAgICAgIHJldHVybiAodGhpcy5zdWJzY3JpcHRpb24gPSBzdWJzY3JpcHRpb24pO1xuICAgIH07XG4gICAgQ29ubmVjdGFibGVPYnNlcnZhYmxlLnByb3RvdHlwZS5yZWZDb3VudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWZDb3VudE9ic2VydmFibGUodGhpcyk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBvcGVuZWQgZm9yIGBDb25uZWN0YWJsZVN1YnNjcmlwdGlvbmAuXG4gICAgICogTm90IHRvIGNhbGwgZnJvbSBvdGhlcnMuXG4gICAgICovXG4gICAgQ29ubmVjdGFibGVPYnNlcnZhYmxlLnByb3RvdHlwZS5fY2xvc2VTdWJzY3JpcHRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc3ViamVjdCA9IG51bGw7XG4gICAgICAgIHRoaXMuc3Vic2NyaXB0aW9uID0gbnVsbDtcbiAgICB9O1xuICAgIHJldHVybiBDb25uZWN0YWJsZU9ic2VydmFibGU7XG59KE9ic2VydmFibGVfMS5PYnNlcnZhYmxlKSk7XG5leHBvcnRzLkNvbm5lY3RhYmxlT2JzZXJ2YWJsZSA9IENvbm5lY3RhYmxlT2JzZXJ2YWJsZTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgQ29ubmVjdGFibGVTdWJzY3JpcHRpb24gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhDb25uZWN0YWJsZVN1YnNjcmlwdGlvbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBDb25uZWN0YWJsZVN1YnNjcmlwdGlvbihjb25uZWN0YWJsZSkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5jb25uZWN0YWJsZSA9IGNvbm5lY3RhYmxlO1xuICAgIH1cbiAgICBDb25uZWN0YWJsZVN1YnNjcmlwdGlvbi5wcm90b3R5cGUuX3Vuc3Vic2NyaWJlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY29ubmVjdGFibGUgPSB0aGlzLmNvbm5lY3RhYmxlO1xuICAgICAgICBjb25uZWN0YWJsZS5fY2xvc2VTdWJzY3JpcHRpb24oKTtcbiAgICAgICAgdGhpcy5jb25uZWN0YWJsZSA9IG51bGw7XG4gICAgfTtcbiAgICByZXR1cm4gQ29ubmVjdGFibGVTdWJzY3JpcHRpb247XG59KFN1YnNjcmlwdGlvbl8xLlN1YnNjcmlwdGlvbikpO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBSZWZDb3VudE9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhSZWZDb3VudE9ic2VydmFibGUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gUmVmQ291bnRPYnNlcnZhYmxlKGNvbm5lY3RhYmxlLCByZWZDb3VudCkge1xuICAgICAgICBpZiAocmVmQ291bnQgPT09IHZvaWQgMCkgeyByZWZDb3VudCA9IDA7IH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuY29ubmVjdGFibGUgPSBjb25uZWN0YWJsZTtcbiAgICAgICAgdGhpcy5yZWZDb3VudCA9IHJlZkNvdW50O1xuICAgIH1cbiAgICBSZWZDb3VudE9ic2VydmFibGUucHJvdG90eXBlLl9zdWJzY3JpYmUgPSBmdW5jdGlvbiAoc3Vic2NyaWJlcikge1xuICAgICAgICB2YXIgY29ubmVjdGFibGUgPSB0aGlzLmNvbm5lY3RhYmxlO1xuICAgICAgICB2YXIgcmVmQ291bnRTdWJzY3JpYmVyID0gbmV3IFJlZkNvdW50U3Vic2NyaWJlcihzdWJzY3JpYmVyLCB0aGlzKTtcbiAgICAgICAgdmFyIHN1YnNjcmlwdGlvbiA9IGNvbm5lY3RhYmxlLnN1YnNjcmliZShyZWZDb3VudFN1YnNjcmliZXIpO1xuICAgICAgICBpZiAoIXN1YnNjcmlwdGlvbi5pc1Vuc3Vic2NyaWJlZCAmJiArK3RoaXMucmVmQ291bnQgPT09IDEpIHtcbiAgICAgICAgICAgIHJlZkNvdW50U3Vic2NyaWJlci5jb25uZWN0aW9uID0gdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGFibGUuY29ubmVjdCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgfTtcbiAgICByZXR1cm4gUmVmQ291bnRPYnNlcnZhYmxlO1xufShPYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZSkpO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBSZWZDb3VudFN1YnNjcmliZXIgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhSZWZDb3VudFN1YnNjcmliZXIsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gUmVmQ291bnRTdWJzY3JpYmVyKGRlc3RpbmF0aW9uLCByZWZDb3VudE9ic2VydmFibGUpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgbnVsbCk7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24gPSBkZXN0aW5hdGlvbjtcbiAgICAgICAgdGhpcy5yZWZDb3VudE9ic2VydmFibGUgPSByZWZDb3VudE9ic2VydmFibGU7XG4gICAgICAgIHRoaXMuY29ubmVjdGlvbiA9IHJlZkNvdW50T2JzZXJ2YWJsZS5jb25uZWN0aW9uO1xuICAgICAgICBkZXN0aW5hdGlvbi5hZGQodGhpcyk7XG4gICAgfVxuICAgIFJlZkNvdW50U3Vic2NyaWJlci5wcm90b3R5cGUuX25leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5uZXh0KHZhbHVlKTtcbiAgICB9O1xuICAgIFJlZkNvdW50U3Vic2NyaWJlci5wcm90b3R5cGUuX2Vycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB0aGlzLl9yZXNldENvbm5lY3RhYmxlKCk7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24uZXJyb3IoZXJyKTtcbiAgICB9O1xuICAgIFJlZkNvdW50U3Vic2NyaWJlci5wcm90b3R5cGUuX2NvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9yZXNldENvbm5lY3RhYmxlKCk7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24uY29tcGxldGUoKTtcbiAgICB9O1xuICAgIFJlZkNvdW50U3Vic2NyaWJlci5wcm90b3R5cGUuX3Jlc2V0Q29ubmVjdGFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvYnNlcnZhYmxlID0gdGhpcy5yZWZDb3VudE9ic2VydmFibGU7XG4gICAgICAgIHZhciBvYnNDb25uZWN0aW9uID0gb2JzZXJ2YWJsZS5jb25uZWN0aW9uO1xuICAgICAgICB2YXIgc3ViQ29ubmVjdGlvbiA9IHRoaXMuY29ubmVjdGlvbjtcbiAgICAgICAgaWYgKHN1YkNvbm5lY3Rpb24gJiYgc3ViQ29ubmVjdGlvbiA9PT0gb2JzQ29ubmVjdGlvbikge1xuICAgICAgICAgICAgb2JzZXJ2YWJsZS5yZWZDb3VudCA9IDA7XG4gICAgICAgICAgICBvYnNDb25uZWN0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBvYnNlcnZhYmxlLmNvbm5lY3Rpb24gPSBudWxsO1xuICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBSZWZDb3VudFN1YnNjcmliZXIucHJvdG90eXBlLl91bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9ic2VydmFibGUgPSB0aGlzLnJlZkNvdW50T2JzZXJ2YWJsZTtcbiAgICAgICAgaWYgKG9ic2VydmFibGUucmVmQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoLS1vYnNlcnZhYmxlLnJlZkNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICB2YXIgb2JzQ29ubmVjdGlvbiA9IG9ic2VydmFibGUuY29ubmVjdGlvbjtcbiAgICAgICAgICAgIHZhciBzdWJDb25uZWN0aW9uID0gdGhpcy5jb25uZWN0aW9uO1xuICAgICAgICAgICAgaWYgKHN1YkNvbm5lY3Rpb24gJiYgc3ViQ29ubmVjdGlvbiA9PT0gb2JzQ29ubmVjdGlvbikge1xuICAgICAgICAgICAgICAgIG9ic0Nvbm5lY3Rpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICBvYnNlcnZhYmxlLmNvbm5lY3Rpb24gPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gUmVmQ291bnRTdWJzY3JpYmVyO1xufShTdWJzY3JpYmVyXzEuU3Vic2NyaWJlcikpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Q29ubmVjdGFibGVPYnNlcnZhYmxlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vT2JzZXJ2YWJsZScpO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKiBAaGlkZSB0cnVlXG4gKi9cbnZhciBFbXB0eU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhFbXB0eU9ic2VydmFibGUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gRW1wdHlPYnNlcnZhYmxlKHNjaGVkdWxlcikge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5zY2hlZHVsZXIgPSBzY2hlZHVsZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gT2JzZXJ2YWJsZSB0aGF0IGVtaXRzIG5vIGl0ZW1zIHRvIHRoZSBPYnNlcnZlciBhbmQgaW1tZWRpYXRlbHlcbiAgICAgKiBlbWl0cyBhIGNvbXBsZXRlIG5vdGlmaWNhdGlvbi5cbiAgICAgKlxuICAgICAqIDxzcGFuIGNsYXNzPVwiaW5mb3JtYWxcIj5KdXN0IGVtaXRzICdjb21wbGV0ZScsIGFuZCBub3RoaW5nIGVsc2UuXG4gICAgICogPC9zcGFuPlxuICAgICAqXG4gICAgICogPGltZyBzcmM9XCIuL2ltZy9lbXB0eS5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAgICAgKlxuICAgICAqIFRoaXMgc3RhdGljIG9wZXJhdG9yIGlzIHVzZWZ1bCBmb3IgY3JlYXRpbmcgYSBzaW1wbGUgT2JzZXJ2YWJsZSB0aGF0IG9ubHlcbiAgICAgKiBlbWl0cyB0aGUgY29tcGxldGUgbm90aWZpY2F0aW9uLiBJdCBjYW4gYmUgdXNlZCBmb3IgY29tcG9zaW5nIHdpdGggb3RoZXJcbiAgICAgKiBPYnNlcnZhYmxlcywgc3VjaCBhcyBpbiBhIHtAbGluayBtZXJnZU1hcH0uXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8Y2FwdGlvbj5FbWl0IHRoZSBudW1iZXIgNywgdGhlbiBjb21wbGV0ZS48L2NhcHRpb24+XG4gICAgICogdmFyIHJlc3VsdCA9IFJ4Lk9ic2VydmFibGUuZW1wdHkoKS5zdGFydFdpdGgoNyk7XG4gICAgICogcmVzdWx0LnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxjYXB0aW9uPk1hcCBhbmQgZmxhdHRlbiBvbmx5IG9kZCBudW1iZXJzIHRvIHRoZSBzZXF1ZW5jZSAnYScsICdiJywgJ2MnPC9jYXB0aW9uPlxuICAgICAqIHZhciBpbnRlcnZhbCA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwMCk7XG4gICAgICogdmFyIHJlc3VsdCA9IGludGVydmFsLm1lcmdlTWFwKHggPT5cbiAgICAgKiAgIHggJSAyID09PSAxID8gUnguT2JzZXJ2YWJsZS5vZignYScsICdiJywgJ2MnKSA6IFJ4Lk9ic2VydmFibGUuZW1wdHkoKVxuICAgICAqICk7XG4gICAgICogcmVzdWx0LnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAgICAgKlxuICAgICAqIEBzZWUge0BsaW5rIGNyZWF0ZX1cbiAgICAgKiBAc2VlIHtAbGluayBuZXZlcn1cbiAgICAgKiBAc2VlIHtAbGluayBvZn1cbiAgICAgKiBAc2VlIHtAbGluayB0aHJvd31cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSBBIHtAbGluayBTY2hlZHVsZXJ9IHRvIHVzZSBmb3Igc2NoZWR1bGluZ1xuICAgICAqIHRoZSBlbWlzc2lvbiBvZiB0aGUgY29tcGxldGUgbm90aWZpY2F0aW9uLlxuICAgICAqIEByZXR1cm4ge09ic2VydmFibGV9IEFuIFwiZW1wdHlcIiBPYnNlcnZhYmxlOiBlbWl0cyBvbmx5IHRoZSBjb21wbGV0ZVxuICAgICAqIG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAc3RhdGljIHRydWVcbiAgICAgKiBAbmFtZSBlbXB0eVxuICAgICAqIEBvd25lciBPYnNlcnZhYmxlXG4gICAgICovXG4gICAgRW1wdHlPYnNlcnZhYmxlLmNyZWF0ZSA9IGZ1bmN0aW9uIChzY2hlZHVsZXIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBFbXB0eU9ic2VydmFibGUoc2NoZWR1bGVyKTtcbiAgICB9O1xuICAgIEVtcHR5T2JzZXJ2YWJsZS5kaXNwYXRjaCA9IGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgdmFyIHN1YnNjcmliZXIgPSBhcmcuc3Vic2NyaWJlcjtcbiAgICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgIH07XG4gICAgRW1wdHlPYnNlcnZhYmxlLnByb3RvdHlwZS5fc3Vic2NyaWJlID0gZnVuY3Rpb24gKHN1YnNjcmliZXIpIHtcbiAgICAgICAgdmFyIHNjaGVkdWxlciA9IHRoaXMuc2NoZWR1bGVyO1xuICAgICAgICBpZiAoc2NoZWR1bGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gc2NoZWR1bGVyLnNjaGVkdWxlKEVtcHR5T2JzZXJ2YWJsZS5kaXNwYXRjaCwgMCwgeyBzdWJzY3JpYmVyOiBzdWJzY3JpYmVyIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gRW1wdHlPYnNlcnZhYmxlO1xufShPYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZSkpO1xuZXhwb3J0cy5FbXB0eU9ic2VydmFibGUgPSBFbXB0eU9ic2VydmFibGU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1FbXB0eU9ic2VydmFibGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi9PYnNlcnZhYmxlJyk7XG4vKipcbiAqIFdlIG5lZWQgdGhpcyBKU0RvYyBjb21tZW50IGZvciBhZmZlY3RpbmcgRVNEb2MuXG4gKiBAZXh0ZW5kcyB7SWdub3JlZH1cbiAqIEBoaWRlIHRydWVcbiAqL1xudmFyIFNjYWxhck9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTY2FsYXJPYnNlcnZhYmxlLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFNjYWxhck9ic2VydmFibGUodmFsdWUsIHNjaGVkdWxlcikge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgICAgICB0aGlzLnNjaGVkdWxlciA9IHNjaGVkdWxlcjtcbiAgICAgICAgdGhpcy5faXNTY2FsYXIgPSB0cnVlO1xuICAgIH1cbiAgICBTY2FsYXJPYnNlcnZhYmxlLmNyZWF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NoZWR1bGVyKSB7XG4gICAgICAgIHJldHVybiBuZXcgU2NhbGFyT2JzZXJ2YWJsZSh2YWx1ZSwgc2NoZWR1bGVyKTtcbiAgICB9O1xuICAgIFNjYWxhck9ic2VydmFibGUuZGlzcGF0Y2ggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgdmFyIGRvbmUgPSBzdGF0ZS5kb25lLCB2YWx1ZSA9IHN0YXRlLnZhbHVlLCBzdWJzY3JpYmVyID0gc3RhdGUuc3Vic2NyaWJlcjtcbiAgICAgICAgaWYgKGRvbmUpIHtcbiAgICAgICAgICAgIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzdWJzY3JpYmVyLm5leHQodmFsdWUpO1xuICAgICAgICBpZiAoc3Vic2NyaWJlci5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmRvbmUgPSB0cnVlO1xuICAgICAgICB0aGlzLnNjaGVkdWxlKHN0YXRlKTtcbiAgICB9O1xuICAgIFNjYWxhck9ic2VydmFibGUucHJvdG90eXBlLl9zdWJzY3JpYmUgPSBmdW5jdGlvbiAoc3Vic2NyaWJlcikge1xuICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnZhbHVlO1xuICAgICAgICB2YXIgc2NoZWR1bGVyID0gdGhpcy5zY2hlZHVsZXI7XG4gICAgICAgIGlmIChzY2hlZHVsZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBzY2hlZHVsZXIuc2NoZWR1bGUoU2NhbGFyT2JzZXJ2YWJsZS5kaXNwYXRjaCwgMCwge1xuICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLCB2YWx1ZTogdmFsdWUsIHN1YnNjcmliZXI6IHN1YnNjcmliZXJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc3Vic2NyaWJlci5uZXh0KHZhbHVlKTtcbiAgICAgICAgICAgIGlmICghc3Vic2NyaWJlci5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIFNjYWxhck9ic2VydmFibGU7XG59KE9ic2VydmFibGVfMS5PYnNlcnZhYmxlKSk7XG5leHBvcnRzLlNjYWxhck9ic2VydmFibGUgPSBTY2FsYXJPYnNlcnZhYmxlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9U2NhbGFyT2JzZXJ2YWJsZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBBcnJheU9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4vQXJyYXlPYnNlcnZhYmxlJyk7XG5leHBvcnRzLm9mID0gQXJyYXlPYnNlcnZhYmxlXzEuQXJyYXlPYnNlcnZhYmxlLm9mO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9b2YuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBBcnJheU9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uL29ic2VydmFibGUvQXJyYXlPYnNlcnZhYmxlJyk7XG52YXIgaXNBcnJheV8xID0gcmVxdWlyZSgnLi4vdXRpbC9pc0FycmF5Jyk7XG52YXIgaXNTY2hlZHVsZXJfMSA9IHJlcXVpcmUoJy4uL3V0aWwvaXNTY2hlZHVsZXInKTtcbnZhciBPdXRlclN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4uL091dGVyU3Vic2NyaWJlcicpO1xudmFyIHN1YnNjcmliZVRvUmVzdWx0XzEgPSByZXF1aXJlKCcuLi91dGlsL3N1YnNjcmliZVRvUmVzdWx0Jyk7XG4vKipcbiAqIENvbWJpbmVzIG11bHRpcGxlIE9ic2VydmFibGVzIHRvIGNyZWF0ZSBhbiBPYnNlcnZhYmxlIHdob3NlIHZhbHVlcyBhcmVcbiAqIGNhbGN1bGF0ZWQgZnJvbSB0aGUgbGF0ZXN0IHZhbHVlcyBvZiBlYWNoIG9mIGl0cyBpbnB1dCBPYnNlcnZhYmxlcy5cbiAqXG4gKiA8c3BhbiBjbGFzcz1cImluZm9ybWFsXCI+V2hlbmV2ZXIgYW55IGlucHV0IE9ic2VydmFibGUgZW1pdHMgYSB2YWx1ZSwgaXRcbiAqIGNvbXB1dGVzIGEgZm9ybXVsYSB1c2luZyB0aGUgbGF0ZXN0IHZhbHVlcyBmcm9tIGFsbCB0aGUgaW5wdXRzLCB0aGVuIGVtaXRzXG4gKiB0aGUgb3V0cHV0IG9mIHRoYXQgZm9ybXVsYS48L3NwYW4+XG4gKlxuICogPGltZyBzcmM9XCIuL2ltZy9jb21iaW5lTGF0ZXN0LnBuZ1wiIHdpZHRoPVwiMTAwJVwiPlxuICpcbiAqIGBjb21iaW5lTGF0ZXN0YCBjb21iaW5lcyB0aGUgdmFsdWVzIGZyb20gdGhpcyBPYnNlcnZhYmxlIHdpdGggdmFsdWVzIGZyb21cbiAqIE9ic2VydmFibGVzIHBhc3NlZCBhcyBhcmd1bWVudHMuIFRoaXMgaXMgZG9uZSBieSBzdWJzY3JpYmluZyB0byBlYWNoXG4gKiBPYnNlcnZhYmxlLCBpbiBvcmRlciwgYW5kIGNvbGxlY3RpbmcgYW4gYXJyYXkgb2YgZWFjaCBvZiB0aGUgbW9zdCByZWNlbnRcbiAqIHZhbHVlcyBhbnkgdGltZSBhbnkgb2YgdGhlIGlucHV0IE9ic2VydmFibGVzIGVtaXRzLCB0aGVuIGVpdGhlciB0YWtpbmcgdGhhdFxuICogYXJyYXkgYW5kIHBhc3NpbmcgaXQgYXMgYXJndW1lbnRzIHRvIGFuIG9wdGlvbmFsIGBwcm9qZWN0YCBmdW5jdGlvbiBhbmRcbiAqIGVtaXR0aW5nIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhhdCwgb3IganVzdCBlbWl0dGluZyB0aGUgYXJyYXkgb2YgcmVjZW50XG4gKiB2YWx1ZXMgZGlyZWN0bHkgaWYgdGhlcmUgaXMgbm8gYHByb2plY3RgIGZ1bmN0aW9uLlxuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPkR5bmFtaWNhbGx5IGNhbGN1bGF0ZSB0aGUgQm9keS1NYXNzIEluZGV4IGZyb20gYW4gT2JzZXJ2YWJsZSBvZiB3ZWlnaHQgYW5kIG9uZSBmb3IgaGVpZ2h0PC9jYXB0aW9uPlxuICogdmFyIHdlaWdodCA9IFJ4Lk9ic2VydmFibGUub2YoNzAsIDcyLCA3NiwgNzksIDc1KTtcbiAqIHZhciBoZWlnaHQgPSBSeC5PYnNlcnZhYmxlLm9mKDEuNzYsIDEuNzcsIDEuNzgpO1xuICogdmFyIGJtaSA9IHdlaWdodC5jb21iaW5lTGF0ZXN0KGhlaWdodCwgKHcsIGgpID0+IHcgLyAoaCAqIGgpKTtcbiAqIGJtaS5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZygnQk1JIGlzICcgKyB4KSk7XG4gKlxuICogQHNlZSB7QGxpbmsgY29tYmluZUFsbH1cbiAqIEBzZWUge0BsaW5rIG1lcmdlfVxuICogQHNlZSB7QGxpbmsgd2l0aExhdGVzdEZyb219XG4gKlxuICogQHBhcmFtIHtPYnNlcnZhYmxlfSBvdGhlciBBbiBpbnB1dCBPYnNlcnZhYmxlIHRvIGNvbWJpbmUgd2l0aCB0aGUgc291cmNlXG4gKiBPYnNlcnZhYmxlLiBNb3JlIHRoYW4gb25lIGlucHV0IE9ic2VydmFibGVzIG1heSBiZSBnaXZlbiBhcyBhcmd1bWVudC5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFtwcm9qZWN0XSBBbiBvcHRpb25hbCBmdW5jdGlvbiB0byBwcm9qZWN0IHRoZSB2YWx1ZXMgZnJvbVxuICogdGhlIGNvbWJpbmVkIGxhdGVzdCB2YWx1ZXMgaW50byBhIG5ldyB2YWx1ZSBvbiB0aGUgb3V0cHV0IE9ic2VydmFibGUuXG4gKiBAcmV0dXJuIHtPYnNlcnZhYmxlfSBBbiBPYnNlcnZhYmxlIG9mIHByb2plY3RlZCB2YWx1ZXMgZnJvbSB0aGUgbW9zdCByZWNlbnRcbiAqIHZhbHVlcyBmcm9tIGVhY2ggaW5wdXQgT2JzZXJ2YWJsZSwgb3IgYW4gYXJyYXkgb2YgdGhlIG1vc3QgcmVjZW50IHZhbHVlcyBmcm9tXG4gKiBlYWNoIGlucHV0IE9ic2VydmFibGUuXG4gKiBAbWV0aG9kIGNvbWJpbmVMYXRlc3RcbiAqIEBvd25lciBPYnNlcnZhYmxlXG4gKi9cbmZ1bmN0aW9uIGNvbWJpbmVMYXRlc3QoKSB7XG4gICAgdmFyIG9ic2VydmFibGVzID0gW107XG4gICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgb2JzZXJ2YWJsZXNbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgfVxuICAgIHZhciBwcm9qZWN0ID0gbnVsbDtcbiAgICBpZiAodHlwZW9mIG9ic2VydmFibGVzW29ic2VydmFibGVzLmxlbmd0aCAtIDFdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHByb2plY3QgPSBvYnNlcnZhYmxlcy5wb3AoKTtcbiAgICB9XG4gICAgLy8gaWYgdGhlIGZpcnN0IGFuZCBvbmx5IG90aGVyIGFyZ3VtZW50IGJlc2lkZXMgdGhlIHJlc3VsdFNlbGVjdG9yIGlzIGFuIGFycmF5XG4gICAgLy8gYXNzdW1lIGl0J3MgYmVlbiBjYWxsZWQgd2l0aCBgY29tYmluZUxhdGVzdChbb2JzMSwgb2JzMiwgb2JzM10sIHByb2plY3QpYFxuICAgIGlmIChvYnNlcnZhYmxlcy5sZW5ndGggPT09IDEgJiYgaXNBcnJheV8xLmlzQXJyYXkob2JzZXJ2YWJsZXNbMF0pKSB7XG4gICAgICAgIG9ic2VydmFibGVzID0gb2JzZXJ2YWJsZXNbMF07XG4gICAgfVxuICAgIG9ic2VydmFibGVzLnVuc2hpZnQodGhpcyk7XG4gICAgcmV0dXJuIG5ldyBBcnJheU9ic2VydmFibGVfMS5BcnJheU9ic2VydmFibGUob2JzZXJ2YWJsZXMpLmxpZnQobmV3IENvbWJpbmVMYXRlc3RPcGVyYXRvcihwcm9qZWN0KSk7XG59XG5leHBvcnRzLmNvbWJpbmVMYXRlc3QgPSBjb21iaW5lTGF0ZXN0O1xuLyogdHNsaW50OmVuYWJsZTptYXgtbGluZS1sZW5ndGggKi9cbi8qKlxuICogQ29tYmluZXMgdGhlIHZhbHVlcyBmcm9tIG9ic2VydmFibGVzIHBhc3NlZCBhcyBhcmd1bWVudHMuIFRoaXMgaXMgZG9uZSBieSBzdWJzY3JpYmluZ1xuICogdG8gZWFjaCBvYnNlcnZhYmxlLCBpbiBvcmRlciwgYW5kIGNvbGxlY3RpbmcgYW4gYXJyYXkgb2YgZWFjaCBvZiB0aGUgbW9zdCByZWNlbnQgdmFsdWVzIGFueSB0aW1lIGFueSBvZiB0aGUgb2JzZXJ2YWJsZXNcbiAqIGVtaXRzLCB0aGVuIGVpdGhlciB0YWtpbmcgdGhhdCBhcnJheSBhbmQgcGFzc2luZyBpdCBhcyBhcmd1bWVudHMgdG8gYW4gb3B0aW9uIGBwcm9qZWN0YCBmdW5jdGlvbiBhbmQgZW1pdHRpbmcgdGhlIHJldHVyblxuICogdmFsdWUgb2YgdGhhdCwgb3IganVzdCBlbWl0dGluZyB0aGUgYXJyYXkgb2YgcmVjZW50IHZhbHVlcyBkaXJlY3RseSBpZiB0aGVyZSBpcyBubyBgcHJvamVjdGAgZnVuY3Rpb24uXG4gKiBAcGFyYW0gey4uLk9ic2VydmFibGV9IG9ic2VydmFibGVzIHRoZSBvYnNlcnZhYmxlcyB0byBjb21iaW5lXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBbcHJvamVjdF0gYW4gb3B0aW9uYWwgZnVuY3Rpb24gdG8gcHJvamVjdCB0aGUgdmFsdWVzIGZyb20gdGhlIGNvbWJpbmVkIHJlY2VudCB2YWx1ZXMgaW50byBhIG5ldyB2YWx1ZSBmb3IgZW1pc3Npb24uXG4gKiBAcmV0dXJuIHtPYnNlcnZhYmxlfSBhbiBvYnNlcnZhYmxlIG9mIG90aGVyIHByb2plY3RlZCB2YWx1ZXMgZnJvbSB0aGUgbW9zdCByZWNlbnQgdmFsdWVzIGZyb20gZWFjaCBvYnNlcnZhYmxlLCBvciBhbiBhcnJheSBvZiBlYWNoIG9mXG4gKiB0aGUgbW9zdCByZWNlbnQgdmFsdWVzIGZyb20gZWFjaCBvYnNlcnZhYmxlLlxuICogQHN0YXRpYyB0cnVlXG4gKiBAbmFtZSBjb21iaW5lTGF0ZXN0XG4gKiBAb3duZXIgT2JzZXJ2YWJsZVxuICovXG5mdW5jdGlvbiBjb21iaW5lTGF0ZXN0U3RhdGljKCkge1xuICAgIHZhciBvYnNlcnZhYmxlcyA9IFtdO1xuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgIG9ic2VydmFibGVzW19pIC0gMF0gPSBhcmd1bWVudHNbX2ldO1xuICAgIH1cbiAgICB2YXIgcHJvamVjdCA9IG51bGw7XG4gICAgdmFyIHNjaGVkdWxlciA9IG51bGw7XG4gICAgaWYgKGlzU2NoZWR1bGVyXzEuaXNTY2hlZHVsZXIob2JzZXJ2YWJsZXNbb2JzZXJ2YWJsZXMubGVuZ3RoIC0gMV0pKSB7XG4gICAgICAgIHNjaGVkdWxlciA9IG9ic2VydmFibGVzLnBvcCgpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9ic2VydmFibGVzW29ic2VydmFibGVzLmxlbmd0aCAtIDFdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHByb2plY3QgPSBvYnNlcnZhYmxlcy5wb3AoKTtcbiAgICB9XG4gICAgLy8gaWYgdGhlIGZpcnN0IGFuZCBvbmx5IG90aGVyIGFyZ3VtZW50IGJlc2lkZXMgdGhlIHJlc3VsdFNlbGVjdG9yIGlzIGFuIGFycmF5XG4gICAgLy8gYXNzdW1lIGl0J3MgYmVlbiBjYWxsZWQgd2l0aCBgY29tYmluZUxhdGVzdChbb2JzMSwgb2JzMiwgb2JzM10sIHByb2plY3QpYFxuICAgIGlmIChvYnNlcnZhYmxlcy5sZW5ndGggPT09IDEgJiYgaXNBcnJheV8xLmlzQXJyYXkob2JzZXJ2YWJsZXNbMF0pKSB7XG4gICAgICAgIG9ic2VydmFibGVzID0gb2JzZXJ2YWJsZXNbMF07XG4gICAgfVxuICAgIHJldHVybiBuZXcgQXJyYXlPYnNlcnZhYmxlXzEuQXJyYXlPYnNlcnZhYmxlKG9ic2VydmFibGVzLCBzY2hlZHVsZXIpLmxpZnQobmV3IENvbWJpbmVMYXRlc3RPcGVyYXRvcihwcm9qZWN0KSk7XG59XG5leHBvcnRzLmNvbWJpbmVMYXRlc3RTdGF0aWMgPSBjb21iaW5lTGF0ZXN0U3RhdGljO1xudmFyIENvbWJpbmVMYXRlc3RPcGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ29tYmluZUxhdGVzdE9wZXJhdG9yKHByb2plY3QpIHtcbiAgICAgICAgdGhpcy5wcm9qZWN0ID0gcHJvamVjdDtcbiAgICB9XG4gICAgQ29tYmluZUxhdGVzdE9wZXJhdG9yLnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gKHN1YnNjcmliZXIsIHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gc291cmNlLl9zdWJzY3JpYmUobmV3IENvbWJpbmVMYXRlc3RTdWJzY3JpYmVyKHN1YnNjcmliZXIsIHRoaXMucHJvamVjdCkpO1xuICAgIH07XG4gICAgcmV0dXJuIENvbWJpbmVMYXRlc3RPcGVyYXRvcjtcbn0oKSk7XG5leHBvcnRzLkNvbWJpbmVMYXRlc3RPcGVyYXRvciA9IENvbWJpbmVMYXRlc3RPcGVyYXRvcjtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgQ29tYmluZUxhdGVzdFN1YnNjcmliZXIgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhDb21iaW5lTGF0ZXN0U3Vic2NyaWJlciwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBDb21iaW5lTGF0ZXN0U3Vic2NyaWJlcihkZXN0aW5hdGlvbiwgcHJvamVjdCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZXN0aW5hdGlvbik7XG4gICAgICAgIHRoaXMucHJvamVjdCA9IHByb2plY3Q7XG4gICAgICAgIHRoaXMuYWN0aXZlID0gMDtcbiAgICAgICAgdGhpcy52YWx1ZXMgPSBbXTtcbiAgICAgICAgdGhpcy5vYnNlcnZhYmxlcyA9IFtdO1xuICAgICAgICB0aGlzLnRvUmVzcG9uZCA9IFtdO1xuICAgIH1cbiAgICBDb21iaW5lTGF0ZXN0U3Vic2NyaWJlci5wcm90b3R5cGUuX25leHQgPSBmdW5jdGlvbiAob2JzZXJ2YWJsZSkge1xuICAgICAgICB2YXIgdG9SZXNwb25kID0gdGhpcy50b1Jlc3BvbmQ7XG4gICAgICAgIHRvUmVzcG9uZC5wdXNoKHRvUmVzcG9uZC5sZW5ndGgpO1xuICAgICAgICB0aGlzLm9ic2VydmFibGVzLnB1c2gob2JzZXJ2YWJsZSk7XG4gICAgfTtcbiAgICBDb21iaW5lTGF0ZXN0U3Vic2NyaWJlci5wcm90b3R5cGUuX2NvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb2JzZXJ2YWJsZXMgPSB0aGlzLm9ic2VydmFibGVzO1xuICAgICAgICB2YXIgbGVuID0gb2JzZXJ2YWJsZXMubGVuZ3RoO1xuICAgICAgICBpZiAobGVuID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmFjdGl2ZSA9IGxlbjtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgb2JzZXJ2YWJsZSA9IG9ic2VydmFibGVzW2ldO1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkKHN1YnNjcmliZVRvUmVzdWx0XzEuc3Vic2NyaWJlVG9SZXN1bHQodGhpcywgb2JzZXJ2YWJsZSwgb2JzZXJ2YWJsZSwgaSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBDb21iaW5lTGF0ZXN0U3Vic2NyaWJlci5wcm90b3R5cGUubm90aWZ5Q29tcGxldGUgPSBmdW5jdGlvbiAodW51c2VkKSB7XG4gICAgICAgIGlmICgodGhpcy5hY3RpdmUgLT0gMSkgPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24uY29tcGxldGUoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ29tYmluZUxhdGVzdFN1YnNjcmliZXIucHJvdG90eXBlLm5vdGlmeU5leHQgPSBmdW5jdGlvbiAob3V0ZXJWYWx1ZSwgaW5uZXJWYWx1ZSwgb3V0ZXJJbmRleCwgaW5uZXJJbmRleCwgaW5uZXJTdWIpIHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMudmFsdWVzO1xuICAgICAgICB2YWx1ZXNbb3V0ZXJJbmRleF0gPSBpbm5lclZhbHVlO1xuICAgICAgICB2YXIgdG9SZXNwb25kID0gdGhpcy50b1Jlc3BvbmQ7XG4gICAgICAgIGlmICh0b1Jlc3BvbmQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFyIGZvdW5kID0gdG9SZXNwb25kLmluZGV4T2Yob3V0ZXJJbmRleCk7XG4gICAgICAgICAgICBpZiAoZm91bmQgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgdG9SZXNwb25kLnNwbGljZShmb3VuZCwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRvUmVzcG9uZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnByb2plY3QpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl90cnlQcm9qZWN0KHZhbHVlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLm5leHQodmFsdWVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgQ29tYmluZUxhdGVzdFN1YnNjcmliZXIucHJvdG90eXBlLl90cnlQcm9qZWN0ID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5wcm9qZWN0LmFwcGx5KHRoaXMsIHZhbHVlcyk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5lcnJvcihlcnIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24ubmV4dChyZXN1bHQpO1xuICAgIH07XG4gICAgcmV0dXJuIENvbWJpbmVMYXRlc3RTdWJzY3JpYmVyO1xufShPdXRlclN1YnNjcmliZXJfMS5PdXRlclN1YnNjcmliZXIpKTtcbmV4cG9ydHMuQ29tYmluZUxhdGVzdFN1YnNjcmliZXIgPSBDb21iaW5lTGF0ZXN0U3Vic2NyaWJlcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvbWJpbmVMYXRlc3QuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgaXNTY2hlZHVsZXJfMSA9IHJlcXVpcmUoJy4uL3V0aWwvaXNTY2hlZHVsZXInKTtcbnZhciBBcnJheU9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uL29ic2VydmFibGUvQXJyYXlPYnNlcnZhYmxlJyk7XG52YXIgbWVyZ2VBbGxfMSA9IHJlcXVpcmUoJy4vbWVyZ2VBbGwnKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgT2JzZXJ2YWJsZSB3aGljaCBzZXF1ZW50aWFsbHkgZW1pdHMgYWxsIHZhbHVlcyBmcm9tIGV2ZXJ5XG4gKiBnaXZlbiBpbnB1dCBPYnNlcnZhYmxlIGFmdGVyIHRoZSBjdXJyZW50IE9ic2VydmFibGUuXG4gKlxuICogPHNwYW4gY2xhc3M9XCJpbmZvcm1hbFwiPkNvbmNhdGVuYXRlcyBtdWx0aXBsZSBPYnNlcnZhYmxlcyB0b2dldGhlciBieVxuICogc2VxdWVudGlhbGx5IGVtaXR0aW5nIHRoZWlyIHZhbHVlcywgb25lIE9ic2VydmFibGUgYWZ0ZXIgdGhlIG90aGVyLjwvc3Bhbj5cbiAqXG4gKiA8aW1nIHNyYz1cIi4vaW1nL2NvbmNhdC5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAqXG4gKiBKb2lucyB0aGlzIE9ic2VydmFibGUgd2l0aCBtdWx0aXBsZSBvdGhlciBPYnNlcnZhYmxlcyBieSBzdWJzY3JpYmluZyB0byB0aGVtXG4gKiBvbmUgYXQgYSB0aW1lLCBzdGFydGluZyB3aXRoIHRoZSBzb3VyY2UsIGFuZCBtZXJnaW5nIHRoZWlyIHJlc3VsdHMgaW50byB0aGVcbiAqIG91dHB1dCBPYnNlcnZhYmxlLiBXaWxsIHdhaXQgZm9yIGVhY2ggT2JzZXJ2YWJsZSB0byBjb21wbGV0ZSBiZWZvcmUgbW92aW5nXG4gKiBvbiB0byB0aGUgbmV4dC5cbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5Db25jYXRlbmF0ZSBhIHRpbWVyIGNvdW50aW5nIGZyb20gMCB0byAzIHdpdGggYSBzeW5jaHJvbm91cyBzZXF1ZW5jZSBmcm9tIDEgdG8gMTA8L2NhcHRpb24+XG4gKiB2YXIgdGltZXIgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMDApLnRha2UoNCk7XG4gKiB2YXIgc2VxdWVuY2UgPSBSeC5PYnNlcnZhYmxlLnJhbmdlKDEsIDEwKTtcbiAqIHZhciByZXN1bHQgPSB0aW1lci5jb25jYXQoc2VxdWVuY2UpO1xuICogcmVzdWx0LnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5Db25jYXRlbmF0ZSAzIE9ic2VydmFibGVzPC9jYXB0aW9uPlxuICogdmFyIHRpbWVyMSA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwMCkudGFrZSgxMCk7XG4gKiB2YXIgdGltZXIyID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgyMDAwKS50YWtlKDYpO1xuICogdmFyIHRpbWVyMyA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoNTAwKS50YWtlKDEwKTtcbiAqIHZhciByZXN1bHQgPSB0aW1lcjEuY29uY2F0KHRpbWVyMiwgdGltZXIzKTtcbiAqIHJlc3VsdC5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gKlxuICogQHNlZSB7QGxpbmsgY29uY2F0QWxsfVxuICogQHNlZSB7QGxpbmsgY29uY2F0TWFwfVxuICogQHNlZSB7QGxpbmsgY29uY2F0TWFwVG99XG4gKlxuICogQHBhcmFtIHtPYnNlcnZhYmxlfSBvdGhlciBBbiBpbnB1dCBPYnNlcnZhYmxlIHRvIGNvbmNhdGVuYXRlIGFmdGVyIHRoZSBzb3VyY2VcbiAqIE9ic2VydmFibGUuIE1vcmUgdGhhbiBvbmUgaW5wdXQgT2JzZXJ2YWJsZXMgbWF5IGJlIGdpdmVuIGFzIGFyZ3VtZW50LlxuICogQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXI9bnVsbF0gQW4gb3B0aW9uYWwgU2NoZWR1bGVyIHRvIHNjaGVkdWxlIGVhY2hcbiAqIE9ic2VydmFibGUgc3Vic2NyaXB0aW9uIG9uLlxuICogQHJldHVybiB7T2JzZXJ2YWJsZX0gQWxsIHZhbHVlcyBvZiBlYWNoIHBhc3NlZCBPYnNlcnZhYmxlIG1lcmdlZCBpbnRvIGFcbiAqIHNpbmdsZSBPYnNlcnZhYmxlLCBpbiBvcmRlciwgaW4gc2VyaWFsIGZhc2hpb24uXG4gKiBAbWV0aG9kIGNvbmNhdFxuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gY29uY2F0KCkge1xuICAgIHZhciBvYnNlcnZhYmxlcyA9IFtdO1xuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgIG9ic2VydmFibGVzW19pIC0gMF0gPSBhcmd1bWVudHNbX2ldO1xuICAgIH1cbiAgICByZXR1cm4gY29uY2F0U3RhdGljLmFwcGx5KHZvaWQgMCwgW3RoaXNdLmNvbmNhdChvYnNlcnZhYmxlcykpO1xufVxuZXhwb3J0cy5jb25jYXQgPSBjb25jYXQ7XG4vKiB0c2xpbnQ6ZW5hYmxlOm1heC1saW5lLWxlbmd0aCAqL1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBPYnNlcnZhYmxlIHdoaWNoIHNlcXVlbnRpYWxseSBlbWl0cyBhbGwgdmFsdWVzIGZyb20gZXZlcnlcbiAqIGdpdmVuIGlucHV0IE9ic2VydmFibGUgYWZ0ZXIgdGhlIGN1cnJlbnQgT2JzZXJ2YWJsZS5cbiAqXG4gKiA8c3BhbiBjbGFzcz1cImluZm9ybWFsXCI+Q29uY2F0ZW5hdGVzIG11bHRpcGxlIE9ic2VydmFibGVzIHRvZ2V0aGVyIGJ5XG4gKiBzZXF1ZW50aWFsbHkgZW1pdHRpbmcgdGhlaXIgdmFsdWVzLCBvbmUgT2JzZXJ2YWJsZSBhZnRlciB0aGUgb3RoZXIuPC9zcGFuPlxuICpcbiAqIDxpbWcgc3JjPVwiLi9pbWcvY29uY2F0LnBuZ1wiIHdpZHRoPVwiMTAwJVwiPlxuICpcbiAqIEpvaW5zIG11bHRpcGxlIE9ic2VydmFibGVzIHRvZ2V0aGVyIGJ5IHN1YnNjcmliaW5nIHRvIHRoZW0gb25lIGF0IGEgdGltZSBhbmRcbiAqIG1lcmdpbmcgdGhlaXIgcmVzdWx0cyBpbnRvIHRoZSBvdXRwdXQgT2JzZXJ2YWJsZS4gV2lsbCB3YWl0IGZvciBlYWNoXG4gKiBPYnNlcnZhYmxlIHRvIGNvbXBsZXRlIGJlZm9yZSBtb3Zpbmcgb24gdG8gdGhlIG5leHQuXG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+Q29uY2F0ZW5hdGUgYSB0aW1lciBjb3VudGluZyBmcm9tIDAgdG8gMyB3aXRoIGEgc3luY2hyb25vdXMgc2VxdWVuY2UgZnJvbSAxIHRvIDEwPC9jYXB0aW9uPlxuICogdmFyIHRpbWVyID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxMDAwKS50YWtlKDQpO1xuICogdmFyIHNlcXVlbmNlID0gUnguT2JzZXJ2YWJsZS5yYW5nZSgxLCAxMCk7XG4gKiB2YXIgcmVzdWx0ID0gUnguT2JzZXJ2YWJsZS5jb25jYXQodGltZXIsIHNlcXVlbmNlKTtcbiAqIHJlc3VsdC5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+Q29uY2F0ZW5hdGUgMyBPYnNlcnZhYmxlczwvY2FwdGlvbj5cbiAqIHZhciB0aW1lcjEgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMDApLnRha2UoMTApO1xuICogdmFyIHRpbWVyMiA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMjAwMCkudGFrZSg2KTtcbiAqIHZhciB0aW1lcjMgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDUwMCkudGFrZSgxMCk7XG4gKiB2YXIgcmVzdWx0ID0gUnguT2JzZXJ2YWJsZS5jb25jYXQodGltZXIxLCB0aW1lcjIsIHRpbWVyMyk7XG4gKiByZXN1bHQuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICpcbiAqIEBzZWUge0BsaW5rIGNvbmNhdEFsbH1cbiAqIEBzZWUge0BsaW5rIGNvbmNhdE1hcH1cbiAqIEBzZWUge0BsaW5rIGNvbmNhdE1hcFRvfVxuICpcbiAqIEBwYXJhbSB7T2JzZXJ2YWJsZX0gaW5wdXQxIEFuIGlucHV0IE9ic2VydmFibGUgdG8gY29uY2F0ZW5hdGUgd2l0aCBvdGhlcnMuXG4gKiBAcGFyYW0ge09ic2VydmFibGV9IGlucHV0MiBBbiBpbnB1dCBPYnNlcnZhYmxlIHRvIGNvbmNhdGVuYXRlIHdpdGggb3RoZXJzLlxuICogTW9yZSB0aGFuIG9uZSBpbnB1dCBPYnNlcnZhYmxlcyBtYXkgYmUgZ2l2ZW4gYXMgYXJndW1lbnQuXG4gKiBAcGFyYW0ge1NjaGVkdWxlcn0gW3NjaGVkdWxlcj1udWxsXSBBbiBvcHRpb25hbCBTY2hlZHVsZXIgdG8gc2NoZWR1bGUgZWFjaFxuICogT2JzZXJ2YWJsZSBzdWJzY3JpcHRpb24gb24uXG4gKiBAcmV0dXJuIHtPYnNlcnZhYmxlfSBBbGwgdmFsdWVzIG9mIGVhY2ggcGFzc2VkIE9ic2VydmFibGUgbWVyZ2VkIGludG8gYVxuICogc2luZ2xlIE9ic2VydmFibGUsIGluIG9yZGVyLCBpbiBzZXJpYWwgZmFzaGlvbi5cbiAqIEBzdGF0aWMgdHJ1ZVxuICogQG5hbWUgY29uY2F0XG4gKiBAb3duZXIgT2JzZXJ2YWJsZVxuICovXG5mdW5jdGlvbiBjb25jYXRTdGF0aWMoKSB7XG4gICAgdmFyIG9ic2VydmFibGVzID0gW107XG4gICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgb2JzZXJ2YWJsZXNbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgfVxuICAgIHZhciBzY2hlZHVsZXIgPSBudWxsO1xuICAgIHZhciBhcmdzID0gb2JzZXJ2YWJsZXM7XG4gICAgaWYgKGlzU2NoZWR1bGVyXzEuaXNTY2hlZHVsZXIoYXJnc1tvYnNlcnZhYmxlcy5sZW5ndGggLSAxXSkpIHtcbiAgICAgICAgc2NoZWR1bGVyID0gYXJncy5wb3AoKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBBcnJheU9ic2VydmFibGVfMS5BcnJheU9ic2VydmFibGUob2JzZXJ2YWJsZXMsIHNjaGVkdWxlcikubGlmdChuZXcgbWVyZ2VBbGxfMS5NZXJnZUFsbE9wZXJhdG9yKDEpKTtcbn1cbmV4cG9ydHMuY29uY2F0U3RhdGljID0gY29uY2F0U3RhdGljO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29uY2F0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgU3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi4vU3Vic2NyaWJlcicpO1xuLyoqXG4gKiBGaWx0ZXIgaXRlbXMgZW1pdHRlZCBieSB0aGUgc291cmNlIE9ic2VydmFibGUgYnkgb25seSBlbWl0dGluZyB0aG9zZSB0aGF0XG4gKiBzYXRpc2Z5IGEgc3BlY2lmaWVkIHByZWRpY2F0ZS5cbiAqXG4gKiA8c3BhbiBjbGFzcz1cImluZm9ybWFsXCI+TGlrZVxuICogW0FycmF5LnByb3RvdHlwZS5maWx0ZXIoKV0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvZmlsdGVyKSxcbiAqIGl0IG9ubHkgZW1pdHMgYSB2YWx1ZSBmcm9tIHRoZSBzb3VyY2UgaWYgaXQgcGFzc2VzIGEgY3JpdGVyaW9uIGZ1bmN0aW9uLjwvc3Bhbj5cbiAqXG4gKiA8aW1nIHNyYz1cIi4vaW1nL2ZpbHRlci5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAqXG4gKiBTaW1pbGFyIHRvIHRoZSB3ZWxsLWtub3duIGBBcnJheS5wcm90b3R5cGUuZmlsdGVyYCBtZXRob2QsIHRoaXMgb3BlcmF0b3JcbiAqIHRha2VzIHZhbHVlcyBmcm9tIHRoZSBzb3VyY2UgT2JzZXJ2YWJsZSwgcGFzc2VzIHRoZW0gdGhyb3VnaCBhIGBwcmVkaWNhdGVgXG4gKiBmdW5jdGlvbiBhbmQgb25seSBlbWl0cyB0aG9zZSB2YWx1ZXMgdGhhdCB5aWVsZGVkIGB0cnVlYC5cbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5FbWl0IG9ubHkgY2xpY2sgZXZlbnRzIHdob3NlIHRhcmdldCB3YXMgYSBESVYgZWxlbWVudDwvY2FwdGlvbj5cbiAqIHZhciBjbGlja3MgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChkb2N1bWVudCwgJ2NsaWNrJyk7XG4gKiB2YXIgY2xpY2tzT25EaXZzID0gY2xpY2tzLmZpbHRlcihldiA9PiBldi50YXJnZXQudGFnTmFtZSA9PT0gJ0RJVicpO1xuICogY2xpY2tzT25EaXZzLnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAc2VlIHtAbGluayBkaXN0aW5jdH1cbiAqIEBzZWUge0BsaW5rIGRpc3RpbmN0S2V5fVxuICogQHNlZSB7QGxpbmsgZGlzdGluY3RVbnRpbENoYW5nZWR9XG4gKiBAc2VlIHtAbGluayBkaXN0aW5jdFVudGlsS2V5Q2hhbmdlZH1cbiAqIEBzZWUge0BsaW5rIGlnbm9yZUVsZW1lbnRzfVxuICogQHNlZSB7QGxpbmsgcGFydGl0aW9ufVxuICogQHNlZSB7QGxpbmsgc2tpcH1cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHZhbHVlOiBULCBpbmRleDogbnVtYmVyKTogYm9vbGVhbn0gcHJlZGljYXRlIEEgZnVuY3Rpb24gdGhhdFxuICogZXZhbHVhdGVzIGVhY2ggdmFsdWUgZW1pdHRlZCBieSB0aGUgc291cmNlIE9ic2VydmFibGUuIElmIGl0IHJldHVybnMgYHRydWVgLFxuICogdGhlIHZhbHVlIGlzIGVtaXR0ZWQsIGlmIGBmYWxzZWAgdGhlIHZhbHVlIGlzIG5vdCBwYXNzZWQgdG8gdGhlIG91dHB1dFxuICogT2JzZXJ2YWJsZS4gVGhlIGBpbmRleGAgcGFyYW1ldGVyIGlzIHRoZSBudW1iZXIgYGlgIGZvciB0aGUgaS10aCBzb3VyY2VcbiAqIGVtaXNzaW9uIHRoYXQgaGFzIGhhcHBlbmVkIHNpbmNlIHRoZSBzdWJzY3JpcHRpb24sIHN0YXJ0aW5nIGZyb20gdGhlIG51bWJlclxuICogYDBgLlxuICogQHBhcmFtIHthbnl9IFt0aGlzQXJnXSBBbiBvcHRpb25hbCBhcmd1bWVudCB0byBkZXRlcm1pbmUgdGhlIHZhbHVlIG9mIGB0aGlzYFxuICogaW4gdGhlIGBwcmVkaWNhdGVgIGZ1bmN0aW9uLlxuICogQHJldHVybiB7T2JzZXJ2YWJsZX0gQW4gT2JzZXJ2YWJsZSBvZiB2YWx1ZXMgZnJvbSB0aGUgc291cmNlIHRoYXQgd2VyZVxuICogYWxsb3dlZCBieSB0aGUgYHByZWRpY2F0ZWAgZnVuY3Rpb24uXG4gKiBAbWV0aG9kIGZpbHRlclxuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gZmlsdGVyKHByZWRpY2F0ZSwgdGhpc0FyZykge1xuICAgIHJldHVybiB0aGlzLmxpZnQobmV3IEZpbHRlck9wZXJhdG9yKHByZWRpY2F0ZSwgdGhpc0FyZykpO1xufVxuZXhwb3J0cy5maWx0ZXIgPSBmaWx0ZXI7XG52YXIgRmlsdGVyT3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEZpbHRlck9wZXJhdG9yKHByZWRpY2F0ZSwgdGhpc0FyZykge1xuICAgICAgICB0aGlzLnByZWRpY2F0ZSA9IHByZWRpY2F0ZTtcbiAgICAgICAgdGhpcy50aGlzQXJnID0gdGhpc0FyZztcbiAgICB9XG4gICAgRmlsdGVyT3BlcmF0b3IucHJvdG90eXBlLmNhbGwgPSBmdW5jdGlvbiAoc3Vic2NyaWJlciwgc291cmNlKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2UuX3N1YnNjcmliZShuZXcgRmlsdGVyU3Vic2NyaWJlcihzdWJzY3JpYmVyLCB0aGlzLnByZWRpY2F0ZSwgdGhpcy50aGlzQXJnKSk7XG4gICAgfTtcbiAgICByZXR1cm4gRmlsdGVyT3BlcmF0b3I7XG59KCkpO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBGaWx0ZXJTdWJzY3JpYmVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoRmlsdGVyU3Vic2NyaWJlciwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBGaWx0ZXJTdWJzY3JpYmVyKGRlc3RpbmF0aW9uLCBwcmVkaWNhdGUsIHRoaXNBcmcpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVzdGluYXRpb24pO1xuICAgICAgICB0aGlzLnByZWRpY2F0ZSA9IHByZWRpY2F0ZTtcbiAgICAgICAgdGhpcy50aGlzQXJnID0gdGhpc0FyZztcbiAgICAgICAgdGhpcy5jb3VudCA9IDA7XG4gICAgICAgIHRoaXMucHJlZGljYXRlID0gcHJlZGljYXRlO1xuICAgIH1cbiAgICAvLyB0aGUgdHJ5IGNhdGNoIGJsb2NrIGJlbG93IGlzIGxlZnQgc3BlY2lmaWNhbGx5IGZvclxuICAgIC8vIG9wdGltaXphdGlvbiBhbmQgcGVyZiByZWFzb25zLiBhIHRyeUNhdGNoZXIgaXMgbm90IG5lY2Vzc2FyeSBoZXJlLlxuICAgIEZpbHRlclN1YnNjcmliZXIucHJvdG90eXBlLl9uZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXN1bHQgPSB0aGlzLnByZWRpY2F0ZS5jYWxsKHRoaXMudGhpc0FyZywgdmFsdWUsIHRoaXMuY291bnQrKyk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5lcnJvcihlcnIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24ubmV4dCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBGaWx0ZXJTdWJzY3JpYmVyO1xufShTdWJzY3JpYmVyXzEuU3Vic2NyaWJlcikpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZmlsdGVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgU3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi4vU3Vic2NyaWJlcicpO1xuLyoqXG4gKiBBcHBsaWVzIGEgZ2l2ZW4gYHByb2plY3RgIGZ1bmN0aW9uIHRvIGVhY2ggdmFsdWUgZW1pdHRlZCBieSB0aGUgc291cmNlXG4gKiBPYnNlcnZhYmxlLCBhbmQgZW1pdHMgdGhlIHJlc3VsdGluZyB2YWx1ZXMgYXMgYW4gT2JzZXJ2YWJsZS5cbiAqXG4gKiA8c3BhbiBjbGFzcz1cImluZm9ybWFsXCI+TGlrZSBbQXJyYXkucHJvdG90eXBlLm1hcCgpXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9tYXApLFxuICogaXQgcGFzc2VzIGVhY2ggc291cmNlIHZhbHVlIHRocm91Z2ggYSB0cmFuc2Zvcm1hdGlvbiBmdW5jdGlvbiB0byBnZXRcbiAqIGNvcnJlc3BvbmRpbmcgb3V0cHV0IHZhbHVlcy48L3NwYW4+XG4gKlxuICogPGltZyBzcmM9XCIuL2ltZy9tYXAucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gKlxuICogU2ltaWxhciB0byB0aGUgd2VsbCBrbm93biBgQXJyYXkucHJvdG90eXBlLm1hcGAgZnVuY3Rpb24sIHRoaXMgb3BlcmF0b3JcbiAqIGFwcGxpZXMgYSBwcm9qZWN0aW9uIHRvIGVhY2ggdmFsdWUgYW5kIGVtaXRzIHRoYXQgcHJvamVjdGlvbiBpbiB0aGUgb3V0cHV0XG4gKiBPYnNlcnZhYmxlLlxuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPk1hcCBldmVyeSBldmVyeSBjbGljayB0byB0aGUgY2xpZW50WCBwb3NpdGlvbiBvZiB0aGF0IGNsaWNrPC9jYXB0aW9uPlxuICogdmFyIGNsaWNrcyA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGRvY3VtZW50LCAnY2xpY2snKTtcbiAqIHZhciBwb3NpdGlvbnMgPSBjbGlja3MubWFwKGV2ID0+IGV2LmNsaWVudFgpO1xuICogcG9zaXRpb25zLnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAc2VlIHtAbGluayBtYXBUb31cbiAqIEBzZWUge0BsaW5rIHBsdWNrfVxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb24odmFsdWU6IFQsIGluZGV4OiBudW1iZXIpOiBSfSBwcm9qZWN0IFRoZSBmdW5jdGlvbiB0byBhcHBseVxuICogdG8gZWFjaCBgdmFsdWVgIGVtaXR0ZWQgYnkgdGhlIHNvdXJjZSBPYnNlcnZhYmxlLiBUaGUgYGluZGV4YCBwYXJhbWV0ZXIgaXNcbiAqIHRoZSBudW1iZXIgYGlgIGZvciB0aGUgaS10aCBlbWlzc2lvbiB0aGF0IGhhcyBoYXBwZW5lZCBzaW5jZSB0aGVcbiAqIHN1YnNjcmlwdGlvbiwgc3RhcnRpbmcgZnJvbSB0aGUgbnVtYmVyIGAwYC5cbiAqIEBwYXJhbSB7YW55fSBbdGhpc0FyZ10gQW4gb3B0aW9uYWwgYXJndW1lbnQgdG8gZGVmaW5lIHdoYXQgYHRoaXNgIGlzIGluIHRoZVxuICogYHByb2plY3RgIGZ1bmN0aW9uLlxuICogQHJldHVybiB7T2JzZXJ2YWJsZTxSPn0gQW4gT2JzZXJ2YWJsZSB0aGF0IGVtaXRzIHRoZSB2YWx1ZXMgZnJvbSB0aGUgc291cmNlXG4gKiBPYnNlcnZhYmxlIHRyYW5zZm9ybWVkIGJ5IHRoZSBnaXZlbiBgcHJvamVjdGAgZnVuY3Rpb24uXG4gKiBAbWV0aG9kIG1hcFxuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gbWFwKHByb2plY3QsIHRoaXNBcmcpIHtcbiAgICBpZiAodHlwZW9mIHByb2plY3QgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgaXMgbm90IGEgZnVuY3Rpb24uIEFyZSB5b3UgbG9va2luZyBmb3IgYG1hcFRvKClgPycpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5saWZ0KG5ldyBNYXBPcGVyYXRvcihwcm9qZWN0LCB0aGlzQXJnKSk7XG59XG5leHBvcnRzLm1hcCA9IG1hcDtcbnZhciBNYXBPcGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTWFwT3BlcmF0b3IocHJvamVjdCwgdGhpc0FyZykge1xuICAgICAgICB0aGlzLnByb2plY3QgPSBwcm9qZWN0O1xuICAgICAgICB0aGlzLnRoaXNBcmcgPSB0aGlzQXJnO1xuICAgIH1cbiAgICBNYXBPcGVyYXRvci5wcm90b3R5cGUuY2FsbCA9IGZ1bmN0aW9uIChzdWJzY3JpYmVyLCBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5fc3Vic2NyaWJlKG5ldyBNYXBTdWJzY3JpYmVyKHN1YnNjcmliZXIsIHRoaXMucHJvamVjdCwgdGhpcy50aGlzQXJnKSk7XG4gICAgfTtcbiAgICByZXR1cm4gTWFwT3BlcmF0b3I7XG59KCkpO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBNYXBTdWJzY3JpYmVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTWFwU3Vic2NyaWJlciwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNYXBTdWJzY3JpYmVyKGRlc3RpbmF0aW9uLCBwcm9qZWN0LCB0aGlzQXJnKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlc3RpbmF0aW9uKTtcbiAgICAgICAgdGhpcy5wcm9qZWN0ID0gcHJvamVjdDtcbiAgICAgICAgdGhpcy5jb3VudCA9IDA7XG4gICAgICAgIHRoaXMudGhpc0FyZyA9IHRoaXNBcmcgfHwgdGhpcztcbiAgICB9XG4gICAgLy8gTk9URTogVGhpcyBsb29rcyB1bm9wdGltaXplZCwgYnV0IGl0J3MgYWN0dWFsbHkgcHVycG9zZWZ1bGx5IE5PVFxuICAgIC8vIHVzaW5nIHRyeS9jYXRjaCBvcHRpbWl6YXRpb25zLlxuICAgIE1hcFN1YnNjcmliZXIucHJvdG90eXBlLl9uZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXN1bHQgPSB0aGlzLnByb2plY3QuY2FsbCh0aGlzLnRoaXNBcmcsIHZhbHVlLCB0aGlzLmNvdW50KyspO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24uZXJyb3IoZXJyKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLm5leHQocmVzdWx0KTtcbiAgICB9O1xuICAgIHJldHVybiBNYXBTdWJzY3JpYmVyO1xufShTdWJzY3JpYmVyXzEuU3Vic2NyaWJlcikpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWFwLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgU3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi4vU3Vic2NyaWJlcicpO1xuLyoqXG4gKiBFbWl0cyB0aGUgZ2l2ZW4gY29uc3RhbnQgdmFsdWUgb24gdGhlIG91dHB1dCBPYnNlcnZhYmxlIGV2ZXJ5IHRpbWUgdGhlIHNvdXJjZVxuICogT2JzZXJ2YWJsZSBlbWl0cyBhIHZhbHVlLlxuICpcbiAqIDxzcGFuIGNsYXNzPVwiaW5mb3JtYWxcIj5MaWtlIHtAbGluayBtYXB9LCBidXQgaXQgbWFwcyBldmVyeSBzb3VyY2UgdmFsdWUgdG9cbiAqIHRoZSBzYW1lIG91dHB1dCB2YWx1ZSBldmVyeSB0aW1lLjwvc3Bhbj5cbiAqXG4gKiA8aW1nIHNyYz1cIi4vaW1nL21hcFRvLnBuZ1wiIHdpZHRoPVwiMTAwJVwiPlxuICpcbiAqIFRha2VzIGEgY29uc3RhbnQgYHZhbHVlYCBhcyBhcmd1bWVudCwgYW5kIGVtaXRzIHRoYXQgd2hlbmV2ZXIgdGhlIHNvdXJjZVxuICogT2JzZXJ2YWJsZSBlbWl0cyBhIHZhbHVlLiBJbiBvdGhlciB3b3JkcywgaWdub3JlcyB0aGUgYWN0dWFsIHNvdXJjZSB2YWx1ZSxcbiAqIGFuZCBzaW1wbHkgdXNlcyB0aGUgZW1pc3Npb24gbW9tZW50IHRvIGtub3cgd2hlbiB0byBlbWl0IHRoZSBnaXZlbiBgdmFsdWVgLlxuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPk1hcCBldmVyeSBldmVyeSBjbGljayB0byB0aGUgc3RyaW5nICdIaSc8L2NhcHRpb24+XG4gKiB2YXIgY2xpY2tzID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoZG9jdW1lbnQsICdjbGljaycpO1xuICogdmFyIGdyZWV0aW5ncyA9IGNsaWNrcy5tYXBUbygnSGknKTtcbiAqIGdyZWV0aW5ncy5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gKlxuICogQHNlZSB7QGxpbmsgbWFwfVxuICpcbiAqIEBwYXJhbSB7YW55fSB2YWx1ZSBUaGUgdmFsdWUgdG8gbWFwIGVhY2ggc291cmNlIHZhbHVlIHRvLlxuICogQHJldHVybiB7T2JzZXJ2YWJsZX0gQW4gT2JzZXJ2YWJsZSB0aGF0IGVtaXRzIHRoZSBnaXZlbiBgdmFsdWVgIGV2ZXJ5IHRpbWVcbiAqIHRoZSBzb3VyY2UgT2JzZXJ2YWJsZSBlbWl0cyBzb21ldGhpbmcuXG4gKiBAbWV0aG9kIG1hcFRvXG4gKiBAb3duZXIgT2JzZXJ2YWJsZVxuICovXG5mdW5jdGlvbiBtYXBUbyh2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLmxpZnQobmV3IE1hcFRvT3BlcmF0b3IodmFsdWUpKTtcbn1cbmV4cG9ydHMubWFwVG8gPSBtYXBUbztcbnZhciBNYXBUb09wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBNYXBUb09wZXJhdG9yKHZhbHVlKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gICAgTWFwVG9PcGVyYXRvci5wcm90b3R5cGUuY2FsbCA9IGZ1bmN0aW9uIChzdWJzY3JpYmVyLCBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5fc3Vic2NyaWJlKG5ldyBNYXBUb1N1YnNjcmliZXIoc3Vic2NyaWJlciwgdGhpcy52YWx1ZSkpO1xuICAgIH07XG4gICAgcmV0dXJuIE1hcFRvT3BlcmF0b3I7XG59KCkpO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBNYXBUb1N1YnNjcmliZXIgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNYXBUb1N1YnNjcmliZXIsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTWFwVG9TdWJzY3JpYmVyKGRlc3RpbmF0aW9uLCB2YWx1ZSkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZXN0aW5hdGlvbik7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gICAgTWFwVG9TdWJzY3JpYmVyLnByb3RvdHlwZS5fbmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24ubmV4dCh0aGlzLnZhbHVlKTtcbiAgICB9O1xuICAgIHJldHVybiBNYXBUb1N1YnNjcmliZXI7XG59KFN1YnNjcmliZXJfMS5TdWJzY3JpYmVyKSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1tYXBUby5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBBcnJheU9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uL29ic2VydmFibGUvQXJyYXlPYnNlcnZhYmxlJyk7XG52YXIgbWVyZ2VBbGxfMSA9IHJlcXVpcmUoJy4vbWVyZ2VBbGwnKTtcbnZhciBpc1NjaGVkdWxlcl8xID0gcmVxdWlyZSgnLi4vdXRpbC9pc1NjaGVkdWxlcicpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBPYnNlcnZhYmxlIHdoaWNoIGNvbmN1cnJlbnRseSBlbWl0cyBhbGwgdmFsdWVzIGZyb20gZXZlcnlcbiAqIGdpdmVuIGlucHV0IE9ic2VydmFibGUuXG4gKlxuICogPHNwYW4gY2xhc3M9XCJpbmZvcm1hbFwiPkZsYXR0ZW5zIG11bHRpcGxlIE9ic2VydmFibGVzIHRvZ2V0aGVyIGJ5IGJsZW5kaW5nXG4gKiB0aGVpciB2YWx1ZXMgaW50byBvbmUgT2JzZXJ2YWJsZS48L3NwYW4+XG4gKlxuICogPGltZyBzcmM9XCIuL2ltZy9tZXJnZS5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAqXG4gKiBgbWVyZ2VgIHN1YnNjcmliZXMgdG8gZWFjaCBnaXZlbiBpbnB1dCBPYnNlcnZhYmxlIChlaXRoZXIgdGhlIHNvdXJjZSBvciBhblxuICogT2JzZXJ2YWJsZSBnaXZlbiBhcyBhcmd1bWVudCksIGFuZCBzaW1wbHkgZm9yd2FyZHMgKHdpdGhvdXQgZG9pbmcgYW55XG4gKiB0cmFuc2Zvcm1hdGlvbikgYWxsIHRoZSB2YWx1ZXMgZnJvbSBhbGwgdGhlIGlucHV0IE9ic2VydmFibGVzIHRvIHRoZSBvdXRwdXRcbiAqIE9ic2VydmFibGUuIFRoZSBvdXRwdXQgT2JzZXJ2YWJsZSBvbmx5IGNvbXBsZXRlcyBvbmNlIGFsbCBpbnB1dCBPYnNlcnZhYmxlc1xuICogaGF2ZSBjb21wbGV0ZWQuIEFueSBlcnJvciBkZWxpdmVyZWQgYnkgYW4gaW5wdXQgT2JzZXJ2YWJsZSB3aWxsIGJlIGltbWVkaWF0ZWx5XG4gKiBlbWl0dGVkIG9uIHRoZSBvdXRwdXQgT2JzZXJ2YWJsZS5cbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5NZXJnZSB0b2dldGhlciB0d28gT2JzZXJ2YWJsZXM6IDFzIGludGVydmFsIGFuZCBjbGlja3M8L2NhcHRpb24+XG4gKiB2YXIgY2xpY2tzID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoZG9jdW1lbnQsICdjbGljaycpO1xuICogdmFyIHRpbWVyID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxMDAwKTtcbiAqIHZhciBjbGlja3NPclRpbWVyID0gY2xpY2tzLm1lcmdlKHRpbWVyKTtcbiAqIGNsaWNrc09yVGltZXIuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPk1lcmdlIHRvZ2V0aGVyIDMgT2JzZXJ2YWJsZXMsIGJ1dCBvbmx5IDIgcnVuIGNvbmN1cnJlbnRseTwvY2FwdGlvbj5cbiAqIHZhciB0aW1lcjEgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMDApLnRha2UoMTApO1xuICogdmFyIHRpbWVyMiA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMjAwMCkudGFrZSg2KTtcbiAqIHZhciB0aW1lcjMgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDUwMCkudGFrZSgxMCk7XG4gKiB2YXIgY29uY3VycmVudCA9IDI7IC8vIHRoZSBhcmd1bWVudFxuICogdmFyIG1lcmdlZCA9IHRpbWVyMS5tZXJnZSh0aW1lcjIsIHRpbWVyMywgY29uY3VycmVudCk7XG4gKiBtZXJnZWQuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICpcbiAqIEBzZWUge0BsaW5rIG1lcmdlQWxsfVxuICogQHNlZSB7QGxpbmsgbWVyZ2VNYXB9XG4gKiBAc2VlIHtAbGluayBtZXJnZU1hcFRvfVxuICogQHNlZSB7QGxpbmsgbWVyZ2VTY2FufVxuICpcbiAqIEBwYXJhbSB7T2JzZXJ2YWJsZX0gb3RoZXIgQW4gaW5wdXQgT2JzZXJ2YWJsZSB0byBtZXJnZSB3aXRoIHRoZSBzb3VyY2VcbiAqIE9ic2VydmFibGUuIE1vcmUgdGhhbiBvbmUgaW5wdXQgT2JzZXJ2YWJsZXMgbWF5IGJlIGdpdmVuIGFzIGFyZ3VtZW50LlxuICogQHBhcmFtIHtudW1iZXJ9IFtjb25jdXJyZW50PU51bWJlci5QT1NJVElWRV9JTkZJTklUWV0gTWF4aW11bSBudW1iZXIgb2YgaW5wdXRcbiAqIE9ic2VydmFibGVzIGJlaW5nIHN1YnNjcmliZWQgdG8gY29uY3VycmVudGx5LlxuICogQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXI9bnVsbF0gVGhlIFNjaGVkdWxlciB0byB1c2UgZm9yIG1hbmFnaW5nXG4gKiBjb25jdXJyZW5jeSBvZiBpbnB1dCBPYnNlcnZhYmxlcy5cbiAqIEByZXR1cm4ge09ic2VydmFibGV9IGFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyBpdGVtcyB0aGF0IGFyZSB0aGUgcmVzdWx0IG9mXG4gKiBldmVyeSBpbnB1dCBPYnNlcnZhYmxlLlxuICogQG1ldGhvZCBtZXJnZVxuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gbWVyZ2UoKSB7XG4gICAgdmFyIG9ic2VydmFibGVzID0gW107XG4gICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgb2JzZXJ2YWJsZXNbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgfVxuICAgIG9ic2VydmFibGVzLnVuc2hpZnQodGhpcyk7XG4gICAgcmV0dXJuIG1lcmdlU3RhdGljLmFwcGx5KHRoaXMsIG9ic2VydmFibGVzKTtcbn1cbmV4cG9ydHMubWVyZ2UgPSBtZXJnZTtcbi8qIHRzbGludDplbmFibGU6bWF4LWxpbmUtbGVuZ3RoICovXG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IE9ic2VydmFibGUgd2hpY2ggY29uY3VycmVudGx5IGVtaXRzIGFsbCB2YWx1ZXMgZnJvbSBldmVyeVxuICogZ2l2ZW4gaW5wdXQgT2JzZXJ2YWJsZS5cbiAqXG4gKiA8c3BhbiBjbGFzcz1cImluZm9ybWFsXCI+RmxhdHRlbnMgbXVsdGlwbGUgT2JzZXJ2YWJsZXMgdG9nZXRoZXIgYnkgYmxlbmRpbmdcbiAqIHRoZWlyIHZhbHVlcyBpbnRvIG9uZSBPYnNlcnZhYmxlLjwvc3Bhbj5cbiAqXG4gKiA8aW1nIHNyYz1cIi4vaW1nL21lcmdlLnBuZ1wiIHdpZHRoPVwiMTAwJVwiPlxuICpcbiAqIGBtZXJnZWAgc3Vic2NyaWJlcyB0byBlYWNoIGdpdmVuIGlucHV0IE9ic2VydmFibGUgKGFzIGFyZ3VtZW50cyksIGFuZCBzaW1wbHlcbiAqIGZvcndhcmRzICh3aXRob3V0IGRvaW5nIGFueSB0cmFuc2Zvcm1hdGlvbikgYWxsIHRoZSB2YWx1ZXMgZnJvbSBhbGwgdGhlIGlucHV0XG4gKiBPYnNlcnZhYmxlcyB0byB0aGUgb3V0cHV0IE9ic2VydmFibGUuIFRoZSBvdXRwdXQgT2JzZXJ2YWJsZSBvbmx5IGNvbXBsZXRlc1xuICogb25jZSBhbGwgaW5wdXQgT2JzZXJ2YWJsZXMgaGF2ZSBjb21wbGV0ZWQuIEFueSBlcnJvciBkZWxpdmVyZWQgYnkgYW4gaW5wdXRcbiAqIE9ic2VydmFibGUgd2lsbCBiZSBpbW1lZGlhdGVseSBlbWl0dGVkIG9uIHRoZSBvdXRwdXQgT2JzZXJ2YWJsZS5cbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5NZXJnZSB0b2dldGhlciB0d28gT2JzZXJ2YWJsZXM6IDFzIGludGVydmFsIGFuZCBjbGlja3M8L2NhcHRpb24+XG4gKiB2YXIgY2xpY2tzID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoZG9jdW1lbnQsICdjbGljaycpO1xuICogdmFyIHRpbWVyID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxMDAwKTtcbiAqIHZhciBjbGlja3NPclRpbWVyID0gUnguT2JzZXJ2YWJsZS5tZXJnZShjbGlja3MsIHRpbWVyKTtcbiAqIGNsaWNrc09yVGltZXIuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPk1lcmdlIHRvZ2V0aGVyIDMgT2JzZXJ2YWJsZXMsIGJ1dCBvbmx5IDIgcnVuIGNvbmN1cnJlbnRseTwvY2FwdGlvbj5cbiAqIHZhciB0aW1lcjEgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMDApLnRha2UoMTApO1xuICogdmFyIHRpbWVyMiA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMjAwMCkudGFrZSg2KTtcbiAqIHZhciB0aW1lcjMgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDUwMCkudGFrZSgxMCk7XG4gKiB2YXIgY29uY3VycmVudCA9IDI7IC8vIHRoZSBhcmd1bWVudFxuICogdmFyIG1lcmdlZCA9IFJ4Lk9ic2VydmFibGUubWVyZ2UodGltZXIxLCB0aW1lcjIsIHRpbWVyMywgY29uY3VycmVudCk7XG4gKiBtZXJnZWQuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICpcbiAqIEBzZWUge0BsaW5rIG1lcmdlQWxsfVxuICogQHNlZSB7QGxpbmsgbWVyZ2VNYXB9XG4gKiBAc2VlIHtAbGluayBtZXJnZU1hcFRvfVxuICogQHNlZSB7QGxpbmsgbWVyZ2VTY2FufVxuICpcbiAqIEBwYXJhbSB7T2JzZXJ2YWJsZX0gaW5wdXQxIEFuIGlucHV0IE9ic2VydmFibGUgdG8gbWVyZ2Ugd2l0aCBvdGhlcnMuXG4gKiBAcGFyYW0ge09ic2VydmFibGV9IGlucHV0MiBBbiBpbnB1dCBPYnNlcnZhYmxlIHRvIG1lcmdlIHdpdGggb3RoZXJzLlxuICogQHBhcmFtIHtudW1iZXJ9IFtjb25jdXJyZW50PU51bWJlci5QT1NJVElWRV9JTkZJTklUWV0gTWF4aW11bSBudW1iZXIgb2YgaW5wdXRcbiAqIE9ic2VydmFibGVzIGJlaW5nIHN1YnNjcmliZWQgdG8gY29uY3VycmVudGx5LlxuICogQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXI9bnVsbF0gVGhlIFNjaGVkdWxlciB0byB1c2UgZm9yIG1hbmFnaW5nXG4gKiBjb25jdXJyZW5jeSBvZiBpbnB1dCBPYnNlcnZhYmxlcy5cbiAqIEByZXR1cm4ge09ic2VydmFibGV9IGFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyBpdGVtcyB0aGF0IGFyZSB0aGUgcmVzdWx0IG9mXG4gKiBldmVyeSBpbnB1dCBPYnNlcnZhYmxlLlxuICogQHN0YXRpYyB0cnVlXG4gKiBAbmFtZSBtZXJnZVxuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gbWVyZ2VTdGF0aWMoKSB7XG4gICAgdmFyIG9ic2VydmFibGVzID0gW107XG4gICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgb2JzZXJ2YWJsZXNbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgfVxuICAgIHZhciBjb25jdXJyZW50ID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuICAgIHZhciBzY2hlZHVsZXIgPSBudWxsO1xuICAgIHZhciBsYXN0ID0gb2JzZXJ2YWJsZXNbb2JzZXJ2YWJsZXMubGVuZ3RoIC0gMV07XG4gICAgaWYgKGlzU2NoZWR1bGVyXzEuaXNTY2hlZHVsZXIobGFzdCkpIHtcbiAgICAgICAgc2NoZWR1bGVyID0gb2JzZXJ2YWJsZXMucG9wKCk7XG4gICAgICAgIGlmIChvYnNlcnZhYmxlcy5sZW5ndGggPiAxICYmIHR5cGVvZiBvYnNlcnZhYmxlc1tvYnNlcnZhYmxlcy5sZW5ndGggLSAxXSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGNvbmN1cnJlbnQgPSBvYnNlcnZhYmxlcy5wb3AoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgbGFzdCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgY29uY3VycmVudCA9IG9ic2VydmFibGVzLnBvcCgpO1xuICAgIH1cbiAgICBpZiAob2JzZXJ2YWJsZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiBvYnNlcnZhYmxlc1swXTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBBcnJheU9ic2VydmFibGVfMS5BcnJheU9ic2VydmFibGUob2JzZXJ2YWJsZXMsIHNjaGVkdWxlcikubGlmdChuZXcgbWVyZ2VBbGxfMS5NZXJnZUFsbE9wZXJhdG9yKGNvbmN1cnJlbnQpKTtcbn1cbmV4cG9ydHMubWVyZ2VTdGF0aWMgPSBtZXJnZVN0YXRpYztcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1lcmdlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgT3V0ZXJTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuLi9PdXRlclN1YnNjcmliZXInKTtcbnZhciBzdWJzY3JpYmVUb1Jlc3VsdF8xID0gcmVxdWlyZSgnLi4vdXRpbC9zdWJzY3JpYmVUb1Jlc3VsdCcpO1xuLyoqXG4gKiBDb252ZXJ0cyBhIGhpZ2hlci1vcmRlciBPYnNlcnZhYmxlIGludG8gYSBmaXJzdC1vcmRlciBPYnNlcnZhYmxlIHdoaWNoXG4gKiBjb25jdXJyZW50bHkgZGVsaXZlcnMgYWxsIHZhbHVlcyB0aGF0IGFyZSBlbWl0dGVkIG9uIHRoZSBpbm5lciBPYnNlcnZhYmxlcy5cbiAqXG4gKiA8c3BhbiBjbGFzcz1cImluZm9ybWFsXCI+RmxhdHRlbnMgYW4gT2JzZXJ2YWJsZS1vZi1PYnNlcnZhYmxlcy48L3NwYW4+XG4gKlxuICogPGltZyBzcmM9XCIuL2ltZy9tZXJnZUFsbC5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAqXG4gKiBgbWVyZ2VBbGxgIHN1YnNjcmliZXMgdG8gYW4gT2JzZXJ2YWJsZSB0aGF0IGVtaXRzIE9ic2VydmFibGVzLCBhbHNvIGtub3duIGFzXG4gKiBhIGhpZ2hlci1vcmRlciBPYnNlcnZhYmxlLiBFYWNoIHRpbWUgaXQgb2JzZXJ2ZXMgb25lIG9mIHRoZXNlIGVtaXR0ZWQgaW5uZXJcbiAqIE9ic2VydmFibGVzLCBpdCBzdWJzY3JpYmVzIHRvIHRoYXQgYW5kIGRlbGl2ZXJzIGFsbCB0aGUgdmFsdWVzIGZyb20gdGhlXG4gKiBpbm5lciBPYnNlcnZhYmxlIG9uIHRoZSBvdXRwdXQgT2JzZXJ2YWJsZS4gVGhlIG91dHB1dCBPYnNlcnZhYmxlIG9ubHlcbiAqIGNvbXBsZXRlcyBvbmNlIGFsbCBpbm5lciBPYnNlcnZhYmxlcyBoYXZlIGNvbXBsZXRlZC4gQW55IGVycm9yIGRlbGl2ZXJlZCBieVxuICogYSBpbm5lciBPYnNlcnZhYmxlIHdpbGwgYmUgaW1tZWRpYXRlbHkgZW1pdHRlZCBvbiB0aGUgb3V0cHV0IE9ic2VydmFibGUuXG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+U3Bhd24gYSBuZXcgaW50ZXJ2YWwgT2JzZXJ2YWJsZSBmb3IgZWFjaCBjbGljayBldmVudCwgYW5kIGJsZW5kIHRoZWlyIG91dHB1dHMgYXMgb25lIE9ic2VydmFibGU8L2NhcHRpb24+XG4gKiB2YXIgY2xpY2tzID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoZG9jdW1lbnQsICdjbGljaycpO1xuICogdmFyIGhpZ2hlck9yZGVyID0gY2xpY2tzLm1hcCgoZXYpID0+IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwMCkpO1xuICogdmFyIGZpcnN0T3JkZXIgPSBoaWdoZXJPcmRlci5tZXJnZUFsbCgpO1xuICogZmlyc3RPcmRlci5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+Q291bnQgZnJvbSAwIHRvIDkgZXZlcnkgc2Vjb25kIGZvciBlYWNoIGNsaWNrLCBidXQgb25seSBhbGxvdyAyIGNvbmN1cnJlbnQgdGltZXJzPC9jYXB0aW9uPlxuICogdmFyIGNsaWNrcyA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGRvY3VtZW50LCAnY2xpY2snKTtcbiAqIHZhciBoaWdoZXJPcmRlciA9IGNsaWNrcy5tYXAoKGV2KSA9PiBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMDApLnRha2UoMTApKTtcbiAqIHZhciBmaXJzdE9yZGVyID0gaGlnaGVyT3JkZXIubWVyZ2VBbGwoMik7XG4gKiBmaXJzdE9yZGVyLnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAc2VlIHtAbGluayBjb21iaW5lQWxsfVxuICogQHNlZSB7QGxpbmsgY29uY2F0QWxsfVxuICogQHNlZSB7QGxpbmsgZXhoYXVzdH1cbiAqIEBzZWUge0BsaW5rIG1lcmdlfVxuICogQHNlZSB7QGxpbmsgbWVyZ2VNYXB9XG4gKiBAc2VlIHtAbGluayBtZXJnZU1hcFRvfVxuICogQHNlZSB7QGxpbmsgbWVyZ2VTY2FufVxuICogQHNlZSB7QGxpbmsgc3dpdGNofVxuICogQHNlZSB7QGxpbmsgemlwQWxsfVxuICpcbiAqIEBwYXJhbSB7bnVtYmVyfSBbY29uY3VycmVudD1OdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFldIE1heGltdW0gbnVtYmVyIG9mIGlubmVyXG4gKiBPYnNlcnZhYmxlcyBiZWluZyBzdWJzY3JpYmVkIHRvIGNvbmN1cnJlbnRseS5cbiAqIEByZXR1cm4ge09ic2VydmFibGV9IEFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyB2YWx1ZXMgY29taW5nIGZyb20gYWxsIHRoZVxuICogaW5uZXIgT2JzZXJ2YWJsZXMgZW1pdHRlZCBieSB0aGUgc291cmNlIE9ic2VydmFibGUuXG4gKiBAbWV0aG9kIG1lcmdlQWxsXG4gKiBAb3duZXIgT2JzZXJ2YWJsZVxuICovXG5mdW5jdGlvbiBtZXJnZUFsbChjb25jdXJyZW50KSB7XG4gICAgaWYgKGNvbmN1cnJlbnQgPT09IHZvaWQgMCkgeyBjb25jdXJyZW50ID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZOyB9XG4gICAgcmV0dXJuIHRoaXMubGlmdChuZXcgTWVyZ2VBbGxPcGVyYXRvcihjb25jdXJyZW50KSk7XG59XG5leHBvcnRzLm1lcmdlQWxsID0gbWVyZ2VBbGw7XG52YXIgTWVyZ2VBbGxPcGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTWVyZ2VBbGxPcGVyYXRvcihjb25jdXJyZW50KSB7XG4gICAgICAgIHRoaXMuY29uY3VycmVudCA9IGNvbmN1cnJlbnQ7XG4gICAgfVxuICAgIE1lcmdlQWxsT3BlcmF0b3IucHJvdG90eXBlLmNhbGwgPSBmdW5jdGlvbiAob2JzZXJ2ZXIsIHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gc291cmNlLl9zdWJzY3JpYmUobmV3IE1lcmdlQWxsU3Vic2NyaWJlcihvYnNlcnZlciwgdGhpcy5jb25jdXJyZW50KSk7XG4gICAgfTtcbiAgICByZXR1cm4gTWVyZ2VBbGxPcGVyYXRvcjtcbn0oKSk7XG5leHBvcnRzLk1lcmdlQWxsT3BlcmF0b3IgPSBNZXJnZUFsbE9wZXJhdG9yO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBNZXJnZUFsbFN1YnNjcmliZXIgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNZXJnZUFsbFN1YnNjcmliZXIsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTWVyZ2VBbGxTdWJzY3JpYmVyKGRlc3RpbmF0aW9uLCBjb25jdXJyZW50KSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlc3RpbmF0aW9uKTtcbiAgICAgICAgdGhpcy5jb25jdXJyZW50ID0gY29uY3VycmVudDtcbiAgICAgICAgdGhpcy5oYXNDb21wbGV0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5idWZmZXIgPSBbXTtcbiAgICAgICAgdGhpcy5hY3RpdmUgPSAwO1xuICAgIH1cbiAgICBNZXJnZUFsbFN1YnNjcmliZXIucHJvdG90eXBlLl9uZXh0ID0gZnVuY3Rpb24gKG9ic2VydmFibGUpIHtcbiAgICAgICAgaWYgKHRoaXMuYWN0aXZlIDwgdGhpcy5jb25jdXJyZW50KSB7XG4gICAgICAgICAgICB0aGlzLmFjdGl2ZSsrO1xuICAgICAgICAgICAgdGhpcy5hZGQoc3Vic2NyaWJlVG9SZXN1bHRfMS5zdWJzY3JpYmVUb1Jlc3VsdCh0aGlzLCBvYnNlcnZhYmxlKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmJ1ZmZlci5wdXNoKG9ic2VydmFibGUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNZXJnZUFsbFN1YnNjcmliZXIucHJvdG90eXBlLl9jb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5oYXNDb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICBpZiAodGhpcy5hY3RpdmUgPT09IDAgJiYgdGhpcy5idWZmZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1lcmdlQWxsU3Vic2NyaWJlci5wcm90b3R5cGUubm90aWZ5Q29tcGxldGUgPSBmdW5jdGlvbiAoaW5uZXJTdWIpIHtcbiAgICAgICAgdmFyIGJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgICAgICB0aGlzLnJlbW92ZShpbm5lclN1Yik7XG4gICAgICAgIHRoaXMuYWN0aXZlLS07XG4gICAgICAgIGlmIChidWZmZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5fbmV4dChidWZmZXIuc2hpZnQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5hY3RpdmUgPT09IDAgJiYgdGhpcy5oYXNDb21wbGV0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24uY29tcGxldGUoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1lcmdlQWxsU3Vic2NyaWJlcjtcbn0oT3V0ZXJTdWJzY3JpYmVyXzEuT3V0ZXJTdWJzY3JpYmVyKSk7XG5leHBvcnRzLk1lcmdlQWxsU3Vic2NyaWJlciA9IE1lcmdlQWxsU3Vic2NyaWJlcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1lcmdlQWxsLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIENvbm5lY3RhYmxlT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vb2JzZXJ2YWJsZS9Db25uZWN0YWJsZU9ic2VydmFibGUnKTtcbi8qKlxuICogUmV0dXJucyBhbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgdGhlIHJlc3VsdHMgb2YgaW52b2tpbmcgYSBzcGVjaWZpZWQgc2VsZWN0b3Igb24gaXRlbXNcbiAqIGVtaXR0ZWQgYnkgYSBDb25uZWN0YWJsZU9ic2VydmFibGUgdGhhdCBzaGFyZXMgYSBzaW5nbGUgc3Vic2NyaXB0aW9uIHRvIHRoZSB1bmRlcmx5aW5nIHN0cmVhbS5cbiAqXG4gKiA8aW1nIHNyYz1cIi4vaW1nL211bHRpY2FzdC5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBzZWxlY3RvciAtIGEgZnVuY3Rpb24gdGhhdCBjYW4gdXNlIHRoZSBtdWx0aWNhc3RlZCBzb3VyY2Ugc3RyZWFtXG4gKiBhcyBtYW55IHRpbWVzIGFzIG5lZWRlZCwgd2l0aG91dCBjYXVzaW5nIG11bHRpcGxlIHN1YnNjcmlwdGlvbnMgdG8gdGhlIHNvdXJjZSBzdHJlYW0uXG4gKiBTdWJzY3JpYmVycyB0byB0aGUgZ2l2ZW4gc291cmNlIHdpbGwgcmVjZWl2ZSBhbGwgbm90aWZpY2F0aW9ucyBvZiB0aGUgc291cmNlIGZyb20gdGhlXG4gKiB0aW1lIG9mIHRoZSBzdWJzY3JpcHRpb24gZm9yd2FyZC5cbiAqIEByZXR1cm4ge09ic2VydmFibGV9IGFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyB0aGUgcmVzdWx0cyBvZiBpbnZva2luZyB0aGUgc2VsZWN0b3JcbiAqIG9uIHRoZSBpdGVtcyBlbWl0dGVkIGJ5IGEgYENvbm5lY3RhYmxlT2JzZXJ2YWJsZWAgdGhhdCBzaGFyZXMgYSBzaW5nbGUgc3Vic2NyaXB0aW9uIHRvXG4gKiB0aGUgdW5kZXJseWluZyBzdHJlYW0uXG4gKiBAbWV0aG9kIG11bHRpY2FzdFxuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gbXVsdGljYXN0KHN1YmplY3RPclN1YmplY3RGYWN0b3J5KSB7XG4gICAgdmFyIHN1YmplY3RGYWN0b3J5O1xuICAgIGlmICh0eXBlb2Ygc3ViamVjdE9yU3ViamVjdEZhY3RvcnkgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgc3ViamVjdEZhY3RvcnkgPSBzdWJqZWN0T3JTdWJqZWN0RmFjdG9yeTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHN1YmplY3RGYWN0b3J5ID0gZnVuY3Rpb24gc3ViamVjdEZhY3RvcnkoKSB7XG4gICAgICAgICAgICByZXR1cm4gc3ViamVjdE9yU3ViamVjdEZhY3Rvcnk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBuZXcgQ29ubmVjdGFibGVPYnNlcnZhYmxlXzEuQ29ubmVjdGFibGVPYnNlcnZhYmxlKHRoaXMsIHN1YmplY3RGYWN0b3J5KTtcbn1cbmV4cG9ydHMubXVsdGljYXN0ID0gbXVsdGljYXN0O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bXVsdGljYXN0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgU3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi4vU3Vic2NyaWJlcicpO1xuLyoqXG4gKiBBcHBsaWVzIGFuIGFjY3VtdWxhdGlvbiBmdW5jdGlvbiBvdmVyIHRoZSBzb3VyY2UgT2JzZXJ2YWJsZSwgYW5kIHJldHVybnMgZWFjaFxuICogaW50ZXJtZWRpYXRlIHJlc3VsdCwgd2l0aCBhbiBvcHRpb25hbCBzZWVkIHZhbHVlLlxuICpcbiAqIDxzcGFuIGNsYXNzPVwiaW5mb3JtYWxcIj5JdCdzIGxpa2Uge0BsaW5rIHJlZHVjZX0sIGJ1dCBlbWl0cyB0aGUgY3VycmVudFxuICogYWNjdW11bGF0aW9uIHdoZW5ldmVyIHRoZSBzb3VyY2UgZW1pdHMgYSB2YWx1ZS48L3NwYW4+XG4gKlxuICogPGltZyBzcmM9XCIuL2ltZy9zY2FuLnBuZ1wiIHdpZHRoPVwiMTAwJVwiPlxuICpcbiAqIENvbWJpbmVzIHRvZ2V0aGVyIGFsbCB2YWx1ZXMgZW1pdHRlZCBvbiB0aGUgc291cmNlLCB1c2luZyBhbiBhY2N1bXVsYXRvclxuICogZnVuY3Rpb24gdGhhdCBrbm93cyBob3cgdG8gam9pbiBhIG5ldyBzb3VyY2UgdmFsdWUgaW50byB0aGUgYWNjdW11bGF0aW9uIGZyb21cbiAqIHRoZSBwYXN0LiBJcyBzaW1pbGFyIHRvIHtAbGluayByZWR1Y2V9LCBidXQgZW1pdHMgdGhlIGludGVybWVkaWF0ZVxuICogYWNjdW11bGF0aW9ucy5cbiAqXG4gKiBSZXR1cm5zIGFuIE9ic2VydmFibGUgdGhhdCBhcHBsaWVzIGEgc3BlY2lmaWVkIGBhY2N1bXVsYXRvcmAgZnVuY3Rpb24gdG8gZWFjaFxuICogaXRlbSBlbWl0dGVkIGJ5IHRoZSBzb3VyY2UgT2JzZXJ2YWJsZS4gSWYgYSBgc2VlZGAgdmFsdWUgaXMgc3BlY2lmaWVkLCB0aGVuXG4gKiB0aGF0IHZhbHVlIHdpbGwgYmUgdXNlZCBhcyB0aGUgaW5pdGlhbCB2YWx1ZSBmb3IgdGhlIGFjY3VtdWxhdG9yLiBJZiBubyBzZWVkXG4gKiB2YWx1ZSBpcyBzcGVjaWZpZWQsIHRoZSBmaXJzdCBpdGVtIG9mIHRoZSBzb3VyY2UgaXMgdXNlZCBhcyB0aGUgc2VlZC5cbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5Db3VudCB0aGUgbnVtYmVyIG9mIGNsaWNrIGV2ZW50czwvY2FwdGlvbj5cbiAqIHZhciBjbGlja3MgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChkb2N1bWVudCwgJ2NsaWNrJyk7XG4gKiB2YXIgb25lcyA9IGNsaWNrcy5tYXBUbygxKTtcbiAqIHZhciBzZWVkID0gMDtcbiAqIHZhciBjb3VudCA9IG9uZXMuc2NhbigoYWNjLCBvbmUpID0+IGFjYyArIG9uZSwgc2VlZCk7XG4gKiBjb3VudC5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gKlxuICogQHNlZSB7QGxpbmsgZXhwYW5kfVxuICogQHNlZSB7QGxpbmsgbWVyZ2VTY2FufVxuICogQHNlZSB7QGxpbmsgcmVkdWNlfVxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oYWNjOiBSLCB2YWx1ZTogVCk6IFJ9IGFjY3VtdWxhdG9yIFRoZSBhY2N1bXVsYXRvciBmdW5jdGlvblxuICogY2FsbGVkIG9uIGVhY2ggc291cmNlIHZhbHVlLlxuICogQHBhcmFtIHtUfFJ9IFtzZWVkXSBUaGUgaW5pdGlhbCBhY2N1bXVsYXRpb24gdmFsdWUuXG4gKiBAcmV0dXJuIHtPYnNlcnZhYmxlPFI+fSBBbiBvYnNlcnZhYmxlIG9mIHRoZSBhY2N1bXVsYXRlZCB2YWx1ZXMuXG4gKiBAbWV0aG9kIHNjYW5cbiAqIEBvd25lciBPYnNlcnZhYmxlXG4gKi9cbmZ1bmN0aW9uIHNjYW4oYWNjdW11bGF0b3IsIHNlZWQpIHtcbiAgICByZXR1cm4gdGhpcy5saWZ0KG5ldyBTY2FuT3BlcmF0b3IoYWNjdW11bGF0b3IsIHNlZWQpKTtcbn1cbmV4cG9ydHMuc2NhbiA9IHNjYW47XG52YXIgU2Nhbk9wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTY2FuT3BlcmF0b3IoYWNjdW11bGF0b3IsIHNlZWQpIHtcbiAgICAgICAgdGhpcy5hY2N1bXVsYXRvciA9IGFjY3VtdWxhdG9yO1xuICAgICAgICB0aGlzLnNlZWQgPSBzZWVkO1xuICAgIH1cbiAgICBTY2FuT3BlcmF0b3IucHJvdG90eXBlLmNhbGwgPSBmdW5jdGlvbiAoc3Vic2NyaWJlciwgc291cmNlKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2UuX3N1YnNjcmliZShuZXcgU2NhblN1YnNjcmliZXIoc3Vic2NyaWJlciwgdGhpcy5hY2N1bXVsYXRvciwgdGhpcy5zZWVkKSk7XG4gICAgfTtcbiAgICByZXR1cm4gU2Nhbk9wZXJhdG9yO1xufSgpKTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgU2NhblN1YnNjcmliZXIgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTY2FuU3Vic2NyaWJlciwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTY2FuU3Vic2NyaWJlcihkZXN0aW5hdGlvbiwgYWNjdW11bGF0b3IsIHNlZWQpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVzdGluYXRpb24pO1xuICAgICAgICB0aGlzLmFjY3VtdWxhdG9yID0gYWNjdW11bGF0b3I7XG4gICAgICAgIHRoaXMuYWNjdW11bGF0b3JTZXQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5zZWVkID0gc2VlZDtcbiAgICAgICAgdGhpcy5hY2N1bXVsYXRvciA9IGFjY3VtdWxhdG9yO1xuICAgICAgICB0aGlzLmFjY3VtdWxhdG9yU2V0ID0gdHlwZW9mIHNlZWQgIT09ICd1bmRlZmluZWQnO1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoU2NhblN1YnNjcmliZXIucHJvdG90eXBlLCBcInNlZWRcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zZWVkO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5hY2N1bXVsYXRvclNldCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9zZWVkID0gdmFsdWU7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIFNjYW5TdWJzY3JpYmVyLnByb3RvdHlwZS5fbmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAoIXRoaXMuYWNjdW11bGF0b3JTZXQpIHtcbiAgICAgICAgICAgIHRoaXMuc2VlZCA9IHZhbHVlO1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5uZXh0KHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl90cnlOZXh0KHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgU2NhblN1YnNjcmliZXIucHJvdG90eXBlLl90cnlOZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXN1bHQgPSB0aGlzLmFjY3VtdWxhdG9yKHRoaXMuc2VlZCwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24uZXJyb3IoZXJyKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNlZWQgPSByZXN1bHQ7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24ubmV4dChyZXN1bHQpO1xuICAgIH07XG4gICAgcmV0dXJuIFNjYW5TdWJzY3JpYmVyO1xufShTdWJzY3JpYmVyXzEuU3Vic2NyaWJlcikpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c2Nhbi5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBtdWx0aWNhc3RfMSA9IHJlcXVpcmUoJy4vbXVsdGljYXN0Jyk7XG52YXIgU3ViamVjdF8xID0gcmVxdWlyZSgnLi4vU3ViamVjdCcpO1xuZnVuY3Rpb24gc2hhcmVTdWJqZWN0RmFjdG9yeSgpIHtcbiAgICByZXR1cm4gbmV3IFN1YmplY3RfMS5TdWJqZWN0KCk7XG59XG4vKipcbiAqIFJldHVybnMgYSBuZXcgT2JzZXJ2YWJsZSB0aGF0IG11bHRpY2FzdHMgKHNoYXJlcykgdGhlIG9yaWdpbmFsIE9ic2VydmFibGUuIEFzIGxvbmcgYXMgdGhlcmUgaXMgYXQgbGVhc3Qgb25lXG4gKiBTdWJzY3JpYmVyIHRoaXMgT2JzZXJ2YWJsZSB3aWxsIGJlIHN1YnNjcmliZWQgYW5kIGVtaXR0aW5nIGRhdGEuIFdoZW4gYWxsIHN1YnNjcmliZXJzIGhhdmUgdW5zdWJzY3JpYmVkIGl0IHdpbGxcbiAqIHVuc3Vic2NyaWJlIGZyb20gdGhlIHNvdXJjZSBPYnNlcnZhYmxlLiBCZWNhdXNlIHRoZSBPYnNlcnZhYmxlIGlzIG11bHRpY2FzdGluZyBpdCBtYWtlcyB0aGUgc3RyZWFtIGBob3RgLlxuICogVGhpcyBpcyBhbiBhbGlhcyBmb3IgLnB1Ymxpc2goKS5yZWZDb3VudCgpLlxuICpcbiAqIDxpbWcgc3JjPVwiLi9pbWcvc2hhcmUucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gKlxuICogQHJldHVybiB7T2JzZXJ2YWJsZTxUPn0gYW4gT2JzZXJ2YWJsZSB0aGF0IHVwb24gY29ubmVjdGlvbiBjYXVzZXMgdGhlIHNvdXJjZSBPYnNlcnZhYmxlIHRvIGVtaXQgaXRlbXMgdG8gaXRzIE9ic2VydmVyc1xuICogQG1ldGhvZCBzaGFyZVxuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gc2hhcmUoKSB7XG4gICAgcmV0dXJuIG11bHRpY2FzdF8xLm11bHRpY2FzdC5jYWxsKHRoaXMsIHNoYXJlU3ViamVjdEZhY3RvcnkpLnJlZkNvdW50KCk7XG59XG5leHBvcnRzLnNoYXJlID0gc2hhcmU7XG47XG4vLyMgc291cmNlTWFwcGluZ1VSTD1zaGFyZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBBcnJheU9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uL29ic2VydmFibGUvQXJyYXlPYnNlcnZhYmxlJyk7XG52YXIgU2NhbGFyT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vb2JzZXJ2YWJsZS9TY2FsYXJPYnNlcnZhYmxlJyk7XG52YXIgRW1wdHlPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi9vYnNlcnZhYmxlL0VtcHR5T2JzZXJ2YWJsZScpO1xudmFyIGNvbmNhdF8xID0gcmVxdWlyZSgnLi9jb25jYXQnKTtcbnZhciBpc1NjaGVkdWxlcl8xID0gcmVxdWlyZSgnLi4vdXRpbC9pc1NjaGVkdWxlcicpO1xuLyoqXG4gKiBSZXR1cm5zIGFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyB0aGUgaXRlbXMgaW4gYSBzcGVjaWZpZWQgSXRlcmFibGUgYmVmb3JlIGl0IGJlZ2lucyB0byBlbWl0IGl0ZW1zIGVtaXR0ZWQgYnkgdGhlXG4gKiBzb3VyY2UgT2JzZXJ2YWJsZS5cbiAqXG4gKiA8aW1nIHNyYz1cIi4vaW1nL3N0YXJ0V2l0aC5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAqXG4gKiBAcGFyYW0ge1ZhbHVlc30gYW4gSXRlcmFibGUgdGhhdCBjb250YWlucyB0aGUgaXRlbXMgeW91IHdhbnQgdGhlIG1vZGlmaWVkIE9ic2VydmFibGUgdG8gZW1pdCBmaXJzdC5cbiAqIEByZXR1cm4ge09ic2VydmFibGV9IGFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyB0aGUgaXRlbXMgaW4gdGhlIHNwZWNpZmllZCBJdGVyYWJsZSBhbmQgdGhlbiBlbWl0cyB0aGUgaXRlbXNcbiAqIGVtaXR0ZWQgYnkgdGhlIHNvdXJjZSBPYnNlcnZhYmxlLlxuICogQG1ldGhvZCBzdGFydFdpdGhcbiAqIEBvd25lciBPYnNlcnZhYmxlXG4gKi9cbmZ1bmN0aW9uIHN0YXJ0V2l0aCgpIHtcbiAgICB2YXIgYXJyYXkgPSBbXTtcbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICBhcnJheVtfaSAtIDBdID0gYXJndW1lbnRzW19pXTtcbiAgICB9XG4gICAgdmFyIHNjaGVkdWxlciA9IGFycmF5W2FycmF5Lmxlbmd0aCAtIDFdO1xuICAgIGlmIChpc1NjaGVkdWxlcl8xLmlzU2NoZWR1bGVyKHNjaGVkdWxlcikpIHtcbiAgICAgICAgYXJyYXkucG9wKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzY2hlZHVsZXIgPSBudWxsO1xuICAgIH1cbiAgICB2YXIgbGVuID0gYXJyYXkubGVuZ3RoO1xuICAgIGlmIChsZW4gPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIGNvbmNhdF8xLmNvbmNhdFN0YXRpYyhuZXcgU2NhbGFyT2JzZXJ2YWJsZV8xLlNjYWxhck9ic2VydmFibGUoYXJyYXlbMF0sIHNjaGVkdWxlciksIHRoaXMpO1xuICAgIH1cbiAgICBlbHNlIGlmIChsZW4gPiAxKSB7XG4gICAgICAgIHJldHVybiBjb25jYXRfMS5jb25jYXRTdGF0aWMobmV3IEFycmF5T2JzZXJ2YWJsZV8xLkFycmF5T2JzZXJ2YWJsZShhcnJheSwgc2NoZWR1bGVyKSwgdGhpcyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gY29uY2F0XzEuY29uY2F0U3RhdGljKG5ldyBFbXB0eU9ic2VydmFibGVfMS5FbXB0eU9ic2VydmFibGUoc2NoZWR1bGVyKSwgdGhpcyk7XG4gICAgfVxufVxuZXhwb3J0cy5zdGFydFdpdGggPSBzdGFydFdpdGg7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1zdGFydFdpdGguanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBPdXRlclN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4uL091dGVyU3Vic2NyaWJlcicpO1xudmFyIHN1YnNjcmliZVRvUmVzdWx0XzEgPSByZXF1aXJlKCcuLi91dGlsL3N1YnNjcmliZVRvUmVzdWx0Jyk7XG4vKipcbiAqIFByb2plY3RzIGVhY2ggc291cmNlIHZhbHVlIHRvIGFuIE9ic2VydmFibGUgd2hpY2ggaXMgbWVyZ2VkIGluIHRoZSBvdXRwdXRcbiAqIE9ic2VydmFibGUsIGVtaXR0aW5nIHZhbHVlcyBvbmx5IGZyb20gdGhlIG1vc3QgcmVjZW50bHkgcHJvamVjdGVkIE9ic2VydmFibGUuXG4gKlxuICogPHNwYW4gY2xhc3M9XCJpbmZvcm1hbFwiPk1hcHMgZWFjaCB2YWx1ZSB0byBhbiBPYnNlcnZhYmxlLCB0aGVuIGZsYXR0ZW5zIGFsbCBvZlxuICogdGhlc2UgaW5uZXIgT2JzZXJ2YWJsZXMgdXNpbmcge0BsaW5rIHN3aXRjaH0uPC9zcGFuPlxuICpcbiAqIDxpbWcgc3JjPVwiLi9pbWcvc3dpdGNoTWFwLnBuZ1wiIHdpZHRoPVwiMTAwJVwiPlxuICpcbiAqIFJldHVybnMgYW4gT2JzZXJ2YWJsZSB0aGF0IGVtaXRzIGl0ZW1zIGJhc2VkIG9uIGFwcGx5aW5nIGEgZnVuY3Rpb24gdGhhdCB5b3VcbiAqIHN1cHBseSB0byBlYWNoIGl0ZW0gZW1pdHRlZCBieSB0aGUgc291cmNlIE9ic2VydmFibGUsIHdoZXJlIHRoYXQgZnVuY3Rpb25cbiAqIHJldHVybnMgYW4gKHNvLWNhbGxlZCBcImlubmVyXCIpIE9ic2VydmFibGUuIEVhY2ggdGltZSBpdCBvYnNlcnZlcyBvbmUgb2YgdGhlc2VcbiAqIGlubmVyIE9ic2VydmFibGVzLCB0aGUgb3V0cHV0IE9ic2VydmFibGUgYmVnaW5zIGVtaXR0aW5nIHRoZSBpdGVtcyBlbWl0dGVkIGJ5XG4gKiB0aGF0IGlubmVyIE9ic2VydmFibGUuIFdoZW4gYSBuZXcgaW5uZXIgT2JzZXJ2YWJsZSBpcyBlbWl0dGVkLCBgc3dpdGNoTWFwYFxuICogc3RvcHMgZW1pdHRpbmcgaXRlbXMgZnJvbSB0aGUgZWFybGllci1lbWl0dGVkIGlubmVyIE9ic2VydmFibGUgYW5kIGJlZ2luc1xuICogZW1pdHRpbmcgaXRlbXMgZnJvbSB0aGUgbmV3IG9uZS4gSXQgY29udGludWVzIHRvIGJlaGF2ZSBsaWtlIHRoaXMgZm9yXG4gKiBzdWJzZXF1ZW50IGlubmVyIE9ic2VydmFibGVzLlxuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPlJlcnVuIGFuIGludGVydmFsIE9ic2VydmFibGUgb24gZXZlcnkgY2xpY2sgZXZlbnQ8L2NhcHRpb24+XG4gKiB2YXIgY2xpY2tzID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoZG9jdW1lbnQsICdjbGljaycpO1xuICogdmFyIHJlc3VsdCA9IGNsaWNrcy5zd2l0Y2hNYXAoKGV2KSA9PiBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMDApKTtcbiAqIHJlc3VsdC5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gKlxuICogQHNlZSB7QGxpbmsgY29uY2F0TWFwfVxuICogQHNlZSB7QGxpbmsgZXhoYXVzdE1hcH1cbiAqIEBzZWUge0BsaW5rIG1lcmdlTWFwfVxuICogQHNlZSB7QGxpbmsgc3dpdGNofVxuICogQHNlZSB7QGxpbmsgc3dpdGNoTWFwVG99XG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbih2YWx1ZTogVCwgP2luZGV4OiBudW1iZXIpOiBPYnNlcnZhYmxlfSBwcm9qZWN0IEEgZnVuY3Rpb25cbiAqIHRoYXQsIHdoZW4gYXBwbGllZCB0byBhbiBpdGVtIGVtaXR0ZWQgYnkgdGhlIHNvdXJjZSBPYnNlcnZhYmxlLCByZXR1cm5zIGFuXG4gKiBPYnNlcnZhYmxlLlxuICogQHBhcmFtIHtmdW5jdGlvbihvdXRlclZhbHVlOiBULCBpbm5lclZhbHVlOiBJLCBvdXRlckluZGV4OiBudW1iZXIsIGlubmVySW5kZXg6IG51bWJlcik6IGFueX0gW3Jlc3VsdFNlbGVjdG9yXVxuICogQSBmdW5jdGlvbiB0byBwcm9kdWNlIHRoZSB2YWx1ZSBvbiB0aGUgb3V0cHV0IE9ic2VydmFibGUgYmFzZWQgb24gdGhlIHZhbHVlc1xuICogYW5kIHRoZSBpbmRpY2VzIG9mIHRoZSBzb3VyY2UgKG91dGVyKSBlbWlzc2lvbiBhbmQgdGhlIGlubmVyIE9ic2VydmFibGVcbiAqIGVtaXNzaW9uLiBUaGUgYXJndW1lbnRzIHBhc3NlZCB0byB0aGlzIGZ1bmN0aW9uIGFyZTpcbiAqIC0gYG91dGVyVmFsdWVgOiB0aGUgdmFsdWUgdGhhdCBjYW1lIGZyb20gdGhlIHNvdXJjZVxuICogLSBgaW5uZXJWYWx1ZWA6IHRoZSB2YWx1ZSB0aGF0IGNhbWUgZnJvbSB0aGUgcHJvamVjdGVkIE9ic2VydmFibGVcbiAqIC0gYG91dGVySW5kZXhgOiB0aGUgXCJpbmRleFwiIG9mIHRoZSB2YWx1ZSB0aGF0IGNhbWUgZnJvbSB0aGUgc291cmNlXG4gKiAtIGBpbm5lckluZGV4YDogdGhlIFwiaW5kZXhcIiBvZiB0aGUgdmFsdWUgZnJvbSB0aGUgcHJvamVjdGVkIE9ic2VydmFibGVcbiAqIEByZXR1cm4ge09ic2VydmFibGV9IEFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyB0aGUgcmVzdWx0IG9mIGFwcGx5aW5nIHRoZVxuICogcHJvamVjdGlvbiBmdW5jdGlvbiAoYW5kIHRoZSBvcHRpb25hbCBgcmVzdWx0U2VsZWN0b3JgKSB0byBlYWNoIGl0ZW0gZW1pdHRlZFxuICogYnkgdGhlIHNvdXJjZSBPYnNlcnZhYmxlIGFuZCB0YWtpbmcgb25seSB0aGUgdmFsdWVzIGZyb20gdGhlIG1vc3QgcmVjZW50bHlcbiAqIHByb2plY3RlZCBpbm5lciBPYnNlcnZhYmxlLlxuICogQG1ldGhvZCBzd2l0Y2hNYXBcbiAqIEBvd25lciBPYnNlcnZhYmxlXG4gKi9cbmZ1bmN0aW9uIHN3aXRjaE1hcChwcm9qZWN0LCByZXN1bHRTZWxlY3Rvcikge1xuICAgIHJldHVybiB0aGlzLmxpZnQobmV3IFN3aXRjaE1hcE9wZXJhdG9yKHByb2plY3QsIHJlc3VsdFNlbGVjdG9yKSk7XG59XG5leHBvcnRzLnN3aXRjaE1hcCA9IHN3aXRjaE1hcDtcbnZhciBTd2l0Y2hNYXBPcGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU3dpdGNoTWFwT3BlcmF0b3IocHJvamVjdCwgcmVzdWx0U2VsZWN0b3IpIHtcbiAgICAgICAgdGhpcy5wcm9qZWN0ID0gcHJvamVjdDtcbiAgICAgICAgdGhpcy5yZXN1bHRTZWxlY3RvciA9IHJlc3VsdFNlbGVjdG9yO1xuICAgIH1cbiAgICBTd2l0Y2hNYXBPcGVyYXRvci5wcm90b3R5cGUuY2FsbCA9IGZ1bmN0aW9uIChzdWJzY3JpYmVyLCBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5fc3Vic2NyaWJlKG5ldyBTd2l0Y2hNYXBTdWJzY3JpYmVyKHN1YnNjcmliZXIsIHRoaXMucHJvamVjdCwgdGhpcy5yZXN1bHRTZWxlY3RvcikpO1xuICAgIH07XG4gICAgcmV0dXJuIFN3aXRjaE1hcE9wZXJhdG9yO1xufSgpKTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgU3dpdGNoTWFwU3Vic2NyaWJlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFN3aXRjaE1hcFN1YnNjcmliZXIsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gU3dpdGNoTWFwU3Vic2NyaWJlcihkZXN0aW5hdGlvbiwgcHJvamVjdCwgcmVzdWx0U2VsZWN0b3IpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVzdGluYXRpb24pO1xuICAgICAgICB0aGlzLnByb2plY3QgPSBwcm9qZWN0O1xuICAgICAgICB0aGlzLnJlc3VsdFNlbGVjdG9yID0gcmVzdWx0U2VsZWN0b3I7XG4gICAgICAgIHRoaXMuaW5kZXggPSAwO1xuICAgIH1cbiAgICBTd2l0Y2hNYXBTdWJzY3JpYmVyLnByb3RvdHlwZS5fbmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLmluZGV4Kys7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXN1bHQgPSB0aGlzLnByb2plY3QodmFsdWUsIGluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24uZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2lubmVyU3ViKHJlc3VsdCwgdmFsdWUsIGluZGV4KTtcbiAgICB9O1xuICAgIFN3aXRjaE1hcFN1YnNjcmliZXIucHJvdG90eXBlLl9pbm5lclN1YiA9IGZ1bmN0aW9uIChyZXN1bHQsIHZhbHVlLCBpbmRleCkge1xuICAgICAgICB2YXIgaW5uZXJTdWJzY3JpcHRpb24gPSB0aGlzLmlubmVyU3Vic2NyaXB0aW9uO1xuICAgICAgICBpZiAoaW5uZXJTdWJzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGlubmVyU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGQodGhpcy5pbm5lclN1YnNjcmlwdGlvbiA9IHN1YnNjcmliZVRvUmVzdWx0XzEuc3Vic2NyaWJlVG9SZXN1bHQodGhpcywgcmVzdWx0LCB2YWx1ZSwgaW5kZXgpKTtcbiAgICB9O1xuICAgIFN3aXRjaE1hcFN1YnNjcmliZXIucHJvdG90eXBlLl9jb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGlubmVyU3Vic2NyaXB0aW9uID0gdGhpcy5pbm5lclN1YnNjcmlwdGlvbjtcbiAgICAgICAgaWYgKCFpbm5lclN1YnNjcmlwdGlvbiB8fCBpbm5lclN1YnNjcmlwdGlvbi5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5fY29tcGxldGUuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgU3dpdGNoTWFwU3Vic2NyaWJlci5wcm90b3R5cGUuX3Vuc3Vic2NyaWJlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmlubmVyU3Vic2NyaXB0aW9uID0gbnVsbDtcbiAgICB9O1xuICAgIFN3aXRjaE1hcFN1YnNjcmliZXIucHJvdG90eXBlLm5vdGlmeUNvbXBsZXRlID0gZnVuY3Rpb24gKGlubmVyU3ViKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKGlubmVyU3ViKTtcbiAgICAgICAgdGhpcy5pbm5lclN1YnNjcmlwdGlvbiA9IG51bGw7XG4gICAgICAgIGlmICh0aGlzLmlzU3RvcHBlZCkge1xuICAgICAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5fY29tcGxldGUuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgU3dpdGNoTWFwU3Vic2NyaWJlci5wcm90b3R5cGUubm90aWZ5TmV4dCA9IGZ1bmN0aW9uIChvdXRlclZhbHVlLCBpbm5lclZhbHVlLCBvdXRlckluZGV4LCBpbm5lckluZGV4LCBpbm5lclN1Yikge1xuICAgICAgICBpZiAodGhpcy5yZXN1bHRTZWxlY3Rvcikge1xuICAgICAgICAgICAgdGhpcy5fdHJ5Tm90aWZ5TmV4dChvdXRlclZhbHVlLCBpbm5lclZhbHVlLCBvdXRlckluZGV4LCBpbm5lckluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24ubmV4dChpbm5lclZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgU3dpdGNoTWFwU3Vic2NyaWJlci5wcm90b3R5cGUuX3RyeU5vdGlmeU5leHQgPSBmdW5jdGlvbiAob3V0ZXJWYWx1ZSwgaW5uZXJWYWx1ZSwgb3V0ZXJJbmRleCwgaW5uZXJJbmRleCkge1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5yZXN1bHRTZWxlY3RvcihvdXRlclZhbHVlLCBpbm5lclZhbHVlLCBvdXRlckluZGV4LCBpbm5lckluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmVycm9yKGVycik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5uZXh0KHJlc3VsdCk7XG4gICAgfTtcbiAgICByZXR1cm4gU3dpdGNoTWFwU3Vic2NyaWJlcjtcbn0oT3V0ZXJTdWJzY3JpYmVyXzEuT3V0ZXJTdWJzY3JpYmVyKSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1zd2l0Y2hNYXAuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBPdXRlclN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4uL091dGVyU3Vic2NyaWJlcicpO1xudmFyIHN1YnNjcmliZVRvUmVzdWx0XzEgPSByZXF1aXJlKCcuLi91dGlsL3N1YnNjcmliZVRvUmVzdWx0Jyk7XG4vKipcbiAqIENvbWJpbmVzIHRoZSBzb3VyY2UgT2JzZXJ2YWJsZSB3aXRoIG90aGVyIE9ic2VydmFibGVzIHRvIGNyZWF0ZSBhbiBPYnNlcnZhYmxlXG4gKiB3aG9zZSB2YWx1ZXMgYXJlIGNhbGN1bGF0ZWQgZnJvbSB0aGUgbGF0ZXN0IHZhbHVlcyBvZiBlYWNoLCBvbmx5IHdoZW4gdGhlXG4gKiBzb3VyY2UgZW1pdHMuXG4gKlxuICogPHNwYW4gY2xhc3M9XCJpbmZvcm1hbFwiPldoZW5ldmVyIHRoZSBzb3VyY2UgT2JzZXJ2YWJsZSBlbWl0cyBhIHZhbHVlLCBpdFxuICogY29tcHV0ZXMgYSBmb3JtdWxhIHVzaW5nIHRoYXQgdmFsdWUgcGx1cyB0aGUgbGF0ZXN0IHZhbHVlcyBmcm9tIG90aGVyIGlucHV0XG4gKiBPYnNlcnZhYmxlcywgdGhlbiBlbWl0cyB0aGUgb3V0cHV0IG9mIHRoYXQgZm9ybXVsYS48L3NwYW4+XG4gKlxuICogPGltZyBzcmM9XCIuL2ltZy93aXRoTGF0ZXN0RnJvbS5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAqXG4gKiBgd2l0aExhdGVzdEZyb21gIGNvbWJpbmVzIGVhY2ggdmFsdWUgZnJvbSB0aGUgc291cmNlIE9ic2VydmFibGUgKHRoZVxuICogaW5zdGFuY2UpIHdpdGggdGhlIGxhdGVzdCB2YWx1ZXMgZnJvbSB0aGUgb3RoZXIgaW5wdXQgT2JzZXJ2YWJsZXMgb25seSB3aGVuXG4gKiB0aGUgc291cmNlIGVtaXRzIGEgdmFsdWUsIG9wdGlvbmFsbHkgdXNpbmcgYSBgcHJvamVjdGAgZnVuY3Rpb24gdG8gZGV0ZXJtaW5lXG4gKiB0aGUgdmFsdWUgdG8gYmUgZW1pdHRlZCBvbiB0aGUgb3V0cHV0IE9ic2VydmFibGUuIEFsbCBpbnB1dCBPYnNlcnZhYmxlcyBtdXN0XG4gKiBlbWl0IGF0IGxlYXN0IG9uZSB2YWx1ZSBiZWZvcmUgdGhlIG91dHB1dCBPYnNlcnZhYmxlIHdpbGwgZW1pdCBhIHZhbHVlLlxuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPk9uIGV2ZXJ5IGNsaWNrIGV2ZW50LCBlbWl0IGFuIGFycmF5IHdpdGggdGhlIGxhdGVzdCB0aW1lciBldmVudCBwbHVzIHRoZSBjbGljayBldmVudDwvY2FwdGlvbj5cbiAqIHZhciBjbGlja3MgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChkb2N1bWVudCwgJ2NsaWNrJyk7XG4gKiB2YXIgdGltZXIgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMDApO1xuICogdmFyIHJlc3VsdCA9IGNsaWNrcy53aXRoTGF0ZXN0RnJvbSh0aW1lcik7XG4gKiByZXN1bHQuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICpcbiAqIEBzZWUge0BsaW5rIGNvbWJpbmVMYXRlc3R9XG4gKlxuICogQHBhcmFtIHtPYnNlcnZhYmxlfSBvdGhlciBBbiBpbnB1dCBPYnNlcnZhYmxlIHRvIGNvbWJpbmUgd2l0aCB0aGUgc291cmNlXG4gKiBPYnNlcnZhYmxlLiBNb3JlIHRoYW4gb25lIGlucHV0IE9ic2VydmFibGVzIG1heSBiZSBnaXZlbiBhcyBhcmd1bWVudC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtwcm9qZWN0XSBQcm9qZWN0aW9uIGZ1bmN0aW9uIGZvciBjb21iaW5pbmcgdmFsdWVzXG4gKiB0b2dldGhlci4gUmVjZWl2ZXMgYWxsIHZhbHVlcyBpbiBvcmRlciBvZiB0aGUgT2JzZXJ2YWJsZXMgcGFzc2VkLCB3aGVyZSB0aGVcbiAqIGZpcnN0IHBhcmFtZXRlciBpcyBhIHZhbHVlIGZyb20gdGhlIHNvdXJjZSBPYnNlcnZhYmxlLiAoZS5nLlxuICogYGEud2l0aExhdGVzdEZyb20oYiwgYywgKGExLCBiMSwgYzEpID0+IGExICsgYjEgKyBjMSlgKS4gSWYgdGhpcyBpcyBub3RcbiAqIHBhc3NlZCwgYXJyYXlzIHdpbGwgYmUgZW1pdHRlZCBvbiB0aGUgb3V0cHV0IE9ic2VydmFibGUuXG4gKiBAcmV0dXJuIHtPYnNlcnZhYmxlfSBBbiBPYnNlcnZhYmxlIG9mIHByb2plY3RlZCB2YWx1ZXMgZnJvbSB0aGUgbW9zdCByZWNlbnRcbiAqIHZhbHVlcyBmcm9tIGVhY2ggaW5wdXQgT2JzZXJ2YWJsZSwgb3IgYW4gYXJyYXkgb2YgdGhlIG1vc3QgcmVjZW50IHZhbHVlcyBmcm9tXG4gKiBlYWNoIGlucHV0IE9ic2VydmFibGUuXG4gKiBAbWV0aG9kIHdpdGhMYXRlc3RGcm9tXG4gKiBAb3duZXIgT2JzZXJ2YWJsZVxuICovXG5mdW5jdGlvbiB3aXRoTGF0ZXN0RnJvbSgpIHtcbiAgICB2YXIgYXJncyA9IFtdO1xuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgIGFyZ3NbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgfVxuICAgIHZhciBwcm9qZWN0O1xuICAgIGlmICh0eXBlb2YgYXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHByb2plY3QgPSBhcmdzLnBvcCgpO1xuICAgIH1cbiAgICB2YXIgb2JzZXJ2YWJsZXMgPSBhcmdzO1xuICAgIHJldHVybiB0aGlzLmxpZnQobmV3IFdpdGhMYXRlc3RGcm9tT3BlcmF0b3Iob2JzZXJ2YWJsZXMsIHByb2plY3QpKTtcbn1cbmV4cG9ydHMud2l0aExhdGVzdEZyb20gPSB3aXRoTGF0ZXN0RnJvbTtcbi8qIHRzbGludDplbmFibGU6bWF4LWxpbmUtbGVuZ3RoICovXG52YXIgV2l0aExhdGVzdEZyb21PcGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gV2l0aExhdGVzdEZyb21PcGVyYXRvcihvYnNlcnZhYmxlcywgcHJvamVjdCkge1xuICAgICAgICB0aGlzLm9ic2VydmFibGVzID0gb2JzZXJ2YWJsZXM7XG4gICAgICAgIHRoaXMucHJvamVjdCA9IHByb2plY3Q7XG4gICAgfVxuICAgIFdpdGhMYXRlc3RGcm9tT3BlcmF0b3IucHJvdG90eXBlLmNhbGwgPSBmdW5jdGlvbiAoc3Vic2NyaWJlciwgc291cmNlKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2UuX3N1YnNjcmliZShuZXcgV2l0aExhdGVzdEZyb21TdWJzY3JpYmVyKHN1YnNjcmliZXIsIHRoaXMub2JzZXJ2YWJsZXMsIHRoaXMucHJvamVjdCkpO1xuICAgIH07XG4gICAgcmV0dXJuIFdpdGhMYXRlc3RGcm9tT3BlcmF0b3I7XG59KCkpO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBXaXRoTGF0ZXN0RnJvbVN1YnNjcmliZXIgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhXaXRoTGF0ZXN0RnJvbVN1YnNjcmliZXIsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gV2l0aExhdGVzdEZyb21TdWJzY3JpYmVyKGRlc3RpbmF0aW9uLCBvYnNlcnZhYmxlcywgcHJvamVjdCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZXN0aW5hdGlvbik7XG4gICAgICAgIHRoaXMub2JzZXJ2YWJsZXMgPSBvYnNlcnZhYmxlcztcbiAgICAgICAgdGhpcy5wcm9qZWN0ID0gcHJvamVjdDtcbiAgICAgICAgdGhpcy50b1Jlc3BvbmQgPSBbXTtcbiAgICAgICAgdmFyIGxlbiA9IG9ic2VydmFibGVzLmxlbmd0aDtcbiAgICAgICAgdGhpcy52YWx1ZXMgPSBuZXcgQXJyYXkobGVuKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgdGhpcy50b1Jlc3BvbmQucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgb2JzZXJ2YWJsZSA9IG9ic2VydmFibGVzW2ldO1xuICAgICAgICAgICAgdGhpcy5hZGQoc3Vic2NyaWJlVG9SZXN1bHRfMS5zdWJzY3JpYmVUb1Jlc3VsdCh0aGlzLCBvYnNlcnZhYmxlLCBvYnNlcnZhYmxlLCBpKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgV2l0aExhdGVzdEZyb21TdWJzY3JpYmVyLnByb3RvdHlwZS5ub3RpZnlOZXh0ID0gZnVuY3Rpb24gKG91dGVyVmFsdWUsIGlubmVyVmFsdWUsIG91dGVySW5kZXgsIGlubmVySW5kZXgsIGlubmVyU3ViKSB7XG4gICAgICAgIHRoaXMudmFsdWVzW291dGVySW5kZXhdID0gaW5uZXJWYWx1ZTtcbiAgICAgICAgdmFyIHRvUmVzcG9uZCA9IHRoaXMudG9SZXNwb25kO1xuICAgICAgICBpZiAodG9SZXNwb25kLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBmb3VuZCA9IHRvUmVzcG9uZC5pbmRleE9mKG91dGVySW5kZXgpO1xuICAgICAgICAgICAgaWYgKGZvdW5kICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHRvUmVzcG9uZC5zcGxpY2UoZm91bmQsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBXaXRoTGF0ZXN0RnJvbVN1YnNjcmliZXIucHJvdG90eXBlLm5vdGlmeUNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBub29wXG4gICAgfTtcbiAgICBXaXRoTGF0ZXN0RnJvbVN1YnNjcmliZXIucHJvdG90eXBlLl9uZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmICh0aGlzLnRvUmVzcG9uZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gW3ZhbHVlXS5jb25jYXQodGhpcy52YWx1ZXMpO1xuICAgICAgICAgICAgaWYgKHRoaXMucHJvamVjdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3RyeVByb2plY3QoYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLm5leHQoYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFdpdGhMYXRlc3RGcm9tU3Vic2NyaWJlci5wcm90b3R5cGUuX3RyeVByb2plY3QgPSBmdW5jdGlvbiAoYXJncykge1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5wcm9qZWN0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24uZXJyb3IoZXJyKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLm5leHQocmVzdWx0KTtcbiAgICB9O1xuICAgIHJldHVybiBXaXRoTGF0ZXN0RnJvbVN1YnNjcmliZXI7XG59KE91dGVyU3Vic2NyaWJlcl8xLk91dGVyU3Vic2NyaWJlcikpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9d2l0aExhdGVzdEZyb20uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgcm9vdF8xID0gcmVxdWlyZSgnLi4vdXRpbC9yb290Jyk7XG52YXIgU3ltYm9sID0gcm9vdF8xLnJvb3QuU3ltYm9sO1xuaWYgKHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicpIHtcbiAgICBpZiAoU3ltYm9sLml0ZXJhdG9yKSB7XG4gICAgICAgIGV4cG9ydHMuJCRpdGVyYXRvciA9IFN5bWJvbC5pdGVyYXRvcjtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIFN5bWJvbC5mb3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZXhwb3J0cy4kJGl0ZXJhdG9yID0gU3ltYm9sLmZvcignaXRlcmF0b3InKTtcbiAgICB9XG59XG5lbHNlIHtcbiAgICBpZiAocm9vdF8xLnJvb3QuU2V0ICYmIHR5cGVvZiBuZXcgcm9vdF8xLnJvb3QuU2V0KClbJ0BAaXRlcmF0b3InXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBCdWcgZm9yIG1vemlsbGEgdmVyc2lvblxuICAgICAgICBleHBvcnRzLiQkaXRlcmF0b3IgPSAnQEBpdGVyYXRvcic7XG4gICAgfVxuICAgIGVsc2UgaWYgKHJvb3RfMS5yb290Lk1hcCkge1xuICAgICAgICAvLyBlczYtc2hpbSBzcGVjaWZpYyBsb2dpY1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHJvb3RfMS5yb290Lk1hcC5wcm90b3R5cGUpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgICAgaWYgKGtleSAhPT0gJ2VudHJpZXMnICYmIGtleSAhPT0gJ3NpemUnICYmIHJvb3RfMS5yb290Lk1hcC5wcm90b3R5cGVba2V5XSA9PT0gcm9vdF8xLnJvb3QuTWFwLnByb3RvdHlwZVsnZW50cmllcyddKSB7XG4gICAgICAgICAgICAgICAgZXhwb3J0cy4kJGl0ZXJhdG9yID0ga2V5O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBleHBvcnRzLiQkaXRlcmF0b3IgPSAnQEBpdGVyYXRvcic7XG4gICAgfVxufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aXRlcmF0b3IuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgcm9vdF8xID0gcmVxdWlyZSgnLi4vdXRpbC9yb290Jyk7XG52YXIgU3ltYm9sID0gcm9vdF8xLnJvb3QuU3ltYm9sO1xuaWYgKHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicpIHtcbiAgICBpZiAoU3ltYm9sLm9ic2VydmFibGUpIHtcbiAgICAgICAgZXhwb3J0cy4kJG9ic2VydmFibGUgPSBTeW1ib2wub2JzZXJ2YWJsZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmICh0eXBlb2YgU3ltYm9sLmZvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgZXhwb3J0cy4kJG9ic2VydmFibGUgPSBTeW1ib2wuZm9yKCdvYnNlcnZhYmxlJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBleHBvcnRzLiQkb2JzZXJ2YWJsZSA9IFN5bWJvbCgnb2JzZXJ2YWJsZScpO1xuICAgICAgICB9XG4gICAgICAgIFN5bWJvbC5vYnNlcnZhYmxlID0gZXhwb3J0cy4kJG9ic2VydmFibGU7XG4gICAgfVxufVxuZWxzZSB7XG4gICAgZXhwb3J0cy4kJG9ic2VydmFibGUgPSAnQEBvYnNlcnZhYmxlJztcbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW9ic2VydmFibGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgcm9vdF8xID0gcmVxdWlyZSgnLi4vdXRpbC9yb290Jyk7XG52YXIgU3ltYm9sID0gcm9vdF8xLnJvb3QuU3ltYm9sO1xuZXhwb3J0cy4kJHJ4U3Vic2NyaWJlciA9ICh0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBTeW1ib2wuZm9yID09PSAnZnVuY3Rpb24nKSA/XG4gICAgU3ltYm9sLmZvcigncnhTdWJzY3JpYmVyJykgOiAnQEByeFN1YnNjcmliZXInO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cnhTdWJzY3JpYmVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG4vKipcbiAqIEFuIGVycm9yIHRocm93biB3aGVuIGFuIGFjdGlvbiBpcyBpbnZhbGlkIGJlY2F1c2UgdGhlIG9iamVjdCBoYXMgYmVlblxuICogdW5zdWJzY3JpYmVkLlxuICpcbiAqIEBzZWUge0BsaW5rIFN1YmplY3R9XG4gKiBAc2VlIHtAbGluayBCZWhhdmlvclN1YmplY3R9XG4gKlxuICogQGNsYXNzIE9iamVjdFVuc3Vic2NyaWJlZEVycm9yXG4gKi9cbnZhciBPYmplY3RVbnN1YnNjcmliZWRFcnJvciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE9iamVjdFVuc3Vic2NyaWJlZEVycm9yLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE9iamVjdFVuc3Vic2NyaWJlZEVycm9yKCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCAnb2JqZWN0IHVuc3Vic2NyaWJlZCcpO1xuICAgICAgICB0aGlzLm5hbWUgPSAnT2JqZWN0VW5zdWJzY3JpYmVkRXJyb3InO1xuICAgIH1cbiAgICByZXR1cm4gT2JqZWN0VW5zdWJzY3JpYmVkRXJyb3I7XG59KEVycm9yKSk7XG5leHBvcnRzLk9iamVjdFVuc3Vic2NyaWJlZEVycm9yID0gT2JqZWN0VW5zdWJzY3JpYmVkRXJyb3I7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1PYmplY3RVbnN1YnNjcmliZWRFcnJvci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xuLyoqXG4gKiBBbiBlcnJvciB0aHJvd24gd2hlbiBvbmUgb3IgbW9yZSBlcnJvcnMgaGF2ZSBvY2N1cnJlZCBkdXJpbmcgdGhlXG4gKiBgdW5zdWJzY3JpYmVgIG9mIGEge0BsaW5rIFN1YnNjcmlwdGlvbn0uXG4gKi9cbnZhciBVbnN1YnNjcmlwdGlvbkVycm9yID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoVW5zdWJzY3JpcHRpb25FcnJvciwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBVbnN1YnNjcmlwdGlvbkVycm9yKGVycm9ycykge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5lcnJvcnMgPSBlcnJvcnM7XG4gICAgICAgIHRoaXMubmFtZSA9ICdVbnN1YnNjcmlwdGlvbkVycm9yJztcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gZXJyb3JzID8gZXJyb3JzLmxlbmd0aCArIFwiIGVycm9ycyBvY2N1cnJlZCBkdXJpbmcgdW5zdWJzY3JpcHRpb246XFxuXCIgKyBlcnJvcnMubWFwKGZ1bmN0aW9uIChlcnIsIGkpIHsgcmV0dXJuICgoaSArIDEpICsgXCIpIFwiICsgZXJyLnRvU3RyaW5nKCkpOyB9KS5qb2luKCdcXG4nKSA6ICcnO1xuICAgIH1cbiAgICByZXR1cm4gVW5zdWJzY3JpcHRpb25FcnJvcjtcbn0oRXJyb3IpKTtcbmV4cG9ydHMuVW5zdWJzY3JpcHRpb25FcnJvciA9IFVuc3Vic2NyaXB0aW9uRXJyb3I7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1VbnN1YnNjcmlwdGlvbkVycm9yLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuLy8gdHlwZW9mIGFueSBzbyB0aGF0IGl0IHdlIGRvbid0IGhhdmUgdG8gY2FzdCB3aGVuIGNvbXBhcmluZyBhIHJlc3VsdCB0byB0aGUgZXJyb3Igb2JqZWN0XG5leHBvcnRzLmVycm9yT2JqZWN0ID0geyBlOiB7fSB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZXJyb3JPYmplY3QuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5leHBvcnRzLmlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IChmdW5jdGlvbiAoeCkgeyByZXR1cm4geCAmJiB0eXBlb2YgeC5sZW5ndGggPT09ICdudW1iZXInOyB9KTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWlzQXJyYXkuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aXNGdW5jdGlvbi5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbmZ1bmN0aW9uIGlzT2JqZWN0KHgpIHtcbiAgICByZXR1cm4geCAhPSBudWxsICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0Jztcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWlzT2JqZWN0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuZnVuY3Rpb24gaXNQcm9taXNlKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZS5zdWJzY3JpYmUgIT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHZhbHVlLnRoZW4gPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzUHJvbWlzZSA9IGlzUHJvbWlzZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWlzUHJvbWlzZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbmZ1bmN0aW9uIGlzU2NoZWR1bGVyKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZS5zY2hlZHVsZSA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNTY2hlZHVsZXIgPSBpc1NjaGVkdWxlcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWlzU2NoZWR1bGVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIG9iamVjdFR5cGVzID0ge1xuICAgICdib29sZWFuJzogZmFsc2UsXG4gICAgJ2Z1bmN0aW9uJzogdHJ1ZSxcbiAgICAnb2JqZWN0JzogdHJ1ZSxcbiAgICAnbnVtYmVyJzogZmFsc2UsXG4gICAgJ3N0cmluZyc6IGZhbHNlLFxuICAgICd1bmRlZmluZWQnOiBmYWxzZVxufTtcbmV4cG9ydHMucm9vdCA9IChvYmplY3RUeXBlc1t0eXBlb2Ygc2VsZl0gJiYgc2VsZikgfHwgKG9iamVjdFR5cGVzW3R5cGVvZiB3aW5kb3ddICYmIHdpbmRvdyk7XG4vKiB0c2xpbnQ6ZGlzYWJsZTpuby11bnVzZWQtdmFyaWFibGUgKi9cbnZhciBmcmVlRXhwb3J0cyA9IG9iamVjdFR5cGVzW3R5cGVvZiBleHBvcnRzXSAmJiBleHBvcnRzICYmICFleHBvcnRzLm5vZGVUeXBlICYmIGV4cG9ydHM7XG52YXIgZnJlZU1vZHVsZSA9IG9iamVjdFR5cGVzW3R5cGVvZiBtb2R1bGVdICYmIG1vZHVsZSAmJiAhbW9kdWxlLm5vZGVUeXBlICYmIG1vZHVsZTtcbnZhciBmcmVlR2xvYmFsID0gb2JqZWN0VHlwZXNbdHlwZW9mIGdsb2JhbF0gJiYgZ2xvYmFsO1xuaWYgKGZyZWVHbG9iYWwgJiYgKGZyZWVHbG9iYWwuZ2xvYmFsID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWwud2luZG93ID09PSBmcmVlR2xvYmFsKSkge1xuICAgIGV4cG9ydHMucm9vdCA9IGZyZWVHbG9iYWw7XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1yb290LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIHJvb3RfMSA9IHJlcXVpcmUoJy4vcm9vdCcpO1xudmFyIGlzQXJyYXlfMSA9IHJlcXVpcmUoJy4vaXNBcnJheScpO1xudmFyIGlzUHJvbWlzZV8xID0gcmVxdWlyZSgnLi9pc1Byb21pc2UnKTtcbnZhciBPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi9PYnNlcnZhYmxlJyk7XG52YXIgaXRlcmF0b3JfMSA9IHJlcXVpcmUoJy4uL3N5bWJvbC9pdGVyYXRvcicpO1xudmFyIG9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uL3N5bWJvbC9vYnNlcnZhYmxlJyk7XG52YXIgSW5uZXJTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuLi9Jbm5lclN1YnNjcmliZXInKTtcbmZ1bmN0aW9uIHN1YnNjcmliZVRvUmVzdWx0KG91dGVyU3Vic2NyaWJlciwgcmVzdWx0LCBvdXRlclZhbHVlLCBvdXRlckluZGV4KSB7XG4gICAgdmFyIGRlc3RpbmF0aW9uID0gbmV3IElubmVyU3Vic2NyaWJlcl8xLklubmVyU3Vic2NyaWJlcihvdXRlclN1YnNjcmliZXIsIG91dGVyVmFsdWUsIG91dGVySW5kZXgpO1xuICAgIGlmIChkZXN0aW5hdGlvbi5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBPYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZSkge1xuICAgICAgICBpZiAocmVzdWx0Ll9pc1NjYWxhcikge1xuICAgICAgICAgICAgZGVzdGluYXRpb24ubmV4dChyZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgZGVzdGluYXRpb24uY29tcGxldGUoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQuc3Vic2NyaWJlKGRlc3RpbmF0aW9uKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXNBcnJheV8xLmlzQXJyYXkocmVzdWx0KSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcmVzdWx0Lmxlbmd0aDsgaSA8IGxlbiAmJiAhZGVzdGluYXRpb24uaXNVbnN1YnNjcmliZWQ7IGkrKykge1xuICAgICAgICAgICAgZGVzdGluYXRpb24ubmV4dChyZXN1bHRbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZGVzdGluYXRpb24uaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uLmNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoaXNQcm9taXNlXzEuaXNQcm9taXNlKHJlc3VsdCkpIHtcbiAgICAgICAgcmVzdWx0LnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoIWRlc3RpbmF0aW9uLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICAgICAgZGVzdGluYXRpb24ubmV4dCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgZGVzdGluYXRpb24uY29tcGxldGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikgeyByZXR1cm4gZGVzdGluYXRpb24uZXJyb3IoZXJyKTsgfSlcbiAgICAgICAgICAgIC50aGVuKG51bGwsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIC8vIEVzY2FwaW5nIHRoZSBQcm9taXNlIHRyYXA6IGdsb2JhbGx5IHRocm93IHVuaGFuZGxlZCBlcnJvcnNcbiAgICAgICAgICAgIHJvb3RfMS5yb290LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyB0aHJvdyBlcnI7IH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGRlc3RpbmF0aW9uO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgcmVzdWx0W2l0ZXJhdG9yXzEuJCRpdGVyYXRvcl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwLCBfYSA9IHJlc3VsdDsgX2kgPCBfYS5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIHZhciBpdGVtID0gX2FbX2ldO1xuICAgICAgICAgICAgZGVzdGluYXRpb24ubmV4dChpdGVtKTtcbiAgICAgICAgICAgIGlmIChkZXN0aW5hdGlvbi5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghZGVzdGluYXRpb24uaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uLmNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIHJlc3VsdFtvYnNlcnZhYmxlXzEuJCRvYnNlcnZhYmxlXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB2YXIgb2JzID0gcmVzdWx0W29ic2VydmFibGVfMS4kJG9ic2VydmFibGVdKCk7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JzLnN1YnNjcmliZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgZGVzdGluYXRpb24uZXJyb3IoJ2ludmFsaWQgb2JzZXJ2YWJsZScpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG9icy5zdWJzY3JpYmUobmV3IElubmVyU3Vic2NyaWJlcl8xLklubmVyU3Vic2NyaWJlcihvdXRlclN1YnNjcmliZXIsIG91dGVyVmFsdWUsIG91dGVySW5kZXgpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZGVzdGluYXRpb24uZXJyb3IobmV3IFR5cGVFcnJvcigndW5rbm93biB0eXBlIHJldHVybmVkJykpO1xuICAgIH1cbn1cbmV4cG9ydHMuc3Vic2NyaWJlVG9SZXN1bHQgPSBzdWJzY3JpYmVUb1Jlc3VsdDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXN1YnNjcmliZVRvUmVzdWx0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuZnVuY3Rpb24gdGhyb3dFcnJvcihlKSB7IHRocm93IGU7IH1cbmV4cG9ydHMudGhyb3dFcnJvciA9IHRocm93RXJyb3I7XG4vLyMgc291cmNlTWFwcGluZ1VSTD10aHJvd0Vycm9yLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIFN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4uL1N1YnNjcmliZXInKTtcbnZhciByeFN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4uL3N5bWJvbC9yeFN1YnNjcmliZXInKTtcbmZ1bmN0aW9uIHRvU3Vic2NyaWJlcihuZXh0T3JPYnNlcnZlciwgZXJyb3IsIGNvbXBsZXRlKSB7XG4gICAgaWYgKG5leHRPck9ic2VydmVyICYmIHR5cGVvZiBuZXh0T3JPYnNlcnZlciA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgaWYgKG5leHRPck9ic2VydmVyIGluc3RhbmNlb2YgU3Vic2NyaWJlcl8xLlN1YnNjcmliZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXh0T3JPYnNlcnZlcjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgbmV4dE9yT2JzZXJ2ZXJbcnhTdWJzY3JpYmVyXzEuJCRyeFN1YnNjcmliZXJdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV4dE9yT2JzZXJ2ZXJbcnhTdWJzY3JpYmVyXzEuJCRyeFN1YnNjcmliZXJdKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBTdWJzY3JpYmVyXzEuU3Vic2NyaWJlcihuZXh0T3JPYnNlcnZlciwgZXJyb3IsIGNvbXBsZXRlKTtcbn1cbmV4cG9ydHMudG9TdWJzY3JpYmVyID0gdG9TdWJzY3JpYmVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dG9TdWJzY3JpYmVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIGVycm9yT2JqZWN0XzEgPSByZXF1aXJlKCcuL2Vycm9yT2JqZWN0Jyk7XG52YXIgdHJ5Q2F0Y2hUYXJnZXQ7XG5mdW5jdGlvbiB0cnlDYXRjaGVyKCkge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB0cnlDYXRjaFRhcmdldC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICBlcnJvck9iamVjdF8xLmVycm9yT2JqZWN0LmUgPSBlO1xuICAgICAgICByZXR1cm4gZXJyb3JPYmplY3RfMS5lcnJvck9iamVjdDtcbiAgICB9XG59XG5mdW5jdGlvbiB0cnlDYXRjaChmbikge1xuICAgIHRyeUNhdGNoVGFyZ2V0ID0gZm47XG4gICAgcmV0dXJuIHRyeUNhdGNoZXI7XG59XG5leHBvcnRzLnRyeUNhdGNoID0gdHJ5Q2F0Y2g7XG47XG4vLyMgc291cmNlTWFwcGluZ1VSTD10cnlDYXRjaC5qcy5tYXAiLCIiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIEN1c3RvbUV2ZW50ID0gZXhwb3J0cy5DdXN0b21FdmVudCA9IGdsb2JhbC5DdXN0b21FdmVudCB8fCBmdW5jdGlvbiAoKSB7XG4gIHZhciBERUZBVUxUX1BBUkFNUyA9IHsgYnViYmxlczogZmFsc2UsIGNhbmNlbGFibGU6IGZhbHNlLCBkZXRhaWw6IHVuZGVmaW5lZCB9O1xuXG4gIGZ1bmN0aW9uIF9DdXN0b21FdmVudChfZXZlbnQsIF9wYXJhbXMpIHtcbiAgICB2YXIgcGFyYW1zID0gX2V4dGVuZHMoe30sIERFRkFVTFRfUEFSQU1TLCBfcGFyYW1zKTtcbiAgICB2YXIgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkN1c3RvbUV2ZW50XCIpO1xuXG4gICAgZXZlbnQuaW5pdEN1c3RvbUV2ZW50KF9ldmVudCwgcGFyYW1zLmJ1YmJsZXMsIHBhcmFtcy5jYW5jZWxhYmxlLCBwYXJhbXMuZGV0YWlsKTtcbiAgICByZXR1cm4gZXZlbnQ7XG4gIH1cblxuICByZXR1cm4gX0N1c3RvbUV2ZW50O1xufSgpOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuTm9kZVByb3h5ID0gdW5kZWZpbmVkO1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSgpOyAvKiBAZmxvdyAqL1xuXG52YXIgX2RvY3VtZW50ID0gcmVxdWlyZSgnZ2xvYmFsL2RvY3VtZW50Jyk7XG5cbnZhciBfZG9jdW1lbnQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfZG9jdW1lbnQpO1xuXG52YXIgX3Byb3BlcnR5RGVzY3JpcHRvcnMgPSByZXF1aXJlKCcuL3Byb3BlcnR5RGVzY3JpcHRvcnMnKTtcblxudmFyIF9ldmVudERlbGVnYXRvciA9IHJlcXVpcmUoJy4vZXZlbnREZWxlZ2F0b3InKTtcblxudmFyIF9tb3VudGFibGUgPSByZXF1aXJlKCcuL21vdW50YWJsZScpO1xuXG52YXIgX2lzID0gcmVxdWlyZSgnLi9pcycpO1xuXG52YXIgX2dldCA9IHJlcXVpcmUoJy4vZ2V0Jyk7XG5cbnZhciBfc2V0ID0gcmVxdWlyZSgnLi9zZXQnKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxudmFyIE5vZGVQcm94eSA9IGV4cG9ydHMuTm9kZVByb3h5ID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBOb2RlUHJveHkobm9kZSAvKjogSFRNTEVsZW1lbnQqLykge1xuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBOb2RlUHJveHkpO1xuXG4gICAgdGhpcy5fbm9kZSA9IG5vZGU7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoTm9kZVByb3h5LCBbe1xuICAgIGtleTogJ2VtaXRNb3VudCcsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGVtaXRNb3VudChmbiAvKjogRnVuY3Rpb24qLykge1xuICAgICAgKDAsIF9tb3VudGFibGUuZW1pdE1vdW50KSh0aGlzLl9ub2RlLCBmbik7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnZW1pdFVubW91bnQnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBlbWl0VW5tb3VudChmbiAvKjogRnVuY3Rpb24qLykge1xuICAgICAgKDAsIF9tb3VudGFibGUuZW1pdFVubW91bnQpKHRoaXMuX25vZGUsIGZuKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdjaGlsZHJlbicsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNoaWxkcmVuKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX25vZGUuY2hpbGRyZW47XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAncmVwbGFjZUNoaWxkJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVwbGFjZUNoaWxkKGNoaWxkUHJveHkgLyo6IE5vZGVQcm94eSovLCBpbmRleCAvKjogbnVtYmVyKi8pIHtcbiAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZTtcbiAgICAgIHZhciBjaGlsZCA9IGNoaWxkUHJveHkuX25vZGU7XG4gICAgICB2YXIgcmVwbGFjZWQgPSBub2RlLmNoaWxkcmVuW2luZGV4XTtcblxuICAgICAgaWYgKCgwLCBfaXMuaXNEZWZpbmVkKShyZXBsYWNlZCkpIHtcbiAgICAgICAgbm9kZS5yZXBsYWNlQ2hpbGQoY2hpbGQsIHJlcGxhY2VkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICAgICAgfVxuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2luc2VydENoaWxkJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gaW5zZXJ0Q2hpbGQoY2hpbGRQcm94eSAvKjogTm9kZVByb3h5Ki8sIGluZGV4IC8qOiBudW1iZXIqLykge1xuICAgICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlO1xuICAgICAgdmFyIGNoaWxkID0gY2hpbGRQcm94eS5fbm9kZTtcbiAgICAgIHZhciBiZWZvcmUgLyo6IE5vZGUqLyA9IG5vZGUuY2hpbGRyZW5baW5kZXhdO1xuXG4gICAgICBpZiAoKDAsIF9pcy5pc0RlZmluZWQpKGJlZm9yZSkpIHtcbiAgICAgICAgbm9kZS5pbnNlcnRCZWZvcmUoY2hpbGQsIGJlZm9yZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlLmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdyZW1vdmVDaGlsZCcsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbW92ZUNoaWxkKGNoaWxkUHJveHkgLyo6IE5vZGVQcm94eSovKSB7XG4gICAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGU7XG4gICAgICB2YXIgY2hpbGQgPSBjaGlsZFByb3h5Ll9ub2RlO1xuICAgICAgbm9kZS5yZW1vdmVDaGlsZChjaGlsZCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnZ2V0QXR0cmlidXRlJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gZ2V0QXR0cmlidXRlKGtleSAvKjogc3RyaW5nKi8pIHtcbiAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZTtcbiAgICAgIHZhciBkZXNjcmlwdG9yID0gKDAsIF9nZXQuZ2V0KShfcHJvcGVydHlEZXNjcmlwdG9ycy5kZXNjcmlwdG9ycywga2V5KTtcblxuICAgICAgaWYgKCFkZXNjcmlwdG9yKSB7XG4gICAgICAgIHJldHVybiAoMCwgX2dldC5nZXQpKG5vZGUsIGtleSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChkZXNjcmlwdG9yLnVzZUVxdWFsU2V0dGVyKSB7XG4gICAgICAgIHJldHVybiAoMCwgX2dldC5nZXQpKG5vZGUsIGRlc2NyaXB0b3IuY29tcHV0ZWQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbm9kZS5nZXRBdHRyaWJ1dGUoZGVzY3JpcHRvci5jb21wdXRlZCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnc2V0QXR0cmlidXRlJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gc2V0QXR0cmlidXRlKGtleSAvKjogc3RyaW5nKi8sIHZhbHVlIC8qOiBhbnkqLykge1xuICAgICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlO1xuICAgICAgdmFyIGRlc2NyaXB0b3IgPSAoMCwgX2dldC5nZXQpKF9wcm9wZXJ0eURlc2NyaXB0b3JzLmRlc2NyaXB0b3JzLCBrZXkpO1xuXG4gICAgICBpZiAoIWRlc2NyaXB0b3IpIHtcbiAgICAgICAgKDAsIF9zZXQuc2V0KShub2RlLCBrZXksIHZhbHVlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgY29tcHV0ZWQgPSBkZXNjcmlwdG9yLmNvbXB1dGVkO1xuXG5cbiAgICAgIGlmIChkZXNjcmlwdG9yLnVzZUVxdWFsU2V0dGVyKSB7XG4gICAgICAgICgwLCBfc2V0LnNldCkobm9kZSwgY29tcHV0ZWQsIHZhbHVlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGVzY3JpcHRvci5oYXNCb29sZWFuVmFsdWUgJiYgIXZhbHVlKSB7XG4gICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGNvbXB1dGVkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGVzY3JpcHRvci51c2VFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICgwLCBfZXZlbnREZWxlZ2F0b3IuYWRkRXZlbnRMaXN0ZW5lcikobm9kZSwgY29tcHV0ZWQsIHZhbHVlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBub2RlLnNldEF0dHJpYnV0ZShjb21wdXRlZCwgdmFsdWUpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ3JlbW92ZUF0dHJpYnV0ZScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbW92ZUF0dHJpYnV0ZShrZXkgLyo6IHN0cmluZyovKSB7XG4gICAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGU7XG4gICAgICB2YXIgZGVzY3JpcHRvciA9ICgwLCBfZ2V0LmdldCkoX3Byb3BlcnR5RGVzY3JpcHRvcnMuZGVzY3JpcHRvcnMsIGtleSk7XG5cbiAgICAgIGlmICghZGVzY3JpcHRvcikge1xuICAgICAgICAoMCwgX3NldC5zZXQpKG5vZGUsIGtleSwgdW5kZWZpbmVkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgY29tcHV0ZWQgPSBkZXNjcmlwdG9yLmNvbXB1dGVkO1xuXG5cbiAgICAgIGlmIChkZXNjcmlwdG9yLnVzZVNldEF0dHJpYnV0ZSkge1xuICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShjb21wdXRlZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGRlc2NyaXB0b3IuaGFzQm9vbGVhblZhbHVlKSB7XG4gICAgICAgICgwLCBfc2V0LnNldCkobm9kZSwgY29tcHV0ZWQsIGZhbHNlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGVzY3JpcHRvci51c2VFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICgwLCBfZXZlbnREZWxlZ2F0b3IucmVtb3ZlRXZlbnRMaXN0ZW5lcikobm9kZSwgY29tcHV0ZWQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgICgwLCBfc2V0LnNldCkobm9kZSwgY29tcHV0ZWQsIHVuZGVmaW5lZCk7XG4gICAgfVxuICB9XSwgW3tcbiAgICBrZXk6ICdjcmVhdGVFbGVtZW50JyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gY3JlYXRlRWxlbWVudCh0YWdOYW1lIC8qOiBzdHJpbmcqLykge1xuICAgICAgdmFyIG5vZGUgLyo6IEhUTUxFbGVtZW50Ki8gPSBfZG9jdW1lbnQyLmRlZmF1bHQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbiAgICAgIHJldHVybiBuZXcgTm9kZVByb3h5KG5vZGUpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ3F1ZXJ5U2VsZWN0b3InLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBxdWVyeVNlbGVjdG9yKHNlbGVjdG9yIC8qOiBzdHJpbmcqLykge1xuICAgICAgdmFyIG5vZGUgLyo6IEhUTUxFbGVtZW50Ki8gPSBfZG9jdW1lbnQyLmRlZmF1bHQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICByZXR1cm4gbmV3IE5vZGVQcm94eShub2RlKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdmcm9tRWxlbWVudCcsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGZyb21FbGVtZW50KG5vZGUgLyo6IEhUTUxFbGVtZW50Ki8pIHtcbiAgICAgIHJldHVybiBuZXcgTm9kZVByb3h5KG5vZGUpO1xuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBOb2RlUHJveHk7XG59KCk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5WaXJ0dWFsQ29tcG9uZW50ID0gdW5kZWZpbmVkO1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSgpOyAvKiBAZmxvdyAqL1xuXG52YXIgX2N1aWQgPSByZXF1aXJlKCdjdWlkJyk7XG5cbnZhciBfY3VpZDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jdWlkKTtcblxudmFyIF9jcmVhdGVFdmVudEhhbmRsZXIyID0gcmVxdWlyZSgnLi9jcmVhdGVFdmVudEhhbmRsZXInKTtcblxudmFyIF9jcmVhdGVDb21wb25lbnRQcm9wcyA9IHJlcXVpcmUoJy4vY3JlYXRlQ29tcG9uZW50UHJvcHMnKTtcblxudmFyIF9jcmVhdGVDb21wb3NpdGVTdWJqZWN0ID0gcmVxdWlyZSgnLi9jcmVhdGVDb21wb3NpdGVTdWJqZWN0Jyk7XG5cbnZhciBfY3JlYXRlT2JzZXJ2YWJsZUZyb21BcnJheSA9IHJlcXVpcmUoJy4vY3JlYXRlT2JzZXJ2YWJsZUZyb21BcnJheScpO1xuXG52YXIgX3N5bWJvbCA9IHJlcXVpcmUoJy4vc3ltYm9sJyk7XG5cbnZhciBfc2V0ID0gcmVxdWlyZSgnLi9zZXQnKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuLyo6OiBpbXBvcnQgdHlwZSB7T2JzZXJ2YWJsZX0gZnJvbSAncnhqcy9PYnNlcnZhYmxlJyovXG4vKjo6IGltcG9ydCB0eXBlIHtTdWJqZWN0fSBmcm9tICdyeGpzL1N1YmplY3QnKi9cbi8qOjogaW1wb3J0IHR5cGUge05vZGVQcm94eX0gZnJvbSAnLi9Ob2RlUHJveHknKi9cbi8qOjogaW1wb3J0IHR5cGUge1ZpcnR1YWxFbGVtZW50fSBmcm9tICcuL3R5cGVzJyovXG5cblxudmFyIGNyZWF0ZUNvbXBvc2l0ZUFycmF5U3ViamVjdCA9ICgwLCBfY3JlYXRlQ29tcG9zaXRlU3ViamVjdC5jcmVhdGVDb21wb3NpdGVTdWJqZWN0KShfY3JlYXRlT2JzZXJ2YWJsZUZyb21BcnJheS5jcmVhdGVPYnNlcnZhYmxlRnJvbUFycmF5KTtcblxudmFyIGFwcGVuZFVpZFRvQ29tcG9uZW50ID0gZnVuY3Rpb24gYXBwZW5kVWlkVG9Db21wb25lbnQoZm4gLyo6IEZ1bmN0aW9uKi8pIC8qOiBzdHJpbmcqLyB7XG4gIGlmICghZm5bX3N5bWJvbC4kJGNvbXBvbmVudFVpZF0pIHtcbiAgICBmbltfc3ltYm9sLiQkY29tcG9uZW50VWlkXSA9ICgwLCBfY3VpZDIuZGVmYXVsdCkoKTtcbiAgfVxuXG4gIHJldHVybiBmbltfc3ltYm9sLiQkY29tcG9uZW50VWlkXTtcbn07XG5cbnZhciBWaXJ0dWFsQ29tcG9uZW50ID0gZXhwb3J0cy5WaXJ0dWFsQ29tcG9uZW50ID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBWaXJ0dWFsQ29tcG9uZW50KGZuIC8qOiBGdW5jdGlvbiovLCB0YWdOYW1lIC8qOiBzdHJpbmcqLywgcHJvcHMgLyo6IE9iamVjdCovLCBjaGlsZHJlbiAvKjogQXJyYXk8VmlydHVhbEVsZW1lbnQ+Ki8sIGtleSAvKjo6ID86IHN0cmluZyovKSB7XG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIFZpcnR1YWxDb21wb25lbnQpO1xuXG4gICAgdGhpcy5rZXkgPSBrZXk7XG4gICAgdGhpcy50YWdOYW1lID0gdGFnTmFtZTtcbiAgICB0aGlzLl9mbiA9IGZuO1xuICAgIHRoaXMuX3Byb3BzID0gcHJvcHM7XG4gICAgdGhpcy5fY2hpbGRyZW4gPSBjaGlsZHJlbjtcbiAgICB0aGlzLl9ldmVudEhhbmRsZXJzID0gW107XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoVmlydHVhbENvbXBvbmVudCwgW3tcbiAgICBrZXk6ICdnZXROb2RlUHJveHknLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBnZXROb2RlUHJveHkoKSB7XG4gICAgICByZXR1cm4gdGhpcy5faW5zdGFuY2UuZ2V0Tm9kZVByb3h5KCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnaW5pdGlhbGl6ZScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICB2YXIgcHJvcHMgPSB0aGlzLl9wcm9wcyQgPSAoMCwgX2NyZWF0ZUNvbXBvbmVudFByb3BzLmNyZWF0ZUNvbXBvbmVudFByb3BzKSh0aGlzLl9wcm9wcyk7XG4gICAgICB2YXIgY2hpbGRyZW4gPSB0aGlzLl9jaGlsZHJlbiQgPSBjcmVhdGVDb21wb3NpdGVBcnJheVN1YmplY3QodGhpcy5fY2hpbGRyZW4pO1xuXG4gICAgICB2YXIgX2NyZWF0ZUV2ZW50SGFuZGxlciA9IGZ1bmN0aW9uIF9jcmVhdGVFdmVudEhhbmRsZXIoKSB7XG4gICAgICAgIHZhciBoYW5kbGVyID0gX2NyZWF0ZUV2ZW50SGFuZGxlcjIuY3JlYXRlRXZlbnRIYW5kbGVyLmFwcGx5KHVuZGVmaW5lZCwgYXJndW1lbnRzKTtcbiAgICAgICAgX3RoaXMuX2V2ZW50SGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICAgICAgcmV0dXJuIGhhbmRsZXI7XG4gICAgICB9O1xuXG4gICAgICB2YXIgaW5zdGFuY2UgPSB0aGlzLl9pbnN0YW5jZSA9IHRoaXMuX2ZuLmNhbGwobnVsbCwgeyBwcm9wczogcHJvcHMuYXNPYmplY3QoKSwgY2hpbGRyZW46IGNoaWxkcmVuLCBjcmVhdGVFdmVudEhhbmRsZXI6IF9jcmVhdGVFdmVudEhhbmRsZXIgfSk7XG4gICAgICBpbnN0YW5jZS5pbml0aWFsaXplKCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnYWZ0ZXJJbnNlcnQnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBhZnRlckluc2VydCgpIHtcbiAgICAgIHRoaXMuX2luc3RhbmNlLmFmdGVySW5zZXJ0KCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAncGF0Y2gnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBwYXRjaChuZXh0IC8qOiBWaXJ0dWFsQ29tcG9uZW50Ki8pIHtcbiAgICAgIG5leHQuX2V2ZW50SGFuZGxlcnMgPSB0aGlzLl9ldmVudEhhbmRsZXJzO1xuICAgICAgbmV4dC5faW5zdGFuY2UgPSB0aGlzLl9pbnN0YW5jZTtcbiAgICAgIG5leHQuX3Byb3BzJCA9IHRoaXMuX3Byb3BzJDtcbiAgICAgIG5leHQuX2NoaWxkcmVuJCA9IHRoaXMuX2NoaWxkcmVuJDtcblxuICAgICAgdGhpcy5fZXZlbnRIYW5kbGVycyA9IFtdO1xuICAgICAgdGhpcy5faW5zdGFuY2UgPSBudWxsO1xuICAgICAgdGhpcy5fcHJvcHMkID0gbnVsbDtcbiAgICAgIHRoaXMuX2NoaWxkcmVuJCA9IG51bGw7XG5cbiAgICAgIG5leHQuX3Byb3BzJC5uZXh0KG5leHQuX3Byb3BzKTtcbiAgICAgIG5leHQuX2NoaWxkcmVuJC5uZXh0KG5leHQuX2NoaWxkcmVuKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdiZWZvcmVEZXN0cm95JyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gYmVmb3JlRGVzdHJveSgpIHtcbiAgICAgIHRoaXMuX2luc3RhbmNlLmJlZm9yZURlc3Ryb3koKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdkZXN0cm95JyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICAgIHRoaXMuX2V2ZW50SGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbiAoaCkge1xuICAgICAgICByZXR1cm4gIWguaGFzQ29tcGxldGVkICYmIGguY29tcGxldGUoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5faW5zdGFuY2UuZGVzdHJveSgpO1xuICAgICAgdGhpcy5fY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoYykge1xuICAgICAgICByZXR1cm4gYy5kZXN0cm95KCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdpbnNlcnRDaGlsZCcsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGluc2VydENoaWxkKF9fY2hpbGQgLyo6IGFueSovLCBfX2luZGV4IC8qOiBhbnkqLykge31cbiAgfSwge1xuICAgIGtleTogJ21vdmVDaGlsZCcsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIG1vdmVDaGlsZChfX2NoaWxkIC8qOiBhbnkqLywgX19pbmRleCAvKjogYW55Ki8pIHt9XG4gIH0sIHtcbiAgICBrZXk6ICdyZW1vdmVDaGlsZCcsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbW92ZUNoaWxkKF9fY2hpbGQgLyo6IGFueSovKSB7fVxuICB9XSwgW3tcbiAgICBrZXk6ICdjcmVhdGUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjcmVhdGUoZm4gLyo6IEZ1bmN0aW9uKi8sIHByb3BzIC8qOiBPYmplY3QqLywgY2hpbGRyZW4gLyo6IEFycmF5PE9ic2VydmFibGV8VmlydHVhbEVsZW1lbnQ+Ki8pIHtcbiAgICAgIHZhciB1aWQgPSBhcHBlbmRVaWRUb0NvbXBvbmVudChmbik7XG5cbiAgICAgIHJldHVybiBuZXcgVmlydHVhbENvbXBvbmVudChmbiwgdWlkLCBwcm9wcywgY2hpbGRyZW4sIHByb3BzLmtleSk7XG4gICAgfVxuICB9XSk7XG5cbiAgcmV0dXJuIFZpcnR1YWxDb21wb25lbnQ7XG59KCk7XG5cbigwLCBfc2V0LnNldCkoVmlydHVhbENvbXBvbmVudC5wcm90b3R5cGUsIF9zeW1ib2wuJCR2aXJ0dWFsLCB0cnVlKTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlZpcnR1YWxOb2RlID0gdW5kZWZpbmVkO1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSgpOyAvKiBAZmxvdyAqL1xuXG52YXIgX05vZGVQcm94eSA9IHJlcXVpcmUoJy4vTm9kZVByb3h5Jyk7XG5cbnZhciBfd3JhcFRleHQgPSByZXF1aXJlKCcuL3dyYXBUZXh0Jyk7XG5cbnZhciBfcGFyc2VUYWcgPSByZXF1aXJlKCcuL3BhcnNlVGFnJyk7XG5cbnZhciBfYmF0Y2hJbnNlcnRNZXNzYWdlcyA9IHJlcXVpcmUoJy4vYmF0Y2hJbnNlcnRNZXNzYWdlcycpO1xuXG52YXIgX2NyZWF0ZVBhdGNoUHJvcGVydGllcyA9IHJlcXVpcmUoJy4vY3JlYXRlUGF0Y2hQcm9wZXJ0aWVzJyk7XG5cbnZhciBfY3JlYXRlUGF0Y2hDaGlsZHJlbiA9IHJlcXVpcmUoJy4vY3JlYXRlUGF0Y2hDaGlsZHJlbicpO1xuXG52YXIgX2NyZWF0ZUNvbXBvc2l0ZVN1YmplY3QgPSByZXF1aXJlKCcuL2NyZWF0ZUNvbXBvc2l0ZVN1YmplY3QnKTtcblxudmFyIF9jcmVhdGVOb2RlUHJvcHMgPSByZXF1aXJlKCcuL2NyZWF0ZU5vZGVQcm9wcycpO1xuXG52YXIgX2NyZWF0ZU9ic2VydmFibGVGcm9tQXJyYXkgPSByZXF1aXJlKCcuL2NyZWF0ZU9ic2VydmFibGVGcm9tQXJyYXknKTtcblxudmFyIF9mbGF0dGVuID0gcmVxdWlyZSgnLi9mbGF0dGVuJyk7XG5cbnZhciBfc3ltYm9sID0gcmVxdWlyZSgnLi9zeW1ib2wnKTtcblxudmFyIF9zZXQgPSByZXF1aXJlKCcuL3NldCcpO1xuXG5yZXF1aXJlKCdyeGpzL2FkZC9vcGVyYXRvci9tYXAnKTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuLyo6OiBpbXBvcnQgdHlwZSB7T2JzZXJ2YWJsZX0gZnJvbSAncnhqcy9PYnNlcnZhYmxlJyovXG4vKjo6IGltcG9ydCB0eXBlIHtTdWJqZWN0fSBmcm9tICdyeGpzL1N1YmplY3QnKi9cbi8qOjogaW1wb3J0IHR5cGUge1N1YnNjcmlwdGlvbn0gZnJvbSAncnhqcy9TdWJzY3JpcHRpb24nKi9cbi8qOjogaW1wb3J0IHR5cGUge1ZpcnR1YWxFbGVtZW50LCBOb2RlUHJveHlEZWNvcmF0b3J9IGZyb20gJy4vdHlwZXMnKi9cblxuXG52YXIgY3JlYXRlQ29tcG9zaXRlUHJvcFN1YmplY3QgPSAoMCwgX2NyZWF0ZUNvbXBvc2l0ZVN1YmplY3QuY3JlYXRlQ29tcG9zaXRlU3ViamVjdCkoX2NyZWF0ZU5vZGVQcm9wcy5jcmVhdGVOb2RlUHJvcHMpO1xudmFyIGNyZWF0ZUNvbXBvc2l0ZUFycmF5U3ViamVjdCA9ICgwLCBfY3JlYXRlQ29tcG9zaXRlU3ViamVjdC5jcmVhdGVDb21wb3NpdGVTdWJqZWN0KShfY3JlYXRlT2JzZXJ2YWJsZUZyb21BcnJheS5jcmVhdGVPYnNlcnZhYmxlRnJvbUFycmF5KTtcblxudmFyIFZpcnR1YWxOb2RlID0gZXhwb3J0cy5WaXJ0dWFsTm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gVmlydHVhbE5vZGUodGFnTmFtZSAvKjogc3RyaW5nKi8sIHByb3BzIC8qOiBPYmplY3QqLywgY2hpbGRyZW4gLyo6IEFycmF5PFZpcnR1YWxFbGVtZW50PiovLCBrZXkgLyo6OiA/OiBzdHJpbmcqLykge1xuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBWaXJ0dWFsTm9kZSk7XG5cbiAgICB0aGlzLmtleSA9IGtleTtcbiAgICB0aGlzLnRhZ05hbWUgPSB0YWdOYW1lO1xuICAgIHRoaXMuX3Byb3BzID0gcHJvcHM7XG4gICAgdGhpcy5fY2hpbGRyZW4gPSBjaGlsZHJlbjtcbiAgICB0aGlzLl9zdWJzY3JpcHRpb25zID0gW107XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoVmlydHVhbE5vZGUsIFt7XG4gICAga2V5OiAnZ2V0Tm9kZVByb3h5JyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gZ2V0Tm9kZVByb3h5KCkge1xuICAgICAgcmV0dXJuIHRoaXMuX25vZGVQcm94eTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdpbml0aWFsaXplJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgICAgIHZhciBub2RlUHJveHkgLyo6IE5vZGVQcm94eSovID0gdGhpcy5fbm9kZVByb3h5ID0gX05vZGVQcm94eS5Ob2RlUHJveHkuY3JlYXRlRWxlbWVudCh0aGlzLnRhZ05hbWUpO1xuICAgICAgdmFyIHByb3BzJCAvKjogU3ViamVjdDxPYmplY3Q+Ki8gPSB0aGlzLl9wcm9wcyQgPSBjcmVhdGVDb21wb3NpdGVQcm9wU3ViamVjdCh0aGlzLl9wcm9wcyk7XG4gICAgICB2YXIgY2hpbGRyZW4kIC8qOiBTdWJqZWN0PEFycmF5PFZpcnR1YWxOb2RlPj4qLyA9IHRoaXMuX2NoaWxkcmVuJCA9IGNyZWF0ZUNvbXBvc2l0ZUFycmF5U3ViamVjdCh0aGlzLl9jaGlsZHJlbik7XG5cbiAgICAgIHZhciBub2RlUHJveHlEZWNvcmF0b3IgLyo6IE5vZGVQcm94eURlY29yYXRvciovID0ge1xuICAgICAgICBpbnNlcnRDaGlsZDogZnVuY3Rpb24gaW5zZXJ0Q2hpbGQoY2hpbGQgLyo6IFZpcnR1YWxOb2RlKi8sIGluZGV4IC8qOiBudW1iZXIqLykge1xuICAgICAgICAgIHJldHVybiAoMCwgX2JhdGNoSW5zZXJ0TWVzc2FnZXMuYmF0Y2hJbnNlcnRNZXNzYWdlcykoZnVuY3Rpb24gKHF1ZXVlKSB7XG4gICAgICAgICAgICBjaGlsZC5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICBub2RlUHJveHkuaW5zZXJ0Q2hpbGQoY2hpbGQuZ2V0Tm9kZVByb3h5KCksIGluZGV4KTtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goY2hpbGQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICB1cGRhdGVDaGlsZDogZnVuY3Rpb24gdXBkYXRlQ2hpbGQocHJldmlvdXMgLyo6IFZpcnR1YWxOb2RlKi8sIG5leHQgLyo6IFZpcnR1YWxOb2RlKi8pIHtcbiAgICAgICAgICBwcmV2aW91cy5wYXRjaChuZXh0KTtcbiAgICAgICAgfSxcbiAgICAgICAgbW92ZUNoaWxkOiBmdW5jdGlvbiBtb3ZlQ2hpbGQocHJldmlvdXMgLyo6IFZpcnR1YWxOb2RlKi8sIG5leHQgLyo6IFZpcnR1YWxOb2RlKi8sIGluZGV4IC8qOiBudW1iZXIqLykge1xuICAgICAgICAgIHByZXZpb3VzLnBhdGNoKG5leHQpO1xuICAgICAgICAgIG5vZGVQcm94eS5pbnNlcnRDaGlsZChuZXh0LmdldE5vZGVQcm94eSgpLCBpbmRleCk7XG4gICAgICAgIH0sXG4gICAgICAgIHJlbW92ZUNoaWxkOiBmdW5jdGlvbiByZW1vdmVDaGlsZChjaGlsZCAvKjogVmlydHVhbE5vZGUqLykge1xuICAgICAgICAgIGNoaWxkLmJlZm9yZURlc3Ryb3koKTtcbiAgICAgICAgICBub2RlUHJveHkucmVtb3ZlQ2hpbGQoY2hpbGQuZ2V0Tm9kZVByb3h5KCkpO1xuICAgICAgICAgIGNoaWxkLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgdmFyIHByb3BTdWIgPSBwcm9wcyQuc3Vic2NyaWJlKCgwLCBfY3JlYXRlUGF0Y2hQcm9wZXJ0aWVzLmNyZWF0ZVBhdGNoUHJvcGVydGllcykobm9kZVByb3h5KSk7XG5cbiAgICAgIHZhciBjaGlsZHJlblN1YiA9IGNoaWxkcmVuJC5tYXAoX2ZsYXR0ZW4uZmxhdHRlbikubWFwKF93cmFwVGV4dC53cmFwVGV4dCkuc3Vic2NyaWJlKCgwLCBfY3JlYXRlUGF0Y2hDaGlsZHJlbi5jcmVhdGVQYXRjaENoaWxkcmVuKShub2RlUHJveHlEZWNvcmF0b3IpKTtcblxuICAgICAgdGhpcy5fc3Vic2NyaXB0aW9ucy5wdXNoKHByb3BTdWIpO1xuICAgICAgdGhpcy5fc3Vic2NyaXB0aW9ucy5wdXNoKGNoaWxkcmVuU3ViKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdhZnRlckluc2VydCcsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGFmdGVySW5zZXJ0KCkge1xuICAgICAgdGhpcy5fbm9kZVByb3h5LmVtaXRNb3VudCh0aGlzLl9wcm9wcy5vbk1vdW50KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdwYXRjaCcsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHBhdGNoKG5leHQgLyo6IFZpcnR1YWxOb2RlKi8pIHtcbiAgICAgIG5leHQuX25vZGVQcm94eSA9IHRoaXMuX25vZGVQcm94eTtcbiAgICAgIG5leHQuX3Byb3BzJCA9IHRoaXMuX3Byb3BzJDtcbiAgICAgIG5leHQuX2NoaWxkcmVuJCA9IHRoaXMuX2NoaWxkcmVuJDtcblxuICAgICAgbmV4dC5fcHJvcHMkLm5leHQobmV4dC5fcHJvcHMpO1xuICAgICAgbmV4dC5fY2hpbGRyZW4kLm5leHQobmV4dC5fY2hpbGRyZW4pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2JlZm9yZURlc3Ryb3knLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBiZWZvcmVEZXN0cm95KCkge1xuICAgICAgdGhpcy5fbm9kZVByb3h5LmVtaXRVbm1vdW50KHRoaXMuX3Byb3BzLm9uVW5tb3VudCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnZGVzdHJveScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gICAgICB0aGlzLl9zdWJzY3JpcHRpb25zLmZvckVhY2goZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgcmV0dXJuIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5fY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoYykge1xuICAgICAgICByZXR1cm4gYy5kZXN0cm95KCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1dLCBbe1xuICAgIGtleTogJ2NyZWF0ZScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNyZWF0ZShfdGFnTmFtZSAvKjogc3RyaW5nKi8sIHByb3BzIC8qOiBPYmplY3QqLywgY2hpbGRyZW4gLyo6IEFycmF5PFZpcnR1YWxOb2RlfE9ic2VydmFibGU+Ki8pIHtcbiAgICAgIHZhciB0YWdOYW1lIC8qOiBzdHJpbmcqLyA9ICgwLCBfcGFyc2VUYWcucGFyc2VUYWcpKF90YWdOYW1lLCBwcm9wcyk7XG4gICAgICB2YXIga2V5IC8qOiBzdHJpbmcqLyA9IHByb3BzLmtleSB8fCBudWxsO1xuXG4gICAgICByZXR1cm4gbmV3IFZpcnR1YWxOb2RlKHRhZ05hbWUsIHByb3BzLCBjaGlsZHJlbiwga2V5KTtcbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gVmlydHVhbE5vZGU7XG59KCk7XG5cbigwLCBfc2V0LnNldCkoVmlydHVhbE5vZGUucHJvdG90eXBlLCBfc3ltYm9sLiQkdmlydHVhbCwgdHJ1ZSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5hc09ic2VydmFibGUgPSBhc09ic2VydmFibGU7XG5cbnZhciBfT2JzZXJ2YWJsZSA9IHJlcXVpcmUoJ3J4anMvT2JzZXJ2YWJsZScpO1xuXG52YXIgX2lzID0gcmVxdWlyZSgnLi9pcycpO1xuXG5yZXF1aXJlKCdyeGpzL2FkZC9vYnNlcnZhYmxlL29mJyk7XG5cbmZ1bmN0aW9uIGFzT2JzZXJ2YWJsZShvYmogLyo6IGFueSovKSAvKjogT2JzZXJ2YWJsZTxhbnk+Ki8ge1xuICBpZiAoKDAsIF9pcy5pc09ic2VydmFibGUpKG9iaikpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgcmV0dXJuIF9PYnNlcnZhYmxlLk9ic2VydmFibGUub2Yob2JqKTtcbn0gLyogQGZsb3cgKi8iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmJhdGNoSW5zZXJ0TWVzc2FnZXMgPSBiYXRjaEluc2VydE1lc3NhZ2VzO1xuLyogQGZsb3cgKi9cblxuLyo6OiBpbXBvcnQgdHlwZSB7VmlydHVhbE5vZGV9IGZyb20gJy4vVmlydHVhbE5vZGUnKi9cbi8qOjogdHlwZSBTY29wZSA9IHtcbiAgYmF0Y2hJblByb2dyZXNzOiBib29sZWFuO1xuICBxdWV1ZTogQXJyYXk8VmlydHVhbE5vZGU+O1xufSovXG5cblxudmFyIHNjb3BlIC8qOiBTY29wZSovID0ge1xuICBiYXRjaEluUHJvZ3Jlc3M6IGZhbHNlLFxuICBxdWV1ZTogW11cbn07XG5cbmZ1bmN0aW9uIGZsdXNoUXVldWUocXVldWUgLyo6IEFycmF5PFZpcnR1YWxOb2RlPiovKSAvKjogdm9pZCovIHtcbiAgd2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICB2YXIgdm5vZGUgPSBzY29wZS5xdWV1ZS5wb3AoKTtcbiAgICB2bm9kZS5hZnRlckluc2VydCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGJhdGNoSW5zZXJ0TWVzc2FnZXMoY2FsbGJhY2sgLyo6IEZ1bmN0aW9uKi8sIGEgLyo6IGFueSovLCBiIC8qOiBhbnkqLywgYyAvKjogYW55Ki8pIC8qOiBhbnkqLyB7XG4gIGlmIChzY29wZS5iYXRjaEluUHJvZ3Jlc3MpIHtcbiAgICByZXR1cm4gY2FsbGJhY2soc2NvcGUucXVldWUsIGEsIGIsIGMpO1xuICB9XG5cbiAgc2NvcGUuYmF0Y2hJblByb2dyZXNzID0gdHJ1ZTtcblxuICB2YXIgcmVzdWx0ID0gY2FsbGJhY2soc2NvcGUucXVldWUsIGEsIGIsIGMpO1xuICBmbHVzaFF1ZXVlKHNjb3BlLnF1ZXVlKTtcblxuICBzY29wZS5iYXRjaEluUHJvZ3Jlc3MgPSBmYWxzZTtcblxuICByZXR1cm4gcmVzdWx0O1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuY3JlYXRlQ29tcG9uZW50UHJvcHMgPSBjcmVhdGVDb21wb25lbnRQcm9wcztcblxudmFyIF9CZWhhdmlvclN1YmplY3QgPSByZXF1aXJlKCdyeGpzL0JlaGF2aW9yU3ViamVjdCcpO1xuXG52YXIgX2lzID0gcmVxdWlyZSgnLi9pcycpO1xuXG4vKiBAZmxvdyAqL1xuXG4vKjo6IHR5cGUgQ29tcG9uZW50UHJvcHMgPSB7XG4gIGFzT2JqZWN0ICgpOiBPYmplY3QsXG4gIG5leHQgKHY6IE9iamVjdCk6IHZvaWQsXG59Ki9cbmZ1bmN0aW9uIGNyZWF0ZUNvbXBvbmVudFByb3BzKF9wcm9wcyAvKjogT2JqZWN0Ki8pIC8qOiBDb21wb25lbnRQcm9wcyovIHtcbiAgdmFyIGtleXMgLyo6IEFycmF5PHN0cmluZz4qLyA9IE9iamVjdC5rZXlzKF9wcm9wcyk7XG4gIHZhciBwbGFpblZhbHVlS2V5cyAvKjogT2JqZWN0Ki8gPSB7fTtcblxuICB2YXIgcHJvcHMgLyo6IE9iamVjdCovID0ge307XG4gIHZhciBsZW4gLyo6IG51bWJlciovID0ga2V5cy5sZW5ndGg7XG4gIHZhciBpIC8qOiBudW1iZXIqLyA9IC0xO1xuXG4gIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICB2YXIgdmFsdWUgPSBfcHJvcHNba2V5XTtcblxuICAgIGlmICgoMCwgX2lzLmlzT2JzZXJ2YWJsZSkodmFsdWUpKSB7XG4gICAgICBwcm9wc1trZXldID0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBsYWluVmFsdWVLZXlzW2tleV0gPSB0cnVlO1xuICAgICAgcHJvcHNba2V5XSA9IG5ldyBfQmVoYXZpb3JTdWJqZWN0LkJlaGF2aW9yU3ViamVjdCh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBhc09iamVjdDogZnVuY3Rpb24gYXNPYmplY3QoKSB7XG4gICAgICByZXR1cm4gcHJvcHM7XG4gICAgfSxcbiAgICBuZXh0OiBmdW5jdGlvbiAoX25leHQpIHtcbiAgICAgIGZ1bmN0aW9uIG5leHQoX3gpIHtcbiAgICAgICAgcmV0dXJuIF9uZXh0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG5cbiAgICAgIG5leHQudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBfbmV4dC50b1N0cmluZygpO1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIG5leHQ7XG4gICAgfShmdW5jdGlvbiAobmV4dCAvKjogT2JqZWN0Ki8pIHtcbiAgICAgIHZhciBqIC8qOiBudW1iZXIqLyA9IC0xO1xuXG4gICAgICB3aGlsZSAoKytqIDwgbGVuKSB7XG4gICAgICAgIHZhciBfa2V5IC8qOiBzdHJpbmcqLyA9IGtleXNbal07XG4gICAgICAgIHZhciBfdmFsdWUgLyo6IGFueSovID0gbmV4dFtfa2V5XTtcbiAgICAgICAgdmFyIG9sZCAvKjogYW55Ki8gPSBwcm9wc1tfa2V5XTtcblxuICAgICAgICBpZiAocGxhaW5WYWx1ZUtleXNbX2tleV0pIHtcbiAgICAgICAgICBvbGQubmV4dChfdmFsdWUpO1xuICAgICAgICB9IGVsc2UgaWYgKF92YWx1ZSAhPT0gb2xkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdPYnNlcnZhYmxlIHByb3AgXCInICsgX2tleSArICdcIiBjaGFuZ2VkIHRvIGRpZmZlcmVudCBvYnNlcnZhYmxlJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9O1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuY3JlYXRlQ29tcG9zaXRlU3ViamVjdCA9IHVuZGVmaW5lZDtcblxudmFyIF9PYnNlcnZhYmxlID0gcmVxdWlyZSgncnhqcy9PYnNlcnZhYmxlJyk7XG5cbnZhciBfT2JzZXJ2ZXIgPSByZXF1aXJlKCdyeGpzL09ic2VydmVyJyk7XG5cbnZhciBfU3ViamVjdCA9IHJlcXVpcmUoJ3J4anMvU3ViamVjdCcpO1xuXG52YXIgX1N1YnNjcmlwdGlvbiA9IHJlcXVpcmUoJ3J4anMvU3Vic2NyaXB0aW9uJyk7XG5cbnZhciBfQmVoYXZpb3JTdWJqZWN0ID0gcmVxdWlyZSgncnhqcy9CZWhhdmlvclN1YmplY3QnKTtcblxucmVxdWlyZSgncnhqcy9hZGQvb3BlcmF0b3Ivc3dpdGNoTWFwJyk7XG5cbi8qIEBmbG93ICovXG5cbnZhciBjcmVhdGVDb21wb3NpdGVTdWJqZWN0ID0gZXhwb3J0cy5jcmVhdGVDb21wb3NpdGVTdWJqZWN0ID0gZnVuY3Rpb24gY3JlYXRlQ29tcG9zaXRlU3ViamVjdChzd2l0Y2hNYXBGbiAvKjogRnVuY3Rpb24qLykgLyo6IEZ1bmN0aW9uKi8ge1xuICByZXR1cm4gZnVuY3Rpb24gKHZhbHVlIC8qOiBhbnkqLykgLyo6IFN1YmplY3Q8YW55PiovIHtcbiAgICB2YXIgYmVoYXZpb3IgLyo6IEJlaGF2aW9yU3ViamVjdCovID0gbmV3IF9CZWhhdmlvclN1YmplY3QuQmVoYXZpb3JTdWJqZWN0KHZhbHVlKTtcblxuICAgIHZhciBvYnNlcnZhYmxlIC8qOiBPYnNlcnZhYmxlKi8gPSBfT2JzZXJ2YWJsZS5PYnNlcnZhYmxlLmNyZWF0ZShmdW5jdGlvbiAob2JzZXJ2ZXIgLyo6IE9ic2VydmVyKi8pIC8qOiBGdW5jdGlvbiovIHtcbiAgICAgIHZhciBzdWJzY3JpcHRpb24gLyo6IFN1YnNjcmlwdGlvbiovID0gYmVoYXZpb3Iuc3dpdGNoTWFwKHN3aXRjaE1hcEZuKS5zdWJzY3JpYmUob2JzZXJ2ZXIpO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgfTtcbiAgICB9KTtcblxuICAgIHJldHVybiBfU3ViamVjdC5TdWJqZWN0LmNyZWF0ZShiZWhhdmlvciwgb2JzZXJ2YWJsZSk7XG4gIH07XG59OyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuY3JlYXRlRXZlbnRIYW5kbGVyID0gY3JlYXRlRXZlbnRIYW5kbGVyO1xuXG52YXIgX09ic2VydmFibGUgPSByZXF1aXJlKCdyeGpzL09ic2VydmFibGUnKTtcblxudmFyIF9PYnNlcnZlciA9IHJlcXVpcmUoJ3J4anMvT2JzZXJ2ZXInKTtcblxudmFyIF9TdWJqZWN0ID0gcmVxdWlyZSgncnhqcy9TdWJqZWN0Jyk7XG5cbnZhciBfU3Vic2NyaXB0aW9uID0gcmVxdWlyZSgncnhqcy9TdWJzY3JpcHRpb24nKTtcblxudmFyIF9pcyA9IHJlcXVpcmUoJy4vaXMnKTtcblxucmVxdWlyZSgncnhqcy9hZGQvb3BlcmF0b3IvbWFwJyk7XG5cbnJlcXVpcmUoJ3J4anMvYWRkL29wZXJhdG9yL21hcFRvJyk7XG5cbnJlcXVpcmUoJ3J4anMvYWRkL29wZXJhdG9yL3NoYXJlJyk7XG5cbi8qIEBmbG93ICovXG5cbmZ1bmN0aW9uIHdyYXBNYXBGbihvYnMgLyo6IFN1YmplY3QqLywgbWFwRm4gLyo6OiA/OiBhbnkqLykgLyo6IE9ic2VydmFibGUqLyB7XG4gIHZhciBtYXBGbklzRGVmaW5lZCAvKjogYm9vbGVhbiovID0gKDAsIF9pcy5pc0RlZmluZWQpKG1hcEZuKTtcbiAgdmFyIG1hcEZuSXNGdW5jdGlvbiAvKjogYm9vbGVhbiovID0gKDAsIF9pcy5pc0Z1bmN0aW9uKShtYXBGbik7XG5cbiAgaWYgKG1hcEZuSXNEZWZpbmVkICYmIG1hcEZuSXNGdW5jdGlvbikge1xuICAgIHJldHVybiBvYnMubWFwKG1hcEZuKTtcbiAgfSBlbHNlIGlmIChtYXBGbklzRGVmaW5lZCkge1xuICAgIHJldHVybiBvYnMubWFwVG8obWFwRm4pO1xuICB9XG5cbiAgcmV0dXJuIG9icztcbn1cblxuZnVuY3Rpb24gY3JlYXRlRXZlbnRIYW5kbGVyKG1hcEZuIC8qOjogPzogYW55Ki8sIGluaXQgLyo6OiA/OiBhbnkqLykgLyo6IFN1YmplY3QqLyB7XG4gIHZhciBzdWJqZWN0IC8qOiBTdWJqZWN0Ki8gPSBuZXcgX1N1YmplY3QuU3ViamVjdCgpO1xuXG4gIHZhciBvYnNlcnZhYmxlIC8qOiBPYnNlcnZhYmxlKi8gPSBfT2JzZXJ2YWJsZS5PYnNlcnZhYmxlLmNyZWF0ZShmdW5jdGlvbiAob2JzZXJ2ZXIgLyo6IE9ic2VydmVyKi8pIC8qOiBGdW5jdGlvbiovIHtcbiAgICB2YXIgc3Vic2NyaXB0aW9uIC8qOiBTdWJzY3JpcHRpb24qLyA9IHdyYXBNYXBGbihzdWJqZWN0LCBtYXBGbikuc3Vic2NyaWJlKG9ic2VydmVyKTtcblxuICAgIGlmICgoMCwgX2lzLmlzRGVmaW5lZCkoaW5pdCkpIHtcbiAgICAgIG9ic2VydmVyLm5leHQoaW5pdCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIH07XG4gIH0pO1xuXG4gIHJldHVybiBfU3ViamVjdC5TdWJqZWN0LmNyZWF0ZShzdWJqZWN0LCBvYnNlcnZhYmxlLnNoYXJlKCkpO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuY3JlYXRlTm9kZVByb3BzID0gY3JlYXRlTm9kZVByb3BzO1xuXG52YXIgX09ic2VydmFibGUgPSByZXF1aXJlKCdyeGpzL09ic2VydmFibGUnKTtcblxudmFyIF9ldmVudHNMaXN0ID0gcmVxdWlyZSgnLi9ldmVudHNMaXN0Jyk7XG5cbnZhciBfYXNPYnNlcnZhYmxlID0gcmVxdWlyZSgnLi9hc09ic2VydmFibGUnKTtcblxudmFyIF9pcyA9IHJlcXVpcmUoJy4vaXMnKTtcblxucmVxdWlyZSgncnhqcy9hZGQvb2JzZXJ2YWJsZS9vZicpO1xuXG5yZXF1aXJlKCdyeGpzL2FkZC9vYnNlcnZhYmxlL2NvbWJpbmVMYXRlc3QnKTtcblxuLyogQGZsb3cgKi9cblxudmFyIHdyYXBWYWx1ZSA9IGZ1bmN0aW9uIHdyYXBWYWx1ZShrZXksIHZhbHVlKSB7XG4gIGlmIChfZXZlbnRzTGlzdC5ldmVudExpc3RNYXBba2V5XSAmJiAoMCwgX2lzLmlzU3ViamVjdCkodmFsdWUpKSB7XG4gICAgcmV0dXJuICgwLCBfYXNPYnNlcnZhYmxlLmFzT2JzZXJ2YWJsZSkodmFsdWUubmV4dC5iaW5kKHZhbHVlKSk7XG4gIH1cblxuICByZXR1cm4gKDAsIF9hc09ic2VydmFibGUuYXNPYnNlcnZhYmxlKSh2YWx1ZSk7XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVOb2RlUHJvcHMob2JqIC8qOiBPYmplY3QqLykgLyo6IE9ic2VydmFibGU8T2JqZWN0PiovIHtcbiAgaWYgKCgwLCBfaXMuaXNFbXB0eU9iamVjdCkob2JqKSkge1xuICAgIHJldHVybiBfT2JzZXJ2YWJsZS5PYnNlcnZhYmxlLm9mKG9iaik7XG4gIH1cblxuICB2YXIga2V5cyAvKjogQXJyYXk8c3RyaW5nPiovID0gT2JqZWN0LmtleXMob2JqKTtcbiAgdmFyIGxlbiAvKjogbnVtYmVyKi8gPSBrZXlzLmxlbmd0aDtcbiAgdmFyIHZhbHVlcyAvKjogQXJyYXk8T2JzZXJ2YWJsZT4qLyA9IEFycmF5KGxlbik7XG4gIHZhciBpIC8qOiBudW1iZXIqLyA9IC0xO1xuXG4gIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICB2YXIga2V5IC8qOiBzdHJpbmcqLyA9IGtleXNbaV07XG4gICAgdmFyIHZhbHVlIC8qOiBhbnkqLyA9IG9ialtrZXldO1xuICAgIHZhbHVlc1tpXSA9IHdyYXBWYWx1ZShrZXksIHZhbHVlKTtcbiAgfVxuXG4gIHJldHVybiBfT2JzZXJ2YWJsZS5PYnNlcnZhYmxlLmNvbWJpbmVMYXRlc3QodmFsdWVzLCBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuKSwgX2tleSA9IDA7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgIGFyZ3NbX2tleV0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgfVxuXG4gICAgdmFyIG5ld09iaiAvKjogT2JqZWN0Ki8gPSB7fTtcbiAgICBpID0gLTE7XG5cbiAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICB2YXIgX2tleTIgLyo6IHN0cmluZyovID0ga2V5c1tpXTtcbiAgICAgIG5ld09ialtfa2V5Ml0gPSBhcmdzW2ldO1xuICAgIH1cblxuICAgIHJldHVybiBuZXdPYmo7XG4gIH0pO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuY3JlYXRlT2JzZXJ2YWJsZUZyb21BcnJheSA9IGNyZWF0ZU9ic2VydmFibGVGcm9tQXJyYXk7XG5cbnZhciBfT2JzZXJ2YWJsZSA9IHJlcXVpcmUoJ3J4anMvT2JzZXJ2YWJsZScpO1xuXG52YXIgX2FzT2JzZXJ2YWJsZSA9IHJlcXVpcmUoJy4vYXNPYnNlcnZhYmxlJyk7XG5cbnJlcXVpcmUoJ3J4anMvYWRkL29ic2VydmFibGUvb2YnKTtcblxucmVxdWlyZSgncnhqcy9hZGQvb2JzZXJ2YWJsZS9jb21iaW5lTGF0ZXN0Jyk7XG5cbmZ1bmN0aW9uIF90b0NvbnN1bWFibGVBcnJheShhcnIpIHsgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkgeyBmb3IgKHZhciBpID0gMCwgYXJyMiA9IEFycmF5KGFyci5sZW5ndGgpOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7IGFycjJbaV0gPSBhcnJbaV07IH0gcmV0dXJuIGFycjI7IH0gZWxzZSB7IHJldHVybiBBcnJheS5mcm9tKGFycik7IH0gfSAvKiBAZmxvdyAqL1xuXG5mdW5jdGlvbiBjcmVhdGVPYnNlcnZhYmxlRnJvbUFycmF5KGFyciAvKjogQXJyYXk8YW55PiovKSAvKjogT2JzZXJ2YWJsZTxBcnJheTxhbnk+PiovIHtcbiAgaWYgKGFyci5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gX09ic2VydmFibGUuT2JzZXJ2YWJsZS5vZihhcnIpO1xuICB9XG5cbiAgdmFyIG9ic2VydmFibGVzIC8qOiBBcnJheTxPYnNlcnZhYmxlPiovID0gYXJyLm1hcChfYXNPYnNlcnZhYmxlLmFzT2JzZXJ2YWJsZSk7XG5cbiAgcmV0dXJuIF9PYnNlcnZhYmxlLk9ic2VydmFibGUuY29tYmluZUxhdGVzdC5hcHBseShfT2JzZXJ2YWJsZS5PYnNlcnZhYmxlLCBfdG9Db25zdW1hYmxlQXJyYXkob2JzZXJ2YWJsZXMpKTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmNyZWF0ZVBhdGNoQ2hpbGRyZW4gPSB1bmRlZmluZWQ7XG5cbnZhciBfZGlmdCA9IHJlcXVpcmUoJ2RpZnQnKTtcblxudmFyIF9kaWZ0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2RpZnQpO1xuXG52YXIgX2tleUluZGV4ID0gcmVxdWlyZSgnLi9rZXlJbmRleCcpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG4vKiBAZmxvdyAqL1xuXG4vKjo6IGltcG9ydCB0eXBlIHtWaXJ0dWFsRWxlbWVudCwgTm9kZVByb3h5RGVjb3JhdG9yfSBmcm9tICcuL3R5cGVzJyovXG5cblxudmFyIGtleUZuIC8qOiBGdW5jdGlvbiovID0gZnVuY3Rpb24ga2V5Rm4oYSkge1xuICByZXR1cm4gYS5rZXk7XG59O1xuXG52YXIgcGF0Y2ggPSBmdW5jdGlvbiBwYXRjaChkZWNvcmF0b3IgLyo6IE5vZGVQcm94eURlY29yYXRvciovLCBwcmV2aW91c0NoaWxkcmVuIC8qOiBBcnJheTxWaXJ0dWFsRWxlbWVudD4qLywgbmV4dENoaWxkcmVuIC8qOiBBcnJheTxWaXJ0dWFsRWxlbWVudD4qLykgLyo6IHZvaWQqLyB7XG4gIHZhciBwcmV2aW91c0luZGV4ID0gKDAsIF9rZXlJbmRleC5rZXlJbmRleCkocHJldmlvdXNDaGlsZHJlbik7XG4gIHZhciBuZXh0SW5kZXggPSAoMCwgX2tleUluZGV4LmtleUluZGV4KShuZXh0Q2hpbGRyZW4pO1xuXG4gIGZ1bmN0aW9uIGFwcGx5KHR5cGUgLyo6IG51bWJlciovLCBwcmV2aW91cyAvKjogT2JqZWN0Ki8sIG5leHQgLyo6IE9iamVjdCovLCBpbmRleCAvKjogbnVtYmVyKi8pIC8qOiB2b2lkKi8ge1xuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSBfZGlmdC5DUkVBVEU6XG4gICAgICAgIGRlY29yYXRvci5pbnNlcnRDaGlsZChuZXh0LnZub2RlLCBpbmRleCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBfZGlmdC5VUERBVEU6XG4gICAgICAgIGRlY29yYXRvci51cGRhdGVDaGlsZChwcmV2aW91cy52bm9kZSwgbmV4dC52bm9kZSwgaW5kZXgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgX2RpZnQuTU9WRTpcbiAgICAgICAgZGVjb3JhdG9yLm1vdmVDaGlsZChwcmV2aW91cy52bm9kZSwgbmV4dC52bm9kZSwgaW5kZXgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgX2RpZnQuUkVNT1ZFOlxuICAgICAgICBkZWNvcmF0b3IucmVtb3ZlQ2hpbGQocHJldmlvdXMudm5vZGUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICAoMCwgX2RpZnQyLmRlZmF1bHQpKHByZXZpb3VzSW5kZXgsIG5leHRJbmRleCwgYXBwbHksIGtleUZuKTtcbn07XG5cbnZhciBjcmVhdGVQYXRjaENoaWxkcmVuID0gZXhwb3J0cy5jcmVhdGVQYXRjaENoaWxkcmVuID0gZnVuY3Rpb24gY3JlYXRlUGF0Y2hDaGlsZHJlbihkZWNvcmF0b3IgLyo6IE5vZGVQcm94eURlY29yYXRvciovKSAvKjogRnVuY3Rpb24qLyB7XG4gIHZhciBwcmV2aW91cyAvKjogQXJyYXk8VmlydHVhbEVsZW1lbnQ+Ki8gPSBbXTtcblxuICByZXR1cm4gZnVuY3Rpb24gKG5leHQgLyo6IEFycmF5PFZpcnR1YWxFbGVtZW50PiovKSAvKjogQXJyYXk8VmlydHVhbEVsZW1lbnQ+Ki8ge1xuICAgIGlmIChwcmV2aW91cy5sZW5ndGggIT09IDAgfHwgbmV4dC5sZW5ndGggIT09IDApIHtcbiAgICAgIHBhdGNoKGRlY29yYXRvciwgcHJldmlvdXMsIG5leHQpO1xuICAgIH1cblxuICAgIHByZXZpb3VzID0gbmV4dDtcbiAgICByZXR1cm4gbmV4dDtcbiAgfTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5jcmVhdGVQYXRjaFByb3BlcnRpZXMgPSBjcmVhdGVQYXRjaFByb3BlcnRpZXM7XG4vKiBAZmxvdyAqL1xuXG4vKjo6IGltcG9ydCB0eXBlIHtOb2RlUHJveHl9IGZyb20gJy4vTm9kZVByb3h5JyovXG5cblxuZnVuY3Rpb24gcGF0Y2hQcm9wZXJ0aWVzKG5vZGVQcm94eSAvKjogTm9kZVByb3h5Ki8sIHByb3BzIC8qOiBPYmplY3QqLywgb2xkUHJvcHMgLyo6IE9iamVjdCovKSAvKjogT2JqZWN0Ki8ge1xuICBmb3IgKHZhciBrZXkgaW4gcHJvcHMpIHtcbiAgICBpZiAocHJvcHNba2V5XSAhPT0gb2xkUHJvcHNba2V5XSkge1xuICAgICAgbm9kZVByb3h5LnNldEF0dHJpYnV0ZShrZXksIHByb3BzW2tleV0pO1xuICAgIH1cbiAgfVxuXG4gIGZvciAodmFyIF9rZXkgaW4gb2xkUHJvcHMpIHtcbiAgICBpZiAoIShfa2V5IGluIHByb3BzKSkge1xuICAgICAgbm9kZVByb3h5LnJlbW92ZUF0dHJpYnV0ZShfa2V5KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcHJvcHM7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBhdGNoUHJvcGVydGllcyhub2RlUHJveHkgLyo6IE5vZGVQcm94eSovKSAvKjogRnVuY3Rpb24qLyB7XG4gIHZhciBwcmV2aW91cyAvKjogT2JqZWN0Ki8gPSB7fTtcblxuICByZXR1cm4gZnVuY3Rpb24gKG5leHQgLyo6IE9iamVjdCovKSAvKjogdm9pZCovIHtcbiAgICBwcmV2aW91cyA9IHBhdGNoUHJvcGVydGllcyhub2RlUHJveHksIG5leHQsIHByZXZpb3VzKTtcbiAgfTtcbn0iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbi8qIEBmbG93ICovXG5cbnZhciBlbXB0eU9iamVjdCA9IGV4cG9ydHMuZW1wdHlPYmplY3QgPSBPYmplY3QuZnJlZXplKHt9KTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBleHBvcnRzLmFkZEV2ZW50TGlzdGVuZXIgPSB1bmRlZmluZWQ7XG5cbnZhciBfZG9tRGVsZWdhdG9yID0gcmVxdWlyZSgnZG9tLWRlbGVnYXRvcicpO1xuXG52YXIgX2RvbURlbGVnYXRvcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9kb21EZWxlZ2F0b3IpO1xuXG52YXIgX2RvbURlbGVnYXRvcjMgPSByZXF1aXJlKCdkb20tZGVsZWdhdG9yL2RvbS1kZWxlZ2F0b3InKTtcblxudmFyIF9kb21EZWxlZ2F0b3I0ID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfZG9tRGVsZWdhdG9yMyk7XG5cbnZhciBfZXZlbnRzTGlzdCA9IHJlcXVpcmUoJy4vZXZlbnRzTGlzdCcpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG52YXIgZGVsZWdhdG9yIC8qOiBEb21EZWxlZ2F0b3IqLyA9ICgwLCBfZG9tRGVsZWdhdG9yMi5kZWZhdWx0KSgpOyAvKiBAZmxvdyAqL1xuXG52YXIgbGVuIC8qOiBudW1iZXIqLyA9IF9ldmVudHNMaXN0LmV2ZW50c0xpc3QubGVuZ3RoO1xudmFyIGkgLyo6IG51bWJlciovID0gLTE7XG5cbndoaWxlICgrK2kgPCBsZW4pIHtcbiAgdmFyIGV2ZW50IC8qOiBzdHJpbmcqLyA9IF9ldmVudHNMaXN0LmV2ZW50c0xpc3RbaV0udG9Mb3dlckNhc2UoKTtcbiAgZGVsZWdhdG9yLmxpc3RlblRvKGV2ZW50KTtcbn1cblxudmFyIGFkZEV2ZW50TGlzdGVuZXIgPSBleHBvcnRzLmFkZEV2ZW50TGlzdGVuZXIgPSBkZWxlZ2F0b3IuYWRkRXZlbnRMaXN0ZW5lci5iaW5kKGRlbGVnYXRvcik7XG52YXIgcmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGV4cG9ydHMucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGRlbGVnYXRvci5yZW1vdmVFdmVudExpc3RlbmVyLmJpbmQoZGVsZWdhdG9yKTsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbi8qIEBmbG93ICovXG5cbnZhciBldmVudHNMaXN0IC8qOiBBcnJheTxzdHJpbmc+Ki8gPSBleHBvcnRzLmV2ZW50c0xpc3QgPSBbXCJBYm9ydFwiLCBcIkJsdXJcIiwgXCJDYW5jZWxcIiwgXCJDYW5QbGF5XCIsIFwiQ2FuUGxheVRocm91Z2hcIiwgXCJDaGFuZ2VcIiwgXCJDbGlja1wiLCBcIkNvbXBvc2l0aW9uU3RhcnRcIiwgXCJDb21wb3NpdGlvblVwZGF0ZVwiLCBcIkNvbXBvc2l0aW9uRW5kXCIsIFwiQ29udGV4dE1lbnVcIiwgXCJDb3B5XCIsIFwiQ3VlQ2hhbmdlXCIsIFwiQ3V0XCIsIFwiRGJsQ2xpY2tcIiwgXCJEcmFnXCIsIFwiRHJhZ0VuZFwiLCBcIkRyYWdFeGl0XCIsIFwiRHJhZ0VudGVyXCIsIFwiRHJhZ0xlYXZlXCIsIFwiRHJhZ092ZXJcIiwgXCJEcmFnU3RhcnRcIiwgXCJEcm9wXCIsIFwiRHVyYXRpb25DaGFuZ2VcIiwgXCJFbXB0aWVkXCIsIFwiRW5jcnlwdGVkXCIsIFwiRW5kZWRcIiwgXCJFcnJvclwiLCBcIkZvY3VzXCIsIFwiRm9jdXNJblwiLCBcIkZvY3VzT3V0XCIsIFwiSW5wdXRcIiwgXCJJbnZhbGlkXCIsIFwiS2V5RG93blwiLCBcIktleVByZXNzXCIsIFwiS2V5VXBcIiwgXCJMb2FkXCIsIFwiTG9hZGVkRGF0YVwiLCBcIkxvYWRlZE1ldGFEYXRhXCIsIFwiTG9hZFN0YXJ0XCIsIFwiTW91c2VEb3duXCIsIFwiTW91c2VFbnRlclwiLCBcIk1vdXNlTGVhdmVcIiwgXCJNb3VzZU1vdmVcIiwgXCJNb3VzZU91dFwiLCBcIk1vdXNlT3ZlclwiLCBcIk1vdXNlVXBcIiwgXCJQYXN0ZVwiLCBcIlBhdXNlXCIsIFwiUGxheVwiLCBcIlBsYXlpbmdcIiwgXCJQcm9ncmVzc1wiLCBcIlJhdGVDaGFuZ2VcIiwgXCJSZXNldFwiLCBcIlJlc2l6ZVwiLCBcIlNjcm9sbFwiLCBcIlNlYXJjaFwiLCBcIlNlZWtlZFwiLCBcIlNlZWtpbmdcIiwgXCJTZWxlY3RcIiwgXCJTaG93XCIsIFwiU3RhbGxlZFwiLCBcIlN1Ym1pdFwiLCBcIlN1c3BlbmRcIiwgXCJUaW1lVXBkYXRlXCIsIFwiVG9nZ2xlXCIsIFwiVG91Y2hDYW5jZWxcIiwgXCJUb3VjaEVuZFwiLCBcIlRvdWNoTW92ZVwiLCBcIlRvdWNoU3RhcnRcIiwgXCJWb2x1bWVDaGFuZ2VcIiwgXCJXYWl0aW5nXCIsIFwiV2hlZWxcIixcblxuLy8gY3VzdG9tXG5cIk1vdW50XCIsIFwiVW5tb3VudFwiXTtcblxudmFyIGV2ZW50TGlzdE1hcCAvKjogT2JqZWN0Ki8gPSBleHBvcnRzLmV2ZW50TGlzdE1hcCA9IGV2ZW50c0xpc3QucmVkdWNlKGZ1bmN0aW9uIChhY2MsIGV2ZW50KSB7XG4gIGFjY1tcIm9uXCIgKyBldmVudF0gPSB0cnVlO1xuICByZXR1cm4gYWNjO1xufSwge30pOyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5mbGF0dGVuID0gZmxhdHRlbjtcbi8qIEBmbG93ICovXG5cbmZ1bmN0aW9uIGZsYXR0ZW4oYXJyIC8qOiBBcnJheTxhbnk+Ki8pIC8qOiBBcnJheTxhbnk+Ki8ge1xuICB2YXIgbGVuIC8qOiBudW1iZXIqLyA9IGFyci5sZW5ndGg7XG4gIHZhciBpIC8qOiBudW1iZXIqLyA9IC0xO1xuICB2YXIgcmVzdWx0IC8qOiBBcnJheTxhbnk+Ki8gPSBbXTtcblxuICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgdmFyIG1lbWJlciAvKjogYW55Ki8gPSBhcnJbaV07XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShtZW1iZXIpKSB7XG4gICAgICByZXN1bHQgPSByZXN1bHQuY29uY2F0KGZsYXR0ZW4obWVtYmVyKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1lbWJlcik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn0iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZ2V0ID0gZ2V0O1xuZnVuY3Rpb24gZ2V0KG9iaiwga2V5KSB7XG4gIHJldHVybiBvYmpba2V5XTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmggPSBoO1xuXG52YXIgX1ZpcnR1YWxDb21wb25lbnQgPSByZXF1aXJlKCcuL1ZpcnR1YWxDb21wb25lbnQnKTtcblxudmFyIF9WaXJ0dWFsTm9kZSA9IHJlcXVpcmUoJy4vVmlydHVhbE5vZGUnKTtcblxudmFyIF9pcyA9IHJlcXVpcmUoJy4vaXMnKTtcblxudmFyIF9mbGF0dGVuID0gcmVxdWlyZSgnLi9mbGF0dGVuJyk7XG5cbnZhciBfZW1wdHlPYmplY3QgPSByZXF1aXJlKCcuL2VtcHR5T2JqZWN0Jyk7XG5cbi8qOjogaW1wb3J0IHR5cGUge1ZpcnR1YWxFbGVtZW50fSBmcm9tICcuL3R5cGVzJyovIC8qIEBmbG93IHdlYWsgKi9cblxuZnVuY3Rpb24gaCh0YWdOYW1lLCBfcHJvcHMpIC8qOiBWaXJ0dWFsRWxlbWVudCovIHtcbiAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIF9jaGlsZHJlbiA9IEFycmF5KF9sZW4gPiAyID8gX2xlbiAtIDIgOiAwKSwgX2tleSA9IDI7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICBfY2hpbGRyZW5bX2tleSAtIDJdID0gYXJndW1lbnRzW19rZXldO1xuICB9XG5cbiAgdmFyIGNoaWxkcmVuID0gKDAsIF9mbGF0dGVuLmZsYXR0ZW4pKF9jaGlsZHJlbik7XG4gIHZhciBwcm9wcyA9IF9wcm9wcyB8fCBfZW1wdHlPYmplY3QuZW1wdHlPYmplY3Q7XG5cbiAgaWYgKCgwLCBfaXMuaXNTdHJpbmcpKHRhZ05hbWUpKSB7XG4gICAgcmV0dXJuIF9WaXJ0dWFsTm9kZS5WaXJ0dWFsTm9kZS5jcmVhdGUodGFnTmFtZSwgcHJvcHMsIGNoaWxkcmVuKTtcbiAgfVxuXG4gIHJldHVybiBfVmlydHVhbENvbXBvbmVudC5WaXJ0dWFsQ29tcG9uZW50LmNyZWF0ZSh0YWdOYW1lLCBwcm9wcywgY2hpbGRyZW4pO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMucmVuZGVyID0gZXhwb3J0cy5oID0gdW5kZWZpbmVkO1xuXG52YXIgX2ggPSByZXF1aXJlKCcuL2gnKTtcblxudmFyIF9yZW5kZXIgPSByZXF1aXJlKCcuL3JlbmRlcicpO1xuXG5mdW5jdGlvbiBZb2xrKCkge31cbllvbGsucHJvdG90eXBlID0geyBoOiBfaC5oLCByZW5kZXI6IF9yZW5kZXIucmVuZGVyIH07XG5cbmV4cG9ydHMuaCA9IF9oLmg7XG5leHBvcnRzLnJlbmRlciA9IF9yZW5kZXIucmVuZGVyO1xuZXhwb3J0cy5kZWZhdWx0ID0gbmV3IFlvbGsoKTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmlzRGVmaW5lZCA9IGlzRGVmaW5lZDtcbmV4cG9ydHMuaXNFbXB0eU9iamVjdCA9IGlzRW1wdHlPYmplY3Q7XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuZXhwb3J0cy5pc09ic2VydmFibGUgPSBpc09ic2VydmFibGU7XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5leHBvcnRzLmlzU3ViamVjdCA9IGlzU3ViamVjdDtcbmV4cG9ydHMuaXNWaXJ0dWFsID0gaXNWaXJ0dWFsO1xuXG52YXIgX09ic2VydmFibGUgPSByZXF1aXJlKCdyeGpzL09ic2VydmFibGUnKTtcblxudmFyIF9TdWJqZWN0ID0gcmVxdWlyZSgncnhqcy9TdWJqZWN0Jyk7XG5cbnZhciBfc3ltYm9sID0gcmVxdWlyZSgnLi9zeW1ib2wnKTtcblxuZnVuY3Rpb24gaXNEZWZpbmVkKG9iaiAvKjogYW55Ki8pIC8qOiBib29sZWFuKi8ge1xuICByZXR1cm4gdHlwZW9mIG9iaiAhPT0gJ3VuZGVmaW5lZCc7XG59IC8qIEBmbG93ICovXG5cbmZ1bmN0aW9uIGlzRW1wdHlPYmplY3Qob2JqIC8qOiBhbnkqLykgLyo6IGJvb2xlYW4qLyB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA9PT0gMDtcbn1cblxuZnVuY3Rpb24gaXNGdW5jdGlvbihvYmogLyo6IGFueSovKSAvKjogYm9vbGVhbiovIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihvYmogLyo6IGFueSovKSAvKjogYm9vbGVhbiovIHtcbiAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09ic2VydmFibGUob2JqIC8qOiBhbnkqLykgLyo6IGJvb2xlYW4qLyB7XG4gIHJldHVybiBvYmogaW5zdGFuY2VvZiBfT2JzZXJ2YWJsZS5PYnNlcnZhYmxlO1xufVxuXG5mdW5jdGlvbiBpc1N0cmluZyhvYmogLyo6IGFueSovKSAvKjogYm9vbGVhbiovIHtcbiAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdzdHJpbmcnO1xufVxuXG5mdW5jdGlvbiBpc1N1YmplY3Qob2JqIC8qOiBhbnkqLykgLyo6IGJvb2xlYW4qLyB7XG4gIHJldHVybiBvYmogaW5zdGFuY2VvZiBfU3ViamVjdC5TdWJqZWN0O1xufVxuXG5mdW5jdGlvbiBpc1ZpcnR1YWwob2JqIC8qOiBhbnkqLykgLyo6IGJvb2xlYW4qLyB7XG4gIHJldHVybiAhIW9iaiAmJiBvYmpbX3N5bWJvbC4kJHZpcnR1YWxdO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMua2V5SW5kZXggPSBrZXlJbmRleDtcbi8qIEBmbG93ICovXG5cbi8qOjogaW1wb3J0IHR5cGUge1ZpcnR1YWxOb2RlfSBmcm9tICcuL1ZpcnR1YWxOb2RlJyovXG5mdW5jdGlvbiBrZXlJbmRleChjaGlsZHJlbiAvKjogQXJyYXk8VmlydHVhbE5vZGU+Ki8pIC8qOiBBcnJheTxPYmplY3Q+Ki8ge1xuICB2YXIgbGVuIC8qOiBudW1iZXIqLyA9IGNoaWxkcmVuLmxlbmd0aDtcbiAgdmFyIGFyciAvKjogQXJyYXk8T2JqZWN0PiovID0gW107XG4gIHZhciBpIC8qOiBudW1iZXIqLyA9IC0xO1xuXG4gIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICB2YXIgY2hpbGQgLyo6IFZpcnR1YWxOb2RlKi8gPSBjaGlsZHJlbltpXTtcblxuICAgIGlmICghY2hpbGQpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGFyci5wdXNoKHtcbiAgICAgIGtleTogY2hpbGQua2V5ID8gY2hpbGQudGFnTmFtZSArICctJyArIGNoaWxkLmtleSA6IGNoaWxkLnRhZ05hbWUsXG4gICAgICB2bm9kZTogY2hpbGRcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBhcnI7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5lbWl0TW91bnQgPSBlbWl0TW91bnQ7XG5leHBvcnRzLmVtaXRVbm1vdW50ID0gZW1pdFVubW91bnQ7XG5cbnZhciBfQ3VzdG9tRXZlbnQgPSByZXF1aXJlKCcuL0N1c3RvbUV2ZW50Jyk7XG5cbnZhciBfaXMgPSByZXF1aXJlKCcuL2lzJyk7XG5cbi8qIEBmbG93ICovXG5cbmZ1bmN0aW9uIGVtaXRNb3VudChub2RlIC8qOiBIVE1MRWxlbWVudCovLCBmbiAvKjogRnVuY3Rpb24gfCB2b2lkKi8pIC8qOiB2b2lkKi8ge1xuICBpZiAoKCgwLCBfaXMuaXNGdW5jdGlvbikoZm4pIHx8ICgwLCBfaXMuaXNTdWJqZWN0KShmbikpICYmIG5vZGUucGFyZW50Tm9kZSkge1xuICAgIHZhciBldmVudCAvKjogQ3VzdG9tRXZlbnQqLyA9IG5ldyBfQ3VzdG9tRXZlbnQuQ3VzdG9tRXZlbnQoJ21vdW50Jyk7XG4gICAgbm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBlbWl0VW5tb3VudChub2RlIC8qOiBIVE1MRWxlbWVudCovLCBmbiAvKjogRnVuY3Rpb24gfCB2b2lkKi8pIC8qOiB2b2lkKi8ge1xuICBpZiAoKCgwLCBfaXMuaXNGdW5jdGlvbikoZm4pIHx8ICgwLCBfaXMuaXNTdWJqZWN0KShmbikpICYmIG5vZGUucGFyZW50Tm9kZSkge1xuICAgIHZhciBldmVudCAvKjogQ3VzdG9tRXZlbnQqLyA9IG5ldyBfQ3VzdG9tRXZlbnQuQ3VzdG9tRXZlbnQoJ3VubW91bnQnKTtcbiAgICBub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICB9XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5wYXJzZVRhZyA9IHBhcnNlVGFnO1xuXG52YXIgX3BhcnNlVGFnID0gcmVxdWlyZSgncGFyc2UtdGFnJyk7XG5cbnZhciBfcGFyc2VUYWcyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcGFyc2VUYWcpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG52YXIgVEFHX0lTX09OTFlfTEVUVEVSUyA9IC9eW2EtekEtWl0qJC87XG5cbmZ1bmN0aW9uIHBhcnNlVGFnKF90YWdOYW1lLCBwcm9wcykge1xuICB2YXIgdGFnTmFtZSA9IF90YWdOYW1lO1xuXG4gIGlmICghVEFHX0lTX09OTFlfTEVUVEVSUy50ZXN0KHRhZ05hbWUpKSB7XG4gICAgdGFnTmFtZSA9ICgwLCBfcGFyc2VUYWcyLmRlZmF1bHQpKF90YWdOYW1lLCBwcm9wcykudG9Mb3dlckNhc2UoKTtcbiAgfVxuXG4gIHJldHVybiB0YWdOYW1lO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVzY3JpcHRvcnMgPSB1bmRlZmluZWQ7XG5cbnZhciBfZXZlbnRzTGlzdCA9IHJlcXVpcmUoJy4vZXZlbnRzTGlzdCcpO1xuXG52YXIgSEFTX0xPV0VSX0NBU0UgLyo6IG51bWJlciovID0gMHgxOyAvLyB0cmFuc2Zvcm0ga2V5IHRvIGFsbCBsb3dlcmNhc2Vcbi8qIEBmbG93ICovXG5cbnZhciBIQVNfREFTSEVEX0NBU0UgLyo6IG51bWJlciovID0gMHgyOyAvLyB0cmFuc2Zvcm0ga2V5IHRvIGRhc2hlZCBjYXNlXG52YXIgSEFTX0VWRU5UX0NBU0UgLyo6IG51bWJlciovID0gMHg0OyAvLyB0cmFuc2Zvcm0ga2V5IGZyb20gb25DbGljayB0byBjbGlja1xudmFyIFVTRV9FUVVBTF9TRVRURVIgLyo6IG51bWJlciovID0gMHg4OyAvLyBwcm9wcyBvbmx5IHNldHRhYmxlIHdpdGggPVxudmFyIFVTRV9TRVRfQVRUUklCVVRFIC8qOiBudW1iZXIqLyA9IDB4MTA7IC8vIHByb3BzIG9ubHkgc2V0dGFibGUgd2l0aCBzZXRBdHRyaWJ1dGVcbnZhciBVU0VfRVZFTlRfTElTVEVORVIgLyo6IG51bWJlciovID0gMHgyMDsgLy8gcHJvcHMgb25seSBzZXR0YWJsZSB3aXRoIGFkZEV2ZW50TGlzdGVuZXJcbnZhciBIQVNfQk9PTEVBTl9WQUxVRSAvKjogbnVtYmVyKi8gPSAweDQwOyAvLyBwcm9wcyBjYW4gb25seSBiZSBib29sZWFuc1xudmFyIEhBU19OVU1CRVJfVkFMVUUgLyo6IG51bWJlciovID0gMHg4MDsgLy8gcHJvcHMgY2FuIG9ubHkgYmUgbnVtYmVyc1xudmFyIElTX1NUQVIgLyo6IG51bWJlciovID0gMHgxMDA7IC8vIHByb3BzIGNhbiBiZSBhbnkgZGFzaGVkIGNhc2UsIGUuZy4gZGF0YS0qXG5cbnZhciBEQVNIRURfQ0FTRV9SRUdFWCAvKjogUmVnRXhwKi8gPSAvKD86Xlxcd3xbQS1aXXxcXGJcXHd8XFxzKykvZztcblxuZnVuY3Rpb24gY2hlY2tNYXNrKHZhbHVlIC8qOiBudW1iZXIqLywgYml0bWFzayAvKjogbnVtYmVyKi8pIC8qOiBib29sZWFuKi8ge1xuICByZXR1cm4gKHZhbHVlICYgYml0bWFzaykgPT09IGJpdG1hc2s7XG59XG5cbmZ1bmN0aW9uIG1ha2VEYXNoZWRDYXNlKGxldHRlciAvKjogc3RyaW5nKi8sIGkgLyo6IG51bWJlciovKSAvKjogc3RyaW5nKi8ge1xuICBpZiAoK2xldHRlciA9PT0gMCkge1xuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIGlmIChpID09PSAwKSB7XG4gICAgcmV0dXJuIGxldHRlci50b0xvd2VyQ2FzZSgpO1xuICB9XG5cbiAgcmV0dXJuICctJyArIGxldHRlci50b0xvd2VyQ2FzZSgpO1xufVxuXG5mdW5jdGlvbiBjb21wdXRlTmFtZShuYW1lIC8qOiBzdHJpbmcqLywgaGFzTG93ZXJDYXNlIC8qOiBib29sZWFuKi8sIGhhc0Rhc2hlZENhc2UgLyo6IGJvb2xlYW4qLywgaGFzRXZlbnRDYXNlIC8qOiBib29sZWFuKi8pIC8qOiBzdHJpbmcqLyB7XG4gIGlmIChoYXNMb3dlckNhc2UpIHtcbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpO1xuICB9IGVsc2UgaWYgKGhhc0Rhc2hlZENhc2UpIHtcbiAgICByZXR1cm4gbmFtZS5yZXBsYWNlKERBU0hFRF9DQVNFX1JFR0VYLCBtYWtlRGFzaGVkQ2FzZSk7XG4gIH0gZWxzZSBpZiAoaGFzRXZlbnRDYXNlKSB7XG4gICAgcmV0dXJuIG5hbWUuc3Vic3RyKDIpLnRvTG93ZXJDYXNlKCk7XG4gIH1cblxuICByZXR1cm4gbmFtZTtcbn1cblxudmFyIHByb3BzIC8qOiBPYmplY3QqLyA9IHtcbiAgYWNjZXB0OiBVU0VfRVFVQUxfU0VUVEVSLFxuICBhY2NlcHRDaGFyc2V0OiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0RBU0hFRF9DQVNFLFxuICBhY2Nlc3NLZXk6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgYWN0aW9uOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBhbGlnbjogVVNFX0VRVUFMX1NFVFRFUixcbiAgYWx0OiBVU0VfRVFVQUxfU0VUVEVSLFxuICBhc3luYzogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBhdXRvQ29tcGxldGU6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgYXV0b0ZvY3VzOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgYXV0b1BsYXk6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBhdXRvU2F2ZTogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICBiZ0NvbG9yOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGJvcmRlcjogVVNFX0VRVUFMX1NFVFRFUixcbiAgY2hlY2tlZDogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBjaXRlOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBjbGFzc05hbWU6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGNvbG9yOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBjb2xTcGFuOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGNvbnRlbnQ6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGNvbnRlbnRFZGl0YWJsZTogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIGNvbnRyb2xzOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIGNvb3JkczogVVNFX0VRVUFMX1NFVFRFUixcbiAgZGVmYXVsdDogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBkZWZlcjogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBkaXI6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGRpck5hbWU6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgZGlzYWJsZWQ6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgZHJhZ2dhYmxlOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIGRyb3Bab25lOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGVuY1R5cGU6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgZm9yOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBoZWFkZXJzOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBoZWlnaHQ6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGhyZWY6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGhyZWZMYW5nOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGh0dHBFcXVpdjogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19EQVNIRURfQ0FTRSxcbiAgaWNvbjogVVNFX0VRVUFMX1NFVFRFUixcbiAgaWQ6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGlzTWFwOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgaXRlbVByb3A6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAga2V5VHlwZTogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICBraW5kOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBsYWJlbDogVVNFX0VRVUFMX1NFVFRFUixcbiAgbGFuZzogVVNFX0VRVUFMX1NFVFRFUixcbiAgbG9vcDogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBtYXg6IFVTRV9FUVVBTF9TRVRURVIsXG4gIG1ldGhvZDogVVNFX0VRVUFMX1NFVFRFUixcbiAgbWluOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBtdWx0aXBsZTogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBuYW1lOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBub1ZhbGlkYXRlOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgb3BlbjogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBvcHRpbXVtOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBwYXR0ZXJuOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBwaW5nOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBwbGFjZWhvbGRlcjogVVNFX0VRVUFMX1NFVFRFUixcbiAgcG9zdGVyOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBwcmVsb2FkOiBVU0VfRVFVQUxfU0VUVEVSLFxuICByYWRpb0dyb3VwOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIHJlYWRPbmx5OiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgcmVsOiBVU0VfRVFVQUxfU0VUVEVSLFxuICByZXF1aXJlZDogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICByZXZlcnNlZDogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICByb2xlOiBVU0VfRVFVQUxfU0VUVEVSLFxuICByb3dTcGFuOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UgfCBIQVNfTlVNQkVSX1ZBTFVFLFxuICBzYW5kYm94OiBVU0VfRVFVQUxfU0VUVEVSLFxuICBzY29wZTogVVNFX0VRVUFMX1NFVFRFUixcbiAgc2VhbWxlc3M6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgc2VsZWN0ZWQ6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgc3BhbjogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19OVU1CRVJfVkFMVUUsXG4gIHNyYzogVVNFX0VRVUFMX1NFVFRFUixcbiAgc3JjRG9jOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIHNyY0xhbmc6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgc3RhcnQ6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTlVNQkVSX1ZBTFVFLFxuICBzdGVwOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBzdW1tYXJ5OiBVU0VfRVFVQUxfU0VUVEVSLFxuICB0YWJJbmRleDogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICB0YXJnZXQ6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHRpdGxlOiBVU0VfRVFVQUxfU0VUVEVSLFxuICB0eXBlOiBVU0VfRVFVQUxfU0VUVEVSLFxuICB1c2VNYXA6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgdmFsdWU6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHdpZHRoOiBVU0VfRVFVQUxfU0VUVEVSLFxuICB3cmFwOiBVU0VfRVFVQUxfU0VUVEVSLFxuXG4gIGFsbG93RnVsbFNjcmVlbjogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTE9XRVJfQ0FTRSB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBhbGxvd1RyYW5zcGFyZW5jeTogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgY2FwdHVyZTogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgY2hhcnNldDogVVNFX1NFVF9BVFRSSUJVVEUsXG4gIGNoYWxsZW5nZTogVVNFX1NFVF9BVFRSSUJVVEUsXG4gIGNvZGVCYXNlOiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19MT1dFUl9DQVNFLFxuICBjb2xzOiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19OVU1CRVJfVkFMVUUsXG4gIGNvbnRleHRNZW51OiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19MT1dFUl9DQVNFLFxuICBkYXRlVGltZTogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgZm9ybTogVVNFX1NFVF9BVFRSSUJVVEUsXG4gIGZvcm1BY3Rpb246IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGZvcm1FbmNUeXBlOiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19MT1dFUl9DQVNFLFxuICBmb3JtTWV0aG9kOiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19MT1dFUl9DQVNFLFxuICBmb3JtVGFyZ2V0OiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19MT1dFUl9DQVNFLFxuICBmcmFtZUJvcmRlcjogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgaGlkZGVuOiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBpbnB1dE1vZGU6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGlzOiBVU0VfU0VUX0FUVFJJQlVURSxcbiAgbGlzdDogVVNFX1NFVF9BVFRSSUJVVEUsXG4gIG1hbmlmZXN0OiBVU0VfU0VUX0FUVFJJQlVURSxcbiAgbWF4TGVuZ3RoOiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19MT1dFUl9DQVNFLFxuICBtZWRpYTogVVNFX1NFVF9BVFRSSUJVVEUsXG4gIG1pbkxlbmd0aDogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgcm93czogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTlVNQkVSX1ZBTFVFLFxuICBzaXplOiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19OVU1CRVJfVkFMVUUsXG4gIHNpemVzOiBVU0VfU0VUX0FUVFJJQlVURSxcbiAgc3JjU2V0OiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19MT1dFUl9DQVNFLFxuICBzdHlsZTogVVNFX1NFVF9BVFRSSUJVVEUsXG5cbiAgYXJpYTogSVNfU1RBUixcbiAgZGF0YTogSVNfU1RBUlxufTtcblxuX2V2ZW50c0xpc3QuZXZlbnRzTGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChldmVudCkge1xuICBwcm9wc1snb24nICsgZXZlbnRdID0gVVNFX0VWRU5UX0xJU1RFTkVSIHwgSEFTX0VWRU5UX0NBU0U7XG59KTtcblxudmFyIGRlc2NyaXB0b3JzIC8qOiBPYmplY3QqLyA9IHt9O1xudmFyIGtleXMgLyo6IEFycmF5PHN0cmluZz4qLyA9IE9iamVjdC5rZXlzKHByb3BzKTtcbnZhciBsZW4gLyo6IG51bWJlciovID0ga2V5cy5sZW5ndGg7XG52YXIgaSAvKjogbnVtYmVyKi8gPSAtMTtcblxud2hpbGUgKCsraSA8IGxlbikge1xuICB2YXIga2V5IC8qOiBzdHJpbmcqLyA9IGtleXNbaV07XG4gIHZhciBwcm9wIC8qOiBudW1iZXIqLyA9IHByb3BzW2tleV07XG4gIHZhciBoYXNMb3dlckNhc2UgLyo6IGJvb2xlYW4qLyA9IGNoZWNrTWFzayhwcm9wLCBIQVNfTE9XRVJfQ0FTRSk7XG4gIHZhciBoYXNEYXNoZWRDYXNlIC8qOiBib29sZWFuKi8gPSBjaGVja01hc2socHJvcCwgSEFTX0RBU0hFRF9DQVNFKTtcbiAgdmFyIGhhc0V2ZW50Q2FzZSAvKjogYm9vbGVhbiovID0gY2hlY2tNYXNrKHByb3AsIEhBU19FVkVOVF9DQVNFKTtcbiAgdmFyIHVzZUVxdWFsU2V0dGVyIC8qOiBib29sZWFuKi8gPSBjaGVja01hc2socHJvcCwgVVNFX0VRVUFMX1NFVFRFUik7XG4gIHZhciB1c2VTZXRBdHRyaWJ1dGUgLyo6IGJvb2xlYW4qLyA9IGNoZWNrTWFzayhwcm9wLCBVU0VfU0VUX0FUVFJJQlVURSk7XG4gIHZhciB1c2VFdmVudExpc3RlbmVyIC8qOiBib29sZWFuKi8gPSBjaGVja01hc2socHJvcCwgVVNFX0VWRU5UX0xJU1RFTkVSKTtcbiAgdmFyIGhhc0Jvb2xlYW5WYWx1ZSAvKjogYm9vbGVhbiovID0gY2hlY2tNYXNrKHByb3AsIEhBU19CT09MRUFOX1ZBTFVFKTtcbiAgdmFyIGhhc051bWJlclZhbHVlIC8qOiBib29sZWFuKi8gPSBjaGVja01hc2socHJvcCwgSEFTX05VTUJFUl9WQUxVRSk7XG4gIHZhciBpc1N0YXIgLyo6IGJvb2xlYW4qLyA9IGNoZWNrTWFzayhwcm9wLCBJU19TVEFSKTtcbiAgdmFyIGNvbXB1dGVkIC8qOiBzdHJpbmcqLyA9IGNvbXB1dGVOYW1lKGtleSwgaGFzTG93ZXJDYXNlLCBoYXNEYXNoZWRDYXNlLCBoYXNFdmVudENhc2UpO1xuXG4gIGRlc2NyaXB0b3JzW2tleV0gPSB7XG4gICAgdXNlRXF1YWxTZXR0ZXI6IHVzZUVxdWFsU2V0dGVyLFxuICAgIHVzZVNldEF0dHJpYnV0ZTogdXNlU2V0QXR0cmlidXRlLFxuICAgIHVzZUV2ZW50TGlzdGVuZXI6IHVzZUV2ZW50TGlzdGVuZXIsXG4gICAgaGFzQm9vbGVhblZhbHVlOiBoYXNCb29sZWFuVmFsdWUsXG4gICAgaGFzTnVtYmVyVmFsdWU6IGhhc051bWJlclZhbHVlLFxuICAgIGlzU3RhcjogaXNTdGFyLFxuICAgIGNvbXB1dGVkOiBjb21wdXRlZFxuICB9O1xufVxuXG5leHBvcnRzLmRlc2NyaXB0b3JzID0gZGVzY3JpcHRvcnM7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5yZW5kZXIgPSByZW5kZXI7XG5cbnZhciBfYmF0Y2hJbnNlcnRNZXNzYWdlcyA9IHJlcXVpcmUoJy4vYmF0Y2hJbnNlcnRNZXNzYWdlcycpO1xuXG52YXIgX05vZGVQcm94eSA9IHJlcXVpcmUoJy4vTm9kZVByb3h5Jyk7XG5cbnZhciBfaXMgPSByZXF1aXJlKCcuL2lzJyk7XG5cbnZhciBfc3ltYm9sID0gcmVxdWlyZSgnLi9zeW1ib2wnKTtcblxudmFyIF90eXBlcyA9IHJlcXVpcmUoJy4vdHlwZXMnKTtcblxuZnVuY3Rpb24gcmVuZGVyKHZub2RlIC8qOiBWaXJ0dWFsRWxlbWVudCovLCBub2RlIC8qOiBIVE1MRWxlbWVudCovKSAvKjogdm9pZCovIHtcbiAgdmFyIGNvbnRhaW5lclByb3h5IC8qOiBOb2RlUHJveHkqLyA9IF9Ob2RlUHJveHkuTm9kZVByb3h5LmZyb21FbGVtZW50KG5vZGUpO1xuICB2YXIgcHJldmlvdXMgLyo6IFZpcnR1YWxFbGVtZW50Ki8gPSBjb250YWluZXJQcm94eS5nZXRBdHRyaWJ1dGUoX3N5bWJvbC4kJHJvb3QpO1xuXG4gIGlmICgoMCwgX2lzLmlzRGVmaW5lZCkocHJldmlvdXMpKSB7XG4gICAgcHJldmlvdXMuZGVzdHJveSgpO1xuICB9XG5cbiAgKDAsIF9iYXRjaEluc2VydE1lc3NhZ2VzLmJhdGNoSW5zZXJ0TWVzc2FnZXMpKGZ1bmN0aW9uIChxdWV1ZSkge1xuICAgIHZub2RlLmluaXRpYWxpemUoKTtcbiAgICBjb250YWluZXJQcm94eS5yZXBsYWNlQ2hpbGQodm5vZGUuZ2V0Tm9kZVByb3h5KCksIDApO1xuICAgIHF1ZXVlLnB1c2godm5vZGUpO1xuICB9KTtcblxuICBjb250YWluZXJQcm94eS5zZXRBdHRyaWJ1dGUoX3N5bWJvbC4kJHJvb3QsIHZub2RlKTtcbn0gLyogQGZsb3cgKi8iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuc2V0ID0gc2V0O1xuZnVuY3Rpb24gc2V0KG9iaiwga2V5LCB2YWx1ZSkge1xuICBvYmpba2V5XSA9IHZhbHVlO1xufSIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xudmFyIF9TeW1ib2wgPSBnbG9iYWwuU3ltYm9sO1xuXG52YXIgc3ltYm9scyA9IHtcbiAgJCR2aXJ0dWFsOiBcIkBAWU9MS19WSVJUVUFMXCIsXG4gICQkY29tcG9uZW50VWlkOiBcIkBAWU9MS19DT01QT05FTlRfVUlEXCIsXG4gICQkcm9vdDogXCJAQFlPTEtfUk9PVFwiXG59O1xuXG5pZiAodHlwZW9mIF9TeW1ib2wgPT09IFwiZnVuY3Rpb25cIikge1xuICBpZiAodHlwZW9mIF9TeW1ib2wuZm9yID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBPYmplY3Qua2V5cyhzeW1ib2xzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIHN5bWJvbHNba2V5XSA9IF9TeW1ib2wuZm9yKHN5bWJvbHNba2V5XSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgT2JqZWN0LmtleXMoc3ltYm9scykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICBzeW1ib2xzW2tleV0gPSBfU3ltYm9sKHN5bWJvbHNba2V5XSk7XG4gICAgfSk7XG4gIH1cbn1cblxudmFyICQkdmlydHVhbCA9IHN5bWJvbHMuJCR2aXJ0dWFsO1xudmFyICQkY29tcG9uZW50VWlkID0gc3ltYm9scy4kJGNvbXBvbmVudFVpZDtcbnZhciAkJHJvb3QgPSBzeW1ib2xzLiQkcm9vdDtcbmV4cG9ydHMuJCR2aXJ0dWFsID0gJCR2aXJ0dWFsO1xuZXhwb3J0cy4kJGNvbXBvbmVudFVpZCA9ICQkY29tcG9uZW50VWlkO1xuZXhwb3J0cy4kJHJvb3QgPSAkJHJvb3Q7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKjo6IGltcG9ydCB0eXBlIHtWaXJ0dWFsTm9kZX0gZnJvbSAnLi9WaXJ0dWFsTm9kZScqL1xuLyo6OiBpbXBvcnQgdHlwZSB7VmlydHVhbENvbXBvbmVudH0gZnJvbSAnLi9WaXJ0dWFsQ29tcG9uZW50JyovXG4vKjo6IGV4cG9ydCB0eXBlIFZpcnR1YWxFbGVtZW50ID0gVmlydHVhbE5vZGUgfCBWaXJ0dWFsQ29tcG9uZW50Ki9cbi8qOjogZXhwb3J0IHR5cGUgTm9kZVByb3h5RGVjb3JhdG9yID0ge1xuICBpbnNlcnRDaGlsZCAoY2hpbGQ6IFZpcnR1YWxOb2RlLCBpbmRleDogbnVtYmVyKTogdm9pZDtcbiAgdXBkYXRlQ2hpbGQgKHByZXZpb3VzOiBWaXJ0dWFsTm9kZSwgbmV4dDogVmlydHVhbE5vZGUpOiB2b2lkO1xuICBtb3ZlQ2hpbGQgKHByZXZpb3VzOiBWaXJ0dWFsTm9kZSwgbmV4dDogVmlydHVhbE5vZGUsIGluZGV4OiBudW1iZXIpOiB2b2lkO1xuICByZW1vdmVDaGlsZCAoY2hpbGQ6IFZpcnR1YWxOb2RlKTogdm9pZDtcbn0qLyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMud3JhcFRleHQgPSB3cmFwVGV4dDtcblxudmFyIF9oID0gcmVxdWlyZSgnLi9oJyk7XG5cbnZhciBfVmlydHVhbE5vZGUgPSByZXF1aXJlKCcuL1ZpcnR1YWxOb2RlJyk7XG5cbnZhciBfaXMgPSByZXF1aXJlKCcuL2lzJyk7XG5cbmZ1bmN0aW9uIHdyYXAob2JqIC8qOiBhbnkqLykgLyo6IFZpcnR1YWxOb2RlKi8ge1xuICBpZiAoKDAsIF9pcy5pc1ZpcnR1YWwpKG9iaikpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgcmV0dXJuICgwLCBfaC5oKSgnc3BhbicsIHsgdGV4dENvbnRlbnQ6IG9iai50b1N0cmluZygpIH0pO1xufSAvKiBAZmxvdyAqL1xuXG5mdW5jdGlvbiB3cmFwVGV4dChhcnIgLyo6IEFycmF5PGFueT4qLykgLyo6IEFycmF5PFZpcnR1YWxOb2RlPiovIHtcbiAgcmV0dXJuIGFyci5tYXAod3JhcCk7XG59IiwiLyoqXG4gKiBjdWlkLmpzXG4gKiBDb2xsaXNpb24tcmVzaXN0YW50IFVJRCBnZW5lcmF0b3IgZm9yIGJyb3dzZXJzIGFuZCBub2RlLlxuICogU2VxdWVudGlhbCBmb3IgZmFzdCBkYiBsb29rdXBzIGFuZCByZWNlbmN5IHNvcnRpbmcuXG4gKiBTYWZlIGZvciBlbGVtZW50IElEcyBhbmQgc2VydmVyLXNpZGUgbG9va3Vwcy5cbiAqXG4gKiBFeHRyYWN0ZWQgZnJvbSBDTENUUlxuICpcbiAqIENvcHlyaWdodCAoYykgRXJpYyBFbGxpb3R0IDIwMTJcbiAqIE1JVCBMaWNlbnNlXG4gKi9cblxuLypnbG9iYWwgd2luZG93LCBuYXZpZ2F0b3IsIGRvY3VtZW50LCByZXF1aXJlLCBwcm9jZXNzLCBtb2R1bGUgKi9cbihmdW5jdGlvbiAoYXBwKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIG5hbWVzcGFjZSA9ICdjdWlkJyxcbiAgICBjID0gMCxcbiAgICBibG9ja1NpemUgPSA0LFxuICAgIGJhc2UgPSAzNixcbiAgICBkaXNjcmV0ZVZhbHVlcyA9IE1hdGgucG93KGJhc2UsIGJsb2NrU2l6ZSksXG5cbiAgICBwYWQgPSBmdW5jdGlvbiBwYWQobnVtLCBzaXplKSB7XG4gICAgICB2YXIgcyA9IFwiMDAwMDAwMDAwXCIgKyBudW07XG4gICAgICByZXR1cm4gcy5zdWJzdHIocy5sZW5ndGgtc2l6ZSk7XG4gICAgfSxcblxuICAgIHJhbmRvbUJsb2NrID0gZnVuY3Rpb24gcmFuZG9tQmxvY2soKSB7XG4gICAgICByZXR1cm4gcGFkKChNYXRoLnJhbmRvbSgpICpcbiAgICAgICAgICAgIGRpc2NyZXRlVmFsdWVzIDw8IDApXG4gICAgICAgICAgICAudG9TdHJpbmcoYmFzZSksIGJsb2NrU2l6ZSk7XG4gICAgfSxcblxuICAgIHNhZmVDb3VudGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgYyA9IChjIDwgZGlzY3JldGVWYWx1ZXMpID8gYyA6IDA7XG4gICAgICBjKys7IC8vIHRoaXMgaXMgbm90IHN1YmxpbWluYWxcbiAgICAgIHJldHVybiBjIC0gMTtcbiAgICB9LFxuXG4gICAgYXBpID0gZnVuY3Rpb24gY3VpZCgpIHtcbiAgICAgIC8vIFN0YXJ0aW5nIHdpdGggYSBsb3dlcmNhc2UgbGV0dGVyIG1ha2VzXG4gICAgICAvLyBpdCBIVE1MIGVsZW1lbnQgSUQgZnJpZW5kbHkuXG4gICAgICB2YXIgbGV0dGVyID0gJ2MnLCAvLyBoYXJkLWNvZGVkIGFsbG93cyBmb3Igc2VxdWVudGlhbCBhY2Nlc3NcblxuICAgICAgICAvLyB0aW1lc3RhbXBcbiAgICAgICAgLy8gd2FybmluZzogdGhpcyBleHBvc2VzIHRoZSBleGFjdCBkYXRlIGFuZCB0aW1lXG4gICAgICAgIC8vIHRoYXQgdGhlIHVpZCB3YXMgY3JlYXRlZC5cbiAgICAgICAgdGltZXN0YW1wID0gKG5ldyBEYXRlKCkuZ2V0VGltZSgpKS50b1N0cmluZyhiYXNlKSxcblxuICAgICAgICAvLyBQcmV2ZW50IHNhbWUtbWFjaGluZSBjb2xsaXNpb25zLlxuICAgICAgICBjb3VudGVyLFxuXG4gICAgICAgIC8vIEEgZmV3IGNoYXJzIHRvIGdlbmVyYXRlIGRpc3RpbmN0IGlkcyBmb3IgZGlmZmVyZW50XG4gICAgICAgIC8vIGNsaWVudHMgKHNvIGRpZmZlcmVudCBjb21wdXRlcnMgYXJlIGZhciBsZXNzXG4gICAgICAgIC8vIGxpa2VseSB0byBnZW5lcmF0ZSB0aGUgc2FtZSBpZClcbiAgICAgICAgZmluZ2VycHJpbnQgPSBhcGkuZmluZ2VycHJpbnQoKSxcblxuICAgICAgICAvLyBHcmFiIHNvbWUgbW9yZSBjaGFycyBmcm9tIE1hdGgucmFuZG9tKClcbiAgICAgICAgcmFuZG9tID0gcmFuZG9tQmxvY2soKSArIHJhbmRvbUJsb2NrKCk7XG5cbiAgICAgICAgY291bnRlciA9IHBhZChzYWZlQ291bnRlcigpLnRvU3RyaW5nKGJhc2UpLCBibG9ja1NpemUpO1xuXG4gICAgICByZXR1cm4gIChsZXR0ZXIgKyB0aW1lc3RhbXAgKyBjb3VudGVyICsgZmluZ2VycHJpbnQgKyByYW5kb20pO1xuICAgIH07XG5cbiAgYXBpLnNsdWcgPSBmdW5jdGlvbiBzbHVnKCkge1xuICAgIHZhciBkYXRlID0gbmV3IERhdGUoKS5nZXRUaW1lKCkudG9TdHJpbmcoMzYpLFxuICAgICAgY291bnRlcixcbiAgICAgIHByaW50ID0gYXBpLmZpbmdlcnByaW50KCkuc2xpY2UoMCwxKSArXG4gICAgICAgIGFwaS5maW5nZXJwcmludCgpLnNsaWNlKC0xKSxcbiAgICAgIHJhbmRvbSA9IHJhbmRvbUJsb2NrKCkuc2xpY2UoLTIpO1xuXG4gICAgICBjb3VudGVyID0gc2FmZUNvdW50ZXIoKS50b1N0cmluZygzNikuc2xpY2UoLTQpO1xuXG4gICAgcmV0dXJuIGRhdGUuc2xpY2UoLTIpICtcbiAgICAgIGNvdW50ZXIgKyBwcmludCArIHJhbmRvbTtcbiAgfTtcblxuICBhcGkuZ2xvYmFsQ291bnQgPSBmdW5jdGlvbiBnbG9iYWxDb3VudCgpIHtcbiAgICAvLyBXZSB3YW50IHRvIGNhY2hlIHRoZSByZXN1bHRzIG9mIHRoaXNcbiAgICB2YXIgY2FjaGUgPSAoZnVuY3Rpb24gY2FsYygpIHtcbiAgICAgICAgdmFyIGksXG4gICAgICAgICAgY291bnQgPSAwO1xuXG4gICAgICAgIGZvciAoaSBpbiB3aW5kb3cpIHtcbiAgICAgICAgICBjb3VudCsrO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgfSgpKTtcblxuICAgIGFwaS5nbG9iYWxDb3VudCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGNhY2hlOyB9O1xuICAgIHJldHVybiBjYWNoZTtcbiAgfTtcblxuICBhcGkuZmluZ2VycHJpbnQgPSBmdW5jdGlvbiBicm93c2VyUHJpbnQoKSB7XG4gICAgcmV0dXJuIHBhZCgobmF2aWdhdG9yLm1pbWVUeXBlcy5sZW5ndGggK1xuICAgICAgbmF2aWdhdG9yLnVzZXJBZ2VudC5sZW5ndGgpLnRvU3RyaW5nKDM2KSArXG4gICAgICBhcGkuZ2xvYmFsQ291bnQoKS50b1N0cmluZygzNiksIDQpO1xuICB9O1xuXG4gIC8vIGRvbid0IGNoYW5nZSBhbnl0aGluZyBmcm9tIGhlcmUgZG93bi5cbiAgaWYgKGFwcC5yZWdpc3Rlcikge1xuICAgIGFwcC5yZWdpc3RlcihuYW1lc3BhY2UsIGFwaSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGFwaTtcbiAgfSBlbHNlIHtcbiAgICBhcHBbbmFtZXNwYWNlXSA9IGFwaTtcbiAgfVxuXG59KHRoaXMuYXBwbGl0dWRlIHx8IHRoaXMpKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuUkVNT1ZFID0gZXhwb3J0cy5NT1ZFID0gZXhwb3J0cy5VUERBVEUgPSBleHBvcnRzLkNSRUFURSA9IHVuZGVmaW5lZDtcblxudmFyIF9iaXRWZWN0b3IgPSByZXF1aXJlKCdiaXQtdmVjdG9yJyk7XG5cbi8qKlxuICogQWN0aW9uc1xuICovXG5cbnZhciBDUkVBVEUgPSAwOyAvKipcbiAgICAgICAgICAgICAgICAgKiBJbXBvcnRzXG4gICAgICAgICAgICAgICAgICovXG5cbnZhciBVUERBVEUgPSAxO1xudmFyIE1PVkUgPSAyO1xudmFyIFJFTU9WRSA9IDM7XG5cbi8qKlxuICogZGlmdFxuICovXG5cbmZ1bmN0aW9uIGRpZnQocHJldiwgbmV4dCwgZWZmZWN0LCBrZXkpIHtcbiAgdmFyIHBTdGFydElkeCA9IDA7XG4gIHZhciBuU3RhcnRJZHggPSAwO1xuICB2YXIgcEVuZElkeCA9IHByZXYubGVuZ3RoIC0gMTtcbiAgdmFyIG5FbmRJZHggPSBuZXh0Lmxlbmd0aCAtIDE7XG4gIHZhciBwU3RhcnRJdGVtID0gcHJldltwU3RhcnRJZHhdO1xuICB2YXIgblN0YXJ0SXRlbSA9IG5leHRbblN0YXJ0SWR4XTtcblxuICAvLyBMaXN0IGhlYWQgaXMgdGhlIHNhbWVcbiAgd2hpbGUgKHBTdGFydElkeCA8PSBwRW5kSWR4ICYmIG5TdGFydElkeCA8PSBuRW5kSWR4ICYmIGVxdWFsKHBTdGFydEl0ZW0sIG5TdGFydEl0ZW0pKSB7XG4gICAgZWZmZWN0KFVQREFURSwgcFN0YXJ0SXRlbSwgblN0YXJ0SXRlbSwgblN0YXJ0SWR4KTtcbiAgICBwU3RhcnRJdGVtID0gcHJldlsrK3BTdGFydElkeF07XG4gICAgblN0YXJ0SXRlbSA9IG5leHRbKytuU3RhcnRJZHhdO1xuICB9XG5cbiAgLy8gVGhlIGFib3ZlIGNhc2UgaXMgb3JkZXJzIG9mIG1hZ25pdHVkZSBtb3JlIGNvbW1vbiB0aGFuIHRoZSBvdGhlcnMsIHNvIGZhc3QtcGF0aCBpdFxuICBpZiAoblN0YXJ0SWR4ID4gbkVuZElkeCAmJiBwU3RhcnRJZHggPiBwRW5kSWR4KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIHBFbmRJdGVtID0gcHJldltwRW5kSWR4XTtcbiAgdmFyIG5FbmRJdGVtID0gbmV4dFtuRW5kSWR4XTtcbiAgdmFyIG1vdmVkRnJvbUZyb250ID0gMDtcblxuICAvLyBSZXZlcnNlZFxuICB3aGlsZSAocFN0YXJ0SWR4IDw9IHBFbmRJZHggJiYgblN0YXJ0SWR4IDw9IG5FbmRJZHggJiYgZXF1YWwocFN0YXJ0SXRlbSwgbkVuZEl0ZW0pKSB7XG4gICAgZWZmZWN0KE1PVkUsIHBTdGFydEl0ZW0sIG5FbmRJdGVtLCBwRW5kSWR4IC0gbW92ZWRGcm9tRnJvbnQgKyAxKTtcbiAgICBwU3RhcnRJdGVtID0gcHJldlsrK3BTdGFydElkeF07XG4gICAgbkVuZEl0ZW0gPSBuZXh0Wy0tbkVuZElkeF07XG4gICAgKyttb3ZlZEZyb21Gcm9udDtcbiAgfVxuXG4gIC8vIFJldmVyc2VkIHRoZSBvdGhlciB3YXkgKGluIGNhc2Ugb2YgZS5nLiByZXZlcnNlIGFuZCBhcHBlbmQpXG4gIHdoaWxlIChwRW5kSWR4ID49IHBTdGFydElkeCAmJiBuU3RhcnRJZHggPD0gbkVuZElkeCAmJiBlcXVhbChuU3RhcnRJdGVtLCBwRW5kSXRlbSkpIHtcbiAgICBlZmZlY3QoTU9WRSwgcEVuZEl0ZW0sIG5TdGFydEl0ZW0sIG5TdGFydElkeCk7XG4gICAgcEVuZEl0ZW0gPSBwcmV2Wy0tcEVuZElkeF07XG4gICAgblN0YXJ0SXRlbSA9IG5leHRbKytuU3RhcnRJZHhdO1xuICAgIC0tbW92ZWRGcm9tRnJvbnQ7XG4gIH1cblxuICAvLyBMaXN0IHRhaWwgaXMgdGhlIHNhbWVcbiAgd2hpbGUgKHBFbmRJZHggPj0gcFN0YXJ0SWR4ICYmIG5FbmRJZHggPj0gblN0YXJ0SWR4ICYmIGVxdWFsKHBFbmRJdGVtLCBuRW5kSXRlbSkpIHtcbiAgICBlZmZlY3QoVVBEQVRFLCBwRW5kSXRlbSwgbkVuZEl0ZW0sIG5FbmRJZHgpO1xuICAgIHBFbmRJdGVtID0gcHJldlstLXBFbmRJZHhdO1xuICAgIG5FbmRJdGVtID0gbmV4dFstLW5FbmRJZHhdO1xuICB9XG5cbiAgaWYgKHBTdGFydElkeCA+IHBFbmRJZHgpIHtcbiAgICB3aGlsZSAoblN0YXJ0SWR4IDw9IG5FbmRJZHgpIHtcbiAgICAgIGVmZmVjdChDUkVBVEUsIG51bGwsIG5TdGFydEl0ZW0sIG5TdGFydElkeCk7XG4gICAgICBuU3RhcnRJdGVtID0gbmV4dFsrK25TdGFydElkeF07XG4gICAgfVxuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKG5TdGFydElkeCA+IG5FbmRJZHgpIHtcbiAgICB3aGlsZSAocFN0YXJ0SWR4IDw9IHBFbmRJZHgpIHtcbiAgICAgIGVmZmVjdChSRU1PVkUsIHBTdGFydEl0ZW0pO1xuICAgICAgcFN0YXJ0SXRlbSA9IHByZXZbKytwU3RhcnRJZHhdO1xuICAgIH1cblxuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBjcmVhdGVkID0gMDtcbiAgdmFyIHBpdm90RGVzdCA9IG51bGw7XG4gIHZhciBwaXZvdElkeCA9IHBTdGFydElkeCAtIG1vdmVkRnJvbUZyb250O1xuICB2YXIga2VlcEJhc2UgPSBwU3RhcnRJZHg7XG4gIHZhciBrZWVwID0gKDAsIF9iaXRWZWN0b3IuY3JlYXRlQnYpKHBFbmRJZHggLSBwU3RhcnRJZHgpO1xuXG4gIHZhciBwcmV2TWFwID0ga2V5TWFwKHByZXYsIHBTdGFydElkeCwgcEVuZElkeCArIDEsIGtleSk7XG5cbiAgZm9yICg7IG5TdGFydElkeCA8PSBuRW5kSWR4OyBuU3RhcnRJdGVtID0gbmV4dFsrK25TdGFydElkeF0pIHtcbiAgICB2YXIgb2xkSWR4ID0gcHJldk1hcFtrZXkoblN0YXJ0SXRlbSldO1xuXG4gICAgaWYgKGlzVW5kZWZpbmVkKG9sZElkeCkpIHtcbiAgICAgIGVmZmVjdChDUkVBVEUsIG51bGwsIG5TdGFydEl0ZW0sIHBpdm90SWR4KyspO1xuICAgICAgKytjcmVhdGVkO1xuICAgIH0gZWxzZSBpZiAocFN0YXJ0SWR4ICE9PSBvbGRJZHgpIHtcbiAgICAgICgwLCBfYml0VmVjdG9yLnNldEJpdCkoa2VlcCwgb2xkSWR4IC0ga2VlcEJhc2UpO1xuICAgICAgZWZmZWN0KE1PVkUsIHByZXZbb2xkSWR4XSwgblN0YXJ0SXRlbSwgcGl2b3RJZHgrKyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBpdm90RGVzdCA9IG5TdGFydElkeDtcbiAgICB9XG4gIH1cblxuICBpZiAocGl2b3REZXN0ICE9PSBudWxsKSB7XG4gICAgKDAsIF9iaXRWZWN0b3Iuc2V0Qml0KShrZWVwLCAwKTtcbiAgICBlZmZlY3QoTU9WRSwgcHJldltwU3RhcnRJZHhdLCBuZXh0W3Bpdm90RGVzdF0sIHBpdm90RGVzdCk7XG4gIH1cblxuICAvLyBJZiB0aGVyZSBhcmUgbm8gY3JlYXRpb25zLCB0aGVuIHlvdSBoYXZlIHRvXG4gIC8vIHJlbW92ZSBleGFjdGx5IG1heChwcmV2TGVuIC0gbmV4dExlbiwgMCkgZWxlbWVudHMgaW4gdGhpc1xuICAvLyBkaWZmLiBZb3UgaGF2ZSB0byByZW1vdmUgb25lIG1vcmUgZm9yIGVhY2ggZWxlbWVudFxuICAvLyB0aGF0IHdhcyBjcmVhdGVkLiBUaGlzIG1lYW5zIG9uY2Ugd2UgaGF2ZVxuICAvLyByZW1vdmVkIHRoYXQgbWFueSwgd2UgY2FuIHN0b3AuXG4gIHZhciBuZWNlc3NhcnlSZW1vdmFscyA9IHByZXYubGVuZ3RoIC0gbmV4dC5sZW5ndGggKyBjcmVhdGVkO1xuICBmb3IgKHZhciByZW1vdmFscyA9IDA7IHJlbW92YWxzIDwgbmVjZXNzYXJ5UmVtb3ZhbHM7IHBTdGFydEl0ZW0gPSBwcmV2WysrcFN0YXJ0SWR4XSkge1xuICAgIGlmICghKDAsIF9iaXRWZWN0b3IuZ2V0Qml0KShrZWVwLCBwU3RhcnRJZHggLSBrZWVwQmFzZSkpIHtcbiAgICAgIGVmZmVjdChSRU1PVkUsIHBTdGFydEl0ZW0pO1xuICAgICAgKytyZW1vdmFscztcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBlcXVhbChhLCBiKSB7XG4gICAgcmV0dXJuIGtleShhKSA9PT0ga2V5KGIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKHZhbCkge1xuICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCc7XG59XG5cbmZ1bmN0aW9uIGtleU1hcChpdGVtcywgc3RhcnQsIGVuZCwga2V5KSB7XG4gIHZhciBtYXAgPSB7fTtcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIG1hcFtrZXkoaXRlbXNbaV0pXSA9IGk7XG4gIH1cblxuICByZXR1cm4gbWFwO1xufVxuXG4vKipcbiAqIEV4cG9ydHNcbiAqL1xuXG5leHBvcnRzLmRlZmF1bHQgPSBkaWZ0O1xuZXhwb3J0cy5DUkVBVEUgPSBDUkVBVEU7XG5leHBvcnRzLlVQREFURSA9IFVQREFURTtcbmV4cG9ydHMuTU9WRSA9IE1PVkU7XG5leHBvcnRzLlJFTU9WRSA9IFJFTU9WRTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG4vKipcbiAqIFVzZSB0eXBlZCBhcnJheXMgaWYgd2UgY2FuXG4gKi9cblxudmFyIEZhc3RBcnJheSA9IHR5cGVvZiBVaW50MzJBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyBBcnJheSA6IFVpbnQzMkFycmF5O1xuXG4vKipcbiAqIEJpdCB2ZWN0b3JcbiAqL1xuXG5mdW5jdGlvbiBjcmVhdGVCdihzaXplSW5CaXRzKSB7XG4gIHJldHVybiBuZXcgRmFzdEFycmF5KE1hdGguY2VpbChzaXplSW5CaXRzIC8gMzIpKTtcbn1cblxuZnVuY3Rpb24gc2V0Qml0KHYsIGlkeCkge1xuICB2YXIgciA9IGlkeCAlIDMyO1xuICB2YXIgcG9zID0gKGlkeCAtIHIpIC8gMzI7XG5cbiAgdltwb3NdIHw9IDEgPDwgcjtcbn1cblxuZnVuY3Rpb24gY2xlYXJCaXQodiwgaWR4KSB7XG4gIHZhciByID0gaWR4ICUgMzI7XG4gIHZhciBwb3MgPSAoaWR4IC0gcikgLyAzMjtcblxuICB2W3Bvc10gJj0gfigxIDw8IHIpO1xufVxuXG5mdW5jdGlvbiBnZXRCaXQodiwgaWR4KSB7XG4gIHZhciByID0gaWR4ICUgMzI7XG4gIHZhciBwb3MgPSAoaWR4IC0gcikgLyAzMjtcblxuICByZXR1cm4gISEodltwb3NdICYgMSA8PCByKTtcbn1cblxuLyoqXG4gKiBFeHBvcnRzXG4gKi9cblxuZXhwb3J0cy5jcmVhdGVCdiA9IGNyZWF0ZUJ2O1xuZXhwb3J0cy5zZXRCaXQgPSBzZXRCaXQ7XG5leHBvcnRzLmNsZWFyQml0ID0gY2xlYXJCaXQ7XG5leHBvcnRzLmdldEJpdCA9IGdldEJpdDsiLCJ2YXIgRXZTdG9yZSA9IHJlcXVpcmUoXCJldi1zdG9yZVwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZEV2ZW50XG5cbmZ1bmN0aW9uIGFkZEV2ZW50KHRhcmdldCwgdHlwZSwgaGFuZGxlcikge1xuICAgIHZhciBldmVudHMgPSBFdlN0b3JlKHRhcmdldClcbiAgICB2YXIgZXZlbnQgPSBldmVudHNbdHlwZV1cblxuICAgIGlmICghZXZlbnQpIHtcbiAgICAgICAgZXZlbnRzW3R5cGVdID0gaGFuZGxlclxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShldmVudCkpIHtcbiAgICAgICAgaWYgKGV2ZW50LmluZGV4T2YoaGFuZGxlcikgPT09IC0xKSB7XG4gICAgICAgICAgICBldmVudC5wdXNoKGhhbmRsZXIpXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGV2ZW50ICE9PSBoYW5kbGVyKSB7XG4gICAgICAgIGV2ZW50c1t0eXBlXSA9IFtldmVudCwgaGFuZGxlcl1cbiAgICB9XG59XG4iLCJ2YXIgZ2xvYmFsRG9jdW1lbnQgPSByZXF1aXJlKFwiZ2xvYmFsL2RvY3VtZW50XCIpXG52YXIgRXZTdG9yZSA9IHJlcXVpcmUoXCJldi1zdG9yZVwiKVxudmFyIGNyZWF0ZVN0b3JlID0gcmVxdWlyZShcIndlYWttYXAtc2hpbS9jcmVhdGUtc3RvcmVcIilcblxudmFyIGFkZEV2ZW50ID0gcmVxdWlyZShcIi4vYWRkLWV2ZW50LmpzXCIpXG52YXIgcmVtb3ZlRXZlbnQgPSByZXF1aXJlKFwiLi9yZW1vdmUtZXZlbnQuanNcIilcbnZhciBQcm94eUV2ZW50ID0gcmVxdWlyZShcIi4vcHJveHktZXZlbnQuanNcIilcblxudmFyIEhBTkRMRVJfU1RPUkUgPSBjcmVhdGVTdG9yZSgpXG5cbm1vZHVsZS5leHBvcnRzID0gRE9NRGVsZWdhdG9yXG5cbmZ1bmN0aW9uIERPTURlbGVnYXRvcihkb2N1bWVudCkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBET01EZWxlZ2F0b3IpKSB7XG4gICAgICAgIHJldHVybiBuZXcgRE9NRGVsZWdhdG9yKGRvY3VtZW50KTtcbiAgICB9XG5cbiAgICBkb2N1bWVudCA9IGRvY3VtZW50IHx8IGdsb2JhbERvY3VtZW50XG5cbiAgICB0aGlzLnRhcmdldCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudFxuICAgIHRoaXMuZXZlbnRzID0ge31cbiAgICB0aGlzLnJhd0V2ZW50TGlzdGVuZXJzID0ge31cbiAgICB0aGlzLmdsb2JhbExpc3RlbmVycyA9IHt9XG59XG5cbkRPTURlbGVnYXRvci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGFkZEV2ZW50XG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSByZW1vdmVFdmVudFxuXG5ET01EZWxlZ2F0b3IuYWxsb2NhdGVIYW5kbGUgPVxuICAgIGZ1bmN0aW9uIGFsbG9jYXRlSGFuZGxlKGZ1bmMpIHtcbiAgICAgICAgdmFyIGhhbmRsZSA9IG5ldyBIYW5kbGUoKVxuXG4gICAgICAgIEhBTkRMRVJfU1RPUkUoaGFuZGxlKS5mdW5jID0gZnVuYztcblxuICAgICAgICByZXR1cm4gaGFuZGxlXG4gICAgfVxuXG5ET01EZWxlZ2F0b3IudHJhbnNmb3JtSGFuZGxlID1cbiAgICBmdW5jdGlvbiB0cmFuc2Zvcm1IYW5kbGUoaGFuZGxlLCBicm9hZGNhc3QpIHtcbiAgICAgICAgdmFyIGZ1bmMgPSBIQU5ETEVSX1NUT1JFKGhhbmRsZSkuZnVuY1xuXG4gICAgICAgIHJldHVybiB0aGlzLmFsbG9jYXRlSGFuZGxlKGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgYnJvYWRjYXN0KGV2LCBmdW5jKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbkRPTURlbGVnYXRvci5wcm90b3R5cGUuYWRkR2xvYmFsRXZlbnRMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gYWRkR2xvYmFsRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGZuKSB7XG4gICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdsb2JhbExpc3RlbmVyc1tldmVudE5hbWVdIHx8IFtdO1xuICAgICAgICBpZiAobGlzdGVuZXJzLmluZGV4T2YoZm4pID09PSAtMSkge1xuICAgICAgICAgICAgbGlzdGVuZXJzLnB1c2goZm4pXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmdsb2JhbExpc3RlbmVyc1tldmVudE5hbWVdID0gbGlzdGVuZXJzO1xuICAgIH1cblxuRE9NRGVsZWdhdG9yLnByb3RvdHlwZS5yZW1vdmVHbG9iYWxFdmVudExpc3RlbmVyID1cbiAgICBmdW5jdGlvbiByZW1vdmVHbG9iYWxFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZm4pIHtcbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2xvYmFsTGlzdGVuZXJzW2V2ZW50TmFtZV0gfHwgW107XG5cbiAgICAgICAgdmFyIGluZGV4ID0gbGlzdGVuZXJzLmluZGV4T2YoZm4pXG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICAgIH1cbiAgICB9XG5cbkRPTURlbGVnYXRvci5wcm90b3R5cGUubGlzdGVuVG8gPSBmdW5jdGlvbiBsaXN0ZW5UbyhldmVudE5hbWUpIHtcbiAgICBpZiAoIShldmVudE5hbWUgaW4gdGhpcy5ldmVudHMpKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0gPSAwO1xuICAgIH1cblxuICAgIHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0rKztcblxuICAgIGlmICh0aGlzLmV2ZW50c1tldmVudE5hbWVdICE9PSAxKSB7XG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHZhciBsaXN0ZW5lciA9IHRoaXMucmF3RXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXVxuICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgICAgbGlzdGVuZXIgPSB0aGlzLnJhd0V2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV0gPVxuICAgICAgICAgICAgY3JlYXRlSGFuZGxlcihldmVudE5hbWUsIHRoaXMpXG4gICAgfVxuXG4gICAgdGhpcy50YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGxpc3RlbmVyLCB0cnVlKVxufVxuXG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLnVubGlzdGVuVG8gPSBmdW5jdGlvbiB1bmxpc3RlblRvKGV2ZW50TmFtZSkge1xuICAgIGlmICghKGV2ZW50TmFtZSBpbiB0aGlzLmV2ZW50cykpIHtcbiAgICAgICAgdGhpcy5ldmVudHNbZXZlbnROYW1lXSA9IDA7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0gPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiYWxyZWFkeSB1bmxpc3RlbmVkIHRvIGV2ZW50LlwiKTtcbiAgICB9XG5cbiAgICB0aGlzLmV2ZW50c1tldmVudE5hbWVdLS07XG5cbiAgICBpZiAodGhpcy5ldmVudHNbZXZlbnROYW1lXSAhPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgbGlzdGVuZXIgPSB0aGlzLnJhd0V2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV1cblxuICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZG9tLWRlbGVnYXRvciN1bmxpc3RlblRvOiBjYW5ub3QgXCIgK1xuICAgICAgICAgICAgXCJ1bmxpc3RlbiB0byBcIiArIGV2ZW50TmFtZSlcbiAgICB9XG5cbiAgICB0aGlzLnRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgbGlzdGVuZXIsIHRydWUpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUhhbmRsZXIoZXZlbnROYW1lLCBkZWxlZ2F0b3IpIHtcbiAgICB2YXIgZ2xvYmFsTGlzdGVuZXJzID0gZGVsZWdhdG9yLmdsb2JhbExpc3RlbmVycztcbiAgICB2YXIgZGVsZWdhdG9yVGFyZ2V0ID0gZGVsZWdhdG9yLnRhcmdldDtcblxuICAgIHJldHVybiBoYW5kbGVyXG5cbiAgICBmdW5jdGlvbiBoYW5kbGVyKGV2KSB7XG4gICAgICAgIHZhciBnbG9iYWxIYW5kbGVycyA9IGdsb2JhbExpc3RlbmVyc1tldmVudE5hbWVdIHx8IFtdXG5cbiAgICAgICAgaWYgKGdsb2JhbEhhbmRsZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBnbG9iYWxFdmVudCA9IG5ldyBQcm94eUV2ZW50KGV2KTtcbiAgICAgICAgICAgIGdsb2JhbEV2ZW50LmN1cnJlbnRUYXJnZXQgPSBkZWxlZ2F0b3JUYXJnZXQ7XG4gICAgICAgICAgICBjYWxsTGlzdGVuZXJzKGdsb2JhbEhhbmRsZXJzLCBnbG9iYWxFdmVudClcbiAgICAgICAgfVxuXG4gICAgICAgIGZpbmRBbmRJbnZva2VMaXN0ZW5lcnMoZXYudGFyZ2V0LCBldiwgZXZlbnROYW1lKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZmluZEFuZEludm9rZUxpc3RlbmVycyhlbGVtLCBldiwgZXZlbnROYW1lKSB7XG4gICAgdmFyIGxpc3RlbmVyID0gZ2V0TGlzdGVuZXIoZWxlbSwgZXZlbnROYW1lKVxuXG4gICAgaWYgKGxpc3RlbmVyICYmIGxpc3RlbmVyLmhhbmRsZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIGxpc3RlbmVyRXZlbnQgPSBuZXcgUHJveHlFdmVudChldik7XG4gICAgICAgIGxpc3RlbmVyRXZlbnQuY3VycmVudFRhcmdldCA9IGxpc3RlbmVyLmN1cnJlbnRUYXJnZXRcbiAgICAgICAgY2FsbExpc3RlbmVycyhsaXN0ZW5lci5oYW5kbGVycywgbGlzdGVuZXJFdmVudClcblxuICAgICAgICBpZiAobGlzdGVuZXJFdmVudC5fYnViYmxlcykge1xuICAgICAgICAgICAgdmFyIG5leHRUYXJnZXQgPSBsaXN0ZW5lci5jdXJyZW50VGFyZ2V0LnBhcmVudE5vZGVcbiAgICAgICAgICAgIGZpbmRBbmRJbnZva2VMaXN0ZW5lcnMobmV4dFRhcmdldCwgZXYsIGV2ZW50TmFtZSlcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0TGlzdGVuZXIodGFyZ2V0LCB0eXBlKSB7XG4gICAgLy8gdGVybWluYXRlIHJlY3Vyc2lvbiBpZiBwYXJlbnQgaXMgYG51bGxgXG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCB8fCB0eXBlb2YgdGFyZ2V0ID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHJldHVybiBudWxsXG4gICAgfVxuXG4gICAgdmFyIGV2ZW50cyA9IEV2U3RvcmUodGFyZ2V0KVxuICAgIC8vIGZldGNoIGxpc3Qgb2YgaGFuZGxlciBmbnMgZm9yIHRoaXMgZXZlbnRcbiAgICB2YXIgaGFuZGxlciA9IGV2ZW50c1t0eXBlXVxuICAgIHZhciBhbGxIYW5kbGVyID0gZXZlbnRzLmV2ZW50XG5cbiAgICBpZiAoIWhhbmRsZXIgJiYgIWFsbEhhbmRsZXIpIHtcbiAgICAgICAgcmV0dXJuIGdldExpc3RlbmVyKHRhcmdldC5wYXJlbnROb2RlLCB0eXBlKVxuICAgIH1cblxuICAgIHZhciBoYW5kbGVycyA9IFtdLmNvbmNhdChoYW5kbGVyIHx8IFtdLCBhbGxIYW5kbGVyIHx8IFtdKVxuICAgIHJldHVybiBuZXcgTGlzdGVuZXIodGFyZ2V0LCBoYW5kbGVycylcbn1cblxuZnVuY3Rpb24gY2FsbExpc3RlbmVycyhoYW5kbGVycywgZXYpIHtcbiAgICBoYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBoYW5kbGVyKGV2KVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBoYW5kbGVyLmhhbmRsZUV2ZW50ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGhhbmRsZXIuaGFuZGxlRXZlbnQoZXYpXG4gICAgICAgIH0gZWxzZSBpZiAoaGFuZGxlci50eXBlID09PSBcImRvbS1kZWxlZ2F0b3ItaGFuZGxlXCIpIHtcbiAgICAgICAgICAgIEhBTkRMRVJfU1RPUkUoaGFuZGxlcikuZnVuYyhldilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImRvbS1kZWxlZ2F0b3I6IHVua25vd24gaGFuZGxlciBcIiArXG4gICAgICAgICAgICAgICAgXCJmb3VuZDogXCIgKyBKU09OLnN0cmluZ2lmeShoYW5kbGVycykpO1xuICAgICAgICB9XG4gICAgfSlcbn1cblxuZnVuY3Rpb24gTGlzdGVuZXIodGFyZ2V0LCBoYW5kbGVycykge1xuICAgIHRoaXMuY3VycmVudFRhcmdldCA9IHRhcmdldFxuICAgIHRoaXMuaGFuZGxlcnMgPSBoYW5kbGVyc1xufVxuXG5mdW5jdGlvbiBIYW5kbGUoKSB7XG4gICAgdGhpcy50eXBlID0gXCJkb20tZGVsZWdhdG9yLWhhbmRsZVwiXG59XG4iLCJ2YXIgSW5kaXZpZHVhbCA9IHJlcXVpcmUoXCJpbmRpdmlkdWFsXCIpXG52YXIgY3VpZCA9IHJlcXVpcmUoXCJjdWlkXCIpXG52YXIgZ2xvYmFsRG9jdW1lbnQgPSByZXF1aXJlKFwiZ2xvYmFsL2RvY3VtZW50XCIpXG5cbnZhciBET01EZWxlZ2F0b3IgPSByZXF1aXJlKFwiLi9kb20tZGVsZWdhdG9yLmpzXCIpXG5cbnZhciB2ZXJzaW9uS2V5ID0gXCIxM1wiXG52YXIgY2FjaGVLZXkgPSBcIl9fRE9NX0RFTEVHQVRPUl9DQUNIRUBcIiArIHZlcnNpb25LZXlcbnZhciBjYWNoZVRva2VuS2V5ID0gXCJfX0RPTV9ERUxFR0FUT1JfQ0FDSEVfVE9LRU5AXCIgKyB2ZXJzaW9uS2V5XG52YXIgZGVsZWdhdG9yQ2FjaGUgPSBJbmRpdmlkdWFsKGNhY2hlS2V5LCB7XG4gICAgZGVsZWdhdG9yczoge31cbn0pXG52YXIgY29tbW9uRXZlbnRzID0gW1xuICAgIFwiYmx1clwiLCBcImNoYW5nZVwiLCBcImNsaWNrXCIsICBcImNvbnRleHRtZW51XCIsIFwiZGJsY2xpY2tcIixcbiAgICBcImVycm9yXCIsXCJmb2N1c1wiLCBcImZvY3VzaW5cIiwgXCJmb2N1c291dFwiLCBcImlucHV0XCIsIFwia2V5ZG93blwiLFxuICAgIFwia2V5cHJlc3NcIiwgXCJrZXl1cFwiLCBcImxvYWRcIiwgXCJtb3VzZWRvd25cIiwgXCJtb3VzZXVwXCIsXG4gICAgXCJyZXNpemVcIiwgXCJzZWxlY3RcIiwgXCJzdWJtaXRcIiwgXCJ0b3VjaGNhbmNlbFwiLFxuICAgIFwidG91Y2hlbmRcIiwgXCJ0b3VjaHN0YXJ0XCIsIFwidW5sb2FkXCJcbl1cblxuLyogIERlbGVnYXRvciBpcyBhIHRoaW4gd3JhcHBlciBhcm91bmQgYSBzaW5nbGV0b24gYERPTURlbGVnYXRvcmBcbiAgICAgICAgaW5zdGFuY2UuXG5cbiAgICBPbmx5IG9uZSBET01EZWxlZ2F0b3Igc2hvdWxkIGV4aXN0IGJlY2F1c2Ugd2UgZG8gbm90IHdhbnRcbiAgICAgICAgZHVwbGljYXRlIGV2ZW50IGxpc3RlbmVycyBib3VuZCB0byB0aGUgRE9NLlxuXG4gICAgYERlbGVnYXRvcmAgd2lsbCBhbHNvIGBsaXN0ZW5UbygpYCBhbGwgZXZlbnRzIHVubGVzc1xuICAgICAgICBldmVyeSBjYWxsZXIgb3B0cyBvdXQgb2YgaXRcbiovXG5tb2R1bGUuZXhwb3J0cyA9IERlbGVnYXRvclxuXG5mdW5jdGlvbiBEZWxlZ2F0b3Iob3B0cykge1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9XG4gICAgdmFyIGRvY3VtZW50ID0gb3B0cy5kb2N1bWVudCB8fCBnbG9iYWxEb2N1bWVudFxuXG4gICAgdmFyIGNhY2hlS2V5ID0gZG9jdW1lbnRbY2FjaGVUb2tlbktleV1cblxuICAgIGlmICghY2FjaGVLZXkpIHtcbiAgICAgICAgY2FjaGVLZXkgPVxuICAgICAgICAgICAgZG9jdW1lbnRbY2FjaGVUb2tlbktleV0gPSBjdWlkKClcbiAgICB9XG5cbiAgICB2YXIgZGVsZWdhdG9yID0gZGVsZWdhdG9yQ2FjaGUuZGVsZWdhdG9yc1tjYWNoZUtleV1cblxuICAgIGlmICghZGVsZWdhdG9yKSB7XG4gICAgICAgIGRlbGVnYXRvciA9IGRlbGVnYXRvckNhY2hlLmRlbGVnYXRvcnNbY2FjaGVLZXldID1cbiAgICAgICAgICAgIG5ldyBET01EZWxlZ2F0b3IoZG9jdW1lbnQpXG4gICAgfVxuXG4gICAgaWYgKG9wdHMuZGVmYXVsdEV2ZW50cyAhPT0gZmFsc2UpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb21tb25FdmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGRlbGVnYXRvci5saXN0ZW5Ubyhjb21tb25FdmVudHNbaV0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVsZWdhdG9yXG59XG5cbkRlbGVnYXRvci5hbGxvY2F0ZUhhbmRsZSA9IERPTURlbGVnYXRvci5hbGxvY2F0ZUhhbmRsZTtcbkRlbGVnYXRvci50cmFuc2Zvcm1IYW5kbGUgPSBET01EZWxlZ2F0b3IudHJhbnNmb3JtSGFuZGxlO1xuIiwidmFyIHJvb3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/XG4gICAgd2luZG93IDogdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgP1xuICAgIGdsb2JhbCA6IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluZGl2aWR1YWxcblxuZnVuY3Rpb24gSW5kaXZpZHVhbChrZXksIHZhbHVlKSB7XG4gICAgaWYgKHJvb3Rba2V5XSkge1xuICAgICAgICByZXR1cm4gcm9vdFtrZXldXG4gICAgfVxuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJvb3QsIGtleSwge1xuICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgLCBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KVxuXG4gICAgcmV0dXJuIHZhbHVlXG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsInZhciBoaWRkZW5TdG9yZSA9IHJlcXVpcmUoJy4vaGlkZGVuLXN0b3JlLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlU3RvcmU7XG5cbmZ1bmN0aW9uIGNyZWF0ZVN0b3JlKCkge1xuICAgIHZhciBrZXkgPSB7fTtcblxuICAgIHJldHVybiBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIGlmICgodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcgfHwgb2JqID09PSBudWxsKSAmJlxuICAgICAgICAgICAgdHlwZW9mIG9iaiAhPT0gJ2Z1bmN0aW9uJ1xuICAgICAgICApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignV2Vha21hcC1zaGltOiBLZXkgbXVzdCBiZSBvYmplY3QnKVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHN0b3JlID0gb2JqLnZhbHVlT2Yoa2V5KTtcbiAgICAgICAgcmV0dXJuIHN0b3JlICYmIHN0b3JlLmlkZW50aXR5ID09PSBrZXkgP1xuICAgICAgICAgICAgc3RvcmUgOiBoaWRkZW5TdG9yZShvYmosIGtleSk7XG4gICAgfTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaGlkZGVuU3RvcmU7XG5cbmZ1bmN0aW9uIGhpZGRlblN0b3JlKG9iaiwga2V5KSB7XG4gICAgdmFyIHN0b3JlID0geyBpZGVudGl0eToga2V5IH07XG4gICAgdmFyIHZhbHVlT2YgPSBvYmoudmFsdWVPZjtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIFwidmFsdWVPZlwiLCB7XG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZSAhPT0ga2V5ID9cbiAgICAgICAgICAgICAgICB2YWx1ZU9mLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgOiBzdG9yZTtcbiAgICAgICAgfSxcbiAgICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcblxuICAgIHJldHVybiBzdG9yZTtcbn1cbiIsInZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuXG52YXIgQUxMX1BST1BTID0gW1xuICAgIFwiYWx0S2V5XCIsIFwiYnViYmxlc1wiLCBcImNhbmNlbGFibGVcIiwgXCJjdHJsS2V5XCIsXG4gICAgXCJldmVudFBoYXNlXCIsIFwibWV0YUtleVwiLCBcInJlbGF0ZWRUYXJnZXRcIiwgXCJzaGlmdEtleVwiLFxuICAgIFwidGFyZ2V0XCIsIFwidGltZVN0YW1wXCIsIFwidHlwZVwiLCBcInZpZXdcIiwgXCJ3aGljaFwiXG5dXG52YXIgS0VZX1BST1BTID0gW1wiY2hhclwiLCBcImNoYXJDb2RlXCIsIFwia2V5XCIsIFwia2V5Q29kZVwiXVxudmFyIE1PVVNFX1BST1BTID0gW1xuICAgIFwiYnV0dG9uXCIsIFwiYnV0dG9uc1wiLCBcImNsaWVudFhcIiwgXCJjbGllbnRZXCIsIFwibGF5ZXJYXCIsXG4gICAgXCJsYXllcllcIiwgXCJvZmZzZXRYXCIsIFwib2Zmc2V0WVwiLCBcInBhZ2VYXCIsIFwicGFnZVlcIixcbiAgICBcInNjcmVlblhcIiwgXCJzY3JlZW5ZXCIsIFwidG9FbGVtZW50XCJcbl1cblxudmFyIHJrZXlFdmVudCA9IC9ea2V5fGlucHV0L1xudmFyIHJtb3VzZUV2ZW50ID0gL14oPzptb3VzZXxwb2ludGVyfGNvbnRleHRtZW51KXxjbGljay9cblxubW9kdWxlLmV4cG9ydHMgPSBQcm94eUV2ZW50XG5cbmZ1bmN0aW9uIFByb3h5RXZlbnQoZXYpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUHJveHlFdmVudCkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eUV2ZW50KGV2KVxuICAgIH1cblxuICAgIGlmIChya2V5RXZlbnQudGVzdChldi50eXBlKSkge1xuICAgICAgICByZXR1cm4gbmV3IEtleUV2ZW50KGV2KVxuICAgIH0gZWxzZSBpZiAocm1vdXNlRXZlbnQudGVzdChldi50eXBlKSkge1xuICAgICAgICByZXR1cm4gbmV3IE1vdXNlRXZlbnQoZXYpXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBBTExfUFJPUFMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByb3BLZXkgPSBBTExfUFJPUFNbaV1cbiAgICAgICAgdGhpc1twcm9wS2V5XSA9IGV2W3Byb3BLZXldXG4gICAgfVxuXG4gICAgdGhpcy5fcmF3RXZlbnQgPSBldlxuICAgIHRoaXMuX2J1YmJsZXMgPSBmYWxzZTtcbn1cblxuUHJveHlFdmVudC5wcm90b3R5cGUucHJldmVudERlZmF1bHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fcmF3RXZlbnQucHJldmVudERlZmF1bHQoKVxufVxuXG5Qcm94eUV2ZW50LnByb3RvdHlwZS5zdGFydFByb3BhZ2F0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2J1YmJsZXMgPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBNb3VzZUV2ZW50KGV2KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBBTExfUFJPUFMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByb3BLZXkgPSBBTExfUFJPUFNbaV1cbiAgICAgICAgdGhpc1twcm9wS2V5XSA9IGV2W3Byb3BLZXldXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBNT1VTRV9QUk9QUy5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIgbW91c2VQcm9wS2V5ID0gTU9VU0VfUFJPUFNbal1cbiAgICAgICAgdGhpc1ttb3VzZVByb3BLZXldID0gZXZbbW91c2VQcm9wS2V5XVxuICAgIH1cblxuICAgIHRoaXMuX3Jhd0V2ZW50ID0gZXZcbn1cblxuaW5oZXJpdHMoTW91c2VFdmVudCwgUHJveHlFdmVudClcblxuZnVuY3Rpb24gS2V5RXZlbnQoZXYpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IEFMTF9QUk9QUy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgcHJvcEtleSA9IEFMTF9QUk9QU1tpXVxuICAgICAgICB0aGlzW3Byb3BLZXldID0gZXZbcHJvcEtleV1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IEtFWV9QUk9QUy5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIga2V5UHJvcEtleSA9IEtFWV9QUk9QU1tqXVxuICAgICAgICB0aGlzW2tleVByb3BLZXldID0gZXZba2V5UHJvcEtleV1cbiAgICB9XG5cbiAgICB0aGlzLl9yYXdFdmVudCA9IGV2XG59XG5cbmluaGVyaXRzKEtleUV2ZW50LCBQcm94eUV2ZW50KVxuIiwidmFyIEV2U3RvcmUgPSByZXF1aXJlKFwiZXYtc3RvcmVcIilcblxubW9kdWxlLmV4cG9ydHMgPSByZW1vdmVFdmVudFxuXG5mdW5jdGlvbiByZW1vdmVFdmVudCh0YXJnZXQsIHR5cGUsIGhhbmRsZXIpIHtcbiAgICB2YXIgZXZlbnRzID0gRXZTdG9yZSh0YXJnZXQpXG4gICAgdmFyIGV2ZW50ID0gZXZlbnRzW3R5cGVdXG5cbiAgICBpZiAoIWV2ZW50KSB7XG4gICAgICAgIHJldHVyblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShldmVudCkpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gZXZlbnQuaW5kZXhPZihoYW5kbGVyKVxuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICBldmVudC5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGV2ZW50ID09PSBoYW5kbGVyKSB7XG4gICAgICAgIGV2ZW50c1t0eXBlXSA9IG51bGxcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBPbmVWZXJzaW9uQ29uc3RyYWludCA9IHJlcXVpcmUoJ2luZGl2aWR1YWwvb25lLXZlcnNpb24nKTtcblxudmFyIE1ZX1ZFUlNJT04gPSAnNyc7XG5PbmVWZXJzaW9uQ29uc3RyYWludCgnZXYtc3RvcmUnLCBNWV9WRVJTSU9OKTtcblxudmFyIGhhc2hLZXkgPSAnX19FVl9TVE9SRV9LRVlAJyArIE1ZX1ZFUlNJT047XG5cbm1vZHVsZS5leHBvcnRzID0gRXZTdG9yZTtcblxuZnVuY3Rpb24gRXZTdG9yZShlbGVtKSB7XG4gICAgdmFyIGhhc2ggPSBlbGVtW2hhc2hLZXldO1xuXG4gICAgaWYgKCFoYXNoKSB7XG4gICAgICAgIGhhc2ggPSBlbGVtW2hhc2hLZXldID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIGhhc2g7XG59XG4iLCJ2YXIgdG9wTGV2ZWwgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6XG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB7fVxudmFyIG1pbkRvYyA9IHJlcXVpcmUoJ21pbi1kb2N1bWVudCcpO1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jdW1lbnQ7XG59IGVsc2Uge1xuICAgIHZhciBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J107XG5cbiAgICBpZiAoIWRvY2N5KSB7XG4gICAgICAgIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXSA9IG1pbkRvYztcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY2N5O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKmdsb2JhbCB3aW5kb3csIGdsb2JhbCovXG5cbnZhciByb290ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgP1xuICAgIHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID9cbiAgICBnbG9iYWwgOiB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbmRpdmlkdWFsO1xuXG5mdW5jdGlvbiBJbmRpdmlkdWFsKGtleSwgdmFsdWUpIHtcbiAgICBpZiAoa2V5IGluIHJvb3QpIHtcbiAgICAgICAgcmV0dXJuIHJvb3Rba2V5XTtcbiAgICB9XG5cbiAgICByb290W2tleV0gPSB2YWx1ZTtcblxuICAgIHJldHVybiB2YWx1ZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEluZGl2aWR1YWwgPSByZXF1aXJlKCcuL2luZGV4LmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gT25lVmVyc2lvbjtcblxuZnVuY3Rpb24gT25lVmVyc2lvbihtb2R1bGVOYW1lLCB2ZXJzaW9uLCBkZWZhdWx0VmFsdWUpIHtcbiAgICB2YXIga2V5ID0gJ19fSU5ESVZJRFVBTF9PTkVfVkVSU0lPTl8nICsgbW9kdWxlTmFtZTtcbiAgICB2YXIgZW5mb3JjZUtleSA9IGtleSArICdfRU5GT1JDRV9TSU5HTEVUT04nO1xuXG4gICAgdmFyIHZlcnNpb25WYWx1ZSA9IEluZGl2aWR1YWwoZW5mb3JjZUtleSwgdmVyc2lvbik7XG5cbiAgICBpZiAodmVyc2lvblZhbHVlICE9PSB2ZXJzaW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG9ubHkgaGF2ZSBvbmUgY29weSBvZiAnICtcbiAgICAgICAgICAgIG1vZHVsZU5hbWUgKyAnLlxcbicgK1xuICAgICAgICAgICAgJ1lvdSBhbHJlYWR5IGhhdmUgdmVyc2lvbiAnICsgdmVyc2lvblZhbHVlICtcbiAgICAgICAgICAgICcgaW5zdGFsbGVkLlxcbicgK1xuICAgICAgICAgICAgJ1RoaXMgbWVhbnMgeW91IGNhbm5vdCBpbnN0YWxsIHZlcnNpb24gJyArIHZlcnNpb24pO1xuICAgIH1cblxuICAgIHJldHVybiBJbmRpdmlkdWFsKGtleSwgZGVmYXVsdFZhbHVlKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNsYXNzSWRTcGxpdCA9IC8oW1xcLiNdP1thLXpBLVowLTlcXHUwMDdGLVxcdUZGRkZfOi1dKykvO1xudmFyIG5vdENsYXNzSWQgPSAvXlxcLnwjLztcblxubW9kdWxlLmV4cG9ydHMgPSBwYXJzZVRhZztcblxuZnVuY3Rpb24gcGFyc2VUYWcodGFnLCBwcm9wcykge1xuICBpZiAoIXRhZykge1xuICAgIHJldHVybiAnRElWJztcbiAgfVxuXG4gIHZhciBub0lkID0gIShwcm9wcy5oYXNPd25Qcm9wZXJ0eSgnaWQnKSk7XG5cbiAgdmFyIHRhZ1BhcnRzID0gdGFnLnNwbGl0KGNsYXNzSWRTcGxpdCk7XG4gIHZhciB0YWdOYW1lID0gbnVsbDtcblxuICBpZiAobm90Q2xhc3NJZC50ZXN0KHRhZ1BhcnRzWzFdKSkge1xuICAgIHRhZ05hbWUgPSAnRElWJztcbiAgfVxuXG4gIHZhciBjbGFzc2VzLCBwYXJ0LCB0eXBlLCBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCB0YWdQYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIHBhcnQgPSB0YWdQYXJ0c1tpXTtcblxuICAgIGlmICghcGFydCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdHlwZSA9IHBhcnQuY2hhckF0KDApO1xuXG4gICAgaWYgKCF0YWdOYW1lKSB7XG4gICAgICB0YWdOYW1lID0gcGFydDtcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICcuJykge1xuICAgICAgY2xhc3NlcyA9IGNsYXNzZXMgfHwgW107XG4gICAgICBjbGFzc2VzLnB1c2gocGFydC5zdWJzdHJpbmcoMSwgcGFydC5sZW5ndGgpKTtcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICcjJyAmJiBub0lkKSB7XG4gICAgICBwcm9wcy5pZCA9IHBhcnQuc3Vic3RyaW5nKDEsIHBhcnQubGVuZ3RoKTtcbiAgICB9XG4gIH1cblxuICBpZiAoY2xhc3Nlcykge1xuICAgIGlmIChwcm9wcy5jbGFzc05hbWUpIHtcbiAgICAgIGNsYXNzZXMucHVzaChwcm9wcy5jbGFzc05hbWUpO1xuICAgIH1cblxuICAgIHByb3BzLmNsYXNzTmFtZSA9IGNsYXNzZXMuam9pbignICcpO1xuICB9XG5cbiAgcmV0dXJuIHByb3BzLm5hbWVzcGFjZSA/IHRhZ05hbWUgOiB0YWdOYW1lLnRvVXBwZXJDYXNlKCk7XG59XG4iLCJpbXBvcnQgY2hlY2sgZnJvbSAnY2hlY2stYXJnLXR5cGVzJ1xuaW1wb3J0IHtoLCByZW5kZXJ9IGZyb20gJ3lvbGsnXG5pbXBvcnQge0JlaGF2aW9yU3ViamVjdH0gZnJvbSAncnhqcy9CZWhhdmlvclN1YmplY3QnIFxuXG5pbXBvcnQgJ3J4anMvYWRkL29wZXJhdG9yL2ZpbHRlcidcbmltcG9ydCAncnhqcy9hZGQvb3BlcmF0b3IvbWVyZ2UnXG5pbXBvcnQgJ3J4anMvYWRkL29wZXJhdG9yL3NjYW4nXG5pbXBvcnQgJ3J4anMvYWRkL29wZXJhdG9yL3N0YXJ0V2l0aCdcbmltcG9ydCAncnhqcy9hZGQvb3BlcmF0b3Ivd2l0aExhdGVzdEZyb20nXG5cbmV4cG9ydCBkZWZhdWx0IFR5cGVBaGVhZFxuXG5cbmNvbnN0IElOSVRJQUxfUE9TID0gMFxuY29uc3QgS0VZID0ge1xuICBVUDogMzgsXG4gIERPV046IDQwLFxuICBFTlRFUjogMTMsXG4gIEVTQzogMjdcbn1cbmNvbnN0IEtFWV9WQUxVRVMgPSBbS0VZLlVQLCBLRVkuRE9XTiwgS0VZLkVOVEVSLCBLRVkuRVNDXVxuXG5mdW5jdGlvbiBUeXBlQWhlYWQoe3Byb3BzLCBjcmVhdGVFdmVudEhhbmRsZXJ9KSB7XG4gIHByb3BzID0gc2V0RGVmYXVsdFByb3BzKHByb3BzKVxuXG4gIGlmICghcHJvcHMuc2VhcmNoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgbmVlZCB0byBwcm92aWRlIGEgc2VhcmNoIGZ1bmN0aW9uJylcbiAgfVxuXG4gIC8vIFNldHVwIG91ciBldmVudHMgYW5kIHN0cmVhbXNcbiAgLy8gLS0tLVxuXG4gIGNvbnN0IGhhbmRsZUlucHV0ID0gY3JlYXRlRXZlbnRIYW5kbGVyKGV2ID0+IGV2LnRhcmdldC52YWx1ZSkgIFxuICBjb25zdCBkaXNwbGF5VmFsdWUgPSBuZXcgQmVoYXZpb3JTdWJqZWN0KCcnKVxuICBoYW5kbGVJbnB1dC5zdWJzY3JpYmUoZGlzcGxheVZhbHVlKSAvLyBkaXNwbGF5VmFsdWUgPT09IGV2LnRhcmdldC52YWx1ZVxuICBoYW5kbGVJbnB1dFxuICAgIC5maWx0ZXIodmFsID0+IHZhbCAmJiB2YWwubGVuZ3RoID49IHByb3BzLnRocmVzaG9sZClcbiAgICAuc3Vic2NyaWJlKGdldFNlYXJjaFJlc3VsdHMpXG5cbiAgY29uc3QgaGFuZGxlS2V5VXAgPSBjcmVhdGVFdmVudEhhbmRsZXIoZXYgPT4gZXYua2V5Q29kZSlcbiAgaGFuZGxlS2V5VXBcbiAgICBcbiAgICAvLyBPbmUgb2Ygb3VyIGBLRVlTYCB3YXMgcHJlc3NlZFxuICAgIC5maWx0ZXIoa2V5Q29kZSA9PiBLRVlfVkFMVUVTLmluZGV4T2Yoa2V5Q29kZSkgPiAtMSlcbiAgICBcbiAgICAvLyBDb21iaW5lIGBrZXlDb2RlYCB3aXRoIGBkaXNwbGF5VmFsdWVgIGluIGFuIG9iamVjdFxuICAgIC53aXRoTGF0ZXN0RnJvbShkaXNwbGF5VmFsdWUsIChrZXlDb2RlLCB2YWwpID0+ICh7a2V5Q29kZSwgdmFsfSkpXG4gICAgXG4gICAgLy8gQ29udGludWUgaWYgdGhlIGxlbmd0aCBvZiB0aGUgdXNlciBpbnB1dCBpcyA+PSBvdXIgdGhyZXNob2xkXG4gICAgLmZpbHRlcigoe3ZhbH0pID0+IHZhbCAmJiB2YWwubGVuZ3RoID49IHByb3BzLnRocmVzaG9sZClcbiAgICBcbiAgICAvLyBPaywgZG8gc3R1ZmYgZGVwZW5kaW5nIG9uIHRoZSBga2V5Q29kZWBcbiAgICAuc3Vic2NyaWJlKGhhbmRsZUtleUNvZGVzKVxuXG4gIC8vIFNldCBhbnkgdGVtcGxhdGUgZGF0YVxuICAvLyAtLS0tXG5cbiAgbGV0IGNsYXNzZXMgPSBbJ3R5cGUtYWhlYWQtaG9sZGVyJ107XG4gIGlmIChwcm9wcy5zaG93U3VnZ2VzdGlvbnMpIHtcbiAgICBjbGFzc2VzLnB1c2goJ3R5cGUtYWhlYWQtc3VnZ2VzdGlvbnMtdmlzaWJsZScpXG4gIH1cblxuICBjb25zdCBMaXN0SXRlbSA9IChzdWdnZXN0aW9uLCBpbmRleCkgPT4ge1xuICAgIGxldCBjbGFzc2VzID0gWyd0eXBlLWFoZWFkLWxpc3QtaXRlbSddXG4gICAgaWYgKGluZGV4ID09PSBwcm9wcy5jdXJyUG9zKSB7XG4gICAgICBjbGFzc2VzLnB1c2goJ2FjdGl2ZScpXG4gICAgfVxuICAgIHJldHVybiA8bGkgY2xhc3NOYW1lPXtjbGFzc2VzfT57c3VnZ2VzdGlvbn08L2xpPlxuICB9XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT17Y2xhc3Nlc30+XG4gICAgICA8aDE+e3Byb3BzLnRpdGxlfSAoe3Byb3BzLnN1Z2dlc3Rpb25zLm1hcCh4ID0+IHgubGVuZ3RoKX0pPC9oMT5cbiAgICAgIDxpbnB1dCBcbiAgICAgICAgcGxhY2Vob2xkZXI9e3Byb3BzLnBsYWNlaG9sZGVyfSBcbiAgICAgICAgdmFsdWU9e2Rpc3BsYXlWYWx1ZX1cbiAgICAgICAgb25JbnB1dD17aGFuZGxlSW5wdXR9XG4gICAgICAgIG9uS2V5VXA9e2hhbmRsZUtleVVwfVxuICAgICAgICAvL25nLWJsdXI9XCJwcm9wcy5vbkJsdXIoKVwiIFxuICAgICAgICBjbGFzc05hbWU9XCJ0eXBlLWFoZWFkLWlucHV0XCIgLz5cblxuICAgICAgPHVsIGNsYXNzTmFtZT1cInR5cGUtYWhlYWQtbGlzdFwiPlxuICAgICAgICB7cHJvcHMuc3VnZ2VzdGlvbnMubWFwKExpc3RJdGVtKX1cbiAgICAgIDwvdWw+XG4gICAgPC9kaXY+IFxuICApXG5cbiAgZnVuY3Rpb24gZ2V0U2VhcmNoUmVzdWx0cyh2YWwpIHtcbiAgICBwcm9wcy5zZWFyY2gubmV4dCh2YWwpXG4gICAgY29uc3Qgc3ViID0gcHJvcHMuc2VhcmNoXG4gICAgICAuZmlsdGVyKHZhbCA9PiBjaGVjay5wcm90b3R5cGUudG9UeXBlKHZhbCkgPT09ICdhcnJheScpXG4gICAgICAuc3Vic2NyaWJlKHJlc3VsdHMgPT4ge1xuICAgICAgICBwcm9wcy5jdXJyUG9zID0gSU5JVElBTF9QT1NcbiAgICAgICAgcHJvcHMuc3VnZ2VzdGlvbnMgPSByZXN1bHRzXG4gICAgICAgIHByb3BzLnNob3dTdWdnZXN0aW9ucyA9IHJlc3VsdHMubGVuZ3RoICYmIHZhbCAmJiB2YWwubGVuZ3RoID49IHByb3BzLnRocmVzaG9sZFxuICAgICAgfSlcbiAgICBzdWIudW5zdWJzY3JpYmUoKVxuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlS2V5Q29kZXMoe2tleUNvZGUsIHZhbH0pIHtcbiAgICBjb25zb2xlLmRlYnVnKCdoYW5kbGVLZXlDb2RlcycsIGtleUNvZGUsIHZhbCwgcHJvcHMpXG4gICAgc3dpdGNoIChrZXlDb2RlKSB7XG4gICAgICBjYXNlIEtFWS5VUDpcbiAgICAgICAgaWYgKHByb3BzLmN1cnJQb3MgPiAwKSB7XG4gICAgICAgICAgcHJvcHMuY3VyclBvcy0tXG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgS0VZLkRPV046XG4gICAgICAgIGxldCBtYXggPSBwcm9wcy5zdWdnZXN0aW9ucy5sZW5ndGggLSAxXG4gICAgICAgIGlmIChwcm9wcy5jdXJyUG9zIDwgbWF4IHx8IHByb3BzLmN1cnJQb3MgPT09IElOSVRJQUxfUE9TKSB7XG4gICAgICAgICAgcHJvcHMuY3VyclBvcysrXG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgS0VZLkVOVEVSOlxuICAgICAgICBjb25zb2xlLmRlYnVnKCdoYW5kbGVTZWxlY3Rpb24nLCBwcm9wcy5zdWdnZXN0aW9uc1twcm9wcy5jdXJyUG9zXSB8fCB2YWwpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIEtFWS5FU0M6XG4gICAgICAgIHByb3BzLnNob3dTdWdnZXN0aW9ucyA9IGZhbHNlXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHNldERlZmF1bHRQcm9wcyhwcm9wcykge1xuICBwcm9wcy5jdXJyUG9zID0gcHJvcHMuY3VyclBvcyB8fCBJTklUSUFMX1BPU1xuICBwcm9wcy5zdWdnZXN0aW9ucyA9IHByb3BzLnN1Z2dlc3Rpb25zIHx8IG5ldyBCZWhhdmlvclN1YmplY3QoW10pXG4gIHByb3BzLnNob3dTdWdnZXN0aW9ucyA9IHByb3BzLnNob3dTdWdnZXN0aW9ucyB8fCBmYWxzZVxuICBwcm9wcy50aHJlc2hvbGQgPSBwcm9wcy50aHJlc2hvbGQgfHwgMlxuICBwcm9wcy5saW1pdCA9IHByb3BzLmxpbWl0IHx8IEluZmluaXR5XG4gIHByb3BzLmRlbGF5ID0gcHJvcHMuZGVsYXkgfHwgMTAwXG4gIHJldHVybiBwcm9wc1xufVxuIiwiaW1wb3J0IHtoLCByZW5kZXJ9IGZyb20gJ3lvbGsnXG5pbXBvcnQge0JlaGF2aW9yU3ViamVjdH0gZnJvbSAncnhqcy9CZWhhdmlvclN1YmplY3QnXG5pbXBvcnQgY2hlY2sgZnJvbSAnY2hlY2stYXJnLXR5cGVzJ1xuXG5pbXBvcnQgVHlwZUFoZWFkIGZyb20gJy4vVHlwZUFoZWFkLmpzeCdcblxuXG5jb25zdCBzZWFyY2ggPSBuZXcgQmVoYXZpb3JTdWJqZWN0KCcnKVxuc2VhcmNoXG4gIC5maWx0ZXIodmFsID0+IGNoZWNrLnByb3RvdHlwZS50b1R5cGUodmFsKSA9PT0gJ3N0cmluZycpXG4gIC5zdWJzY3JpYmUoc3RyID0+IHNlYXJjaC5uZXh0KFsnYXJyYXknLCAnb2YnLCAnc3RyaW5nJywgJ3Jlc3VsdHMnXSkpXG5cbnJlbmRlcihcbiAgPFR5cGVBaGVhZCB0aXRsZT1cIlR5cGVBaGVhZFwiIHNlYXJjaD17c2VhcmNofT5UeXBlIGFoZWFkIG15IGdvb2QgZnJpZW5kPC9UeXBlQWhlYWQ+LFxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29udGFpbmVyJylcbikiXX0=
