function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function getAugmentedNamespace(n) {
  if (Object.prototype.hasOwnProperty.call(n, '__esModule')) return n;
  var f = n.default;
	if (typeof f == "function") {
		var a = function a () {
			var isInstance = false;
      try {
        isInstance = this instanceof a;
      } catch (e) {}
			if (isInstance) {
        return Reflect.construct(f, arguments, this.constructor);
			}
			return f.apply(this, arguments);
		};
		a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, '__esModule', {value: true});
	Object.keys(n).forEach(function (k) {
		var d = Object.getOwnPropertyDescriptor(n, k);
		Object.defineProperty(a, k, d.get ? d : {
			enumerable: true,
			get: function () {
				return n[k];
			}
		});
	});
	return a;
}

/**
 * Checks whether node is of specific bpmn type.
 *
 * @param {ModdleElement} node
 * @param {String} type
 *
 * @return {Boolean}
 */
function is(node, type) {

  if (type.indexOf(':') === -1) {
    type = 'bpmn:' + type;
  }

  return (
    (typeof node.$instanceOf === 'function')
      ? node.$instanceOf(type)
      : node.$type === type
  );
}

/**
 * Checks whether node has any of the specified types.
 *
 * @param {ModdleElement} node
 * @param {Array<String>} types
 *
 * @return {Boolean}
 */
function isAny(node, types) {
  return types.some(function(type) {
    return is(node, type);
  });
}

var index_esm = /*#__PURE__*/Object.freeze({
	__proto__: null,
	is: is,
	isAny: isAny
});

var require$$0$1 = /*@__PURE__*/getAugmentedNamespace(index_esm);

var helper = {};

var hasRequiredHelper;

function requireHelper () {
	if (hasRequiredHelper) return helper;
	hasRequiredHelper = 1;
	const {
	  is
	} = require$$0$1;

	/**
	 * @typedef { import('../lib/types.js').ModdleElement } ModdleElement
	 *
	 * @typedef { import('../lib/types.js').RuleFactory } RuleFactory
	 * @typedef { import('../lib/types.js').RuleDefinition } RuleDefinition
	 */


	/**
	 * Create a checker that disallows the given element type.
	 *
	 * @param { string } type
	 *
	 * @return { RuleFactory } ruleFactory
	 */
	function checkDiscouragedNodeType(type, ruleName) {

	  /**
	   * @type { RuleFactory }
	   */
	  return function() {

	    function check(node, reporter) {

	      if (is(node, type)) {
	        reporter.report(node.id, 'Element type <' + type + '> is discouraged');
	      }
	    }

	    return annotateRule(ruleName, {
	      check
	    });

	  };

	}

	helper.checkDiscouragedNodeType = checkDiscouragedNodeType;


	/**
	 * Find a parent for the given element
	 *
	 * @param { ModdleElement } node
	 * @param { string } type
	 *
	 * @return { ModdleElement } element
	 */
	function findParent(node, type) {
	  if (!node) {
	    return null;
	  }

	  const parent = node.$parent;

	  if (!parent) {
	    return node;
	  }

	  if (is(parent, type)) {
	    return parent;
	  }

	  return findParent(parent, type);
	}

	helper.findParent = findParent;


	/**
	 * Check if the node is inside of an executable process.
	 *
	 * @param { ModdleElement } node
	 *
	 * @return { boolean }
	 */
	function isInExecutableProcess(node) {
	  const process = findParent(node, 'bpmn:Process');

	  return process && process.isExecutable;
	}

	helper.isInExecutableProcess = isInExecutableProcess;


	const documentationBaseUrl = 'https://github.com/bpmn-io/bpmnlint/blob/main/docs/rules';

	/**
	 * Annotate a rule with core information, such as the documentation url.
	 *
	 * @param {string} ruleName
	 * @param {RuleDefinition} options
	 *
	 * @return {RuleDefinition}
	 */
	function annotateRule(ruleName, options) {

	  const {
	    meta: {
	      documentation = {},
	      ...restMeta
	    } = {},
	    ...restOptions
	  } = options;

	  const documentationUrl = `${documentationBaseUrl}/${ruleName}.md`;

	  return {
	    meta: {
	      documentation: {
	        url: documentationUrl,
	        ...documentation
	      },
	      ...restMeta
	    },
	    ...restOptions
	  };
	}

	helper.annotateRule = annotateRule;
	return helper;
}

var adHocSubProcess;
var hasRequiredAdHocSubProcess;

function requireAdHocSubProcess () {
	if (hasRequiredAdHocSubProcess) return adHocSubProcess;
	hasRequiredAdHocSubProcess = 1;
	const {
	  is
	} = require$$0$1;

	const {
	  annotateRule
	} = requireHelper();


	/**
	 * A rule that ensures that an Ad Hoc Sub Process is valid according to the BPMN spec:
	 *
	 * - No start or end events
	 *
	 * @type { import('../lib/types.js').RuleFactory }
	 */
	adHocSubProcess = function() {

	  function check(node, reporter) {

	    if (!is(node, 'bpmn:AdHocSubProcess')) {
	      return;
	    }

	    const flowElements = node.flowElements || [];

	    flowElements.forEach(function(flowElement) {

	      if (is(flowElement, 'bpmn:StartEvent')) {
	        reporter.report(flowElement.id, 'A <Start Event> is not allowed in <Ad Hoc Sub Process>');
	      }

	      if (is(flowElement, 'bpmn:EndEvent')) {
	        reporter.report(flowElement.id, 'An <End Event> is not allowed in <Ad Hoc Sub Process>');
	      }
	    });
	  }

	  return annotateRule('ad-hoc-sub-process', {
	    check
	  });

	};
	return adHocSubProcess;
}

var adHocSubProcessExports = requireAdHocSubProcess();
var rule_0 = /*@__PURE__*/getDefaultExportFromCjs(adHocSubProcessExports);

var conditionalEvent;
var hasRequiredConditionalEvent;

