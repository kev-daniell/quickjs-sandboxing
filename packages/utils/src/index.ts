import { sandboxExports } from "./wasm";
import * as fooExports from "./foo";


export const loadPackage = async () => {
    const sandboxedFunctions = await sandboxExports(fooExports);
    return {
        fooFn: sandboxedFunctions.fooFn,
        fooAdd: sandboxedFunctions.fooAdd
    };
};
