import { getQuickJS } from "quickjs-emscripten";
import fs from "fs";
import path from "path";

async function createSandboxedModule() {
    const QuickJS = await getQuickJS();
    const vm = QuickJS.newRuntime();
    const ctx = vm.newContext();

    try {
        const modulePath = path.resolve(__dirname, "../../src/foo.ts");
        const moduleCode = fs.readFileSync(modulePath, "utf-8");
        console.log('Module code:', moduleCode);

        // Set up the module environment and evaluate code
        const consoleHandle = ctx.newObject();
        ctx.setProp(consoleHandle, "log", ctx.newFunction("log", (...args: any[]) => console.log(...args)));
        ctx.setProp(ctx.global, "console", consoleHandle);
    
        const moduleExports = ctx.unwrapResult(
            ctx.evalCode(`
              ${moduleCode}
              export const foo = new fooClass();
            `),
          )

        // fooClass
        const fooClass = ctx.getProp(moduleExports, "fooClass")

        // test()
        const fooClassInstance = ctx.getProp(moduleExports, "foo")
        const testFn = ctx.getProp(fooClassInstance, "test")

        // test2()
        const test2Fn = ctx.getProp(fooClassInstance, "test2")
        ctx.callFunction(testFn, fooClassInstance)
        const test2Result = ctx.unwrapResult(ctx.callFunction(test2Fn, fooClassInstance))
        console.log("OUTPUT: ",ctx.dump(test2Result)) // "hello Jesse"

        // fooFn()
        const fooFn = ctx.getProp(moduleExports, "fooFn")
        ctx.callFunction(fooFn, ctx.undefined)
        
        // Convert exports to plain JS object
        

        return { 
            testFn: ctx.dump(testFn), 
            fooFn: ctx.dump(fooFn), 
            fooClassInstance: ctx.dump(fooClassInstance),
            fooClass: ctx.dump(fooClass),
        };
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

export default createSandboxedModule;
