const { When } = require("cucumber");
const walker = require("../../src/walker");

When('I walk to {string}', async function (path) {
    const { walkContext, walkFrom, walkOptions } = this;
    this.result = await walker.walk(walkContext).from(walkFrom).to(path, walkOptions);
});

When('I query the result for {string}', async function (query) {
    if(!this.result) throw new Error("No walk started");
    if(!this.result.succeeded) throw new Error("Walk failed, unable to query: " + JSON.stringify(this.result));
    this.queryResult = this.result.toQuery(this.queryContext).query(query);
});

When('I continue walking to {string}', async function (path) {
    if(!this.result) throw new Error("No walk started");
    if(!this.result.succeeded) throw new Error("Walk failed, unable to query: " + JSON.stringify(this.result));
    this.result = await this.result.continueTo(path);
});