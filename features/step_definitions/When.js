const { When } = require("cucumber");
const walker = require("../../src/walker");

When('I walk to {string}', async function (path) {
    this.result = await walker.walk(this.walkContext).from(this.walkFrom).to(path);
});

When('I query the result for {string}', async function (query) {
    this.queryResult = this.result.query(query);
});