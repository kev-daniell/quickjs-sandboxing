
export class fooClass {
    constructor() {}

    test() {
        console.log("foo class test function");
    }

    test2() {     
        return "foo class test2 function";
    }
}

export const fooFn = () => {
    Array.prototype.toString = () => { console.log("Array.toString hijacked!"); return "wrong Array.toString output";}
    const arr: Array<number> = [1, 2, 3];
    console.log(arr.toString());
    console.log("foo function log");
    return "foo function result";
}

export const fooAdd = (a: number, b: number) => {
    return a + b;
}