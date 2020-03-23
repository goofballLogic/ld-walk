const walker = {

    walk(pathContext, dependencies = {}) {

        const jsonld = dependencies.jsonld;
        const ld = dependencies["ld-query"];

        return {
            pathContext: pathContext,
            from: walkFrom.bind(this, pathContext)
        };


        function initializeQueryForWalking(expanded) {
            /*
                We always walk using an empty @context becuase we expand all the terms needed prior to walking
            */
            return ld(expanded, {});
        }

        /*
            Given a URL, we want to download the document referenced, expand it and convert it to an ld-query object.
            Note that we pass in an empty context object. This is because we will make all our queries using fully-qualified terms
        */
        async function URLtoQuery(url) {
            try {

                const expandedDoc = await jsonld.expand(url);
                return initializeQueryForWalking(expandedDoc);

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

            // expand the steps we are going to walk
            const steps = await expandWalkToSteps(pathContext, walkTo);

            // fetch the starting point document if needed
            if (!lastFetched) {

                query = await URLtoQuery(walkFrom);
                lastFetched = walkFrom;

            }

            // step through until we can't any more
            let stepCount = 0;
            while (query && query.query && steps.length) {

                // next term, and note the step
                const step = steps.shift();
                stepCount++;

                /*
                    Steps will contain one of the following:
                        - term (a normal walk term)
                        - query (a query to run to change the context)
                */
                let nextQuery
                if("term" in step) {
                    // a normal walk term

                    // this is the query that ld-query needs to query into the document
                    const term = step["term"];
                    const termPath = `> ${term}`;
                    nextQuery = query.query(termPath);

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
                } else if("query" in step) {

                    /*
                        we will carry out this query using the pathContext supplied, so create a new query object with that context
                    */
                    const temporaryQuery = ld(query.json(), pathContext);
                    /*
                        1. conduct our query to find the json within this document
                        2. traverse to the parent
                    */
                    const queryResult = temporaryQuery.query(step.query);
                    const queryParent = queryResult && queryResult.parent();

                    // reinitialize the query for walking
                    nextQuery = queryParent && initializeQueryForWalking(queryParent.json());

                } else {

                    throw new Error("Unhandled step: " + JSON.stringify(step));

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

        function parseQuery(term) {
            // we need to parse a term which (might) define a query
            if(!(term && term.startsWith("query["))) return;
            if(!term.endsWith("]")) return;

            // strip out the middle of the query and return
            return { "http://__ldwalk/query": term.substring(6, term.length - 1) };
        }

        async function expandWalkToSteps(pathContext, walkTo) {
            const expansionDocument = {
                "@context": [
                    pathContext,
                    {
                        "http://__ldwalk/term": { "@type": "@vocab" }
                    }
                ],
                "@graph": walkTo.map(function (t) {

                    let parsedQuery = parseQuery(t);
                    if(parsedQuery) {
                        /*
                            this will look like { "http://__ldwalk/query": "[@type=Collection]" }
                            where the value of the key is the ld-query to execute as part of the walk
                        */
                        return parsedQuery;
                    } else {
                        /*
                            this will look like { "http://__ldwalk/term": "products" }
                            It is assumed that this will be the normal way to walk
                        */
                        return { "http://__ldwalk/term": t };
                    }
                })
            };
            // this will make everything fully qualified
            const expandedDocument = await jsonld.expand(expansionDocument);
            const isGraph = expandedDocument.length > 1;
            // this compacts it again, leaving terms other than __ldwalk ones fully qualified
            const compactedDocument = await jsonld.compact(expandedDocument, { "@context": { "@vocab": "http://__ldwalk/", "term": { "@id": "http://__ldwalk/term", "@type": "@id" } } });
            /*
                the resulting document will end up with either have a @graph in it:
                    in which case we are going to return the raw @graph, which will look something like:
                        [ { term: 'things' }, { query: '*[name="Some oranges"]' } ]
                or it will be a simple object:
                    so we need to encapsulate it in an array, like this (and we remove the @context):
                        [ { term: 'things' } ]
            */
            if(isGraph)
                return compactedDocument["@graph"];
            else {
                delete compactedDocument["@context"];
                return [ compactedDocument ];
            }
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