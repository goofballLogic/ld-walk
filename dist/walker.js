"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

module.exports = {
  walk: function walk(pathContext) {
    var dependencies = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var jsonld = dependencies.jsonld || require("jsonld");

    var ld = dependencies.ldQuery || require("ld-query");

    return {
      pathContext: pathContext,
      from: walkFrom.bind(this, pathContext)
    };

    function URLtoQuery(_x) {
      return _URLtoQuery.apply(this, arguments);
    }

    function _URLtoQuery() {
      _URLtoQuery = _asyncToGenerator(regeneratorRuntime.mark(function _callee(url) {
        var expandedDoc;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.prev = 0;
                _context.next = 3;
                return jsonld.expand(url);

              case 3:
                expandedDoc = _context.sent;
                return _context.abrupt("return", ld(expandedDoc, {}));

              case 7:
                _context.prev = 7;
                _context.t0 = _context["catch"](0);

                if (!(_context.t0.details && _context.t0.details.code == "loading document failed")) {
                  _context.next = 11;
                  break;
                }

                return _context.abrupt("return", null);

              case 11:
                throw _context.t0;

              case 12:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, null, [[0, 7]]);
      }));
      return _URLtoQuery.apply(this, arguments);
    }

    function executeWalk(_x2) {
      return _executeWalk.apply(this, arguments);
    }

    function _executeWalk() {
      _executeWalk = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(_ref) {
        var pathContext, walkFrom, walkTo, lastFetched, query, suppressFinalDereferencing, terms, stepCount, term, termPath, nextQuery, maybeId, fetched, finalId, unexpandedTerms, result;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                pathContext = _ref.pathContext, walkFrom = _ref.walkFrom, walkTo = _ref.walkTo, lastFetched = _ref.lastFetched, query = _ref.query, suppressFinalDereferencing = _ref.suppressFinalDereferencing;
                _context2.next = 3;
                return expandWalkToTerms(pathContext, walkTo);

              case 3:
                terms = _context2.sent;

                if (lastFetched) {
                  _context2.next = 9;
                  break;
                }

                _context2.next = 7;
                return URLtoQuery(walkFrom);

              case 7:
                query = _context2.sent;
                lastFetched = walkFrom;

              case 9:
                stepCount = 0;

              case 10:
                if (!(query && query.query && terms.length)) {
                  _context2.next = 26;
                  break;
                }

                term = terms.shift();
                stepCount++;
                termPath = "> ".concat(term);
                nextQuery = query.query(termPath);

                if (nextQuery) {
                  _context2.next = 23;
                  break;
                }

                maybeId = query.query("> @id");

                if (!maybeId) {
                  _context2.next = 23;
                  break;
                }

                lastFetched = maybeId;
                _context2.next = 21;
                return URLtoQuery(maybeId);

              case 21:
                fetched = _context2.sent;
                nextQuery = fetched && fetched.query(termPath);

              case 23:
                query = nextQuery;
                _context2.next = 10;
                break;

              case 26:
                if (!(!suppressFinalDereferencing && query && query.query)) {
                  _context2.next = 35;
                  break;
                }

                finalId = query.query("> @id");

                if (!(finalId && finalId !== lastFetched)) {
                  _context2.next = 35;
                  break;
                }

                _context2.next = 31;
                return URLtoQuery(finalId);

              case 31:
                _context2.t0 = _context2.sent;

                if (_context2.t0) {
                  _context2.next = 34;
                  break;
                }

                _context2.t0 = query;

              case 34:
                query = _context2.t0;

              case 35:
                unexpandedTerms = walkTo.split(" ");
                result = {
                  walked: unexpandedTerms.slice(0, stepCount),
                  toQuery: function toQuery(maybeContext) {
                    return query && ld(query.json(), maybeContext || {});
                  },
                  continueTo: function continueTo(nextWalkTo, nextOptions) {
                    return query ? executeWalk(_objectSpread({}, nextOptions, {
                      pathContext: pathContext,
                      walkTo: nextWalkTo,
                      lastFetched: lastFetched,
                      query: query
                    })) : result;
                  },
                  succeeded: !!query
                };

                if (!result.succeeded) {
                  result.notWalked = unexpandedTerms.slice(stepCount);
                }

                return _context2.abrupt("return", result);

              case 39:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
      return _executeWalk.apply(this, arguments);
    }

    function expandWalkToTerms(_x3, _x4) {
      return _expandWalkToTerms.apply(this, arguments);
    }

    function _expandWalkToTerms() {
      _expandWalkToTerms = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(pathContext, walkTo) {
        var expansionDocument, expandedDocument;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                expansionDocument = {
                  "@context": pathContext,
                  "@graph": walkTo.split(" ").map(function (t) {
                    return _defineProperty({}, t, []);
                  })
                };
                _context3.next = 3;
                return jsonld.expand(expansionDocument);

              case 3:
                expandedDocument = _context3.sent;
                return _context3.abrupt("return", expandedDocument.map(function (o) {
                  return Object.keys(o)[0];
                }));

              case 5:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));
      return _expandWalkToTerms.apply(this, arguments);
    }

    function walkFrom(pathContext, walkFrom) {
      return {
        pathContext: pathContext,
        walkFrom: walkFrom,
        to: function to(walkTo, options) {
          return executeWalk(_objectSpread({}, options, {
            pathContext: pathContext,
            walkFrom: walkFrom,
            walkTo: walkTo
          }));
        }
      };
    }
  }
};