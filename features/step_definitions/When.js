const walker = require("../../dist/walker.umd");
const { When } = require("cucumber");

When('I walk to {string}', async function (path) {
    const { walkContext, walkFrom, walkOptions, dependencies } = this;
    const pathBits = path.split(" ");
    this.result = await walker.walk(walkContext, dependencies).from(walkFrom).to(pathBits, walkOptions);
});

When('I walk to', async function (dataTable) {
    const { walkContext, walkFrom, walkOptions, dependencies } = this;
    const pathBits = dataTable.hashes().map(x => x["Parts"]);
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

When('I walk via template {string}', async function (prop, dataTable) {
    if(!this.result) throw new Error("No walk started");
    if(!this.result.succeeded) throw new Error("Walk failed before using template: " + JSON.stringify(this.result));
    const { args } = dataTable.hashes()[0];
    const parsedArguments = eval(`(${args})`);
    this.result = await this.result.viaTemplate(prop, parsedArguments);
});