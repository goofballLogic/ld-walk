const fs = require("fs");
const path = require("path");
const { Given } = require("cucumber");
const jsonld = require("jsonld");

jsonld.documentLoader = function(url) {
    const relativePath = url.split("/").slice(2).join("/");
    const filePath = path.resolve(__dirname, "../data", relativePath, "doc.json");
    const data = fs.readFileSync(filePath).toString();
    return {
        contextUrl: null,
        document: data,
        documentUrl: "file://" + filePath
    };
};

Given('the api {string}', async function (walkFrom) {
    this.walkFrom = walkFrom;
});

Given('a walk context {string}', async function (contextName) {
    const contextPath = path.resolve(__dirname, `../data/walk-contexts/${contextName}.json`);
    this.walkContext = JSON.parse(fs.readFileSync(contextPath).toString());
});