function requireConditionalEvent () {
	if (hasRequiredConditionalEvent) return conditionalEvent;
	hasRequiredConditionalEvent = 1;
	const {
	  is
	} = require$$0$1;

	const {
	  annotateRule,
	  isInExecutableProcess
	} = requireHelper();


	/**
	 * Ensures that a conditional event has a condition specified.
	 *
	 * @type { import('../lib/types.js').RuleFactory }
	 */
	conditionalEvent = function() {

	  function check(node, reporter) {

	    if (!isInExecutableProcess(node)) {
	      return;
	    }

	    const eventDefinition = getConditionalEventDefinition(node);

	    if (!eventDefinition) {
	      return;
	    }

	    if (!hasCondition(eventDefinition)) {
	      reporter.report(node.id, 'Conditional event is missing a condition', [ 'condition' ]);
	    }
	  }

	  return annotateRule('conditional-event', {
	    check
	  });

	};

	function getConditionalEventDefinition(node) {
	  if (!is(node, 'bpmn:Event')) {
	    return;
	  }

	  const eventDefinitions = node.eventDefinitions || [];
	  return eventDefinitions.find(def => is(def, 'bpmn:ConditionalEventDefinition'));
	}

	function hasCondition(eventDefinition) {
	  return !!eventDefinition.condition?.body;
	}
	return conditionalEvent;
}

var conditionalEventExports = requireConditionalEvent();
var rule_1 = /*@__PURE__*/getDefaultExportFromCjs(conditionalEventExports);

var eventBasedGateway;
var hasRequiredEventBasedGateway;

function requireEventBasedGateway () {
	if (hasRequiredEventBasedGateway) return eventBasedGateway;
	hasRequiredEventBasedGateway = 1;
	const {
	  is
	} = require$$0$1;

	const {
	  annotateRule
	} = requireHelper();


	/**
	 * A rule that checks, whether an event-based gateway:
	 * - has at least two outgoing sequence flows
	 * - the outgoing sequence flows are not conditional
	 *
	 * @type { import('../lib/types.js').RuleFactory }
	 */
	eventBasedGateway = function() {

	  function check(node, reporter) {

	    if (!is(node, 'bpmn:EventBasedGateway')) {
	      return;
	    }

	    const outgoing = node.outgoing || [];

	    if (outgoing.length < 2) {
	      reporter.report(node.id, 'An <Event-based Gateway> must have at least 2 outgoing <Sequence Flows>');
	    }

	    outgoing.forEach((flow) => {
	      if (hasCondition(flow)) {
	        reporter.report(flow.id, 'A <Sequence Flow> outgoing from an <Event-based Gateway> must not be conditional');
	      }
	    });
	  }

	  return annotateRule('event-based-gateway', {
	    check
	  });
	};

	function hasCondition(flow) {
	  return !!flow.conditionExpression;
	}
	return eventBasedGateway;
}

var eventBasedGatewayExports = requireEventBasedGateway();
var rule_2 = /*@__PURE__*/getDefaultExportFromCjs(eventBasedGatewayExports);

var eventSubProcessTypedStartEvent;
var hasRequiredEventSubProcessTypedStartEvent;

function requireEventSubProcessTypedStartEvent () {
	if (hasRequiredEventSubProcessTypedStartEvent) return eventSubProcessTypedStartEvent;
	hasRequiredEventSubProcessTypedStartEvent = 1;
	const {
	  is
	} = require$$0$1;

	const {
	  annotateRule
	} = requireHelper();


	/**
	 * A rule that checks that start events inside an event sub-process
	 * are typed.
	 *
	 * @type { import('../lib/types.js').RuleFactory }
	 */
	eventSubProcessTypedStartEvent = function() {

	  function check(node, reporter) {

	    if (!is(node, 'bpmn:SubProcess') || !node.triggeredByEvent) {
	      return;
	    }

	    const flowElements = node.flowElements || [];

	    flowElements.forEach(function(flowElement) {

	      if (!is(flowElement, 'bpmn:StartEvent')) {
	        return false;
	      }

	      const eventDefinitions = flowElement.eventDefinitions || [];

	      if (eventDefinitions.length === 0) {
	        reporter.report(flowElement.id, 'Start event is missing event definition', [ 'eventDefinitions' ]);
	      }
	    });
	  }

	  return annotateRule('event-sub-process-typed-start-event', {
	    check
	  });

	};
	return eventSubProcessTypedStartEvent;
}

var eventSubProcessTypedStartEventExports = requireEventSubProcessTypedStartEvent();
var rule_3 = /*@__PURE__*/getDefaultExportFromCjs(eventSubProcessTypedStartEventExports);

/**
 * Flatten array, one level deep.
 *
 * @template T
 *
 * @param {T[][] | T[] | null} [arr]
 *
 * @return {T[]}
 */
function flatten(arr) {
  return Array.prototype.concat.apply([], arr);
}

const nativeToString = Object.prototype.toString;
const nativeHasOwnProperty = Object.prototype.hasOwnProperty;

function isUndefined(obj) {
  return obj === undefined;
}

function isDefined(obj) {
  return obj !== undefined;
}

function isNil(obj) {
  return obj == null;
}

function isArray(obj) {
  return nativeToString.call(obj) === '[object Array]';
}

function isObject(obj) {
  return nativeToString.call(obj) === '[object Object]';
}

function isNumber(obj) {
  return nativeToString.call(obj) === '[object Number]';
}

/**
 * @param {any} obj
 *
 * @return {boolean}
 */
function isFunction(obj) {
  const tag = nativeToString.call(obj);

  return (
    tag === '[object Function]' ||
    tag === '[object AsyncFunction]' ||
    tag === '[object GeneratorFunction]' ||
    tag === '[object AsyncGeneratorFunction]' ||
    tag === '[object Proxy]'
  );
}

function isString(obj) {
  return nativeToString.call(obj) === '[object String]';
}


/**
 * Ensure collection is an array.
 *
 * @param {Object} obj
 */
function ensureArray(obj) {

  if (isArray(obj)) {
    return;
  }

  throw new Error('must supply array');
}

/**
 * Return true, if target owns a property with the given key.
 *
 * @param {Object} target
 * @param {String} key
 *
 * @return {Boolean}
 */
function has(target, key) {
  return !isNil(target) && nativeHasOwnProperty.call(target, key);
}

/**
 * @template T
 * @typedef { (
 *   ((e: T) => boolean) |
 *   ((e: T, idx: number) => boolean) |
 *   ((e: T, key: string) => boolean) |
 *   string |
 *   number
 * ) } Matcher
 */

/**
 * @template T
 * @template U
 *
 * @typedef { (
 *   ((e: T) => U) | string | number
 * ) } Extractor
 */


