[![Build Status](https://travis-ci.org/goofballLogic/ld-walk.svg?branch=master)](https://travis-ci.org/goofballLogic/ld-walk)

# ld-walk

This library provides a few utilities to facilitate resource location within a distributed graph of JSON-LD documents. It builds on https://github.com/goofballLogic/ld-query to enable working with JSON-LD in a manner reminiscent of a browser DOM.

For example, let's say I have a starting point of
```javascript
const api = "http://test.com/api/";
```

and a context document like:
```javascript
const context = {
   "@vocab": "http://test.com/vocab/"
};
```

If I initialise the walker like this:
```javascript
import walker from "./Walker.js";
const apiWalker = walker.walk(context).from(home);
```

I could ask it to find nodes containing @id and dereference them like this:
```javascript
const products = apiWalker.walk("catalog products books").toQuery();
```

Which would give me back a query object for the books node (or null if the walk failed at any point). Or alternatively, `toJSON()` would return raw JSON instead.
