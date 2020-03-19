const walker = {

    walk(pathContext, dependencies = {}) {

        const jsonld = dependencies.jsonld;
        const ld = dependencies["ld-query"];

        return {
            pathContext: pathContext,
            from: walkFrom.bind(this, pathContext)
        };

        /*
            Given a URL, we want to download the document referenced, expand it and convert it to an ld-query object.
            Note that we pass in an empty context object. This is because we will make all our queries using fully-qualified terms
        */
        async function URLtoQuery(url) {
            try {
                const expandedDoc = await jsonld.expand(url);
                return ld(expandedDoc, {});

            } catch (err) {

                if (err.details && err.details.code == "loading document failed")
                    return null;

                throw err;

            }
        }

        /*
            This will execute a walk, starting from a walkFrom URL (if specified). If not specified,
            lastFetched and query must be specified so that the walk can be resumed from that point.

            walkTo is the definition of the path to walk (a string, or an array of strings)

            lastFetched and query, if specified, are the last URL which we dereferenced when the previous
            walk completed, and the query we ended on, respectively
        */
        async function executeWalk({ pathContext, walkFrom, walkTo, lastFetched, query, suppressFinalDereferencing }) {

            // if necessary convert walkTo to an array
            if(!Array.isArray(walkTo)) walkTo = (walkTo || "").split(" ");

            // expand the terms we are going to walk
            const terms = await expandWalkToTerms(pathContext, walkTo);

            // fetch the starting point document if needed
            if (!lastFetched) {

                query = await URLtoQuery(walkFrom);
                lastFetched = walkFrom;

            }

            // step through until we can't any more
            let stepCount = 0;
            while (query && query.query && terms.length) {

                // next term, and note the step
                const term = terms.shift();
                stepCount++;

                // this is the query that ld-query needs to query into the document
                const termPath = `> ${term}`;
                let nextQuery = query.query(termPath);

                // not found - could be remote?
                if (!nextQuery) {
                    const maybeId = query.query("> @id");
                    if (maybeId) {

                        // try dereferencing this
                        lastFetched = maybeId;
                        const fetched = await URLtoQuery(maybeId);
                        nextQuery = fetched && fetched.query(termPath);

                    }

                }

                // At this point the query is either populated, or is null (in which case the walk will terminate)
                query = nextQuery;

            }

            /*
                at the end of the walk, we check to see where we are and if we ever dereferenced the @id (if any)
                This can be suppressed using the suppressFinalDereferencing switch
            */
            if (!suppressFinalDereferencing && query && query.query) {

                const finalId = query.query("> @id");
                if (finalId && finalId !== lastFetched) {

                    query = await URLtoQuery(finalId) || query;

                }

            }

            /*
                This is the result from the walk with various choices for proceeding
            */
            const result = {
                /*
                    These terms are the ones we managed to walk through. Note that even if all the steps
                    were walked, the query still may not have succeeded if the final step took us to a
                    null document
                */
                walked: walkTo.slice(0, stepCount),
                /*
                    Takes the output of the current walk and converts it to an ldquery object
                */
                toQuery: (maybeContext) => query && ld(query.json(), maybeContext || {}),
                /*
                    This allows the consumer to continue walking from the point where they left off.
                    If there was no query at the stopping point, this will return the same result object
                    that this was called on (to allow chaining)
                */
                continueTo: (nextWalkTo, nextOptions) => query
                    ? executeWalk({ ...nextOptions, pathContext, walkTo: nextWalkTo, lastFetched, query })
                    : result,

                /*
                    If we didn't end up with a populated ld-query, it means the walk failed to find anything,
                    either because it was aborted part of the way through, or because the final step resulted
                    in a null document
                */
                succeeded: !!query
            };

            if (!result.succeeded) {
                /*
                    we didn't find what we were looking for - report any steps we didn't get to.
                    We anticipate that if someone fails the walk, they will want to know if it failed
                    part of the way through which bits remained unwalked.
                */
                result.notWalked = walkTo.slice(stepCount);
            }
            return result;

        }

        async function expandWalkToTerms(pathContext, walkTo) {
            const expansionDocument = {
                "@context": pathContext,
                "@graph": walkTo.map(function (t) {
                    return { [t]: [] }; // a document containing the term with an array containing no values
                })
            };
            const expandedDocument = await jsonld.expand(expansionDocument);
            return expandedDocument.map(o => Object.keys(o)[0]);
        }

        function walkFrom(pathContext, walkFrom) {
            return {
                pathContext: pathContext,
                walkFrom: walkFrom,
                to: (walkTo, options) => executeWalk({ ...options, pathContext, walkFrom, walkTo })
            };
        }
    }
};

export default walker;