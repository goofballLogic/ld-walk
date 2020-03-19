require("should");
const { Then }  = require("cucumber");

Then('the result should be {string}', async function (expected) {
    should.exist(this.queryResult, "Query returned nothing");
    this.queryResult.should.eql(expected);
});

Then('I should not have downloaded anything from {string}', async function (url) {
    const matched = this.urls.filter(u => u === url);
    matched.length.should.eql(0, `Detected ${matched.length} calls: ${JSON.stringify(this.urls, null, 1)}`);
});