/**
 * @template T
 * @typedef { (val: T, key: any) => boolean } MatchFn
 */

/**
 * @template T
 * @typedef { T[] } ArrayCollection
 */

/**
 * @template T
 * @typedef { { [key: string]: T } } StringKeyValueCollection
 */

/**
 * @template T
 * @typedef { { [key: number]: T } } NumberKeyValueCollection
 */

/**
 * @template T
 * @typedef { StringKeyValueCollection<T> | NumberKeyValueCollection<T> } KeyValueCollection
 */

/**
 * @template T
 * @typedef { KeyValueCollection<T> | ArrayCollection<T> } Collection
 */

/**
 * Find element in collection.
 *
 * @template T
 * @param {Collection<T>} collection
 * @param {Matcher<T>} matcher
 *
 * @return {Object}
 */
function find(collection, matcher) {

  const matchFn = toMatcher(matcher);

  let match;

  forEach(collection, function(val, key) {
    if (matchFn(val, key)) {
      match = val;

      return false;
    }
  });

  return match;

}


/**
 * Find element index in collection.
 *
 * @template T
 * @param {Collection<T>} collection
 * @param {Matcher<T>} matcher
 *
 * @return {number | string | undefined}
 */
function findIndex(collection, matcher) {

  const matchFn = toMatcher(matcher);

  let idx = isArray(collection) ? -1 : undefined;

  forEach(collection, function(val, key) {
    if (matchFn(val, key)) {
      idx = key;

      return false;
    }
  });

  return idx;
}


/**
 * Filter elements in collection.
 *
 * @template T
 * @param {Collection<T>} collection
 * @param {Matcher<T>} matcher
 *
 * @return {T[]} result
 */
function filter(collection, matcher) {

  const matchFn = toMatcher(matcher);

  let result = [];

  forEach(collection, function(val, key) {
    if (matchFn(val, key)) {
      result.push(val);
    }
  });

  return result;
}


/**
 * Iterate over collection; returning something
 * (non-undefined) will stop iteration.
 *
 * @template T
 * @param {Collection<T>} collection
 * @param { ((item: T, idx: number) => (boolean|void)) | ((item: T, key: string) => (boolean|void)) } iterator
 *
 * @return {T} return result that stopped the iteration
 */
function forEach(collection, iterator) {

  let val,
      result;

  if (isUndefined(collection)) {
    return;
  }

  const convertKey = isArray(collection) ? toNum : identity;

  for (let key in collection) {

    if (has(collection, key)) {
      val = collection[key];

      result = iterator(val, convertKey(key));

      if (result === false) {
        return val;
      }
    }
  }
}

/**
 * Return collection without element.
 *
 * @template T
 * @param {ArrayCollection<T>} arr
 * @param {Matcher<T>} matcher
 *
 * @return {T[]}
 */
function without(arr, matcher) {

  if (isUndefined(arr)) {
    return [];
  }

  ensureArray(arr);

  const matchFn = toMatcher(matcher);

  return arr.filter(function(el, idx) {
    return !matchFn(el, idx);
  });

}


/**
 * Reduce collection, returning a single result.
 *
 * @template T
 * @template V
 *
 * @param {Collection<T>} collection
 * @param {(result: V, entry: T, index: any) => V} iterator
 * @param {V} result
 *
 * @return {V} result returned from last iterator
 */
function reduce(collection, iterator, result) {

  forEach(collection, function(value, idx) {
    result = iterator(result, value, idx);
  });

  return result;
}


/**
 * Return true if every element in the collection
 * matches the criteria.
 *
 * @param  {Object|Array} collection
 * @param  {Function} matcher
 *
 * @return {Boolean}
 */
function every(collection, matcher) {

  return !!reduce(collection, function(matches, val, key) {
    return matches && matcher(val, key);
  }, true);
}


/**
 * Return true if some elements in the collection
 * match the criteria.
 *
 * @param  {Object|Array} collection
 * @param  {Function} matcher
 *
 * @return {Boolean}
 */
function some(collection, matcher) {

  return !!find(collection, matcher);
}


/**
 * Transform a collection into another collection
 * by piping each member through the given fn.
 *
 * @param  {Object|Array}   collection
 * @param  {Function} fn
 *
 * @return {Array} transformed collection
 */
function map(collection, fn) {

  let result = [];

  forEach(collection, function(val, key) {
    result.push(fn(val, key));
  });

  return result;
}


/**
 * Get the collections keys.
 *
 * @param  {Object|Array} collection
 *
 * @return {Array}
 */
function keys(collection) {
  return collection && Object.keys(collection) || [];
}


/**
 * Shorthand for `keys(o).length`.
 *
 * @param  {Object|Array} collection
 *
 * @return {Number}
 */
function size(collection) {
  return keys(collection).length;
}


/**
 * Get the values in the collection.
 *
 * @param  {Object|Array} collection
 *
 * @return {Array}
 */
function values(collection) {
  return map(collection, (val) => val);
}


/**
 * Group collection members by attribute.
 *
 * @param {Object|Array} collection
 * @param {Extractor} extractor
 *
 * @return {Object} map with { attrValue => [ a, b, c ] }
 */
function groupBy(collection, extractor, grouped = {}) {

  extractor = toExtractor(extractor);

  forEach(collection, function(val) {
    let discriminator = extractor(val) || '_';

    let group = grouped[discriminator];

    if (!group) {
      group = grouped[discriminator] = [];
    }

    group.push(val);
  });

  return grouped;
}


function uniqueBy(extractor, ...collections) {

  extractor = toExtractor(extractor);

  let grouped = {};

  forEach(collections, (c) => groupBy(c, extractor, grouped));

  let result = map(grouped, function(val, key) {
    return val[0];
  });

  return result;
}


const unionBy = uniqueBy;



/**
 * Sort collection by criteria.
 *
 * @template T
 *
 * @param {Collection<T>} collection
 * @param {Extractor<T, number | string>} extractor
 *
 * @return {Array}
 */
function sortBy(collection, extractor) {

  extractor = toExtractor(extractor);

  let sorted = [];

  forEach(collection, function(value, key) {
    let disc = extractor(value, key);

    let entry = {
      d: disc,
      v: value
    };

    for (var idx = 0; idx < sorted.length; idx++) {
      let { d } = sorted[idx];

      if (disc < d) {
        sorted.splice(idx, 0, entry);
        return;
      }
    }

    // not inserted, append (!)
    sorted.push(entry);
  });

  return map(sorted, (e) => e.v);
}


