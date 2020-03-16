const jsonld = require("jsonld");
const ld = require("ld-query");

async function walkTo(pathContext, walkFrom, walkTo) {
    // prepare the path by expanding the terms needed
    const terms = await expandWalkToTerms(pathContext, walkTo);
    const expandedDoc = await jsonld.expand(walkFrom);
    const query = ld(expandedDoc, {});
    const term = terms[0];
    const node = query.query(`${term}[@id]`);
    return node && ld(node.json(), {});
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
