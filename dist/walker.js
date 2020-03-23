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

      while (query && query.query && steps.length) {
        const step = steps.shift();
        stepCount++;
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
        } else if ("query" in step) {
          const temporaryQuery = ld(query.json(), pathContext);
          const queryResult = temporaryQuery.query(step.query);
          const queryParent = queryResult && queryResult.parent();
          nextQuery = queryParent && initializeQueryForWalking(queryParent.json());
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

      const result = {
        walked: walkTo.slice(0, stepCount),
        toQuery: maybeContext => query && ld(query.json(), maybeContext || {}),
        continueTo: (nextWalkTo, nextOptions) => query ? executeWalk({ ...nextOptions,
          pathContext,
          walkTo: nextWalkTo,
          lastFetched,
          query
        }) : result,
        succeeded: !!query
      };

      if (!result.succeeded) {
        result.notWalked = walkTo.slice(stepCount);
      }

      return result;
    }

    function parseQuery(term) {
      if (!(term && term.startsWith("query["))) return;
      if (!term.endsWith("]")) return;
      return {
        "http://__ldwalk/query": term.substring(6, term.length - 1)
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
          let parsedQuery = parseQuery(t);

          if (parsedQuery) {
            return parsedQuery;
          } else {
            return {
              "http://__ldwalk/term": t
            };
          }
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
