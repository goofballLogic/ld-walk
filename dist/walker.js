var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var urlTemplate = createCommonjsModule(function (module, exports) {
(function (root, factory) {
  {
    module.exports = factory();
  }
})(commonjsGlobal, function () {
  function UrlTemplate() {}

  UrlTemplate.prototype.encodeReserved = function (str) {
    return str.split(/(%[0-9A-Fa-f]{2})/g).map(function (part) {
      if (!/%[0-9A-Fa-f]/.test(part)) {
        part = encodeURI(part).replace(/%5B/g, '[').replace(/%5D/g, ']');
      }

      return part;
    }).join('');
  };

  UrlTemplate.prototype.encodeUnreserved = function (str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
      return '%' + c.charCodeAt(0).toString(16).toUpperCase();
    });
  };

  UrlTemplate.prototype.encodeValue = function (operator, value, key) {
    value = operator === '+' || operator === '#' ? this.encodeReserved(value) : this.encodeUnreserved(value);

    if (key) {
      return this.encodeUnreserved(key) + '=' + value;
    } else {
      return value;
    }
  };

  UrlTemplate.prototype.isDefined = function (value) {
    return value !== undefined && value !== null;
  };

  UrlTemplate.prototype.isKeyOperator = function (operator) {
    return operator === ';' || operator === '&' || operator === '?';
  };

  UrlTemplate.prototype.getValues = function (context, operator, key, modifier) {
    var value = context[key],
        result = [];

    if (this.isDefined(value) && value !== '') {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        value = value.toString();

        if (modifier && modifier !== '*') {
          value = value.substring(0, parseInt(modifier, 10));
        }

        result.push(this.encodeValue(operator, value, this.isKeyOperator(operator) ? key : null));
      } else {
        if (modifier === '*') {
          if (Array.isArray(value)) {
            value.filter(this.isDefined).forEach(function (value) {
              result.push(this.encodeValue(operator, value, this.isKeyOperator(operator) ? key : null));
            }, this);
          } else {
            Object.keys(value).forEach(function (k) {
              if (this.isDefined(value[k])) {
                result.push(this.encodeValue(operator, value[k], k));
              }
            }, this);
          }
        } else {
          var tmp = [];

          if (Array.isArray(value)) {
            value.filter(this.isDefined).forEach(function (value) {
              tmp.push(this.encodeValue(operator, value));
            }, this);
          } else {
            Object.keys(value).forEach(function (k) {
              if (this.isDefined(value[k])) {
                tmp.push(this.encodeUnreserved(k));
                tmp.push(this.encodeValue(operator, value[k].toString()));
              }
            }, this);
          }

          if (this.isKeyOperator(operator)) {
            result.push(this.encodeUnreserved(key) + '=' + tmp.join(','));
          } else if (tmp.length !== 0) {
            result.push(tmp.join(','));
          }
        }
      }
    } else {
      if (operator === ';') {
        if (this.isDefined(value)) {
          result.push(this.encodeUnreserved(key));
        }
      } else if (value === '' && (operator === '&' || operator === '?')) {
        result.push(this.encodeUnreserved(key) + '=');
      } else if (value === '') {
        result.push('');
      }
    }

    return result;
  };

  UrlTemplate.prototype.parse = function (template) {
    var that = this;
    var operators = ['+', '#', '.', '/', ';', '?', '&'];
    return {
      expand: function (context) {
        return template.replace(/\{([^\{\}]+)\}|([^\{\}]+)/g, function (_, expression, literal) {
          if (expression) {
            var operator = null,
                values = [];

            if (operators.indexOf(expression.charAt(0)) !== -1) {
              operator = expression.charAt(0);
              expression = expression.substr(1);
            }

            expression.split(/,/g).forEach(function (variable) {
              var tmp = /([^:\*]*)(?::(\d+)|(\*))?/.exec(variable);
              values.push.apply(values, that.getValues(context, operator, tmp[1], tmp[2] || tmp[3]));
            });

            if (operator && operator !== '+') {
              var separator = ',';

              if (operator === '?') {
                separator = '&';
              } else if (operator !== '#') {
                separator = operator;
              }

              return (values.length !== 0 ? operator : '') + values.join(separator);
            } else {
              return values.join(',');
            }
          } else {
            return that.encodeReserved(literal);
          }
        });
      }
    };
  };

  return new UrlTemplate();
});
});