/**
 * Create an object pattern matcher.
 *
 * @example
 *
 * ```javascript
 * const matcher = matchPattern({ id: 1 });
 *
 * let element = find(elements, matcher);
 * ```
 *
 * @template T
 *
 * @param {T} pattern
 *
 * @return { (el: any) =>  boolean } matcherFn
 */
function matchPattern(pattern) {

  return function(el) {

    return every(pattern, function(val, key) {
      return el[key] === val;
    });

  };
}


/**
 * @param {string | ((e: any) => any) } extractor
 *
 * @return { (e: any) => any }
 */
function toExtractor(extractor) {

  /**
   * @satisfies { (e: any) => any }
   */
  return isFunction(extractor) ? extractor : (e) => {

    // @ts-ignore: just works
    return e[extractor];
  };
}


/**
 * @template T
 * @param {Matcher<T>} matcher
 *
 * @return {MatchFn<T>}
 */
function toMatcher(matcher) {
  return isFunction(matcher) ? matcher : (e) => {
    return e === matcher;
  };
}


function identity(arg) {
  return arg;
}

function toNum(arg) {
  return Number(arg);
}

/**
 * @template {(...args: any[]) => any} T
 * @typedef { {
 *   (...args: Parameters<T>): void;
 *   flush: () => void;
 *   cancel: () => void;
 * } } DebouncedFunction
 */

/**
 * Debounce fn, calling it only once if the given time
 * elapsed between calls.
 *
 * Lodash-style the function exposes methods to `#clear`
 * and `#flush` to control internal behavior.
 *
 * @template {(...args: any[]) => any} T
 *
 * @param  {T} fn
 * @param  {number} timeout
 *
 * @return {DebouncedFunction<T>} debounced function
 */
function debounce(fn, timeout) {

  let timer;

  let lastArgs;
  let lastThis;

  let lastNow;

  function fire(force) {

    let now = Date.now();

    let scheduledDiff = force ? 0 : (lastNow + timeout) - now;

    if (scheduledDiff > 0) {
      return schedule(scheduledDiff);
    }

    fn.apply(lastThis, lastArgs);

    clear();
  }

  function schedule(timeout) {
    timer = setTimeout(fire, timeout);
  }

  function clear() {
    if (timer) {
      clearTimeout(timer);
    }

    timer = lastNow = lastArgs = lastThis = undefined;
  }

  function flush() {
    if (timer) {
      fire(true);
    }

    clear();
  }

  /**
   * @type {DebouncedFunction<T>}
   */
  function callback(...args) {
    lastNow = Date.now();

    lastArgs = args;
    lastThis = this;

    // ensure an execution is scheduled
    if (!timer) {
      schedule(timeout);
    }
  }

  callback.flush = flush;
  callback.cancel = clear;

  return callback;
}

/**
 * Throttle fn, calling at most once
 * in the given interval.
 *
 * @template {(...args: any[]) => any} T
 *
 * @param  {T} fn
 * @param  {number} interval
 *
 * @return {(...args: Parameters<T>) => void} throttled function
 */
function throttle(fn, interval) {
  let throttling = false;

  return function(...args) {

    if (throttling) {
      return;
    }

    fn(...args);
    throttling = true;

    setTimeout(() => {
      throttling = false;
    }, interval);
  };
}

/**
 * Bind function against target <this>.
 *
 * @param  {Function} fn
 * @param  {Object}   target
 *
 * @return {Function} bound function
 */
function bind(fn, target) {
  return fn.bind(target);
}

/**
 * Convenience wrapper for `Object.assign`.
 *
 * @param {Object} target
 * @param {...Object} others
 *
 * @return {Object} the target
 */
function assign(target, ...others) {
  return Object.assign(target, ...others);
}

/**
 * Sets a nested property of a given object to the specified value.
 *
 * This mutates the object and returns it.
 *
 * @template T
 *
 * @param {T} target The target of the set operation.
 * @param {(string|number)[]} path The path to the nested value.
 * @param {any} value The value to set.
 *
 * @return {T}
 */
function set(target, path, value) {

  let currentTarget = target;

  forEach(path, function(key, idx) {

    if (typeof key !== 'number' && typeof key !== 'string') {
      throw new Error('illegal key type: ' + typeof key + '. Key should be of type number or string.');
    }

    if (key === 'constructor') {
      throw new Error('illegal key: constructor');
    }

    if (key === '__proto__') {
      throw new Error('illegal key: __proto__');
    }

    let nextKey = path[idx + 1];
    let nextTarget = currentTarget[key];

    if (isDefined(nextKey) && isNil(nextTarget)) {
      nextTarget = currentTarget[key] = isNaN(+nextKey) ? {} : [];
    }

    if (isUndefined(nextKey)) {
      if (isUndefined(value)) {
        delete currentTarget[key];
      } else {
        currentTarget[key] = value;
      }
    } else {
      currentTarget = nextTarget;
    }
  });

  return target;
}


/**
 * Gets a nested property of a given object.
 *
 * @param {Object} target The target of the get operation.
 * @param {(string|number)[]} path The path to the nested value.
 * @param {any} [defaultValue] The value to return if no value exists.
 *
 * @return {any}
 */
function get(target, path, defaultValue) {

  let currentTarget = target;

  forEach(path, function(key) {

    // accessing nil property yields <undefined>
    if (isNil(currentTarget)) {
      currentTarget = undefined;

      return false;
    }

    currentTarget = currentTarget[key];
  });

  return isUndefined(currentTarget) ? defaultValue : currentTarget;
}

/**
 * Pick properties from the given target.
 *
 * @template T
 * @template {any[]} V
 *
 * @param {T} target
 * @param {V} properties
 *
 * @return Pick<T, V>
 */
function pick(target, properties) {

  let result = {};

  let obj = Object(target);

  forEach(properties, function(prop) {

    if (prop in obj) {
      result[prop] = target[prop];
    }
  });

  return result;
}

/**
 * Pick all target properties, excluding the given ones.
 *
 * @template T
 * @template {any[]} V
 *
 * @param {T} target
 * @param {V} properties
 *
 * @return {Omit<T, V>} target
 */
