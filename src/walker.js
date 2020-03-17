const jsonld = require("jsonld");
const ld = require("ld-query");

async function walkToForQuery(pathContext, walkTo, query) {

    // expand the terms we are going to walk
    const terms = await expandWalkToTerms(pathContext, walkTo);

    // step through until we can't any more
    let stepCount = 0;
    while (query && terms.length) {
        const term = terms.shift();
        stepCount++;
        query = query.query(`${term}`);
    }

    /*
        For diagnostic purposes we'll prepare an array of unexpanded path step names
    */
   const unexpandedTerms = walkTo.split(" ");
    /*
        This is the result from the walk with various choices for proceeding
    */
    const result = {
        /*
            These terms are the ones we managed to walk through. Note that even if all the steps
            were walked, the query still may not have succeeded if the final step took us to a
            null document
        */
        walked: unexpandedTerms.slice(0, stepCount),
        /*
            Takes the output of the current walk and converts it to an ldquery object
        */
        toQuery: (maybeContext) => query && ld(query.json(), maybeContext || {}),
        /*
            This allows the consumer to continue walking from the point where they left off.
            If there was no query at the stopping point, this will return null right away
        */
        continueTo: nextWalkTo => query && walkToForQuery(pathContext, nextWalkTo, query),
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
        result.notWalked = unexpandedTerms.slice(stepCount, 1);
    }
    return result;

}

async function walkTo(pathContext, walkFrom, walkTo) {

    // fetch the starting point document
    const expandedDoc = await jsonld.expand(walkFrom);
    let query = ld(expandedDoc, {});

    // attempt to step through
    return walkToForQuery(pathContext, walkTo, query);
}

async function expandWalkToTerms(pathContext, walkTo) {
    const expansionDocument = {
        "@context": pathContext,
        "@graph": walkTo.split(" ").map(function (t) {
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
        to: walkTo.bind(this, pathContext, walkFrom)
    };
}

module.exports = {
    walk(pathContext) {
        return {
            pathContext: pathContext,
            from: walkFrom.bind(this, pathContext)
        };
    }
};
