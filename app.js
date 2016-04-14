(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./Subject":6,"./util/ObjectUnsubscribedError":42,"./util/throwError":52}],2:[function(require,module,exports){
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

},{"./Subscriber":8}],3:[function(require,module,exports){
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

},{"./symbol/observable":40,"./util/root":50,"./util/toSubscriber":53}],4:[function(require,module,exports){
"use strict";
exports.empty = {
    isUnsubscribed: true,
    next: function (value) { },
    error: function (err) { throw err; },
    complete: function () { }
};

},{}],5:[function(require,module,exports){
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

},{"./Subscriber":8}],6:[function(require,module,exports){
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

},{"./Observable":3,"./SubjectSubscription":7,"./Subscriber":8,"./Subscription":9,"./symbol/rxSubscriber":41,"./util/ObjectUnsubscribedError":42,"./util/throwError":52}],7:[function(require,module,exports){
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

},{"./Subscription":9}],8:[function(require,module,exports){
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

},{"./Observer":4,"./Subscription":9,"./symbol/rxSubscriber":41,"./util/isFunction":46}],9:[function(require,module,exports){
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

},{"./util/UnsubscriptionError":43,"./util/errorObject":44,"./util/isArray":45,"./util/isFunction":46,"./util/isObject":47,"./util/tryCatch":54}],10:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var combineLatest_1 = require('../../operator/combineLatest');
Observable_1.Observable.combineLatest = combineLatest_1.combineLatestStatic;

},{"../../Observable":3,"../../operator/combineLatest":26}],11:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var of_1 = require('../../observable/of');
Observable_1.Observable.of = of_1.of;

},{"../../Observable":3,"../../observable/of":25}],12:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var filter_1 = require('../../operator/filter');
Observable_1.Observable.prototype.filter = filter_1.filter;

},{"../../Observable":3,"../../operator/filter":28}],13:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var map_1 = require('../../operator/map');
Observable_1.Observable.prototype.map = map_1.map;

},{"../../Observable":3,"../../operator/map":29}],14:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var mapTo_1 = require('../../operator/mapTo');
Observable_1.Observable.prototype.mapTo = mapTo_1.mapTo;

},{"../../Observable":3,"../../operator/mapTo":30}],15:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var merge_1 = require('../../operator/merge');
Observable_1.Observable.prototype.merge = merge_1.merge;

},{"../../Observable":3,"../../operator/merge":31}],16:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var scan_1 = require('../../operator/scan');
Observable_1.Observable.prototype.scan = scan_1.scan;

},{"../../Observable":3,"../../operator/scan":34}],17:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var share_1 = require('../../operator/share');
Observable_1.Observable.prototype.share = share_1.share;

},{"../../Observable":3,"../../operator/share":35}],18:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var startWith_1 = require('../../operator/startWith');
Observable_1.Observable.prototype.startWith = startWith_1.startWith;

},{"../../Observable":3,"../../operator/startWith":36}],19:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var switchMap_1 = require('../../operator/switchMap');
Observable_1.Observable.prototype.switchMap = switchMap_1.switchMap;

},{"../../Observable":3,"../../operator/switchMap":37}],20:[function(require,module,exports){
"use strict";
var Observable_1 = require('../../Observable');
var withLatestFrom_1 = require('../../operator/withLatestFrom');
Observable_1.Observable.prototype.withLatestFrom = withLatestFrom_1.withLatestFrom;

},{"../../Observable":3,"../../operator/withLatestFrom":38}],21:[function(require,module,exports){
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

},{"../Observable":3,"../util/isScheduler":49,"./EmptyObservable":23,"./ScalarObservable":24}],22:[function(require,module,exports){
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

},{"../Observable":3,"../Subscriber":8,"../Subscription":9}],23:[function(require,module,exports){
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

},{"../Observable":3}],24:[function(require,module,exports){
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

},{"../Observable":3}],25:[function(require,module,exports){
"use strict";
var ArrayObservable_1 = require('./ArrayObservable');
exports.of = ArrayObservable_1.ArrayObservable.of;

},{"./ArrayObservable":21}],26:[function(require,module,exports){
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

},{"../OuterSubscriber":5,"../observable/ArrayObservable":21,"../util/isArray":45,"../util/isScheduler":49,"../util/subscribeToResult":51}],27:[function(require,module,exports){
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

},{"../observable/ArrayObservable":21,"../util/isScheduler":49,"./mergeAll":32}],28:[function(require,module,exports){
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

},{"../Subscriber":8}],29:[function(require,module,exports){
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

},{"../Subscriber":8}],30:[function(require,module,exports){
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

},{"../Subscriber":8}],31:[function(require,module,exports){
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

},{"../observable/ArrayObservable":21,"../util/isScheduler":49,"./mergeAll":32}],32:[function(require,module,exports){
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

},{"../OuterSubscriber":5,"../util/subscribeToResult":51}],33:[function(require,module,exports){
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

},{"../observable/ConnectableObservable":22}],34:[function(require,module,exports){
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

},{"../Subscriber":8}],35:[function(require,module,exports){
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

},{"../Subject":6,"./multicast":33}],36:[function(require,module,exports){
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

},{"../observable/ArrayObservable":21,"../observable/EmptyObservable":23,"../observable/ScalarObservable":24,"../util/isScheduler":49,"./concat":27}],37:[function(require,module,exports){
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

},{"../OuterSubscriber":5,"../util/subscribeToResult":51}],38:[function(require,module,exports){
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

},{"../OuterSubscriber":5,"../util/subscribeToResult":51}],39:[function(require,module,exports){
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

},{"../util/root":50}],40:[function(require,module,exports){
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

},{"../util/root":50}],41:[function(require,module,exports){
"use strict";
var root_1 = require('../util/root');
var Symbol = root_1.root.Symbol;
exports.$$rxSubscriber = (typeof Symbol === 'function' && typeof Symbol.for === 'function') ?
    Symbol.for('rxSubscriber') : '@@rxSubscriber';

},{"../util/root":50}],42:[function(require,module,exports){
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

},{}],43:[function(require,module,exports){
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

},{}],44:[function(require,module,exports){
"use strict";
// typeof any so that it we don't have to cast when comparing a result to the error object
exports.errorObject = { e: {} };

},{}],45:[function(require,module,exports){
"use strict";
exports.isArray = Array.isArray || (function (x) { return x && typeof x.length === 'number'; });

},{}],46:[function(require,module,exports){
"use strict";
function isFunction(x) {
    return typeof x === 'function';
}
exports.isFunction = isFunction;

},{}],47:[function(require,module,exports){
"use strict";
function isObject(x) {
    return x != null && typeof x === 'object';
}
exports.isObject = isObject;

},{}],48:[function(require,module,exports){
"use strict";
function isPromise(value) {
    return value && typeof value.subscribe !== 'function' && typeof value.then === 'function';
}
exports.isPromise = isPromise;

},{}],49:[function(require,module,exports){
"use strict";
function isScheduler(value) {
    return value && typeof value.schedule === 'function';
}
exports.isScheduler = isScheduler;

},{}],50:[function(require,module,exports){
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

},{}],51:[function(require,module,exports){
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

},{"../InnerSubscriber":2,"../Observable":3,"../symbol/iterator":39,"../symbol/observable":40,"./isArray":45,"./isPromise":48,"./root":50}],52:[function(require,module,exports){
"use strict";
function throwError(e) { throw e; }
exports.throwError = throwError;

},{}],53:[function(require,module,exports){
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

},{"../Subscriber":8,"../symbol/rxSubscriber":41}],54:[function(require,module,exports){
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

},{"./errorObject":44}],55:[function(require,module,exports){

},{}],56:[function(require,module,exports){
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

},{}],57:[function(require,module,exports){
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
},{"./eventDelegator":70,"./get":73,"./is":76,"./mountable":78,"./propertyDescriptors":80,"./set":82,"global/document":99}],58:[function(require,module,exports){
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
},{"./createComponentProps":62,"./createCompositeSubject":63,"./createEventHandler":64,"./createObservableFromArray":66,"./set":82,"./symbol":83,"cuid":86}],59:[function(require,module,exports){
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
},{"./NodeProxy":57,"./batchInsertMessages":61,"./createCompositeSubject":63,"./createNodeProps":65,"./createObservableFromArray":66,"./createPatchChildren":67,"./createPatchProperties":68,"./flatten":72,"./parseTag":79,"./set":82,"./symbol":83,"./wrapText":85,"rxjs/add/operator/map":13}],60:[function(require,module,exports){
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
},{"./is":76,"rxjs/Observable":3,"rxjs/add/observable/of":11}],61:[function(require,module,exports){
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
},{}],62:[function(require,module,exports){
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
},{"./is":76,"rxjs/BehaviorSubject":1}],63:[function(require,module,exports){
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
},{"rxjs/BehaviorSubject":1,"rxjs/Observable":3,"rxjs/Observer":4,"rxjs/Subject":6,"rxjs/Subscription":9,"rxjs/add/operator/switchMap":19}],64:[function(require,module,exports){
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
},{"./is":76,"rxjs/Observable":3,"rxjs/Observer":4,"rxjs/Subject":6,"rxjs/Subscription":9,"rxjs/add/operator/map":13,"rxjs/add/operator/mapTo":14,"rxjs/add/operator/share":17}],65:[function(require,module,exports){
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
},{"./asObservable":60,"./eventsList":71,"./is":76,"rxjs/Observable":3,"rxjs/add/observable/combineLatest":10,"rxjs/add/observable/of":11}],66:[function(require,module,exports){
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
},{"./asObservable":60,"rxjs/Observable":3,"rxjs/add/observable/combineLatest":10,"rxjs/add/observable/of":11}],67:[function(require,module,exports){
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
},{"./keyIndex":77,"dift":87}],68:[function(require,module,exports){
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
},{}],69:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/* @flow */

var emptyObject = exports.emptyObject = Object.freeze({});
},{}],70:[function(require,module,exports){
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
},{"./eventsList":71,"dom-delegator":91,"dom-delegator/dom-delegator":90}],71:[function(require,module,exports){
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
},{}],72:[function(require,module,exports){
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
},{}],73:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.get = get;
function get(obj, key) {
  return obj[key];
}
},{}],74:[function(require,module,exports){
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
},{"./VirtualComponent":58,"./VirtualNode":59,"./emptyObject":69,"./flatten":72,"./is":76}],75:[function(require,module,exports){
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
},{"./h":74,"./render":81}],76:[function(require,module,exports){
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
},{"./symbol":83,"rxjs/Observable":3,"rxjs/Subject":6}],77:[function(require,module,exports){
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
},{}],78:[function(require,module,exports){
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
},{"./CustomEvent":56,"./is":76}],79:[function(require,module,exports){
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
},{"parse-tag":102}],80:[function(require,module,exports){
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
},{"./eventsList":71}],81:[function(require,module,exports){
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
},{"./NodeProxy":57,"./batchInsertMessages":61,"./is":76,"./symbol":83,"./types":84}],82:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.set = set;
function set(obj, key, value) {
  obj[key] = value;
}
},{}],83:[function(require,module,exports){
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

},{}],84:[function(require,module,exports){
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
},{}],85:[function(require,module,exports){
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
},{"./VirtualNode":59,"./h":74,"./is":76}],86:[function(require,module,exports){
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

},{}],87:[function(require,module,exports){
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
},{"bit-vector":88}],88:[function(require,module,exports){
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
},{}],89:[function(require,module,exports){
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

},{"ev-store":98}],90:[function(require,module,exports){
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

},{"./add-event.js":89,"./proxy-event.js":96,"./remove-event.js":97,"ev-store":98,"global/document":99,"weakmap-shim/create-store":94}],91:[function(require,module,exports){
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

},{"./dom-delegator.js":90,"cuid":86,"global/document":99,"individual":92}],92:[function(require,module,exports){
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

},{}],93:[function(require,module,exports){
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

},{}],94:[function(require,module,exports){
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

},{"./hidden-store.js":95}],95:[function(require,module,exports){
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

},{}],96:[function(require,module,exports){
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

},{"inherits":93}],97:[function(require,module,exports){
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

},{"ev-store":98}],98:[function(require,module,exports){
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

},{"individual/one-version":101}],99:[function(require,module,exports){
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

},{"min-document":55}],100:[function(require,module,exports){
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

},{}],101:[function(require,module,exports){
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

},{"./index.js":100}],102:[function(require,module,exports){
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

},{}],103:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _yolk = require('yolk');

var _BehaviorSubject = require('rxjs/BehaviorSubject');

require('rxjs/add/operator/filter');

require('rxjs/add/operator/merge');

require('rxjs/add/operator/scan');

require('rxjs/add/operator/startWith');

require('rxjs/add/operator/withLatestFrom');

exports.default = TypeAhead;


var DEFAULT_POS = 0;
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

  var handleKeyUp = createEventHandler(function (ev) {
    return ev.keyCode;
  });
  var handleInput = createEventHandler(function (ev) {
    return ev.target.value;
  });
  var displayValue = new _BehaviorSubject.BehaviorSubject('');

  handleInput.subscribe(displayValue);

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
  .subscribe(function (_ref3) {
    var keyCode = _ref3.keyCode;
    var val = _ref3.val;

    switch (keyCode) {
      case KEY.UP:
        if (props.currPos > 0) {
          props.currPos--;
        }
        break;
      case KEY.DOWN:
        var max = props.suggestions.length - 1;
        if (props.currPos < max || props.currPos === DEFAULT_POS) {
          props.currPos++;
        }
        break;
      case KEY.ENTER:
        console.debug('handleSelection', props.suggestions[props.currPos] || val);
        break;
      case KEY.ESC:
        props.showSuggestions = false;
    }
  });

  var classes = ['type-ahead-holder'];
  if (props.showSuggestions) {
    classes.push('type-ahead-suggestions-visible');
  }

  return (0, _yolk.h)(
    'div',
    { className: classes },
    (0, _yolk.h)('input', {
      placeholder: props.placeholder
      // value={displayValue}
      , onInput: handleInput,
      onKeyUp: handleKeyUp
      //ng-blur="props.onBlur()"
      , className: 'type-ahead-input' }),
    (0, _yolk.h)('ul', { className: 'type-ahead-list' })
  );
}

function setDefaultProps(props) {
  props.currPos = props.currPos || DEFAULT_POS;
  props.suggestions = props.suggestions || [];
  props.showSuggestions = props.showSuggestions || false;
  props.threshold = props.threshold || 2;
  props.limit = props.limit || Infinity;
  props.delay = props.delay || 100;
  return props;
}

},{"rxjs/BehaviorSubject":1,"rxjs/add/operator/filter":12,"rxjs/add/operator/merge":15,"rxjs/add/operator/scan":16,"rxjs/add/operator/startWith":18,"rxjs/add/operator/withLatestFrom":20,"yolk":75}],104:[function(require,module,exports){
'use strict';

var _yolk = require('yolk');

var _TypeAhead = require('./TypeAhead.jsx');

var _TypeAhead2 = _interopRequireDefault(_TypeAhead);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _yolk.render)((0, _yolk.h)(
  _TypeAhead2.default,
  { title: 'TypeAhead' },
  'Type ahead my good friend'
), document.getElementById('container'));

},{"./TypeAhead.jsx":103,"yolk":75}]},{},[104])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvQmVoYXZpb3JTdWJqZWN0LmpzIiwibm9kZV9tb2R1bGVzL3J4anMvSW5uZXJTdWJzY3JpYmVyLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvT2JzZXJ2YWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL09ic2VydmVyLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvT3V0ZXJTdWJzY3JpYmVyLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvU3ViamVjdC5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL1N1YmplY3RTdWJzY3JpcHRpb24uanMiLCJub2RlX21vZHVsZXMvcnhqcy9TdWJzY3JpYmVyLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvU3Vic2NyaXB0aW9uLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvYWRkL29ic2VydmFibGUvY29tYmluZUxhdGVzdC5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL2FkZC9vYnNlcnZhYmxlL29mLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvYWRkL29wZXJhdG9yL2ZpbHRlci5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL2FkZC9vcGVyYXRvci9tYXAuanMiLCJub2RlX21vZHVsZXMvcnhqcy9hZGQvb3BlcmF0b3IvbWFwVG8uanMiLCJub2RlX21vZHVsZXMvcnhqcy9hZGQvb3BlcmF0b3IvbWVyZ2UuanMiLCJub2RlX21vZHVsZXMvcnhqcy9hZGQvb3BlcmF0b3Ivc2Nhbi5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL2FkZC9vcGVyYXRvci9zaGFyZS5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL2FkZC9vcGVyYXRvci9zdGFydFdpdGguanMiLCJub2RlX21vZHVsZXMvcnhqcy9hZGQvb3BlcmF0b3Ivc3dpdGNoTWFwLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvYWRkL29wZXJhdG9yL3dpdGhMYXRlc3RGcm9tLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb2JzZXJ2YWJsZS9BcnJheU9ic2VydmFibGUuanMiLCJub2RlX21vZHVsZXMvcnhqcy9vYnNlcnZhYmxlL0Nvbm5lY3RhYmxlT2JzZXJ2YWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL29ic2VydmFibGUvRW1wdHlPYnNlcnZhYmxlLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb2JzZXJ2YWJsZS9TY2FsYXJPYnNlcnZhYmxlLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb2JzZXJ2YWJsZS9vZi5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL29wZXJhdG9yL2NvbWJpbmVMYXRlc3QuanMiLCJub2RlX21vZHVsZXMvcnhqcy9vcGVyYXRvci9jb25jYXQuanMiLCJub2RlX21vZHVsZXMvcnhqcy9vcGVyYXRvci9maWx0ZXIuanMiLCJub2RlX21vZHVsZXMvcnhqcy9vcGVyYXRvci9tYXAuanMiLCJub2RlX21vZHVsZXMvcnhqcy9vcGVyYXRvci9tYXBUby5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL29wZXJhdG9yL21lcmdlLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3IvbWVyZ2VBbGwuanMiLCJub2RlX21vZHVsZXMvcnhqcy9vcGVyYXRvci9tdWx0aWNhc3QuanMiLCJub2RlX21vZHVsZXMvcnhqcy9vcGVyYXRvci9zY2FuLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvb3BlcmF0b3Ivc2hhcmUuanMiLCJub2RlX21vZHVsZXMvcnhqcy9vcGVyYXRvci9zdGFydFdpdGguanMiLCJub2RlX21vZHVsZXMvcnhqcy9vcGVyYXRvci9zd2l0Y2hNYXAuanMiLCJub2RlX21vZHVsZXMvcnhqcy9vcGVyYXRvci93aXRoTGF0ZXN0RnJvbS5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3N5bWJvbC9pdGVyYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3N5bWJvbC9vYnNlcnZhYmxlLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvc3ltYm9sL3J4U3Vic2NyaWJlci5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3V0aWwvT2JqZWN0VW5zdWJzY3JpYmVkRXJyb3IuanMiLCJub2RlX21vZHVsZXMvcnhqcy91dGlsL1Vuc3Vic2NyaXB0aW9uRXJyb3IuanMiLCJub2RlX21vZHVsZXMvcnhqcy91dGlsL2Vycm9yT2JqZWN0LmpzIiwibm9kZV9tb2R1bGVzL3J4anMvdXRpbC9pc0FycmF5LmpzIiwibm9kZV9tb2R1bGVzL3J4anMvdXRpbC9pc0Z1bmN0aW9uLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvdXRpbC9pc09iamVjdC5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3V0aWwvaXNQcm9taXNlLmpzIiwibm9kZV9tb2R1bGVzL3J4anMvdXRpbC9pc1NjaGVkdWxlci5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3V0aWwvcm9vdC5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3V0aWwvc3Vic2NyaWJlVG9SZXN1bHQuanMiLCJub2RlX21vZHVsZXMvcnhqcy91dGlsL3Rocm93RXJyb3IuanMiLCJub2RlX21vZHVsZXMvcnhqcy91dGlsL3RvU3Vic2NyaWJlci5qcyIsIm5vZGVfbW9kdWxlcy9yeGpzL3V0aWwvdHJ5Q2F0Y2guanMiLCJub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcmVzb2x2ZS9lbXB0eS5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9DdXN0b21FdmVudC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9Ob2RlUHJveHkuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvVmlydHVhbENvbXBvbmVudC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9WaXJ0dWFsTm9kZS5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9hc09ic2VydmFibGUuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvYmF0Y2hJbnNlcnRNZXNzYWdlcy5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9jcmVhdGVDb21wb25lbnRQcm9wcy5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9jcmVhdGVDb21wb3NpdGVTdWJqZWN0LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2NyZWF0ZUV2ZW50SGFuZGxlci5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9jcmVhdGVOb2RlUHJvcHMuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvY3JlYXRlT2JzZXJ2YWJsZUZyb21BcnJheS5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9jcmVhdGVQYXRjaENoaWxkcmVuLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2NyZWF0ZVBhdGNoUHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9lbXB0eU9iamVjdC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9ldmVudERlbGVnYXRvci5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9ldmVudHNMaXN0LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2ZsYXR0ZW4uanMiLCJub2RlX21vZHVsZXMveW9say9saWIvZ2V0LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL2guanMiLCJub2RlX21vZHVsZXMveW9say9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMveW9say9saWIvaXMuanMiLCJub2RlX21vZHVsZXMveW9say9saWIva2V5SW5kZXguanMiLCJub2RlX21vZHVsZXMveW9say9saWIvbW91bnRhYmxlLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL3BhcnNlVGFnLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL3Byb3BlcnR5RGVzY3JpcHRvcnMuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvcmVuZGVyLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbGliL3NldC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL2xpYi9zeW1ib2wuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvdHlwZXMuanMiLCJub2RlX21vZHVsZXMveW9say9saWIvd3JhcFRleHQuanMiLCJub2RlX21vZHVsZXMveW9say9ub2RlX21vZHVsZXMvY3VpZC9kaXN0L2Jyb3dzZXItY3VpZC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL25vZGVfbW9kdWxlcy9kaWZ0L2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL25vZGVfbW9kdWxlcy9kaWZ0L25vZGVfbW9kdWxlcy9iaXQtdmVjdG9yL2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL25vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL2FkZC1ldmVudC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL25vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL2RvbS1kZWxlZ2F0b3IuanMiLCJub2RlX21vZHVsZXMveW9say9ub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL25vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL25vZGVfbW9kdWxlcy9pbmRpdmlkdWFsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3Ivbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMveW9say9ub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9ub2RlX21vZHVsZXMvd2Vha21hcC1zaGltL2NyZWF0ZS1zdG9yZS5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL25vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL25vZGVfbW9kdWxlcy93ZWFrbWFwLXNoaW0vaGlkZGVuLXN0b3JlLmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3IvcHJveHktZXZlbnQuanMiLCJub2RlX21vZHVsZXMveW9say9ub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9yZW1vdmUtZXZlbnQuanMiLCJub2RlX21vZHVsZXMveW9say9ub2RlX21vZHVsZXMvZXYtc3RvcmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMveW9say9ub2RlX21vZHVsZXMvZ2xvYmFsL2RvY3VtZW50LmpzIiwibm9kZV9tb2R1bGVzL3lvbGsvbm9kZV9tb2R1bGVzL2luZGl2aWR1YWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMveW9say9ub2RlX21vZHVsZXMvaW5kaXZpZHVhbC9vbmUtdmVyc2lvbi5qcyIsIm5vZGVfbW9kdWxlcy95b2xrL25vZGVfbW9kdWxlcy9wYXJzZS10YWcvaW5kZXguanMiLCJzcmMvVHlwZUFoZWFkLmpzeCIsInNyYy9pbmRleC5qc3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FDcERBOztBQUNBOztBQUVBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztrQkFFZTs7O0FBR2YsSUFBTSxjQUFjLENBQWQ7QUFDTixJQUFNLE1BQU07QUFDVixNQUFJLEVBQUo7QUFDQSxRQUFNLEVBQU47QUFDQSxTQUFPLEVBQVA7QUFDQSxPQUFLLEVBQUw7Q0FKSTtBQU1OLElBQU0sYUFBYSxDQUFDLElBQUksRUFBSixFQUFRLElBQUksSUFBSixFQUFVLElBQUksS0FBSixFQUFXLElBQUksR0FBSixDQUEzQzs7QUFFTixTQUFTLFNBQVQsT0FBZ0Q7TUFBNUIsbUJBQTRCO01BQXJCLDZDQUFxQjs7QUFDOUMsVUFBUSxnQkFBZ0IsS0FBaEIsQ0FBUixDQUQ4Qzs7QUFHOUMsTUFBTSxjQUFjLG1CQUFtQjtXQUFNLEdBQUcsT0FBSDtHQUFOLENBQWpDLENBSHdDO0FBSTlDLE1BQU0sY0FBYyxtQkFBbUI7V0FBTSxHQUFHLE1BQUgsQ0FBVSxLQUFWO0dBQU4sQ0FBakMsQ0FKd0M7QUFLOUMsTUFBTSxlQUFlLHFDQUFvQixFQUFwQixDQUFmLENBTHdDOztBQU85QyxjQUFZLFNBQVosQ0FBc0IsWUFBdEIsRUFQOEM7O0FBUzlDOzs7R0FHRyxNQUhILENBR1U7V0FBVyxXQUFXLE9BQVgsQ0FBbUIsT0FBbkIsSUFBOEIsQ0FBQyxDQUFEO0dBQXpDOzs7QUFIVixHQU1HLGNBTkgsQ0FNa0IsWUFObEIsRUFNZ0MsVUFBQyxPQUFELEVBQVUsR0FBVjtXQUFtQixFQUFDLGdCQUFELEVBQVUsUUFBVjtHQUFuQjs7O0FBTmhDLEdBU0csTUFUSCxDQVNVO1FBQUU7V0FBUyxPQUFPLElBQUksTUFBSixJQUFjLE1BQU0sU0FBTjtHQUFoQzs7O0FBVFYsR0FZRyxTQVpILENBWWEsaUJBQW9CO1FBQWxCLHdCQUFrQjtRQUFULGdCQUFTOztBQUM3QixZQUFRLE9BQVI7QUFDRSxXQUFLLElBQUksRUFBSjtBQUNILFlBQUksTUFBTSxPQUFOLEdBQWdCLENBQWhCLEVBQW1CO0FBQ3JCLGdCQUFNLE9BQU4sR0FEcUI7U0FBdkI7QUFHQSxjQUpGO0FBREYsV0FNTyxJQUFJLElBQUo7QUFDSCxZQUFJLE1BQU0sTUFBTSxXQUFOLENBQWtCLE1BQWxCLEdBQTJCLENBQTNCLENBRFo7QUFFRSxZQUFJLE1BQU0sT0FBTixHQUFnQixHQUFoQixJQUF1QixNQUFNLE9BQU4sS0FBa0IsV0FBbEIsRUFBK0I7QUFDeEQsZ0JBQU0sT0FBTixHQUR3RDtTQUExRDtBQUdBLGNBTEY7QUFORixXQVlPLElBQUksS0FBSjtBQUNILGdCQUFRLEtBQVIsQ0FBYyxpQkFBZCxFQUFpQyxNQUFNLFdBQU4sQ0FBa0IsTUFBTSxPQUFOLENBQWxCLElBQW9DLEdBQXBDLENBQWpDLENBREY7QUFFRSxjQUZGO0FBWkYsV0FlTyxJQUFJLEdBQUo7QUFDSCxjQUFNLGVBQU4sR0FBd0IsS0FBeEIsQ0FERjtBQWZGLEtBRDZCO0dBQXBCLENBWmIsQ0FUOEM7O0FBMEM5QyxNQUFJLFVBQVUsQ0FBQyxtQkFBRCxDQUFWLENBMUMwQztBQTJDOUMsTUFBSSxNQUFNLGVBQU4sRUFBdUI7QUFDekIsWUFBUSxJQUFSLENBQWEsZ0NBQWIsRUFEeUI7R0FBM0I7O0FBSUEsU0FDRTs7TUFBSyxXQUFXLE9BQVgsRUFBTDtJQUNFO0FBQ0UsbUJBQWEsTUFBTSxXQUFOOztRQUViLFNBQVMsV0FBVDtBQUNBLGVBQVMsV0FBVDs7UUFFQSxXQUFVLGtCQUFWLEVBTkYsQ0FERjtJQVNFLHFCQUFJLFdBQVUsaUJBQVYsRUFBSixDQVRGO0dBREYsQ0EvQzhDO0NBQWhEOztBQWlFQSxTQUFTLGVBQVQsQ0FBeUIsS0FBekIsRUFBZ0M7QUFDOUIsUUFBTSxPQUFOLEdBQWdCLE1BQU0sT0FBTixJQUFpQixXQUFqQixDQURjO0FBRTlCLFFBQU0sV0FBTixHQUFvQixNQUFNLFdBQU4sSUFBcUIsRUFBckIsQ0FGVTtBQUc5QixRQUFNLGVBQU4sR0FBd0IsTUFBTSxlQUFOLElBQXlCLEtBQXpCLENBSE07QUFJOUIsUUFBTSxTQUFOLEdBQWtCLE1BQU0sU0FBTixJQUFtQixDQUFuQixDQUpZO0FBSzlCLFFBQU0sS0FBTixHQUFjLE1BQU0sS0FBTixJQUFlLFFBQWYsQ0FMZ0I7QUFNOUIsUUFBTSxLQUFOLEdBQWMsTUFBTSxLQUFOLElBQWUsR0FBZixDQU5nQjtBQU85QixTQUFPLEtBQVAsQ0FQOEI7Q0FBaEM7Ozs7O0FDdEZBOztBQUNBOzs7Ozs7QUFFQSxrQkFDRTs7SUFBVyxPQUFNLFdBQU4sRUFBWDs7Q0FERixFQUVFLFNBQVMsY0FBVCxDQUF3QixXQUF4QixDQUZGIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgU3ViamVjdF8xID0gcmVxdWlyZSgnLi9TdWJqZWN0Jyk7XG52YXIgdGhyb3dFcnJvcl8xID0gcmVxdWlyZSgnLi91dGlsL3Rocm93RXJyb3InKTtcbnZhciBPYmplY3RVbnN1YnNjcmliZWRFcnJvcl8xID0gcmVxdWlyZSgnLi91dGlsL09iamVjdFVuc3Vic2NyaWJlZEVycm9yJyk7XG4vKipcbiAqIEBjbGFzcyBCZWhhdmlvclN1YmplY3Q8VD5cbiAqL1xudmFyIEJlaGF2aW9yU3ViamVjdCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJlaGF2aW9yU3ViamVjdCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCZWhhdmlvclN1YmplY3QoX3ZhbHVlKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLl92YWx1ZSA9IF92YWx1ZTtcbiAgICB9XG4gICAgQmVoYXZpb3JTdWJqZWN0LnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzRXJyb3JlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcl8xLnRocm93RXJyb3IodGhpcy5lcnJvclZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yXzEudGhyb3dFcnJvcihuZXcgT2JqZWN0VW5zdWJzY3JpYmVkRXJyb3JfMS5PYmplY3RVbnN1YnNjcmliZWRFcnJvcigpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl92YWx1ZTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEJlaGF2aW9yU3ViamVjdC5wcm90b3R5cGUsIFwidmFsdWVcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFZhbHVlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIEJlaGF2aW9yU3ViamVjdC5wcm90b3R5cGUuX3N1YnNjcmliZSA9IGZ1bmN0aW9uIChzdWJzY3JpYmVyKSB7XG4gICAgICAgIHZhciBzdWJzY3JpcHRpb24gPSBfc3VwZXIucHJvdG90eXBlLl9zdWJzY3JpYmUuY2FsbCh0aGlzLCBzdWJzY3JpYmVyKTtcbiAgICAgICAgaWYgKHN1YnNjcmlwdGlvbiAmJiAhc3Vic2NyaXB0aW9uLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICBzdWJzY3JpYmVyLm5leHQodGhpcy5fdmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgfTtcbiAgICBCZWhhdmlvclN1YmplY3QucHJvdG90eXBlLl9uZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIF9zdXBlci5wcm90b3R5cGUuX25leHQuY2FsbCh0aGlzLCB0aGlzLl92YWx1ZSA9IHZhbHVlKTtcbiAgICB9O1xuICAgIEJlaGF2aW9yU3ViamVjdC5wcm90b3R5cGUuX2Vycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB0aGlzLmhhc0Vycm9yZWQgPSB0cnVlO1xuICAgICAgICBfc3VwZXIucHJvdG90eXBlLl9lcnJvci5jYWxsKHRoaXMsIHRoaXMuZXJyb3JWYWx1ZSA9IGVycik7XG4gICAgfTtcbiAgICByZXR1cm4gQmVoYXZpb3JTdWJqZWN0O1xufShTdWJqZWN0XzEuU3ViamVjdCkpO1xuZXhwb3J0cy5CZWhhdmlvclN1YmplY3QgPSBCZWhhdmlvclN1YmplY3Q7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1CZWhhdmlvclN1YmplY3QuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuL1N1YnNjcmliZXInKTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgSW5uZXJTdWJzY3JpYmVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoSW5uZXJTdWJzY3JpYmVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIElubmVyU3Vic2NyaWJlcihwYXJlbnQsIG91dGVyVmFsdWUsIG91dGVySW5kZXgpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgICAgICB0aGlzLm91dGVyVmFsdWUgPSBvdXRlclZhbHVlO1xuICAgICAgICB0aGlzLm91dGVySW5kZXggPSBvdXRlckluZGV4O1xuICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICB9XG4gICAgSW5uZXJTdWJzY3JpYmVyLnByb3RvdHlwZS5fbmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLnBhcmVudC5ub3RpZnlOZXh0KHRoaXMub3V0ZXJWYWx1ZSwgdmFsdWUsIHRoaXMub3V0ZXJJbmRleCwgdGhpcy5pbmRleCsrLCB0aGlzKTtcbiAgICB9O1xuICAgIElubmVyU3Vic2NyaWJlci5wcm90b3R5cGUuX2Vycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIHRoaXMucGFyZW50Lm5vdGlmeUVycm9yKGVycm9yLCB0aGlzKTtcbiAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgIH07XG4gICAgSW5uZXJTdWJzY3JpYmVyLnByb3RvdHlwZS5fY29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucGFyZW50Lm5vdGlmeUNvbXBsZXRlKHRoaXMpO1xuICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgfTtcbiAgICByZXR1cm4gSW5uZXJTdWJzY3JpYmVyO1xufShTdWJzY3JpYmVyXzEuU3Vic2NyaWJlcikpO1xuZXhwb3J0cy5Jbm5lclN1YnNjcmliZXIgPSBJbm5lclN1YnNjcmliZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1Jbm5lclN1YnNjcmliZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgcm9vdF8xID0gcmVxdWlyZSgnLi91dGlsL3Jvb3QnKTtcbnZhciBvYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuL3N5bWJvbC9vYnNlcnZhYmxlJyk7XG52YXIgdG9TdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuL3V0aWwvdG9TdWJzY3JpYmVyJyk7XG4vKipcbiAqIEEgcmVwcmVzZW50YXRpb24gb2YgYW55IHNldCBvZiB2YWx1ZXMgb3ZlciBhbnkgYW1vdW50IG9mIHRpbWUuIFRoaXMgdGhlIG1vc3QgYmFzaWMgYnVpbGRpbmcgYmxvY2tcbiAqIG9mIFJ4SlMuXG4gKlxuICogQGNsYXNzIE9ic2VydmFibGU8VD5cbiAqL1xudmFyIE9ic2VydmFibGUgPSAoZnVuY3Rpb24gKCkge1xuICAgIC8qKlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IHN1YnNjcmliZSB0aGUgZnVuY3Rpb24gdGhhdCBpcyAgY2FsbGVkIHdoZW4gdGhlIE9ic2VydmFibGUgaXNcbiAgICAgKiBpbml0aWFsbHkgc3Vic2NyaWJlZCB0by4gVGhpcyBmdW5jdGlvbiBpcyBnaXZlbiBhIFN1YnNjcmliZXIsIHRvIHdoaWNoIG5ldyB2YWx1ZXNcbiAgICAgKiBjYW4gYmUgYG5leHRgZWQsIG9yIGFuIGBlcnJvcmAgbWV0aG9kIGNhbiBiZSBjYWxsZWQgdG8gcmFpc2UgYW4gZXJyb3IsIG9yXG4gICAgICogYGNvbXBsZXRlYCBjYW4gYmUgY2FsbGVkIHRvIG5vdGlmeSBvZiBhIHN1Y2Nlc3NmdWwgY29tcGxldGlvbi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBPYnNlcnZhYmxlKHN1YnNjcmliZSkge1xuICAgICAgICB0aGlzLl9pc1NjYWxhciA9IGZhbHNlO1xuICAgICAgICBpZiAoc3Vic2NyaWJlKSB7XG4gICAgICAgICAgICB0aGlzLl9zdWJzY3JpYmUgPSBzdWJzY3JpYmU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBPYnNlcnZhYmxlLCB3aXRoIHRoaXMgT2JzZXJ2YWJsZSBhcyB0aGUgc291cmNlLCBhbmQgdGhlIHBhc3NlZFxuICAgICAqIG9wZXJhdG9yIGRlZmluZWQgYXMgdGhlIG5ldyBvYnNlcnZhYmxlJ3Mgb3BlcmF0b3IuXG4gICAgICogQG1ldGhvZCBsaWZ0XG4gICAgICogQHBhcmFtIHtPcGVyYXRvcn0gb3BlcmF0b3IgdGhlIG9wZXJhdG9yIGRlZmluaW5nIHRoZSBvcGVyYXRpb24gdG8gdGFrZSBvbiB0aGUgb2JzZXJ2YWJsZVxuICAgICAqIEByZXR1cm4ge09ic2VydmFibGV9IGEgbmV3IG9ic2VydmFibGUgd2l0aCB0aGUgT3BlcmF0b3IgYXBwbGllZFxuICAgICAqL1xuICAgIE9ic2VydmFibGUucHJvdG90eXBlLmxpZnQgPSBmdW5jdGlvbiAob3BlcmF0b3IpIHtcbiAgICAgICAgdmFyIG9ic2VydmFibGUgPSBuZXcgT2JzZXJ2YWJsZSgpO1xuICAgICAgICBvYnNlcnZhYmxlLnNvdXJjZSA9IHRoaXM7XG4gICAgICAgIG9ic2VydmFibGUub3BlcmF0b3IgPSBvcGVyYXRvcjtcbiAgICAgICAgcmV0dXJuIG9ic2VydmFibGU7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcnMgaGFuZGxlcnMgZm9yIGhhbmRsaW5nIGVtaXR0ZWQgdmFsdWVzLCBlcnJvciBhbmQgY29tcGxldGlvbnMgZnJvbSB0aGUgb2JzZXJ2YWJsZSwgYW5kXG4gICAgICogIGV4ZWN1dGVzIHRoZSBvYnNlcnZhYmxlJ3Mgc3Vic2NyaWJlciBmdW5jdGlvbiwgd2hpY2ggd2lsbCB0YWtlIGFjdGlvbiB0byBzZXQgdXAgdGhlIHVuZGVybHlpbmcgZGF0YSBzdHJlYW1cbiAgICAgKiBAbWV0aG9kIHN1YnNjcmliZVxuICAgICAqIEBwYXJhbSB7UGFydGlhbE9ic2VydmVyfEZ1bmN0aW9ufSBvYnNlcnZlck9yTmV4dCAob3B0aW9uYWwpIGVpdGhlciBhbiBvYnNlcnZlciBkZWZpbmluZyBhbGwgZnVuY3Rpb25zIHRvIGJlIGNhbGxlZCxcbiAgICAgKiAgb3IgdGhlIGZpcnN0IG9mIHRocmVlIHBvc3NpYmxlIGhhbmRsZXJzLCB3aGljaCBpcyB0aGUgaGFuZGxlciBmb3IgZWFjaCB2YWx1ZSBlbWl0dGVkIGZyb20gdGhlIG9ic2VydmFibGUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZXJyb3IgKG9wdGlvbmFsKSBhIGhhbmRsZXIgZm9yIGEgdGVybWluYWwgZXZlbnQgcmVzdWx0aW5nIGZyb20gYW4gZXJyb3IuIElmIG5vIGVycm9yIGhhbmRsZXIgaXMgcHJvdmlkZWQsXG4gICAgICogIHRoZSBlcnJvciB3aWxsIGJlIHRocm93biBhcyB1bmhhbmRsZWRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb21wbGV0ZSAob3B0aW9uYWwpIGEgaGFuZGxlciBmb3IgYSB0ZXJtaW5hbCBldmVudCByZXN1bHRpbmcgZnJvbSBzdWNjZXNzZnVsIGNvbXBsZXRpb24uXG4gICAgICogQHJldHVybiB7SVN1YnNjcmlwdGlvbn0gYSBzdWJzY3JpcHRpb24gcmVmZXJlbmNlIHRvIHRoZSByZWdpc3RlcmVkIGhhbmRsZXJzXG4gICAgICovXG4gICAgT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlID0gZnVuY3Rpb24gKG9ic2VydmVyT3JOZXh0LCBlcnJvciwgY29tcGxldGUpIHtcbiAgICAgICAgdmFyIG9wZXJhdG9yID0gdGhpcy5vcGVyYXRvcjtcbiAgICAgICAgdmFyIHNpbmsgPSB0b1N1YnNjcmliZXJfMS50b1N1YnNjcmliZXIob2JzZXJ2ZXJPck5leHQsIGVycm9yLCBjb21wbGV0ZSk7XG4gICAgICAgIHNpbmsuYWRkKG9wZXJhdG9yID8gb3BlcmF0b3IuY2FsbChzaW5rLCB0aGlzKSA6IHRoaXMuX3N1YnNjcmliZShzaW5rKSk7XG4gICAgICAgIGlmIChzaW5rLnN5bmNFcnJvclRocm93YWJsZSkge1xuICAgICAgICAgICAgc2luay5zeW5jRXJyb3JUaHJvd2FibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChzaW5rLnN5bmNFcnJvclRocm93bikge1xuICAgICAgICAgICAgICAgIHRocm93IHNpbmsuc3luY0Vycm9yVmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNpbms7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBAbWV0aG9kIGZvckVhY2hcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0IGEgaGFuZGxlciBmb3IgZWFjaCB2YWx1ZSBlbWl0dGVkIGJ5IHRoZSBvYnNlcnZhYmxlXG4gICAgICogQHBhcmFtIHtQcm9taXNlQ29uc3RydWN0b3J9IFtQcm9taXNlQ3Rvcl0gYSBjb25zdHJ1Y3RvciBmdW5jdGlvbiB1c2VkIHRvIGluc3RhbnRpYXRlIHRoZSBQcm9taXNlXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgZWl0aGVyIHJlc29sdmVzIG9uIG9ic2VydmFibGUgY29tcGxldGlvbiBvclxuICAgICAqICByZWplY3RzIHdpdGggdGhlIGhhbmRsZWQgZXJyb3JcbiAgICAgKi9cbiAgICBPYnNlcnZhYmxlLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24gKG5leHQsIFByb21pc2VDdG9yKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmICghUHJvbWlzZUN0b3IpIHtcbiAgICAgICAgICAgIGlmIChyb290XzEucm9vdC5SeCAmJiByb290XzEucm9vdC5SeC5jb25maWcgJiYgcm9vdF8xLnJvb3QuUnguY29uZmlnLlByb21pc2UpIHtcbiAgICAgICAgICAgICAgICBQcm9taXNlQ3RvciA9IHJvb3RfMS5yb290LlJ4LmNvbmZpZy5Qcm9taXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAocm9vdF8xLnJvb3QuUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgIFByb21pc2VDdG9yID0gcm9vdF8xLnJvb3QuUHJvbWlzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIVByb21pc2VDdG9yKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vIFByb21pc2UgaW1wbCBmb3VuZCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZUN0b3IoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIHN1YnNjcmlwdGlvbiA9IF90aGlzLnN1YnNjcmliZShmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHRoZXJlIGlzIGEgc3Vic2NyaXB0aW9uLCB0aGVuIHdlIGNhbiBzdXJtaXNlXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBuZXh0IGhhbmRsaW5nIGlzIGFzeW5jaHJvbm91cy4gQW55IGVycm9ycyB0aHJvd25cbiAgICAgICAgICAgICAgICAgICAgLy8gbmVlZCB0byBiZSByZWplY3RlZCBleHBsaWNpdGx5IGFuZCB1bnN1YnNjcmliZSBtdXN0IGJlXG4gICAgICAgICAgICAgICAgICAgIC8vIGNhbGxlZCBtYW51YWxseVxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgdGhlcmUgaXMgTk8gc3Vic2NyaXB0aW9uLCB0aGVuIHdlJ3JlIGdldHRpbmcgYSBuZXh0ZWRcbiAgICAgICAgICAgICAgICAgICAgLy8gdmFsdWUgc3luY2hyb25vdXNseSBkdXJpbmcgc3Vic2NyaXB0aW9uLiBXZSBjYW4ganVzdCBjYWxsIGl0LlxuICAgICAgICAgICAgICAgICAgICAvLyBJZiBpdCBlcnJvcnMsIE9ic2VydmFibGUncyBgc3Vic2NyaWJlYCBpbXBsZSB3aWxsIGVuc3VyZSB0aGVcbiAgICAgICAgICAgICAgICAgICAgLy8gdW5zdWJzY3JpcHRpb24gbG9naWMgaXMgY2FsbGVkLCB0aGVuIHN5bmNocm9ub3VzbHkgcmV0aHJvdyB0aGUgZXJyb3IuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFmdGVyIHRoYXQsIFByb21pc2Ugd2lsbCB0cmFwIHRoZSBlcnJvciBhbmQgc2VuZCBpdFxuICAgICAgICAgICAgICAgICAgICAvLyBkb3duIHRoZSByZWplY3Rpb24gcGF0aC5cbiAgICAgICAgICAgICAgICAgICAgbmV4dCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgcmVqZWN0LCByZXNvbHZlKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlLnByb3RvdHlwZS5fc3Vic2NyaWJlID0gZnVuY3Rpb24gKHN1YnNjcmliZXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShzdWJzY3JpYmVyKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEFuIGludGVyb3AgcG9pbnQgZGVmaW5lZCBieSB0aGUgZXM3LW9ic2VydmFibGUgc3BlYyBodHRwczovL2dpdGh1Yi5jb20vemVucGFyc2luZy9lcy1vYnNlcnZhYmxlXG4gICAgICogQG1ldGhvZCBTeW1ib2wub2JzZXJ2YWJsZVxuICAgICAqIEByZXR1cm4ge09ic2VydmFibGV9IHRoaXMgaW5zdGFuY2Ugb2YgdGhlIG9ic2VydmFibGVcbiAgICAgKi9cbiAgICBPYnNlcnZhYmxlLnByb3RvdHlwZVtvYnNlcnZhYmxlXzEuJCRvYnNlcnZhYmxlXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICAvLyBIQUNLOiBTaW5jZSBUeXBlU2NyaXB0IGluaGVyaXRzIHN0YXRpYyBwcm9wZXJ0aWVzIHRvbywgd2UgaGF2ZSB0b1xuICAgIC8vIGZpZ2h0IGFnYWluc3QgVHlwZVNjcmlwdCBoZXJlIHNvIFN1YmplY3QgY2FuIGhhdmUgYSBkaWZmZXJlbnQgc3RhdGljIGNyZWF0ZSBzaWduYXR1cmVcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IGNvbGQgT2JzZXJ2YWJsZSBieSBjYWxsaW5nIHRoZSBPYnNlcnZhYmxlIGNvbnN0cnVjdG9yXG4gICAgICogQHN0YXRpYyB0cnVlXG4gICAgICogQG93bmVyIE9ic2VydmFibGVcbiAgICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IHN1YnNjcmliZT8gdGhlIHN1YnNjcmliZXIgZnVuY3Rpb24gdG8gYmUgcGFzc2VkIHRvIHRoZSBPYnNlcnZhYmxlIGNvbnN0cnVjdG9yXG4gICAgICogQHJldHVybiB7T2JzZXJ2YWJsZX0gYSBuZXcgY29sZCBvYnNlcnZhYmxlXG4gICAgICovXG4gICAgT2JzZXJ2YWJsZS5jcmVhdGUgPSBmdW5jdGlvbiAoc3Vic2NyaWJlKSB7XG4gICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZShzdWJzY3JpYmUpO1xuICAgIH07XG4gICAgcmV0dXJuIE9ic2VydmFibGU7XG59KCkpO1xuZXhwb3J0cy5PYnNlcnZhYmxlID0gT2JzZXJ2YWJsZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPU9ic2VydmFibGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5leHBvcnRzLmVtcHR5ID0ge1xuICAgIGlzVW5zdWJzY3JpYmVkOiB0cnVlLFxuICAgIG5leHQ6IGZ1bmN0aW9uICh2YWx1ZSkgeyB9LFxuICAgIGVycm9yOiBmdW5jdGlvbiAoZXJyKSB7IHRocm93IGVycjsgfSxcbiAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkgeyB9XG59O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9T2JzZXJ2ZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuL1N1YnNjcmliZXInKTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgT3V0ZXJTdWJzY3JpYmVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoT3V0ZXJTdWJzY3JpYmVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE91dGVyU3Vic2NyaWJlcigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE91dGVyU3Vic2NyaWJlci5wcm90b3R5cGUubm90aWZ5TmV4dCA9IGZ1bmN0aW9uIChvdXRlclZhbHVlLCBpbm5lclZhbHVlLCBvdXRlckluZGV4LCBpbm5lckluZGV4LCBpbm5lclN1Yikge1xuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLm5leHQoaW5uZXJWYWx1ZSk7XG4gICAgfTtcbiAgICBPdXRlclN1YnNjcmliZXIucHJvdG90eXBlLm5vdGlmeUVycm9yID0gZnVuY3Rpb24gKGVycm9yLCBpbm5lclN1Yikge1xuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmVycm9yKGVycm9yKTtcbiAgICB9O1xuICAgIE91dGVyU3Vic2NyaWJlci5wcm90b3R5cGUubm90aWZ5Q29tcGxldGUgPSBmdW5jdGlvbiAoaW5uZXJTdWIpIHtcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5jb21wbGV0ZSgpO1xuICAgIH07XG4gICAgcmV0dXJuIE91dGVyU3Vic2NyaWJlcjtcbn0oU3Vic2NyaWJlcl8xLlN1YnNjcmliZXIpKTtcbmV4cG9ydHMuT3V0ZXJTdWJzY3JpYmVyID0gT3V0ZXJTdWJzY3JpYmVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9T3V0ZXJTdWJzY3JpYmVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi9PYnNlcnZhYmxlJyk7XG52YXIgU3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi9TdWJzY3JpYmVyJyk7XG52YXIgU3Vic2NyaXB0aW9uXzEgPSByZXF1aXJlKCcuL1N1YnNjcmlwdGlvbicpO1xudmFyIFN1YmplY3RTdWJzY3JpcHRpb25fMSA9IHJlcXVpcmUoJy4vU3ViamVjdFN1YnNjcmlwdGlvbicpO1xudmFyIHJ4U3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi9zeW1ib2wvcnhTdWJzY3JpYmVyJyk7XG52YXIgdGhyb3dFcnJvcl8xID0gcmVxdWlyZSgnLi91dGlsL3Rocm93RXJyb3InKTtcbnZhciBPYmplY3RVbnN1YnNjcmliZWRFcnJvcl8xID0gcmVxdWlyZSgnLi91dGlsL09iamVjdFVuc3Vic2NyaWJlZEVycm9yJyk7XG4vKipcbiAqIEBjbGFzcyBTdWJqZWN0PFQ+XG4gKi9cbnZhciBTdWJqZWN0ID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoU3ViamVjdCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTdWJqZWN0KGRlc3RpbmF0aW9uLCBzb3VyY2UpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24gPSBkZXN0aW5hdGlvbjtcbiAgICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXJzID0gW107XG4gICAgICAgIHRoaXMuaXNVbnN1YnNjcmliZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5pc1N0b3BwZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNFcnJvcmVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNDb21wbGV0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgfVxuICAgIFN1YmplY3QucHJvdG90eXBlLmxpZnQgPSBmdW5jdGlvbiAob3BlcmF0b3IpIHtcbiAgICAgICAgdmFyIHN1YmplY3QgPSBuZXcgU3ViamVjdCh0aGlzLmRlc3RpbmF0aW9uIHx8IHRoaXMsIHRoaXMpO1xuICAgICAgICBzdWJqZWN0Lm9wZXJhdG9yID0gb3BlcmF0b3I7XG4gICAgICAgIHJldHVybiBzdWJqZWN0O1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKHN1YnNjcmlwdGlvbikge1xuICAgICAgICByZXR1cm4gU3Vic2NyaXB0aW9uXzEuU3Vic2NyaXB0aW9uLnByb3RvdHlwZS5hZGQuY2FsbCh0aGlzLCBzdWJzY3JpcHRpb24pO1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKHN1YnNjcmlwdGlvbikge1xuICAgICAgICBTdWJzY3JpcHRpb25fMS5TdWJzY3JpcHRpb24ucHJvdG90eXBlLnJlbW92ZS5jYWxsKHRoaXMsIHN1YnNjcmlwdGlvbik7XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgU3Vic2NyaXB0aW9uXzEuU3Vic2NyaXB0aW9uLnByb3RvdHlwZS51bnN1YnNjcmliZS5jYWxsKHRoaXMpO1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUuX3N1YnNjcmliZSA9IGZ1bmN0aW9uIChzdWJzY3JpYmVyKSB7XG4gICAgICAgIGlmICh0aGlzLnNvdXJjZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShzdWJzY3JpYmVyKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmIChzdWJzY3JpYmVyLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5oYXNFcnJvcmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YnNjcmliZXIuZXJyb3IodGhpcy5lcnJvclZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuaGFzQ29tcGxldGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMudGhyb3dJZlVuc3Vic2NyaWJlZCgpO1xuICAgICAgICAgICAgdmFyIHN1YnNjcmlwdGlvbiA9IG5ldyBTdWJqZWN0U3Vic2NyaXB0aW9uXzEuU3ViamVjdFN1YnNjcmlwdGlvbih0aGlzLCBzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIHRoaXMub2JzZXJ2ZXJzLnB1c2goc3Vic2NyaWJlcik7XG4gICAgICAgICAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS5fdW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc291cmNlID0gbnVsbDtcbiAgICAgICAgdGhpcy5pc1N0b3BwZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLm9ic2VydmVycyA9IG51bGw7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24gPSBudWxsO1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLnRocm93SWZVbnN1YnNjcmliZWQoKTtcbiAgICAgICAgaWYgKHRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kaXNwYXRjaGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuX25leHQodmFsdWUpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoaW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmhhc0Vycm9yZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKHRoaXMuZXJyb3JWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5oYXNDb21wbGV0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2NvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN1YmplY3QucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICB0aGlzLnRocm93SWZVbnN1YnNjcmliZWQoKTtcbiAgICAgICAgaWYgKHRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pc1N0b3BwZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmhhc0Vycm9yZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmVycm9yVmFsdWUgPSBlcnI7XG4gICAgICAgIGlmICh0aGlzLmRpc3BhdGNoaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZXJyb3IoZXJyKTtcbiAgICB9O1xuICAgIFN1YmplY3QucHJvdG90eXBlLmNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnRocm93SWZVbnN1YnNjcmliZWQoKTtcbiAgICAgICAgaWYgKHRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pc1N0b3BwZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmhhc0NvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgIGlmICh0aGlzLmRpc3BhdGNoaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY29tcGxldGUoKTtcbiAgICB9O1xuICAgIFN1YmplY3QucHJvdG90eXBlLmFzT2JzZXJ2YWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9ic2VydmFibGUgPSBuZXcgU3ViamVjdE9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiBvYnNlcnZhYmxlO1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUuX25leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKHRoaXMuZGVzdGluYXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24ubmV4dCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9maW5hbE5leHQodmFsdWUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS5fZmluYWxOZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciBpbmRleCA9IC0xO1xuICAgICAgICB2YXIgb2JzZXJ2ZXJzID0gdGhpcy5vYnNlcnZlcnMuc2xpY2UoMCk7XG4gICAgICAgIHZhciBsZW4gPSBvYnNlcnZlcnMubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoKytpbmRleCA8IGxlbikge1xuICAgICAgICAgICAgb2JzZXJ2ZXJzW2luZGV4XS5uZXh0KHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUuX2Vycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICBpZiAodGhpcy5kZXN0aW5hdGlvbikge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5lcnJvcihlcnIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZmluYWxFcnJvcihlcnIpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS5fZmluYWxFcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gLTE7XG4gICAgICAgIHZhciBvYnNlcnZlcnMgPSB0aGlzLm9ic2VydmVycztcbiAgICAgICAgLy8gb3B0aW1pemF0aW9uIHRvIGJsb2NrIG91ciBTdWJqZWN0U3Vic2NyaXB0aW9ucyBmcm9tXG4gICAgICAgIC8vIHNwbGljaW5nIHRoZW1zZWx2ZXMgb3V0IG9mIHRoZSBvYnNlcnZlcnMgbGlzdCBvbmUgYnkgb25lLlxuICAgICAgICB0aGlzLm9ic2VydmVycyA9IG51bGw7XG4gICAgICAgIHRoaXMuaXNVbnN1YnNjcmliZWQgPSB0cnVlO1xuICAgICAgICBpZiAob2JzZXJ2ZXJzKSB7XG4gICAgICAgICAgICB2YXIgbGVuID0gb2JzZXJ2ZXJzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXJzW2luZGV4XS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXNVbnN1YnNjcmliZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUuX2NvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5kZXN0aW5hdGlvbikge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZmluYWxDb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZS5fZmluYWxDb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gLTE7XG4gICAgICAgIHZhciBvYnNlcnZlcnMgPSB0aGlzLm9ic2VydmVycztcbiAgICAgICAgLy8gb3B0aW1pemF0aW9uIHRvIGJsb2NrIG91ciBTdWJqZWN0U3Vic2NyaXB0aW9ucyBmcm9tXG4gICAgICAgIC8vIHNwbGljaW5nIHRoZW1zZWx2ZXMgb3V0IG9mIHRoZSBvYnNlcnZlcnMgbGlzdCBvbmUgYnkgb25lLlxuICAgICAgICB0aGlzLm9ic2VydmVycyA9IG51bGw7XG4gICAgICAgIHRoaXMuaXNVbnN1YnNjcmliZWQgPSB0cnVlO1xuICAgICAgICBpZiAob2JzZXJ2ZXJzKSB7XG4gICAgICAgICAgICB2YXIgbGVuID0gb2JzZXJ2ZXJzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXJzW2luZGV4XS5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXNVbnN1YnNjcmliZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgIH07XG4gICAgU3ViamVjdC5wcm90b3R5cGUudGhyb3dJZlVuc3Vic2NyaWJlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JfMS50aHJvd0Vycm9yKG5ldyBPYmplY3RVbnN1YnNjcmliZWRFcnJvcl8xLk9iamVjdFVuc3Vic2NyaWJlZEVycm9yKCkpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdWJqZWN0LnByb3RvdHlwZVtyeFN1YnNjcmliZXJfMS4kJHJ4U3Vic2NyaWJlcl0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3Vic2NyaWJlcl8xLlN1YnNjcmliZXIodGhpcyk7XG4gICAgfTtcbiAgICBTdWJqZWN0LmNyZWF0ZSA9IGZ1bmN0aW9uIChkZXN0aW5hdGlvbiwgc291cmNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3ViamVjdChkZXN0aW5hdGlvbiwgc291cmNlKTtcbiAgICB9O1xuICAgIHJldHVybiBTdWJqZWN0O1xufShPYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZSkpO1xuZXhwb3J0cy5TdWJqZWN0ID0gU3ViamVjdDtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgU3ViamVjdE9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTdWJqZWN0T2JzZXJ2YWJsZSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTdWJqZWN0T2JzZXJ2YWJsZShzb3VyY2UpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgIH1cbiAgICByZXR1cm4gU3ViamVjdE9ic2VydmFibGU7XG59KE9ic2VydmFibGVfMS5PYnNlcnZhYmxlKSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1TdWJqZWN0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgU3Vic2NyaXB0aW9uXzEgPSByZXF1aXJlKCcuL1N1YnNjcmlwdGlvbicpO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBTdWJqZWN0U3Vic2NyaXB0aW9uID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoU3ViamVjdFN1YnNjcmlwdGlvbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTdWJqZWN0U3Vic2NyaXB0aW9uKHN1YmplY3QsIG9ic2VydmVyKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLnN1YmplY3QgPSBzdWJqZWN0O1xuICAgICAgICB0aGlzLm9ic2VydmVyID0gb2JzZXJ2ZXI7XG4gICAgICAgIHRoaXMuaXNVbnN1YnNjcmliZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgU3ViamVjdFN1YnNjcmlwdGlvbi5wcm90b3R5cGUudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pc1Vuc3Vic2NyaWJlZCA9IHRydWU7XG4gICAgICAgIHZhciBzdWJqZWN0ID0gdGhpcy5zdWJqZWN0O1xuICAgICAgICB2YXIgb2JzZXJ2ZXJzID0gc3ViamVjdC5vYnNlcnZlcnM7XG4gICAgICAgIHRoaXMuc3ViamVjdCA9IG51bGw7XG4gICAgICAgIGlmICghb2JzZXJ2ZXJzIHx8IG9ic2VydmVycy5sZW5ndGggPT09IDAgfHwgc3ViamVjdC5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdWJzY3JpYmVySW5kZXggPSBvYnNlcnZlcnMuaW5kZXhPZih0aGlzLm9ic2VydmVyKTtcbiAgICAgICAgaWYgKHN1YnNjcmliZXJJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIG9ic2VydmVycy5zcGxpY2Uoc3Vic2NyaWJlckluZGV4LCAxKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIFN1YmplY3RTdWJzY3JpcHRpb247XG59KFN1YnNjcmlwdGlvbl8xLlN1YnNjcmlwdGlvbikpO1xuZXhwb3J0cy5TdWJqZWN0U3Vic2NyaXB0aW9uID0gU3ViamVjdFN1YnNjcmlwdGlvbjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPVN1YmplY3RTdWJzY3JpcHRpb24uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBpc0Z1bmN0aW9uXzEgPSByZXF1aXJlKCcuL3V0aWwvaXNGdW5jdGlvbicpO1xudmFyIFN1YnNjcmlwdGlvbl8xID0gcmVxdWlyZSgnLi9TdWJzY3JpcHRpb24nKTtcbnZhciByeFN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4vc3ltYm9sL3J4U3Vic2NyaWJlcicpO1xudmFyIE9ic2VydmVyXzEgPSByZXF1aXJlKCcuL09ic2VydmVyJyk7XG4vKipcbiAqIEltcGxlbWVudHMgdGhlIHtAbGluayBPYnNlcnZlcn0gaW50ZXJmYWNlIGFuZCBleHRlbmRzIHRoZVxuICoge0BsaW5rIFN1YnNjcmlwdGlvbn0gY2xhc3MuIFdoaWxlIHRoZSB7QGxpbmsgT2JzZXJ2ZXJ9IGlzIHRoZSBwdWJsaWMgQVBJIGZvclxuICogY29uc3VtaW5nIHRoZSB2YWx1ZXMgb2YgYW4ge0BsaW5rIE9ic2VydmFibGV9LCBhbGwgT2JzZXJ2ZXJzIGdldCBjb252ZXJ0ZWQgdG9cbiAqIGEgU3Vic2NyaWJlciwgaW4gb3JkZXIgdG8gcHJvdmlkZSBTdWJzY3JpcHRpb24tbGlrZSBjYXBhYmlsaXRpZXMgc3VjaCBhc1xuICogYHVuc3Vic2NyaWJlYC4gU3Vic2NyaWJlciBpcyBhIGNvbW1vbiB0eXBlIGluIFJ4SlMsIGFuZCBjcnVjaWFsIGZvclxuICogaW1wbGVtZW50aW5nIG9wZXJhdG9ycywgYnV0IGl0IGlzIHJhcmVseSB1c2VkIGFzIGEgcHVibGljIEFQSS5cbiAqXG4gKiBAY2xhc3MgU3Vic2NyaWJlcjxUPlxuICovXG52YXIgU3Vic2NyaWJlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFN1YnNjcmliZXIsIF9zdXBlcik7XG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtPYnNlcnZlcnxmdW5jdGlvbih2YWx1ZTogVCk6IHZvaWR9IFtkZXN0aW5hdGlvbk9yTmV4dF0gQSBwYXJ0aWFsbHlcbiAgICAgKiBkZWZpbmVkIE9ic2VydmVyIG9yIGEgYG5leHRgIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb24oZTogP2FueSk6IHZvaWR9IFtlcnJvcl0gVGhlIGBlcnJvcmAgY2FsbGJhY2sgb2YgYW5cbiAgICAgKiBPYnNlcnZlci5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9uKCk6IHZvaWR9IFtjb21wbGV0ZV0gVGhlIGBjb21wbGV0ZWAgY2FsbGJhY2sgb2YgYW5cbiAgICAgKiBPYnNlcnZlci5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBTdWJzY3JpYmVyKGRlc3RpbmF0aW9uT3JOZXh0LCBlcnJvciwgY29tcGxldGUpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuc3luY0Vycm9yVmFsdWUgPSBudWxsO1xuICAgICAgICB0aGlzLnN5bmNFcnJvclRocm93biA9IGZhbHNlO1xuICAgICAgICB0aGlzLnN5bmNFcnJvclRocm93YWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlzU3RvcHBlZCA9IGZhbHNlO1xuICAgICAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uID0gT2JzZXJ2ZXJfMS5lbXB0eTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICBpZiAoIWRlc3RpbmF0aW9uT3JOZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24gPSBPYnNlcnZlcl8xLmVtcHR5O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBkZXN0aW5hdGlvbk9yTmV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlc3RpbmF0aW9uT3JOZXh0IGluc3RhbmNlb2YgU3Vic2NyaWJlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbiA9IGRlc3RpbmF0aW9uT3JOZXh0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5hZGQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN5bmNFcnJvclRocm93YWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uID0gbmV3IFNhZmVTdWJzY3JpYmVyKHRoaXMsIGRlc3RpbmF0aW9uT3JOZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRoaXMuc3luY0Vycm9yVGhyb3dhYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uID0gbmV3IFNhZmVTdWJzY3JpYmVyKHRoaXMsIGRlc3RpbmF0aW9uT3JOZXh0LCBlcnJvciwgY29tcGxldGUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEEgc3RhdGljIGZhY3RvcnkgZm9yIGEgU3Vic2NyaWJlciwgZ2l2ZW4gYSAocG90ZW50aWFsbHkgcGFydGlhbCkgZGVmaW5pdGlvblxuICAgICAqIG9mIGFuIE9ic2VydmVyLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb24oeDogP1QpOiB2b2lkfSBbbmV4dF0gVGhlIGBuZXh0YCBjYWxsYmFjayBvZiBhbiBPYnNlcnZlci5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9uKGU6ID9hbnkpOiB2b2lkfSBbZXJyb3JdIFRoZSBgZXJyb3JgIGNhbGxiYWNrIG9mIGFuXG4gICAgICogT2JzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbigpOiB2b2lkfSBbY29tcGxldGVdIFRoZSBgY29tcGxldGVgIGNhbGxiYWNrIG9mIGFuXG4gICAgICogT2JzZXJ2ZXIuXG4gICAgICogQHJldHVybiB7U3Vic2NyaWJlcjxUPn0gQSBTdWJzY3JpYmVyIHdyYXBwaW5nIHRoZSAocGFydGlhbGx5IGRlZmluZWQpXG4gICAgICogT2JzZXJ2ZXIgcmVwcmVzZW50ZWQgYnkgdGhlIGdpdmVuIGFyZ3VtZW50cy5cbiAgICAgKi9cbiAgICBTdWJzY3JpYmVyLmNyZWF0ZSA9IGZ1bmN0aW9uIChuZXh0LCBlcnJvciwgY29tcGxldGUpIHtcbiAgICAgICAgdmFyIHN1YnNjcmliZXIgPSBuZXcgU3Vic2NyaWJlcihuZXh0LCBlcnJvciwgY29tcGxldGUpO1xuICAgICAgICBzdWJzY3JpYmVyLnN5bmNFcnJvclRocm93YWJsZSA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gc3Vic2NyaWJlcjtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFRoZSB7QGxpbmsgT2JzZXJ2ZXJ9IGNhbGxiYWNrIHRvIHJlY2VpdmUgbm90aWZpY2F0aW9ucyBvZiB0eXBlIGBuZXh0YCBmcm9tXG4gICAgICogdGhlIE9ic2VydmFibGUsIHdpdGggYSB2YWx1ZS4gVGhlIE9ic2VydmFibGUgbWF5IGNhbGwgdGhpcyBtZXRob2QgMCBvciBtb3JlXG4gICAgICogdGltZXMuXG4gICAgICogQHBhcmFtIHtUfSBbdmFsdWVdIFRoZSBgbmV4dGAgdmFsdWUuXG4gICAgICogQHJldHVybiB7dm9pZH1cbiAgICAgKi9cbiAgICBTdWJzY3JpYmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmICghdGhpcy5pc1N0b3BwZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX25leHQodmFsdWUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBUaGUge0BsaW5rIE9ic2VydmVyfSBjYWxsYmFjayB0byByZWNlaXZlIG5vdGlmaWNhdGlvbnMgb2YgdHlwZSBgZXJyb3JgIGZyb21cbiAgICAgKiB0aGUgT2JzZXJ2YWJsZSwgd2l0aCBhbiBhdHRhY2hlZCB7QGxpbmsgRXJyb3J9LiBOb3RpZmllcyB0aGUgT2JzZXJ2ZXIgdGhhdFxuICAgICAqIHRoZSBPYnNlcnZhYmxlIGhhcyBleHBlcmllbmNlZCBhbiBlcnJvciBjb25kaXRpb24uXG4gICAgICogQHBhcmFtIHthbnl9IFtlcnJdIFRoZSBgZXJyb3JgIGV4Y2VwdGlvbi5cbiAgICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgICAqL1xuICAgIFN1YnNjcmliZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICBpZiAoIXRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgICAgICB0aGlzLmlzU3RvcHBlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lcnJvcihlcnIpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBUaGUge0BsaW5rIE9ic2VydmVyfSBjYWxsYmFjayB0byByZWNlaXZlIGEgdmFsdWVsZXNzIG5vdGlmaWNhdGlvbiBvZiB0eXBlXG4gICAgICogYGNvbXBsZXRlYCBmcm9tIHRoZSBPYnNlcnZhYmxlLiBOb3RpZmllcyB0aGUgT2JzZXJ2ZXIgdGhhdCB0aGUgT2JzZXJ2YWJsZVxuICAgICAqIGhhcyBmaW5pc2hlZCBzZW5kaW5nIHB1c2gtYmFzZWQgbm90aWZpY2F0aW9ucy5cbiAgICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgICAqL1xuICAgIFN1YnNjcmliZXIucHJvdG90eXBlLmNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgICAgICB0aGlzLmlzU3RvcHBlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTdWJzY3JpYmVyLnByb3RvdHlwZS51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlzU3RvcHBlZCA9IHRydWU7XG4gICAgICAgIF9zdXBlci5wcm90b3R5cGUudW5zdWJzY3JpYmUuY2FsbCh0aGlzKTtcbiAgICB9O1xuICAgIFN1YnNjcmliZXIucHJvdG90eXBlLl9uZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24ubmV4dCh2YWx1ZSk7XG4gICAgfTtcbiAgICBTdWJzY3JpYmVyLnByb3RvdHlwZS5fZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24uZXJyb3IoZXJyKTtcbiAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgIH07XG4gICAgU3Vic2NyaWJlci5wcm90b3R5cGUuX2NvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmNvbXBsZXRlKCk7XG4gICAgICAgIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICB9O1xuICAgIFN1YnNjcmliZXIucHJvdG90eXBlW3J4U3Vic2NyaWJlcl8xLiQkcnhTdWJzY3JpYmVyXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICByZXR1cm4gU3Vic2NyaWJlcjtcbn0oU3Vic2NyaXB0aW9uXzEuU3Vic2NyaXB0aW9uKSk7XG5leHBvcnRzLlN1YnNjcmliZXIgPSBTdWJzY3JpYmVyO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGlnbm9yZVxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKi9cbnZhciBTYWZlU3Vic2NyaWJlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFNhZmVTdWJzY3JpYmVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFNhZmVTdWJzY3JpYmVyKF9wYXJlbnQsIG9ic2VydmVyT3JOZXh0LCBlcnJvciwgY29tcGxldGUpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuX3BhcmVudCA9IF9wYXJlbnQ7XG4gICAgICAgIHZhciBuZXh0O1xuICAgICAgICB2YXIgY29udGV4dCA9IHRoaXM7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uXzEuaXNGdW5jdGlvbihvYnNlcnZlck9yTmV4dCkpIHtcbiAgICAgICAgICAgIG5leHQgPSBvYnNlcnZlck9yTmV4dDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChvYnNlcnZlck9yTmV4dCkge1xuICAgICAgICAgICAgY29udGV4dCA9IG9ic2VydmVyT3JOZXh0O1xuICAgICAgICAgICAgbmV4dCA9IG9ic2VydmVyT3JOZXh0Lm5leHQ7XG4gICAgICAgICAgICBlcnJvciA9IG9ic2VydmVyT3JOZXh0LmVycm9yO1xuICAgICAgICAgICAgY29tcGxldGUgPSBvYnNlcnZlck9yTmV4dC5jb21wbGV0ZTtcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uXzEuaXNGdW5jdGlvbihjb250ZXh0LnVuc3Vic2NyaWJlKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkKGNvbnRleHQudW5zdWJzY3JpYmUuYmluZChjb250ZXh0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250ZXh0LnVuc3Vic2NyaWJlID0gdGhpcy51bnN1YnNjcmliZS5iaW5kKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICB0aGlzLl9uZXh0ID0gbmV4dDtcbiAgICAgICAgdGhpcy5fZXJyb3IgPSBlcnJvcjtcbiAgICAgICAgdGhpcy5fY29tcGxldGUgPSBjb21wbGV0ZTtcbiAgICB9XG4gICAgU2FmZVN1YnNjcmliZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzU3RvcHBlZCAmJiB0aGlzLl9uZXh0KSB7XG4gICAgICAgICAgICB2YXIgX3BhcmVudCA9IHRoaXMuX3BhcmVudDtcbiAgICAgICAgICAgIGlmICghX3BhcmVudC5zeW5jRXJyb3JUaHJvd2FibGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9fdHJ5T3JVbnN1Yih0aGlzLl9uZXh0LCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzLl9fdHJ5T3JTZXRFcnJvcihfcGFyZW50LCB0aGlzLl9uZXh0LCB2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFNhZmVTdWJzY3JpYmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzU3RvcHBlZCkge1xuICAgICAgICAgICAgdmFyIF9wYXJlbnQgPSB0aGlzLl9wYXJlbnQ7XG4gICAgICAgICAgICBpZiAodGhpcy5fZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoIV9wYXJlbnQuc3luY0Vycm9yVGhyb3dhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX190cnlPclVuc3ViKHRoaXMuX2Vycm9yLCBlcnIpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fdHJ5T3JTZXRFcnJvcihfcGFyZW50LCB0aGlzLl9lcnJvciwgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCFfcGFyZW50LnN5bmNFcnJvclRocm93YWJsZSkge1xuICAgICAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBfcGFyZW50LnN5bmNFcnJvclZhbHVlID0gZXJyO1xuICAgICAgICAgICAgICAgIF9wYXJlbnQuc3luY0Vycm9yVGhyb3duID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFNhZmVTdWJzY3JpYmVyLnByb3RvdHlwZS5jb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzU3RvcHBlZCkge1xuICAgICAgICAgICAgdmFyIF9wYXJlbnQgPSB0aGlzLl9wYXJlbnQ7XG4gICAgICAgICAgICBpZiAodGhpcy5fY29tcGxldGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIV9wYXJlbnQuc3luY0Vycm9yVGhyb3dhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX190cnlPclVuc3ViKHRoaXMuX2NvbXBsZXRlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3RyeU9yU2V0RXJyb3IoX3BhcmVudCwgdGhpcy5fY29tcGxldGUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBTYWZlU3Vic2NyaWJlci5wcm90b3R5cGUuX190cnlPclVuc3ViID0gZnVuY3Rpb24gKGZuLCB2YWx1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZm4uY2FsbCh0aGlzLl9jb250ZXh0LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTYWZlU3Vic2NyaWJlci5wcm90b3R5cGUuX190cnlPclNldEVycm9yID0gZnVuY3Rpb24gKHBhcmVudCwgZm4sIHZhbHVlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmbi5jYWxsKHRoaXMuX2NvbnRleHQsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBwYXJlbnQuc3luY0Vycm9yVmFsdWUgPSBlcnI7XG4gICAgICAgICAgICBwYXJlbnQuc3luY0Vycm9yVGhyb3duID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIFNhZmVTdWJzY3JpYmVyLnByb3RvdHlwZS5fdW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfcGFyZW50ID0gdGhpcy5fcGFyZW50O1xuICAgICAgICB0aGlzLl9jb250ZXh0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fcGFyZW50ID0gbnVsbDtcbiAgICAgICAgX3BhcmVudC51bnN1YnNjcmliZSgpO1xuICAgIH07XG4gICAgcmV0dXJuIFNhZmVTdWJzY3JpYmVyO1xufShTdWJzY3JpYmVyKSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1TdWJzY3JpYmVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIGlzQXJyYXlfMSA9IHJlcXVpcmUoJy4vdXRpbC9pc0FycmF5Jyk7XG52YXIgaXNPYmplY3RfMSA9IHJlcXVpcmUoJy4vdXRpbC9pc09iamVjdCcpO1xudmFyIGlzRnVuY3Rpb25fMSA9IHJlcXVpcmUoJy4vdXRpbC9pc0Z1bmN0aW9uJyk7XG52YXIgdHJ5Q2F0Y2hfMSA9IHJlcXVpcmUoJy4vdXRpbC90cnlDYXRjaCcpO1xudmFyIGVycm9yT2JqZWN0XzEgPSByZXF1aXJlKCcuL3V0aWwvZXJyb3JPYmplY3QnKTtcbnZhciBVbnN1YnNjcmlwdGlvbkVycm9yXzEgPSByZXF1aXJlKCcuL3V0aWwvVW5zdWJzY3JpcHRpb25FcnJvcicpO1xuLyoqXG4gKiBSZXByZXNlbnRzIGEgZGlzcG9zYWJsZSByZXNvdXJjZSwgc3VjaCBhcyB0aGUgZXhlY3V0aW9uIG9mIGFuIE9ic2VydmFibGUuIEFcbiAqIFN1YnNjcmlwdGlvbiBoYXMgb25lIGltcG9ydGFudCBtZXRob2QsIGB1bnN1YnNjcmliZWAsIHRoYXQgdGFrZXMgbm8gYXJndW1lbnRcbiAqIGFuZCBqdXN0IGRpc3Bvc2VzIHRoZSByZXNvdXJjZSBoZWxkIGJ5IHRoZSBzdWJzY3JpcHRpb24uXG4gKlxuICogQWRkaXRpb25hbGx5LCBzdWJzY3JpcHRpb25zIG1heSBiZSBncm91cGVkIHRvZ2V0aGVyIHRocm91Z2ggdGhlIGBhZGQoKWBcbiAqIG1ldGhvZCwgd2hpY2ggd2lsbCBhdHRhY2ggYSBjaGlsZCBTdWJzY3JpcHRpb24gdG8gdGhlIGN1cnJlbnQgU3Vic2NyaXB0aW9uLlxuICogV2hlbiBhIFN1YnNjcmlwdGlvbiBpcyB1bnN1YnNjcmliZWQsIGFsbCBpdHMgY2hpbGRyZW4gKGFuZCBpdHMgZ3JhbmRjaGlsZHJlbilcbiAqIHdpbGwgYmUgdW5zdWJzY3JpYmVkIGFzIHdlbGwuXG4gKlxuICogQGNsYXNzIFN1YnNjcmlwdGlvblxuICovXG52YXIgU3Vic2NyaXB0aW9uID0gKGZ1bmN0aW9uICgpIHtcbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9uKCk6IHZvaWR9IFt1bnN1YnNjcmliZV0gQSBmdW5jdGlvbiBkZXNjcmliaW5nIGhvdyB0b1xuICAgICAqIHBlcmZvcm0gdGhlIGRpc3Bvc2FsIG9mIHJlc291cmNlcyB3aGVuIHRoZSBgdW5zdWJzY3JpYmVgIG1ldGhvZCBpcyBjYWxsZWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gU3Vic2NyaXB0aW9uKHVuc3Vic2NyaWJlKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBIGZsYWcgdG8gaW5kaWNhdGUgd2hldGhlciB0aGlzIFN1YnNjcmlwdGlvbiBoYXMgYWxyZWFkeSBiZWVuIHVuc3Vic2NyaWJlZC5cbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmlzVW5zdWJzY3JpYmVkID0gZmFsc2U7XG4gICAgICAgIGlmICh1bnN1YnNjcmliZSkge1xuICAgICAgICAgICAgdGhpcy5fdW5zdWJzY3JpYmUgPSB1bnN1YnNjcmliZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBEaXNwb3NlcyB0aGUgcmVzb3VyY2VzIGhlbGQgYnkgdGhlIHN1YnNjcmlwdGlvbi4gTWF5LCBmb3IgaW5zdGFuY2UsIGNhbmNlbFxuICAgICAqIGFuIG9uZ29pbmcgT2JzZXJ2YWJsZSBleGVjdXRpb24gb3IgY2FuY2VsIGFueSBvdGhlciB0eXBlIG9mIHdvcmsgdGhhdFxuICAgICAqIHN0YXJ0ZWQgd2hlbiB0aGUgU3Vic2NyaXB0aW9uIHdhcyBjcmVhdGVkLlxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgU3Vic2NyaXB0aW9uLnByb3RvdHlwZS51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhhc0Vycm9ycyA9IGZhbHNlO1xuICAgICAgICB2YXIgZXJyb3JzO1xuICAgICAgICBpZiAodGhpcy5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXNVbnN1YnNjcmliZWQgPSB0cnVlO1xuICAgICAgICB2YXIgX2EgPSB0aGlzLCBfdW5zdWJzY3JpYmUgPSBfYS5fdW5zdWJzY3JpYmUsIF9zdWJzY3JpcHRpb25zID0gX2EuX3N1YnNjcmlwdGlvbnM7XG4gICAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMgPSBudWxsO1xuICAgICAgICBpZiAoaXNGdW5jdGlvbl8xLmlzRnVuY3Rpb24oX3Vuc3Vic2NyaWJlKSkge1xuICAgICAgICAgICAgdmFyIHRyaWFsID0gdHJ5Q2F0Y2hfMS50cnlDYXRjaChfdW5zdWJzY3JpYmUpLmNhbGwodGhpcyk7XG4gICAgICAgICAgICBpZiAodHJpYWwgPT09IGVycm9yT2JqZWN0XzEuZXJyb3JPYmplY3QpIHtcbiAgICAgICAgICAgICAgICBoYXNFcnJvcnMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIChlcnJvcnMgPSBlcnJvcnMgfHwgW10pLnB1c2goZXJyb3JPYmplY3RfMS5lcnJvck9iamVjdC5lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNBcnJheV8xLmlzQXJyYXkoX3N1YnNjcmlwdGlvbnMpKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSAtMTtcbiAgICAgICAgICAgIHZhciBsZW4gPSBfc3Vic2NyaXB0aW9ucy5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoKytpbmRleCA8IGxlbikge1xuICAgICAgICAgICAgICAgIHZhciBzdWIgPSBfc3Vic2NyaXB0aW9uc1tpbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKGlzT2JqZWN0XzEuaXNPYmplY3Qoc3ViKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHJpYWwgPSB0cnlDYXRjaF8xLnRyeUNhdGNoKHN1Yi51bnN1YnNjcmliZSkuY2FsbChzdWIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHJpYWwgPT09IGVycm9yT2JqZWN0XzEuZXJyb3JPYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc0Vycm9ycyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcnMgPSBlcnJvcnMgfHwgW107XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZXJyID0gZXJyb3JPYmplY3RfMS5lcnJvck9iamVjdC5lO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIFVuc3Vic2NyaXB0aW9uRXJyb3JfMS5VbnN1YnNjcmlwdGlvbkVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JzID0gZXJyb3JzLmNvbmNhdChlcnIuZXJyb3JzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhhc0Vycm9ycykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFVuc3Vic2NyaXB0aW9uRXJyb3JfMS5VbnN1YnNjcmlwdGlvbkVycm9yKGVycm9ycyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEFkZHMgYSB0ZWFyIGRvd24gdG8gYmUgY2FsbGVkIGR1cmluZyB0aGUgdW5zdWJzY3JpYmUoKSBvZiB0aGlzXG4gICAgICogU3Vic2NyaXB0aW9uLlxuICAgICAqXG4gICAgICogSWYgdGhlIHRlYXIgZG93biBiZWluZyBhZGRlZCBpcyBhIHN1YnNjcmlwdGlvbiB0aGF0IGlzIGFscmVhZHlcbiAgICAgKiB1bnN1YnNjcmliZWQsIGlzIHRoZSBzYW1lIHJlZmVyZW5jZSBgYWRkYCBpcyBiZWluZyBjYWxsZWQgb24sIG9yIGlzXG4gICAgICogYFN1YnNjcmlwdGlvbi5FTVBUWWAsIGl0IHdpbGwgbm90IGJlIGFkZGVkLlxuICAgICAqXG4gICAgICogSWYgdGhpcyBzdWJzY3JpcHRpb24gaXMgYWxyZWFkeSBpbiBhbiBgaXNVbnN1YnNjcmliZWRgIHN0YXRlLCB0aGUgcGFzc2VkXG4gICAgICogdGVhciBkb3duIGxvZ2ljIHdpbGwgYmUgZXhlY3V0ZWQgaW1tZWRpYXRlbHkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1RlYXJkb3duTG9naWN9IHRlYXJkb3duIFRoZSBhZGRpdGlvbmFsIGxvZ2ljIHRvIGV4ZWN1dGUgb25cbiAgICAgKiB0ZWFyZG93bi5cbiAgICAgKiBAcmV0dXJuIHtTdWJzY3JpcHRpb259IFJldHVybnMgdGhlIFN1YnNjcmlwdGlvbiB1c2VkIG9yIGNyZWF0ZWQgdG8gYmVcbiAgICAgKiBhZGRlZCB0byB0aGUgaW5uZXIgc3Vic2NyaXB0aW9ucyBsaXN0LiBUaGlzIFN1YnNjcmlwdGlvbiBjYW4gYmUgdXNlZCB3aXRoXG4gICAgICogYHJlbW92ZSgpYCB0byByZW1vdmUgdGhlIHBhc3NlZCB0ZWFyZG93biBsb2dpYyBmcm9tIHRoZSBpbm5lciBzdWJzY3JpcHRpb25zXG4gICAgICogbGlzdC5cbiAgICAgKi9cbiAgICBTdWJzY3JpcHRpb24ucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uICh0ZWFyZG93bikge1xuICAgICAgICBpZiAoIXRlYXJkb3duIHx8ICh0ZWFyZG93biA9PT0gdGhpcykgfHwgKHRlYXJkb3duID09PSBTdWJzY3JpcHRpb24uRU1QVFkpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN1YiA9IHRlYXJkb3duO1xuICAgICAgICBzd2l0Y2ggKHR5cGVvZiB0ZWFyZG93bikge1xuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgIHN1YiA9IG5ldyBTdWJzY3JpcHRpb24odGVhcmRvd24pO1xuICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICBpZiAoc3ViLmlzVW5zdWJzY3JpYmVkIHx8IHR5cGVvZiBzdWIudW5zdWJzY3JpYmUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ViLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAodGhpcy5fc3Vic2NyaXB0aW9ucyB8fCAodGhpcy5fc3Vic2NyaXB0aW9ucyA9IFtdKSkucHVzaChzdWIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbnJlY29nbml6ZWQgdGVhcmRvd24gJyArIHRlYXJkb3duICsgJyBhZGRlZCB0byBTdWJzY3JpcHRpb24uJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1YjtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBTdWJzY3JpcHRpb24gZnJvbSB0aGUgaW50ZXJuYWwgbGlzdCBvZiBzdWJzY3JpcHRpb25zIHRoYXQgd2lsbFxuICAgICAqIHVuc3Vic2NyaWJlIGR1cmluZyB0aGUgdW5zdWJzY3JpYmUgcHJvY2VzcyBvZiB0aGlzIFN1YnNjcmlwdGlvbi5cbiAgICAgKiBAcGFyYW0ge1N1YnNjcmlwdGlvbn0gc3Vic2NyaXB0aW9uIFRoZSBzdWJzY3JpcHRpb24gdG8gcmVtb3ZlLlxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgU3Vic2NyaXB0aW9uLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICAgIC8vIEhBQ0s6IFRoaXMgbWlnaHQgYmUgcmVkdW5kYW50IGJlY2F1c2Ugb2YgdGhlIGxvZ2ljIGluIGBhZGQoKWBcbiAgICAgICAgaWYgKHN1YnNjcmlwdGlvbiA9PSBudWxsIHx8IChzdWJzY3JpcHRpb24gPT09IHRoaXMpIHx8IChzdWJzY3JpcHRpb24gPT09IFN1YnNjcmlwdGlvbi5FTVBUWSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3Vic2NyaXB0aW9ucyA9IHRoaXMuX3N1YnNjcmlwdGlvbnM7XG4gICAgICAgIGlmIChzdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgc3Vic2NyaXB0aW9uSW5kZXggPSBzdWJzY3JpcHRpb25zLmluZGV4T2Yoc3Vic2NyaXB0aW9uKTtcbiAgICAgICAgICAgIGlmIChzdWJzY3JpcHRpb25JbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBzdWJzY3JpcHRpb25zLnNwbGljZShzdWJzY3JpcHRpb25JbmRleCwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN1YnNjcmlwdGlvbi5FTVBUWSA9IChmdW5jdGlvbiAoZW1wdHkpIHtcbiAgICAgICAgZW1wdHkuaXNVbnN1YnNjcmliZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZW1wdHk7XG4gICAgfShuZXcgU3Vic2NyaXB0aW9uKCkpKTtcbiAgICByZXR1cm4gU3Vic2NyaXB0aW9uO1xufSgpKTtcbmV4cG9ydHMuU3Vic2NyaXB0aW9uID0gU3Vic2NyaXB0aW9uO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9U3Vic2NyaXB0aW9uLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uLy4uL09ic2VydmFibGUnKTtcbnZhciBjb21iaW5lTGF0ZXN0XzEgPSByZXF1aXJlKCcuLi8uLi9vcGVyYXRvci9jb21iaW5lTGF0ZXN0Jyk7XG5PYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZS5jb21iaW5lTGF0ZXN0ID0gY29tYmluZUxhdGVzdF8xLmNvbWJpbmVMYXRlc3RTdGF0aWM7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb21iaW5lTGF0ZXN0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uLy4uL09ic2VydmFibGUnKTtcbnZhciBvZl8xID0gcmVxdWlyZSgnLi4vLi4vb2JzZXJ2YWJsZS9vZicpO1xuT2JzZXJ2YWJsZV8xLk9ic2VydmFibGUub2YgPSBvZl8xLm9mO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9b2YuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vLi4vT2JzZXJ2YWJsZScpO1xudmFyIGZpbHRlcl8xID0gcmVxdWlyZSgnLi4vLi4vb3BlcmF0b3IvZmlsdGVyJyk7XG5PYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZS5wcm90b3R5cGUuZmlsdGVyID0gZmlsdGVyXzEuZmlsdGVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZmlsdGVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uLy4uL09ic2VydmFibGUnKTtcbnZhciBtYXBfMSA9IHJlcXVpcmUoJy4uLy4uL29wZXJhdG9yL21hcCcpO1xuT2JzZXJ2YWJsZV8xLk9ic2VydmFibGUucHJvdG90eXBlLm1hcCA9IG1hcF8xLm1hcDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1hcC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi8uLi9PYnNlcnZhYmxlJyk7XG52YXIgbWFwVG9fMSA9IHJlcXVpcmUoJy4uLy4uL29wZXJhdG9yL21hcFRvJyk7XG5PYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZS5wcm90b3R5cGUubWFwVG8gPSBtYXBUb18xLm1hcFRvO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWFwVG8uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vLi4vT2JzZXJ2YWJsZScpO1xudmFyIG1lcmdlXzEgPSByZXF1aXJlKCcuLi8uLi9vcGVyYXRvci9tZXJnZScpO1xuT2JzZXJ2YWJsZV8xLk9ic2VydmFibGUucHJvdG90eXBlLm1lcmdlID0gbWVyZ2VfMS5tZXJnZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1lcmdlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uLy4uL09ic2VydmFibGUnKTtcbnZhciBzY2FuXzEgPSByZXF1aXJlKCcuLi8uLi9vcGVyYXRvci9zY2FuJyk7XG5PYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZS5wcm90b3R5cGUuc2NhbiA9IHNjYW5fMS5zY2FuO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c2Nhbi5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi8uLi9PYnNlcnZhYmxlJyk7XG52YXIgc2hhcmVfMSA9IHJlcXVpcmUoJy4uLy4uL29wZXJhdG9yL3NoYXJlJyk7XG5PYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZS5wcm90b3R5cGUuc2hhcmUgPSBzaGFyZV8xLnNoYXJlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c2hhcmUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vLi4vT2JzZXJ2YWJsZScpO1xudmFyIHN0YXJ0V2l0aF8xID0gcmVxdWlyZSgnLi4vLi4vb3BlcmF0b3Ivc3RhcnRXaXRoJyk7XG5PYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3RhcnRXaXRoID0gc3RhcnRXaXRoXzEuc3RhcnRXaXRoO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c3RhcnRXaXRoLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uLy4uL09ic2VydmFibGUnKTtcbnZhciBzd2l0Y2hNYXBfMSA9IHJlcXVpcmUoJy4uLy4uL29wZXJhdG9yL3N3aXRjaE1hcCcpO1xuT2JzZXJ2YWJsZV8xLk9ic2VydmFibGUucHJvdG90eXBlLnN3aXRjaE1hcCA9IHN3aXRjaE1hcF8xLnN3aXRjaE1hcDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXN3aXRjaE1hcC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi8uLi9PYnNlcnZhYmxlJyk7XG52YXIgd2l0aExhdGVzdEZyb21fMSA9IHJlcXVpcmUoJy4uLy4uL29wZXJhdG9yL3dpdGhMYXRlc3RGcm9tJyk7XG5PYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZS5wcm90b3R5cGUud2l0aExhdGVzdEZyb20gPSB3aXRoTGF0ZXN0RnJvbV8xLndpdGhMYXRlc3RGcm9tO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9d2l0aExhdGVzdEZyb20uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi9PYnNlcnZhYmxlJyk7XG52YXIgU2NhbGFyT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi9TY2FsYXJPYnNlcnZhYmxlJyk7XG52YXIgRW1wdHlPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuL0VtcHR5T2JzZXJ2YWJsZScpO1xudmFyIGlzU2NoZWR1bGVyXzEgPSByZXF1aXJlKCcuLi91dGlsL2lzU2NoZWR1bGVyJyk7XG4vKipcbiAqIFdlIG5lZWQgdGhpcyBKU0RvYyBjb21tZW50IGZvciBhZmZlY3RpbmcgRVNEb2MuXG4gKiBAZXh0ZW5kcyB7SWdub3JlZH1cbiAqIEBoaWRlIHRydWVcbiAqL1xudmFyIEFycmF5T2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEFycmF5T2JzZXJ2YWJsZSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBBcnJheU9ic2VydmFibGUoYXJyYXksIHNjaGVkdWxlcikge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5hcnJheSA9IGFycmF5O1xuICAgICAgICB0aGlzLnNjaGVkdWxlciA9IHNjaGVkdWxlcjtcbiAgICAgICAgaWYgKCFzY2hlZHVsZXIgJiYgYXJyYXkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICB0aGlzLl9pc1NjYWxhciA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gYXJyYXlbMF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgQXJyYXlPYnNlcnZhYmxlLmNyZWF0ZSA9IGZ1bmN0aW9uIChhcnJheSwgc2NoZWR1bGVyKSB7XG4gICAgICAgIHJldHVybiBuZXcgQXJyYXlPYnNlcnZhYmxlKGFycmF5LCBzY2hlZHVsZXIpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgc29tZSB2YWx1ZXMgeW91IHNwZWNpZnkgYXMgYXJndW1lbnRzLFxuICAgICAqIGltbWVkaWF0ZWx5IG9uZSBhZnRlciB0aGUgb3RoZXIsIGFuZCB0aGVuIGVtaXRzIGEgY29tcGxldGUgbm90aWZpY2F0aW9uLlxuICAgICAqXG4gICAgICogPHNwYW4gY2xhc3M9XCJpbmZvcm1hbFwiPkVtaXRzIHRoZSBhcmd1bWVudHMgeW91IHByb3ZpZGUsIHRoZW4gY29tcGxldGVzLlxuICAgICAqIDwvc3Bhbj5cbiAgICAgKlxuICAgICAqIDxpbWcgc3JjPVwiLi9pbWcvb2YucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gICAgICpcbiAgICAgKiBUaGlzIHN0YXRpYyBvcGVyYXRvciBpcyB1c2VmdWwgZm9yIGNyZWF0aW5nIGEgc2ltcGxlIE9ic2VydmFibGUgdGhhdCBvbmx5XG4gICAgICogZW1pdHMgdGhlIGFyZ3VtZW50cyBnaXZlbiwgYW5kIHRoZSBjb21wbGV0ZSBub3RpZmljYXRpb24gdGhlcmVhZnRlci4gSXQgY2FuXG4gICAgICogYmUgdXNlZCBmb3IgY29tcG9zaW5nIHdpdGggb3RoZXIgT2JzZXJ2YWJsZXMsIHN1Y2ggYXMgd2l0aCB7QGxpbmsgY29uY2F0fS5cbiAgICAgKiBCeSBkZWZhdWx0LCBpdCB1c2VzIGEgYG51bGxgIFNjaGVkdWxlciwgd2hpY2ggbWVhbnMgdGhlIGBuZXh0YFxuICAgICAqIG5vdGlmaWNhdGlvbnMgYXJlIHNlbnQgc3luY2hyb25vdXNseSwgYWx0aG91Z2ggd2l0aCBhIGRpZmZlcmVudCBTY2hlZHVsZXJcbiAgICAgKiBpdCBpcyBwb3NzaWJsZSB0byBkZXRlcm1pbmUgd2hlbiB0aG9zZSBub3RpZmljYXRpb25zIHdpbGwgYmUgZGVsaXZlcmVkLlxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGNhcHRpb24+RW1pdCAxMCwgMjAsIDMwLCB0aGVuICdhJywgJ2InLCAnYycsIHRoZW4gc3RhcnQgdGlja2luZyBldmVyeSBzZWNvbmQuPC9jYXB0aW9uPlxuICAgICAqIHZhciBudW1iZXJzID0gUnguT2JzZXJ2YWJsZS5vZigxMCwgMjAsIDMwKTtcbiAgICAgKiB2YXIgbGV0dGVycyA9IFJ4Lk9ic2VydmFibGUub2YoJ2EnLCAnYicsICdjJyk7XG4gICAgICogdmFyIGludGVydmFsID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxMDAwKTtcbiAgICAgKiB2YXIgcmVzdWx0ID0gbnVtYmVycy5jb25jYXQobGV0dGVycykuY29uY2F0KGludGVydmFsKTtcbiAgICAgKiByZXN1bHQuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICAgICAqXG4gICAgICogQHNlZSB7QGxpbmsgY3JlYXRlfVxuICAgICAqIEBzZWUge0BsaW5rIGVtcHR5fVxuICAgICAqIEBzZWUge0BsaW5rIG5ldmVyfVxuICAgICAqIEBzZWUge0BsaW5rIHRocm93fVxuICAgICAqXG4gICAgICogQHBhcmFtIHsuLi5UfSB2YWx1ZXMgQXJndW1lbnRzIHRoYXQgcmVwcmVzZW50IGBuZXh0YCB2YWx1ZXMgdG8gYmUgZW1pdHRlZC5cbiAgICAgKiBAcGFyYW0ge1NjaGVkdWxlcn0gW3NjaGVkdWxlcl0gQSB7QGxpbmsgU2NoZWR1bGVyfSB0byB1c2UgZm9yIHNjaGVkdWxpbmdcbiAgICAgKiB0aGUgZW1pc3Npb25zIG9mIHRoZSBgbmV4dGAgbm90aWZpY2F0aW9ucy5cbiAgICAgKiBAcmV0dXJuIHtPYnNlcnZhYmxlPFQ+fSBBbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgZWFjaCBnaXZlbiBpbnB1dCB2YWx1ZS5cbiAgICAgKiBAc3RhdGljIHRydWVcbiAgICAgKiBAbmFtZSBvZlxuICAgICAqIEBvd25lciBPYnNlcnZhYmxlXG4gICAgICovXG4gICAgQXJyYXlPYnNlcnZhYmxlLm9mID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYXJyYXkgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIGFycmF5W19pIC0gMF0gPSBhcmd1bWVudHNbX2ldO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzY2hlZHVsZXIgPSBhcnJheVthcnJheS5sZW5ndGggLSAxXTtcbiAgICAgICAgaWYgKGlzU2NoZWR1bGVyXzEuaXNTY2hlZHVsZXIoc2NoZWR1bGVyKSkge1xuICAgICAgICAgICAgYXJyYXkucG9wKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzY2hlZHVsZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHZhciBsZW4gPSBhcnJheS5sZW5ndGg7XG4gICAgICAgIGlmIChsZW4gPiAxKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEFycmF5T2JzZXJ2YWJsZShhcnJheSwgc2NoZWR1bGVyKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChsZW4gPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgU2NhbGFyT2JzZXJ2YWJsZV8xLlNjYWxhck9ic2VydmFibGUoYXJyYXlbMF0sIHNjaGVkdWxlcik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEVtcHR5T2JzZXJ2YWJsZV8xLkVtcHR5T2JzZXJ2YWJsZShzY2hlZHVsZXIpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBBcnJheU9ic2VydmFibGUuZGlzcGF0Y2ggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgdmFyIGFycmF5ID0gc3RhdGUuYXJyYXksIGluZGV4ID0gc3RhdGUuaW5kZXgsIGNvdW50ID0gc3RhdGUuY291bnQsIHN1YnNjcmliZXIgPSBzdGF0ZS5zdWJzY3JpYmVyO1xuICAgICAgICBpZiAoaW5kZXggPj0gY291bnQpIHtcbiAgICAgICAgICAgIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzdWJzY3JpYmVyLm5leHQoYXJyYXlbaW5kZXhdKTtcbiAgICAgICAgaWYgKHN1YnNjcmliZXIuaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5pbmRleCA9IGluZGV4ICsgMTtcbiAgICAgICAgdGhpcy5zY2hlZHVsZShzdGF0ZSk7XG4gICAgfTtcbiAgICBBcnJheU9ic2VydmFibGUucHJvdG90eXBlLl9zdWJzY3JpYmUgPSBmdW5jdGlvbiAoc3Vic2NyaWJlcikge1xuICAgICAgICB2YXIgaW5kZXggPSAwO1xuICAgICAgICB2YXIgYXJyYXkgPSB0aGlzLmFycmF5O1xuICAgICAgICB2YXIgY291bnQgPSBhcnJheS5sZW5ndGg7XG4gICAgICAgIHZhciBzY2hlZHVsZXIgPSB0aGlzLnNjaGVkdWxlcjtcbiAgICAgICAgaWYgKHNjaGVkdWxlcikge1xuICAgICAgICAgICAgcmV0dXJuIHNjaGVkdWxlci5zY2hlZHVsZShBcnJheU9ic2VydmFibGUuZGlzcGF0Y2gsIDAsIHtcbiAgICAgICAgICAgICAgICBhcnJheTogYXJyYXksIGluZGV4OiBpbmRleCwgY291bnQ6IGNvdW50LCBzdWJzY3JpYmVyOiBzdWJzY3JpYmVyXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQgJiYgIXN1YnNjcmliZXIuaXNVbnN1YnNjcmliZWQ7IGkrKykge1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIubmV4dChhcnJheVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdWJzY3JpYmVyLmNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBBcnJheU9ic2VydmFibGU7XG59KE9ic2VydmFibGVfMS5PYnNlcnZhYmxlKSk7XG5leHBvcnRzLkFycmF5T2JzZXJ2YWJsZSA9IEFycmF5T2JzZXJ2YWJsZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUFycmF5T2JzZXJ2YWJsZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uL09ic2VydmFibGUnKTtcbnZhciBTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuLi9TdWJzY3JpYmVyJyk7XG52YXIgU3Vic2NyaXB0aW9uXzEgPSByZXF1aXJlKCcuLi9TdWJzY3JpcHRpb24nKTtcbi8qKlxuICogQGNsYXNzIENvbm5lY3RhYmxlT2JzZXJ2YWJsZTxUPlxuICovXG52YXIgQ29ubmVjdGFibGVPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQ29ubmVjdGFibGVPYnNlcnZhYmxlLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIENvbm5lY3RhYmxlT2JzZXJ2YWJsZShzb3VyY2UsIHN1YmplY3RGYWN0b3J5KSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgICAgdGhpcy5zdWJqZWN0RmFjdG9yeSA9IHN1YmplY3RGYWN0b3J5O1xuICAgIH1cbiAgICBDb25uZWN0YWJsZU9ic2VydmFibGUucHJvdG90eXBlLl9zdWJzY3JpYmUgPSBmdW5jdGlvbiAoc3Vic2NyaWJlcikge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRTdWJqZWN0KCkuc3Vic2NyaWJlKHN1YnNjcmliZXIpO1xuICAgIH07XG4gICAgQ29ubmVjdGFibGVPYnNlcnZhYmxlLnByb3RvdHlwZS5nZXRTdWJqZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc3ViamVjdCA9IHRoaXMuc3ViamVjdDtcbiAgICAgICAgaWYgKHN1YmplY3QgJiYgIXN1YmplY3QuaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBzdWJqZWN0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAodGhpcy5zdWJqZWN0ID0gdGhpcy5zdWJqZWN0RmFjdG9yeSgpKTtcbiAgICB9O1xuICAgIENvbm5lY3RhYmxlT2JzZXJ2YWJsZS5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IHRoaXMuc291cmNlO1xuICAgICAgICB2YXIgc3Vic2NyaXB0aW9uID0gdGhpcy5zdWJzY3JpcHRpb247XG4gICAgICAgIGlmIChzdWJzY3JpcHRpb24gJiYgIXN1YnNjcmlwdGlvbi5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHN1YnNjcmlwdGlvbjtcbiAgICAgICAgfVxuICAgICAgICBzdWJzY3JpcHRpb24gPSBzb3VyY2Uuc3Vic2NyaWJlKHRoaXMuZ2V0U3ViamVjdCgpKTtcbiAgICAgICAgc3Vic2NyaXB0aW9uLmFkZChuZXcgQ29ubmVjdGFibGVTdWJzY3JpcHRpb24odGhpcykpO1xuICAgICAgICByZXR1cm4gKHRoaXMuc3Vic2NyaXB0aW9uID0gc3Vic2NyaXB0aW9uKTtcbiAgICB9O1xuICAgIENvbm5lY3RhYmxlT2JzZXJ2YWJsZS5wcm90b3R5cGUucmVmQ291bnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVmQ291bnRPYnNlcnZhYmxlKHRoaXMpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogVGhpcyBtZXRob2QgaXMgb3BlbmVkIGZvciBgQ29ubmVjdGFibGVTdWJzY3JpcHRpb25gLlxuICAgICAqIE5vdCB0byBjYWxsIGZyb20gb3RoZXJzLlxuICAgICAqL1xuICAgIENvbm5lY3RhYmxlT2JzZXJ2YWJsZS5wcm90b3R5cGUuX2Nsb3NlU3Vic2NyaXB0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnN1YmplY3QgPSBudWxsO1xuICAgICAgICB0aGlzLnN1YnNjcmlwdGlvbiA9IG51bGw7XG4gICAgfTtcbiAgICByZXR1cm4gQ29ubmVjdGFibGVPYnNlcnZhYmxlO1xufShPYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZSkpO1xuZXhwb3J0cy5Db25uZWN0YWJsZU9ic2VydmFibGUgPSBDb25uZWN0YWJsZU9ic2VydmFibGU7XG4vKipcbiAqIFdlIG5lZWQgdGhpcyBKU0RvYyBjb21tZW50IGZvciBhZmZlY3RpbmcgRVNEb2MuXG4gKiBAaWdub3JlXG4gKiBAZXh0ZW5kcyB7SWdub3JlZH1cbiAqL1xudmFyIENvbm5lY3RhYmxlU3Vic2NyaXB0aW9uID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQ29ubmVjdGFibGVTdWJzY3JpcHRpb24sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQ29ubmVjdGFibGVTdWJzY3JpcHRpb24oY29ubmVjdGFibGUpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuY29ubmVjdGFibGUgPSBjb25uZWN0YWJsZTtcbiAgICB9XG4gICAgQ29ubmVjdGFibGVTdWJzY3JpcHRpb24ucHJvdG90eXBlLl91bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNvbm5lY3RhYmxlID0gdGhpcy5jb25uZWN0YWJsZTtcbiAgICAgICAgY29ubmVjdGFibGUuX2Nsb3NlU3Vic2NyaXB0aW9uKCk7XG4gICAgICAgIHRoaXMuY29ubmVjdGFibGUgPSBudWxsO1xuICAgIH07XG4gICAgcmV0dXJuIENvbm5lY3RhYmxlU3Vic2NyaXB0aW9uO1xufShTdWJzY3JpcHRpb25fMS5TdWJzY3JpcHRpb24pKTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgUmVmQ291bnRPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoUmVmQ291bnRPYnNlcnZhYmxlLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFJlZkNvdW50T2JzZXJ2YWJsZShjb25uZWN0YWJsZSwgcmVmQ291bnQpIHtcbiAgICAgICAgaWYgKHJlZkNvdW50ID09PSB2b2lkIDApIHsgcmVmQ291bnQgPSAwOyB9XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLmNvbm5lY3RhYmxlID0gY29ubmVjdGFibGU7XG4gICAgICAgIHRoaXMucmVmQ291bnQgPSByZWZDb3VudDtcbiAgICB9XG4gICAgUmVmQ291bnRPYnNlcnZhYmxlLnByb3RvdHlwZS5fc3Vic2NyaWJlID0gZnVuY3Rpb24gKHN1YnNjcmliZXIpIHtcbiAgICAgICAgdmFyIGNvbm5lY3RhYmxlID0gdGhpcy5jb25uZWN0YWJsZTtcbiAgICAgICAgdmFyIHJlZkNvdW50U3Vic2NyaWJlciA9IG5ldyBSZWZDb3VudFN1YnNjcmliZXIoc3Vic2NyaWJlciwgdGhpcyk7XG4gICAgICAgIHZhciBzdWJzY3JpcHRpb24gPSBjb25uZWN0YWJsZS5zdWJzY3JpYmUocmVmQ291bnRTdWJzY3JpYmVyKTtcbiAgICAgICAgaWYgKCFzdWJzY3JpcHRpb24uaXNVbnN1YnNjcmliZWQgJiYgKyt0aGlzLnJlZkNvdW50ID09PSAxKSB7XG4gICAgICAgICAgICByZWZDb3VudFN1YnNjcmliZXIuY29ubmVjdGlvbiA9IHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3RhYmxlLmNvbm5lY3QoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuICAgIH07XG4gICAgcmV0dXJuIFJlZkNvdW50T2JzZXJ2YWJsZTtcbn0oT2JzZXJ2YWJsZV8xLk9ic2VydmFibGUpKTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgUmVmQ291bnRTdWJzY3JpYmVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoUmVmQ291bnRTdWJzY3JpYmVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFJlZkNvdW50U3Vic2NyaWJlcihkZXN0aW5hdGlvbiwgcmVmQ291bnRPYnNlcnZhYmxlKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIG51bGwpO1xuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uID0gZGVzdGluYXRpb247XG4gICAgICAgIHRoaXMucmVmQ291bnRPYnNlcnZhYmxlID0gcmVmQ291bnRPYnNlcnZhYmxlO1xuICAgICAgICB0aGlzLmNvbm5lY3Rpb24gPSByZWZDb3VudE9ic2VydmFibGUuY29ubmVjdGlvbjtcbiAgICAgICAgZGVzdGluYXRpb24uYWRkKHRoaXMpO1xuICAgIH1cbiAgICBSZWZDb3VudFN1YnNjcmliZXIucHJvdG90eXBlLl9uZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24ubmV4dCh2YWx1ZSk7XG4gICAgfTtcbiAgICBSZWZDb3VudFN1YnNjcmliZXIucHJvdG90eXBlLl9lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdGhpcy5fcmVzZXRDb25uZWN0YWJsZSgpO1xuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmVycm9yKGVycik7XG4gICAgfTtcbiAgICBSZWZDb3VudFN1YnNjcmliZXIucHJvdG90eXBlLl9jb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fcmVzZXRDb25uZWN0YWJsZSgpO1xuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmNvbXBsZXRlKCk7XG4gICAgfTtcbiAgICBSZWZDb3VudFN1YnNjcmliZXIucHJvdG90eXBlLl9yZXNldENvbm5lY3RhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb2JzZXJ2YWJsZSA9IHRoaXMucmVmQ291bnRPYnNlcnZhYmxlO1xuICAgICAgICB2YXIgb2JzQ29ubmVjdGlvbiA9IG9ic2VydmFibGUuY29ubmVjdGlvbjtcbiAgICAgICAgdmFyIHN1YkNvbm5lY3Rpb24gPSB0aGlzLmNvbm5lY3Rpb247XG4gICAgICAgIGlmIChzdWJDb25uZWN0aW9uICYmIHN1YkNvbm5lY3Rpb24gPT09IG9ic0Nvbm5lY3Rpb24pIHtcbiAgICAgICAgICAgIG9ic2VydmFibGUucmVmQ291bnQgPSAwO1xuICAgICAgICAgICAgb2JzQ29ubmVjdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgb2JzZXJ2YWJsZS5jb25uZWN0aW9uID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgUmVmQ291bnRTdWJzY3JpYmVyLnByb3RvdHlwZS5fdW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvYnNlcnZhYmxlID0gdGhpcy5yZWZDb3VudE9ic2VydmFibGU7XG4gICAgICAgIGlmIChvYnNlcnZhYmxlLnJlZkNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKC0tb2JzZXJ2YWJsZS5yZWZDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgdmFyIG9ic0Nvbm5lY3Rpb24gPSBvYnNlcnZhYmxlLmNvbm5lY3Rpb247XG4gICAgICAgICAgICB2YXIgc3ViQ29ubmVjdGlvbiA9IHRoaXMuY29ubmVjdGlvbjtcbiAgICAgICAgICAgIGlmIChzdWJDb25uZWN0aW9uICYmIHN1YkNvbm5lY3Rpb24gPT09IG9ic0Nvbm5lY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBvYnNDb25uZWN0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgb2JzZXJ2YWJsZS5jb25uZWN0aW9uID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIFJlZkNvdW50U3Vic2NyaWJlcjtcbn0oU3Vic2NyaWJlcl8xLlN1YnNjcmliZXIpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUNvbm5lY3RhYmxlT2JzZXJ2YWJsZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIE9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uL09ic2VydmFibGUnKTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICogQGhpZGUgdHJ1ZVxuICovXG52YXIgRW1wdHlPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoRW1wdHlPYnNlcnZhYmxlLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEVtcHR5T2JzZXJ2YWJsZShzY2hlZHVsZXIpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyBubyBpdGVtcyB0byB0aGUgT2JzZXJ2ZXIgYW5kIGltbWVkaWF0ZWx5XG4gICAgICogZW1pdHMgYSBjb21wbGV0ZSBub3RpZmljYXRpb24uXG4gICAgICpcbiAgICAgKiA8c3BhbiBjbGFzcz1cImluZm9ybWFsXCI+SnVzdCBlbWl0cyAnY29tcGxldGUnLCBhbmQgbm90aGluZyBlbHNlLlxuICAgICAqIDwvc3Bhbj5cbiAgICAgKlxuICAgICAqIDxpbWcgc3JjPVwiLi9pbWcvZW1wdHkucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gICAgICpcbiAgICAgKiBUaGlzIHN0YXRpYyBvcGVyYXRvciBpcyB1c2VmdWwgZm9yIGNyZWF0aW5nIGEgc2ltcGxlIE9ic2VydmFibGUgdGhhdCBvbmx5XG4gICAgICogZW1pdHMgdGhlIGNvbXBsZXRlIG5vdGlmaWNhdGlvbi4gSXQgY2FuIGJlIHVzZWQgZm9yIGNvbXBvc2luZyB3aXRoIG90aGVyXG4gICAgICogT2JzZXJ2YWJsZXMsIHN1Y2ggYXMgaW4gYSB7QGxpbmsgbWVyZ2VNYXB9LlxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGNhcHRpb24+RW1pdCB0aGUgbnVtYmVyIDcsIHRoZW4gY29tcGxldGUuPC9jYXB0aW9uPlxuICAgICAqIHZhciByZXN1bHQgPSBSeC5PYnNlcnZhYmxlLmVtcHR5KCkuc3RhcnRXaXRoKDcpO1xuICAgICAqIHJlc3VsdC5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8Y2FwdGlvbj5NYXAgYW5kIGZsYXR0ZW4gb25seSBvZGQgbnVtYmVycyB0byB0aGUgc2VxdWVuY2UgJ2EnLCAnYicsICdjJzwvY2FwdGlvbj5cbiAgICAgKiB2YXIgaW50ZXJ2YWwgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMDApO1xuICAgICAqIHZhciByZXN1bHQgPSBpbnRlcnZhbC5tZXJnZU1hcCh4ID0+XG4gICAgICogICB4ICUgMiA9PT0gMSA/IFJ4Lk9ic2VydmFibGUub2YoJ2EnLCAnYicsICdjJykgOiBSeC5PYnNlcnZhYmxlLmVtcHR5KClcbiAgICAgKiApO1xuICAgICAqIHJlc3VsdC5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gICAgICpcbiAgICAgKiBAc2VlIHtAbGluayBjcmVhdGV9XG4gICAgICogQHNlZSB7QGxpbmsgbmV2ZXJ9XG4gICAgICogQHNlZSB7QGxpbmsgb2Z9XG4gICAgICogQHNlZSB7QGxpbmsgdGhyb3d9XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1NjaGVkdWxlcn0gW3NjaGVkdWxlcl0gQSB7QGxpbmsgU2NoZWR1bGVyfSB0byB1c2UgZm9yIHNjaGVkdWxpbmdcbiAgICAgKiB0aGUgZW1pc3Npb24gb2YgdGhlIGNvbXBsZXRlIG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAcmV0dXJuIHtPYnNlcnZhYmxlfSBBbiBcImVtcHR5XCIgT2JzZXJ2YWJsZTogZW1pdHMgb25seSB0aGUgY29tcGxldGVcbiAgICAgKiBub3RpZmljYXRpb24uXG4gICAgICogQHN0YXRpYyB0cnVlXG4gICAgICogQG5hbWUgZW1wdHlcbiAgICAgKiBAb3duZXIgT2JzZXJ2YWJsZVxuICAgICAqL1xuICAgIEVtcHR5T2JzZXJ2YWJsZS5jcmVhdGUgPSBmdW5jdGlvbiAoc2NoZWR1bGVyKSB7XG4gICAgICAgIHJldHVybiBuZXcgRW1wdHlPYnNlcnZhYmxlKHNjaGVkdWxlcik7XG4gICAgfTtcbiAgICBFbXB0eU9ic2VydmFibGUuZGlzcGF0Y2ggPSBmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgIHZhciBzdWJzY3JpYmVyID0gYXJnLnN1YnNjcmliZXI7XG4gICAgICAgIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICB9O1xuICAgIEVtcHR5T2JzZXJ2YWJsZS5wcm90b3R5cGUuX3N1YnNjcmliZSA9IGZ1bmN0aW9uIChzdWJzY3JpYmVyKSB7XG4gICAgICAgIHZhciBzY2hlZHVsZXIgPSB0aGlzLnNjaGVkdWxlcjtcbiAgICAgICAgaWYgKHNjaGVkdWxlcikge1xuICAgICAgICAgICAgcmV0dXJuIHNjaGVkdWxlci5zY2hlZHVsZShFbXB0eU9ic2VydmFibGUuZGlzcGF0Y2gsIDAsIHsgc3Vic2NyaWJlcjogc3Vic2NyaWJlciB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIEVtcHR5T2JzZXJ2YWJsZTtcbn0oT2JzZXJ2YWJsZV8xLk9ic2VydmFibGUpKTtcbmV4cG9ydHMuRW1wdHlPYnNlcnZhYmxlID0gRW1wdHlPYnNlcnZhYmxlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9RW1wdHlPYnNlcnZhYmxlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vT2JzZXJ2YWJsZScpO1xuLyoqXG4gKiBXZSBuZWVkIHRoaXMgSlNEb2MgY29tbWVudCBmb3IgYWZmZWN0aW5nIEVTRG9jLlxuICogQGV4dGVuZHMge0lnbm9yZWR9XG4gKiBAaGlkZSB0cnVlXG4gKi9cbnZhciBTY2FsYXJPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoU2NhbGFyT2JzZXJ2YWJsZSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTY2FsYXJPYnNlcnZhYmxlKHZhbHVlLCBzY2hlZHVsZXIpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5zY2hlZHVsZXIgPSBzY2hlZHVsZXI7XG4gICAgICAgIHRoaXMuX2lzU2NhbGFyID0gdHJ1ZTtcbiAgICB9XG4gICAgU2NhbGFyT2JzZXJ2YWJsZS5jcmVhdGUgPSBmdW5jdGlvbiAodmFsdWUsIHNjaGVkdWxlcikge1xuICAgICAgICByZXR1cm4gbmV3IFNjYWxhck9ic2VydmFibGUodmFsdWUsIHNjaGVkdWxlcik7XG4gICAgfTtcbiAgICBTY2FsYXJPYnNlcnZhYmxlLmRpc3BhdGNoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHZhciBkb25lID0gc3RhdGUuZG9uZSwgdmFsdWUgPSBzdGF0ZS52YWx1ZSwgc3Vic2NyaWJlciA9IHN0YXRlLnN1YnNjcmliZXI7XG4gICAgICAgIGlmIChkb25lKSB7XG4gICAgICAgICAgICBzdWJzY3JpYmVyLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3Vic2NyaWJlci5uZXh0KHZhbHVlKTtcbiAgICAgICAgaWYgKHN1YnNjcmliZXIuaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5kb25lID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zY2hlZHVsZShzdGF0ZSk7XG4gICAgfTtcbiAgICBTY2FsYXJPYnNlcnZhYmxlLnByb3RvdHlwZS5fc3Vic2NyaWJlID0gZnVuY3Rpb24gKHN1YnNjcmliZXIpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gdGhpcy52YWx1ZTtcbiAgICAgICAgdmFyIHNjaGVkdWxlciA9IHRoaXMuc2NoZWR1bGVyO1xuICAgICAgICBpZiAoc2NoZWR1bGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gc2NoZWR1bGVyLnNjaGVkdWxlKFNjYWxhck9ic2VydmFibGUuZGlzcGF0Y2gsIDAsIHtcbiAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSwgdmFsdWU6IHZhbHVlLCBzdWJzY3JpYmVyOiBzdWJzY3JpYmVyXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN1YnNjcmliZXIubmV4dCh2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoIXN1YnNjcmliZXIuaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmVyLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBTY2FsYXJPYnNlcnZhYmxlO1xufShPYnNlcnZhYmxlXzEuT2JzZXJ2YWJsZSkpO1xuZXhwb3J0cy5TY2FsYXJPYnNlcnZhYmxlID0gU2NhbGFyT2JzZXJ2YWJsZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPVNjYWxhck9ic2VydmFibGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgQXJyYXlPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuL0FycmF5T2JzZXJ2YWJsZScpO1xuZXhwb3J0cy5vZiA9IEFycmF5T2JzZXJ2YWJsZV8xLkFycmF5T2JzZXJ2YWJsZS5vZjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW9mLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgQXJyYXlPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi9vYnNlcnZhYmxlL0FycmF5T2JzZXJ2YWJsZScpO1xudmFyIGlzQXJyYXlfMSA9IHJlcXVpcmUoJy4uL3V0aWwvaXNBcnJheScpO1xudmFyIGlzU2NoZWR1bGVyXzEgPSByZXF1aXJlKCcuLi91dGlsL2lzU2NoZWR1bGVyJyk7XG52YXIgT3V0ZXJTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuLi9PdXRlclN1YnNjcmliZXInKTtcbnZhciBzdWJzY3JpYmVUb1Jlc3VsdF8xID0gcmVxdWlyZSgnLi4vdXRpbC9zdWJzY3JpYmVUb1Jlc3VsdCcpO1xuLyoqXG4gKiBDb21iaW5lcyBtdWx0aXBsZSBPYnNlcnZhYmxlcyB0byBjcmVhdGUgYW4gT2JzZXJ2YWJsZSB3aG9zZSB2YWx1ZXMgYXJlXG4gKiBjYWxjdWxhdGVkIGZyb20gdGhlIGxhdGVzdCB2YWx1ZXMgb2YgZWFjaCBvZiBpdHMgaW5wdXQgT2JzZXJ2YWJsZXMuXG4gKlxuICogPHNwYW4gY2xhc3M9XCJpbmZvcm1hbFwiPldoZW5ldmVyIGFueSBpbnB1dCBPYnNlcnZhYmxlIGVtaXRzIGEgdmFsdWUsIGl0XG4gKiBjb21wdXRlcyBhIGZvcm11bGEgdXNpbmcgdGhlIGxhdGVzdCB2YWx1ZXMgZnJvbSBhbGwgdGhlIGlucHV0cywgdGhlbiBlbWl0c1xuICogdGhlIG91dHB1dCBvZiB0aGF0IGZvcm11bGEuPC9zcGFuPlxuICpcbiAqIDxpbWcgc3JjPVwiLi9pbWcvY29tYmluZUxhdGVzdC5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAqXG4gKiBgY29tYmluZUxhdGVzdGAgY29tYmluZXMgdGhlIHZhbHVlcyBmcm9tIHRoaXMgT2JzZXJ2YWJsZSB3aXRoIHZhbHVlcyBmcm9tXG4gKiBPYnNlcnZhYmxlcyBwYXNzZWQgYXMgYXJndW1lbnRzLiBUaGlzIGlzIGRvbmUgYnkgc3Vic2NyaWJpbmcgdG8gZWFjaFxuICogT2JzZXJ2YWJsZSwgaW4gb3JkZXIsIGFuZCBjb2xsZWN0aW5nIGFuIGFycmF5IG9mIGVhY2ggb2YgdGhlIG1vc3QgcmVjZW50XG4gKiB2YWx1ZXMgYW55IHRpbWUgYW55IG9mIHRoZSBpbnB1dCBPYnNlcnZhYmxlcyBlbWl0cywgdGhlbiBlaXRoZXIgdGFraW5nIHRoYXRcbiAqIGFycmF5IGFuZCBwYXNzaW5nIGl0IGFzIGFyZ3VtZW50cyB0byBhbiBvcHRpb25hbCBgcHJvamVjdGAgZnVuY3Rpb24gYW5kXG4gKiBlbWl0dGluZyB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoYXQsIG9yIGp1c3QgZW1pdHRpbmcgdGhlIGFycmF5IG9mIHJlY2VudFxuICogdmFsdWVzIGRpcmVjdGx5IGlmIHRoZXJlIGlzIG5vIGBwcm9qZWN0YCBmdW5jdGlvbi5cbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5EeW5hbWljYWxseSBjYWxjdWxhdGUgdGhlIEJvZHktTWFzcyBJbmRleCBmcm9tIGFuIE9ic2VydmFibGUgb2Ygd2VpZ2h0IGFuZCBvbmUgZm9yIGhlaWdodDwvY2FwdGlvbj5cbiAqIHZhciB3ZWlnaHQgPSBSeC5PYnNlcnZhYmxlLm9mKDcwLCA3MiwgNzYsIDc5LCA3NSk7XG4gKiB2YXIgaGVpZ2h0ID0gUnguT2JzZXJ2YWJsZS5vZigxLjc2LCAxLjc3LCAxLjc4KTtcbiAqIHZhciBibWkgPSB3ZWlnaHQuY29tYmluZUxhdGVzdChoZWlnaHQsICh3LCBoKSA9PiB3IC8gKGggKiBoKSk7XG4gKiBibWkuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coJ0JNSSBpcyAnICsgeCkpO1xuICpcbiAqIEBzZWUge0BsaW5rIGNvbWJpbmVBbGx9XG4gKiBAc2VlIHtAbGluayBtZXJnZX1cbiAqIEBzZWUge0BsaW5rIHdpdGhMYXRlc3RGcm9tfVxuICpcbiAqIEBwYXJhbSB7T2JzZXJ2YWJsZX0gb3RoZXIgQW4gaW5wdXQgT2JzZXJ2YWJsZSB0byBjb21iaW5lIHdpdGggdGhlIHNvdXJjZVxuICogT2JzZXJ2YWJsZS4gTW9yZSB0aGFuIG9uZSBpbnB1dCBPYnNlcnZhYmxlcyBtYXkgYmUgZ2l2ZW4gYXMgYXJndW1lbnQuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBbcHJvamVjdF0gQW4gb3B0aW9uYWwgZnVuY3Rpb24gdG8gcHJvamVjdCB0aGUgdmFsdWVzIGZyb21cbiAqIHRoZSBjb21iaW5lZCBsYXRlc3QgdmFsdWVzIGludG8gYSBuZXcgdmFsdWUgb24gdGhlIG91dHB1dCBPYnNlcnZhYmxlLlxuICogQHJldHVybiB7T2JzZXJ2YWJsZX0gQW4gT2JzZXJ2YWJsZSBvZiBwcm9qZWN0ZWQgdmFsdWVzIGZyb20gdGhlIG1vc3QgcmVjZW50XG4gKiB2YWx1ZXMgZnJvbSBlYWNoIGlucHV0IE9ic2VydmFibGUsIG9yIGFuIGFycmF5IG9mIHRoZSBtb3N0IHJlY2VudCB2YWx1ZXMgZnJvbVxuICogZWFjaCBpbnB1dCBPYnNlcnZhYmxlLlxuICogQG1ldGhvZCBjb21iaW5lTGF0ZXN0XG4gKiBAb3duZXIgT2JzZXJ2YWJsZVxuICovXG5mdW5jdGlvbiBjb21iaW5lTGF0ZXN0KCkge1xuICAgIHZhciBvYnNlcnZhYmxlcyA9IFtdO1xuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgIG9ic2VydmFibGVzW19pIC0gMF0gPSBhcmd1bWVudHNbX2ldO1xuICAgIH1cbiAgICB2YXIgcHJvamVjdCA9IG51bGw7XG4gICAgaWYgKHR5cGVvZiBvYnNlcnZhYmxlc1tvYnNlcnZhYmxlcy5sZW5ndGggLSAxXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBwcm9qZWN0ID0gb2JzZXJ2YWJsZXMucG9wKCk7XG4gICAgfVxuICAgIC8vIGlmIHRoZSBmaXJzdCBhbmQgb25seSBvdGhlciBhcmd1bWVudCBiZXNpZGVzIHRoZSByZXN1bHRTZWxlY3RvciBpcyBhbiBhcnJheVxuICAgIC8vIGFzc3VtZSBpdCdzIGJlZW4gY2FsbGVkIHdpdGggYGNvbWJpbmVMYXRlc3QoW29iczEsIG9iczIsIG9iczNdLCBwcm9qZWN0KWBcbiAgICBpZiAob2JzZXJ2YWJsZXMubGVuZ3RoID09PSAxICYmIGlzQXJyYXlfMS5pc0FycmF5KG9ic2VydmFibGVzWzBdKSkge1xuICAgICAgICBvYnNlcnZhYmxlcyA9IG9ic2VydmFibGVzWzBdO1xuICAgIH1cbiAgICBvYnNlcnZhYmxlcy51bnNoaWZ0KHRoaXMpO1xuICAgIHJldHVybiBuZXcgQXJyYXlPYnNlcnZhYmxlXzEuQXJyYXlPYnNlcnZhYmxlKG9ic2VydmFibGVzKS5saWZ0KG5ldyBDb21iaW5lTGF0ZXN0T3BlcmF0b3IocHJvamVjdCkpO1xufVxuZXhwb3J0cy5jb21iaW5lTGF0ZXN0ID0gY29tYmluZUxhdGVzdDtcbi8qIHRzbGludDplbmFibGU6bWF4LWxpbmUtbGVuZ3RoICovXG4vKipcbiAqIENvbWJpbmVzIHRoZSB2YWx1ZXMgZnJvbSBvYnNlcnZhYmxlcyBwYXNzZWQgYXMgYXJndW1lbnRzLiBUaGlzIGlzIGRvbmUgYnkgc3Vic2NyaWJpbmdcbiAqIHRvIGVhY2ggb2JzZXJ2YWJsZSwgaW4gb3JkZXIsIGFuZCBjb2xsZWN0aW5nIGFuIGFycmF5IG9mIGVhY2ggb2YgdGhlIG1vc3QgcmVjZW50IHZhbHVlcyBhbnkgdGltZSBhbnkgb2YgdGhlIG9ic2VydmFibGVzXG4gKiBlbWl0cywgdGhlbiBlaXRoZXIgdGFraW5nIHRoYXQgYXJyYXkgYW5kIHBhc3NpbmcgaXQgYXMgYXJndW1lbnRzIHRvIGFuIG9wdGlvbiBgcHJvamVjdGAgZnVuY3Rpb24gYW5kIGVtaXR0aW5nIHRoZSByZXR1cm5cbiAqIHZhbHVlIG9mIHRoYXQsIG9yIGp1c3QgZW1pdHRpbmcgdGhlIGFycmF5IG9mIHJlY2VudCB2YWx1ZXMgZGlyZWN0bHkgaWYgdGhlcmUgaXMgbm8gYHByb2plY3RgIGZ1bmN0aW9uLlxuICogQHBhcmFtIHsuLi5PYnNlcnZhYmxlfSBvYnNlcnZhYmxlcyB0aGUgb2JzZXJ2YWJsZXMgdG8gY29tYmluZVxuICogQHBhcmFtIHtmdW5jdGlvbn0gW3Byb2plY3RdIGFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRvIHByb2plY3QgdGhlIHZhbHVlcyBmcm9tIHRoZSBjb21iaW5lZCByZWNlbnQgdmFsdWVzIGludG8gYSBuZXcgdmFsdWUgZm9yIGVtaXNzaW9uLlxuICogQHJldHVybiB7T2JzZXJ2YWJsZX0gYW4gb2JzZXJ2YWJsZSBvZiBvdGhlciBwcm9qZWN0ZWQgdmFsdWVzIGZyb20gdGhlIG1vc3QgcmVjZW50IHZhbHVlcyBmcm9tIGVhY2ggb2JzZXJ2YWJsZSwgb3IgYW4gYXJyYXkgb2YgZWFjaCBvZlxuICogdGhlIG1vc3QgcmVjZW50IHZhbHVlcyBmcm9tIGVhY2ggb2JzZXJ2YWJsZS5cbiAqIEBzdGF0aWMgdHJ1ZVxuICogQG5hbWUgY29tYmluZUxhdGVzdFxuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gY29tYmluZUxhdGVzdFN0YXRpYygpIHtcbiAgICB2YXIgb2JzZXJ2YWJsZXMgPSBbXTtcbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICBvYnNlcnZhYmxlc1tfaSAtIDBdID0gYXJndW1lbnRzW19pXTtcbiAgICB9XG4gICAgdmFyIHByb2plY3QgPSBudWxsO1xuICAgIHZhciBzY2hlZHVsZXIgPSBudWxsO1xuICAgIGlmIChpc1NjaGVkdWxlcl8xLmlzU2NoZWR1bGVyKG9ic2VydmFibGVzW29ic2VydmFibGVzLmxlbmd0aCAtIDFdKSkge1xuICAgICAgICBzY2hlZHVsZXIgPSBvYnNlcnZhYmxlcy5wb3AoKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBvYnNlcnZhYmxlc1tvYnNlcnZhYmxlcy5sZW5ndGggLSAxXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBwcm9qZWN0ID0gb2JzZXJ2YWJsZXMucG9wKCk7XG4gICAgfVxuICAgIC8vIGlmIHRoZSBmaXJzdCBhbmQgb25seSBvdGhlciBhcmd1bWVudCBiZXNpZGVzIHRoZSByZXN1bHRTZWxlY3RvciBpcyBhbiBhcnJheVxuICAgIC8vIGFzc3VtZSBpdCdzIGJlZW4gY2FsbGVkIHdpdGggYGNvbWJpbmVMYXRlc3QoW29iczEsIG9iczIsIG9iczNdLCBwcm9qZWN0KWBcbiAgICBpZiAob2JzZXJ2YWJsZXMubGVuZ3RoID09PSAxICYmIGlzQXJyYXlfMS5pc0FycmF5KG9ic2VydmFibGVzWzBdKSkge1xuICAgICAgICBvYnNlcnZhYmxlcyA9IG9ic2VydmFibGVzWzBdO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEFycmF5T2JzZXJ2YWJsZV8xLkFycmF5T2JzZXJ2YWJsZShvYnNlcnZhYmxlcywgc2NoZWR1bGVyKS5saWZ0KG5ldyBDb21iaW5lTGF0ZXN0T3BlcmF0b3IocHJvamVjdCkpO1xufVxuZXhwb3J0cy5jb21iaW5lTGF0ZXN0U3RhdGljID0gY29tYmluZUxhdGVzdFN0YXRpYztcbnZhciBDb21iaW5lTGF0ZXN0T3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIENvbWJpbmVMYXRlc3RPcGVyYXRvcihwcm9qZWN0KSB7XG4gICAgICAgIHRoaXMucHJvamVjdCA9IHByb2plY3Q7XG4gICAgfVxuICAgIENvbWJpbmVMYXRlc3RPcGVyYXRvci5wcm90b3R5cGUuY2FsbCA9IGZ1bmN0aW9uIChzdWJzY3JpYmVyLCBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5fc3Vic2NyaWJlKG5ldyBDb21iaW5lTGF0ZXN0U3Vic2NyaWJlcihzdWJzY3JpYmVyLCB0aGlzLnByb2plY3QpKTtcbiAgICB9O1xuICAgIHJldHVybiBDb21iaW5lTGF0ZXN0T3BlcmF0b3I7XG59KCkpO1xuZXhwb3J0cy5Db21iaW5lTGF0ZXN0T3BlcmF0b3IgPSBDb21iaW5lTGF0ZXN0T3BlcmF0b3I7XG4vKipcbiAqIFdlIG5lZWQgdGhpcyBKU0RvYyBjb21tZW50IGZvciBhZmZlY3RpbmcgRVNEb2MuXG4gKiBAaWdub3JlXG4gKiBAZXh0ZW5kcyB7SWdub3JlZH1cbiAqL1xudmFyIENvbWJpbmVMYXRlc3RTdWJzY3JpYmVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQ29tYmluZUxhdGVzdFN1YnNjcmliZXIsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQ29tYmluZUxhdGVzdFN1YnNjcmliZXIoZGVzdGluYXRpb24sIHByb2plY3QpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVzdGluYXRpb24pO1xuICAgICAgICB0aGlzLnByb2plY3QgPSBwcm9qZWN0O1xuICAgICAgICB0aGlzLmFjdGl2ZSA9IDA7XG4gICAgICAgIHRoaXMudmFsdWVzID0gW107XG4gICAgICAgIHRoaXMub2JzZXJ2YWJsZXMgPSBbXTtcbiAgICAgICAgdGhpcy50b1Jlc3BvbmQgPSBbXTtcbiAgICB9XG4gICAgQ29tYmluZUxhdGVzdFN1YnNjcmliZXIucHJvdG90eXBlLl9uZXh0ID0gZnVuY3Rpb24gKG9ic2VydmFibGUpIHtcbiAgICAgICAgdmFyIHRvUmVzcG9uZCA9IHRoaXMudG9SZXNwb25kO1xuICAgICAgICB0b1Jlc3BvbmQucHVzaCh0b1Jlc3BvbmQubGVuZ3RoKTtcbiAgICAgICAgdGhpcy5vYnNlcnZhYmxlcy5wdXNoKG9ic2VydmFibGUpO1xuICAgIH07XG4gICAgQ29tYmluZUxhdGVzdFN1YnNjcmliZXIucHJvdG90eXBlLl9jb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9ic2VydmFibGVzID0gdGhpcy5vYnNlcnZhYmxlcztcbiAgICAgICAgdmFyIGxlbiA9IG9ic2VydmFibGVzLmxlbmd0aDtcbiAgICAgICAgaWYgKGxlbiA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5hY3RpdmUgPSBsZW47XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9ic2VydmFibGUgPSBvYnNlcnZhYmxlc1tpXTtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZChzdWJzY3JpYmVUb1Jlc3VsdF8xLnN1YnNjcmliZVRvUmVzdWx0KHRoaXMsIG9ic2VydmFibGUsIG9ic2VydmFibGUsIGkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgQ29tYmluZUxhdGVzdFN1YnNjcmliZXIucHJvdG90eXBlLm5vdGlmeUNvbXBsZXRlID0gZnVuY3Rpb24gKHVudXNlZCkge1xuICAgICAgICBpZiAoKHRoaXMuYWN0aXZlIC09IDEpID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIENvbWJpbmVMYXRlc3RTdWJzY3JpYmVyLnByb3RvdHlwZS5ub3RpZnlOZXh0ID0gZnVuY3Rpb24gKG91dGVyVmFsdWUsIGlubmVyVmFsdWUsIG91dGVySW5kZXgsIGlubmVySW5kZXgsIGlubmVyU3ViKSB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLnZhbHVlcztcbiAgICAgICAgdmFsdWVzW291dGVySW5kZXhdID0gaW5uZXJWYWx1ZTtcbiAgICAgICAgdmFyIHRvUmVzcG9uZCA9IHRoaXMudG9SZXNwb25kO1xuICAgICAgICBpZiAodG9SZXNwb25kLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBmb3VuZCA9IHRvUmVzcG9uZC5pbmRleE9mKG91dGVySW5kZXgpO1xuICAgICAgICAgICAgaWYgKGZvdW5kICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHRvUmVzcG9uZC5zcGxpY2UoZm91bmQsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0b1Jlc3BvbmQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdHJ5UHJvamVjdCh2YWx1ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5uZXh0KHZhbHVlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIENvbWJpbmVMYXRlc3RTdWJzY3JpYmVyLnByb3RvdHlwZS5fdHJ5UHJvamVjdCA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMucHJvamVjdC5hcHBseSh0aGlzLCB2YWx1ZXMpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24uZXJyb3IoZXJyKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLm5leHQocmVzdWx0KTtcbiAgICB9O1xuICAgIHJldHVybiBDb21iaW5lTGF0ZXN0U3Vic2NyaWJlcjtcbn0oT3V0ZXJTdWJzY3JpYmVyXzEuT3V0ZXJTdWJzY3JpYmVyKSk7XG5leHBvcnRzLkNvbWJpbmVMYXRlc3RTdWJzY3JpYmVyID0gQ29tYmluZUxhdGVzdFN1YnNjcmliZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb21iaW5lTGF0ZXN0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIGlzU2NoZWR1bGVyXzEgPSByZXF1aXJlKCcuLi91dGlsL2lzU2NoZWR1bGVyJyk7XG52YXIgQXJyYXlPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi9vYnNlcnZhYmxlL0FycmF5T2JzZXJ2YWJsZScpO1xudmFyIG1lcmdlQWxsXzEgPSByZXF1aXJlKCcuL21lcmdlQWxsJyk7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IE9ic2VydmFibGUgd2hpY2ggc2VxdWVudGlhbGx5IGVtaXRzIGFsbCB2YWx1ZXMgZnJvbSBldmVyeVxuICogZ2l2ZW4gaW5wdXQgT2JzZXJ2YWJsZSBhZnRlciB0aGUgY3VycmVudCBPYnNlcnZhYmxlLlxuICpcbiAqIDxzcGFuIGNsYXNzPVwiaW5mb3JtYWxcIj5Db25jYXRlbmF0ZXMgbXVsdGlwbGUgT2JzZXJ2YWJsZXMgdG9nZXRoZXIgYnlcbiAqIHNlcXVlbnRpYWxseSBlbWl0dGluZyB0aGVpciB2YWx1ZXMsIG9uZSBPYnNlcnZhYmxlIGFmdGVyIHRoZSBvdGhlci48L3NwYW4+XG4gKlxuICogPGltZyBzcmM9XCIuL2ltZy9jb25jYXQucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gKlxuICogSm9pbnMgdGhpcyBPYnNlcnZhYmxlIHdpdGggbXVsdGlwbGUgb3RoZXIgT2JzZXJ2YWJsZXMgYnkgc3Vic2NyaWJpbmcgdG8gdGhlbVxuICogb25lIGF0IGEgdGltZSwgc3RhcnRpbmcgd2l0aCB0aGUgc291cmNlLCBhbmQgbWVyZ2luZyB0aGVpciByZXN1bHRzIGludG8gdGhlXG4gKiBvdXRwdXQgT2JzZXJ2YWJsZS4gV2lsbCB3YWl0IGZvciBlYWNoIE9ic2VydmFibGUgdG8gY29tcGxldGUgYmVmb3JlIG1vdmluZ1xuICogb24gdG8gdGhlIG5leHQuXG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+Q29uY2F0ZW5hdGUgYSB0aW1lciBjb3VudGluZyBmcm9tIDAgdG8gMyB3aXRoIGEgc3luY2hyb25vdXMgc2VxdWVuY2UgZnJvbSAxIHRvIDEwPC9jYXB0aW9uPlxuICogdmFyIHRpbWVyID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxMDAwKS50YWtlKDQpO1xuICogdmFyIHNlcXVlbmNlID0gUnguT2JzZXJ2YWJsZS5yYW5nZSgxLCAxMCk7XG4gKiB2YXIgcmVzdWx0ID0gdGltZXIuY29uY2F0KHNlcXVlbmNlKTtcbiAqIHJlc3VsdC5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+Q29uY2F0ZW5hdGUgMyBPYnNlcnZhYmxlczwvY2FwdGlvbj5cbiAqIHZhciB0aW1lcjEgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMDApLnRha2UoMTApO1xuICogdmFyIHRpbWVyMiA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMjAwMCkudGFrZSg2KTtcbiAqIHZhciB0aW1lcjMgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDUwMCkudGFrZSgxMCk7XG4gKiB2YXIgcmVzdWx0ID0gdGltZXIxLmNvbmNhdCh0aW1lcjIsIHRpbWVyMyk7XG4gKiByZXN1bHQuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICpcbiAqIEBzZWUge0BsaW5rIGNvbmNhdEFsbH1cbiAqIEBzZWUge0BsaW5rIGNvbmNhdE1hcH1cbiAqIEBzZWUge0BsaW5rIGNvbmNhdE1hcFRvfVxuICpcbiAqIEBwYXJhbSB7T2JzZXJ2YWJsZX0gb3RoZXIgQW4gaW5wdXQgT2JzZXJ2YWJsZSB0byBjb25jYXRlbmF0ZSBhZnRlciB0aGUgc291cmNlXG4gKiBPYnNlcnZhYmxlLiBNb3JlIHRoYW4gb25lIGlucHV0IE9ic2VydmFibGVzIG1heSBiZSBnaXZlbiBhcyBhcmd1bWVudC5cbiAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyPW51bGxdIEFuIG9wdGlvbmFsIFNjaGVkdWxlciB0byBzY2hlZHVsZSBlYWNoXG4gKiBPYnNlcnZhYmxlIHN1YnNjcmlwdGlvbiBvbi5cbiAqIEByZXR1cm4ge09ic2VydmFibGV9IEFsbCB2YWx1ZXMgb2YgZWFjaCBwYXNzZWQgT2JzZXJ2YWJsZSBtZXJnZWQgaW50byBhXG4gKiBzaW5nbGUgT2JzZXJ2YWJsZSwgaW4gb3JkZXIsIGluIHNlcmlhbCBmYXNoaW9uLlxuICogQG1ldGhvZCBjb25jYXRcbiAqIEBvd25lciBPYnNlcnZhYmxlXG4gKi9cbmZ1bmN0aW9uIGNvbmNhdCgpIHtcbiAgICB2YXIgb2JzZXJ2YWJsZXMgPSBbXTtcbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICBvYnNlcnZhYmxlc1tfaSAtIDBdID0gYXJndW1lbnRzW19pXTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbmNhdFN0YXRpYy5hcHBseSh2b2lkIDAsIFt0aGlzXS5jb25jYXQob2JzZXJ2YWJsZXMpKTtcbn1cbmV4cG9ydHMuY29uY2F0ID0gY29uY2F0O1xuLyogdHNsaW50OmVuYWJsZTptYXgtbGluZS1sZW5ndGggKi9cbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgT2JzZXJ2YWJsZSB3aGljaCBzZXF1ZW50aWFsbHkgZW1pdHMgYWxsIHZhbHVlcyBmcm9tIGV2ZXJ5XG4gKiBnaXZlbiBpbnB1dCBPYnNlcnZhYmxlIGFmdGVyIHRoZSBjdXJyZW50IE9ic2VydmFibGUuXG4gKlxuICogPHNwYW4gY2xhc3M9XCJpbmZvcm1hbFwiPkNvbmNhdGVuYXRlcyBtdWx0aXBsZSBPYnNlcnZhYmxlcyB0b2dldGhlciBieVxuICogc2VxdWVudGlhbGx5IGVtaXR0aW5nIHRoZWlyIHZhbHVlcywgb25lIE9ic2VydmFibGUgYWZ0ZXIgdGhlIG90aGVyLjwvc3Bhbj5cbiAqXG4gKiA8aW1nIHNyYz1cIi4vaW1nL2NvbmNhdC5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAqXG4gKiBKb2lucyBtdWx0aXBsZSBPYnNlcnZhYmxlcyB0b2dldGhlciBieSBzdWJzY3JpYmluZyB0byB0aGVtIG9uZSBhdCBhIHRpbWUgYW5kXG4gKiBtZXJnaW5nIHRoZWlyIHJlc3VsdHMgaW50byB0aGUgb3V0cHV0IE9ic2VydmFibGUuIFdpbGwgd2FpdCBmb3IgZWFjaFxuICogT2JzZXJ2YWJsZSB0byBjb21wbGV0ZSBiZWZvcmUgbW92aW5nIG9uIHRvIHRoZSBuZXh0LlxuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPkNvbmNhdGVuYXRlIGEgdGltZXIgY291bnRpbmcgZnJvbSAwIHRvIDMgd2l0aCBhIHN5bmNocm9ub3VzIHNlcXVlbmNlIGZyb20gMSB0byAxMDwvY2FwdGlvbj5cbiAqIHZhciB0aW1lciA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwMCkudGFrZSg0KTtcbiAqIHZhciBzZXF1ZW5jZSA9IFJ4Lk9ic2VydmFibGUucmFuZ2UoMSwgMTApO1xuICogdmFyIHJlc3VsdCA9IFJ4Lk9ic2VydmFibGUuY29uY2F0KHRpbWVyLCBzZXF1ZW5jZSk7XG4gKiByZXN1bHQuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPkNvbmNhdGVuYXRlIDMgT2JzZXJ2YWJsZXM8L2NhcHRpb24+XG4gKiB2YXIgdGltZXIxID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxMDAwKS50YWtlKDEwKTtcbiAqIHZhciB0aW1lcjIgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDIwMDApLnRha2UoNik7XG4gKiB2YXIgdGltZXIzID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCg1MDApLnRha2UoMTApO1xuICogdmFyIHJlc3VsdCA9IFJ4Lk9ic2VydmFibGUuY29uY2F0KHRpbWVyMSwgdGltZXIyLCB0aW1lcjMpO1xuICogcmVzdWx0LnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAc2VlIHtAbGluayBjb25jYXRBbGx9XG4gKiBAc2VlIHtAbGluayBjb25jYXRNYXB9XG4gKiBAc2VlIHtAbGluayBjb25jYXRNYXBUb31cbiAqXG4gKiBAcGFyYW0ge09ic2VydmFibGV9IGlucHV0MSBBbiBpbnB1dCBPYnNlcnZhYmxlIHRvIGNvbmNhdGVuYXRlIHdpdGggb3RoZXJzLlxuICogQHBhcmFtIHtPYnNlcnZhYmxlfSBpbnB1dDIgQW4gaW5wdXQgT2JzZXJ2YWJsZSB0byBjb25jYXRlbmF0ZSB3aXRoIG90aGVycy5cbiAqIE1vcmUgdGhhbiBvbmUgaW5wdXQgT2JzZXJ2YWJsZXMgbWF5IGJlIGdpdmVuIGFzIGFyZ3VtZW50LlxuICogQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXI9bnVsbF0gQW4gb3B0aW9uYWwgU2NoZWR1bGVyIHRvIHNjaGVkdWxlIGVhY2hcbiAqIE9ic2VydmFibGUgc3Vic2NyaXB0aW9uIG9uLlxuICogQHJldHVybiB7T2JzZXJ2YWJsZX0gQWxsIHZhbHVlcyBvZiBlYWNoIHBhc3NlZCBPYnNlcnZhYmxlIG1lcmdlZCBpbnRvIGFcbiAqIHNpbmdsZSBPYnNlcnZhYmxlLCBpbiBvcmRlciwgaW4gc2VyaWFsIGZhc2hpb24uXG4gKiBAc3RhdGljIHRydWVcbiAqIEBuYW1lIGNvbmNhdFxuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gY29uY2F0U3RhdGljKCkge1xuICAgIHZhciBvYnNlcnZhYmxlcyA9IFtdO1xuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgIG9ic2VydmFibGVzW19pIC0gMF0gPSBhcmd1bWVudHNbX2ldO1xuICAgIH1cbiAgICB2YXIgc2NoZWR1bGVyID0gbnVsbDtcbiAgICB2YXIgYXJncyA9IG9ic2VydmFibGVzO1xuICAgIGlmIChpc1NjaGVkdWxlcl8xLmlzU2NoZWR1bGVyKGFyZ3Nbb2JzZXJ2YWJsZXMubGVuZ3RoIC0gMV0pKSB7XG4gICAgICAgIHNjaGVkdWxlciA9IGFyZ3MucG9wKCk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgQXJyYXlPYnNlcnZhYmxlXzEuQXJyYXlPYnNlcnZhYmxlKG9ic2VydmFibGVzLCBzY2hlZHVsZXIpLmxpZnQobmV3IG1lcmdlQWxsXzEuTWVyZ2VBbGxPcGVyYXRvcigxKSk7XG59XG5leHBvcnRzLmNvbmNhdFN0YXRpYyA9IGNvbmNhdFN0YXRpYztcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvbmNhdC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIFN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4uL1N1YnNjcmliZXInKTtcbi8qKlxuICogRmlsdGVyIGl0ZW1zIGVtaXR0ZWQgYnkgdGhlIHNvdXJjZSBPYnNlcnZhYmxlIGJ5IG9ubHkgZW1pdHRpbmcgdGhvc2UgdGhhdFxuICogc2F0aXNmeSBhIHNwZWNpZmllZCBwcmVkaWNhdGUuXG4gKlxuICogPHNwYW4gY2xhc3M9XCJpbmZvcm1hbFwiPkxpa2VcbiAqIFtBcnJheS5wcm90b3R5cGUuZmlsdGVyKCldKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L2ZpbHRlciksXG4gKiBpdCBvbmx5IGVtaXRzIGEgdmFsdWUgZnJvbSB0aGUgc291cmNlIGlmIGl0IHBhc3NlcyBhIGNyaXRlcmlvbiBmdW5jdGlvbi48L3NwYW4+XG4gKlxuICogPGltZyBzcmM9XCIuL2ltZy9maWx0ZXIucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gKlxuICogU2ltaWxhciB0byB0aGUgd2VsbC1rbm93biBgQXJyYXkucHJvdG90eXBlLmZpbHRlcmAgbWV0aG9kLCB0aGlzIG9wZXJhdG9yXG4gKiB0YWtlcyB2YWx1ZXMgZnJvbSB0aGUgc291cmNlIE9ic2VydmFibGUsIHBhc3NlcyB0aGVtIHRocm91Z2ggYSBgcHJlZGljYXRlYFxuICogZnVuY3Rpb24gYW5kIG9ubHkgZW1pdHMgdGhvc2UgdmFsdWVzIHRoYXQgeWllbGRlZCBgdHJ1ZWAuXG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+RW1pdCBvbmx5IGNsaWNrIGV2ZW50cyB3aG9zZSB0YXJnZXQgd2FzIGEgRElWIGVsZW1lbnQ8L2NhcHRpb24+XG4gKiB2YXIgY2xpY2tzID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoZG9jdW1lbnQsICdjbGljaycpO1xuICogdmFyIGNsaWNrc09uRGl2cyA9IGNsaWNrcy5maWx0ZXIoZXYgPT4gZXYudGFyZ2V0LnRhZ05hbWUgPT09ICdESVYnKTtcbiAqIGNsaWNrc09uRGl2cy5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gKlxuICogQHNlZSB7QGxpbmsgZGlzdGluY3R9XG4gKiBAc2VlIHtAbGluayBkaXN0aW5jdEtleX1cbiAqIEBzZWUge0BsaW5rIGRpc3RpbmN0VW50aWxDaGFuZ2VkfVxuICogQHNlZSB7QGxpbmsgZGlzdGluY3RVbnRpbEtleUNoYW5nZWR9XG4gKiBAc2VlIHtAbGluayBpZ25vcmVFbGVtZW50c31cbiAqIEBzZWUge0BsaW5rIHBhcnRpdGlvbn1cbiAqIEBzZWUge0BsaW5rIHNraXB9XG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbih2YWx1ZTogVCwgaW5kZXg6IG51bWJlcik6IGJvb2xlYW59IHByZWRpY2F0ZSBBIGZ1bmN0aW9uIHRoYXRcbiAqIGV2YWx1YXRlcyBlYWNoIHZhbHVlIGVtaXR0ZWQgYnkgdGhlIHNvdXJjZSBPYnNlcnZhYmxlLiBJZiBpdCByZXR1cm5zIGB0cnVlYCxcbiAqIHRoZSB2YWx1ZSBpcyBlbWl0dGVkLCBpZiBgZmFsc2VgIHRoZSB2YWx1ZSBpcyBub3QgcGFzc2VkIHRvIHRoZSBvdXRwdXRcbiAqIE9ic2VydmFibGUuIFRoZSBgaW5kZXhgIHBhcmFtZXRlciBpcyB0aGUgbnVtYmVyIGBpYCBmb3IgdGhlIGktdGggc291cmNlXG4gKiBlbWlzc2lvbiB0aGF0IGhhcyBoYXBwZW5lZCBzaW5jZSB0aGUgc3Vic2NyaXB0aW9uLCBzdGFydGluZyBmcm9tIHRoZSBudW1iZXJcbiAqIGAwYC5cbiAqIEBwYXJhbSB7YW55fSBbdGhpc0FyZ10gQW4gb3B0aW9uYWwgYXJndW1lbnQgdG8gZGV0ZXJtaW5lIHRoZSB2YWx1ZSBvZiBgdGhpc2BcbiAqIGluIHRoZSBgcHJlZGljYXRlYCBmdW5jdGlvbi5cbiAqIEByZXR1cm4ge09ic2VydmFibGV9IEFuIE9ic2VydmFibGUgb2YgdmFsdWVzIGZyb20gdGhlIHNvdXJjZSB0aGF0IHdlcmVcbiAqIGFsbG93ZWQgYnkgdGhlIGBwcmVkaWNhdGVgIGZ1bmN0aW9uLlxuICogQG1ldGhvZCBmaWx0ZXJcbiAqIEBvd25lciBPYnNlcnZhYmxlXG4gKi9cbmZ1bmN0aW9uIGZpbHRlcihwcmVkaWNhdGUsIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gdGhpcy5saWZ0KG5ldyBGaWx0ZXJPcGVyYXRvcihwcmVkaWNhdGUsIHRoaXNBcmcpKTtcbn1cbmV4cG9ydHMuZmlsdGVyID0gZmlsdGVyO1xudmFyIEZpbHRlck9wZXJhdG9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBGaWx0ZXJPcGVyYXRvcihwcmVkaWNhdGUsIHRoaXNBcmcpIHtcbiAgICAgICAgdGhpcy5wcmVkaWNhdGUgPSBwcmVkaWNhdGU7XG4gICAgICAgIHRoaXMudGhpc0FyZyA9IHRoaXNBcmc7XG4gICAgfVxuICAgIEZpbHRlck9wZXJhdG9yLnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gKHN1YnNjcmliZXIsIHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gc291cmNlLl9zdWJzY3JpYmUobmV3IEZpbHRlclN1YnNjcmliZXIoc3Vic2NyaWJlciwgdGhpcy5wcmVkaWNhdGUsIHRoaXMudGhpc0FyZykpO1xuICAgIH07XG4gICAgcmV0dXJuIEZpbHRlck9wZXJhdG9yO1xufSgpKTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgRmlsdGVyU3Vic2NyaWJlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEZpbHRlclN1YnNjcmliZXIsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gRmlsdGVyU3Vic2NyaWJlcihkZXN0aW5hdGlvbiwgcHJlZGljYXRlLCB0aGlzQXJnKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlc3RpbmF0aW9uKTtcbiAgICAgICAgdGhpcy5wcmVkaWNhdGUgPSBwcmVkaWNhdGU7XG4gICAgICAgIHRoaXMudGhpc0FyZyA9IHRoaXNBcmc7XG4gICAgICAgIHRoaXMuY291bnQgPSAwO1xuICAgICAgICB0aGlzLnByZWRpY2F0ZSA9IHByZWRpY2F0ZTtcbiAgICB9XG4gICAgLy8gdGhlIHRyeSBjYXRjaCBibG9jayBiZWxvdyBpcyBsZWZ0IHNwZWNpZmljYWxseSBmb3JcbiAgICAvLyBvcHRpbWl6YXRpb24gYW5kIHBlcmYgcmVhc29ucy4gYSB0cnlDYXRjaGVyIGlzIG5vdCBuZWNlc3NhcnkgaGVyZS5cbiAgICBGaWx0ZXJTdWJzY3JpYmVyLnByb3RvdHlwZS5fbmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5wcmVkaWNhdGUuY2FsbCh0aGlzLnRoaXNBcmcsIHZhbHVlLCB0aGlzLmNvdW50KyspO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24uZXJyb3IoZXJyKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLm5leHQodmFsdWUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gRmlsdGVyU3Vic2NyaWJlcjtcbn0oU3Vic2NyaWJlcl8xLlN1YnNjcmliZXIpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWZpbHRlci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIFN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4uL1N1YnNjcmliZXInKTtcbi8qKlxuICogQXBwbGllcyBhIGdpdmVuIGBwcm9qZWN0YCBmdW5jdGlvbiB0byBlYWNoIHZhbHVlIGVtaXR0ZWQgYnkgdGhlIHNvdXJjZVxuICogT2JzZXJ2YWJsZSwgYW5kIGVtaXRzIHRoZSByZXN1bHRpbmcgdmFsdWVzIGFzIGFuIE9ic2VydmFibGUuXG4gKlxuICogPHNwYW4gY2xhc3M9XCJpbmZvcm1hbFwiPkxpa2UgW0FycmF5LnByb3RvdHlwZS5tYXAoKV0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvbWFwKSxcbiAqIGl0IHBhc3NlcyBlYWNoIHNvdXJjZSB2YWx1ZSB0aHJvdWdoIGEgdHJhbnNmb3JtYXRpb24gZnVuY3Rpb24gdG8gZ2V0XG4gKiBjb3JyZXNwb25kaW5nIG91dHB1dCB2YWx1ZXMuPC9zcGFuPlxuICpcbiAqIDxpbWcgc3JjPVwiLi9pbWcvbWFwLnBuZ1wiIHdpZHRoPVwiMTAwJVwiPlxuICpcbiAqIFNpbWlsYXIgdG8gdGhlIHdlbGwga25vd24gYEFycmF5LnByb3RvdHlwZS5tYXBgIGZ1bmN0aW9uLCB0aGlzIG9wZXJhdG9yXG4gKiBhcHBsaWVzIGEgcHJvamVjdGlvbiB0byBlYWNoIHZhbHVlIGFuZCBlbWl0cyB0aGF0IHByb2plY3Rpb24gaW4gdGhlIG91dHB1dFxuICogT2JzZXJ2YWJsZS5cbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5NYXAgZXZlcnkgZXZlcnkgY2xpY2sgdG8gdGhlIGNsaWVudFggcG9zaXRpb24gb2YgdGhhdCBjbGljazwvY2FwdGlvbj5cbiAqIHZhciBjbGlja3MgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChkb2N1bWVudCwgJ2NsaWNrJyk7XG4gKiB2YXIgcG9zaXRpb25zID0gY2xpY2tzLm1hcChldiA9PiBldi5jbGllbnRYKTtcbiAqIHBvc2l0aW9ucy5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gKlxuICogQHNlZSB7QGxpbmsgbWFwVG99XG4gKiBAc2VlIHtAbGluayBwbHVja31cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHZhbHVlOiBULCBpbmRleDogbnVtYmVyKTogUn0gcHJvamVjdCBUaGUgZnVuY3Rpb24gdG8gYXBwbHlcbiAqIHRvIGVhY2ggYHZhbHVlYCBlbWl0dGVkIGJ5IHRoZSBzb3VyY2UgT2JzZXJ2YWJsZS4gVGhlIGBpbmRleGAgcGFyYW1ldGVyIGlzXG4gKiB0aGUgbnVtYmVyIGBpYCBmb3IgdGhlIGktdGggZW1pc3Npb24gdGhhdCBoYXMgaGFwcGVuZWQgc2luY2UgdGhlXG4gKiBzdWJzY3JpcHRpb24sIHN0YXJ0aW5nIGZyb20gdGhlIG51bWJlciBgMGAuXG4gKiBAcGFyYW0ge2FueX0gW3RoaXNBcmddIEFuIG9wdGlvbmFsIGFyZ3VtZW50IHRvIGRlZmluZSB3aGF0IGB0aGlzYCBpcyBpbiB0aGVcbiAqIGBwcm9qZWN0YCBmdW5jdGlvbi5cbiAqIEByZXR1cm4ge09ic2VydmFibGU8Uj59IEFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyB0aGUgdmFsdWVzIGZyb20gdGhlIHNvdXJjZVxuICogT2JzZXJ2YWJsZSB0cmFuc2Zvcm1lZCBieSB0aGUgZ2l2ZW4gYHByb2plY3RgIGZ1bmN0aW9uLlxuICogQG1ldGhvZCBtYXBcbiAqIEBvd25lciBPYnNlcnZhYmxlXG4gKi9cbmZ1bmN0aW9uIG1hcChwcm9qZWN0LCB0aGlzQXJnKSB7XG4gICAgaWYgKHR5cGVvZiBwcm9qZWN0ICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FyZ3VtZW50IGlzIG5vdCBhIGZ1bmN0aW9uLiBBcmUgeW91IGxvb2tpbmcgZm9yIGBtYXBUbygpYD8nKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubGlmdChuZXcgTWFwT3BlcmF0b3IocHJvamVjdCwgdGhpc0FyZykpO1xufVxuZXhwb3J0cy5tYXAgPSBtYXA7XG52YXIgTWFwT3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1hcE9wZXJhdG9yKHByb2plY3QsIHRoaXNBcmcpIHtcbiAgICAgICAgdGhpcy5wcm9qZWN0ID0gcHJvamVjdDtcbiAgICAgICAgdGhpcy50aGlzQXJnID0gdGhpc0FyZztcbiAgICB9XG4gICAgTWFwT3BlcmF0b3IucHJvdG90eXBlLmNhbGwgPSBmdW5jdGlvbiAoc3Vic2NyaWJlciwgc291cmNlKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2UuX3N1YnNjcmliZShuZXcgTWFwU3Vic2NyaWJlcihzdWJzY3JpYmVyLCB0aGlzLnByb2plY3QsIHRoaXMudGhpc0FyZykpO1xuICAgIH07XG4gICAgcmV0dXJuIE1hcE9wZXJhdG9yO1xufSgpKTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgTWFwU3Vic2NyaWJlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1hcFN1YnNjcmliZXIsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTWFwU3Vic2NyaWJlcihkZXN0aW5hdGlvbiwgcHJvamVjdCwgdGhpc0FyZykge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZXN0aW5hdGlvbik7XG4gICAgICAgIHRoaXMucHJvamVjdCA9IHByb2plY3Q7XG4gICAgICAgIHRoaXMuY291bnQgPSAwO1xuICAgICAgICB0aGlzLnRoaXNBcmcgPSB0aGlzQXJnIHx8IHRoaXM7XG4gICAgfVxuICAgIC8vIE5PVEU6IFRoaXMgbG9va3MgdW5vcHRpbWl6ZWQsIGJ1dCBpdCdzIGFjdHVhbGx5IHB1cnBvc2VmdWxseSBOT1RcbiAgICAvLyB1c2luZyB0cnkvY2F0Y2ggb3B0aW1pemF0aW9ucy5cbiAgICBNYXBTdWJzY3JpYmVyLnByb3RvdHlwZS5fbmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5wcm9qZWN0LmNhbGwodGhpcy50aGlzQXJnLCB2YWx1ZSwgdGhpcy5jb3VudCsrKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmVycm9yKGVycik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5uZXh0KHJlc3VsdCk7XG4gICAgfTtcbiAgICByZXR1cm4gTWFwU3Vic2NyaWJlcjtcbn0oU3Vic2NyaWJlcl8xLlN1YnNjcmliZXIpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1hcC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIFN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4uL1N1YnNjcmliZXInKTtcbi8qKlxuICogRW1pdHMgdGhlIGdpdmVuIGNvbnN0YW50IHZhbHVlIG9uIHRoZSBvdXRwdXQgT2JzZXJ2YWJsZSBldmVyeSB0aW1lIHRoZSBzb3VyY2VcbiAqIE9ic2VydmFibGUgZW1pdHMgYSB2YWx1ZS5cbiAqXG4gKiA8c3BhbiBjbGFzcz1cImluZm9ybWFsXCI+TGlrZSB7QGxpbmsgbWFwfSwgYnV0IGl0IG1hcHMgZXZlcnkgc291cmNlIHZhbHVlIHRvXG4gKiB0aGUgc2FtZSBvdXRwdXQgdmFsdWUgZXZlcnkgdGltZS48L3NwYW4+XG4gKlxuICogPGltZyBzcmM9XCIuL2ltZy9tYXBUby5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAqXG4gKiBUYWtlcyBhIGNvbnN0YW50IGB2YWx1ZWAgYXMgYXJndW1lbnQsIGFuZCBlbWl0cyB0aGF0IHdoZW5ldmVyIHRoZSBzb3VyY2VcbiAqIE9ic2VydmFibGUgZW1pdHMgYSB2YWx1ZS4gSW4gb3RoZXIgd29yZHMsIGlnbm9yZXMgdGhlIGFjdHVhbCBzb3VyY2UgdmFsdWUsXG4gKiBhbmQgc2ltcGx5IHVzZXMgdGhlIGVtaXNzaW9uIG1vbWVudCB0byBrbm93IHdoZW4gdG8gZW1pdCB0aGUgZ2l2ZW4gYHZhbHVlYC5cbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5NYXAgZXZlcnkgZXZlcnkgY2xpY2sgdG8gdGhlIHN0cmluZyAnSGknPC9jYXB0aW9uPlxuICogdmFyIGNsaWNrcyA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGRvY3VtZW50LCAnY2xpY2snKTtcbiAqIHZhciBncmVldGluZ3MgPSBjbGlja3MubWFwVG8oJ0hpJyk7XG4gKiBncmVldGluZ3Muc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICpcbiAqIEBzZWUge0BsaW5rIG1hcH1cbiAqXG4gKiBAcGFyYW0ge2FueX0gdmFsdWUgVGhlIHZhbHVlIHRvIG1hcCBlYWNoIHNvdXJjZSB2YWx1ZSB0by5cbiAqIEByZXR1cm4ge09ic2VydmFibGV9IEFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyB0aGUgZ2l2ZW4gYHZhbHVlYCBldmVyeSB0aW1lXG4gKiB0aGUgc291cmNlIE9ic2VydmFibGUgZW1pdHMgc29tZXRoaW5nLlxuICogQG1ldGhvZCBtYXBUb1xuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gbWFwVG8odmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5saWZ0KG5ldyBNYXBUb09wZXJhdG9yKHZhbHVlKSk7XG59XG5leHBvcnRzLm1hcFRvID0gbWFwVG87XG52YXIgTWFwVG9PcGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTWFwVG9PcGVyYXRvcih2YWx1ZSkge1xuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgfVxuICAgIE1hcFRvT3BlcmF0b3IucHJvdG90eXBlLmNhbGwgPSBmdW5jdGlvbiAoc3Vic2NyaWJlciwgc291cmNlKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2UuX3N1YnNjcmliZShuZXcgTWFwVG9TdWJzY3JpYmVyKHN1YnNjcmliZXIsIHRoaXMudmFsdWUpKTtcbiAgICB9O1xuICAgIHJldHVybiBNYXBUb09wZXJhdG9yO1xufSgpKTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgTWFwVG9TdWJzY3JpYmVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTWFwVG9TdWJzY3JpYmVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1hcFRvU3Vic2NyaWJlcihkZXN0aW5hdGlvbiwgdmFsdWUpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVzdGluYXRpb24pO1xuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgfVxuICAgIE1hcFRvU3Vic2NyaWJlci5wcm90b3R5cGUuX25leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLm5leHQodGhpcy52YWx1ZSk7XG4gICAgfTtcbiAgICByZXR1cm4gTWFwVG9TdWJzY3JpYmVyO1xufShTdWJzY3JpYmVyXzEuU3Vic2NyaWJlcikpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWFwVG8uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgQXJyYXlPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi9vYnNlcnZhYmxlL0FycmF5T2JzZXJ2YWJsZScpO1xudmFyIG1lcmdlQWxsXzEgPSByZXF1aXJlKCcuL21lcmdlQWxsJyk7XG52YXIgaXNTY2hlZHVsZXJfMSA9IHJlcXVpcmUoJy4uL3V0aWwvaXNTY2hlZHVsZXInKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgT2JzZXJ2YWJsZSB3aGljaCBjb25jdXJyZW50bHkgZW1pdHMgYWxsIHZhbHVlcyBmcm9tIGV2ZXJ5XG4gKiBnaXZlbiBpbnB1dCBPYnNlcnZhYmxlLlxuICpcbiAqIDxzcGFuIGNsYXNzPVwiaW5mb3JtYWxcIj5GbGF0dGVucyBtdWx0aXBsZSBPYnNlcnZhYmxlcyB0b2dldGhlciBieSBibGVuZGluZ1xuICogdGhlaXIgdmFsdWVzIGludG8gb25lIE9ic2VydmFibGUuPC9zcGFuPlxuICpcbiAqIDxpbWcgc3JjPVwiLi9pbWcvbWVyZ2UucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gKlxuICogYG1lcmdlYCBzdWJzY3JpYmVzIHRvIGVhY2ggZ2l2ZW4gaW5wdXQgT2JzZXJ2YWJsZSAoZWl0aGVyIHRoZSBzb3VyY2Ugb3IgYW5cbiAqIE9ic2VydmFibGUgZ2l2ZW4gYXMgYXJndW1lbnQpLCBhbmQgc2ltcGx5IGZvcndhcmRzICh3aXRob3V0IGRvaW5nIGFueVxuICogdHJhbnNmb3JtYXRpb24pIGFsbCB0aGUgdmFsdWVzIGZyb20gYWxsIHRoZSBpbnB1dCBPYnNlcnZhYmxlcyB0byB0aGUgb3V0cHV0XG4gKiBPYnNlcnZhYmxlLiBUaGUgb3V0cHV0IE9ic2VydmFibGUgb25seSBjb21wbGV0ZXMgb25jZSBhbGwgaW5wdXQgT2JzZXJ2YWJsZXNcbiAqIGhhdmUgY29tcGxldGVkLiBBbnkgZXJyb3IgZGVsaXZlcmVkIGJ5IGFuIGlucHV0IE9ic2VydmFibGUgd2lsbCBiZSBpbW1lZGlhdGVseVxuICogZW1pdHRlZCBvbiB0aGUgb3V0cHV0IE9ic2VydmFibGUuXG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+TWVyZ2UgdG9nZXRoZXIgdHdvIE9ic2VydmFibGVzOiAxcyBpbnRlcnZhbCBhbmQgY2xpY2tzPC9jYXB0aW9uPlxuICogdmFyIGNsaWNrcyA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGRvY3VtZW50LCAnY2xpY2snKTtcbiAqIHZhciB0aW1lciA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwMCk7XG4gKiB2YXIgY2xpY2tzT3JUaW1lciA9IGNsaWNrcy5tZXJnZSh0aW1lcik7XG4gKiBjbGlja3NPclRpbWVyLnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5NZXJnZSB0b2dldGhlciAzIE9ic2VydmFibGVzLCBidXQgb25seSAyIHJ1biBjb25jdXJyZW50bHk8L2NhcHRpb24+XG4gKiB2YXIgdGltZXIxID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxMDAwKS50YWtlKDEwKTtcbiAqIHZhciB0aW1lcjIgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDIwMDApLnRha2UoNik7XG4gKiB2YXIgdGltZXIzID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCg1MDApLnRha2UoMTApO1xuICogdmFyIGNvbmN1cnJlbnQgPSAyOyAvLyB0aGUgYXJndW1lbnRcbiAqIHZhciBtZXJnZWQgPSB0aW1lcjEubWVyZ2UodGltZXIyLCB0aW1lcjMsIGNvbmN1cnJlbnQpO1xuICogbWVyZ2VkLnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAc2VlIHtAbGluayBtZXJnZUFsbH1cbiAqIEBzZWUge0BsaW5rIG1lcmdlTWFwfVxuICogQHNlZSB7QGxpbmsgbWVyZ2VNYXBUb31cbiAqIEBzZWUge0BsaW5rIG1lcmdlU2Nhbn1cbiAqXG4gKiBAcGFyYW0ge09ic2VydmFibGV9IG90aGVyIEFuIGlucHV0IE9ic2VydmFibGUgdG8gbWVyZ2Ugd2l0aCB0aGUgc291cmNlXG4gKiBPYnNlcnZhYmxlLiBNb3JlIHRoYW4gb25lIGlucHV0IE9ic2VydmFibGVzIG1heSBiZSBnaXZlbiBhcyBhcmd1bWVudC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBbY29uY3VycmVudD1OdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFldIE1heGltdW0gbnVtYmVyIG9mIGlucHV0XG4gKiBPYnNlcnZhYmxlcyBiZWluZyBzdWJzY3JpYmVkIHRvIGNvbmN1cnJlbnRseS5cbiAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyPW51bGxdIFRoZSBTY2hlZHVsZXIgdG8gdXNlIGZvciBtYW5hZ2luZ1xuICogY29uY3VycmVuY3kgb2YgaW5wdXQgT2JzZXJ2YWJsZXMuXG4gKiBAcmV0dXJuIHtPYnNlcnZhYmxlfSBhbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgaXRlbXMgdGhhdCBhcmUgdGhlIHJlc3VsdCBvZlxuICogZXZlcnkgaW5wdXQgT2JzZXJ2YWJsZS5cbiAqIEBtZXRob2QgbWVyZ2VcbiAqIEBvd25lciBPYnNlcnZhYmxlXG4gKi9cbmZ1bmN0aW9uIG1lcmdlKCkge1xuICAgIHZhciBvYnNlcnZhYmxlcyA9IFtdO1xuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgIG9ic2VydmFibGVzW19pIC0gMF0gPSBhcmd1bWVudHNbX2ldO1xuICAgIH1cbiAgICBvYnNlcnZhYmxlcy51bnNoaWZ0KHRoaXMpO1xuICAgIHJldHVybiBtZXJnZVN0YXRpYy5hcHBseSh0aGlzLCBvYnNlcnZhYmxlcyk7XG59XG5leHBvcnRzLm1lcmdlID0gbWVyZ2U7XG4vKiB0c2xpbnQ6ZW5hYmxlOm1heC1saW5lLWxlbmd0aCAqL1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBPYnNlcnZhYmxlIHdoaWNoIGNvbmN1cnJlbnRseSBlbWl0cyBhbGwgdmFsdWVzIGZyb20gZXZlcnlcbiAqIGdpdmVuIGlucHV0IE9ic2VydmFibGUuXG4gKlxuICogPHNwYW4gY2xhc3M9XCJpbmZvcm1hbFwiPkZsYXR0ZW5zIG11bHRpcGxlIE9ic2VydmFibGVzIHRvZ2V0aGVyIGJ5IGJsZW5kaW5nXG4gKiB0aGVpciB2YWx1ZXMgaW50byBvbmUgT2JzZXJ2YWJsZS48L3NwYW4+XG4gKlxuICogPGltZyBzcmM9XCIuL2ltZy9tZXJnZS5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAqXG4gKiBgbWVyZ2VgIHN1YnNjcmliZXMgdG8gZWFjaCBnaXZlbiBpbnB1dCBPYnNlcnZhYmxlIChhcyBhcmd1bWVudHMpLCBhbmQgc2ltcGx5XG4gKiBmb3J3YXJkcyAod2l0aG91dCBkb2luZyBhbnkgdHJhbnNmb3JtYXRpb24pIGFsbCB0aGUgdmFsdWVzIGZyb20gYWxsIHRoZSBpbnB1dFxuICogT2JzZXJ2YWJsZXMgdG8gdGhlIG91dHB1dCBPYnNlcnZhYmxlLiBUaGUgb3V0cHV0IE9ic2VydmFibGUgb25seSBjb21wbGV0ZXNcbiAqIG9uY2UgYWxsIGlucHV0IE9ic2VydmFibGVzIGhhdmUgY29tcGxldGVkLiBBbnkgZXJyb3IgZGVsaXZlcmVkIGJ5IGFuIGlucHV0XG4gKiBPYnNlcnZhYmxlIHdpbGwgYmUgaW1tZWRpYXRlbHkgZW1pdHRlZCBvbiB0aGUgb3V0cHV0IE9ic2VydmFibGUuXG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+TWVyZ2UgdG9nZXRoZXIgdHdvIE9ic2VydmFibGVzOiAxcyBpbnRlcnZhbCBhbmQgY2xpY2tzPC9jYXB0aW9uPlxuICogdmFyIGNsaWNrcyA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGRvY3VtZW50LCAnY2xpY2snKTtcbiAqIHZhciB0aW1lciA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwMCk7XG4gKiB2YXIgY2xpY2tzT3JUaW1lciA9IFJ4Lk9ic2VydmFibGUubWVyZ2UoY2xpY2tzLCB0aW1lcik7XG4gKiBjbGlja3NPclRpbWVyLnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5NZXJnZSB0b2dldGhlciAzIE9ic2VydmFibGVzLCBidXQgb25seSAyIHJ1biBjb25jdXJyZW50bHk8L2NhcHRpb24+XG4gKiB2YXIgdGltZXIxID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxMDAwKS50YWtlKDEwKTtcbiAqIHZhciB0aW1lcjIgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDIwMDApLnRha2UoNik7XG4gKiB2YXIgdGltZXIzID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCg1MDApLnRha2UoMTApO1xuICogdmFyIGNvbmN1cnJlbnQgPSAyOyAvLyB0aGUgYXJndW1lbnRcbiAqIHZhciBtZXJnZWQgPSBSeC5PYnNlcnZhYmxlLm1lcmdlKHRpbWVyMSwgdGltZXIyLCB0aW1lcjMsIGNvbmN1cnJlbnQpO1xuICogbWVyZ2VkLnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAc2VlIHtAbGluayBtZXJnZUFsbH1cbiAqIEBzZWUge0BsaW5rIG1lcmdlTWFwfVxuICogQHNlZSB7QGxpbmsgbWVyZ2VNYXBUb31cbiAqIEBzZWUge0BsaW5rIG1lcmdlU2Nhbn1cbiAqXG4gKiBAcGFyYW0ge09ic2VydmFibGV9IGlucHV0MSBBbiBpbnB1dCBPYnNlcnZhYmxlIHRvIG1lcmdlIHdpdGggb3RoZXJzLlxuICogQHBhcmFtIHtPYnNlcnZhYmxlfSBpbnB1dDIgQW4gaW5wdXQgT2JzZXJ2YWJsZSB0byBtZXJnZSB3aXRoIG90aGVycy5cbiAqIEBwYXJhbSB7bnVtYmVyfSBbY29uY3VycmVudD1OdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFldIE1heGltdW0gbnVtYmVyIG9mIGlucHV0XG4gKiBPYnNlcnZhYmxlcyBiZWluZyBzdWJzY3JpYmVkIHRvIGNvbmN1cnJlbnRseS5cbiAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyPW51bGxdIFRoZSBTY2hlZHVsZXIgdG8gdXNlIGZvciBtYW5hZ2luZ1xuICogY29uY3VycmVuY3kgb2YgaW5wdXQgT2JzZXJ2YWJsZXMuXG4gKiBAcmV0dXJuIHtPYnNlcnZhYmxlfSBhbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgaXRlbXMgdGhhdCBhcmUgdGhlIHJlc3VsdCBvZlxuICogZXZlcnkgaW5wdXQgT2JzZXJ2YWJsZS5cbiAqIEBzdGF0aWMgdHJ1ZVxuICogQG5hbWUgbWVyZ2VcbiAqIEBvd25lciBPYnNlcnZhYmxlXG4gKi9cbmZ1bmN0aW9uIG1lcmdlU3RhdGljKCkge1xuICAgIHZhciBvYnNlcnZhYmxlcyA9IFtdO1xuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgIG9ic2VydmFibGVzW19pIC0gMF0gPSBhcmd1bWVudHNbX2ldO1xuICAgIH1cbiAgICB2YXIgY29uY3VycmVudCA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbiAgICB2YXIgc2NoZWR1bGVyID0gbnVsbDtcbiAgICB2YXIgbGFzdCA9IG9ic2VydmFibGVzW29ic2VydmFibGVzLmxlbmd0aCAtIDFdO1xuICAgIGlmIChpc1NjaGVkdWxlcl8xLmlzU2NoZWR1bGVyKGxhc3QpKSB7XG4gICAgICAgIHNjaGVkdWxlciA9IG9ic2VydmFibGVzLnBvcCgpO1xuICAgICAgICBpZiAob2JzZXJ2YWJsZXMubGVuZ3RoID4gMSAmJiB0eXBlb2Ygb2JzZXJ2YWJsZXNbb2JzZXJ2YWJsZXMubGVuZ3RoIC0gMV0gPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBjb25jdXJyZW50ID0gb2JzZXJ2YWJsZXMucG9wKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGxhc3QgPT09ICdudW1iZXInKSB7XG4gICAgICAgIGNvbmN1cnJlbnQgPSBvYnNlcnZhYmxlcy5wb3AoKTtcbiAgICB9XG4gICAgaWYgKG9ic2VydmFibGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZXNbMF07XG4gICAgfVxuICAgIHJldHVybiBuZXcgQXJyYXlPYnNlcnZhYmxlXzEuQXJyYXlPYnNlcnZhYmxlKG9ic2VydmFibGVzLCBzY2hlZHVsZXIpLmxpZnQobmV3IG1lcmdlQWxsXzEuTWVyZ2VBbGxPcGVyYXRvcihjb25jdXJyZW50KSk7XG59XG5leHBvcnRzLm1lcmdlU3RhdGljID0gbWVyZ2VTdGF0aWM7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1tZXJnZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIE91dGVyU3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi4vT3V0ZXJTdWJzY3JpYmVyJyk7XG52YXIgc3Vic2NyaWJlVG9SZXN1bHRfMSA9IHJlcXVpcmUoJy4uL3V0aWwvc3Vic2NyaWJlVG9SZXN1bHQnKTtcbi8qKlxuICogQ29udmVydHMgYSBoaWdoZXItb3JkZXIgT2JzZXJ2YWJsZSBpbnRvIGEgZmlyc3Qtb3JkZXIgT2JzZXJ2YWJsZSB3aGljaFxuICogY29uY3VycmVudGx5IGRlbGl2ZXJzIGFsbCB2YWx1ZXMgdGhhdCBhcmUgZW1pdHRlZCBvbiB0aGUgaW5uZXIgT2JzZXJ2YWJsZXMuXG4gKlxuICogPHNwYW4gY2xhc3M9XCJpbmZvcm1hbFwiPkZsYXR0ZW5zIGFuIE9ic2VydmFibGUtb2YtT2JzZXJ2YWJsZXMuPC9zcGFuPlxuICpcbiAqIDxpbWcgc3JjPVwiLi9pbWcvbWVyZ2VBbGwucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gKlxuICogYG1lcmdlQWxsYCBzdWJzY3JpYmVzIHRvIGFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyBPYnNlcnZhYmxlcywgYWxzbyBrbm93biBhc1xuICogYSBoaWdoZXItb3JkZXIgT2JzZXJ2YWJsZS4gRWFjaCB0aW1lIGl0IG9ic2VydmVzIG9uZSBvZiB0aGVzZSBlbWl0dGVkIGlubmVyXG4gKiBPYnNlcnZhYmxlcywgaXQgc3Vic2NyaWJlcyB0byB0aGF0IGFuZCBkZWxpdmVycyBhbGwgdGhlIHZhbHVlcyBmcm9tIHRoZVxuICogaW5uZXIgT2JzZXJ2YWJsZSBvbiB0aGUgb3V0cHV0IE9ic2VydmFibGUuIFRoZSBvdXRwdXQgT2JzZXJ2YWJsZSBvbmx5XG4gKiBjb21wbGV0ZXMgb25jZSBhbGwgaW5uZXIgT2JzZXJ2YWJsZXMgaGF2ZSBjb21wbGV0ZWQuIEFueSBlcnJvciBkZWxpdmVyZWQgYnlcbiAqIGEgaW5uZXIgT2JzZXJ2YWJsZSB3aWxsIGJlIGltbWVkaWF0ZWx5IGVtaXR0ZWQgb24gdGhlIG91dHB1dCBPYnNlcnZhYmxlLlxuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPlNwYXduIGEgbmV3IGludGVydmFsIE9ic2VydmFibGUgZm9yIGVhY2ggY2xpY2sgZXZlbnQsIGFuZCBibGVuZCB0aGVpciBvdXRwdXRzIGFzIG9uZSBPYnNlcnZhYmxlPC9jYXB0aW9uPlxuICogdmFyIGNsaWNrcyA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGRvY3VtZW50LCAnY2xpY2snKTtcbiAqIHZhciBoaWdoZXJPcmRlciA9IGNsaWNrcy5tYXAoKGV2KSA9PiBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMDApKTtcbiAqIHZhciBmaXJzdE9yZGVyID0gaGlnaGVyT3JkZXIubWVyZ2VBbGwoKTtcbiAqIGZpcnN0T3JkZXIuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPkNvdW50IGZyb20gMCB0byA5IGV2ZXJ5IHNlY29uZCBmb3IgZWFjaCBjbGljaywgYnV0IG9ubHkgYWxsb3cgMiBjb25jdXJyZW50IHRpbWVyczwvY2FwdGlvbj5cbiAqIHZhciBjbGlja3MgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChkb2N1bWVudCwgJ2NsaWNrJyk7XG4gKiB2YXIgaGlnaGVyT3JkZXIgPSBjbGlja3MubWFwKChldikgPT4gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxMDAwKS50YWtlKDEwKSk7XG4gKiB2YXIgZmlyc3RPcmRlciA9IGhpZ2hlck9yZGVyLm1lcmdlQWxsKDIpO1xuICogZmlyc3RPcmRlci5zdWJzY3JpYmUoeCA9PiBjb25zb2xlLmxvZyh4KSk7XG4gKlxuICogQHNlZSB7QGxpbmsgY29tYmluZUFsbH1cbiAqIEBzZWUge0BsaW5rIGNvbmNhdEFsbH1cbiAqIEBzZWUge0BsaW5rIGV4aGF1c3R9XG4gKiBAc2VlIHtAbGluayBtZXJnZX1cbiAqIEBzZWUge0BsaW5rIG1lcmdlTWFwfVxuICogQHNlZSB7QGxpbmsgbWVyZ2VNYXBUb31cbiAqIEBzZWUge0BsaW5rIG1lcmdlU2Nhbn1cbiAqIEBzZWUge0BsaW5rIHN3aXRjaH1cbiAqIEBzZWUge0BsaW5rIHppcEFsbH1cbiAqXG4gKiBAcGFyYW0ge251bWJlcn0gW2NvbmN1cnJlbnQ9TnVtYmVyLlBPU0lUSVZFX0lORklOSVRZXSBNYXhpbXVtIG51bWJlciBvZiBpbm5lclxuICogT2JzZXJ2YWJsZXMgYmVpbmcgc3Vic2NyaWJlZCB0byBjb25jdXJyZW50bHkuXG4gKiBAcmV0dXJuIHtPYnNlcnZhYmxlfSBBbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgdmFsdWVzIGNvbWluZyBmcm9tIGFsbCB0aGVcbiAqIGlubmVyIE9ic2VydmFibGVzIGVtaXR0ZWQgYnkgdGhlIHNvdXJjZSBPYnNlcnZhYmxlLlxuICogQG1ldGhvZCBtZXJnZUFsbFxuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gbWVyZ2VBbGwoY29uY3VycmVudCkge1xuICAgIGlmIChjb25jdXJyZW50ID09PSB2b2lkIDApIHsgY29uY3VycmVudCA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTsgfVxuICAgIHJldHVybiB0aGlzLmxpZnQobmV3IE1lcmdlQWxsT3BlcmF0b3IoY29uY3VycmVudCkpO1xufVxuZXhwb3J0cy5tZXJnZUFsbCA9IG1lcmdlQWxsO1xudmFyIE1lcmdlQWxsT3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1lcmdlQWxsT3BlcmF0b3IoY29uY3VycmVudCkge1xuICAgICAgICB0aGlzLmNvbmN1cnJlbnQgPSBjb25jdXJyZW50O1xuICAgIH1cbiAgICBNZXJnZUFsbE9wZXJhdG9yLnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gKG9ic2VydmVyLCBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5fc3Vic2NyaWJlKG5ldyBNZXJnZUFsbFN1YnNjcmliZXIob2JzZXJ2ZXIsIHRoaXMuY29uY3VycmVudCkpO1xuICAgIH07XG4gICAgcmV0dXJuIE1lcmdlQWxsT3BlcmF0b3I7XG59KCkpO1xuZXhwb3J0cy5NZXJnZUFsbE9wZXJhdG9yID0gTWVyZ2VBbGxPcGVyYXRvcjtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgTWVyZ2VBbGxTdWJzY3JpYmVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTWVyZ2VBbGxTdWJzY3JpYmVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1lcmdlQWxsU3Vic2NyaWJlcihkZXN0aW5hdGlvbiwgY29uY3VycmVudCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZXN0aW5hdGlvbik7XG4gICAgICAgIHRoaXMuY29uY3VycmVudCA9IGNvbmN1cnJlbnQ7XG4gICAgICAgIHRoaXMuaGFzQ29tcGxldGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuYnVmZmVyID0gW107XG4gICAgICAgIHRoaXMuYWN0aXZlID0gMDtcbiAgICB9XG4gICAgTWVyZ2VBbGxTdWJzY3JpYmVyLnByb3RvdHlwZS5fbmV4dCA9IGZ1bmN0aW9uIChvYnNlcnZhYmxlKSB7XG4gICAgICAgIGlmICh0aGlzLmFjdGl2ZSA8IHRoaXMuY29uY3VycmVudCkge1xuICAgICAgICAgICAgdGhpcy5hY3RpdmUrKztcbiAgICAgICAgICAgIHRoaXMuYWRkKHN1YnNjcmliZVRvUmVzdWx0XzEuc3Vic2NyaWJlVG9SZXN1bHQodGhpcywgb2JzZXJ2YWJsZSkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5idWZmZXIucHVzaChvYnNlcnZhYmxlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTWVyZ2VBbGxTdWJzY3JpYmVyLnByb3RvdHlwZS5fY29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaGFzQ29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKHRoaXMuYWN0aXZlID09PSAwICYmIHRoaXMuYnVmZmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNZXJnZUFsbFN1YnNjcmliZXIucHJvdG90eXBlLm5vdGlmeUNvbXBsZXRlID0gZnVuY3Rpb24gKGlubmVyU3ViKSB7XG4gICAgICAgIHZhciBidWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICAgICAgdGhpcy5yZW1vdmUoaW5uZXJTdWIpO1xuICAgICAgICB0aGlzLmFjdGl2ZS0tO1xuICAgICAgICBpZiAoYnVmZmVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuX25leHQoYnVmZmVyLnNoaWZ0KCkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuYWN0aXZlID09PSAwICYmIHRoaXMuaGFzQ29tcGxldGVkKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNZXJnZUFsbFN1YnNjcmliZXI7XG59KE91dGVyU3Vic2NyaWJlcl8xLk91dGVyU3Vic2NyaWJlcikpO1xuZXhwb3J0cy5NZXJnZUFsbFN1YnNjcmliZXIgPSBNZXJnZUFsbFN1YnNjcmliZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1tZXJnZUFsbC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBDb25uZWN0YWJsZU9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uL29ic2VydmFibGUvQ29ubmVjdGFibGVPYnNlcnZhYmxlJyk7XG4vKipcbiAqIFJldHVybnMgYW4gT2JzZXJ2YWJsZSB0aGF0IGVtaXRzIHRoZSByZXN1bHRzIG9mIGludm9raW5nIGEgc3BlY2lmaWVkIHNlbGVjdG9yIG9uIGl0ZW1zXG4gKiBlbWl0dGVkIGJ5IGEgQ29ubmVjdGFibGVPYnNlcnZhYmxlIHRoYXQgc2hhcmVzIGEgc2luZ2xlIHN1YnNjcmlwdGlvbiB0byB0aGUgdW5kZXJseWluZyBzdHJlYW0uXG4gKlxuICogPGltZyBzcmM9XCIuL2ltZy9tdWx0aWNhc3QucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gc2VsZWN0b3IgLSBhIGZ1bmN0aW9uIHRoYXQgY2FuIHVzZSB0aGUgbXVsdGljYXN0ZWQgc291cmNlIHN0cmVhbVxuICogYXMgbWFueSB0aW1lcyBhcyBuZWVkZWQsIHdpdGhvdXQgY2F1c2luZyBtdWx0aXBsZSBzdWJzY3JpcHRpb25zIHRvIHRoZSBzb3VyY2Ugc3RyZWFtLlxuICogU3Vic2NyaWJlcnMgdG8gdGhlIGdpdmVuIHNvdXJjZSB3aWxsIHJlY2VpdmUgYWxsIG5vdGlmaWNhdGlvbnMgb2YgdGhlIHNvdXJjZSBmcm9tIHRoZVxuICogdGltZSBvZiB0aGUgc3Vic2NyaXB0aW9uIGZvcndhcmQuXG4gKiBAcmV0dXJuIHtPYnNlcnZhYmxlfSBhbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgdGhlIHJlc3VsdHMgb2YgaW52b2tpbmcgdGhlIHNlbGVjdG9yXG4gKiBvbiB0aGUgaXRlbXMgZW1pdHRlZCBieSBhIGBDb25uZWN0YWJsZU9ic2VydmFibGVgIHRoYXQgc2hhcmVzIGEgc2luZ2xlIHN1YnNjcmlwdGlvbiB0b1xuICogdGhlIHVuZGVybHlpbmcgc3RyZWFtLlxuICogQG1ldGhvZCBtdWx0aWNhc3RcbiAqIEBvd25lciBPYnNlcnZhYmxlXG4gKi9cbmZ1bmN0aW9uIG11bHRpY2FzdChzdWJqZWN0T3JTdWJqZWN0RmFjdG9yeSkge1xuICAgIHZhciBzdWJqZWN0RmFjdG9yeTtcbiAgICBpZiAodHlwZW9mIHN1YmplY3RPclN1YmplY3RGYWN0b3J5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHN1YmplY3RGYWN0b3J5ID0gc3ViamVjdE9yU3ViamVjdEZhY3Rvcnk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzdWJqZWN0RmFjdG9yeSA9IGZ1bmN0aW9uIHN1YmplY3RGYWN0b3J5KCkge1xuICAgICAgICAgICAgcmV0dXJuIHN1YmplY3RPclN1YmplY3RGYWN0b3J5O1xuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gbmV3IENvbm5lY3RhYmxlT2JzZXJ2YWJsZV8xLkNvbm5lY3RhYmxlT2JzZXJ2YWJsZSh0aGlzLCBzdWJqZWN0RmFjdG9yeSk7XG59XG5leHBvcnRzLm11bHRpY2FzdCA9IG11bHRpY2FzdDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW11bHRpY2FzdC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIFN1YnNjcmliZXJfMSA9IHJlcXVpcmUoJy4uL1N1YnNjcmliZXInKTtcbi8qKlxuICogQXBwbGllcyBhbiBhY2N1bXVsYXRpb24gZnVuY3Rpb24gb3ZlciB0aGUgc291cmNlIE9ic2VydmFibGUsIGFuZCByZXR1cm5zIGVhY2hcbiAqIGludGVybWVkaWF0ZSByZXN1bHQsIHdpdGggYW4gb3B0aW9uYWwgc2VlZCB2YWx1ZS5cbiAqXG4gKiA8c3BhbiBjbGFzcz1cImluZm9ybWFsXCI+SXQncyBsaWtlIHtAbGluayByZWR1Y2V9LCBidXQgZW1pdHMgdGhlIGN1cnJlbnRcbiAqIGFjY3VtdWxhdGlvbiB3aGVuZXZlciB0aGUgc291cmNlIGVtaXRzIGEgdmFsdWUuPC9zcGFuPlxuICpcbiAqIDxpbWcgc3JjPVwiLi9pbWcvc2Nhbi5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAqXG4gKiBDb21iaW5lcyB0b2dldGhlciBhbGwgdmFsdWVzIGVtaXR0ZWQgb24gdGhlIHNvdXJjZSwgdXNpbmcgYW4gYWNjdW11bGF0b3JcbiAqIGZ1bmN0aW9uIHRoYXQga25vd3MgaG93IHRvIGpvaW4gYSBuZXcgc291cmNlIHZhbHVlIGludG8gdGhlIGFjY3VtdWxhdGlvbiBmcm9tXG4gKiB0aGUgcGFzdC4gSXMgc2ltaWxhciB0byB7QGxpbmsgcmVkdWNlfSwgYnV0IGVtaXRzIHRoZSBpbnRlcm1lZGlhdGVcbiAqIGFjY3VtdWxhdGlvbnMuXG4gKlxuICogUmV0dXJucyBhbiBPYnNlcnZhYmxlIHRoYXQgYXBwbGllcyBhIHNwZWNpZmllZCBgYWNjdW11bGF0b3JgIGZ1bmN0aW9uIHRvIGVhY2hcbiAqIGl0ZW0gZW1pdHRlZCBieSB0aGUgc291cmNlIE9ic2VydmFibGUuIElmIGEgYHNlZWRgIHZhbHVlIGlzIHNwZWNpZmllZCwgdGhlblxuICogdGhhdCB2YWx1ZSB3aWxsIGJlIHVzZWQgYXMgdGhlIGluaXRpYWwgdmFsdWUgZm9yIHRoZSBhY2N1bXVsYXRvci4gSWYgbm8gc2VlZFxuICogdmFsdWUgaXMgc3BlY2lmaWVkLCB0aGUgZmlyc3QgaXRlbSBvZiB0aGUgc291cmNlIGlzIHVzZWQgYXMgdGhlIHNlZWQuXG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+Q291bnQgdGhlIG51bWJlciBvZiBjbGljayBldmVudHM8L2NhcHRpb24+XG4gKiB2YXIgY2xpY2tzID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoZG9jdW1lbnQsICdjbGljaycpO1xuICogdmFyIG9uZXMgPSBjbGlja3MubWFwVG8oMSk7XG4gKiB2YXIgc2VlZCA9IDA7XG4gKiB2YXIgY291bnQgPSBvbmVzLnNjYW4oKGFjYywgb25lKSA9PiBhY2MgKyBvbmUsIHNlZWQpO1xuICogY291bnQuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICpcbiAqIEBzZWUge0BsaW5rIGV4cGFuZH1cbiAqIEBzZWUge0BsaW5rIG1lcmdlU2Nhbn1cbiAqIEBzZWUge0BsaW5rIHJlZHVjZX1cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKGFjYzogUiwgdmFsdWU6IFQpOiBSfSBhY2N1bXVsYXRvciBUaGUgYWNjdW11bGF0b3IgZnVuY3Rpb25cbiAqIGNhbGxlZCBvbiBlYWNoIHNvdXJjZSB2YWx1ZS5cbiAqIEBwYXJhbSB7VHxSfSBbc2VlZF0gVGhlIGluaXRpYWwgYWNjdW11bGF0aW9uIHZhbHVlLlxuICogQHJldHVybiB7T2JzZXJ2YWJsZTxSPn0gQW4gb2JzZXJ2YWJsZSBvZiB0aGUgYWNjdW11bGF0ZWQgdmFsdWVzLlxuICogQG1ldGhvZCBzY2FuXG4gKiBAb3duZXIgT2JzZXJ2YWJsZVxuICovXG5mdW5jdGlvbiBzY2FuKGFjY3VtdWxhdG9yLCBzZWVkKSB7XG4gICAgcmV0dXJuIHRoaXMubGlmdChuZXcgU2Nhbk9wZXJhdG9yKGFjY3VtdWxhdG9yLCBzZWVkKSk7XG59XG5leHBvcnRzLnNjYW4gPSBzY2FuO1xudmFyIFNjYW5PcGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU2Nhbk9wZXJhdG9yKGFjY3VtdWxhdG9yLCBzZWVkKSB7XG4gICAgICAgIHRoaXMuYWNjdW11bGF0b3IgPSBhY2N1bXVsYXRvcjtcbiAgICAgICAgdGhpcy5zZWVkID0gc2VlZDtcbiAgICB9XG4gICAgU2Nhbk9wZXJhdG9yLnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gKHN1YnNjcmliZXIsIHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gc291cmNlLl9zdWJzY3JpYmUobmV3IFNjYW5TdWJzY3JpYmVyKHN1YnNjcmliZXIsIHRoaXMuYWNjdW11bGF0b3IsIHRoaXMuc2VlZCkpO1xuICAgIH07XG4gICAgcmV0dXJuIFNjYW5PcGVyYXRvcjtcbn0oKSk7XG4vKipcbiAqIFdlIG5lZWQgdGhpcyBKU0RvYyBjb21tZW50IGZvciBhZmZlY3RpbmcgRVNEb2MuXG4gKiBAaWdub3JlXG4gKiBAZXh0ZW5kcyB7SWdub3JlZH1cbiAqL1xudmFyIFNjYW5TdWJzY3JpYmVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoU2NhblN1YnNjcmliZXIsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gU2NhblN1YnNjcmliZXIoZGVzdGluYXRpb24sIGFjY3VtdWxhdG9yLCBzZWVkKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlc3RpbmF0aW9uKTtcbiAgICAgICAgdGhpcy5hY2N1bXVsYXRvciA9IGFjY3VtdWxhdG9yO1xuICAgICAgICB0aGlzLmFjY3VtdWxhdG9yU2V0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuc2VlZCA9IHNlZWQ7XG4gICAgICAgIHRoaXMuYWNjdW11bGF0b3IgPSBhY2N1bXVsYXRvcjtcbiAgICAgICAgdGhpcy5hY2N1bXVsYXRvclNldCA9IHR5cGVvZiBzZWVkICE9PSAndW5kZWZpbmVkJztcbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFNjYW5TdWJzY3JpYmVyLnByb3RvdHlwZSwgXCJzZWVkXCIsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc2VlZDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuYWNjdW11bGF0b3JTZXQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fc2VlZCA9IHZhbHVlO1xuICAgICAgICB9LFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbiAgICBTY2FuU3Vic2NyaWJlci5wcm90b3R5cGUuX25leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmFjY3VtdWxhdG9yU2V0KSB7XG4gICAgICAgICAgICB0aGlzLnNlZWQgPSB2YWx1ZTtcbiAgICAgICAgICAgIHRoaXMuZGVzdGluYXRpb24ubmV4dCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fdHJ5TmV4dCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFNjYW5TdWJzY3JpYmVyLnByb3RvdHlwZS5fdHJ5TmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5hY2N1bXVsYXRvcih0aGlzLnNlZWQsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmVycm9yKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZWVkID0gcmVzdWx0O1xuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLm5leHQocmVzdWx0KTtcbiAgICB9O1xuICAgIHJldHVybiBTY2FuU3Vic2NyaWJlcjtcbn0oU3Vic2NyaWJlcl8xLlN1YnNjcmliZXIpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXNjYW4uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgbXVsdGljYXN0XzEgPSByZXF1aXJlKCcuL211bHRpY2FzdCcpO1xudmFyIFN1YmplY3RfMSA9IHJlcXVpcmUoJy4uL1N1YmplY3QnKTtcbmZ1bmN0aW9uIHNoYXJlU3ViamVjdEZhY3RvcnkoKSB7XG4gICAgcmV0dXJuIG5ldyBTdWJqZWN0XzEuU3ViamVjdCgpO1xufVxuLyoqXG4gKiBSZXR1cm5zIGEgbmV3IE9ic2VydmFibGUgdGhhdCBtdWx0aWNhc3RzIChzaGFyZXMpIHRoZSBvcmlnaW5hbCBPYnNlcnZhYmxlLiBBcyBsb25nIGFzIHRoZXJlIGlzIGF0IGxlYXN0IG9uZVxuICogU3Vic2NyaWJlciB0aGlzIE9ic2VydmFibGUgd2lsbCBiZSBzdWJzY3JpYmVkIGFuZCBlbWl0dGluZyBkYXRhLiBXaGVuIGFsbCBzdWJzY3JpYmVycyBoYXZlIHVuc3Vic2NyaWJlZCBpdCB3aWxsXG4gKiB1bnN1YnNjcmliZSBmcm9tIHRoZSBzb3VyY2UgT2JzZXJ2YWJsZS4gQmVjYXVzZSB0aGUgT2JzZXJ2YWJsZSBpcyBtdWx0aWNhc3RpbmcgaXQgbWFrZXMgdGhlIHN0cmVhbSBgaG90YC5cbiAqIFRoaXMgaXMgYW4gYWxpYXMgZm9yIC5wdWJsaXNoKCkucmVmQ291bnQoKS5cbiAqXG4gKiA8aW1nIHNyYz1cIi4vaW1nL3NoYXJlLnBuZ1wiIHdpZHRoPVwiMTAwJVwiPlxuICpcbiAqIEByZXR1cm4ge09ic2VydmFibGU8VD59IGFuIE9ic2VydmFibGUgdGhhdCB1cG9uIGNvbm5lY3Rpb24gY2F1c2VzIHRoZSBzb3VyY2UgT2JzZXJ2YWJsZSB0byBlbWl0IGl0ZW1zIHRvIGl0cyBPYnNlcnZlcnNcbiAqIEBtZXRob2Qgc2hhcmVcbiAqIEBvd25lciBPYnNlcnZhYmxlXG4gKi9cbmZ1bmN0aW9uIHNoYXJlKCkge1xuICAgIHJldHVybiBtdWx0aWNhc3RfMS5tdWx0aWNhc3QuY2FsbCh0aGlzLCBzaGFyZVN1YmplY3RGYWN0b3J5KS5yZWZDb3VudCgpO1xufVxuZXhwb3J0cy5zaGFyZSA9IHNoYXJlO1xuO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c2hhcmUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgQXJyYXlPYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi9vYnNlcnZhYmxlL0FycmF5T2JzZXJ2YWJsZScpO1xudmFyIFNjYWxhck9ic2VydmFibGVfMSA9IHJlcXVpcmUoJy4uL29ic2VydmFibGUvU2NhbGFyT2JzZXJ2YWJsZScpO1xudmFyIEVtcHR5T2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vb2JzZXJ2YWJsZS9FbXB0eU9ic2VydmFibGUnKTtcbnZhciBjb25jYXRfMSA9IHJlcXVpcmUoJy4vY29uY2F0Jyk7XG52YXIgaXNTY2hlZHVsZXJfMSA9IHJlcXVpcmUoJy4uL3V0aWwvaXNTY2hlZHVsZXInKTtcbi8qKlxuICogUmV0dXJucyBhbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgdGhlIGl0ZW1zIGluIGEgc3BlY2lmaWVkIEl0ZXJhYmxlIGJlZm9yZSBpdCBiZWdpbnMgdG8gZW1pdCBpdGVtcyBlbWl0dGVkIGJ5IHRoZVxuICogc291cmNlIE9ic2VydmFibGUuXG4gKlxuICogPGltZyBzcmM9XCIuL2ltZy9zdGFydFdpdGgucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gKlxuICogQHBhcmFtIHtWYWx1ZXN9IGFuIEl0ZXJhYmxlIHRoYXQgY29udGFpbnMgdGhlIGl0ZW1zIHlvdSB3YW50IHRoZSBtb2RpZmllZCBPYnNlcnZhYmxlIHRvIGVtaXQgZmlyc3QuXG4gKiBAcmV0dXJuIHtPYnNlcnZhYmxlfSBhbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgdGhlIGl0ZW1zIGluIHRoZSBzcGVjaWZpZWQgSXRlcmFibGUgYW5kIHRoZW4gZW1pdHMgdGhlIGl0ZW1zXG4gKiBlbWl0dGVkIGJ5IHRoZSBzb3VyY2UgT2JzZXJ2YWJsZS5cbiAqIEBtZXRob2Qgc3RhcnRXaXRoXG4gKiBAb3duZXIgT2JzZXJ2YWJsZVxuICovXG5mdW5jdGlvbiBzdGFydFdpdGgoKSB7XG4gICAgdmFyIGFycmF5ID0gW107XG4gICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgYXJyYXlbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgfVxuICAgIHZhciBzY2hlZHVsZXIgPSBhcnJheVthcnJheS5sZW5ndGggLSAxXTtcbiAgICBpZiAoaXNTY2hlZHVsZXJfMS5pc1NjaGVkdWxlcihzY2hlZHVsZXIpKSB7XG4gICAgICAgIGFycmF5LnBvcCgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2NoZWR1bGVyID0gbnVsbDtcbiAgICB9XG4gICAgdmFyIGxlbiA9IGFycmF5Lmxlbmd0aDtcbiAgICBpZiAobGVuID09PSAxKSB7XG4gICAgICAgIHJldHVybiBjb25jYXRfMS5jb25jYXRTdGF0aWMobmV3IFNjYWxhck9ic2VydmFibGVfMS5TY2FsYXJPYnNlcnZhYmxlKGFycmF5WzBdLCBzY2hlZHVsZXIpLCB0aGlzKTtcbiAgICB9XG4gICAgZWxzZSBpZiAobGVuID4gMSkge1xuICAgICAgICByZXR1cm4gY29uY2F0XzEuY29uY2F0U3RhdGljKG5ldyBBcnJheU9ic2VydmFibGVfMS5BcnJheU9ic2VydmFibGUoYXJyYXksIHNjaGVkdWxlciksIHRoaXMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGNvbmNhdF8xLmNvbmNhdFN0YXRpYyhuZXcgRW1wdHlPYnNlcnZhYmxlXzEuRW1wdHlPYnNlcnZhYmxlKHNjaGVkdWxlciksIHRoaXMpO1xuICAgIH1cbn1cbmV4cG9ydHMuc3RhcnRXaXRoID0gc3RhcnRXaXRoO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c3RhcnRXaXRoLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgT3V0ZXJTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuLi9PdXRlclN1YnNjcmliZXInKTtcbnZhciBzdWJzY3JpYmVUb1Jlc3VsdF8xID0gcmVxdWlyZSgnLi4vdXRpbC9zdWJzY3JpYmVUb1Jlc3VsdCcpO1xuLyoqXG4gKiBQcm9qZWN0cyBlYWNoIHNvdXJjZSB2YWx1ZSB0byBhbiBPYnNlcnZhYmxlIHdoaWNoIGlzIG1lcmdlZCBpbiB0aGUgb3V0cHV0XG4gKiBPYnNlcnZhYmxlLCBlbWl0dGluZyB2YWx1ZXMgb25seSBmcm9tIHRoZSBtb3N0IHJlY2VudGx5IHByb2plY3RlZCBPYnNlcnZhYmxlLlxuICpcbiAqIDxzcGFuIGNsYXNzPVwiaW5mb3JtYWxcIj5NYXBzIGVhY2ggdmFsdWUgdG8gYW4gT2JzZXJ2YWJsZSwgdGhlbiBmbGF0dGVucyBhbGwgb2ZcbiAqIHRoZXNlIGlubmVyIE9ic2VydmFibGVzIHVzaW5nIHtAbGluayBzd2l0Y2h9Ljwvc3Bhbj5cbiAqXG4gKiA8aW1nIHNyYz1cIi4vaW1nL3N3aXRjaE1hcC5wbmdcIiB3aWR0aD1cIjEwMCVcIj5cbiAqXG4gKiBSZXR1cm5zIGFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyBpdGVtcyBiYXNlZCBvbiBhcHBseWluZyBhIGZ1bmN0aW9uIHRoYXQgeW91XG4gKiBzdXBwbHkgdG8gZWFjaCBpdGVtIGVtaXR0ZWQgYnkgdGhlIHNvdXJjZSBPYnNlcnZhYmxlLCB3aGVyZSB0aGF0IGZ1bmN0aW9uXG4gKiByZXR1cm5zIGFuIChzby1jYWxsZWQgXCJpbm5lclwiKSBPYnNlcnZhYmxlLiBFYWNoIHRpbWUgaXQgb2JzZXJ2ZXMgb25lIG9mIHRoZXNlXG4gKiBpbm5lciBPYnNlcnZhYmxlcywgdGhlIG91dHB1dCBPYnNlcnZhYmxlIGJlZ2lucyBlbWl0dGluZyB0aGUgaXRlbXMgZW1pdHRlZCBieVxuICogdGhhdCBpbm5lciBPYnNlcnZhYmxlLiBXaGVuIGEgbmV3IGlubmVyIE9ic2VydmFibGUgaXMgZW1pdHRlZCwgYHN3aXRjaE1hcGBcbiAqIHN0b3BzIGVtaXR0aW5nIGl0ZW1zIGZyb20gdGhlIGVhcmxpZXItZW1pdHRlZCBpbm5lciBPYnNlcnZhYmxlIGFuZCBiZWdpbnNcbiAqIGVtaXR0aW5nIGl0ZW1zIGZyb20gdGhlIG5ldyBvbmUuIEl0IGNvbnRpbnVlcyB0byBiZWhhdmUgbGlrZSB0aGlzIGZvclxuICogc3Vic2VxdWVudCBpbm5lciBPYnNlcnZhYmxlcy5cbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5SZXJ1biBhbiBpbnRlcnZhbCBPYnNlcnZhYmxlIG9uIGV2ZXJ5IGNsaWNrIGV2ZW50PC9jYXB0aW9uPlxuICogdmFyIGNsaWNrcyA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGRvY3VtZW50LCAnY2xpY2snKTtcbiAqIHZhciByZXN1bHQgPSBjbGlja3Muc3dpdGNoTWFwKChldikgPT4gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxMDAwKSk7XG4gKiByZXN1bHQuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coeCkpO1xuICpcbiAqIEBzZWUge0BsaW5rIGNvbmNhdE1hcH1cbiAqIEBzZWUge0BsaW5rIGV4aGF1c3RNYXB9XG4gKiBAc2VlIHtAbGluayBtZXJnZU1hcH1cbiAqIEBzZWUge0BsaW5rIHN3aXRjaH1cbiAqIEBzZWUge0BsaW5rIHN3aXRjaE1hcFRvfVxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb24odmFsdWU6IFQsID9pbmRleDogbnVtYmVyKTogT2JzZXJ2YWJsZX0gcHJvamVjdCBBIGZ1bmN0aW9uXG4gKiB0aGF0LCB3aGVuIGFwcGxpZWQgdG8gYW4gaXRlbSBlbWl0dGVkIGJ5IHRoZSBzb3VyY2UgT2JzZXJ2YWJsZSwgcmV0dXJucyBhblxuICogT2JzZXJ2YWJsZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb24ob3V0ZXJWYWx1ZTogVCwgaW5uZXJWYWx1ZTogSSwgb3V0ZXJJbmRleDogbnVtYmVyLCBpbm5lckluZGV4OiBudW1iZXIpOiBhbnl9IFtyZXN1bHRTZWxlY3Rvcl1cbiAqIEEgZnVuY3Rpb24gdG8gcHJvZHVjZSB0aGUgdmFsdWUgb24gdGhlIG91dHB1dCBPYnNlcnZhYmxlIGJhc2VkIG9uIHRoZSB2YWx1ZXNcbiAqIGFuZCB0aGUgaW5kaWNlcyBvZiB0aGUgc291cmNlIChvdXRlcikgZW1pc3Npb24gYW5kIHRoZSBpbm5lciBPYnNlcnZhYmxlXG4gKiBlbWlzc2lvbi4gVGhlIGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhpcyBmdW5jdGlvbiBhcmU6XG4gKiAtIGBvdXRlclZhbHVlYDogdGhlIHZhbHVlIHRoYXQgY2FtZSBmcm9tIHRoZSBzb3VyY2VcbiAqIC0gYGlubmVyVmFsdWVgOiB0aGUgdmFsdWUgdGhhdCBjYW1lIGZyb20gdGhlIHByb2plY3RlZCBPYnNlcnZhYmxlXG4gKiAtIGBvdXRlckluZGV4YDogdGhlIFwiaW5kZXhcIiBvZiB0aGUgdmFsdWUgdGhhdCBjYW1lIGZyb20gdGhlIHNvdXJjZVxuICogLSBgaW5uZXJJbmRleGA6IHRoZSBcImluZGV4XCIgb2YgdGhlIHZhbHVlIGZyb20gdGhlIHByb2plY3RlZCBPYnNlcnZhYmxlXG4gKiBAcmV0dXJuIHtPYnNlcnZhYmxlfSBBbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgdGhlIHJlc3VsdCBvZiBhcHBseWluZyB0aGVcbiAqIHByb2plY3Rpb24gZnVuY3Rpb24gKGFuZCB0aGUgb3B0aW9uYWwgYHJlc3VsdFNlbGVjdG9yYCkgdG8gZWFjaCBpdGVtIGVtaXR0ZWRcbiAqIGJ5IHRoZSBzb3VyY2UgT2JzZXJ2YWJsZSBhbmQgdGFraW5nIG9ubHkgdGhlIHZhbHVlcyBmcm9tIHRoZSBtb3N0IHJlY2VudGx5XG4gKiBwcm9qZWN0ZWQgaW5uZXIgT2JzZXJ2YWJsZS5cbiAqIEBtZXRob2Qgc3dpdGNoTWFwXG4gKiBAb3duZXIgT2JzZXJ2YWJsZVxuICovXG5mdW5jdGlvbiBzd2l0Y2hNYXAocHJvamVjdCwgcmVzdWx0U2VsZWN0b3IpIHtcbiAgICByZXR1cm4gdGhpcy5saWZ0KG5ldyBTd2l0Y2hNYXBPcGVyYXRvcihwcm9qZWN0LCByZXN1bHRTZWxlY3RvcikpO1xufVxuZXhwb3J0cy5zd2l0Y2hNYXAgPSBzd2l0Y2hNYXA7XG52YXIgU3dpdGNoTWFwT3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFN3aXRjaE1hcE9wZXJhdG9yKHByb2plY3QsIHJlc3VsdFNlbGVjdG9yKSB7XG4gICAgICAgIHRoaXMucHJvamVjdCA9IHByb2plY3Q7XG4gICAgICAgIHRoaXMucmVzdWx0U2VsZWN0b3IgPSByZXN1bHRTZWxlY3RvcjtcbiAgICB9XG4gICAgU3dpdGNoTWFwT3BlcmF0b3IucHJvdG90eXBlLmNhbGwgPSBmdW5jdGlvbiAoc3Vic2NyaWJlciwgc291cmNlKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2UuX3N1YnNjcmliZShuZXcgU3dpdGNoTWFwU3Vic2NyaWJlcihzdWJzY3JpYmVyLCB0aGlzLnByb2plY3QsIHRoaXMucmVzdWx0U2VsZWN0b3IpKTtcbiAgICB9O1xuICAgIHJldHVybiBTd2l0Y2hNYXBPcGVyYXRvcjtcbn0oKSk7XG4vKipcbiAqIFdlIG5lZWQgdGhpcyBKU0RvYyBjb21tZW50IGZvciBhZmZlY3RpbmcgRVNEb2MuXG4gKiBAaWdub3JlXG4gKiBAZXh0ZW5kcyB7SWdub3JlZH1cbiAqL1xudmFyIFN3aXRjaE1hcFN1YnNjcmliZXIgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTd2l0Y2hNYXBTdWJzY3JpYmVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFN3aXRjaE1hcFN1YnNjcmliZXIoZGVzdGluYXRpb24sIHByb2plY3QsIHJlc3VsdFNlbGVjdG9yKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlc3RpbmF0aW9uKTtcbiAgICAgICAgdGhpcy5wcm9qZWN0ID0gcHJvamVjdDtcbiAgICAgICAgdGhpcy5yZXN1bHRTZWxlY3RvciA9IHJlc3VsdFNlbGVjdG9yO1xuICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICB9XG4gICAgU3dpdGNoTWFwU3Vic2NyaWJlci5wcm90b3R5cGUuX25leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5pbmRleCsrO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5wcm9qZWN0KHZhbHVlLCBpbmRleCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmVycm9yKGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pbm5lclN1YihyZXN1bHQsIHZhbHVlLCBpbmRleCk7XG4gICAgfTtcbiAgICBTd2l0Y2hNYXBTdWJzY3JpYmVyLnByb3RvdHlwZS5faW5uZXJTdWIgPSBmdW5jdGlvbiAocmVzdWx0LCB2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgdmFyIGlubmVyU3Vic2NyaXB0aW9uID0gdGhpcy5pbm5lclN1YnNjcmlwdGlvbjtcbiAgICAgICAgaWYgKGlubmVyU3Vic2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBpbm5lclN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYWRkKHRoaXMuaW5uZXJTdWJzY3JpcHRpb24gPSBzdWJzY3JpYmVUb1Jlc3VsdF8xLnN1YnNjcmliZVRvUmVzdWx0KHRoaXMsIHJlc3VsdCwgdmFsdWUsIGluZGV4KSk7XG4gICAgfTtcbiAgICBTd2l0Y2hNYXBTdWJzY3JpYmVyLnByb3RvdHlwZS5fY29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpbm5lclN1YnNjcmlwdGlvbiA9IHRoaXMuaW5uZXJTdWJzY3JpcHRpb247XG4gICAgICAgIGlmICghaW5uZXJTdWJzY3JpcHRpb24gfHwgaW5uZXJTdWJzY3JpcHRpb24uaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgIF9zdXBlci5wcm90b3R5cGUuX2NvbXBsZXRlLmNhbGwodGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN3aXRjaE1hcFN1YnNjcmliZXIucHJvdG90eXBlLl91bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pbm5lclN1YnNjcmlwdGlvbiA9IG51bGw7XG4gICAgfTtcbiAgICBTd2l0Y2hNYXBTdWJzY3JpYmVyLnByb3RvdHlwZS5ub3RpZnlDb21wbGV0ZSA9IGZ1bmN0aW9uIChpbm5lclN1Yikge1xuICAgICAgICB0aGlzLnJlbW92ZShpbm5lclN1Yik7XG4gICAgICAgIHRoaXMuaW5uZXJTdWJzY3JpcHRpb24gPSBudWxsO1xuICAgICAgICBpZiAodGhpcy5pc1N0b3BwZWQpIHtcbiAgICAgICAgICAgIF9zdXBlci5wcm90b3R5cGUuX2NvbXBsZXRlLmNhbGwodGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN3aXRjaE1hcFN1YnNjcmliZXIucHJvdG90eXBlLm5vdGlmeU5leHQgPSBmdW5jdGlvbiAob3V0ZXJWYWx1ZSwgaW5uZXJWYWx1ZSwgb3V0ZXJJbmRleCwgaW5uZXJJbmRleCwgaW5uZXJTdWIpIHtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0U2VsZWN0b3IpIHtcbiAgICAgICAgICAgIHRoaXMuX3RyeU5vdGlmeU5leHQob3V0ZXJWYWx1ZSwgaW5uZXJWYWx1ZSwgb3V0ZXJJbmRleCwgaW5uZXJJbmRleCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLm5leHQoaW5uZXJWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN3aXRjaE1hcFN1YnNjcmliZXIucHJvdG90eXBlLl90cnlOb3RpZnlOZXh0ID0gZnVuY3Rpb24gKG91dGVyVmFsdWUsIGlubmVyVmFsdWUsIG91dGVySW5kZXgsIGlubmVySW5kZXgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMucmVzdWx0U2VsZWN0b3Iob3V0ZXJWYWx1ZSwgaW5uZXJWYWx1ZSwgb3V0ZXJJbmRleCwgaW5uZXJJbmRleCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5lcnJvcihlcnIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24ubmV4dChyZXN1bHQpO1xuICAgIH07XG4gICAgcmV0dXJuIFN3aXRjaE1hcFN1YnNjcmliZXI7XG59KE91dGVyU3Vic2NyaWJlcl8xLk91dGVyU3Vic2NyaWJlcikpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c3dpdGNoTWFwLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgT3V0ZXJTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuLi9PdXRlclN1YnNjcmliZXInKTtcbnZhciBzdWJzY3JpYmVUb1Jlc3VsdF8xID0gcmVxdWlyZSgnLi4vdXRpbC9zdWJzY3JpYmVUb1Jlc3VsdCcpO1xuLyoqXG4gKiBDb21iaW5lcyB0aGUgc291cmNlIE9ic2VydmFibGUgd2l0aCBvdGhlciBPYnNlcnZhYmxlcyB0byBjcmVhdGUgYW4gT2JzZXJ2YWJsZVxuICogd2hvc2UgdmFsdWVzIGFyZSBjYWxjdWxhdGVkIGZyb20gdGhlIGxhdGVzdCB2YWx1ZXMgb2YgZWFjaCwgb25seSB3aGVuIHRoZVxuICogc291cmNlIGVtaXRzLlxuICpcbiAqIDxzcGFuIGNsYXNzPVwiaW5mb3JtYWxcIj5XaGVuZXZlciB0aGUgc291cmNlIE9ic2VydmFibGUgZW1pdHMgYSB2YWx1ZSwgaXRcbiAqIGNvbXB1dGVzIGEgZm9ybXVsYSB1c2luZyB0aGF0IHZhbHVlIHBsdXMgdGhlIGxhdGVzdCB2YWx1ZXMgZnJvbSBvdGhlciBpbnB1dFxuICogT2JzZXJ2YWJsZXMsIHRoZW4gZW1pdHMgdGhlIG91dHB1dCBvZiB0aGF0IGZvcm11bGEuPC9zcGFuPlxuICpcbiAqIDxpbWcgc3JjPVwiLi9pbWcvd2l0aExhdGVzdEZyb20ucG5nXCIgd2lkdGg9XCIxMDAlXCI+XG4gKlxuICogYHdpdGhMYXRlc3RGcm9tYCBjb21iaW5lcyBlYWNoIHZhbHVlIGZyb20gdGhlIHNvdXJjZSBPYnNlcnZhYmxlICh0aGVcbiAqIGluc3RhbmNlKSB3aXRoIHRoZSBsYXRlc3QgdmFsdWVzIGZyb20gdGhlIG90aGVyIGlucHV0IE9ic2VydmFibGVzIG9ubHkgd2hlblxuICogdGhlIHNvdXJjZSBlbWl0cyBhIHZhbHVlLCBvcHRpb25hbGx5IHVzaW5nIGEgYHByb2plY3RgIGZ1bmN0aW9uIHRvIGRldGVybWluZVxuICogdGhlIHZhbHVlIHRvIGJlIGVtaXR0ZWQgb24gdGhlIG91dHB1dCBPYnNlcnZhYmxlLiBBbGwgaW5wdXQgT2JzZXJ2YWJsZXMgbXVzdFxuICogZW1pdCBhdCBsZWFzdCBvbmUgdmFsdWUgYmVmb3JlIHRoZSBvdXRwdXQgT2JzZXJ2YWJsZSB3aWxsIGVtaXQgYSB2YWx1ZS5cbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5PbiBldmVyeSBjbGljayBldmVudCwgZW1pdCBhbiBhcnJheSB3aXRoIHRoZSBsYXRlc3QgdGltZXIgZXZlbnQgcGx1cyB0aGUgY2xpY2sgZXZlbnQ8L2NhcHRpb24+XG4gKiB2YXIgY2xpY2tzID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoZG9jdW1lbnQsICdjbGljaycpO1xuICogdmFyIHRpbWVyID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxMDAwKTtcbiAqIHZhciByZXN1bHQgPSBjbGlja3Mud2l0aExhdGVzdEZyb20odGltZXIpO1xuICogcmVzdWx0LnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKHgpKTtcbiAqXG4gKiBAc2VlIHtAbGluayBjb21iaW5lTGF0ZXN0fVxuICpcbiAqIEBwYXJhbSB7T2JzZXJ2YWJsZX0gb3RoZXIgQW4gaW5wdXQgT2JzZXJ2YWJsZSB0byBjb21iaW5lIHdpdGggdGhlIHNvdXJjZVxuICogT2JzZXJ2YWJsZS4gTW9yZSB0aGFuIG9uZSBpbnB1dCBPYnNlcnZhYmxlcyBtYXkgYmUgZ2l2ZW4gYXMgYXJndW1lbnQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcHJvamVjdF0gUHJvamVjdGlvbiBmdW5jdGlvbiBmb3IgY29tYmluaW5nIHZhbHVlc1xuICogdG9nZXRoZXIuIFJlY2VpdmVzIGFsbCB2YWx1ZXMgaW4gb3JkZXIgb2YgdGhlIE9ic2VydmFibGVzIHBhc3NlZCwgd2hlcmUgdGhlXG4gKiBmaXJzdCBwYXJhbWV0ZXIgaXMgYSB2YWx1ZSBmcm9tIHRoZSBzb3VyY2UgT2JzZXJ2YWJsZS4gKGUuZy5cbiAqIGBhLndpdGhMYXRlc3RGcm9tKGIsIGMsIChhMSwgYjEsIGMxKSA9PiBhMSArIGIxICsgYzEpYCkuIElmIHRoaXMgaXMgbm90XG4gKiBwYXNzZWQsIGFycmF5cyB3aWxsIGJlIGVtaXR0ZWQgb24gdGhlIG91dHB1dCBPYnNlcnZhYmxlLlxuICogQHJldHVybiB7T2JzZXJ2YWJsZX0gQW4gT2JzZXJ2YWJsZSBvZiBwcm9qZWN0ZWQgdmFsdWVzIGZyb20gdGhlIG1vc3QgcmVjZW50XG4gKiB2YWx1ZXMgZnJvbSBlYWNoIGlucHV0IE9ic2VydmFibGUsIG9yIGFuIGFycmF5IG9mIHRoZSBtb3N0IHJlY2VudCB2YWx1ZXMgZnJvbVxuICogZWFjaCBpbnB1dCBPYnNlcnZhYmxlLlxuICogQG1ldGhvZCB3aXRoTGF0ZXN0RnJvbVxuICogQG93bmVyIE9ic2VydmFibGVcbiAqL1xuZnVuY3Rpb24gd2l0aExhdGVzdEZyb20oKSB7XG4gICAgdmFyIGFyZ3MgPSBbXTtcbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICBhcmdzW19pIC0gMF0gPSBhcmd1bWVudHNbX2ldO1xuICAgIH1cbiAgICB2YXIgcHJvamVjdDtcbiAgICBpZiAodHlwZW9mIGFyZ3NbYXJncy5sZW5ndGggLSAxXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBwcm9qZWN0ID0gYXJncy5wb3AoKTtcbiAgICB9XG4gICAgdmFyIG9ic2VydmFibGVzID0gYXJncztcbiAgICByZXR1cm4gdGhpcy5saWZ0KG5ldyBXaXRoTGF0ZXN0RnJvbU9wZXJhdG9yKG9ic2VydmFibGVzLCBwcm9qZWN0KSk7XG59XG5leHBvcnRzLndpdGhMYXRlc3RGcm9tID0gd2l0aExhdGVzdEZyb207XG4vKiB0c2xpbnQ6ZW5hYmxlOm1heC1saW5lLWxlbmd0aCAqL1xudmFyIFdpdGhMYXRlc3RGcm9tT3BlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFdpdGhMYXRlc3RGcm9tT3BlcmF0b3Iob2JzZXJ2YWJsZXMsIHByb2plY3QpIHtcbiAgICAgICAgdGhpcy5vYnNlcnZhYmxlcyA9IG9ic2VydmFibGVzO1xuICAgICAgICB0aGlzLnByb2plY3QgPSBwcm9qZWN0O1xuICAgIH1cbiAgICBXaXRoTGF0ZXN0RnJvbU9wZXJhdG9yLnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gKHN1YnNjcmliZXIsIHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gc291cmNlLl9zdWJzY3JpYmUobmV3IFdpdGhMYXRlc3RGcm9tU3Vic2NyaWJlcihzdWJzY3JpYmVyLCB0aGlzLm9ic2VydmFibGVzLCB0aGlzLnByb2plY3QpKTtcbiAgICB9O1xuICAgIHJldHVybiBXaXRoTGF0ZXN0RnJvbU9wZXJhdG9yO1xufSgpKTtcbi8qKlxuICogV2UgbmVlZCB0aGlzIEpTRG9jIGNvbW1lbnQgZm9yIGFmZmVjdGluZyBFU0RvYy5cbiAqIEBpZ25vcmVcbiAqIEBleHRlbmRzIHtJZ25vcmVkfVxuICovXG52YXIgV2l0aExhdGVzdEZyb21TdWJzY3JpYmVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoV2l0aExhdGVzdEZyb21TdWJzY3JpYmVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFdpdGhMYXRlc3RGcm9tU3Vic2NyaWJlcihkZXN0aW5hdGlvbiwgb2JzZXJ2YWJsZXMsIHByb2plY3QpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVzdGluYXRpb24pO1xuICAgICAgICB0aGlzLm9ic2VydmFibGVzID0gb2JzZXJ2YWJsZXM7XG4gICAgICAgIHRoaXMucHJvamVjdCA9IHByb2plY3Q7XG4gICAgICAgIHRoaXMudG9SZXNwb25kID0gW107XG4gICAgICAgIHZhciBsZW4gPSBvYnNlcnZhYmxlcy5sZW5ndGg7XG4gICAgICAgIHRoaXMudmFsdWVzID0gbmV3IEFycmF5KGxlbik7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMudG9SZXNwb25kLnB1c2goaSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgdmFyIG9ic2VydmFibGUgPSBvYnNlcnZhYmxlc1tpXTtcbiAgICAgICAgICAgIHRoaXMuYWRkKHN1YnNjcmliZVRvUmVzdWx0XzEuc3Vic2NyaWJlVG9SZXN1bHQodGhpcywgb2JzZXJ2YWJsZSwgb2JzZXJ2YWJsZSwgaSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFdpdGhMYXRlc3RGcm9tU3Vic2NyaWJlci5wcm90b3R5cGUubm90aWZ5TmV4dCA9IGZ1bmN0aW9uIChvdXRlclZhbHVlLCBpbm5lclZhbHVlLCBvdXRlckluZGV4LCBpbm5lckluZGV4LCBpbm5lclN1Yikge1xuICAgICAgICB0aGlzLnZhbHVlc1tvdXRlckluZGV4XSA9IGlubmVyVmFsdWU7XG4gICAgICAgIHZhciB0b1Jlc3BvbmQgPSB0aGlzLnRvUmVzcG9uZDtcbiAgICAgICAgaWYgKHRvUmVzcG9uZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgZm91bmQgPSB0b1Jlc3BvbmQuaW5kZXhPZihvdXRlckluZGV4KTtcbiAgICAgICAgICAgIGlmIChmb3VuZCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICB0b1Jlc3BvbmQuc3BsaWNlKGZvdW5kLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgV2l0aExhdGVzdEZyb21TdWJzY3JpYmVyLnByb3RvdHlwZS5ub3RpZnlDb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gbm9vcFxuICAgIH07XG4gICAgV2l0aExhdGVzdEZyb21TdWJzY3JpYmVyLnByb3RvdHlwZS5fbmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAodGhpcy50b1Jlc3BvbmQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IFt2YWx1ZV0uY29uY2F0KHRoaXMudmFsdWVzKTtcbiAgICAgICAgICAgIGlmICh0aGlzLnByb2plY3QpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl90cnlQcm9qZWN0KGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5uZXh0KGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBXaXRoTGF0ZXN0RnJvbVN1YnNjcmliZXIucHJvdG90eXBlLl90cnlQcm9qZWN0ID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMucHJvamVjdC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uLmVycm9yKGVycik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbi5uZXh0KHJlc3VsdCk7XG4gICAgfTtcbiAgICByZXR1cm4gV2l0aExhdGVzdEZyb21TdWJzY3JpYmVyO1xufShPdXRlclN1YnNjcmliZXJfMS5PdXRlclN1YnNjcmliZXIpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXdpdGhMYXRlc3RGcm9tLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIHJvb3RfMSA9IHJlcXVpcmUoJy4uL3V0aWwvcm9vdCcpO1xudmFyIFN5bWJvbCA9IHJvb3RfMS5yb290LlN5bWJvbDtcbmlmICh0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nKSB7XG4gICAgaWYgKFN5bWJvbC5pdGVyYXRvcikge1xuICAgICAgICBleHBvcnRzLiQkaXRlcmF0b3IgPSBTeW1ib2wuaXRlcmF0b3I7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBTeW1ib2wuZm9yID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGV4cG9ydHMuJCRpdGVyYXRvciA9IFN5bWJvbC5mb3IoJ2l0ZXJhdG9yJyk7XG4gICAgfVxufVxuZWxzZSB7XG4gICAgaWYgKHJvb3RfMS5yb290LlNldCAmJiB0eXBlb2YgbmV3IHJvb3RfMS5yb290LlNldCgpWydAQGl0ZXJhdG9yJ10gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gQnVnIGZvciBtb3ppbGxhIHZlcnNpb25cbiAgICAgICAgZXhwb3J0cy4kJGl0ZXJhdG9yID0gJ0BAaXRlcmF0b3InO1xuICAgIH1cbiAgICBlbHNlIGlmIChyb290XzEucm9vdC5NYXApIHtcbiAgICAgICAgLy8gZXM2LXNoaW0gc3BlY2lmaWMgbG9naWNcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhyb290XzEucm9vdC5NYXAucHJvdG90eXBlKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgICAgIGlmIChrZXkgIT09ICdlbnRyaWVzJyAmJiBrZXkgIT09ICdzaXplJyAmJiByb290XzEucm9vdC5NYXAucHJvdG90eXBlW2tleV0gPT09IHJvb3RfMS5yb290Lk1hcC5wcm90b3R5cGVbJ2VudHJpZXMnXSkge1xuICAgICAgICAgICAgICAgIGV4cG9ydHMuJCRpdGVyYXRvciA9IGtleTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZXhwb3J0cy4kJGl0ZXJhdG9yID0gJ0BAaXRlcmF0b3InO1xuICAgIH1cbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWl0ZXJhdG9yLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIHJvb3RfMSA9IHJlcXVpcmUoJy4uL3V0aWwvcm9vdCcpO1xudmFyIFN5bWJvbCA9IHJvb3RfMS5yb290LlN5bWJvbDtcbmlmICh0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nKSB7XG4gICAgaWYgKFN5bWJvbC5vYnNlcnZhYmxlKSB7XG4gICAgICAgIGV4cG9ydHMuJCRvYnNlcnZhYmxlID0gU3ltYm9sLm9ic2VydmFibGU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAodHlwZW9mIFN5bWJvbC5mb3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGV4cG9ydHMuJCRvYnNlcnZhYmxlID0gU3ltYm9sLmZvcignb2JzZXJ2YWJsZScpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZXhwb3J0cy4kJG9ic2VydmFibGUgPSBTeW1ib2woJ29ic2VydmFibGUnKTtcbiAgICAgICAgfVxuICAgICAgICBTeW1ib2wub2JzZXJ2YWJsZSA9IGV4cG9ydHMuJCRvYnNlcnZhYmxlO1xuICAgIH1cbn1cbmVsc2Uge1xuICAgIGV4cG9ydHMuJCRvYnNlcnZhYmxlID0gJ0BAb2JzZXJ2YWJsZSc7XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1vYnNlcnZhYmxlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIHJvb3RfMSA9IHJlcXVpcmUoJy4uL3V0aWwvcm9vdCcpO1xudmFyIFN5bWJvbCA9IHJvb3RfMS5yb290LlN5bWJvbDtcbmV4cG9ydHMuJCRyeFN1YnNjcmliZXIgPSAodHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgU3ltYm9sLmZvciA9PT0gJ2Z1bmN0aW9uJykgP1xuICAgIFN5bWJvbC5mb3IoJ3J4U3Vic2NyaWJlcicpIDogJ0BAcnhTdWJzY3JpYmVyJztcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXJ4U3Vic2NyaWJlci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xuLyoqXG4gKiBBbiBlcnJvciB0aHJvd24gd2hlbiBhbiBhY3Rpb24gaXMgaW52YWxpZCBiZWNhdXNlIHRoZSBvYmplY3QgaGFzIGJlZW5cbiAqIHVuc3Vic2NyaWJlZC5cbiAqXG4gKiBAc2VlIHtAbGluayBTdWJqZWN0fVxuICogQHNlZSB7QGxpbmsgQmVoYXZpb3JTdWJqZWN0fVxuICpcbiAqIEBjbGFzcyBPYmplY3RVbnN1YnNjcmliZWRFcnJvclxuICovXG52YXIgT2JqZWN0VW5zdWJzY3JpYmVkRXJyb3IgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhPYmplY3RVbnN1YnNjcmliZWRFcnJvciwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBPYmplY3RVbnN1YnNjcmliZWRFcnJvcigpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgJ29iamVjdCB1bnN1YnNjcmliZWQnKTtcbiAgICAgICAgdGhpcy5uYW1lID0gJ09iamVjdFVuc3Vic2NyaWJlZEVycm9yJztcbiAgICB9XG4gICAgcmV0dXJuIE9iamVjdFVuc3Vic2NyaWJlZEVycm9yO1xufShFcnJvcikpO1xuZXhwb3J0cy5PYmplY3RVbnN1YnNjcmliZWRFcnJvciA9IE9iamVjdFVuc3Vic2NyaWJlZEVycm9yO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9T2JqZWN0VW5zdWJzY3JpYmVkRXJyb3IuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbi8qKlxuICogQW4gZXJyb3IgdGhyb3duIHdoZW4gb25lIG9yIG1vcmUgZXJyb3JzIGhhdmUgb2NjdXJyZWQgZHVyaW5nIHRoZVxuICogYHVuc3Vic2NyaWJlYCBvZiBhIHtAbGluayBTdWJzY3JpcHRpb259LlxuICovXG52YXIgVW5zdWJzY3JpcHRpb25FcnJvciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFVuc3Vic2NyaXB0aW9uRXJyb3IsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gVW5zdWJzY3JpcHRpb25FcnJvcihlcnJvcnMpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuZXJyb3JzID0gZXJyb3JzO1xuICAgICAgICB0aGlzLm5hbWUgPSAnVW5zdWJzY3JpcHRpb25FcnJvcic7XG4gICAgICAgIHRoaXMubWVzc2FnZSA9IGVycm9ycyA/IGVycm9ycy5sZW5ndGggKyBcIiBlcnJvcnMgb2NjdXJyZWQgZHVyaW5nIHVuc3Vic2NyaXB0aW9uOlxcblwiICsgZXJyb3JzLm1hcChmdW5jdGlvbiAoZXJyLCBpKSB7IHJldHVybiAoKGkgKyAxKSArIFwiKSBcIiArIGVyci50b1N0cmluZygpKTsgfSkuam9pbignXFxuJykgOiAnJztcbiAgICB9XG4gICAgcmV0dXJuIFVuc3Vic2NyaXB0aW9uRXJyb3I7XG59KEVycm9yKSk7XG5leHBvcnRzLlVuc3Vic2NyaXB0aW9uRXJyb3IgPSBVbnN1YnNjcmlwdGlvbkVycm9yO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9VW5zdWJzY3JpcHRpb25FcnJvci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbi8vIHR5cGVvZiBhbnkgc28gdGhhdCBpdCB3ZSBkb24ndCBoYXZlIHRvIGNhc3Qgd2hlbiBjb21wYXJpbmcgYSByZXN1bHQgdG8gdGhlIGVycm9yIG9iamVjdFxuZXhwb3J0cy5lcnJvck9iamVjdCA9IHsgZToge30gfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWVycm9yT2JqZWN0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuZXhwb3J0cy5pc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCAoZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHggJiYgdHlwZW9mIHgubGVuZ3RoID09PSAnbnVtYmVyJzsgfSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pc0FycmF5LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuZnVuY3Rpb24gaXNGdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWlzRnVuY3Rpb24uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5mdW5jdGlvbiBpc09iamVjdCh4KSB7XG4gICAgcmV0dXJuIHggIT0gbnVsbCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCc7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pc09iamVjdC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbmZ1bmN0aW9uIGlzUHJvbWlzZSh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUuc3Vic2NyaWJlICE9PSAnZnVuY3Rpb24nICYmIHR5cGVvZiB2YWx1ZS50aGVuID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc1Byb21pc2UgPSBpc1Byb21pc2U7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pc1Byb21pc2UuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5mdW5jdGlvbiBpc1NjaGVkdWxlcih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUuc2NoZWR1bGUgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzU2NoZWR1bGVyID0gaXNTY2hlZHVsZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pc1NjaGVkdWxlci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBvYmplY3RUeXBlcyA9IHtcbiAgICAnYm9vbGVhbic6IGZhbHNlLFxuICAgICdmdW5jdGlvbic6IHRydWUsXG4gICAgJ29iamVjdCc6IHRydWUsXG4gICAgJ251bWJlcic6IGZhbHNlLFxuICAgICdzdHJpbmcnOiBmYWxzZSxcbiAgICAndW5kZWZpbmVkJzogZmFsc2Vcbn07XG5leHBvcnRzLnJvb3QgPSAob2JqZWN0VHlwZXNbdHlwZW9mIHNlbGZdICYmIHNlbGYpIHx8IChvYmplY3RUeXBlc1t0eXBlb2Ygd2luZG93XSAmJiB3aW5kb3cpO1xuLyogdHNsaW50OmRpc2FibGU6bm8tdW51c2VkLXZhcmlhYmxlICovXG52YXIgZnJlZUV4cG9ydHMgPSBvYmplY3RUeXBlc1t0eXBlb2YgZXhwb3J0c10gJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSAmJiBleHBvcnRzO1xudmFyIGZyZWVNb2R1bGUgPSBvYmplY3RUeXBlc1t0eXBlb2YgbW9kdWxlXSAmJiBtb2R1bGUgJiYgIW1vZHVsZS5ub2RlVHlwZSAmJiBtb2R1bGU7XG52YXIgZnJlZUdsb2JhbCA9IG9iamVjdFR5cGVzW3R5cGVvZiBnbG9iYWxdICYmIGdsb2JhbDtcbmlmIChmcmVlR2xvYmFsICYmIChmcmVlR2xvYmFsLmdsb2JhbCA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsLndpbmRvdyA9PT0gZnJlZUdsb2JhbCkpIHtcbiAgICBleHBvcnRzLnJvb3QgPSBmcmVlR2xvYmFsO1xufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cm9vdC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciByb290XzEgPSByZXF1aXJlKCcuL3Jvb3QnKTtcbnZhciBpc0FycmF5XzEgPSByZXF1aXJlKCcuL2lzQXJyYXknKTtcbnZhciBpc1Byb21pc2VfMSA9IHJlcXVpcmUoJy4vaXNQcm9taXNlJyk7XG52YXIgT2JzZXJ2YWJsZV8xID0gcmVxdWlyZSgnLi4vT2JzZXJ2YWJsZScpO1xudmFyIGl0ZXJhdG9yXzEgPSByZXF1aXJlKCcuLi9zeW1ib2wvaXRlcmF0b3InKTtcbnZhciBvYnNlcnZhYmxlXzEgPSByZXF1aXJlKCcuLi9zeW1ib2wvb2JzZXJ2YWJsZScpO1xudmFyIElubmVyU3Vic2NyaWJlcl8xID0gcmVxdWlyZSgnLi4vSW5uZXJTdWJzY3JpYmVyJyk7XG5mdW5jdGlvbiBzdWJzY3JpYmVUb1Jlc3VsdChvdXRlclN1YnNjcmliZXIsIHJlc3VsdCwgb3V0ZXJWYWx1ZSwgb3V0ZXJJbmRleCkge1xuICAgIHZhciBkZXN0aW5hdGlvbiA9IG5ldyBJbm5lclN1YnNjcmliZXJfMS5Jbm5lclN1YnNjcmliZXIob3V0ZXJTdWJzY3JpYmVyLCBvdXRlclZhbHVlLCBvdXRlckluZGV4KTtcbiAgICBpZiAoZGVzdGluYXRpb24uaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgT2JzZXJ2YWJsZV8xLk9ic2VydmFibGUpIHtcbiAgICAgICAgaWYgKHJlc3VsdC5faXNTY2FsYXIpIHtcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uLm5leHQocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0LnN1YnNjcmliZShkZXN0aW5hdGlvbik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzQXJyYXlfMS5pc0FycmF5KHJlc3VsdCkpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHJlc3VsdC5sZW5ndGg7IGkgPCBsZW4gJiYgIWRlc3RpbmF0aW9uLmlzVW5zdWJzY3JpYmVkOyBpKyspIHtcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uLm5leHQocmVzdWx0W2ldKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICBkZXN0aW5hdGlvbi5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGlzUHJvbWlzZV8xLmlzUHJvbWlzZShyZXN1bHQpKSB7XG4gICAgICAgIHJlc3VsdC50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKCFkZXN0aW5hdGlvbi5pc1Vuc3Vic2NyaWJlZCkge1xuICAgICAgICAgICAgICAgIGRlc3RpbmF0aW9uLm5leHQodmFsdWUpO1xuICAgICAgICAgICAgICAgIGRlc3RpbmF0aW9uLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHsgcmV0dXJuIGRlc3RpbmF0aW9uLmVycm9yKGVycik7IH0pXG4gICAgICAgICAgICAudGhlbihudWxsLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAvLyBFc2NhcGluZyB0aGUgUHJvbWlzZSB0cmFwOiBnbG9iYWxseSB0aHJvdyB1bmhhbmRsZWQgZXJyb3JzXG4gICAgICAgICAgICByb290XzEucm9vdC5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHsgdGhyb3cgZXJyOyB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBkZXN0aW5hdGlvbjtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIHJlc3VsdFtpdGVyYXRvcl8xLiQkaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGZvciAodmFyIF9pID0gMCwgX2EgPSByZXN1bHQ7IF9pIDwgX2EubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgICAgICB2YXIgaXRlbSA9IF9hW19pXTtcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uLm5leHQoaXRlbSk7XG4gICAgICAgICAgICBpZiAoZGVzdGluYXRpb24uaXNVbnN1YnNjcmliZWQpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uLmlzVW5zdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICBkZXN0aW5hdGlvbi5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiByZXN1bHRbb2JzZXJ2YWJsZV8xLiQkb2JzZXJ2YWJsZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFyIG9icyA9IHJlc3VsdFtvYnNlcnZhYmxlXzEuJCRvYnNlcnZhYmxlXSgpO1xuICAgICAgICBpZiAodHlwZW9mIG9icy5zdWJzY3JpYmUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uLmVycm9yKCdpbnZhbGlkIG9ic2VydmFibGUnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBvYnMuc3Vic2NyaWJlKG5ldyBJbm5lclN1YnNjcmliZXJfMS5Jbm5lclN1YnNjcmliZXIob3V0ZXJTdWJzY3JpYmVyLCBvdXRlclZhbHVlLCBvdXRlckluZGV4KSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGRlc3RpbmF0aW9uLmVycm9yKG5ldyBUeXBlRXJyb3IoJ3Vua25vd24gdHlwZSByZXR1cm5lZCcpKTtcbiAgICB9XG59XG5leHBvcnRzLnN1YnNjcmliZVRvUmVzdWx0ID0gc3Vic2NyaWJlVG9SZXN1bHQ7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1zdWJzY3JpYmVUb1Jlc3VsdC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbmZ1bmN0aW9uIHRocm93RXJyb3IoZSkgeyB0aHJvdyBlOyB9XG5leHBvcnRzLnRocm93RXJyb3IgPSB0aHJvd0Vycm9yO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dGhyb3dFcnJvci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuLi9TdWJzY3JpYmVyJyk7XG52YXIgcnhTdWJzY3JpYmVyXzEgPSByZXF1aXJlKCcuLi9zeW1ib2wvcnhTdWJzY3JpYmVyJyk7XG5mdW5jdGlvbiB0b1N1YnNjcmliZXIobmV4dE9yT2JzZXJ2ZXIsIGVycm9yLCBjb21wbGV0ZSkge1xuICAgIGlmIChuZXh0T3JPYnNlcnZlciAmJiB0eXBlb2YgbmV4dE9yT2JzZXJ2ZXIgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGlmIChuZXh0T3JPYnNlcnZlciBpbnN0YW5jZW9mIFN1YnNjcmliZXJfMS5TdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV4dE9yT2JzZXJ2ZXI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIG5leHRPck9ic2VydmVyW3J4U3Vic2NyaWJlcl8xLiQkcnhTdWJzY3JpYmVyXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIG5leHRPck9ic2VydmVyW3J4U3Vic2NyaWJlcl8xLiQkcnhTdWJzY3JpYmVyXSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgU3Vic2NyaWJlcl8xLlN1YnNjcmliZXIobmV4dE9yT2JzZXJ2ZXIsIGVycm9yLCBjb21wbGV0ZSk7XG59XG5leHBvcnRzLnRvU3Vic2NyaWJlciA9IHRvU3Vic2NyaWJlcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXRvU3Vic2NyaWJlci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBlcnJvck9iamVjdF8xID0gcmVxdWlyZSgnLi9lcnJvck9iamVjdCcpO1xudmFyIHRyeUNhdGNoVGFyZ2V0O1xuZnVuY3Rpb24gdHJ5Q2F0Y2hlcigpIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gdHJ5Q2F0Y2hUYXJnZXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgZXJyb3JPYmplY3RfMS5lcnJvck9iamVjdC5lID0gZTtcbiAgICAgICAgcmV0dXJuIGVycm9yT2JqZWN0XzEuZXJyb3JPYmplY3Q7XG4gICAgfVxufVxuZnVuY3Rpb24gdHJ5Q2F0Y2goZm4pIHtcbiAgICB0cnlDYXRjaFRhcmdldCA9IGZuO1xuICAgIHJldHVybiB0cnlDYXRjaGVyO1xufVxuZXhwb3J0cy50cnlDYXRjaCA9IHRyeUNhdGNoO1xuO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dHJ5Q2F0Y2guanMubWFwIiwiIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbnZhciBDdXN0b21FdmVudCA9IGV4cG9ydHMuQ3VzdG9tRXZlbnQgPSBnbG9iYWwuQ3VzdG9tRXZlbnQgfHwgZnVuY3Rpb24gKCkge1xuICB2YXIgREVGQVVMVF9QQVJBTVMgPSB7IGJ1YmJsZXM6IGZhbHNlLCBjYW5jZWxhYmxlOiBmYWxzZSwgZGV0YWlsOiB1bmRlZmluZWQgfTtcblxuICBmdW5jdGlvbiBfQ3VzdG9tRXZlbnQoX2V2ZW50LCBfcGFyYW1zKSB7XG4gICAgdmFyIHBhcmFtcyA9IF9leHRlbmRzKHt9LCBERUZBVUxUX1BBUkFNUywgX3BhcmFtcyk7XG4gICAgdmFyIGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJDdXN0b21FdmVudFwiKTtcblxuICAgIGV2ZW50LmluaXRDdXN0b21FdmVudChfZXZlbnQsIHBhcmFtcy5idWJibGVzLCBwYXJhbXMuY2FuY2VsYWJsZSwgcGFyYW1zLmRldGFpbCk7XG4gICAgcmV0dXJuIGV2ZW50O1xuICB9XG5cbiAgcmV0dXJuIF9DdXN0b21FdmVudDtcbn0oKTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLk5vZGVQcm94eSA9IHVuZGVmaW5lZDtcblxudmFyIF9jcmVhdGVDbGFzcyA9IGZ1bmN0aW9uICgpIHsgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTsgfSB9IHJldHVybiBmdW5jdGlvbiAoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7IGlmIChzdGF0aWNQcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH07IH0oKTsgLyogQGZsb3cgKi9cblxudmFyIF9kb2N1bWVudCA9IHJlcXVpcmUoJ2dsb2JhbC9kb2N1bWVudCcpO1xuXG52YXIgX2RvY3VtZW50MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2RvY3VtZW50KTtcblxudmFyIF9wcm9wZXJ0eURlc2NyaXB0b3JzID0gcmVxdWlyZSgnLi9wcm9wZXJ0eURlc2NyaXB0b3JzJyk7XG5cbnZhciBfZXZlbnREZWxlZ2F0b3IgPSByZXF1aXJlKCcuL2V2ZW50RGVsZWdhdG9yJyk7XG5cbnZhciBfbW91bnRhYmxlID0gcmVxdWlyZSgnLi9tb3VudGFibGUnKTtcblxudmFyIF9pcyA9IHJlcXVpcmUoJy4vaXMnKTtcblxudmFyIF9nZXQgPSByZXF1aXJlKCcuL2dldCcpO1xuXG52YXIgX3NldCA9IHJlcXVpcmUoJy4vc2V0Jyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbnZhciBOb2RlUHJveHkgPSBleHBvcnRzLk5vZGVQcm94eSA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gTm9kZVByb3h5KG5vZGUgLyo6IEhUTUxFbGVtZW50Ki8pIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgTm9kZVByb3h5KTtcblxuICAgIHRoaXMuX25vZGUgPSBub2RlO1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKE5vZGVQcm94eSwgW3tcbiAgICBrZXk6ICdlbWl0TW91bnQnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBlbWl0TW91bnQoZm4gLyo6IEZ1bmN0aW9uKi8pIHtcbiAgICAgICgwLCBfbW91bnRhYmxlLmVtaXRNb3VudCkodGhpcy5fbm9kZSwgZm4pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2VtaXRVbm1vdW50JyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gZW1pdFVubW91bnQoZm4gLyo6IEZ1bmN0aW9uKi8pIHtcbiAgICAgICgwLCBfbW91bnRhYmxlLmVtaXRVbm1vdW50KSh0aGlzLl9ub2RlLCBmbik7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnY2hpbGRyZW4nLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjaGlsZHJlbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9ub2RlLmNoaWxkcmVuO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ3JlcGxhY2VDaGlsZCcsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlcGxhY2VDaGlsZChjaGlsZFByb3h5IC8qOiBOb2RlUHJveHkqLywgaW5kZXggLyo6IG51bWJlciovKSB7XG4gICAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGU7XG4gICAgICB2YXIgY2hpbGQgPSBjaGlsZFByb3h5Ll9ub2RlO1xuICAgICAgdmFyIHJlcGxhY2VkID0gbm9kZS5jaGlsZHJlbltpbmRleF07XG5cbiAgICAgIGlmICgoMCwgX2lzLmlzRGVmaW5lZCkocmVwbGFjZWQpKSB7XG4gICAgICAgIG5vZGUucmVwbGFjZUNoaWxkKGNoaWxkLCByZXBsYWNlZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlLmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdpbnNlcnRDaGlsZCcsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGluc2VydENoaWxkKGNoaWxkUHJveHkgLyo6IE5vZGVQcm94eSovLCBpbmRleCAvKjogbnVtYmVyKi8pIHtcbiAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZTtcbiAgICAgIHZhciBjaGlsZCA9IGNoaWxkUHJveHkuX25vZGU7XG4gICAgICB2YXIgYmVmb3JlIC8qOiBOb2RlKi8gPSBub2RlLmNoaWxkcmVuW2luZGV4XTtcblxuICAgICAgaWYgKCgwLCBfaXMuaXNEZWZpbmVkKShiZWZvcmUpKSB7XG4gICAgICAgIG5vZGUuaW5zZXJ0QmVmb3JlKGNoaWxkLCBiZWZvcmUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZCk7XG4gICAgICB9XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAncmVtb3ZlQ2hpbGQnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW1vdmVDaGlsZChjaGlsZFByb3h5IC8qOiBOb2RlUHJveHkqLykge1xuICAgICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlO1xuICAgICAgdmFyIGNoaWxkID0gY2hpbGRQcm94eS5fbm9kZTtcbiAgICAgIG5vZGUucmVtb3ZlQ2hpbGQoY2hpbGQpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2dldEF0dHJpYnV0ZScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGdldEF0dHJpYnV0ZShrZXkgLyo6IHN0cmluZyovKSB7XG4gICAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGU7XG4gICAgICB2YXIgZGVzY3JpcHRvciA9ICgwLCBfZ2V0LmdldCkoX3Byb3BlcnR5RGVzY3JpcHRvcnMuZGVzY3JpcHRvcnMsIGtleSk7XG5cbiAgICAgIGlmICghZGVzY3JpcHRvcikge1xuICAgICAgICByZXR1cm4gKDAsIF9nZXQuZ2V0KShub2RlLCBrZXkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGVzY3JpcHRvci51c2VFcXVhbFNldHRlcikge1xuICAgICAgICByZXR1cm4gKDAsIF9nZXQuZ2V0KShub2RlLCBkZXNjcmlwdG9yLmNvbXB1dGVkKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5vZGUuZ2V0QXR0cmlidXRlKGRlc2NyaXB0b3IuY29tcHV0ZWQpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ3NldEF0dHJpYnV0ZScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHNldEF0dHJpYnV0ZShrZXkgLyo6IHN0cmluZyovLCB2YWx1ZSAvKjogYW55Ki8pIHtcbiAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZTtcbiAgICAgIHZhciBkZXNjcmlwdG9yID0gKDAsIF9nZXQuZ2V0KShfcHJvcGVydHlEZXNjcmlwdG9ycy5kZXNjcmlwdG9ycywga2V5KTtcblxuICAgICAgaWYgKCFkZXNjcmlwdG9yKSB7XG4gICAgICAgICgwLCBfc2V0LnNldCkobm9kZSwga2V5LCB2YWx1ZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGNvbXB1dGVkID0gZGVzY3JpcHRvci5jb21wdXRlZDtcblxuXG4gICAgICBpZiAoZGVzY3JpcHRvci51c2VFcXVhbFNldHRlcikge1xuICAgICAgICAoMCwgX3NldC5zZXQpKG5vZGUsIGNvbXB1dGVkLCB2YWx1ZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGRlc2NyaXB0b3IuaGFzQm9vbGVhblZhbHVlICYmICF2YWx1ZSkge1xuICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShjb21wdXRlZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGRlc2NyaXB0b3IudXNlRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAoMCwgX2V2ZW50RGVsZWdhdG9yLmFkZEV2ZW50TGlzdGVuZXIpKG5vZGUsIGNvbXB1dGVkLCB2YWx1ZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoY29tcHV0ZWQsIHZhbHVlKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdyZW1vdmVBdHRyaWJ1dGUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW1vdmVBdHRyaWJ1dGUoa2V5IC8qOiBzdHJpbmcqLykge1xuICAgICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlO1xuICAgICAgdmFyIGRlc2NyaXB0b3IgPSAoMCwgX2dldC5nZXQpKF9wcm9wZXJ0eURlc2NyaXB0b3JzLmRlc2NyaXB0b3JzLCBrZXkpO1xuXG4gICAgICBpZiAoIWRlc2NyaXB0b3IpIHtcbiAgICAgICAgKDAsIF9zZXQuc2V0KShub2RlLCBrZXksIHVuZGVmaW5lZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGNvbXB1dGVkID0gZGVzY3JpcHRvci5jb21wdXRlZDtcblxuXG4gICAgICBpZiAoZGVzY3JpcHRvci51c2VTZXRBdHRyaWJ1dGUpIHtcbiAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoY29tcHV0ZWQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChkZXNjcmlwdG9yLmhhc0Jvb2xlYW5WYWx1ZSkge1xuICAgICAgICAoMCwgX3NldC5zZXQpKG5vZGUsIGNvbXB1dGVkLCBmYWxzZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGRlc2NyaXB0b3IudXNlRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAoMCwgX2V2ZW50RGVsZWdhdG9yLnJlbW92ZUV2ZW50TGlzdGVuZXIpKG5vZGUsIGNvbXB1dGVkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAoMCwgX3NldC5zZXQpKG5vZGUsIGNvbXB1dGVkLCB1bmRlZmluZWQpO1xuICAgIH1cbiAgfV0sIFt7XG4gICAga2V5OiAnY3JlYXRlRWxlbWVudCcsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQodGFnTmFtZSAvKjogc3RyaW5nKi8pIHtcbiAgICAgIHZhciBub2RlIC8qOiBIVE1MRWxlbWVudCovID0gX2RvY3VtZW50Mi5kZWZhdWx0LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gICAgICByZXR1cm4gbmV3IE5vZGVQcm94eShub2RlKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdxdWVyeVNlbGVjdG9yJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gcXVlcnlTZWxlY3RvcihzZWxlY3RvciAvKjogc3RyaW5nKi8pIHtcbiAgICAgIHZhciBub2RlIC8qOiBIVE1MRWxlbWVudCovID0gX2RvY3VtZW50Mi5kZWZhdWx0LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgcmV0dXJuIG5ldyBOb2RlUHJveHkobm9kZSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnZnJvbUVsZW1lbnQnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBmcm9tRWxlbWVudChub2RlIC8qOiBIVE1MRWxlbWVudCovKSB7XG4gICAgICByZXR1cm4gbmV3IE5vZGVQcm94eShub2RlKTtcbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gTm9kZVByb3h5O1xufSgpOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuVmlydHVhbENvbXBvbmVudCA9IHVuZGVmaW5lZDtcblxudmFyIF9jcmVhdGVDbGFzcyA9IGZ1bmN0aW9uICgpIHsgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTsgfSB9IHJldHVybiBmdW5jdGlvbiAoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7IGlmIChzdGF0aWNQcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH07IH0oKTsgLyogQGZsb3cgKi9cblxudmFyIF9jdWlkID0gcmVxdWlyZSgnY3VpZCcpO1xuXG52YXIgX2N1aWQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY3VpZCk7XG5cbnZhciBfY3JlYXRlRXZlbnRIYW5kbGVyMiA9IHJlcXVpcmUoJy4vY3JlYXRlRXZlbnRIYW5kbGVyJyk7XG5cbnZhciBfY3JlYXRlQ29tcG9uZW50UHJvcHMgPSByZXF1aXJlKCcuL2NyZWF0ZUNvbXBvbmVudFByb3BzJyk7XG5cbnZhciBfY3JlYXRlQ29tcG9zaXRlU3ViamVjdCA9IHJlcXVpcmUoJy4vY3JlYXRlQ29tcG9zaXRlU3ViamVjdCcpO1xuXG52YXIgX2NyZWF0ZU9ic2VydmFibGVGcm9tQXJyYXkgPSByZXF1aXJlKCcuL2NyZWF0ZU9ic2VydmFibGVGcm9tQXJyYXknKTtcblxudmFyIF9zeW1ib2wgPSByZXF1aXJlKCcuL3N5bWJvbCcpO1xuXG52YXIgX3NldCA9IHJlcXVpcmUoJy4vc2V0Jyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbi8qOjogaW1wb3J0IHR5cGUge09ic2VydmFibGV9IGZyb20gJ3J4anMvT2JzZXJ2YWJsZScqL1xuLyo6OiBpbXBvcnQgdHlwZSB7U3ViamVjdH0gZnJvbSAncnhqcy9TdWJqZWN0JyovXG4vKjo6IGltcG9ydCB0eXBlIHtOb2RlUHJveHl9IGZyb20gJy4vTm9kZVByb3h5JyovXG4vKjo6IGltcG9ydCB0eXBlIHtWaXJ0dWFsRWxlbWVudH0gZnJvbSAnLi90eXBlcycqL1xuXG5cbnZhciBjcmVhdGVDb21wb3NpdGVBcnJheVN1YmplY3QgPSAoMCwgX2NyZWF0ZUNvbXBvc2l0ZVN1YmplY3QuY3JlYXRlQ29tcG9zaXRlU3ViamVjdCkoX2NyZWF0ZU9ic2VydmFibGVGcm9tQXJyYXkuY3JlYXRlT2JzZXJ2YWJsZUZyb21BcnJheSk7XG5cbnZhciBhcHBlbmRVaWRUb0NvbXBvbmVudCA9IGZ1bmN0aW9uIGFwcGVuZFVpZFRvQ29tcG9uZW50KGZuIC8qOiBGdW5jdGlvbiovKSAvKjogc3RyaW5nKi8ge1xuICBpZiAoIWZuW19zeW1ib2wuJCRjb21wb25lbnRVaWRdKSB7XG4gICAgZm5bX3N5bWJvbC4kJGNvbXBvbmVudFVpZF0gPSAoMCwgX2N1aWQyLmRlZmF1bHQpKCk7XG4gIH1cblxuICByZXR1cm4gZm5bX3N5bWJvbC4kJGNvbXBvbmVudFVpZF07XG59O1xuXG52YXIgVmlydHVhbENvbXBvbmVudCA9IGV4cG9ydHMuVmlydHVhbENvbXBvbmVudCA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gVmlydHVhbENvbXBvbmVudChmbiAvKjogRnVuY3Rpb24qLywgdGFnTmFtZSAvKjogc3RyaW5nKi8sIHByb3BzIC8qOiBPYmplY3QqLywgY2hpbGRyZW4gLyo6IEFycmF5PFZpcnR1YWxFbGVtZW50PiovLCBrZXkgLyo6OiA/OiBzdHJpbmcqLykge1xuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBWaXJ0dWFsQ29tcG9uZW50KTtcblxuICAgIHRoaXMua2V5ID0ga2V5O1xuICAgIHRoaXMudGFnTmFtZSA9IHRhZ05hbWU7XG4gICAgdGhpcy5fZm4gPSBmbjtcbiAgICB0aGlzLl9wcm9wcyA9IHByb3BzO1xuICAgIHRoaXMuX2NoaWxkcmVuID0gY2hpbGRyZW47XG4gICAgdGhpcy5fZXZlbnRIYW5kbGVycyA9IFtdO1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKFZpcnR1YWxDb21wb25lbnQsIFt7XG4gICAga2V5OiAnZ2V0Tm9kZVByb3h5JyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gZ2V0Tm9kZVByb3h5KCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2luc3RhbmNlLmdldE5vZGVQcm94eSgpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2luaXRpYWxpemUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgdmFyIHByb3BzID0gdGhpcy5fcHJvcHMkID0gKDAsIF9jcmVhdGVDb21wb25lbnRQcm9wcy5jcmVhdGVDb21wb25lbnRQcm9wcykodGhpcy5fcHJvcHMpO1xuICAgICAgdmFyIGNoaWxkcmVuID0gdGhpcy5fY2hpbGRyZW4kID0gY3JlYXRlQ29tcG9zaXRlQXJyYXlTdWJqZWN0KHRoaXMuX2NoaWxkcmVuKTtcblxuICAgICAgdmFyIF9jcmVhdGVFdmVudEhhbmRsZXIgPSBmdW5jdGlvbiBfY3JlYXRlRXZlbnRIYW5kbGVyKCkge1xuICAgICAgICB2YXIgaGFuZGxlciA9IF9jcmVhdGVFdmVudEhhbmRsZXIyLmNyZWF0ZUV2ZW50SGFuZGxlci5hcHBseSh1bmRlZmluZWQsIGFyZ3VtZW50cyk7XG4gICAgICAgIF90aGlzLl9ldmVudEhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgICAgIHJldHVybiBoYW5kbGVyO1xuICAgICAgfTtcblxuICAgICAgdmFyIGluc3RhbmNlID0gdGhpcy5faW5zdGFuY2UgPSB0aGlzLl9mbi5jYWxsKG51bGwsIHsgcHJvcHM6IHByb3BzLmFzT2JqZWN0KCksIGNoaWxkcmVuOiBjaGlsZHJlbiwgY3JlYXRlRXZlbnRIYW5kbGVyOiBfY3JlYXRlRXZlbnRIYW5kbGVyIH0pO1xuICAgICAgaW5zdGFuY2UuaW5pdGlhbGl6ZSgpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2FmdGVySW5zZXJ0JyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gYWZ0ZXJJbnNlcnQoKSB7XG4gICAgICB0aGlzLl9pbnN0YW5jZS5hZnRlckluc2VydCgpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ3BhdGNoJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gcGF0Y2gobmV4dCAvKjogVmlydHVhbENvbXBvbmVudCovKSB7XG4gICAgICBuZXh0Ll9ldmVudEhhbmRsZXJzID0gdGhpcy5fZXZlbnRIYW5kbGVycztcbiAgICAgIG5leHQuX2luc3RhbmNlID0gdGhpcy5faW5zdGFuY2U7XG4gICAgICBuZXh0Ll9wcm9wcyQgPSB0aGlzLl9wcm9wcyQ7XG4gICAgICBuZXh0Ll9jaGlsZHJlbiQgPSB0aGlzLl9jaGlsZHJlbiQ7XG5cbiAgICAgIHRoaXMuX2V2ZW50SGFuZGxlcnMgPSBbXTtcbiAgICAgIHRoaXMuX2luc3RhbmNlID0gbnVsbDtcbiAgICAgIHRoaXMuX3Byb3BzJCA9IG51bGw7XG4gICAgICB0aGlzLl9jaGlsZHJlbiQgPSBudWxsO1xuXG4gICAgICBuZXh0Ll9wcm9wcyQubmV4dChuZXh0Ll9wcm9wcyk7XG4gICAgICBuZXh0Ll9jaGlsZHJlbiQubmV4dChuZXh0Ll9jaGlsZHJlbik7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnYmVmb3JlRGVzdHJveScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGJlZm9yZURlc3Ryb3koKSB7XG4gICAgICB0aGlzLl9pbnN0YW5jZS5iZWZvcmVEZXN0cm95KCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnZGVzdHJveScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gICAgICB0aGlzLl9ldmVudEhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24gKGgpIHtcbiAgICAgICAgcmV0dXJuICFoLmhhc0NvbXBsZXRlZCAmJiBoLmNvbXBsZXRlKCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuX2luc3RhbmNlLmRlc3Ryb3koKTtcbiAgICAgIHRoaXMuX2NoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgcmV0dXJuIGMuZGVzdHJveSgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnaW5zZXJ0Q2hpbGQnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBpbnNlcnRDaGlsZChfX2NoaWxkIC8qOiBhbnkqLywgX19pbmRleCAvKjogYW55Ki8pIHt9XG4gIH0sIHtcbiAgICBrZXk6ICdtb3ZlQ2hpbGQnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBtb3ZlQ2hpbGQoX19jaGlsZCAvKjogYW55Ki8sIF9faW5kZXggLyo6IGFueSovKSB7fVxuICB9LCB7XG4gICAga2V5OiAncmVtb3ZlQ2hpbGQnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW1vdmVDaGlsZChfX2NoaWxkIC8qOiBhbnkqLykge31cbiAgfV0sIFt7XG4gICAga2V5OiAnY3JlYXRlJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gY3JlYXRlKGZuIC8qOiBGdW5jdGlvbiovLCBwcm9wcyAvKjogT2JqZWN0Ki8sIGNoaWxkcmVuIC8qOiBBcnJheTxPYnNlcnZhYmxlfFZpcnR1YWxFbGVtZW50PiovKSB7XG4gICAgICB2YXIgdWlkID0gYXBwZW5kVWlkVG9Db21wb25lbnQoZm4pO1xuXG4gICAgICByZXR1cm4gbmV3IFZpcnR1YWxDb21wb25lbnQoZm4sIHVpZCwgcHJvcHMsIGNoaWxkcmVuLCBwcm9wcy5rZXkpO1xuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBWaXJ0dWFsQ29tcG9uZW50O1xufSgpO1xuXG4oMCwgX3NldC5zZXQpKFZpcnR1YWxDb21wb25lbnQucHJvdG90eXBlLCBfc3ltYm9sLiQkdmlydHVhbCwgdHJ1ZSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5WaXJ0dWFsTm9kZSA9IHVuZGVmaW5lZDtcblxudmFyIF9jcmVhdGVDbGFzcyA9IGZ1bmN0aW9uICgpIHsgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTsgfSB9IHJldHVybiBmdW5jdGlvbiAoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7IGlmIChzdGF0aWNQcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH07IH0oKTsgLyogQGZsb3cgKi9cblxudmFyIF9Ob2RlUHJveHkgPSByZXF1aXJlKCcuL05vZGVQcm94eScpO1xuXG52YXIgX3dyYXBUZXh0ID0gcmVxdWlyZSgnLi93cmFwVGV4dCcpO1xuXG52YXIgX3BhcnNlVGFnID0gcmVxdWlyZSgnLi9wYXJzZVRhZycpO1xuXG52YXIgX2JhdGNoSW5zZXJ0TWVzc2FnZXMgPSByZXF1aXJlKCcuL2JhdGNoSW5zZXJ0TWVzc2FnZXMnKTtcblxudmFyIF9jcmVhdGVQYXRjaFByb3BlcnRpZXMgPSByZXF1aXJlKCcuL2NyZWF0ZVBhdGNoUHJvcGVydGllcycpO1xuXG52YXIgX2NyZWF0ZVBhdGNoQ2hpbGRyZW4gPSByZXF1aXJlKCcuL2NyZWF0ZVBhdGNoQ2hpbGRyZW4nKTtcblxudmFyIF9jcmVhdGVDb21wb3NpdGVTdWJqZWN0ID0gcmVxdWlyZSgnLi9jcmVhdGVDb21wb3NpdGVTdWJqZWN0Jyk7XG5cbnZhciBfY3JlYXRlTm9kZVByb3BzID0gcmVxdWlyZSgnLi9jcmVhdGVOb2RlUHJvcHMnKTtcblxudmFyIF9jcmVhdGVPYnNlcnZhYmxlRnJvbUFycmF5ID0gcmVxdWlyZSgnLi9jcmVhdGVPYnNlcnZhYmxlRnJvbUFycmF5Jyk7XG5cbnZhciBfZmxhdHRlbiA9IHJlcXVpcmUoJy4vZmxhdHRlbicpO1xuXG52YXIgX3N5bWJvbCA9IHJlcXVpcmUoJy4vc3ltYm9sJyk7XG5cbnZhciBfc2V0ID0gcmVxdWlyZSgnLi9zZXQnKTtcblxucmVxdWlyZSgncnhqcy9hZGQvb3BlcmF0b3IvbWFwJyk7XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbi8qOjogaW1wb3J0IHR5cGUge09ic2VydmFibGV9IGZyb20gJ3J4anMvT2JzZXJ2YWJsZScqL1xuLyo6OiBpbXBvcnQgdHlwZSB7U3ViamVjdH0gZnJvbSAncnhqcy9TdWJqZWN0JyovXG4vKjo6IGltcG9ydCB0eXBlIHtTdWJzY3JpcHRpb259IGZyb20gJ3J4anMvU3Vic2NyaXB0aW9uJyovXG4vKjo6IGltcG9ydCB0eXBlIHtWaXJ0dWFsRWxlbWVudCwgTm9kZVByb3h5RGVjb3JhdG9yfSBmcm9tICcuL3R5cGVzJyovXG5cblxudmFyIGNyZWF0ZUNvbXBvc2l0ZVByb3BTdWJqZWN0ID0gKDAsIF9jcmVhdGVDb21wb3NpdGVTdWJqZWN0LmNyZWF0ZUNvbXBvc2l0ZVN1YmplY3QpKF9jcmVhdGVOb2RlUHJvcHMuY3JlYXRlTm9kZVByb3BzKTtcbnZhciBjcmVhdGVDb21wb3NpdGVBcnJheVN1YmplY3QgPSAoMCwgX2NyZWF0ZUNvbXBvc2l0ZVN1YmplY3QuY3JlYXRlQ29tcG9zaXRlU3ViamVjdCkoX2NyZWF0ZU9ic2VydmFibGVGcm9tQXJyYXkuY3JlYXRlT2JzZXJ2YWJsZUZyb21BcnJheSk7XG5cbnZhciBWaXJ0dWFsTm9kZSA9IGV4cG9ydHMuVmlydHVhbE5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIFZpcnR1YWxOb2RlKHRhZ05hbWUgLyo6IHN0cmluZyovLCBwcm9wcyAvKjogT2JqZWN0Ki8sIGNoaWxkcmVuIC8qOiBBcnJheTxWaXJ0dWFsRWxlbWVudD4qLywga2V5IC8qOjogPzogc3RyaW5nKi8pIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgVmlydHVhbE5vZGUpO1xuXG4gICAgdGhpcy5rZXkgPSBrZXk7XG4gICAgdGhpcy50YWdOYW1lID0gdGFnTmFtZTtcbiAgICB0aGlzLl9wcm9wcyA9IHByb3BzO1xuICAgIHRoaXMuX2NoaWxkcmVuID0gY2hpbGRyZW47XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9ucyA9IFtdO1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKFZpcnR1YWxOb2RlLCBbe1xuICAgIGtleTogJ2dldE5vZGVQcm94eScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGdldE5vZGVQcm94eSgpIHtcbiAgICAgIHJldHVybiB0aGlzLl9ub2RlUHJveHk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnaW5pdGlhbGl6ZScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XG4gICAgICB2YXIgbm9kZVByb3h5IC8qOiBOb2RlUHJveHkqLyA9IHRoaXMuX25vZGVQcm94eSA9IF9Ob2RlUHJveHkuTm9kZVByb3h5LmNyZWF0ZUVsZW1lbnQodGhpcy50YWdOYW1lKTtcbiAgICAgIHZhciBwcm9wcyQgLyo6IFN1YmplY3Q8T2JqZWN0PiovID0gdGhpcy5fcHJvcHMkID0gY3JlYXRlQ29tcG9zaXRlUHJvcFN1YmplY3QodGhpcy5fcHJvcHMpO1xuICAgICAgdmFyIGNoaWxkcmVuJCAvKjogU3ViamVjdDxBcnJheTxWaXJ0dWFsTm9kZT4+Ki8gPSB0aGlzLl9jaGlsZHJlbiQgPSBjcmVhdGVDb21wb3NpdGVBcnJheVN1YmplY3QodGhpcy5fY2hpbGRyZW4pO1xuXG4gICAgICB2YXIgbm9kZVByb3h5RGVjb3JhdG9yIC8qOiBOb2RlUHJveHlEZWNvcmF0b3IqLyA9IHtcbiAgICAgICAgaW5zZXJ0Q2hpbGQ6IGZ1bmN0aW9uIGluc2VydENoaWxkKGNoaWxkIC8qOiBWaXJ0dWFsTm9kZSovLCBpbmRleCAvKjogbnVtYmVyKi8pIHtcbiAgICAgICAgICByZXR1cm4gKDAsIF9iYXRjaEluc2VydE1lc3NhZ2VzLmJhdGNoSW5zZXJ0TWVzc2FnZXMpKGZ1bmN0aW9uIChxdWV1ZSkge1xuICAgICAgICAgICAgY2hpbGQuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgbm9kZVByb3h5Lmluc2VydENoaWxkKGNoaWxkLmdldE5vZGVQcm94eSgpLCBpbmRleCk7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGNoaWxkKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgdXBkYXRlQ2hpbGQ6IGZ1bmN0aW9uIHVwZGF0ZUNoaWxkKHByZXZpb3VzIC8qOiBWaXJ0dWFsTm9kZSovLCBuZXh0IC8qOiBWaXJ0dWFsTm9kZSovKSB7XG4gICAgICAgICAgcHJldmlvdXMucGF0Y2gobmV4dCk7XG4gICAgICAgIH0sXG4gICAgICAgIG1vdmVDaGlsZDogZnVuY3Rpb24gbW92ZUNoaWxkKHByZXZpb3VzIC8qOiBWaXJ0dWFsTm9kZSovLCBuZXh0IC8qOiBWaXJ0dWFsTm9kZSovLCBpbmRleCAvKjogbnVtYmVyKi8pIHtcbiAgICAgICAgICBwcmV2aW91cy5wYXRjaChuZXh0KTtcbiAgICAgICAgICBub2RlUHJveHkuaW5zZXJ0Q2hpbGQobmV4dC5nZXROb2RlUHJveHkoKSwgaW5kZXgpO1xuICAgICAgICB9LFxuICAgICAgICByZW1vdmVDaGlsZDogZnVuY3Rpb24gcmVtb3ZlQ2hpbGQoY2hpbGQgLyo6IFZpcnR1YWxOb2RlKi8pIHtcbiAgICAgICAgICBjaGlsZC5iZWZvcmVEZXN0cm95KCk7XG4gICAgICAgICAgbm9kZVByb3h5LnJlbW92ZUNoaWxkKGNoaWxkLmdldE5vZGVQcm94eSgpKTtcbiAgICAgICAgICBjaGlsZC5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHZhciBwcm9wU3ViID0gcHJvcHMkLnN1YnNjcmliZSgoMCwgX2NyZWF0ZVBhdGNoUHJvcGVydGllcy5jcmVhdGVQYXRjaFByb3BlcnRpZXMpKG5vZGVQcm94eSkpO1xuXG4gICAgICB2YXIgY2hpbGRyZW5TdWIgPSBjaGlsZHJlbiQubWFwKF9mbGF0dGVuLmZsYXR0ZW4pLm1hcChfd3JhcFRleHQud3JhcFRleHQpLnN1YnNjcmliZSgoMCwgX2NyZWF0ZVBhdGNoQ2hpbGRyZW4uY3JlYXRlUGF0Y2hDaGlsZHJlbikobm9kZVByb3h5RGVjb3JhdG9yKSk7XG5cbiAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMucHVzaChwcm9wU3ViKTtcbiAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMucHVzaChjaGlsZHJlblN1Yik7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnYWZ0ZXJJbnNlcnQnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBhZnRlckluc2VydCgpIHtcbiAgICAgIHRoaXMuX25vZGVQcm94eS5lbWl0TW91bnQodGhpcy5fcHJvcHMub25Nb3VudCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAncGF0Y2gnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBwYXRjaChuZXh0IC8qOiBWaXJ0dWFsTm9kZSovKSB7XG4gICAgICBuZXh0Ll9ub2RlUHJveHkgPSB0aGlzLl9ub2RlUHJveHk7XG4gICAgICBuZXh0Ll9wcm9wcyQgPSB0aGlzLl9wcm9wcyQ7XG4gICAgICBuZXh0Ll9jaGlsZHJlbiQgPSB0aGlzLl9jaGlsZHJlbiQ7XG5cbiAgICAgIG5leHQuX3Byb3BzJC5uZXh0KG5leHQuX3Byb3BzKTtcbiAgICAgIG5leHQuX2NoaWxkcmVuJC5uZXh0KG5leHQuX2NoaWxkcmVuKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdiZWZvcmVEZXN0cm95JyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gYmVmb3JlRGVzdHJveSgpIHtcbiAgICAgIHRoaXMuX25vZGVQcm94eS5lbWl0VW5tb3VudCh0aGlzLl9wcm9wcy5vblVubW91bnQpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2Rlc3Ryb3knLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgICAgdGhpcy5fc3Vic2NyaXB0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIHJldHVybiBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuX2NoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgcmV0dXJuIGMuZGVzdHJveSgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XSwgW3tcbiAgICBrZXk6ICdjcmVhdGUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjcmVhdGUoX3RhZ05hbWUgLyo6IHN0cmluZyovLCBwcm9wcyAvKjogT2JqZWN0Ki8sIGNoaWxkcmVuIC8qOiBBcnJheTxWaXJ0dWFsTm9kZXxPYnNlcnZhYmxlPiovKSB7XG4gICAgICB2YXIgdGFnTmFtZSAvKjogc3RyaW5nKi8gPSAoMCwgX3BhcnNlVGFnLnBhcnNlVGFnKShfdGFnTmFtZSwgcHJvcHMpO1xuICAgICAgdmFyIGtleSAvKjogc3RyaW5nKi8gPSBwcm9wcy5rZXkgfHwgbnVsbDtcblxuICAgICAgcmV0dXJuIG5ldyBWaXJ0dWFsTm9kZSh0YWdOYW1lLCBwcm9wcywgY2hpbGRyZW4sIGtleSk7XG4gICAgfVxuICB9XSk7XG5cbiAgcmV0dXJuIFZpcnR1YWxOb2RlO1xufSgpO1xuXG4oMCwgX3NldC5zZXQpKFZpcnR1YWxOb2RlLnByb3RvdHlwZSwgX3N5bWJvbC4kJHZpcnR1YWwsIHRydWUpOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuYXNPYnNlcnZhYmxlID0gYXNPYnNlcnZhYmxlO1xuXG52YXIgX09ic2VydmFibGUgPSByZXF1aXJlKCdyeGpzL09ic2VydmFibGUnKTtcblxudmFyIF9pcyA9IHJlcXVpcmUoJy4vaXMnKTtcblxucmVxdWlyZSgncnhqcy9hZGQvb2JzZXJ2YWJsZS9vZicpO1xuXG5mdW5jdGlvbiBhc09ic2VydmFibGUob2JqIC8qOiBhbnkqLykgLyo6IE9ic2VydmFibGU8YW55PiovIHtcbiAgaWYgKCgwLCBfaXMuaXNPYnNlcnZhYmxlKShvYmopKSB7XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIHJldHVybiBfT2JzZXJ2YWJsZS5PYnNlcnZhYmxlLm9mKG9iaik7XG59IC8qIEBmbG93ICovIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5iYXRjaEluc2VydE1lc3NhZ2VzID0gYmF0Y2hJbnNlcnRNZXNzYWdlcztcbi8qIEBmbG93ICovXG5cbi8qOjogaW1wb3J0IHR5cGUge1ZpcnR1YWxOb2RlfSBmcm9tICcuL1ZpcnR1YWxOb2RlJyovXG4vKjo6IHR5cGUgU2NvcGUgPSB7XG4gIGJhdGNoSW5Qcm9ncmVzczogYm9vbGVhbjtcbiAgcXVldWU6IEFycmF5PFZpcnR1YWxOb2RlPjtcbn0qL1xuXG5cbnZhciBzY29wZSAvKjogU2NvcGUqLyA9IHtcbiAgYmF0Y2hJblByb2dyZXNzOiBmYWxzZSxcbiAgcXVldWU6IFtdXG59O1xuXG5mdW5jdGlvbiBmbHVzaFF1ZXVlKHF1ZXVlIC8qOiBBcnJheTxWaXJ0dWFsTm9kZT4qLykgLyo6IHZvaWQqLyB7XG4gIHdoaWxlIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgdmFyIHZub2RlID0gc2NvcGUucXVldWUucG9wKCk7XG4gICAgdm5vZGUuYWZ0ZXJJbnNlcnQoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXRjaEluc2VydE1lc3NhZ2VzKGNhbGxiYWNrIC8qOiBGdW5jdGlvbiovLCBhIC8qOiBhbnkqLywgYiAvKjogYW55Ki8sIGMgLyo6IGFueSovKSAvKjogYW55Ki8ge1xuICBpZiAoc2NvcGUuYmF0Y2hJblByb2dyZXNzKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKHNjb3BlLnF1ZXVlLCBhLCBiLCBjKTtcbiAgfVxuXG4gIHNjb3BlLmJhdGNoSW5Qcm9ncmVzcyA9IHRydWU7XG5cbiAgdmFyIHJlc3VsdCA9IGNhbGxiYWNrKHNjb3BlLnF1ZXVlLCBhLCBiLCBjKTtcbiAgZmx1c2hRdWV1ZShzY29wZS5xdWV1ZSk7XG5cbiAgc2NvcGUuYmF0Y2hJblByb2dyZXNzID0gZmFsc2U7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmNyZWF0ZUNvbXBvbmVudFByb3BzID0gY3JlYXRlQ29tcG9uZW50UHJvcHM7XG5cbnZhciBfQmVoYXZpb3JTdWJqZWN0ID0gcmVxdWlyZSgncnhqcy9CZWhhdmlvclN1YmplY3QnKTtcblxudmFyIF9pcyA9IHJlcXVpcmUoJy4vaXMnKTtcblxuLyogQGZsb3cgKi9cblxuLyo6OiB0eXBlIENvbXBvbmVudFByb3BzID0ge1xuICBhc09iamVjdCAoKTogT2JqZWN0LFxuICBuZXh0ICh2OiBPYmplY3QpOiB2b2lkLFxufSovXG5mdW5jdGlvbiBjcmVhdGVDb21wb25lbnRQcm9wcyhfcHJvcHMgLyo6IE9iamVjdCovKSAvKjogQ29tcG9uZW50UHJvcHMqLyB7XG4gIHZhciBrZXlzIC8qOiBBcnJheTxzdHJpbmc+Ki8gPSBPYmplY3Qua2V5cyhfcHJvcHMpO1xuICB2YXIgcGxhaW5WYWx1ZUtleXMgLyo6IE9iamVjdCovID0ge307XG5cbiAgdmFyIHByb3BzIC8qOiBPYmplY3QqLyA9IHt9O1xuICB2YXIgbGVuIC8qOiBudW1iZXIqLyA9IGtleXMubGVuZ3RoO1xuICB2YXIgaSAvKjogbnVtYmVyKi8gPSAtMTtcblxuICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgdmFyIHZhbHVlID0gX3Byb3BzW2tleV07XG5cbiAgICBpZiAoKDAsIF9pcy5pc09ic2VydmFibGUpKHZhbHVlKSkge1xuICAgICAgcHJvcHNba2V5XSA9IHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBwbGFpblZhbHVlS2V5c1trZXldID0gdHJ1ZTtcbiAgICAgIHByb3BzW2tleV0gPSBuZXcgX0JlaGF2aW9yU3ViamVjdC5CZWhhdmlvclN1YmplY3QodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYXNPYmplY3Q6IGZ1bmN0aW9uIGFzT2JqZWN0KCkge1xuICAgICAgcmV0dXJuIHByb3BzO1xuICAgIH0sXG4gICAgbmV4dDogZnVuY3Rpb24gKF9uZXh0KSB7XG4gICAgICBmdW5jdGlvbiBuZXh0KF94KSB7XG4gICAgICAgIHJldHVybiBfbmV4dC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuXG4gICAgICBuZXh0LnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gX25leHQudG9TdHJpbmcoKTtcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBuZXh0O1xuICAgIH0oZnVuY3Rpb24gKG5leHQgLyo6IE9iamVjdCovKSB7XG4gICAgICB2YXIgaiAvKjogbnVtYmVyKi8gPSAtMTtcblxuICAgICAgd2hpbGUgKCsraiA8IGxlbikge1xuICAgICAgICB2YXIgX2tleSAvKjogc3RyaW5nKi8gPSBrZXlzW2pdO1xuICAgICAgICB2YXIgX3ZhbHVlIC8qOiBhbnkqLyA9IG5leHRbX2tleV07XG4gICAgICAgIHZhciBvbGQgLyo6IGFueSovID0gcHJvcHNbX2tleV07XG5cbiAgICAgICAgaWYgKHBsYWluVmFsdWVLZXlzW19rZXldKSB7XG4gICAgICAgICAgb2xkLm5leHQoX3ZhbHVlKTtcbiAgICAgICAgfSBlbHNlIGlmIChfdmFsdWUgIT09IG9sZCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignT2JzZXJ2YWJsZSBwcm9wIFwiJyArIF9rZXkgKyAnXCIgY2hhbmdlZCB0byBkaWZmZXJlbnQgb2JzZXJ2YWJsZScpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmNyZWF0ZUNvbXBvc2l0ZVN1YmplY3QgPSB1bmRlZmluZWQ7XG5cbnZhciBfT2JzZXJ2YWJsZSA9IHJlcXVpcmUoJ3J4anMvT2JzZXJ2YWJsZScpO1xuXG52YXIgX09ic2VydmVyID0gcmVxdWlyZSgncnhqcy9PYnNlcnZlcicpO1xuXG52YXIgX1N1YmplY3QgPSByZXF1aXJlKCdyeGpzL1N1YmplY3QnKTtcblxudmFyIF9TdWJzY3JpcHRpb24gPSByZXF1aXJlKCdyeGpzL1N1YnNjcmlwdGlvbicpO1xuXG52YXIgX0JlaGF2aW9yU3ViamVjdCA9IHJlcXVpcmUoJ3J4anMvQmVoYXZpb3JTdWJqZWN0Jyk7XG5cbnJlcXVpcmUoJ3J4anMvYWRkL29wZXJhdG9yL3N3aXRjaE1hcCcpO1xuXG4vKiBAZmxvdyAqL1xuXG52YXIgY3JlYXRlQ29tcG9zaXRlU3ViamVjdCA9IGV4cG9ydHMuY3JlYXRlQ29tcG9zaXRlU3ViamVjdCA9IGZ1bmN0aW9uIGNyZWF0ZUNvbXBvc2l0ZVN1YmplY3Qoc3dpdGNoTWFwRm4gLyo6IEZ1bmN0aW9uKi8pIC8qOiBGdW5jdGlvbiovIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICh2YWx1ZSAvKjogYW55Ki8pIC8qOiBTdWJqZWN0PGFueT4qLyB7XG4gICAgdmFyIGJlaGF2aW9yIC8qOiBCZWhhdmlvclN1YmplY3QqLyA9IG5ldyBfQmVoYXZpb3JTdWJqZWN0LkJlaGF2aW9yU3ViamVjdCh2YWx1ZSk7XG5cbiAgICB2YXIgb2JzZXJ2YWJsZSAvKjogT2JzZXJ2YWJsZSovID0gX09ic2VydmFibGUuT2JzZXJ2YWJsZS5jcmVhdGUoZnVuY3Rpb24gKG9ic2VydmVyIC8qOiBPYnNlcnZlciovKSAvKjogRnVuY3Rpb24qLyB7XG4gICAgICB2YXIgc3Vic2NyaXB0aW9uIC8qOiBTdWJzY3JpcHRpb24qLyA9IGJlaGF2aW9yLnN3aXRjaE1hcChzd2l0Y2hNYXBGbikuc3Vic2NyaWJlKG9ic2VydmVyKTtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICByZXR1cm4gX1N1YmplY3QuU3ViamVjdC5jcmVhdGUoYmVoYXZpb3IsIG9ic2VydmFibGUpO1xuICB9O1xufTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmNyZWF0ZUV2ZW50SGFuZGxlciA9IGNyZWF0ZUV2ZW50SGFuZGxlcjtcblxudmFyIF9PYnNlcnZhYmxlID0gcmVxdWlyZSgncnhqcy9PYnNlcnZhYmxlJyk7XG5cbnZhciBfT2JzZXJ2ZXIgPSByZXF1aXJlKCdyeGpzL09ic2VydmVyJyk7XG5cbnZhciBfU3ViamVjdCA9IHJlcXVpcmUoJ3J4anMvU3ViamVjdCcpO1xuXG52YXIgX1N1YnNjcmlwdGlvbiA9IHJlcXVpcmUoJ3J4anMvU3Vic2NyaXB0aW9uJyk7XG5cbnZhciBfaXMgPSByZXF1aXJlKCcuL2lzJyk7XG5cbnJlcXVpcmUoJ3J4anMvYWRkL29wZXJhdG9yL21hcCcpO1xuXG5yZXF1aXJlKCdyeGpzL2FkZC9vcGVyYXRvci9tYXBUbycpO1xuXG5yZXF1aXJlKCdyeGpzL2FkZC9vcGVyYXRvci9zaGFyZScpO1xuXG4vKiBAZmxvdyAqL1xuXG5mdW5jdGlvbiB3cmFwTWFwRm4ob2JzIC8qOiBTdWJqZWN0Ki8sIG1hcEZuIC8qOjogPzogYW55Ki8pIC8qOiBPYnNlcnZhYmxlKi8ge1xuICB2YXIgbWFwRm5Jc0RlZmluZWQgLyo6IGJvb2xlYW4qLyA9ICgwLCBfaXMuaXNEZWZpbmVkKShtYXBGbik7XG4gIHZhciBtYXBGbklzRnVuY3Rpb24gLyo6IGJvb2xlYW4qLyA9ICgwLCBfaXMuaXNGdW5jdGlvbikobWFwRm4pO1xuXG4gIGlmIChtYXBGbklzRGVmaW5lZCAmJiBtYXBGbklzRnVuY3Rpb24pIHtcbiAgICByZXR1cm4gb2JzLm1hcChtYXBGbik7XG4gIH0gZWxzZSBpZiAobWFwRm5Jc0RlZmluZWQpIHtcbiAgICByZXR1cm4gb2JzLm1hcFRvKG1hcEZuKTtcbiAgfVxuXG4gIHJldHVybiBvYnM7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUV2ZW50SGFuZGxlcihtYXBGbiAvKjo6ID86IGFueSovLCBpbml0IC8qOjogPzogYW55Ki8pIC8qOiBTdWJqZWN0Ki8ge1xuICB2YXIgc3ViamVjdCAvKjogU3ViamVjdCovID0gbmV3IF9TdWJqZWN0LlN1YmplY3QoKTtcblxuICB2YXIgb2JzZXJ2YWJsZSAvKjogT2JzZXJ2YWJsZSovID0gX09ic2VydmFibGUuT2JzZXJ2YWJsZS5jcmVhdGUoZnVuY3Rpb24gKG9ic2VydmVyIC8qOiBPYnNlcnZlciovKSAvKjogRnVuY3Rpb24qLyB7XG4gICAgdmFyIHN1YnNjcmlwdGlvbiAvKjogU3Vic2NyaXB0aW9uKi8gPSB3cmFwTWFwRm4oc3ViamVjdCwgbWFwRm4pLnN1YnNjcmliZShvYnNlcnZlcik7XG5cbiAgICBpZiAoKDAsIF9pcy5pc0RlZmluZWQpKGluaXQpKSB7XG4gICAgICBvYnNlcnZlci5uZXh0KGluaXQpO1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9O1xuICB9KTtcblxuICByZXR1cm4gX1N1YmplY3QuU3ViamVjdC5jcmVhdGUoc3ViamVjdCwgb2JzZXJ2YWJsZS5zaGFyZSgpKTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmNyZWF0ZU5vZGVQcm9wcyA9IGNyZWF0ZU5vZGVQcm9wcztcblxudmFyIF9PYnNlcnZhYmxlID0gcmVxdWlyZSgncnhqcy9PYnNlcnZhYmxlJyk7XG5cbnZhciBfZXZlbnRzTGlzdCA9IHJlcXVpcmUoJy4vZXZlbnRzTGlzdCcpO1xuXG52YXIgX2FzT2JzZXJ2YWJsZSA9IHJlcXVpcmUoJy4vYXNPYnNlcnZhYmxlJyk7XG5cbnZhciBfaXMgPSByZXF1aXJlKCcuL2lzJyk7XG5cbnJlcXVpcmUoJ3J4anMvYWRkL29ic2VydmFibGUvb2YnKTtcblxucmVxdWlyZSgncnhqcy9hZGQvb2JzZXJ2YWJsZS9jb21iaW5lTGF0ZXN0Jyk7XG5cbi8qIEBmbG93ICovXG5cbnZhciB3cmFwVmFsdWUgPSBmdW5jdGlvbiB3cmFwVmFsdWUoa2V5LCB2YWx1ZSkge1xuICBpZiAoX2V2ZW50c0xpc3QuZXZlbnRMaXN0TWFwW2tleV0gJiYgKDAsIF9pcy5pc1N1YmplY3QpKHZhbHVlKSkge1xuICAgIHJldHVybiAoMCwgX2FzT2JzZXJ2YWJsZS5hc09ic2VydmFibGUpKHZhbHVlLm5leHQuYmluZCh2YWx1ZSkpO1xuICB9XG5cbiAgcmV0dXJuICgwLCBfYXNPYnNlcnZhYmxlLmFzT2JzZXJ2YWJsZSkodmFsdWUpO1xufTtcblxuZnVuY3Rpb24gY3JlYXRlTm9kZVByb3BzKG9iaiAvKjogT2JqZWN0Ki8pIC8qOiBPYnNlcnZhYmxlPE9iamVjdD4qLyB7XG4gIGlmICgoMCwgX2lzLmlzRW1wdHlPYmplY3QpKG9iaikpIHtcbiAgICByZXR1cm4gX09ic2VydmFibGUuT2JzZXJ2YWJsZS5vZihvYmopO1xuICB9XG5cbiAgdmFyIGtleXMgLyo6IEFycmF5PHN0cmluZz4qLyA9IE9iamVjdC5rZXlzKG9iaik7XG4gIHZhciBsZW4gLyo6IG51bWJlciovID0ga2V5cy5sZW5ndGg7XG4gIHZhciB2YWx1ZXMgLyo6IEFycmF5PE9ic2VydmFibGU+Ki8gPSBBcnJheShsZW4pO1xuICB2YXIgaSAvKjogbnVtYmVyKi8gPSAtMTtcblxuICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgdmFyIGtleSAvKjogc3RyaW5nKi8gPSBrZXlzW2ldO1xuICAgIHZhciB2YWx1ZSAvKjogYW55Ki8gPSBvYmpba2V5XTtcbiAgICB2YWx1ZXNbaV0gPSB3cmFwVmFsdWUoa2V5LCB2YWx1ZSk7XG4gIH1cblxuICByZXR1cm4gX09ic2VydmFibGUuT2JzZXJ2YWJsZS5jb21iaW5lTGF0ZXN0KHZhbHVlcywgZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbiksIF9rZXkgPSAwOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICBhcmdzW19rZXldID0gYXJndW1lbnRzW19rZXldO1xuICAgIH1cblxuICAgIHZhciBuZXdPYmogLyo6IE9iamVjdCovID0ge307XG4gICAgaSA9IC0xO1xuXG4gICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgdmFyIF9rZXkyIC8qOiBzdHJpbmcqLyA9IGtleXNbaV07XG4gICAgICBuZXdPYmpbX2tleTJdID0gYXJnc1tpXTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3T2JqO1xuICB9KTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmNyZWF0ZU9ic2VydmFibGVGcm9tQXJyYXkgPSBjcmVhdGVPYnNlcnZhYmxlRnJvbUFycmF5O1xuXG52YXIgX09ic2VydmFibGUgPSByZXF1aXJlKCdyeGpzL09ic2VydmFibGUnKTtcblxudmFyIF9hc09ic2VydmFibGUgPSByZXF1aXJlKCcuL2FzT2JzZXJ2YWJsZScpO1xuXG5yZXF1aXJlKCdyeGpzL2FkZC9vYnNlcnZhYmxlL29mJyk7XG5cbnJlcXVpcmUoJ3J4anMvYWRkL29ic2VydmFibGUvY29tYmluZUxhdGVzdCcpO1xuXG5mdW5jdGlvbiBfdG9Db25zdW1hYmxlQXJyYXkoYXJyKSB7IGlmIChBcnJheS5pc0FycmF5KGFycikpIHsgZm9yICh2YXIgaSA9IDAsIGFycjIgPSBBcnJheShhcnIubGVuZ3RoKTsgaSA8IGFyci5sZW5ndGg7IGkrKykgeyBhcnIyW2ldID0gYXJyW2ldOyB9IHJldHVybiBhcnIyOyB9IGVsc2UgeyByZXR1cm4gQXJyYXkuZnJvbShhcnIpOyB9IH0gLyogQGZsb3cgKi9cblxuZnVuY3Rpb24gY3JlYXRlT2JzZXJ2YWJsZUZyb21BcnJheShhcnIgLyo6IEFycmF5PGFueT4qLykgLyo6IE9ic2VydmFibGU8QXJyYXk8YW55Pj4qLyB7XG4gIGlmIChhcnIubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIF9PYnNlcnZhYmxlLk9ic2VydmFibGUub2YoYXJyKTtcbiAgfVxuXG4gIHZhciBvYnNlcnZhYmxlcyAvKjogQXJyYXk8T2JzZXJ2YWJsZT4qLyA9IGFyci5tYXAoX2FzT2JzZXJ2YWJsZS5hc09ic2VydmFibGUpO1xuXG4gIHJldHVybiBfT2JzZXJ2YWJsZS5PYnNlcnZhYmxlLmNvbWJpbmVMYXRlc3QuYXBwbHkoX09ic2VydmFibGUuT2JzZXJ2YWJsZSwgX3RvQ29uc3VtYWJsZUFycmF5KG9ic2VydmFibGVzKSk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5jcmVhdGVQYXRjaENoaWxkcmVuID0gdW5kZWZpbmVkO1xuXG52YXIgX2RpZnQgPSByZXF1aXJlKCdkaWZ0Jyk7XG5cbnZhciBfZGlmdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9kaWZ0KTtcblxudmFyIF9rZXlJbmRleCA9IHJlcXVpcmUoJy4va2V5SW5kZXgnKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuLyogQGZsb3cgKi9cblxuLyo6OiBpbXBvcnQgdHlwZSB7VmlydHVhbEVsZW1lbnQsIE5vZGVQcm94eURlY29yYXRvcn0gZnJvbSAnLi90eXBlcycqL1xuXG5cbnZhciBrZXlGbiAvKjogRnVuY3Rpb24qLyA9IGZ1bmN0aW9uIGtleUZuKGEpIHtcbiAgcmV0dXJuIGEua2V5O1xufTtcblxudmFyIHBhdGNoID0gZnVuY3Rpb24gcGF0Y2goZGVjb3JhdG9yIC8qOiBOb2RlUHJveHlEZWNvcmF0b3IqLywgcHJldmlvdXNDaGlsZHJlbiAvKjogQXJyYXk8VmlydHVhbEVsZW1lbnQ+Ki8sIG5leHRDaGlsZHJlbiAvKjogQXJyYXk8VmlydHVhbEVsZW1lbnQ+Ki8pIC8qOiB2b2lkKi8ge1xuICB2YXIgcHJldmlvdXNJbmRleCA9ICgwLCBfa2V5SW5kZXgua2V5SW5kZXgpKHByZXZpb3VzQ2hpbGRyZW4pO1xuICB2YXIgbmV4dEluZGV4ID0gKDAsIF9rZXlJbmRleC5rZXlJbmRleCkobmV4dENoaWxkcmVuKTtcblxuICBmdW5jdGlvbiBhcHBseSh0eXBlIC8qOiBudW1iZXIqLywgcHJldmlvdXMgLyo6IE9iamVjdCovLCBuZXh0IC8qOiBPYmplY3QqLywgaW5kZXggLyo6IG51bWJlciovKSAvKjogdm9pZCovIHtcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgX2RpZnQuQ1JFQVRFOlxuICAgICAgICBkZWNvcmF0b3IuaW5zZXJ0Q2hpbGQobmV4dC52bm9kZSwgaW5kZXgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgX2RpZnQuVVBEQVRFOlxuICAgICAgICBkZWNvcmF0b3IudXBkYXRlQ2hpbGQocHJldmlvdXMudm5vZGUsIG5leHQudm5vZGUsIGluZGV4KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIF9kaWZ0Lk1PVkU6XG4gICAgICAgIGRlY29yYXRvci5tb3ZlQ2hpbGQocHJldmlvdXMudm5vZGUsIG5leHQudm5vZGUsIGluZGV4KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIF9kaWZ0LlJFTU9WRTpcbiAgICAgICAgZGVjb3JhdG9yLnJlbW92ZUNoaWxkKHByZXZpb3VzLnZub2RlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm47XG4gICAgfVxuICB9XG5cbiAgKDAsIF9kaWZ0Mi5kZWZhdWx0KShwcmV2aW91c0luZGV4LCBuZXh0SW5kZXgsIGFwcGx5LCBrZXlGbik7XG59O1xuXG52YXIgY3JlYXRlUGF0Y2hDaGlsZHJlbiA9IGV4cG9ydHMuY3JlYXRlUGF0Y2hDaGlsZHJlbiA9IGZ1bmN0aW9uIGNyZWF0ZVBhdGNoQ2hpbGRyZW4oZGVjb3JhdG9yIC8qOiBOb2RlUHJveHlEZWNvcmF0b3IqLykgLyo6IEZ1bmN0aW9uKi8ge1xuICB2YXIgcHJldmlvdXMgLyo6IEFycmF5PFZpcnR1YWxFbGVtZW50PiovID0gW107XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChuZXh0IC8qOiBBcnJheTxWaXJ0dWFsRWxlbWVudD4qLykgLyo6IEFycmF5PFZpcnR1YWxFbGVtZW50PiovIHtcbiAgICBpZiAocHJldmlvdXMubGVuZ3RoICE9PSAwIHx8IG5leHQubGVuZ3RoICE9PSAwKSB7XG4gICAgICBwYXRjaChkZWNvcmF0b3IsIHByZXZpb3VzLCBuZXh0KTtcbiAgICB9XG5cbiAgICBwcmV2aW91cyA9IG5leHQ7XG4gICAgcmV0dXJuIG5leHQ7XG4gIH07XG59OyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuY3JlYXRlUGF0Y2hQcm9wZXJ0aWVzID0gY3JlYXRlUGF0Y2hQcm9wZXJ0aWVzO1xuLyogQGZsb3cgKi9cblxuLyo6OiBpbXBvcnQgdHlwZSB7Tm9kZVByb3h5fSBmcm9tICcuL05vZGVQcm94eScqL1xuXG5cbmZ1bmN0aW9uIHBhdGNoUHJvcGVydGllcyhub2RlUHJveHkgLyo6IE5vZGVQcm94eSovLCBwcm9wcyAvKjogT2JqZWN0Ki8sIG9sZFByb3BzIC8qOiBPYmplY3QqLykgLyo6IE9iamVjdCovIHtcbiAgZm9yICh2YXIga2V5IGluIHByb3BzKSB7XG4gICAgaWYgKHByb3BzW2tleV0gIT09IG9sZFByb3BzW2tleV0pIHtcbiAgICAgIG5vZGVQcm94eS5zZXRBdHRyaWJ1dGUoa2V5LCBwcm9wc1trZXldKTtcbiAgICB9XG4gIH1cblxuICBmb3IgKHZhciBfa2V5IGluIG9sZFByb3BzKSB7XG4gICAgaWYgKCEoX2tleSBpbiBwcm9wcykpIHtcbiAgICAgIG5vZGVQcm94eS5yZW1vdmVBdHRyaWJ1dGUoX2tleSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHByb3BzO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVQYXRjaFByb3BlcnRpZXMobm9kZVByb3h5IC8qOiBOb2RlUHJveHkqLykgLyo6IEZ1bmN0aW9uKi8ge1xuICB2YXIgcHJldmlvdXMgLyo6IE9iamVjdCovID0ge307XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChuZXh0IC8qOiBPYmplY3QqLykgLyo6IHZvaWQqLyB7XG4gICAgcHJldmlvdXMgPSBwYXRjaFByb3BlcnRpZXMobm9kZVByb3h5LCBuZXh0LCBwcmV2aW91cyk7XG4gIH07XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG4vKiBAZmxvdyAqL1xuXG52YXIgZW1wdHlPYmplY3QgPSBleHBvcnRzLmVtcHR5T2JqZWN0ID0gT2JqZWN0LmZyZWV6ZSh7fSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5yZW1vdmVFdmVudExpc3RlbmVyID0gZXhwb3J0cy5hZGRFdmVudExpc3RlbmVyID0gdW5kZWZpbmVkO1xuXG52YXIgX2RvbURlbGVnYXRvciA9IHJlcXVpcmUoJ2RvbS1kZWxlZ2F0b3InKTtcblxudmFyIF9kb21EZWxlZ2F0b3IyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfZG9tRGVsZWdhdG9yKTtcblxudmFyIF9kb21EZWxlZ2F0b3IzID0gcmVxdWlyZSgnZG9tLWRlbGVnYXRvci9kb20tZGVsZWdhdG9yJyk7XG5cbnZhciBfZG9tRGVsZWdhdG9yNCA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2RvbURlbGVnYXRvcjMpO1xuXG52YXIgX2V2ZW50c0xpc3QgPSByZXF1aXJlKCcuL2V2ZW50c0xpc3QnKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxudmFyIGRlbGVnYXRvciAvKjogRG9tRGVsZWdhdG9yKi8gPSAoMCwgX2RvbURlbGVnYXRvcjIuZGVmYXVsdCkoKTsgLyogQGZsb3cgKi9cblxudmFyIGxlbiAvKjogbnVtYmVyKi8gPSBfZXZlbnRzTGlzdC5ldmVudHNMaXN0Lmxlbmd0aDtcbnZhciBpIC8qOiBudW1iZXIqLyA9IC0xO1xuXG53aGlsZSAoKytpIDwgbGVuKSB7XG4gIHZhciBldmVudCAvKjogc3RyaW5nKi8gPSBfZXZlbnRzTGlzdC5ldmVudHNMaXN0W2ldLnRvTG93ZXJDYXNlKCk7XG4gIGRlbGVnYXRvci5saXN0ZW5UbyhldmVudCk7XG59XG5cbnZhciBhZGRFdmVudExpc3RlbmVyID0gZXhwb3J0cy5hZGRFdmVudExpc3RlbmVyID0gZGVsZWdhdG9yLmFkZEV2ZW50TGlzdGVuZXIuYmluZChkZWxlZ2F0b3IpO1xudmFyIHJlbW92ZUV2ZW50TGlzdGVuZXIgPSBleHBvcnRzLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBkZWxlZ2F0b3IucmVtb3ZlRXZlbnRMaXN0ZW5lci5iaW5kKGRlbGVnYXRvcik7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG4vKiBAZmxvdyAqL1xuXG52YXIgZXZlbnRzTGlzdCAvKjogQXJyYXk8c3RyaW5nPiovID0gZXhwb3J0cy5ldmVudHNMaXN0ID0gW1wiQWJvcnRcIiwgXCJCbHVyXCIsIFwiQ2FuY2VsXCIsIFwiQ2FuUGxheVwiLCBcIkNhblBsYXlUaHJvdWdoXCIsIFwiQ2hhbmdlXCIsIFwiQ2xpY2tcIiwgXCJDb21wb3NpdGlvblN0YXJ0XCIsIFwiQ29tcG9zaXRpb25VcGRhdGVcIiwgXCJDb21wb3NpdGlvbkVuZFwiLCBcIkNvbnRleHRNZW51XCIsIFwiQ29weVwiLCBcIkN1ZUNoYW5nZVwiLCBcIkN1dFwiLCBcIkRibENsaWNrXCIsIFwiRHJhZ1wiLCBcIkRyYWdFbmRcIiwgXCJEcmFnRXhpdFwiLCBcIkRyYWdFbnRlclwiLCBcIkRyYWdMZWF2ZVwiLCBcIkRyYWdPdmVyXCIsIFwiRHJhZ1N0YXJ0XCIsIFwiRHJvcFwiLCBcIkR1cmF0aW9uQ2hhbmdlXCIsIFwiRW1wdGllZFwiLCBcIkVuY3J5cHRlZFwiLCBcIkVuZGVkXCIsIFwiRXJyb3JcIiwgXCJGb2N1c1wiLCBcIkZvY3VzSW5cIiwgXCJGb2N1c091dFwiLCBcIklucHV0XCIsIFwiSW52YWxpZFwiLCBcIktleURvd25cIiwgXCJLZXlQcmVzc1wiLCBcIktleVVwXCIsIFwiTG9hZFwiLCBcIkxvYWRlZERhdGFcIiwgXCJMb2FkZWRNZXRhRGF0YVwiLCBcIkxvYWRTdGFydFwiLCBcIk1vdXNlRG93blwiLCBcIk1vdXNlRW50ZXJcIiwgXCJNb3VzZUxlYXZlXCIsIFwiTW91c2VNb3ZlXCIsIFwiTW91c2VPdXRcIiwgXCJNb3VzZU92ZXJcIiwgXCJNb3VzZVVwXCIsIFwiUGFzdGVcIiwgXCJQYXVzZVwiLCBcIlBsYXlcIiwgXCJQbGF5aW5nXCIsIFwiUHJvZ3Jlc3NcIiwgXCJSYXRlQ2hhbmdlXCIsIFwiUmVzZXRcIiwgXCJSZXNpemVcIiwgXCJTY3JvbGxcIiwgXCJTZWFyY2hcIiwgXCJTZWVrZWRcIiwgXCJTZWVraW5nXCIsIFwiU2VsZWN0XCIsIFwiU2hvd1wiLCBcIlN0YWxsZWRcIiwgXCJTdWJtaXRcIiwgXCJTdXNwZW5kXCIsIFwiVGltZVVwZGF0ZVwiLCBcIlRvZ2dsZVwiLCBcIlRvdWNoQ2FuY2VsXCIsIFwiVG91Y2hFbmRcIiwgXCJUb3VjaE1vdmVcIiwgXCJUb3VjaFN0YXJ0XCIsIFwiVm9sdW1lQ2hhbmdlXCIsIFwiV2FpdGluZ1wiLCBcIldoZWVsXCIsXG5cbi8vIGN1c3RvbVxuXCJNb3VudFwiLCBcIlVubW91bnRcIl07XG5cbnZhciBldmVudExpc3RNYXAgLyo6IE9iamVjdCovID0gZXhwb3J0cy5ldmVudExpc3RNYXAgPSBldmVudHNMaXN0LnJlZHVjZShmdW5jdGlvbiAoYWNjLCBldmVudCkge1xuICBhY2NbXCJvblwiICsgZXZlbnRdID0gdHJ1ZTtcbiAgcmV0dXJuIGFjYztcbn0sIHt9KTsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZmxhdHRlbiA9IGZsYXR0ZW47XG4vKiBAZmxvdyAqL1xuXG5mdW5jdGlvbiBmbGF0dGVuKGFyciAvKjogQXJyYXk8YW55PiovKSAvKjogQXJyYXk8YW55PiovIHtcbiAgdmFyIGxlbiAvKjogbnVtYmVyKi8gPSBhcnIubGVuZ3RoO1xuICB2YXIgaSAvKjogbnVtYmVyKi8gPSAtMTtcbiAgdmFyIHJlc3VsdCAvKjogQXJyYXk8YW55PiovID0gW107XG5cbiAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgIHZhciBtZW1iZXIgLyo6IGFueSovID0gYXJyW2ldO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkobWVtYmVyKSkge1xuICAgICAgcmVzdWx0ID0gcmVzdWx0LmNvbmNhdChmbGF0dGVuKG1lbWJlcikpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucHVzaChtZW1iZXIpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmdldCA9IGdldDtcbmZ1bmN0aW9uIGdldChvYmosIGtleSkge1xuICByZXR1cm4gb2JqW2tleV07XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5oID0gaDtcblxudmFyIF9WaXJ0dWFsQ29tcG9uZW50ID0gcmVxdWlyZSgnLi9WaXJ0dWFsQ29tcG9uZW50Jyk7XG5cbnZhciBfVmlydHVhbE5vZGUgPSByZXF1aXJlKCcuL1ZpcnR1YWxOb2RlJyk7XG5cbnZhciBfaXMgPSByZXF1aXJlKCcuL2lzJyk7XG5cbnZhciBfZmxhdHRlbiA9IHJlcXVpcmUoJy4vZmxhdHRlbicpO1xuXG52YXIgX2VtcHR5T2JqZWN0ID0gcmVxdWlyZSgnLi9lbXB0eU9iamVjdCcpO1xuXG4vKjo6IGltcG9ydCB0eXBlIHtWaXJ0dWFsRWxlbWVudH0gZnJvbSAnLi90eXBlcycqLyAvKiBAZmxvdyB3ZWFrICovXG5cbmZ1bmN0aW9uIGgodGFnTmFtZSwgX3Byb3BzKSAvKjogVmlydHVhbEVsZW1lbnQqLyB7XG4gIGZvciAodmFyIF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBfY2hpbGRyZW4gPSBBcnJheShfbGVuID4gMiA/IF9sZW4gLSAyIDogMCksIF9rZXkgPSAyOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgX2NoaWxkcmVuW19rZXkgLSAyXSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgfVxuXG4gIHZhciBjaGlsZHJlbiA9ICgwLCBfZmxhdHRlbi5mbGF0dGVuKShfY2hpbGRyZW4pO1xuICB2YXIgcHJvcHMgPSBfcHJvcHMgfHwgX2VtcHR5T2JqZWN0LmVtcHR5T2JqZWN0O1xuXG4gIGlmICgoMCwgX2lzLmlzU3RyaW5nKSh0YWdOYW1lKSkge1xuICAgIHJldHVybiBfVmlydHVhbE5vZGUuVmlydHVhbE5vZGUuY3JlYXRlKHRhZ05hbWUsIHByb3BzLCBjaGlsZHJlbik7XG4gIH1cblxuICByZXR1cm4gX1ZpcnR1YWxDb21wb25lbnQuVmlydHVhbENvbXBvbmVudC5jcmVhdGUodGFnTmFtZSwgcHJvcHMsIGNoaWxkcmVuKTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnJlbmRlciA9IGV4cG9ydHMuaCA9IHVuZGVmaW5lZDtcblxudmFyIF9oID0gcmVxdWlyZSgnLi9oJyk7XG5cbnZhciBfcmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXInKTtcblxuZnVuY3Rpb24gWW9saygpIHt9XG5Zb2xrLnByb3RvdHlwZSA9IHsgaDogX2guaCwgcmVuZGVyOiBfcmVuZGVyLnJlbmRlciB9O1xuXG5leHBvcnRzLmggPSBfaC5oO1xuZXhwb3J0cy5yZW5kZXIgPSBfcmVuZGVyLnJlbmRlcjtcbmV4cG9ydHMuZGVmYXVsdCA9IG5ldyBZb2xrKCk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5pc0RlZmluZWQgPSBpc0RlZmluZWQ7XG5leHBvcnRzLmlzRW1wdHlPYmplY3QgPSBpc0VtcHR5T2JqZWN0O1xuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcbmV4cG9ydHMuaXNPYnNlcnZhYmxlID0gaXNPYnNlcnZhYmxlO1xuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuZXhwb3J0cy5pc1N1YmplY3QgPSBpc1N1YmplY3Q7XG5leHBvcnRzLmlzVmlydHVhbCA9IGlzVmlydHVhbDtcblxudmFyIF9PYnNlcnZhYmxlID0gcmVxdWlyZSgncnhqcy9PYnNlcnZhYmxlJyk7XG5cbnZhciBfU3ViamVjdCA9IHJlcXVpcmUoJ3J4anMvU3ViamVjdCcpO1xuXG52YXIgX3N5bWJvbCA9IHJlcXVpcmUoJy4vc3ltYm9sJyk7XG5cbmZ1bmN0aW9uIGlzRGVmaW5lZChvYmogLyo6IGFueSovKSAvKjogYm9vbGVhbiovIHtcbiAgcmV0dXJuIHR5cGVvZiBvYmogIT09ICd1bmRlZmluZWQnO1xufSAvKiBAZmxvdyAqL1xuXG5mdW5jdGlvbiBpc0VtcHR5T2JqZWN0KG9iaiAvKjogYW55Ki8pIC8qOiBib29sZWFuKi8ge1xuICByZXR1cm4gT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPT09IDA7XG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24ob2JqIC8qOiBhbnkqLykgLyo6IGJvb2xlYW4qLyB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIob2JqIC8qOiBhbnkqLykgLyo6IGJvb2xlYW4qLyB7XG4gIHJldHVybiB0eXBlb2Ygb2JqID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYnNlcnZhYmxlKG9iaiAvKjogYW55Ki8pIC8qOiBib29sZWFuKi8ge1xuICByZXR1cm4gb2JqIGluc3RhbmNlb2YgX09ic2VydmFibGUuT2JzZXJ2YWJsZTtcbn1cblxuZnVuY3Rpb24gaXNTdHJpbmcob2JqIC8qOiBhbnkqLykgLyo6IGJvb2xlYW4qLyB7XG4gIHJldHVybiB0eXBlb2Ygb2JqID09PSAnc3RyaW5nJztcbn1cblxuZnVuY3Rpb24gaXNTdWJqZWN0KG9iaiAvKjogYW55Ki8pIC8qOiBib29sZWFuKi8ge1xuICByZXR1cm4gb2JqIGluc3RhbmNlb2YgX1N1YmplY3QuU3ViamVjdDtcbn1cblxuZnVuY3Rpb24gaXNWaXJ0dWFsKG9iaiAvKjogYW55Ki8pIC8qOiBib29sZWFuKi8ge1xuICByZXR1cm4gISFvYmogJiYgb2JqW19zeW1ib2wuJCR2aXJ0dWFsXTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmtleUluZGV4ID0ga2V5SW5kZXg7XG4vKiBAZmxvdyAqL1xuXG4vKjo6IGltcG9ydCB0eXBlIHtWaXJ0dWFsTm9kZX0gZnJvbSAnLi9WaXJ0dWFsTm9kZScqL1xuZnVuY3Rpb24ga2V5SW5kZXgoY2hpbGRyZW4gLyo6IEFycmF5PFZpcnR1YWxOb2RlPiovKSAvKjogQXJyYXk8T2JqZWN0PiovIHtcbiAgdmFyIGxlbiAvKjogbnVtYmVyKi8gPSBjaGlsZHJlbi5sZW5ndGg7XG4gIHZhciBhcnIgLyo6IEFycmF5PE9iamVjdD4qLyA9IFtdO1xuICB2YXIgaSAvKjogbnVtYmVyKi8gPSAtMTtcblxuICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgdmFyIGNoaWxkIC8qOiBWaXJ0dWFsTm9kZSovID0gY2hpbGRyZW5baV07XG5cbiAgICBpZiAoIWNoaWxkKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBhcnIucHVzaCh7XG4gICAgICBrZXk6IGNoaWxkLmtleSA/IGNoaWxkLnRhZ05hbWUgKyAnLScgKyBjaGlsZC5rZXkgOiBjaGlsZC50YWdOYW1lLFxuICAgICAgdm5vZGU6IGNoaWxkXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gYXJyO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZW1pdE1vdW50ID0gZW1pdE1vdW50O1xuZXhwb3J0cy5lbWl0VW5tb3VudCA9IGVtaXRVbm1vdW50O1xuXG52YXIgX0N1c3RvbUV2ZW50ID0gcmVxdWlyZSgnLi9DdXN0b21FdmVudCcpO1xuXG52YXIgX2lzID0gcmVxdWlyZSgnLi9pcycpO1xuXG4vKiBAZmxvdyAqL1xuXG5mdW5jdGlvbiBlbWl0TW91bnQobm9kZSAvKjogSFRNTEVsZW1lbnQqLywgZm4gLyo6IEZ1bmN0aW9uIHwgdm9pZCovKSAvKjogdm9pZCovIHtcbiAgaWYgKCgoMCwgX2lzLmlzRnVuY3Rpb24pKGZuKSB8fCAoMCwgX2lzLmlzU3ViamVjdCkoZm4pKSAmJiBub2RlLnBhcmVudE5vZGUpIHtcbiAgICB2YXIgZXZlbnQgLyo6IEN1c3RvbUV2ZW50Ki8gPSBuZXcgX0N1c3RvbUV2ZW50LkN1c3RvbUV2ZW50KCdtb3VudCcpO1xuICAgIG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZW1pdFVubW91bnQobm9kZSAvKjogSFRNTEVsZW1lbnQqLywgZm4gLyo6IEZ1bmN0aW9uIHwgdm9pZCovKSAvKjogdm9pZCovIHtcbiAgaWYgKCgoMCwgX2lzLmlzRnVuY3Rpb24pKGZuKSB8fCAoMCwgX2lzLmlzU3ViamVjdCkoZm4pKSAmJiBub2RlLnBhcmVudE5vZGUpIHtcbiAgICB2YXIgZXZlbnQgLyo6IEN1c3RvbUV2ZW50Ki8gPSBuZXcgX0N1c3RvbUV2ZW50LkN1c3RvbUV2ZW50KCd1bm1vdW50Jyk7XG4gICAgbm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgfVxufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMucGFyc2VUYWcgPSBwYXJzZVRhZztcblxudmFyIF9wYXJzZVRhZyA9IHJlcXVpcmUoJ3BhcnNlLXRhZycpO1xuXG52YXIgX3BhcnNlVGFnMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3BhcnNlVGFnKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxudmFyIFRBR19JU19PTkxZX0xFVFRFUlMgPSAvXlthLXpBLVpdKiQvO1xuXG5mdW5jdGlvbiBwYXJzZVRhZyhfdGFnTmFtZSwgcHJvcHMpIHtcbiAgdmFyIHRhZ05hbWUgPSBfdGFnTmFtZTtcblxuICBpZiAoIVRBR19JU19PTkxZX0xFVFRFUlMudGVzdCh0YWdOYW1lKSkge1xuICAgIHRhZ05hbWUgPSAoMCwgX3BhcnNlVGFnMi5kZWZhdWx0KShfdGFnTmFtZSwgcHJvcHMpLnRvTG93ZXJDYXNlKCk7XG4gIH1cblxuICByZXR1cm4gdGFnTmFtZTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlc2NyaXB0b3JzID0gdW5kZWZpbmVkO1xuXG52YXIgX2V2ZW50c0xpc3QgPSByZXF1aXJlKCcuL2V2ZW50c0xpc3QnKTtcblxudmFyIEhBU19MT1dFUl9DQVNFIC8qOiBudW1iZXIqLyA9IDB4MTsgLy8gdHJhbnNmb3JtIGtleSB0byBhbGwgbG93ZXJjYXNlXG4vKiBAZmxvdyAqL1xuXG52YXIgSEFTX0RBU0hFRF9DQVNFIC8qOiBudW1iZXIqLyA9IDB4MjsgLy8gdHJhbnNmb3JtIGtleSB0byBkYXNoZWQgY2FzZVxudmFyIEhBU19FVkVOVF9DQVNFIC8qOiBudW1iZXIqLyA9IDB4NDsgLy8gdHJhbnNmb3JtIGtleSBmcm9tIG9uQ2xpY2sgdG8gY2xpY2tcbnZhciBVU0VfRVFVQUxfU0VUVEVSIC8qOiBudW1iZXIqLyA9IDB4ODsgLy8gcHJvcHMgb25seSBzZXR0YWJsZSB3aXRoID1cbnZhciBVU0VfU0VUX0FUVFJJQlVURSAvKjogbnVtYmVyKi8gPSAweDEwOyAvLyBwcm9wcyBvbmx5IHNldHRhYmxlIHdpdGggc2V0QXR0cmlidXRlXG52YXIgVVNFX0VWRU5UX0xJU1RFTkVSIC8qOiBudW1iZXIqLyA9IDB4MjA7IC8vIHByb3BzIG9ubHkgc2V0dGFibGUgd2l0aCBhZGRFdmVudExpc3RlbmVyXG52YXIgSEFTX0JPT0xFQU5fVkFMVUUgLyo6IG51bWJlciovID0gMHg0MDsgLy8gcHJvcHMgY2FuIG9ubHkgYmUgYm9vbGVhbnNcbnZhciBIQVNfTlVNQkVSX1ZBTFVFIC8qOiBudW1iZXIqLyA9IDB4ODA7IC8vIHByb3BzIGNhbiBvbmx5IGJlIG51bWJlcnNcbnZhciBJU19TVEFSIC8qOiBudW1iZXIqLyA9IDB4MTAwOyAvLyBwcm9wcyBjYW4gYmUgYW55IGRhc2hlZCBjYXNlLCBlLmcuIGRhdGEtKlxuXG52YXIgREFTSEVEX0NBU0VfUkVHRVggLyo6IFJlZ0V4cCovID0gLyg/Ol5cXHd8W0EtWl18XFxiXFx3fFxccyspL2c7XG5cbmZ1bmN0aW9uIGNoZWNrTWFzayh2YWx1ZSAvKjogbnVtYmVyKi8sIGJpdG1hc2sgLyo6IG51bWJlciovKSAvKjogYm9vbGVhbiovIHtcbiAgcmV0dXJuICh2YWx1ZSAmIGJpdG1hc2spID09PSBiaXRtYXNrO1xufVxuXG5mdW5jdGlvbiBtYWtlRGFzaGVkQ2FzZShsZXR0ZXIgLyo6IHN0cmluZyovLCBpIC8qOiBudW1iZXIqLykgLyo6IHN0cmluZyovIHtcbiAgaWYgKCtsZXR0ZXIgPT09IDApIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBpZiAoaSA9PT0gMCkge1xuICAgIHJldHVybiBsZXR0ZXIudG9Mb3dlckNhc2UoKTtcbiAgfVxuXG4gIHJldHVybiAnLScgKyBsZXR0ZXIudG9Mb3dlckNhc2UoKTtcbn1cblxuZnVuY3Rpb24gY29tcHV0ZU5hbWUobmFtZSAvKjogc3RyaW5nKi8sIGhhc0xvd2VyQ2FzZSAvKjogYm9vbGVhbiovLCBoYXNEYXNoZWRDYXNlIC8qOiBib29sZWFuKi8sIGhhc0V2ZW50Q2FzZSAvKjogYm9vbGVhbiovKSAvKjogc3RyaW5nKi8ge1xuICBpZiAoaGFzTG93ZXJDYXNlKSB7XG4gICAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKTtcbiAgfSBlbHNlIGlmIChoYXNEYXNoZWRDYXNlKSB7XG4gICAgcmV0dXJuIG5hbWUucmVwbGFjZShEQVNIRURfQ0FTRV9SRUdFWCwgbWFrZURhc2hlZENhc2UpO1xuICB9IGVsc2UgaWYgKGhhc0V2ZW50Q2FzZSkge1xuICAgIHJldHVybiBuYW1lLnN1YnN0cigyKS50b0xvd2VyQ2FzZSgpO1xuICB9XG5cbiAgcmV0dXJuIG5hbWU7XG59XG5cbnZhciBwcm9wcyAvKjogT2JqZWN0Ki8gPSB7XG4gIGFjY2VwdDogVVNFX0VRVUFMX1NFVFRFUixcbiAgYWNjZXB0Q2hhcnNldDogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19EQVNIRURfQ0FTRSxcbiAgYWNjZXNzS2V5OiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGFjdGlvbjogVVNFX0VRVUFMX1NFVFRFUixcbiAgYWxpZ246IFVTRV9FUVVBTF9TRVRURVIsXG4gIGFsdDogVVNFX0VRVUFMX1NFVFRFUixcbiAgYXN5bmM6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgYXV0b0NvbXBsZXRlOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGF1dG9Gb2N1czogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIGF1dG9QbGF5OiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgYXV0b1NhdmU6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgYmdDb2xvcjogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICBib3JkZXI6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGNoZWNrZWQ6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgY2l0ZTogVVNFX0VRVUFMX1NFVFRFUixcbiAgY2xhc3NOYW1lOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBjb2xvcjogVVNFX0VRVUFMX1NFVFRFUixcbiAgY29sU3BhbjogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICBjb250ZW50OiBVU0VfRVFVQUxfU0VUVEVSLFxuICBjb250ZW50RWRpdGFibGU6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBjb250cm9sczogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBjb29yZHM6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGRlZmF1bHQ6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgZGVmZXI6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgZGlyOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBkaXJOYW1lOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGRpc2FibGVkOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIGRyYWdnYWJsZTogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19CT09MRUFOX1ZBTFVFLFxuICBkcm9wWm9uZTogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICBlbmNUeXBlOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGZvcjogVVNFX0VRVUFMX1NFVFRFUixcbiAgaGVhZGVyczogVVNFX0VRVUFMX1NFVFRFUixcbiAgaGVpZ2h0OiBVU0VfRVFVQUxfU0VUVEVSLFxuICBocmVmOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBocmVmTGFuZzogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICBodHRwRXF1aXY6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfREFTSEVEX0NBU0UsXG4gIGljb246IFVTRV9FUVVBTF9TRVRURVIsXG4gIGlkOiBVU0VfRVFVQUxfU0VUVEVSLFxuICBpc01hcDogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIGl0ZW1Qcm9wOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGtleVR5cGU6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAga2luZDogVVNFX0VRVUFMX1NFVFRFUixcbiAgbGFiZWw6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGxhbmc6IFVTRV9FUVVBTF9TRVRURVIsXG4gIGxvb3A6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgbWF4OiBVU0VfRVFVQUxfU0VUVEVSLFxuICBtZXRob2Q6IFVTRV9FUVVBTF9TRVRURVIsXG4gIG1pbjogVVNFX0VRVUFMX1NFVFRFUixcbiAgbXVsdGlwbGU6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgbmFtZTogVVNFX0VRVUFMX1NFVFRFUixcbiAgbm9WYWxpZGF0ZTogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIG9wZW46IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgb3B0aW11bTogVVNFX0VRVUFMX1NFVFRFUixcbiAgcGF0dGVybjogVVNFX0VRVUFMX1NFVFRFUixcbiAgcGluZzogVVNFX0VRVUFMX1NFVFRFUixcbiAgcGxhY2Vob2xkZXI6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHBvc3RlcjogVVNFX0VRVUFMX1NFVFRFUixcbiAgcHJlbG9hZDogVVNFX0VRVUFMX1NFVFRFUixcbiAgcmFkaW9Hcm91cDogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICByZWFkT25seTogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIHJlbDogVVNFX0VRVUFMX1NFVFRFUixcbiAgcmVxdWlyZWQ6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgcmV2ZXJzZWQ6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgcm9sZTogVVNFX0VRVUFMX1NFVFRFUixcbiAgcm93U3BhbjogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFIHwgSEFTX05VTUJFUl9WQUxVRSxcbiAgc2FuZGJveDogVVNFX0VRVUFMX1NFVFRFUixcbiAgc2NvcGU6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHNlYW1sZXNzOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIHNlbGVjdGVkOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIHNwYW46IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTlVNQkVSX1ZBTFVFLFxuICBzcmM6IFVTRV9FUVVBTF9TRVRURVIsXG4gIHNyY0RvYzogVVNFX0VRVUFMX1NFVFRFUiB8IEhBU19MT1dFUl9DQVNFLFxuICBzcmNMYW5nOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIHN0YXJ0OiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX05VTUJFUl9WQUxVRSxcbiAgc3RlcDogVVNFX0VRVUFMX1NFVFRFUixcbiAgc3VtbWFyeTogVVNFX0VRVUFMX1NFVFRFUixcbiAgdGFiSW5kZXg6IFVTRV9FUVVBTF9TRVRURVIgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgdGFyZ2V0OiBVU0VfRVFVQUxfU0VUVEVSLFxuICB0aXRsZTogVVNFX0VRVUFMX1NFVFRFUixcbiAgdHlwZTogVVNFX0VRVUFMX1NFVFRFUixcbiAgdXNlTWFwOiBVU0VfRVFVQUxfU0VUVEVSIHwgSEFTX0xPV0VSX0NBU0UsXG4gIHZhbHVlOiBVU0VfRVFVQUxfU0VUVEVSLFxuICB3aWR0aDogVVNFX0VRVUFMX1NFVFRFUixcbiAgd3JhcDogVVNFX0VRVUFMX1NFVFRFUixcblxuICBhbGxvd0Z1bGxTY3JlZW46IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0xPV0VSX0NBU0UgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgYWxsb3dUcmFuc3BhcmVuY3k6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGNhcHR1cmU6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0JPT0xFQU5fVkFMVUUsXG4gIGNoYXJzZXQ6IFVTRV9TRVRfQVRUUklCVVRFLFxuICBjaGFsbGVuZ2U6IFVTRV9TRVRfQVRUUklCVVRFLFxuICBjb2RlQmFzZTogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgY29sczogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTlVNQkVSX1ZBTFVFLFxuICBjb250ZXh0TWVudTogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgZGF0ZVRpbWU6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGZvcm06IFVTRV9TRVRfQVRUUklCVVRFLFxuICBmb3JtQWN0aW9uOiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19MT1dFUl9DQVNFLFxuICBmb3JtRW5jVHlwZTogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgZm9ybU1ldGhvZDogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgZm9ybVRhcmdldDogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgZnJhbWVCb3JkZXI6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0xPV0VSX0NBU0UsXG4gIGhpZGRlbjogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfQk9PTEVBTl9WQUxVRSxcbiAgaW5wdXRNb2RlOiBVU0VfU0VUX0FUVFJJQlVURSB8IEhBU19MT1dFUl9DQVNFLFxuICBpczogVVNFX1NFVF9BVFRSSUJVVEUsXG4gIGxpc3Q6IFVTRV9TRVRfQVRUUklCVVRFLFxuICBtYW5pZmVzdDogVVNFX1NFVF9BVFRSSUJVVEUsXG4gIG1heExlbmd0aDogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgbWVkaWE6IFVTRV9TRVRfQVRUUklCVVRFLFxuICBtaW5MZW5ndGg6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX0xPV0VSX0NBU0UsXG4gIHJvd3M6IFVTRV9TRVRfQVRUUklCVVRFIHwgSEFTX05VTUJFUl9WQUxVRSxcbiAgc2l6ZTogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTlVNQkVSX1ZBTFVFLFxuICBzaXplczogVVNFX1NFVF9BVFRSSUJVVEUsXG4gIHNyY1NldDogVVNFX1NFVF9BVFRSSUJVVEUgfCBIQVNfTE9XRVJfQ0FTRSxcbiAgc3R5bGU6IFVTRV9TRVRfQVRUUklCVVRFLFxuXG4gIGFyaWE6IElTX1NUQVIsXG4gIGRhdGE6IElTX1NUQVJcbn07XG5cbl9ldmVudHNMaXN0LmV2ZW50c0xpc3QuZm9yRWFjaChmdW5jdGlvbiAoZXZlbnQpIHtcbiAgcHJvcHNbJ29uJyArIGV2ZW50XSA9IFVTRV9FVkVOVF9MSVNURU5FUiB8IEhBU19FVkVOVF9DQVNFO1xufSk7XG5cbnZhciBkZXNjcmlwdG9ycyAvKjogT2JqZWN0Ki8gPSB7fTtcbnZhciBrZXlzIC8qOiBBcnJheTxzdHJpbmc+Ki8gPSBPYmplY3Qua2V5cyhwcm9wcyk7XG52YXIgbGVuIC8qOiBudW1iZXIqLyA9IGtleXMubGVuZ3RoO1xudmFyIGkgLyo6IG51bWJlciovID0gLTE7XG5cbndoaWxlICgrK2kgPCBsZW4pIHtcbiAgdmFyIGtleSAvKjogc3RyaW5nKi8gPSBrZXlzW2ldO1xuICB2YXIgcHJvcCAvKjogbnVtYmVyKi8gPSBwcm9wc1trZXldO1xuICB2YXIgaGFzTG93ZXJDYXNlIC8qOiBib29sZWFuKi8gPSBjaGVja01hc2socHJvcCwgSEFTX0xPV0VSX0NBU0UpO1xuICB2YXIgaGFzRGFzaGVkQ2FzZSAvKjogYm9vbGVhbiovID0gY2hlY2tNYXNrKHByb3AsIEhBU19EQVNIRURfQ0FTRSk7XG4gIHZhciBoYXNFdmVudENhc2UgLyo6IGJvb2xlYW4qLyA9IGNoZWNrTWFzayhwcm9wLCBIQVNfRVZFTlRfQ0FTRSk7XG4gIHZhciB1c2VFcXVhbFNldHRlciAvKjogYm9vbGVhbiovID0gY2hlY2tNYXNrKHByb3AsIFVTRV9FUVVBTF9TRVRURVIpO1xuICB2YXIgdXNlU2V0QXR0cmlidXRlIC8qOiBib29sZWFuKi8gPSBjaGVja01hc2socHJvcCwgVVNFX1NFVF9BVFRSSUJVVEUpO1xuICB2YXIgdXNlRXZlbnRMaXN0ZW5lciAvKjogYm9vbGVhbiovID0gY2hlY2tNYXNrKHByb3AsIFVTRV9FVkVOVF9MSVNURU5FUik7XG4gIHZhciBoYXNCb29sZWFuVmFsdWUgLyo6IGJvb2xlYW4qLyA9IGNoZWNrTWFzayhwcm9wLCBIQVNfQk9PTEVBTl9WQUxVRSk7XG4gIHZhciBoYXNOdW1iZXJWYWx1ZSAvKjogYm9vbGVhbiovID0gY2hlY2tNYXNrKHByb3AsIEhBU19OVU1CRVJfVkFMVUUpO1xuICB2YXIgaXNTdGFyIC8qOiBib29sZWFuKi8gPSBjaGVja01hc2socHJvcCwgSVNfU1RBUik7XG4gIHZhciBjb21wdXRlZCAvKjogc3RyaW5nKi8gPSBjb21wdXRlTmFtZShrZXksIGhhc0xvd2VyQ2FzZSwgaGFzRGFzaGVkQ2FzZSwgaGFzRXZlbnRDYXNlKTtcblxuICBkZXNjcmlwdG9yc1trZXldID0ge1xuICAgIHVzZUVxdWFsU2V0dGVyOiB1c2VFcXVhbFNldHRlcixcbiAgICB1c2VTZXRBdHRyaWJ1dGU6IHVzZVNldEF0dHJpYnV0ZSxcbiAgICB1c2VFdmVudExpc3RlbmVyOiB1c2VFdmVudExpc3RlbmVyLFxuICAgIGhhc0Jvb2xlYW5WYWx1ZTogaGFzQm9vbGVhblZhbHVlLFxuICAgIGhhc051bWJlclZhbHVlOiBoYXNOdW1iZXJWYWx1ZSxcbiAgICBpc1N0YXI6IGlzU3RhcixcbiAgICBjb21wdXRlZDogY29tcHV0ZWRcbiAgfTtcbn1cblxuZXhwb3J0cy5kZXNjcmlwdG9ycyA9IGRlc2NyaXB0b3JzOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMucmVuZGVyID0gcmVuZGVyO1xuXG52YXIgX2JhdGNoSW5zZXJ0TWVzc2FnZXMgPSByZXF1aXJlKCcuL2JhdGNoSW5zZXJ0TWVzc2FnZXMnKTtcblxudmFyIF9Ob2RlUHJveHkgPSByZXF1aXJlKCcuL05vZGVQcm94eScpO1xuXG52YXIgX2lzID0gcmVxdWlyZSgnLi9pcycpO1xuXG52YXIgX3N5bWJvbCA9IHJlcXVpcmUoJy4vc3ltYm9sJyk7XG5cbnZhciBfdHlwZXMgPSByZXF1aXJlKCcuL3R5cGVzJyk7XG5cbmZ1bmN0aW9uIHJlbmRlcih2bm9kZSAvKjogVmlydHVhbEVsZW1lbnQqLywgbm9kZSAvKjogSFRNTEVsZW1lbnQqLykgLyo6IHZvaWQqLyB7XG4gIHZhciBjb250YWluZXJQcm94eSAvKjogTm9kZVByb3h5Ki8gPSBfTm9kZVByb3h5Lk5vZGVQcm94eS5mcm9tRWxlbWVudChub2RlKTtcbiAgdmFyIHByZXZpb3VzIC8qOiBWaXJ0dWFsRWxlbWVudCovID0gY29udGFpbmVyUHJveHkuZ2V0QXR0cmlidXRlKF9zeW1ib2wuJCRyb290KTtcblxuICBpZiAoKDAsIF9pcy5pc0RlZmluZWQpKHByZXZpb3VzKSkge1xuICAgIHByZXZpb3VzLmRlc3Ryb3koKTtcbiAgfVxuXG4gICgwLCBfYmF0Y2hJbnNlcnRNZXNzYWdlcy5iYXRjaEluc2VydE1lc3NhZ2VzKShmdW5jdGlvbiAocXVldWUpIHtcbiAgICB2bm9kZS5pbml0aWFsaXplKCk7XG4gICAgY29udGFpbmVyUHJveHkucmVwbGFjZUNoaWxkKHZub2RlLmdldE5vZGVQcm94eSgpLCAwKTtcbiAgICBxdWV1ZS5wdXNoKHZub2RlKTtcbiAgfSk7XG5cbiAgY29udGFpbmVyUHJveHkuc2V0QXR0cmlidXRlKF9zeW1ib2wuJCRyb290LCB2bm9kZSk7XG59IC8qIEBmbG93ICovIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnNldCA9IHNldDtcbmZ1bmN0aW9uIHNldChvYmosIGtleSwgdmFsdWUpIHtcbiAgb2JqW2tleV0gPSB2YWx1ZTtcbn0iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbnZhciBfU3ltYm9sID0gZ2xvYmFsLlN5bWJvbDtcblxudmFyIHN5bWJvbHMgPSB7XG4gICQkdmlydHVhbDogXCJAQFlPTEtfVklSVFVBTFwiLFxuICAkJGNvbXBvbmVudFVpZDogXCJAQFlPTEtfQ09NUE9ORU5UX1VJRFwiLFxuICAkJHJvb3Q6IFwiQEBZT0xLX1JPT1RcIlxufTtcblxuaWYgKHR5cGVvZiBfU3ltYm9sID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgaWYgKHR5cGVvZiBfU3ltYm9sLmZvciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgT2JqZWN0LmtleXMoc3ltYm9scykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICBzeW1ib2xzW2tleV0gPSBfU3ltYm9sLmZvcihzeW1ib2xzW2tleV0pO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIE9iamVjdC5rZXlzKHN5bWJvbHMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgc3ltYm9sc1trZXldID0gX1N5bWJvbChzeW1ib2xzW2tleV0pO1xuICAgIH0pO1xuICB9XG59XG5cbnZhciAkJHZpcnR1YWwgPSBzeW1ib2xzLiQkdmlydHVhbDtcbnZhciAkJGNvbXBvbmVudFVpZCA9IHN5bWJvbHMuJCRjb21wb25lbnRVaWQ7XG52YXIgJCRyb290ID0gc3ltYm9scy4kJHJvb3Q7XG5leHBvcnRzLiQkdmlydHVhbCA9ICQkdmlydHVhbDtcbmV4cG9ydHMuJCRjb21wb25lbnRVaWQgPSAkJGNvbXBvbmVudFVpZDtcbmV4cG9ydHMuJCRyb290ID0gJCRyb290OyIsIid1c2Ugc3RyaWN0JztcblxuLyo6OiBpbXBvcnQgdHlwZSB7VmlydHVhbE5vZGV9IGZyb20gJy4vVmlydHVhbE5vZGUnKi9cbi8qOjogaW1wb3J0IHR5cGUge1ZpcnR1YWxDb21wb25lbnR9IGZyb20gJy4vVmlydHVhbENvbXBvbmVudCcqL1xuLyo6OiBleHBvcnQgdHlwZSBWaXJ0dWFsRWxlbWVudCA9IFZpcnR1YWxOb2RlIHwgVmlydHVhbENvbXBvbmVudCovXG4vKjo6IGV4cG9ydCB0eXBlIE5vZGVQcm94eURlY29yYXRvciA9IHtcbiAgaW5zZXJ0Q2hpbGQgKGNoaWxkOiBWaXJ0dWFsTm9kZSwgaW5kZXg6IG51bWJlcik6IHZvaWQ7XG4gIHVwZGF0ZUNoaWxkIChwcmV2aW91czogVmlydHVhbE5vZGUsIG5leHQ6IFZpcnR1YWxOb2RlKTogdm9pZDtcbiAgbW92ZUNoaWxkIChwcmV2aW91czogVmlydHVhbE5vZGUsIG5leHQ6IFZpcnR1YWxOb2RlLCBpbmRleDogbnVtYmVyKTogdm9pZDtcbiAgcmVtb3ZlQ2hpbGQgKGNoaWxkOiBWaXJ0dWFsTm9kZSk6IHZvaWQ7XG59Ki8iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLndyYXBUZXh0ID0gd3JhcFRleHQ7XG5cbnZhciBfaCA9IHJlcXVpcmUoJy4vaCcpO1xuXG52YXIgX1ZpcnR1YWxOb2RlID0gcmVxdWlyZSgnLi9WaXJ0dWFsTm9kZScpO1xuXG52YXIgX2lzID0gcmVxdWlyZSgnLi9pcycpO1xuXG5mdW5jdGlvbiB3cmFwKG9iaiAvKjogYW55Ki8pIC8qOiBWaXJ0dWFsTm9kZSovIHtcbiAgaWYgKCgwLCBfaXMuaXNWaXJ0dWFsKShvYmopKSB7XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIHJldHVybiAoMCwgX2guaCkoJ3NwYW4nLCB7IHRleHRDb250ZW50OiBvYmoudG9TdHJpbmcoKSB9KTtcbn0gLyogQGZsb3cgKi9cblxuZnVuY3Rpb24gd3JhcFRleHQoYXJyIC8qOiBBcnJheTxhbnk+Ki8pIC8qOiBBcnJheTxWaXJ0dWFsTm9kZT4qLyB7XG4gIHJldHVybiBhcnIubWFwKHdyYXApO1xufSIsIi8qKlxuICogY3VpZC5qc1xuICogQ29sbGlzaW9uLXJlc2lzdGFudCBVSUQgZ2VuZXJhdG9yIGZvciBicm93c2VycyBhbmQgbm9kZS5cbiAqIFNlcXVlbnRpYWwgZm9yIGZhc3QgZGIgbG9va3VwcyBhbmQgcmVjZW5jeSBzb3J0aW5nLlxuICogU2FmZSBmb3IgZWxlbWVudCBJRHMgYW5kIHNlcnZlci1zaWRlIGxvb2t1cHMuXG4gKlxuICogRXh0cmFjdGVkIGZyb20gQ0xDVFJcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIEVyaWMgRWxsaW90dCAyMDEyXG4gKiBNSVQgTGljZW5zZVxuICovXG5cbi8qZ2xvYmFsIHdpbmRvdywgbmF2aWdhdG9yLCBkb2N1bWVudCwgcmVxdWlyZSwgcHJvY2VzcywgbW9kdWxlICovXG4oZnVuY3Rpb24gKGFwcCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBuYW1lc3BhY2UgPSAnY3VpZCcsXG4gICAgYyA9IDAsXG4gICAgYmxvY2tTaXplID0gNCxcbiAgICBiYXNlID0gMzYsXG4gICAgZGlzY3JldGVWYWx1ZXMgPSBNYXRoLnBvdyhiYXNlLCBibG9ja1NpemUpLFxuXG4gICAgcGFkID0gZnVuY3Rpb24gcGFkKG51bSwgc2l6ZSkge1xuICAgICAgdmFyIHMgPSBcIjAwMDAwMDAwMFwiICsgbnVtO1xuICAgICAgcmV0dXJuIHMuc3Vic3RyKHMubGVuZ3RoLXNpemUpO1xuICAgIH0sXG5cbiAgICByYW5kb21CbG9jayA9IGZ1bmN0aW9uIHJhbmRvbUJsb2NrKCkge1xuICAgICAgcmV0dXJuIHBhZCgoTWF0aC5yYW5kb20oKSAqXG4gICAgICAgICAgICBkaXNjcmV0ZVZhbHVlcyA8PCAwKVxuICAgICAgICAgICAgLnRvU3RyaW5nKGJhc2UpLCBibG9ja1NpemUpO1xuICAgIH0sXG5cbiAgICBzYWZlQ291bnRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGMgPSAoYyA8IGRpc2NyZXRlVmFsdWVzKSA/IGMgOiAwO1xuICAgICAgYysrOyAvLyB0aGlzIGlzIG5vdCBzdWJsaW1pbmFsXG4gICAgICByZXR1cm4gYyAtIDE7XG4gICAgfSxcblxuICAgIGFwaSA9IGZ1bmN0aW9uIGN1aWQoKSB7XG4gICAgICAvLyBTdGFydGluZyB3aXRoIGEgbG93ZXJjYXNlIGxldHRlciBtYWtlc1xuICAgICAgLy8gaXQgSFRNTCBlbGVtZW50IElEIGZyaWVuZGx5LlxuICAgICAgdmFyIGxldHRlciA9ICdjJywgLy8gaGFyZC1jb2RlZCBhbGxvd3MgZm9yIHNlcXVlbnRpYWwgYWNjZXNzXG5cbiAgICAgICAgLy8gdGltZXN0YW1wXG4gICAgICAgIC8vIHdhcm5pbmc6IHRoaXMgZXhwb3NlcyB0aGUgZXhhY3QgZGF0ZSBhbmQgdGltZVxuICAgICAgICAvLyB0aGF0IHRoZSB1aWQgd2FzIGNyZWF0ZWQuXG4gICAgICAgIHRpbWVzdGFtcCA9IChuZXcgRGF0ZSgpLmdldFRpbWUoKSkudG9TdHJpbmcoYmFzZSksXG5cbiAgICAgICAgLy8gUHJldmVudCBzYW1lLW1hY2hpbmUgY29sbGlzaW9ucy5cbiAgICAgICAgY291bnRlcixcblxuICAgICAgICAvLyBBIGZldyBjaGFycyB0byBnZW5lcmF0ZSBkaXN0aW5jdCBpZHMgZm9yIGRpZmZlcmVudFxuICAgICAgICAvLyBjbGllbnRzIChzbyBkaWZmZXJlbnQgY29tcHV0ZXJzIGFyZSBmYXIgbGVzc1xuICAgICAgICAvLyBsaWtlbHkgdG8gZ2VuZXJhdGUgdGhlIHNhbWUgaWQpXG4gICAgICAgIGZpbmdlcnByaW50ID0gYXBpLmZpbmdlcnByaW50KCksXG5cbiAgICAgICAgLy8gR3JhYiBzb21lIG1vcmUgY2hhcnMgZnJvbSBNYXRoLnJhbmRvbSgpXG4gICAgICAgIHJhbmRvbSA9IHJhbmRvbUJsb2NrKCkgKyByYW5kb21CbG9jaygpO1xuXG4gICAgICAgIGNvdW50ZXIgPSBwYWQoc2FmZUNvdW50ZXIoKS50b1N0cmluZyhiYXNlKSwgYmxvY2tTaXplKTtcblxuICAgICAgcmV0dXJuICAobGV0dGVyICsgdGltZXN0YW1wICsgY291bnRlciArIGZpbmdlcnByaW50ICsgcmFuZG9tKTtcbiAgICB9O1xuXG4gIGFwaS5zbHVnID0gZnVuY3Rpb24gc2x1ZygpIHtcbiAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpLnRvU3RyaW5nKDM2KSxcbiAgICAgIGNvdW50ZXIsXG4gICAgICBwcmludCA9IGFwaS5maW5nZXJwcmludCgpLnNsaWNlKDAsMSkgK1xuICAgICAgICBhcGkuZmluZ2VycHJpbnQoKS5zbGljZSgtMSksXG4gICAgICByYW5kb20gPSByYW5kb21CbG9jaygpLnNsaWNlKC0yKTtcblxuICAgICAgY291bnRlciA9IHNhZmVDb3VudGVyKCkudG9TdHJpbmcoMzYpLnNsaWNlKC00KTtcblxuICAgIHJldHVybiBkYXRlLnNsaWNlKC0yKSArXG4gICAgICBjb3VudGVyICsgcHJpbnQgKyByYW5kb207XG4gIH07XG5cbiAgYXBpLmdsb2JhbENvdW50ID0gZnVuY3Rpb24gZ2xvYmFsQ291bnQoKSB7XG4gICAgLy8gV2Ugd2FudCB0byBjYWNoZSB0aGUgcmVzdWx0cyBvZiB0aGlzXG4gICAgdmFyIGNhY2hlID0gKGZ1bmN0aW9uIGNhbGMoKSB7XG4gICAgICAgIHZhciBpLFxuICAgICAgICAgIGNvdW50ID0gMDtcblxuICAgICAgICBmb3IgKGkgaW4gd2luZG93KSB7XG4gICAgICAgICAgY291bnQrKztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICAgIH0oKSk7XG5cbiAgICBhcGkuZ2xvYmFsQ291bnQgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBjYWNoZTsgfTtcbiAgICByZXR1cm4gY2FjaGU7XG4gIH07XG5cbiAgYXBpLmZpbmdlcnByaW50ID0gZnVuY3Rpb24gYnJvd3NlclByaW50KCkge1xuICAgIHJldHVybiBwYWQoKG5hdmlnYXRvci5taW1lVHlwZXMubGVuZ3RoICtcbiAgICAgIG5hdmlnYXRvci51c2VyQWdlbnQubGVuZ3RoKS50b1N0cmluZygzNikgK1xuICAgICAgYXBpLmdsb2JhbENvdW50KCkudG9TdHJpbmcoMzYpLCA0KTtcbiAgfTtcblxuICAvLyBkb24ndCBjaGFuZ2UgYW55dGhpbmcgZnJvbSBoZXJlIGRvd24uXG4gIGlmIChhcHAucmVnaXN0ZXIpIHtcbiAgICBhcHAucmVnaXN0ZXIobmFtZXNwYWNlLCBhcGkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBhcGk7XG4gIH0gZWxzZSB7XG4gICAgYXBwW25hbWVzcGFjZV0gPSBhcGk7XG4gIH1cblxufSh0aGlzLmFwcGxpdHVkZSB8fCB0aGlzKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlJFTU9WRSA9IGV4cG9ydHMuTU9WRSA9IGV4cG9ydHMuVVBEQVRFID0gZXhwb3J0cy5DUkVBVEUgPSB1bmRlZmluZWQ7XG5cbnZhciBfYml0VmVjdG9yID0gcmVxdWlyZSgnYml0LXZlY3RvcicpO1xuXG4vKipcbiAqIEFjdGlvbnNcbiAqL1xuXG52YXIgQ1JFQVRFID0gMDsgLyoqXG4gICAgICAgICAgICAgICAgICogSW1wb3J0c1xuICAgICAgICAgICAgICAgICAqL1xuXG52YXIgVVBEQVRFID0gMTtcbnZhciBNT1ZFID0gMjtcbnZhciBSRU1PVkUgPSAzO1xuXG4vKipcbiAqIGRpZnRcbiAqL1xuXG5mdW5jdGlvbiBkaWZ0KHByZXYsIG5leHQsIGVmZmVjdCwga2V5KSB7XG4gIHZhciBwU3RhcnRJZHggPSAwO1xuICB2YXIgblN0YXJ0SWR4ID0gMDtcbiAgdmFyIHBFbmRJZHggPSBwcmV2Lmxlbmd0aCAtIDE7XG4gIHZhciBuRW5kSWR4ID0gbmV4dC5sZW5ndGggLSAxO1xuICB2YXIgcFN0YXJ0SXRlbSA9IHByZXZbcFN0YXJ0SWR4XTtcbiAgdmFyIG5TdGFydEl0ZW0gPSBuZXh0W25TdGFydElkeF07XG5cbiAgLy8gTGlzdCBoZWFkIGlzIHRoZSBzYW1lXG4gIHdoaWxlIChwU3RhcnRJZHggPD0gcEVuZElkeCAmJiBuU3RhcnRJZHggPD0gbkVuZElkeCAmJiBlcXVhbChwU3RhcnRJdGVtLCBuU3RhcnRJdGVtKSkge1xuICAgIGVmZmVjdChVUERBVEUsIHBTdGFydEl0ZW0sIG5TdGFydEl0ZW0sIG5TdGFydElkeCk7XG4gICAgcFN0YXJ0SXRlbSA9IHByZXZbKytwU3RhcnRJZHhdO1xuICAgIG5TdGFydEl0ZW0gPSBuZXh0WysrblN0YXJ0SWR4XTtcbiAgfVxuXG4gIC8vIFRoZSBhYm92ZSBjYXNlIGlzIG9yZGVycyBvZiBtYWduaXR1ZGUgbW9yZSBjb21tb24gdGhhbiB0aGUgb3RoZXJzLCBzbyBmYXN0LXBhdGggaXRcbiAgaWYgKG5TdGFydElkeCA+IG5FbmRJZHggJiYgcFN0YXJ0SWR4ID4gcEVuZElkeCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBwRW5kSXRlbSA9IHByZXZbcEVuZElkeF07XG4gIHZhciBuRW5kSXRlbSA9IG5leHRbbkVuZElkeF07XG4gIHZhciBtb3ZlZEZyb21Gcm9udCA9IDA7XG5cbiAgLy8gUmV2ZXJzZWRcbiAgd2hpbGUgKHBTdGFydElkeCA8PSBwRW5kSWR4ICYmIG5TdGFydElkeCA8PSBuRW5kSWR4ICYmIGVxdWFsKHBTdGFydEl0ZW0sIG5FbmRJdGVtKSkge1xuICAgIGVmZmVjdChNT1ZFLCBwU3RhcnRJdGVtLCBuRW5kSXRlbSwgcEVuZElkeCAtIG1vdmVkRnJvbUZyb250ICsgMSk7XG4gICAgcFN0YXJ0SXRlbSA9IHByZXZbKytwU3RhcnRJZHhdO1xuICAgIG5FbmRJdGVtID0gbmV4dFstLW5FbmRJZHhdO1xuICAgICsrbW92ZWRGcm9tRnJvbnQ7XG4gIH1cblxuICAvLyBSZXZlcnNlZCB0aGUgb3RoZXIgd2F5IChpbiBjYXNlIG9mIGUuZy4gcmV2ZXJzZSBhbmQgYXBwZW5kKVxuICB3aGlsZSAocEVuZElkeCA+PSBwU3RhcnRJZHggJiYgblN0YXJ0SWR4IDw9IG5FbmRJZHggJiYgZXF1YWwoblN0YXJ0SXRlbSwgcEVuZEl0ZW0pKSB7XG4gICAgZWZmZWN0KE1PVkUsIHBFbmRJdGVtLCBuU3RhcnRJdGVtLCBuU3RhcnRJZHgpO1xuICAgIHBFbmRJdGVtID0gcHJldlstLXBFbmRJZHhdO1xuICAgIG5TdGFydEl0ZW0gPSBuZXh0WysrblN0YXJ0SWR4XTtcbiAgICAtLW1vdmVkRnJvbUZyb250O1xuICB9XG5cbiAgLy8gTGlzdCB0YWlsIGlzIHRoZSBzYW1lXG4gIHdoaWxlIChwRW5kSWR4ID49IHBTdGFydElkeCAmJiBuRW5kSWR4ID49IG5TdGFydElkeCAmJiBlcXVhbChwRW5kSXRlbSwgbkVuZEl0ZW0pKSB7XG4gICAgZWZmZWN0KFVQREFURSwgcEVuZEl0ZW0sIG5FbmRJdGVtLCBuRW5kSWR4KTtcbiAgICBwRW5kSXRlbSA9IHByZXZbLS1wRW5kSWR4XTtcbiAgICBuRW5kSXRlbSA9IG5leHRbLS1uRW5kSWR4XTtcbiAgfVxuXG4gIGlmIChwU3RhcnRJZHggPiBwRW5kSWR4KSB7XG4gICAgd2hpbGUgKG5TdGFydElkeCA8PSBuRW5kSWR4KSB7XG4gICAgICBlZmZlY3QoQ1JFQVRFLCBudWxsLCBuU3RhcnRJdGVtLCBuU3RhcnRJZHgpO1xuICAgICAgblN0YXJ0SXRlbSA9IG5leHRbKytuU3RhcnRJZHhdO1xuICAgIH1cblxuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChuU3RhcnRJZHggPiBuRW5kSWR4KSB7XG4gICAgd2hpbGUgKHBTdGFydElkeCA8PSBwRW5kSWR4KSB7XG4gICAgICBlZmZlY3QoUkVNT1ZFLCBwU3RhcnRJdGVtKTtcbiAgICAgIHBTdGFydEl0ZW0gPSBwcmV2WysrcFN0YXJ0SWR4XTtcbiAgICB9XG5cbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgY3JlYXRlZCA9IDA7XG4gIHZhciBwaXZvdERlc3QgPSBudWxsO1xuICB2YXIgcGl2b3RJZHggPSBwU3RhcnRJZHggLSBtb3ZlZEZyb21Gcm9udDtcbiAgdmFyIGtlZXBCYXNlID0gcFN0YXJ0SWR4O1xuICB2YXIga2VlcCA9ICgwLCBfYml0VmVjdG9yLmNyZWF0ZUJ2KShwRW5kSWR4IC0gcFN0YXJ0SWR4KTtcblxuICB2YXIgcHJldk1hcCA9IGtleU1hcChwcmV2LCBwU3RhcnRJZHgsIHBFbmRJZHggKyAxLCBrZXkpO1xuXG4gIGZvciAoOyBuU3RhcnRJZHggPD0gbkVuZElkeDsgblN0YXJ0SXRlbSA9IG5leHRbKytuU3RhcnRJZHhdKSB7XG4gICAgdmFyIG9sZElkeCA9IHByZXZNYXBba2V5KG5TdGFydEl0ZW0pXTtcblxuICAgIGlmIChpc1VuZGVmaW5lZChvbGRJZHgpKSB7XG4gICAgICBlZmZlY3QoQ1JFQVRFLCBudWxsLCBuU3RhcnRJdGVtLCBwaXZvdElkeCsrKTtcbiAgICAgICsrY3JlYXRlZDtcbiAgICB9IGVsc2UgaWYgKHBTdGFydElkeCAhPT0gb2xkSWR4KSB7XG4gICAgICAoMCwgX2JpdFZlY3Rvci5zZXRCaXQpKGtlZXAsIG9sZElkeCAtIGtlZXBCYXNlKTtcbiAgICAgIGVmZmVjdChNT1ZFLCBwcmV2W29sZElkeF0sIG5TdGFydEl0ZW0sIHBpdm90SWR4KyspO1xuICAgIH0gZWxzZSB7XG4gICAgICBwaXZvdERlc3QgPSBuU3RhcnRJZHg7XG4gICAgfVxuICB9XG5cbiAgaWYgKHBpdm90RGVzdCAhPT0gbnVsbCkge1xuICAgICgwLCBfYml0VmVjdG9yLnNldEJpdCkoa2VlcCwgMCk7XG4gICAgZWZmZWN0KE1PVkUsIHByZXZbcFN0YXJ0SWR4XSwgbmV4dFtwaXZvdERlc3RdLCBwaXZvdERlc3QpO1xuICB9XG5cbiAgLy8gSWYgdGhlcmUgYXJlIG5vIGNyZWF0aW9ucywgdGhlbiB5b3UgaGF2ZSB0b1xuICAvLyByZW1vdmUgZXhhY3RseSBtYXgocHJldkxlbiAtIG5leHRMZW4sIDApIGVsZW1lbnRzIGluIHRoaXNcbiAgLy8gZGlmZi4gWW91IGhhdmUgdG8gcmVtb3ZlIG9uZSBtb3JlIGZvciBlYWNoIGVsZW1lbnRcbiAgLy8gdGhhdCB3YXMgY3JlYXRlZC4gVGhpcyBtZWFucyBvbmNlIHdlIGhhdmVcbiAgLy8gcmVtb3ZlZCB0aGF0IG1hbnksIHdlIGNhbiBzdG9wLlxuICB2YXIgbmVjZXNzYXJ5UmVtb3ZhbHMgPSBwcmV2Lmxlbmd0aCAtIG5leHQubGVuZ3RoICsgY3JlYXRlZDtcbiAgZm9yICh2YXIgcmVtb3ZhbHMgPSAwOyByZW1vdmFscyA8IG5lY2Vzc2FyeVJlbW92YWxzOyBwU3RhcnRJdGVtID0gcHJldlsrK3BTdGFydElkeF0pIHtcbiAgICBpZiAoISgwLCBfYml0VmVjdG9yLmdldEJpdCkoa2VlcCwgcFN0YXJ0SWR4IC0ga2VlcEJhc2UpKSB7XG4gICAgICBlZmZlY3QoUkVNT1ZFLCBwU3RhcnRJdGVtKTtcbiAgICAgICsrcmVtb3ZhbHM7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZXF1YWwoYSwgYikge1xuICAgIHJldHVybiBrZXkoYSkgPT09IGtleShiKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZCh2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnO1xufVxuXG5mdW5jdGlvbiBrZXlNYXAoaXRlbXMsIHN0YXJ0LCBlbmQsIGtleSkge1xuICB2YXIgbWFwID0ge307XG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICBtYXBba2V5KGl0ZW1zW2ldKV0gPSBpO1xuICB9XG5cbiAgcmV0dXJuIG1hcDtcbn1cblxuLyoqXG4gKiBFeHBvcnRzXG4gKi9cblxuZXhwb3J0cy5kZWZhdWx0ID0gZGlmdDtcbmV4cG9ydHMuQ1JFQVRFID0gQ1JFQVRFO1xuZXhwb3J0cy5VUERBVEUgPSBVUERBVEU7XG5leHBvcnRzLk1PVkUgPSBNT1ZFO1xuZXhwb3J0cy5SRU1PVkUgPSBSRU1PVkU7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuLyoqXG4gKiBVc2UgdHlwZWQgYXJyYXlzIGlmIHdlIGNhblxuICovXG5cbnZhciBGYXN0QXJyYXkgPSB0eXBlb2YgVWludDMyQXJyYXkgPT09ICd1bmRlZmluZWQnID8gQXJyYXkgOiBVaW50MzJBcnJheTtcblxuLyoqXG4gKiBCaXQgdmVjdG9yXG4gKi9cblxuZnVuY3Rpb24gY3JlYXRlQnYoc2l6ZUluQml0cykge1xuICByZXR1cm4gbmV3IEZhc3RBcnJheShNYXRoLmNlaWwoc2l6ZUluQml0cyAvIDMyKSk7XG59XG5cbmZ1bmN0aW9uIHNldEJpdCh2LCBpZHgpIHtcbiAgdmFyIHIgPSBpZHggJSAzMjtcbiAgdmFyIHBvcyA9IChpZHggLSByKSAvIDMyO1xuXG4gIHZbcG9zXSB8PSAxIDw8IHI7XG59XG5cbmZ1bmN0aW9uIGNsZWFyQml0KHYsIGlkeCkge1xuICB2YXIgciA9IGlkeCAlIDMyO1xuICB2YXIgcG9zID0gKGlkeCAtIHIpIC8gMzI7XG5cbiAgdltwb3NdICY9IH4oMSA8PCByKTtcbn1cblxuZnVuY3Rpb24gZ2V0Qml0KHYsIGlkeCkge1xuICB2YXIgciA9IGlkeCAlIDMyO1xuICB2YXIgcG9zID0gKGlkeCAtIHIpIC8gMzI7XG5cbiAgcmV0dXJuICEhKHZbcG9zXSAmIDEgPDwgcik7XG59XG5cbi8qKlxuICogRXhwb3J0c1xuICovXG5cbmV4cG9ydHMuY3JlYXRlQnYgPSBjcmVhdGVCdjtcbmV4cG9ydHMuc2V0Qml0ID0gc2V0Qml0O1xuZXhwb3J0cy5jbGVhckJpdCA9IGNsZWFyQml0O1xuZXhwb3J0cy5nZXRCaXQgPSBnZXRCaXQ7IiwidmFyIEV2U3RvcmUgPSByZXF1aXJlKFwiZXYtc3RvcmVcIilcblxubW9kdWxlLmV4cG9ydHMgPSBhZGRFdmVudFxuXG5mdW5jdGlvbiBhZGRFdmVudCh0YXJnZXQsIHR5cGUsIGhhbmRsZXIpIHtcbiAgICB2YXIgZXZlbnRzID0gRXZTdG9yZSh0YXJnZXQpXG4gICAgdmFyIGV2ZW50ID0gZXZlbnRzW3R5cGVdXG5cbiAgICBpZiAoIWV2ZW50KSB7XG4gICAgICAgIGV2ZW50c1t0eXBlXSA9IGhhbmRsZXJcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZXZlbnQpKSB7XG4gICAgICAgIGlmIChldmVudC5pbmRleE9mKGhhbmRsZXIpID09PSAtMSkge1xuICAgICAgICAgICAgZXZlbnQucHVzaChoYW5kbGVyKVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChldmVudCAhPT0gaGFuZGxlcikge1xuICAgICAgICBldmVudHNbdHlwZV0gPSBbZXZlbnQsIGhhbmRsZXJdXG4gICAgfVxufVxuIiwidmFyIGdsb2JhbERvY3VtZW50ID0gcmVxdWlyZShcImdsb2JhbC9kb2N1bWVudFwiKVxudmFyIEV2U3RvcmUgPSByZXF1aXJlKFwiZXYtc3RvcmVcIilcbnZhciBjcmVhdGVTdG9yZSA9IHJlcXVpcmUoXCJ3ZWFrbWFwLXNoaW0vY3JlYXRlLXN0b3JlXCIpXG5cbnZhciBhZGRFdmVudCA9IHJlcXVpcmUoXCIuL2FkZC1ldmVudC5qc1wiKVxudmFyIHJlbW92ZUV2ZW50ID0gcmVxdWlyZShcIi4vcmVtb3ZlLWV2ZW50LmpzXCIpXG52YXIgUHJveHlFdmVudCA9IHJlcXVpcmUoXCIuL3Byb3h5LWV2ZW50LmpzXCIpXG5cbnZhciBIQU5ETEVSX1NUT1JFID0gY3JlYXRlU3RvcmUoKVxuXG5tb2R1bGUuZXhwb3J0cyA9IERPTURlbGVnYXRvclxuXG5mdW5jdGlvbiBET01EZWxlZ2F0b3IoZG9jdW1lbnQpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRE9NRGVsZWdhdG9yKSkge1xuICAgICAgICByZXR1cm4gbmV3IERPTURlbGVnYXRvcihkb2N1bWVudCk7XG4gICAgfVxuXG4gICAgZG9jdW1lbnQgPSBkb2N1bWVudCB8fCBnbG9iYWxEb2N1bWVudFxuXG4gICAgdGhpcy50YXJnZXQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRcbiAgICB0aGlzLmV2ZW50cyA9IHt9XG4gICAgdGhpcy5yYXdFdmVudExpc3RlbmVycyA9IHt9XG4gICAgdGhpcy5nbG9iYWxMaXN0ZW5lcnMgPSB7fVxufVxuXG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBhZGRFdmVudFxuRE9NRGVsZWdhdG9yLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyID0gcmVtb3ZlRXZlbnRcblxuRE9NRGVsZWdhdG9yLmFsbG9jYXRlSGFuZGxlID1cbiAgICBmdW5jdGlvbiBhbGxvY2F0ZUhhbmRsZShmdW5jKSB7XG4gICAgICAgIHZhciBoYW5kbGUgPSBuZXcgSGFuZGxlKClcblxuICAgICAgICBIQU5ETEVSX1NUT1JFKGhhbmRsZSkuZnVuYyA9IGZ1bmM7XG5cbiAgICAgICAgcmV0dXJuIGhhbmRsZVxuICAgIH1cblxuRE9NRGVsZWdhdG9yLnRyYW5zZm9ybUhhbmRsZSA9XG4gICAgZnVuY3Rpb24gdHJhbnNmb3JtSGFuZGxlKGhhbmRsZSwgYnJvYWRjYXN0KSB7XG4gICAgICAgIHZhciBmdW5jID0gSEFORExFUl9TVE9SRShoYW5kbGUpLmZ1bmNcblxuICAgICAgICByZXR1cm4gdGhpcy5hbGxvY2F0ZUhhbmRsZShmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIGJyb2FkY2FzdChldiwgZnVuYyk7XG4gICAgICAgIH0pXG4gICAgfVxuXG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLmFkZEdsb2JhbEV2ZW50TGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIGFkZEdsb2JhbEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBmbikge1xuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nbG9iYWxMaXN0ZW5lcnNbZXZlbnROYW1lXSB8fCBbXTtcbiAgICAgICAgaWYgKGxpc3RlbmVycy5pbmRleE9mKGZuKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycy5wdXNoKGZuKVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5nbG9iYWxMaXN0ZW5lcnNbZXZlbnROYW1lXSA9IGxpc3RlbmVycztcbiAgICB9XG5cbkRPTURlbGVnYXRvci5wcm90b3R5cGUucmVtb3ZlR2xvYmFsRXZlbnRMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gcmVtb3ZlR2xvYmFsRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGZuKSB7XG4gICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdsb2JhbExpc3RlbmVyc1tldmVudE5hbWVdIHx8IFtdO1xuXG4gICAgICAgIHZhciBpbmRleCA9IGxpc3RlbmVycy5pbmRleE9mKGZuKVxuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGluZGV4LCAxKVxuICAgICAgICB9XG4gICAgfVxuXG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLmxpc3RlblRvID0gZnVuY3Rpb24gbGlzdGVuVG8oZXZlbnROYW1lKSB7XG4gICAgaWYgKCEoZXZlbnROYW1lIGluIHRoaXMuZXZlbnRzKSkge1xuICAgICAgICB0aGlzLmV2ZW50c1tldmVudE5hbWVdID0gMDtcbiAgICB9XG5cbiAgICB0aGlzLmV2ZW50c1tldmVudE5hbWVdKys7XG5cbiAgICBpZiAodGhpcy5ldmVudHNbZXZlbnROYW1lXSAhPT0gMSkge1xuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgbGlzdGVuZXIgPSB0aGlzLnJhd0V2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV1cbiAgICBpZiAoIWxpc3RlbmVyKSB7XG4gICAgICAgIGxpc3RlbmVyID0gdGhpcy5yYXdFdmVudExpc3RlbmVyc1tldmVudE5hbWVdID1cbiAgICAgICAgICAgIGNyZWF0ZUhhbmRsZXIoZXZlbnROYW1lLCB0aGlzKVxuICAgIH1cblxuICAgIHRoaXMudGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBsaXN0ZW5lciwgdHJ1ZSlcbn1cblxuRE9NRGVsZWdhdG9yLnByb3RvdHlwZS51bmxpc3RlblRvID0gZnVuY3Rpb24gdW5saXN0ZW5UbyhldmVudE5hbWUpIHtcbiAgICBpZiAoIShldmVudE5hbWUgaW4gdGhpcy5ldmVudHMpKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0gPSAwO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmV2ZW50c1tldmVudE5hbWVdID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImFscmVhZHkgdW5saXN0ZW5lZCB0byBldmVudC5cIik7XG4gICAgfVxuXG4gICAgdGhpcy5ldmVudHNbZXZlbnROYW1lXS0tO1xuXG4gICAgaWYgKHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0gIT09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdmFyIGxpc3RlbmVyID0gdGhpcy5yYXdFdmVudExpc3RlbmVyc1tldmVudE5hbWVdXG5cbiAgICBpZiAoIWxpc3RlbmVyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImRvbS1kZWxlZ2F0b3IjdW5saXN0ZW5UbzogY2Fubm90IFwiICtcbiAgICAgICAgICAgIFwidW5saXN0ZW4gdG8gXCIgKyBldmVudE5hbWUpXG4gICAgfVxuXG4gICAgdGhpcy50YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGxpc3RlbmVyLCB0cnVlKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVIYW5kbGVyKGV2ZW50TmFtZSwgZGVsZWdhdG9yKSB7XG4gICAgdmFyIGdsb2JhbExpc3RlbmVycyA9IGRlbGVnYXRvci5nbG9iYWxMaXN0ZW5lcnM7XG4gICAgdmFyIGRlbGVnYXRvclRhcmdldCA9IGRlbGVnYXRvci50YXJnZXQ7XG5cbiAgICByZXR1cm4gaGFuZGxlclxuXG4gICAgZnVuY3Rpb24gaGFuZGxlcihldikge1xuICAgICAgICB2YXIgZ2xvYmFsSGFuZGxlcnMgPSBnbG9iYWxMaXN0ZW5lcnNbZXZlbnROYW1lXSB8fCBbXVxuXG4gICAgICAgIGlmIChnbG9iYWxIYW5kbGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgZ2xvYmFsRXZlbnQgPSBuZXcgUHJveHlFdmVudChldik7XG4gICAgICAgICAgICBnbG9iYWxFdmVudC5jdXJyZW50VGFyZ2V0ID0gZGVsZWdhdG9yVGFyZ2V0O1xuICAgICAgICAgICAgY2FsbExpc3RlbmVycyhnbG9iYWxIYW5kbGVycywgZ2xvYmFsRXZlbnQpXG4gICAgICAgIH1cblxuICAgICAgICBmaW5kQW5kSW52b2tlTGlzdGVuZXJzKGV2LnRhcmdldCwgZXYsIGV2ZW50TmFtZSlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRBbmRJbnZva2VMaXN0ZW5lcnMoZWxlbSwgZXYsIGV2ZW50TmFtZSkge1xuICAgIHZhciBsaXN0ZW5lciA9IGdldExpc3RlbmVyKGVsZW0sIGV2ZW50TmFtZSlcblxuICAgIGlmIChsaXN0ZW5lciAmJiBsaXN0ZW5lci5oYW5kbGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBsaXN0ZW5lckV2ZW50ID0gbmV3IFByb3h5RXZlbnQoZXYpO1xuICAgICAgICBsaXN0ZW5lckV2ZW50LmN1cnJlbnRUYXJnZXQgPSBsaXN0ZW5lci5jdXJyZW50VGFyZ2V0XG4gICAgICAgIGNhbGxMaXN0ZW5lcnMobGlzdGVuZXIuaGFuZGxlcnMsIGxpc3RlbmVyRXZlbnQpXG5cbiAgICAgICAgaWYgKGxpc3RlbmVyRXZlbnQuX2J1YmJsZXMpIHtcbiAgICAgICAgICAgIHZhciBuZXh0VGFyZ2V0ID0gbGlzdGVuZXIuY3VycmVudFRhcmdldC5wYXJlbnROb2RlXG4gICAgICAgICAgICBmaW5kQW5kSW52b2tlTGlzdGVuZXJzKG5leHRUYXJnZXQsIGV2LCBldmVudE5hbWUpXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldExpc3RlbmVyKHRhcmdldCwgdHlwZSkge1xuICAgIC8vIHRlcm1pbmF0ZSByZWN1cnNpb24gaWYgcGFyZW50IGlzIGBudWxsYFxuICAgIGlmICh0YXJnZXQgPT09IG51bGwgfHwgdHlwZW9mIHRhcmdldCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICByZXR1cm4gbnVsbFxuICAgIH1cblxuICAgIHZhciBldmVudHMgPSBFdlN0b3JlKHRhcmdldClcbiAgICAvLyBmZXRjaCBsaXN0IG9mIGhhbmRsZXIgZm5zIGZvciB0aGlzIGV2ZW50XG4gICAgdmFyIGhhbmRsZXIgPSBldmVudHNbdHlwZV1cbiAgICB2YXIgYWxsSGFuZGxlciA9IGV2ZW50cy5ldmVudFxuXG4gICAgaWYgKCFoYW5kbGVyICYmICFhbGxIYW5kbGVyKSB7XG4gICAgICAgIHJldHVybiBnZXRMaXN0ZW5lcih0YXJnZXQucGFyZW50Tm9kZSwgdHlwZSlcbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlcnMgPSBbXS5jb25jYXQoaGFuZGxlciB8fCBbXSwgYWxsSGFuZGxlciB8fCBbXSlcbiAgICByZXR1cm4gbmV3IExpc3RlbmVyKHRhcmdldCwgaGFuZGxlcnMpXG59XG5cbmZ1bmN0aW9uIGNhbGxMaXN0ZW5lcnMoaGFuZGxlcnMsIGV2KSB7XG4gICAgaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgaGFuZGxlcihldilcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaGFuZGxlci5oYW5kbGVFdmVudCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBoYW5kbGVyLmhhbmRsZUV2ZW50KGV2KVxuICAgICAgICB9IGVsc2UgaWYgKGhhbmRsZXIudHlwZSA9PT0gXCJkb20tZGVsZWdhdG9yLWhhbmRsZVwiKSB7XG4gICAgICAgICAgICBIQU5ETEVSX1NUT1JFKGhhbmRsZXIpLmZ1bmMoZXYpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJkb20tZGVsZWdhdG9yOiB1bmtub3duIGhhbmRsZXIgXCIgK1xuICAgICAgICAgICAgICAgIFwiZm91bmQ6IFwiICsgSlNPTi5zdHJpbmdpZnkoaGFuZGxlcnMpKTtcbiAgICAgICAgfVxuICAgIH0pXG59XG5cbmZ1bmN0aW9uIExpc3RlbmVyKHRhcmdldCwgaGFuZGxlcnMpIHtcbiAgICB0aGlzLmN1cnJlbnRUYXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLmhhbmRsZXJzID0gaGFuZGxlcnNcbn1cblxuZnVuY3Rpb24gSGFuZGxlKCkge1xuICAgIHRoaXMudHlwZSA9IFwiZG9tLWRlbGVnYXRvci1oYW5kbGVcIlxufVxuIiwidmFyIEluZGl2aWR1YWwgPSByZXF1aXJlKFwiaW5kaXZpZHVhbFwiKVxudmFyIGN1aWQgPSByZXF1aXJlKFwiY3VpZFwiKVxudmFyIGdsb2JhbERvY3VtZW50ID0gcmVxdWlyZShcImdsb2JhbC9kb2N1bWVudFwiKVxuXG52YXIgRE9NRGVsZWdhdG9yID0gcmVxdWlyZShcIi4vZG9tLWRlbGVnYXRvci5qc1wiKVxuXG52YXIgdmVyc2lvbktleSA9IFwiMTNcIlxudmFyIGNhY2hlS2V5ID0gXCJfX0RPTV9ERUxFR0FUT1JfQ0FDSEVAXCIgKyB2ZXJzaW9uS2V5XG52YXIgY2FjaGVUb2tlbktleSA9IFwiX19ET01fREVMRUdBVE9SX0NBQ0hFX1RPS0VOQFwiICsgdmVyc2lvbktleVxudmFyIGRlbGVnYXRvckNhY2hlID0gSW5kaXZpZHVhbChjYWNoZUtleSwge1xuICAgIGRlbGVnYXRvcnM6IHt9XG59KVxudmFyIGNvbW1vbkV2ZW50cyA9IFtcbiAgICBcImJsdXJcIiwgXCJjaGFuZ2VcIiwgXCJjbGlja1wiLCAgXCJjb250ZXh0bWVudVwiLCBcImRibGNsaWNrXCIsXG4gICAgXCJlcnJvclwiLFwiZm9jdXNcIiwgXCJmb2N1c2luXCIsIFwiZm9jdXNvdXRcIiwgXCJpbnB1dFwiLCBcImtleWRvd25cIixcbiAgICBcImtleXByZXNzXCIsIFwia2V5dXBcIiwgXCJsb2FkXCIsIFwibW91c2Vkb3duXCIsIFwibW91c2V1cFwiLFxuICAgIFwicmVzaXplXCIsIFwic2VsZWN0XCIsIFwic3VibWl0XCIsIFwidG91Y2hjYW5jZWxcIixcbiAgICBcInRvdWNoZW5kXCIsIFwidG91Y2hzdGFydFwiLCBcInVubG9hZFwiXG5dXG5cbi8qICBEZWxlZ2F0b3IgaXMgYSB0aGluIHdyYXBwZXIgYXJvdW5kIGEgc2luZ2xldG9uIGBET01EZWxlZ2F0b3JgXG4gICAgICAgIGluc3RhbmNlLlxuXG4gICAgT25seSBvbmUgRE9NRGVsZWdhdG9yIHNob3VsZCBleGlzdCBiZWNhdXNlIHdlIGRvIG5vdCB3YW50XG4gICAgICAgIGR1cGxpY2F0ZSBldmVudCBsaXN0ZW5lcnMgYm91bmQgdG8gdGhlIERPTS5cblxuICAgIGBEZWxlZ2F0b3JgIHdpbGwgYWxzbyBgbGlzdGVuVG8oKWAgYWxsIGV2ZW50cyB1bmxlc3NcbiAgICAgICAgZXZlcnkgY2FsbGVyIG9wdHMgb3V0IG9mIGl0XG4qL1xubW9kdWxlLmV4cG9ydHMgPSBEZWxlZ2F0b3JcblxuZnVuY3Rpb24gRGVsZWdhdG9yKG9wdHMpIHtcbiAgICBvcHRzID0gb3B0cyB8fCB7fVxuICAgIHZhciBkb2N1bWVudCA9IG9wdHMuZG9jdW1lbnQgfHwgZ2xvYmFsRG9jdW1lbnRcblxuICAgIHZhciBjYWNoZUtleSA9IGRvY3VtZW50W2NhY2hlVG9rZW5LZXldXG5cbiAgICBpZiAoIWNhY2hlS2V5KSB7XG4gICAgICAgIGNhY2hlS2V5ID1cbiAgICAgICAgICAgIGRvY3VtZW50W2NhY2hlVG9rZW5LZXldID0gY3VpZCgpXG4gICAgfVxuXG4gICAgdmFyIGRlbGVnYXRvciA9IGRlbGVnYXRvckNhY2hlLmRlbGVnYXRvcnNbY2FjaGVLZXldXG5cbiAgICBpZiAoIWRlbGVnYXRvcikge1xuICAgICAgICBkZWxlZ2F0b3IgPSBkZWxlZ2F0b3JDYWNoZS5kZWxlZ2F0b3JzW2NhY2hlS2V5XSA9XG4gICAgICAgICAgICBuZXcgRE9NRGVsZWdhdG9yKGRvY3VtZW50KVxuICAgIH1cblxuICAgIGlmIChvcHRzLmRlZmF1bHRFdmVudHMgIT09IGZhbHNlKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29tbW9uRXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBkZWxlZ2F0b3IubGlzdGVuVG8oY29tbW9uRXZlbnRzW2ldKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlbGVnYXRvclxufVxuXG5EZWxlZ2F0b3IuYWxsb2NhdGVIYW5kbGUgPSBET01EZWxlZ2F0b3IuYWxsb2NhdGVIYW5kbGU7XG5EZWxlZ2F0b3IudHJhbnNmb3JtSGFuZGxlID0gRE9NRGVsZWdhdG9yLnRyYW5zZm9ybUhhbmRsZTtcbiIsInZhciByb290ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgP1xuICAgIHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID9cbiAgICBnbG9iYWwgOiB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbmRpdmlkdWFsXG5cbmZ1bmN0aW9uIEluZGl2aWR1YWwoa2V5LCB2YWx1ZSkge1xuICAgIGlmIChyb290W2tleV0pIHtcbiAgICAgICAgcmV0dXJuIHJvb3Rba2V5XVxuICAgIH1cblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyb290LCBrZXksIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICAgICwgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSlcblxuICAgIHJldHVybiB2YWx1ZVxufVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCJ2YXIgaGlkZGVuU3RvcmUgPSByZXF1aXJlKCcuL2hpZGRlbi1zdG9yZS5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZVN0b3JlO1xuXG5mdW5jdGlvbiBjcmVhdGVTdG9yZSgpIHtcbiAgICB2YXIga2V5ID0ge307XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICBpZiAoKHR5cGVvZiBvYmogIT09ICdvYmplY3QnIHx8IG9iaiA9PT0gbnVsbCkgJiZcbiAgICAgICAgICAgIHR5cGVvZiBvYmogIT09ICdmdW5jdGlvbidcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1dlYWttYXAtc2hpbTogS2V5IG11c3QgYmUgb2JqZWN0JylcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzdG9yZSA9IG9iai52YWx1ZU9mKGtleSk7XG4gICAgICAgIHJldHVybiBzdG9yZSAmJiBzdG9yZS5pZGVudGl0eSA9PT0ga2V5ID9cbiAgICAgICAgICAgIHN0b3JlIDogaGlkZGVuU3RvcmUob2JqLCBrZXkpO1xuICAgIH07XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGhpZGRlblN0b3JlO1xuXG5mdW5jdGlvbiBoaWRkZW5TdG9yZShvYmosIGtleSkge1xuICAgIHZhciBzdG9yZSA9IHsgaWRlbnRpdHk6IGtleSB9O1xuICAgIHZhciB2YWx1ZU9mID0gb2JqLnZhbHVlT2Y7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBcInZhbHVlT2ZcIiwge1xuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUgIT09IGtleSA/XG4gICAgICAgICAgICAgICAgdmFsdWVPZi5hcHBseSh0aGlzLCBhcmd1bWVudHMpIDogc3RvcmU7XG4gICAgICAgIH0sXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc3RvcmU7XG59XG4iLCJ2YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIilcblxudmFyIEFMTF9QUk9QUyA9IFtcbiAgICBcImFsdEtleVwiLCBcImJ1YmJsZXNcIiwgXCJjYW5jZWxhYmxlXCIsIFwiY3RybEtleVwiLFxuICAgIFwiZXZlbnRQaGFzZVwiLCBcIm1ldGFLZXlcIiwgXCJyZWxhdGVkVGFyZ2V0XCIsIFwic2hpZnRLZXlcIixcbiAgICBcInRhcmdldFwiLCBcInRpbWVTdGFtcFwiLCBcInR5cGVcIiwgXCJ2aWV3XCIsIFwid2hpY2hcIlxuXVxudmFyIEtFWV9QUk9QUyA9IFtcImNoYXJcIiwgXCJjaGFyQ29kZVwiLCBcImtleVwiLCBcImtleUNvZGVcIl1cbnZhciBNT1VTRV9QUk9QUyA9IFtcbiAgICBcImJ1dHRvblwiLCBcImJ1dHRvbnNcIiwgXCJjbGllbnRYXCIsIFwiY2xpZW50WVwiLCBcImxheWVyWFwiLFxuICAgIFwibGF5ZXJZXCIsIFwib2Zmc2V0WFwiLCBcIm9mZnNldFlcIiwgXCJwYWdlWFwiLCBcInBhZ2VZXCIsXG4gICAgXCJzY3JlZW5YXCIsIFwic2NyZWVuWVwiLCBcInRvRWxlbWVudFwiXG5dXG5cbnZhciBya2V5RXZlbnQgPSAvXmtleXxpbnB1dC9cbnZhciBybW91c2VFdmVudCA9IC9eKD86bW91c2V8cG9pbnRlcnxjb250ZXh0bWVudSl8Y2xpY2svXG5cbm1vZHVsZS5leHBvcnRzID0gUHJveHlFdmVudFxuXG5mdW5jdGlvbiBQcm94eUV2ZW50KGV2KSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFByb3h5RXZlbnQpKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJveHlFdmVudChldilcbiAgICB9XG5cbiAgICBpZiAocmtleUV2ZW50LnRlc3QoZXYudHlwZSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBLZXlFdmVudChldilcbiAgICB9IGVsc2UgaWYgKHJtb3VzZUV2ZW50LnRlc3QoZXYudHlwZSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBNb3VzZUV2ZW50KGV2KVxuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgQUxMX1BST1BTLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBwcm9wS2V5ID0gQUxMX1BST1BTW2ldXG4gICAgICAgIHRoaXNbcHJvcEtleV0gPSBldltwcm9wS2V5XVxuICAgIH1cblxuICAgIHRoaXMuX3Jhd0V2ZW50ID0gZXZcbiAgICB0aGlzLl9idWJibGVzID0gZmFsc2U7XG59XG5cblByb3h5RXZlbnQucHJvdG90eXBlLnByZXZlbnREZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3Jhd0V2ZW50LnByZXZlbnREZWZhdWx0KClcbn1cblxuUHJveHlFdmVudC5wcm90b3R5cGUuc3RhcnRQcm9wYWdhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9idWJibGVzID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gTW91c2VFdmVudChldikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgQUxMX1BST1BTLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBwcm9wS2V5ID0gQUxMX1BST1BTW2ldXG4gICAgICAgIHRoaXNbcHJvcEtleV0gPSBldltwcm9wS2V5XVxuICAgIH1cblxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgTU9VU0VfUFJPUFMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIG1vdXNlUHJvcEtleSA9IE1PVVNFX1BST1BTW2pdXG4gICAgICAgIHRoaXNbbW91c2VQcm9wS2V5XSA9IGV2W21vdXNlUHJvcEtleV1cbiAgICB9XG5cbiAgICB0aGlzLl9yYXdFdmVudCA9IGV2XG59XG5cbmluaGVyaXRzKE1vdXNlRXZlbnQsIFByb3h5RXZlbnQpXG5cbmZ1bmN0aW9uIEtleUV2ZW50KGV2KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBBTExfUFJPUFMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByb3BLZXkgPSBBTExfUFJPUFNbaV1cbiAgICAgICAgdGhpc1twcm9wS2V5XSA9IGV2W3Byb3BLZXldXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBLRVlfUFJPUFMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIGtleVByb3BLZXkgPSBLRVlfUFJPUFNbal1cbiAgICAgICAgdGhpc1trZXlQcm9wS2V5XSA9IGV2W2tleVByb3BLZXldXG4gICAgfVxuXG4gICAgdGhpcy5fcmF3RXZlbnQgPSBldlxufVxuXG5pbmhlcml0cyhLZXlFdmVudCwgUHJveHlFdmVudClcbiIsInZhciBFdlN0b3JlID0gcmVxdWlyZShcImV2LXN0b3JlXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gcmVtb3ZlRXZlbnRcblxuZnVuY3Rpb24gcmVtb3ZlRXZlbnQodGFyZ2V0LCB0eXBlLCBoYW5kbGVyKSB7XG4gICAgdmFyIGV2ZW50cyA9IEV2U3RvcmUodGFyZ2V0KVxuICAgIHZhciBldmVudCA9IGV2ZW50c1t0eXBlXVxuXG4gICAgaWYgKCFldmVudCkge1xuICAgICAgICByZXR1cm5cbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZXZlbnQpKSB7XG4gICAgICAgIHZhciBpbmRleCA9IGV2ZW50LmluZGV4T2YoaGFuZGxlcilcbiAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgZXZlbnQuc3BsaWNlKGluZGV4LCAxKVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChldmVudCA9PT0gaGFuZGxlcikge1xuICAgICAgICBldmVudHNbdHlwZV0gPSBudWxsXG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgT25lVmVyc2lvbkNvbnN0cmFpbnQgPSByZXF1aXJlKCdpbmRpdmlkdWFsL29uZS12ZXJzaW9uJyk7XG5cbnZhciBNWV9WRVJTSU9OID0gJzcnO1xuT25lVmVyc2lvbkNvbnN0cmFpbnQoJ2V2LXN0b3JlJywgTVlfVkVSU0lPTik7XG5cbnZhciBoYXNoS2V5ID0gJ19fRVZfU1RPUkVfS0VZQCcgKyBNWV9WRVJTSU9OO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2U3RvcmU7XG5cbmZ1bmN0aW9uIEV2U3RvcmUoZWxlbSkge1xuICAgIHZhciBoYXNoID0gZWxlbVtoYXNoS2V5XTtcblxuICAgIGlmICghaGFzaCkge1xuICAgICAgICBoYXNoID0gZWxlbVtoYXNoS2V5XSA9IHt9O1xuICAgIH1cblxuICAgIHJldHVybiBoYXNoO1xufVxuIiwidmFyIHRvcExldmVsID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOlxuICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDoge31cbnZhciBtaW5Eb2MgPSByZXF1aXJlKCdtaW4tZG9jdW1lbnQnKTtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY3VtZW50O1xufSBlbHNlIHtcbiAgICB2YXIgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddO1xuXG4gICAgaWYgKCFkb2NjeSkge1xuICAgICAgICBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J10gPSBtaW5Eb2M7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2NjeTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLypnbG9iYWwgd2luZG93LCBnbG9iYWwqL1xuXG52YXIgcm9vdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID9cbiAgICB3aW5kb3cgOiB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/XG4gICAgZ2xvYmFsIDoge307XG5cbm1vZHVsZS5leHBvcnRzID0gSW5kaXZpZHVhbDtcblxuZnVuY3Rpb24gSW5kaXZpZHVhbChrZXksIHZhbHVlKSB7XG4gICAgaWYgKGtleSBpbiByb290KSB7XG4gICAgICAgIHJldHVybiByb290W2tleV07XG4gICAgfVxuXG4gICAgcm9vdFtrZXldID0gdmFsdWU7XG5cbiAgICByZXR1cm4gdmFsdWU7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBJbmRpdmlkdWFsID0gcmVxdWlyZSgnLi9pbmRleC5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9uZVZlcnNpb247XG5cbmZ1bmN0aW9uIE9uZVZlcnNpb24obW9kdWxlTmFtZSwgdmVyc2lvbiwgZGVmYXVsdFZhbHVlKSB7XG4gICAgdmFyIGtleSA9ICdfX0lORElWSURVQUxfT05FX1ZFUlNJT05fJyArIG1vZHVsZU5hbWU7XG4gICAgdmFyIGVuZm9yY2VLZXkgPSBrZXkgKyAnX0VORk9SQ0VfU0lOR0xFVE9OJztcblxuICAgIHZhciB2ZXJzaW9uVmFsdWUgPSBJbmRpdmlkdWFsKGVuZm9yY2VLZXksIHZlcnNpb24pO1xuXG4gICAgaWYgKHZlcnNpb25WYWx1ZSAhPT0gdmVyc2lvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBvbmx5IGhhdmUgb25lIGNvcHkgb2YgJyArXG4gICAgICAgICAgICBtb2R1bGVOYW1lICsgJy5cXG4nICtcbiAgICAgICAgICAgICdZb3UgYWxyZWFkeSBoYXZlIHZlcnNpb24gJyArIHZlcnNpb25WYWx1ZSArXG4gICAgICAgICAgICAnIGluc3RhbGxlZC5cXG4nICtcbiAgICAgICAgICAgICdUaGlzIG1lYW5zIHlvdSBjYW5ub3QgaW5zdGFsbCB2ZXJzaW9uICcgKyB2ZXJzaW9uKTtcbiAgICB9XG5cbiAgICByZXR1cm4gSW5kaXZpZHVhbChrZXksIGRlZmF1bHRWYWx1ZSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjbGFzc0lkU3BsaXQgPSAvKFtcXC4jXT9bYS16QS1aMC05XFx1MDA3Ri1cXHVGRkZGXzotXSspLztcbnZhciBub3RDbGFzc0lkID0gL15cXC58Iy87XG5cbm1vZHVsZS5leHBvcnRzID0gcGFyc2VUYWc7XG5cbmZ1bmN0aW9uIHBhcnNlVGFnKHRhZywgcHJvcHMpIHtcbiAgaWYgKCF0YWcpIHtcbiAgICByZXR1cm4gJ0RJVic7XG4gIH1cblxuICB2YXIgbm9JZCA9ICEocHJvcHMuaGFzT3duUHJvcGVydHkoJ2lkJykpO1xuXG4gIHZhciB0YWdQYXJ0cyA9IHRhZy5zcGxpdChjbGFzc0lkU3BsaXQpO1xuICB2YXIgdGFnTmFtZSA9IG51bGw7XG5cbiAgaWYgKG5vdENsYXNzSWQudGVzdCh0YWdQYXJ0c1sxXSkpIHtcbiAgICB0YWdOYW1lID0gJ0RJVic7XG4gIH1cblxuICB2YXIgY2xhc3NlcywgcGFydCwgdHlwZSwgaTtcblxuICBmb3IgKGkgPSAwOyBpIDwgdGFnUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBwYXJ0ID0gdGFnUGFydHNbaV07XG5cbiAgICBpZiAoIXBhcnQpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHR5cGUgPSBwYXJ0LmNoYXJBdCgwKTtcblxuICAgIGlmICghdGFnTmFtZSkge1xuICAgICAgdGFnTmFtZSA9IHBhcnQ7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnLicpIHtcbiAgICAgIGNsYXNzZXMgPSBjbGFzc2VzIHx8IFtdO1xuICAgICAgY2xhc3Nlcy5wdXNoKHBhcnQuc3Vic3RyaW5nKDEsIHBhcnQubGVuZ3RoKSk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnIycgJiYgbm9JZCkge1xuICAgICAgcHJvcHMuaWQgPSBwYXJ0LnN1YnN0cmluZygxLCBwYXJ0Lmxlbmd0aCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGNsYXNzZXMpIHtcbiAgICBpZiAocHJvcHMuY2xhc3NOYW1lKSB7XG4gICAgICBjbGFzc2VzLnB1c2gocHJvcHMuY2xhc3NOYW1lKTtcbiAgICB9XG5cbiAgICBwcm9wcy5jbGFzc05hbWUgPSBjbGFzc2VzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHJldHVybiBwcm9wcy5uYW1lc3BhY2UgPyB0YWdOYW1lIDogdGFnTmFtZS50b1VwcGVyQ2FzZSgpO1xufVxuIiwiaW1wb3J0IHtoLCByZW5kZXJ9IGZyb20gJ3lvbGsnXG5pbXBvcnQge0JlaGF2aW9yU3ViamVjdH0gZnJvbSAncnhqcy9CZWhhdmlvclN1YmplY3QnIFxuXG5pbXBvcnQgJ3J4anMvYWRkL29wZXJhdG9yL2ZpbHRlcidcbmltcG9ydCAncnhqcy9hZGQvb3BlcmF0b3IvbWVyZ2UnXG5pbXBvcnQgJ3J4anMvYWRkL29wZXJhdG9yL3NjYW4nXG5pbXBvcnQgJ3J4anMvYWRkL29wZXJhdG9yL3N0YXJ0V2l0aCdcbmltcG9ydCAncnhqcy9hZGQvb3BlcmF0b3Ivd2l0aExhdGVzdEZyb20nXG5cbmV4cG9ydCBkZWZhdWx0IFR5cGVBaGVhZFxuXG5cbmNvbnN0IERFRkFVTFRfUE9TID0gMFxuY29uc3QgS0VZID0ge1xuICBVUDogMzgsXG4gIERPV046IDQwLFxuICBFTlRFUjogMTMsXG4gIEVTQzogMjdcbn1cbmNvbnN0IEtFWV9WQUxVRVMgPSBbS0VZLlVQLCBLRVkuRE9XTiwgS0VZLkVOVEVSLCBLRVkuRVNDXVxuXG5mdW5jdGlvbiBUeXBlQWhlYWQoe3Byb3BzLCBjcmVhdGVFdmVudEhhbmRsZXJ9KSB7XG4gIHByb3BzID0gc2V0RGVmYXVsdFByb3BzKHByb3BzKVxuXG4gIGNvbnN0IGhhbmRsZUtleVVwID0gY3JlYXRlRXZlbnRIYW5kbGVyKGV2ID0+IGV2LmtleUNvZGUpXG4gIGNvbnN0IGhhbmRsZUlucHV0ID0gY3JlYXRlRXZlbnRIYW5kbGVyKGV2ID0+IGV2LnRhcmdldC52YWx1ZSlcbiAgY29uc3QgZGlzcGxheVZhbHVlID0gbmV3IEJlaGF2aW9yU3ViamVjdCgnJylcblxuICBoYW5kbGVJbnB1dC5zdWJzY3JpYmUoZGlzcGxheVZhbHVlKVxuXG4gIGhhbmRsZUtleVVwXG4gICAgXG4gICAgLy8gT25lIG9mIG91ciBgS0VZU2Agd2FzIHByZXNzZWRcbiAgICAuZmlsdGVyKGtleUNvZGUgPT4gS0VZX1ZBTFVFUy5pbmRleE9mKGtleUNvZGUpID4gLTEpXG4gICAgXG4gICAgLy8gQ29tYmluZSBga2V5Q29kZWAgd2l0aCBgZGlzcGxheVZhbHVlYCBpbiBhbiBvYmplY3RcbiAgICAud2l0aExhdGVzdEZyb20oZGlzcGxheVZhbHVlLCAoa2V5Q29kZSwgdmFsKSA9PiAoe2tleUNvZGUsIHZhbH0pKVxuICAgIFxuICAgIC8vIENvbnRpbnVlIGlmIHRoZSBsZW5ndGggb2YgdGhlIHVzZXIgaW5wdXQgaXMgPj0gb3VyIHRocmVzaG9sZFxuICAgIC5maWx0ZXIoKHt2YWx9KSA9PiB2YWwgJiYgdmFsLmxlbmd0aCA+PSBwcm9wcy50aHJlc2hvbGQpXG4gICAgXG4gICAgLy8gT2ssIGRvIHN0dWZmIGRlcGVuZGluZyBvbiB0aGUgYGtleUNvZGVgXG4gICAgLnN1YnNjcmliZSgoe2tleUNvZGUsIHZhbH0pID0+IHtcbiAgICAgIHN3aXRjaCAoa2V5Q29kZSkge1xuICAgICAgICBjYXNlIEtFWS5VUDpcbiAgICAgICAgICBpZiAocHJvcHMuY3VyclBvcyA+IDApIHtcbiAgICAgICAgICAgIHByb3BzLmN1cnJQb3MtLVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIEtFWS5ET1dOOlxuICAgICAgICAgIGxldCBtYXggPSBwcm9wcy5zdWdnZXN0aW9ucy5sZW5ndGggLSAxXG4gICAgICAgICAgaWYgKHByb3BzLmN1cnJQb3MgPCBtYXggfHwgcHJvcHMuY3VyclBvcyA9PT0gREVGQVVMVF9QT1MpIHtcbiAgICAgICAgICAgIHByb3BzLmN1cnJQb3MrK1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIEtFWS5FTlRFUjpcbiAgICAgICAgICBjb25zb2xlLmRlYnVnKCdoYW5kbGVTZWxlY3Rpb24nLCBwcm9wcy5zdWdnZXN0aW9uc1twcm9wcy5jdXJyUG9zXSB8fCB2YWwpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSBLRVkuRVNDOlxuICAgICAgICAgIHByb3BzLnNob3dTdWdnZXN0aW9ucyA9IGZhbHNlXG4gICAgICB9XG4gICAgfSlcblxuICBsZXQgY2xhc3NlcyA9IFsndHlwZS1haGVhZC1ob2xkZXInXTtcbiAgaWYgKHByb3BzLnNob3dTdWdnZXN0aW9ucykge1xuICAgIGNsYXNzZXMucHVzaCgndHlwZS1haGVhZC1zdWdnZXN0aW9ucy12aXNpYmxlJylcbiAgfSBcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPXtjbGFzc2VzfT5cbiAgICAgIDxpbnB1dCBcbiAgICAgICAgcGxhY2Vob2xkZXI9e3Byb3BzLnBsYWNlaG9sZGVyfSBcbiAgICAgICAgLy8gdmFsdWU9e2Rpc3BsYXlWYWx1ZX1cbiAgICAgICAgb25JbnB1dD17aGFuZGxlSW5wdXR9XG4gICAgICAgIG9uS2V5VXA9e2hhbmRsZUtleVVwfVxuICAgICAgICAvL25nLWJsdXI9XCJwcm9wcy5vbkJsdXIoKVwiIFxuICAgICAgICBjbGFzc05hbWU9XCJ0eXBlLWFoZWFkLWlucHV0XCIgLz5cblxuICAgICAgPHVsIGNsYXNzTmFtZT1cInR5cGUtYWhlYWQtbGlzdFwiPlxuICAgICAgPC91bD5cbiAgICA8L2Rpdj4gXG4gIClcblxuXG59XG5cbmZ1bmN0aW9uIHNldERlZmF1bHRQcm9wcyhwcm9wcykge1xuICBwcm9wcy5jdXJyUG9zID0gcHJvcHMuY3VyclBvcyB8fCBERUZBVUxUX1BPU1xuICBwcm9wcy5zdWdnZXN0aW9ucyA9IHByb3BzLnN1Z2dlc3Rpb25zIHx8IFtdXG4gIHByb3BzLnNob3dTdWdnZXN0aW9ucyA9IHByb3BzLnNob3dTdWdnZXN0aW9ucyB8fCBmYWxzZVxuICBwcm9wcy50aHJlc2hvbGQgPSBwcm9wcy50aHJlc2hvbGQgfHwgMlxuICBwcm9wcy5saW1pdCA9IHByb3BzLmxpbWl0IHx8IEluZmluaXR5XG4gIHByb3BzLmRlbGF5ID0gcHJvcHMuZGVsYXkgfHwgMTAwXG4gIHJldHVybiBwcm9wc1xufVxuIiwiaW1wb3J0IHtoLCByZW5kZXJ9IGZyb20gJ3lvbGsnXG5pbXBvcnQgVHlwZUFoZWFkIGZyb20gJy4vVHlwZUFoZWFkLmpzeCdcblxucmVuZGVyKFxuICA8VHlwZUFoZWFkIHRpdGxlPVwiVHlwZUFoZWFkXCI+VHlwZSBhaGVhZCBteSBnb29kIGZyaWVuZDwvVHlwZUFoZWFkPixcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbnRhaW5lcicpXG4pXG4iXX0=