function omit(target, properties) {

  let result = {};

  let obj = Object(target);

  forEach(obj, function(prop, key) {

    if (properties.indexOf(key) === -1) {
      result[key] = prop;
    }
  });

  return result;
}

/**
 * Recursively merge `...sources` into given target.
 *
 * Does support merging objects; does not support merging arrays.
 *
 * @param {Object} target
 * @param {...Object} sources
 *
 * @return {Object} the target
 */
function merge(target, ...sources) {

  if (!sources.length) {
    return target;
  }

  forEach(sources, function(source) {

    // skip non-obj sources, i.e. null
    if (!source || !isObject(source)) {
      return;
    }

    forEach(source, function(sourceVal, key) {

      if (key === '__proto__') {
        return;
      }

      let targetVal = target[key];

      if (isObject(sourceVal)) {

        if (!isObject(targetVal)) {

          // override target[key] with object
          targetVal = {};
        }

        target[key] = merge(targetVal, sourceVal);
      } else {
        target[key] = sourceVal;
      }

    });
  });

  return target;
}

var dist = /*#__PURE__*/Object.freeze({
	__proto__: null,
	assign: assign,
	bind: bind,
	debounce: debounce,
	ensureArray: ensureArray,
	every: every,
	filter: filter,
	find: find,
	findIndex: findIndex,
	flatten: flatten,
	forEach: forEach,
	get: get,
	groupBy: groupBy,
	has: has,
	isArray: isArray,
	isDefined: isDefined,
	isFunction: isFunction,
	isNil: isNil,
	isNumber: isNumber,
	isObject: isObject,
	isString: isString,
	isUndefined: isUndefined,
	keys: keys,
	map: map,
	matchPattern: matchPattern,
	merge: merge,
	omit: omit,
	pick: pick,
	reduce: reduce,
	set: set,
	size: size,
	some: some,
	sortBy: sortBy,
	throttle: throttle,
	unionBy: unionBy,
	uniqueBy: uniqueBy,
	values: values,
	without: without
});

var require$$0 = /*@__PURE__*/getAugmentedNamespace(dist);

var linkEvent;
var hasRequiredLinkEvent;

function requireLinkEvent () {
	if (hasRequiredLinkEvent) return linkEvent;
	hasRequiredLinkEvent = 1;
	const {
	  groupBy
	} = require$$0;

	const {
	  is
	} = require$$0$1;

	const {
	  annotateRule
	} = requireHelper();


	/**
	 * A rule that verifies that link events are properly used.
	 *
	 * This implies:
	 *
	 *   * for every link throw there exists a link catch within
	 *     the same scope, and vice versa
	 *   * there exists only a single pair of [ throw, catch ] links
	 *     with a given name, per scope
	 *   * link events have a name
	 *
	 * @type { import('../lib/types.js').RuleFactory }
	 */
	linkEvent = function() {

	  function check(node, reporter) {

	    if (!is(node, 'bpmn:FlowElementsContainer')) {
	      return;
	    }

	    const links = (node.flowElements || []).filter(isLinkEvent);

	    for (const link of links) {
	      if (!getLinkName(link)) {
	        reporter.report(link.id, 'Link event is missing link name');
	      }
	    }

	    const names = groupBy(links, link => getLinkName(link));

	    for (const [ name, events ] of Object.entries(names)) {

	      // ignore unnamed (validated earlier)
	      if (!name) {
	        continue;
	      }

	      // missing catch or throw event
	      if (events.length === 1) {
	        const event = events[0];

	        reporter.report(event.id, `Link ${isThrowEvent(event) ? 'catch' : 'throw' } event with link name <${ name }> missing in scope`);
	        continue;
	      }

	      const catchEvents = events.filter(isCatchEvent);
	      if (catchEvents.length > 1) {
	        for (const event of catchEvents) {
	          reporter.report(event.id, `Duplicate link catch event with link name <${name}> in scope`);
	        }
	      } else if (catchEvents.length === 0) {

	        // all events in scope are throw events
	        for (const event of events) {
	          reporter.report(event.id, `Link catch event with link name <${ name }> missing in scope`);
	        }
	      }
	    }

	  }

	  return annotateRule('link-event', {
	    check
	  });
	};


	// helpers /////////////////

	function isLinkEvent(node) {

	  var eventDefinitions = node.eventDefinitions || [];

	  if (!is(node, 'bpmn:Event')) {
	    return false;
	  }

	  return eventDefinitions.some(
	    definition => is(definition, 'bpmn:LinkEventDefinition')
	  );
	}

	function getLinkName(linkEvent) {
	  return linkEvent.get('eventDefinitions').find(def => is(def, 'bpmn:LinkEventDefinition')).name;
	}

	function isThrowEvent(node) {
	  return is(node, 'bpmn:ThrowEvent');
	}

	function isCatchEvent(node) {
	  return is(node, 'bpmn:CatchEvent');
	}
	return linkEvent;
}

var linkEventExports = requireLinkEvent();
var rule_4 = /*@__PURE__*/getDefaultExportFromCjs(linkEventExports);

var noDuplicateSequenceFlows;
var hasRequiredNoDuplicateSequenceFlows;

function requireNoDuplicateSequenceFlows () {
	if (hasRequiredNoDuplicateSequenceFlows) return noDuplicateSequenceFlows;
	hasRequiredNoDuplicateSequenceFlows = 1;
	const {
	  is
	} = require$$0$1;

	const {
	  annotateRule
	} = requireHelper();


	/**
	 * A rule that verifies that there are no disconnected
	 * flow elements, i.e. elements without incoming or outgoing sequence flows.
	 *
	 * @type { import('../lib/types.js').RuleFactory }
	 */
	noDuplicateSequenceFlows = function() {

	  const keyed = {};

	  const outgoingReported = {};
	  const incomingReported = {};

	  function check(node, reporter) {

	    if (!is(node, 'bpmn:SequenceFlow')) {
	      return;
	    }

	    const key = flowKey(node);

	    if (key in keyed) {
	      reporter.report(node.id, 'SequenceFlow is a duplicate');

	      const sourceId = node.sourceRef.id;
	      const targetId = node.targetRef.id;

	      if (!outgoingReported[sourceId]) {
	        reporter.report(sourceId, 'Duplicate outgoing sequence flows');

	        outgoingReported[sourceId] = true;
	      }

	      if (!incomingReported[targetId]) {
	        reporter.report(targetId, 'Duplicate incoming sequence flows');

	        incomingReported[targetId] = true;
	      }
	    } else {
	      keyed[key] = node;
	    }
	  }

	  return annotateRule('no-duplicate-sequence-flows', {
	    check
	  });

	};


	// helpers /////////////////

	function flowKey(flow) {
	  const conditionExpression = flow.conditionExpression;

	  const condition = conditionExpression ? conditionExpression.body : '';
	  const source = flow.sourceRef ? flow.sourceRef.id : flow.id;
	  const target = flow.targetRef ? flow.targetRef.id : flow.id;

	  return source + '#' + target + '#' + condition;
	}
	return noDuplicateSequenceFlows;
}

