const walker = require("../../dist/walker.umd");
const { When } = require("cucumber");

When('I walk to {string}', async function (path) {
    const { walkContext, walkFrom, walkOptions, dependencies } = this;
    const pathBits = path.split(" ");
    this.result = await walker.walk(walkContext, dependencies).from(walkFrom).to(pathBits, walkOptions);
});

When('I query the result for {string}', async function (query) {
    if(!this.result) throw new Error("No walk started");
    if(!this.result.succeeded) throw new Error("Walk failed, unable to query: " + JSON.stringify(this.result));
    this.queryResult = this.result.toQuery(this.queryContext).query(query);
});

When('I continue walking to {string}', async function (path) {
    if(!this.result) throw new Error("No walk started");
    if(!this.result.succeeded) throw new Error("Walk failed, unable to query: " + JSON.stringify(this.result));
    const pathBits = path.split(" ");
    this.result = await this.result.continueTo(pathBits);
});