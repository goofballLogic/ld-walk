require("should");
const { Then } = require("cucumber");

Then('the result should be {string}', async function (expected) {
    this.queryResult.should.eql(expected);
});