var noDuplicateSequenceFlowsExports = requireNoDuplicateSequenceFlows();
var rule_5 = /*@__PURE__*/getDefaultExportFromCjs(noDuplicateSequenceFlowsExports);

var subProcessBlankStartEvent;
var hasRequiredSubProcessBlankStartEvent;

function requireSubProcessBlankStartEvent () {
	if (hasRequiredSubProcessBlankStartEvent) return subProcessBlankStartEvent;
	hasRequiredSubProcessBlankStartEvent = 1;
	const {
	  is
	} = require$$0$1;

	const {
	  annotateRule
	} = requireHelper();


	/**
	 * A rule that checks that start events inside a normal sub-processes
	 * are blank (do not have an event definition).
	 *
	 * @type { import('../lib/types.js').RuleFactory }
	 */
	subProcessBlankStartEvent = function() {

	  function check(node, reporter) {

	    if (!is(node, 'bpmn:SubProcess') || node.triggeredByEvent) {
	      return;
	    }

	    const flowElements = node.flowElements || [];

	    flowElements.forEach(function(flowElement) {

	      if (!is(flowElement, 'bpmn:StartEvent')) {
	        return false;
	      }

	      const eventDefinitions = flowElement.eventDefinitions || [];

	      if (eventDefinitions.length > 0) {
	        reporter.report(flowElement.id, 'Start event must be blank', [ 'eventDefinitions' ]);
	      }
	    });
	  }

	  return annotateRule('sub-process-blank-start-event', {
	    check
	  });

	};
	return subProcessBlankStartEvent;
}

var subProcessBlankStartEventExports = requireSubProcessBlankStartEvent();
var rule_6 = /*@__PURE__*/getDefaultExportFromCjs(subProcessBlankStartEventExports);

var singleBlankStartEvent;
var hasRequiredSingleBlankStartEvent;

function requireSingleBlankStartEvent () {
	if (hasRequiredSingleBlankStartEvent) return singleBlankStartEvent;
	hasRequiredSingleBlankStartEvent = 1;
	const {
	  is
	} = require$$0$1;

	const {
	  annotateRule
	} = requireHelper();


	/**
	 * A rule that checks whether not more than one blank start event
	 * exists per scope.
	 *
	 * @type { import('../lib/types.js').RuleFactory }
	 */
	singleBlankStartEvent = function() {

	  function check(node, reporter) {

	    if (!is(node, 'bpmn:FlowElementsContainer')) {
	      return;
	    }

	    const flowElements = node.flowElements || [];

	    const blankStartEvents = flowElements.filter(function(flowElement) {

	      if (!is(flowElement, 'bpmn:StartEvent')) {
	        return false;
	      }

	      const eventDefinitions = flowElement.eventDefinitions || [];

	      return eventDefinitions.length === 0;
	    });

	    if (blankStartEvents.length > 1) {
	      const type = is(node, 'bpmn:SubProcess') ? 'Sub process' : 'Process';

	      reporter.report(node.id, type + ' has multiple blank start events');
	    }
	  }

	  return annotateRule('single-blank-start-event', {
	    check
	  });

	};
	return singleBlankStartEvent;
}

var singleBlankStartEventExports = requireSingleBlankStartEvent();
var rule_7 = /*@__PURE__*/getDefaultExportFromCjs(singleBlankStartEventExports);

var version = {};

var semverCompare;
var hasRequiredSemverCompare;

function requireSemverCompare () {
	if (hasRequiredSemverCompare) return semverCompare;
	hasRequiredSemverCompare = 1;
	semverCompare = function cmp (a, b) {
	    var pa = a.split('.');
	    var pb = b.split('.');
	    for (var i = 0; i < 3; i++) {
	        var na = Number(pa[i]);
	        var nb = Number(pb[i]);
	        if (na > nb) return 1;
	        if (nb > na) return -1;
	        if (!isNaN(na) && isNaN(nb)) return 1;
	        if (isNaN(na) && !isNaN(nb)) return -1;
	    }
	    return 0;
	};
	return semverCompare;
}

var hasRequiredVersion;

function requireVersion () {
	if (hasRequiredVersion) return version;
	hasRequiredVersion = 1;
	const cmp = requireSemverCompare();

	version.greaterOrEqual = function(version, allowedVersion) {
	  if (!version) {
	    throw new Error(
	      'Rule requires { version } config, e.g. [ "warn", { "version": "8.0" } ]'
	    );
	  }

	  return cmp(version, allowedVersion) !== -1;
	};
	return version;
}

var rule;
var hasRequiredRule;

function requireRule () {
	if (hasRequiredRule) return rule;
	hasRequiredRule = 1;
	const { is } = require$$0$1;

	const { greaterOrEqual } = requireVersion();

	function skipInNonExecutableProcess(ruleFactory) {
	  return function(config = {}) {
	    const rule = ruleFactory(config);

	    const { version, platform = 'camunda-cloud' } = config;

	    function check(node, reporter) {
	      if (platform === 'camunda-cloud' && version && greaterOrEqual(version, '8.2') && isNonExecutableProcess(node)) {
	        return false;
	      }

	      if (platform === 'camunda-platform' && isNonExecutableProcess(node)) {
	        return false;
	      }

	      return rule.check(node, reporter);
	    }

	    return {
	      ...rule,
	      check
	    };
	  };
	}

	rule = {
	  skipInNonExecutableProcess
	};

	function isNonExecutableProcess(node) {
	  let process;

	  if (is(node, 'bpmn:Process')) {
	    process = node;
	  }

	  if (is(node, 'bpmndi:BPMNPlane')
	    && is(node.get('bpmnElement'), 'bpmn:Process')) {
	    process = node.get('bpmnElement');
	  }

	  return process && !process.get('isExecutable');
	}
	return rule;
}

