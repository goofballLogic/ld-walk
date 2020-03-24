import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from "rollup-plugin-terser";

const babelES6 = babel({
    comments: false
});

const babelES5 = babel({
    exclude: /node_modules/,
    runtimeHelpers: true,
    comments: false,
    presets: [
        [
            "@babel/preset-env",
            {
                modules: "false",
                useBuiltIns: "usage",
                corejs: 3,
            }
        ]
    ]
});

export default [
    {
        input: "src/walker.js",
        output: {
            file: "dist/walker.umd.js",
            format: "umd",
            name: "ldWalker"
        },
        plugins: [babelES5, resolve(), commonjs()]
    },
    {
        input: "src/walker.js",
        output: {
            file: "dist/walker.umd.min.js",
            format: "umd",
            name: "ldWalker",
            sourcemap: true
        },
        plugins: [babelES5, resolve(), commonjs(), terser()]
    },
    {
        input: "src/walker.js",
        output: {
            file: "dist/walker.js",
            name: "ldWalker"
        },
        plugins: [babelES6, resolve(), commonjs() ]
    },
    {
        input: "src/walker.js",
        output: {
            file: "dist/walker.min.js",
            name: "ldWalker",
            sourcemap: true
        },
        plugins: [babelES6, resolve(), commonjs(), terser()]
    }
]