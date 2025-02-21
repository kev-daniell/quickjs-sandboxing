import { sandboxExports } from "./wasm";

class ifooClass {
    constructor() {}

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

// Sandbox and statically type the exports 
const loadPackage = (exports: object) => {
    const sandboxedFunctions = sandboxExports(exports);
    return {
        fooFn: sandboxedFunctions.ifooFn,
        fooAdd: sandboxedFunctions.ifooAdd
    };
};

// Collect all exports in an object
const fooExports = {
    ifooClass,
    ifooFn,
    ifooAdd
};

// Pass the collected exports to loadPackage
const sandboxedExports = loadPackage(fooExports);

// Export only the sandboxed versions
export const { fooFn, fooAdd } = sandboxedExports;