var historyTimeToLive;
var hasRequiredHistoryTimeToLive;

function requireHistoryTimeToLive () {
	if (hasRequiredHistoryTimeToLive) return historyTimeToLive;
	hasRequiredHistoryTimeToLive = 1;
	const { is } = require$$0$1;

	const { skipInNonExecutableProcess } = requireRule();

	historyTimeToLive = skipInNonExecutableProcess(function() {
	  function check(node, reporter) {

	    if (!is(node, 'bpmn:Process')) {
	      return;
	    }

	    if (!node.get('camunda:historyTimeToLive')) {
	      reporter.report(node.id, 'Property <historyTimeToLive> should be configured on <bpmn:Process> or engine level.', [ 'historyTimeToLive' ]);
	    }
	  }

	  return {
	    meta: {
	      documentation: {
	        url: 'https://docs.camunda.org/manual/latest/modeler/history-time-to-live/'
	      }
	    },
	    check
	  };
	});
	return historyTimeToLive;
}

var historyTimeToLiveExports = requireHistoryTimeToLive();
var rule_8 = /*@__PURE__*/getDefaultExportFromCjs(historyTimeToLiveExports);

/*
 * Copyright CIB software GmbH and/or licensed to CIB software GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. CIB software licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

var customNoOverlappingElements;
var hasRequiredCustomNoOverlappingElements;

function requireCustomNoOverlappingElements () {
	if (hasRequiredCustomNoOverlappingElements) return customNoOverlappingElements;
	hasRequiredCustomNoOverlappingElements = 1;
	const {
	    is
	  } = require$$0$1;
	  
	  
	  /**
	   * Rule that checks if two elements overlap except:
	   * - Boundary events overlap their host
	   * - Child elements overlap / are on top of their parent (e.g., elements within a subProcess)
	   */
	  customNoOverlappingElements = function() {
	  
	    function check(node, reporter) {
	      if (!is(node, 'bpmn:Definitions')) {
	        return;
	      }
	  
	      const rootElements = node.rootElements || [];
	      const elementsToReport = new Set();
	      const elementsOutsideToReport = new Set();
	      const diObjects = getAllDiObjects(node);
	      const processElementsParentDiMap = new Map(); // map with sub/process as key and its parent boundary di object
	  
	      rootElements
	        .filter(element => is(element, 'bpmn:Collaboration'))
	        .forEach(collaboration => {
	          const participants = collaboration.participants || [];
	          checkElementsArray(participants, elementsToReport, diObjects);
	  
	          participants.forEach(participant => {
	            processElementsParentDiMap.set(participant.processRef, diObjects.get(participant));
	          });
	        });
	  
	      rootElements
	        .filter(element => is(element, 'bpmn:Process'))
	        .forEach(process => {
	          const parentDi = processElementsParentDiMap.get(process) || {};
	          checkProcess(process, elementsToReport, elementsOutsideToReport, diObjects, parentDi);
	        });
	  
	      // report elements
	      elementsToReport.forEach(element => reporter.report(element.id, 'Element overlaps with other element'));
	      elementsOutsideToReport.forEach(element => reporter.report(element.id, 'Element is outside of parent boundary'));
	    }
	  
	    return {
	      check: check
	    };
	  };
	  
	  // helpers /////////////////
	  
	  /**
	   * Recursively check subprocesses in a process
	   * @param {Object} node Process or SubProcess
	   * @param {Set} elementsToReport
	   * @param {Set} elementsOutsideToReport
	   * @param {Map} diObjects
	   */
	  function checkProcess(node, elementsToReport, elementsOutsideToReport, diObjects, parentDi) {
	  
	    // check child elements for overlap
	    const flowElements = node.flowElements || [];
	    checkElementsArray(flowElements, elementsToReport, diObjects);
	  
	    // check child elements outside parent boundary
	    // TODO: Skipped DataSoreReferences for now
	    flowElements.filter(element => !is(element, 'bpmn:DataStoreReference')).forEach(element => {
	      if (isOutsideParentBoundary(diObjects.get(element)?.bounds, parentDi.bounds)) {
	        elementsOutsideToReport.add(element);
	      }
	    });
	  
	    // check subprocesses
	    const subProcesses = flowElements.filter(element => is(element, 'bpmn:SubProcess'));
	    subProcesses.forEach(subProcess => {
	      const subProcessDi = diObjects.get(subProcess) || {};
	      const subProcessParentBoundary = subProcessDi.isExpanded ? subProcessDi : {};
	      checkProcess(subProcess, elementsToReport, elementsOutsideToReport, diObjects, subProcessParentBoundary);
	    });
	  }
	  
	  /**
	   * @param {Array} elements
	   * @param {Set} elementsToReport
	   */
	  function checkElementsArray(elements, elementsToReport, diObjects) {
	    for (let i = 0; i < elements.length - 1; i++) {
	      const element = elements[i];
	      for (let j = i + 1; j < elements.length; j++) {
	        const element2 = elements[j];
	  
	        if (!diObjects.has(element) || !diObjects.has(element2)) {
	          continue;
	        }
	  
	        // ignore if Boundary events overlap their host
	        // but still check if they overlap other elements
	        if (element.attachedToRef === element2 || element2.attachedToRef === element) {
	          continue;
	        }
	  
	        if (isCollision(diObjects.get(element).bounds, diObjects.get(element2).bounds)) {
	          elementsToReport.add(element);
	          elementsToReport.add(element2);
	        }
	      }
	    }
	  }
	  
	  /**
	   * Check if child element is outside of parent boundary
	   */
	  function isOutsideParentBoundary(childBounds, parentBounds) {
	    if (!isValidShapeElement(childBounds) || !isValidShapeElement(parentBounds)) {
	      return false;
	    }
	  
	    const isTopLeftCornerInside = childBounds.x >= parentBounds.x && childBounds.y >= parentBounds.y;
	    const isBottomRightCornerInside = childBounds.x + childBounds.width <= parentBounds.x + parentBounds.width && childBounds.y + childBounds.height <= parentBounds.y + parentBounds.height;
	    const isInside = isTopLeftCornerInside && isBottomRightCornerInside;
	  
	    return !isInside;
	  }
	  
	  /**
	   * Check if two rectangle shapes collides
	   */
	  function isCollision(firstBounds, secondBounds) {
	    if (!isValidShapeElement(firstBounds) || !isValidShapeElement(secondBounds)) {
	      return false;
	    }
	  
	    const collisionX = firstBounds.x + firstBounds.width >= secondBounds.x && secondBounds.x + secondBounds.width >= firstBounds.x;
	    const collisionY = firstBounds.y + firstBounds.height >= secondBounds.y && secondBounds.y + secondBounds.height >= firstBounds.y;
	  
	    // collision on both axis
	    return collisionX && collisionY;
	  }
	  
	  /**
	   * Checks if shape bounds has all necessary values for collision check
	   */
	  function isValidShapeElement(bounds) {
	    return !!bounds && is(bounds, 'dc:Bounds') &&
	      typeof (bounds.x) === 'number' &&
	      typeof (bounds.y) === 'number' &&
	      typeof (bounds.width) === 'number' &&
	      typeof (bounds.height) === 'number';
	  }
	  
	  /**
	   * Get all di object as one map object
	   * @param {Object} node bpmn:Definitions
	   * @returns {Map<Object, Object>} map of di objects with element as key
	   */
	  function getAllDiObjects(node) {
	    const diObjects = new Map();
	    const diagrams = node.diagrams || [];
	  
	    diagrams
	      .filter(diagram => !!diagram.plane)
	      .forEach(diagram => {
	        const planeElements = diagram.plane.planeElement || [];
	        planeElements
	          .filter(planeElement => !!planeElement.bpmnElement)
	          .forEach(planeElement => {
	            diObjects.set(planeElement.bpmnElement, planeElement);
	          });
	      });
	  
	    return diObjects;
	  }
	return customNoOverlappingElements;
}

