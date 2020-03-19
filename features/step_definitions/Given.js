import fs from "fs";
import path from "path";
import { Before, Given } from "cucumber";
import jsonld from "jsonld";
import ldquery from "ld-query";

const dependencies = { jsonld, "ld-query": ldquery };

const urls = [];

jsonld.documentLoader = function(url) {
    urls.push(url);
    const relativePath = url.split("/").slice(2).join("/");
    const filePath = path.resolve(__dirname, "../data", relativePath, "doc.json");
    try {
        const data = fs.readFileSync(filePath).toString();
        return {
            contextUrl: null,
            document: data,
            documentUrl: "file://" + filePath
        };
    } catch(err) {
        if(err.code === "ENOENT") {
            return {
                contextUrl: null,
                document: null,
                documentUrl: "file://" + filePath
            };
        }
        throw err;
    }
};

Before(function() {
    this.dependencies = dependencies;
    this.urls = urls;
    urls.splice(0);
});

Given('the api {string}', async function (walkFrom) {
    this.walkFrom = walkFrom;
});

Given('a walk context {string}', async function (contextName) {
    const contextPath = path.resolve(__dirname, `../data/walk-contexts/${contextName}.json`);
    this.walkContext = JSON.parse(fs.readFileSync(contextPath).toString());
});

Given('a query context {string}', async function (contextName) {
    const contextPath = path.resolve(__dirname, `../data/query-contexts/${contextName}/doc.json`);
    this.queryContext = JSON.parse(fs.readFileSync(contextPath).toString());
});

Given('I suppress the final dereferencing step', async function () {
    this.walkOptions = this.walkOptions || {};
    this.walkOptions.suppressFinalDereferencing = true;
});