const walker = {
  walk(pathContext, dependencies = {}) {
    const jsonld = dependencies.jsonld;
    const ld = dependencies["ld-query"];
    return {
      pathContext: pathContext,
      from: walkFrom.bind(this, pathContext)
    };

    function initializeQueryForWalking(expanded) {
      return ld(expanded, {});
    }

    async function URLtoQuery(url) {
      try {
        const expandedDoc = await jsonld.expand(url);
        return initializeQueryForWalking(expandedDoc);
      } catch (err) {
        if (err.details && err.details.code == "loading document failed") return null;
        throw err;
      }
    }

    async function executeWalk({
      pathContext,
      walkFrom,
      walkTo,
      lastFetched,
      query,
      suppressFinalDereferencing
    }) {
      if (!Array.isArray(walkTo)) walkTo = (walkTo || "").split(" ");
      const steps = await expandWalkToSteps(pathContext, walkTo);

      if (!lastFetched) {
        query = await URLtoQuery(walkFrom);
        lastFetched = walkFrom;
      }

      let stepCount = 0;
      let err;
      let bookmarkedQuery;

      while (query && query.query && steps.length) {
        const step = steps.shift();
        stepCount++;
        bookmarkedQuery = query;
        let nextQuery;

        if ("term" in step) {
          const term = step["term"];
          const termPath = `> ${term}`;
          nextQuery = query.query(termPath);

          if (!nextQuery) {
            const maybeId = query.query("> @id");

            if (maybeId) {
              lastFetched = maybeId;
              const fetched = await URLtoQuery(maybeId);
              nextQuery = fetched && fetched.query(termPath);
            }
          }
        } else if ("id" in step) {
          const soughtId = step["id"];
          nextQuery = await walkToIdentifiedObject(soughtId);
        } else if ("query" in step) {
          const temporaryQuery = ld(query.json(), pathContext);
          const queryResult = temporaryQuery.query(step.query);
          const queryParent = queryResult && queryResult.parent();
          nextQuery = queryParent && initializeQueryForWalking(queryParent.json());
        } else if ("template" in step) {
          const template = step["template"];
          const [templatePath, templateArguments] = template.split(",").map(x => x && x.trim());

          try {
            const expandedTemplate = await expandTemplate(templatePath, templateArguments, {
              pathContext,
              query
            });
            nextQuery = expandedTemplate && (await walkToIdentifiedObject(expandedTemplate));
          } catch (caught) {
            err = caught;
            nextQuery = undefined;
          }
        } else {
          throw new Error("Unhandled step: " + JSON.stringify(step));
        }

        query = nextQuery;
      }

      if (!suppressFinalDereferencing && query && query.query) {
        const finalId = query.query("> @id");

        if (finalId && finalId !== lastFetched) {
          query = (await URLtoQuery(finalId)) || query;
        }
      }

      const succeeded = !!query;
      const result = {
        walked: walkTo.slice(0, stepCount),
        toQuery: maybeContext => query && ld(query.json(), maybeContext || {}),
        continueTo: (nextWalkTo, nextOptions) => succeeded ? executeWalk({ ...nextOptions,
          pathContext,
          walkTo: nextWalkTo,
          lastFetched,
          query
        }) : result,
        succeeded,
        viaTemplate: (prop, args) => succeeded ? expandTemplateAndWalk(prop, args, {
          pathContext,
          lastFetched,
          query
        }) : result
      };

      if (err) {
        result.err = {
          message: err.message,
          json: bookmarkedQuery ? bookmarkedQuery.json() : null
        };
      }

      if (!result.succeeded) {
        result.notWalked = walkTo.slice(stepCount);
      }

      return result;

      async function walkToIdentifiedObject(soughtId) {
        let nextQuery = query.query(`[@id=${soughtId}]`);

        if (!nextQuery) {
          lastFetched = soughtId;
          nextQuery = await URLtoQuery(soughtId);
        }

        return nextQuery;
      }
    }

    async function expandTemplateAndWalk(templatePath, templateArgs, walkArgs) {
      try {
        const expandedTemplate = await expandTemplate(templatePath, templateArgs, walkArgs);
        return executeWalk({ ...walkArgs,
          walkTo: [`id[${expandedTemplate}]`]
        });
      } catch (err) {
        const query = walkArgs && walkArgs.query;
        return {
          succeeded: false,
          err: {
            message: err.message,
            json: query ? query.json() : null
          }
        };
      }
    }

    async function expandTemplate(templatePath, templateArgs, {
      pathContext,
      query
    }) {
      if (!query) throw new Error("No query object during template expansion");
      if (!templatePath) throw new Error("No template path specified");
      if (typeof templateArgs === "string") templateArgs = JSON.parse(templateArgs);
      const expandedTemplatePath = await expandWalkToSteps(pathContext, [templatePath]);
      if (!(expandedTemplatePath[0] && expandedTemplatePath[0].term)) throw new Error("Aborting - template path expansion failed (e.g. resulted in an empty string)");
      const templateTerm = expandedTemplatePath[0].term;
      let template = query.query(`> ${templateTerm}`);
      if (!template) throw new Error(`Failed to locate template ${templateTerm}`);
      if (template.query) template = template.query("@value");
      if (!template) throw new Error("Template property has no value to expand");
      const expandedTemplate = urlTemplate.parse(template).expand(templateArgs);
      return expandedTemplate;
    }

    function parseFunctionalTerm(term) {
      if (!term) return;
      const matched = /^([^\[]+)\[(.*)\]$/.exec(term);
      if (!matched) return;
      return {
        [`http://__ldwalk/${matched[1]}`]: matched[2]
      };
    }

    async function expandWalkToSteps(pathContext, walkTo) {
      const expansionDocument = {
        "@context": [pathContext, {
          "http://__ldwalk/term": {
            "@type": "@vocab"
          }
        }],
        "@graph": walkTo.map(function (t) {
          const parsedFunctionalTerm = parseFunctionalTerm(t);

          if (parsedFunctionalTerm) {
            return parsedFunctionalTerm;
          }

          return {
            "http://__ldwalk/term": t
          };
        })
      };
      const expandedDocument = await jsonld.expand(expansionDocument);
      const isGraph = expandedDocument.length > 1;
      const compactedDocument = await jsonld.compact(expandedDocument, {
        "@context": {
          "@vocab": "http://__ldwalk/",
          "term": {
            "@id": "http://__ldwalk/term",
            "@type": "@id"
          }
        }
      });
      if (isGraph) return compactedDocument["@graph"];else {
        delete compactedDocument["@context"];
        return [compactedDocument];
      }
    }

    function walkFrom(pathContext, walkFrom) {
      return {
        pathContext: pathContext,
        walkFrom: walkFrom,
        to: (walkTo, options) => executeWalk({ ...options,
          pathContext,
          walkFrom,
          walkTo
        })
      };
    }
  }

};

export default walker;