var customNoOverlappingElementsExports = requireCustomNoOverlappingElements();
var rule_10 = /*@__PURE__*/getDefaultExportFromCjs(customNoOverlappingElementsExports);

/*
 * Copyright CIB software GmbH and/or licensed to CIB software GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. CIB software licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

var customConditionalFlows;
var hasRequiredCustomConditionalFlows;

function requireCustomConditionalFlows () {
	if (hasRequiredCustomConditionalFlows) return customConditionalFlows;
	hasRequiredCustomConditionalFlows = 1;
	/**
	 * A rule that checks that sequence flows outgoing from a
	 * conditional forking gateway or activity are
	 * either default flows _or_ have a condition attached
	 */
	customConditionalFlows = function() {

	  function check(node, reporter) {
	    const outgoing = node.outgoing || [];

	    if (isConditionalForking(node)) {    

	    outgoing.forEach((flow) => {
	      const missingCondition = (
	        !hasCondition(flow) &&
	        !isDefaultFlow(node, flow)
	      );
	      if (missingCondition) {
	        reporter.report(flow.id, 'Sequence flow is missing condition or condition type is invalid', [ 'conditionExpression' ]);
	      }
	    }); 
	    return
	  }
	    if (outgoing.length > 1 && node?.$type === 'bpmn:ExclusiveGateway') {
	      reporter.report(node.id, 'Sequence flow is missing condition or condition type is invalid', [ 'conditionExpression' ]);
	    }
	  }
	  
	  return {
	    check
	  }

	};

	// helpers /////////////////////////////

	function isConditionalForking(node) {
	  const defaultFlow = node['default'];
	  const outgoing = node.outgoing || [];

	  return defaultFlow || outgoing.find(hasCondition)
	}

	function hasCondition(flow) {
	  return !!flow.conditionExpression
	}

	function isDefaultFlow(node, flow) {
	  return node['default'] === flow
	}
	return customConditionalFlows;
}

var customConditionalFlowsExports = requireCustomConditionalFlows();
var rule_12 = /*@__PURE__*/getDefaultExportFromCjs(customConditionalFlowsExports);

const cache = {};

/**
 * A resolver that caches rules and configuration as part of the bundle,
 * making them accessible in the browser.
 *
 * @param {Object} cache
 */
function Resolver() {}

Resolver.prototype.resolveRule = function(pkg, ruleName) {

  const rule = cache[pkg + '/' + ruleName];

  if (!rule) {
    throw new Error('cannot resolve rule <' + pkg + '/' + ruleName + '>: not bundled');
  }

  return rule;
};

Resolver.prototype.resolveConfig = function(pkg, configName) {
  throw new Error(
    'cannot resolve config <' + configName + '> in <' + pkg +'>: not bundled'
  );
};

const resolver = new Resolver();

const rules = {
  "ad-hoc-sub-process": "error",
  "conditional-event": "error",
  "event-based-gateway": "error",
  "event-sub-process-typed-start-event": "error",
  "link-event": "error",
  "no-duplicate-sequence-flows": "warn",
  "sub-process-blank-start-event": "error",
  "single-blank-start-event": "error",
  "camunda-compat/history-time-to-live": [
    "info",
    {
      "platform": "camunda-platform",
      "version": "7.24"
    }
  ],
  "no-overlapping-elements": 0,
  "local/custom-no-overlapping-elements": "warn",
  "conditional-flows": 0,
  "local/custom-conditional-flows": "error"
};

const config = {
  rules: rules
};

const moddleExtensions = {};

const bundle = {
  resolver: resolver,
  config: config,
  moddleExtensions: moddleExtensions
};

cache['bpmnlint/ad-hoc-sub-process'] = rule_0;

cache['bpmnlint/conditional-event'] = rule_1;

cache['bpmnlint/event-based-gateway'] = rule_2;

cache['bpmnlint/event-sub-process-typed-start-event'] = rule_3;

cache['bpmnlint/link-event'] = rule_4;

cache['bpmnlint/no-duplicate-sequence-flows'] = rule_5;

cache['bpmnlint/sub-process-blank-start-event'] = rule_6;

cache['bpmnlint/single-blank-start-event'] = rule_7;

cache['bpmnlint-plugin-camunda-compat/history-time-to-live'] = rule_8;

cache['bpmnlint-plugin-local/custom-no-overlapping-elements'] = rule_10;

cache['bpmnlint-plugin-local/custom-conditional-flows'] = rule_12;

export { config, bundle as default, moddleExtensions, resolver };
