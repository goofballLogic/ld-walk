import urlTemplate from "url-template";

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
            let err;
            let bookmarkedQuery;
            while (query && query.query && steps.length) {

                // next term, and note the step, bookmark the last query
                const step = steps.shift();
                stepCount++;
                bookmarkedQuery = query;

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

                } else if("id" in step) {

                    const soughtId = step["id"];
                    /* try to find the id locally, then remote if necessary */
                    nextQuery = await walkToIdentifiedObject(soughtId);

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

                } else if("template" in step) {

                    const template = step["template"];
                    const [ templatePath, templateArguments ] = template.split(",").map(x => x && x.trim());
                    try {
                        // find and expand the template
                        const expandedTemplate = await expandTemplate(templatePath, templateArguments, { pathContext, query });
                        // if we got one, walk to the identified object
                        nextQuery = expandedTemplate && await walkToIdentifiedObject(expandedTemplate);

                    } catch(caught) {
                        err = caught;
                        nextQuery = undefined;
                    }


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
                This factory function exists so that a result can produce more results after operations such
                as template expansion
            */
            const succeeded = !!query;
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
                    If the previous walk failed, this will return the same result object
                    that this was called on (to allow chaining)
                */
                continueTo: (nextWalkTo, nextOptions) => succeeded
                    ? executeWalk({ ...nextOptions, pathContext, walkTo: nextWalkTo, lastFetched, query })
                    : result,
                /*
                    If we didn't end up with a populated ld-query, it means the walk failed to find anything,
                    either because it was aborted part of the way through, or because the final step resulted
                    in a null document
                */
                succeeded,
                /*
                    Template expansion needs to take the current query (if any), transform it, and then walk
                    to the result
                */
                viaTemplate: (prop, args) => succeeded
                    ? expandTemplateAndWalk(prop, args, { pathContext, lastFetched, query })
                    : result,

            };

            if (err) {
                /*
                    If an error object is supplied, it is expected to contain a message property and the json
                    of the query to provide some context
                */
               result.err = { message: err.message, json: bookmarkedQuery ? bookmarkedQuery.json() : null };

            }
            if (!result.succeeded) {
                /*
                    we didn't find what we were looking for - report any steps we didn't get to.
                    We anticipate that if someone fails the walk, they will want to know if it failed
                    part of the way through which bits remained unwalked.
                */
                result.notWalked = walkTo.slice(stepCount);
            }
            return result;


            async function walkToIdentifiedObject(soughtId) {
                // try to find this id locally first
                let nextQuery = query.query(`[@id=${soughtId}]`);
                // not found - could be remote?
                if (!nextQuery) {
                    // try dereferencing this
                    lastFetched = soughtId;
                    nextQuery = await URLtoQuery(soughtId);
                }
                return nextQuery;
            }
        }

        /*
            Coming into this function, we have a path to the template property and some args to expand
            the template once located.

            If at any point in the function we fail, we will return a result object with succeeded: false
            and the reason indicated as result.err
        */
        async function expandTemplateAndWalk(templatePath, templateArgs, walkArgs) {

            try {
                // expand the template so we know where to talk to next
                const expandedTemplate = await expandTemplate(templatePath, templateArgs, walkArgs);

                // now we have the expanded template (Hopefully a URI), walk to it
                return executeWalk({ ...walkArgs, walkTo: [`id[${expandedTemplate}]`] });

            } catch(err) {

                // on an error, indicate failure with error message and context
                const query = walkArgs && walkArgs.query;
                return { succeeded: false, err: { message: err.message, json: query ? query.json() : null }};

            }
        }

        /*
            This function will expand a template and return it, but there is no protection against thrown errors.
            As such, this is a shared implementation which needs to be handled by the caller carefully.
        */
        async function expandTemplate(templatePath, templateArgs, { pathContext, query }) {
            if (!query)
                throw new Error("No query object during template expansion");
            if (!templatePath)
                throw new Error("No template path specified");
            // it's possible to pass in a string of JSON rather than an object for the args
            if (typeof templateArgs === "string")
                templateArgs = JSON.parse(templateArgs);
            // first thing we need to do is to expand the template path
            const expandedTemplatePath = await expandWalkToSteps(pathContext, [templatePath]);
            if (!(expandedTemplatePath[0] && expandedTemplatePath[0].term))
                throw new Error("Aborting - template path expansion failed (e.g. resulted in an empty string)");
            const templateTerm = expandedTemplatePath[0].term;
            // now lets see if we have an actual template
            let template = query.query(`> ${templateTerm}`);
            if (!template)
                throw new Error(`Failed to locate template ${templateTerm}`);
            // we might have a final node, or we might need to get the @value
            if (template.query)
                template = template.query("@value");
            // now we should have the actual template to expand
            if (!template)
                throw new Error("Template property has no value to expand");
            const expandedTemplate = urlTemplate.parse(template).expand(templateArgs);
            return expandedTemplate;
        }

        function parseFunctionalTerm(term) {
            /*
                we need to parse a term which (might) define a function which will take the form of e.g.
                    my-magic-function[arugments here]
                where function name id "my-magic-function" and arugments are "arguments here"
            */
            if (!term) return;
            const matched = /^([^\[]+)\[(.*)\]$/.exec(term);
            if (!matched) return;
            return { [`http://__ldwalk/${matched[1]}`]: matched[2] };
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

                    const parsedFunctionalTerm = parseFunctionalTerm(t);
                    if(parsedFunctionalTerm) {
                        /*
                            this will look like { "http://__ldwalk/query": "[@type=Collection]" }
                            where the value is the ld-query to execute as part of the walk

                            or

                            { "http://__ldwalk/id": "http://somewhere.com/something" }
                            where the value is the id we want to locate within the document (or potentially dereference)
                        */
                        return parsedFunctionalTerm;
                    }
                    /*
                        this will look like { "http://__ldwalk/term": "products" }
                        It is assumed that this will be the normal way to walk
                    */
                    return { "http://__ldwalk/term": t };
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