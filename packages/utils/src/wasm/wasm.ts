import { getQuickJS, QuickJSContext, QuickJSRuntime } from 'quickjs-emscripten';
import deasync from 'deasync';
import { unmarshalFromVM } from './unmarshal';

let vmInstance: QuickJSRuntime | null = null;
let contextInstance: QuickJSContext | null = null;
let initPromise: Promise<void> | null = null;

const initVM = () => {
    if (!initPromise) {
        initPromise = new Promise((resolve, reject) => {
            getQuickJS().then((QuickJS) => {
                vmInstance = QuickJS.newRuntime();
                contextInstance = vmInstance.newContext();
                resolve();
            }).catch(reject);
        });
    }

    // Block execution until the promise is resolved
    const waitForInit = () => {
        const start = Date.now();
        while (!vmInstance && Date.now() - start < 5000) {
            // Busy-wait for up to 5 seconds
            // Yield control to allow the promise to resolve
            deasync.sleep(100);
        }
        if (!vmInstance) {
            throw new Error('Failed to initialize QuickJS');
        }
    };

    waitForInit();
    return { vm: vmInstance, ctx: contextInstance };
};

export const sandboxExports = (exports: object) => {                                                             
    const { ctx } = initVM();                                                                                    
    const wrappedExports: Record<string, any> = {};

    if(!ctx) throw new Error('Context not initialized'); 

    // Serialize class definitions and evaluate them in the QuickJS context
    for (const [key, value] of Object.entries(exports)) {
        if (typeof value === 'function' && value.toString().startsWith('class ')) {
            const classStr = value.toString();
            const evalCode = `${classStr}; globalThis.${key} = ${key};`;
            ctx.evalCode(evalCode);
        }
    }
                                                                                                                       
    for (const [key, value] of Object.entries(exports)) {        
        if (typeof value === 'function') {                                                                                                                                   
                                                                                                                       
            // Set up console.log bridge before evaluating any code                                                    
            const consoleObj = ctx.newObject();                                                                        
            const hostConsoleLog = ctx.newFunction("log", (...args) => {                                               
                // Unwrap the arguments and log them in host environment                                               
                const unwrappedArgs = args.map(arg => ctx.dump(arg));                                                  
                console.log("WASM CONTAINER >",...unwrappedArgs);                                                                         
            });                                                                                                        
            ctx.setProp(consoleObj, "log", hostConsoleLog);                                                            
            ctx.setProp(ctx.global, "console", consoleObj);                                                            
                                                                                                                       
            wrappedExports[key] = (...args: any[]) => {                                                          
                try {                                                                                                  
                    const functionStr = value.toString();     
                    const argsStr = JSON.stringify(args).slice(1, -1);                                                 
                    const evalCode = `(${functionStr})(${argsStr})`;                                                   
                                                                                                                       
                    const result = ctx.evalCode(evalCode);                                                             
                    if (!result) throw new Error(`Error evaluating function ${key}`); 
                    
                    const handle = ctx.unwrapResult(result)
                    const unmarshalled = unmarshalFromVM(handle, ctx);
                                                                                                                       
                    return unmarshalled;                                           
                } catch (error) {                                                                                      
                    console.error(`Error in sandboxed function ${key}:`, error);                                       
                    throw error;                                                                                       
                }                                                                                                      
            };                                                                                                         
        } else {                                                                                                       
            wrappedExports[key] = value;                                                                               
        }                                                                                                              
    }                                                                                                                  
    return wrappedExports;                                                                                             
}                                                                                                                      