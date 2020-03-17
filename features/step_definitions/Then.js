require("should");
const { Then } = require("cucumber");

Then('the result should be {string}', async function (expected) {
    should.exist(this.queryResult, "Query returned nothing");
    this.queryResult.should.eql(expected);
});