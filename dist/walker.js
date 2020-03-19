const walker = {
  walk(pathContext, dependencies = {}) {
    const jsonld = dependencies.jsonld;
    const ld = dependencies["ld-query"];
    return {
      pathContext: pathContext,
      from: walkFrom.bind(this, pathContext)
    };

    async function URLtoQuery(url) {
      try {
        const expandedDoc = await jsonld.expand(url);
        return ld(expandedDoc, {});
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
      const terms = await expandWalkToTerms(pathContext, walkTo);

      if (!lastFetched) {
        query = await URLtoQuery(walkFrom);
        lastFetched = walkFrom;
      }

      let stepCount = 0;

      while (query && query.query && terms.length) {
        const term = terms.shift();
        stepCount++;
        const termPath = `> ${term}`;
        let nextQuery = query.query(termPath);

        if (!nextQuery) {
          const maybeId = query.query("> @id");

          if (maybeId) {
            lastFetched = maybeId;
            const fetched = await URLtoQuery(maybeId);
            nextQuery = fetched && fetched.query(termPath);
          }
        }

        query = nextQuery;
      }

      if (!suppressFinalDereferencing && query && query.query) {
        const finalId = query.query("> @id");

        if (finalId && finalId !== lastFetched) {
          query = (await URLtoQuery(finalId)) || query;
        }
      }

      const unexpandedTerms = walkTo.split(" ");
      const result = {
        walked: unexpandedTerms.slice(0, stepCount),
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
        result.notWalked = unexpandedTerms.slice(stepCount);
      }

      return result;
    }

    async function expandWalkToTerms(pathContext, walkTo) {
      const expansionDocument = {
        "@context": pathContext,
        "@graph": walkTo.split(" ").map(function (t) {
          return {
            [t]: []
          };
        })
      };
      const expandedDocument = await jsonld.expand(expansionDocument);
      return expandedDocument.map(o => Object.keys(o)[0]);
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
