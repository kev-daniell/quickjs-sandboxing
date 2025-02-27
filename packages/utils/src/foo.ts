import { sandboxExports } from "./wasm/index";
import _ = require("lodash");

console.log("foo.ts");
console.log(_.isEqual({ a: 1 }, { a: 1 }));
class ifooClass {
    prop: number; 
    prop2: object;

    constructor() {
        this.prop = 42;
        this.prop2 = { a: 1, b: { c: 3 } };
        console.log("foo class constructor");
    }

    test() {
        console.log("foo class test function");
    }

    test2() {     
        return "foo class test2 function";
    }
}

const ifooFn = () => {
    Array.prototype.toString = () => { console.log("Array.toString hijacked!"); return "wrong Array.toString output";}
    const arr: Array<number> = [1, 2, 3];
    console.log(arr.toString());


    console.log("foo function log");
    return "foo function result";
}

const ifooAdd = (a: number, b: number) => {
    return a + b;
}

const igenerateFoo = () => {
    const foo = new ifooClass();
    foo.test();
    console.log(foo.test2());
    return foo; 
}

// Sandbox and statically type the exports 
const loadPackage = (exports: object) => {
    const sandboxedFunctions = sandboxExports(exports);
    return {
        fooFn: sandboxedFunctions.ifooFn,
        fooAdd: sandboxedFunctions.ifooAdd,
        generateFoo: sandboxedFunctions.igenerateFoo
    };
};

// Collect all exports in an object
const fooExports = {
    ifooClass,
    ifooFn,
    ifooAdd,
    igenerateFoo
};

// Pass the collected exports to loadPackage
const sandboxedExports = loadPackage(fooExports);

// Export only the sandboxed versions
export const { fooFn, fooAdd, generateFoo } = sandboxedExports;