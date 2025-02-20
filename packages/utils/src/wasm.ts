import { getQuickJS, QuickJSContext, QuickJSRuntime } from 'quickjs-emscripten';

let vmInstance: QuickJSRuntime | null = null;
let contextInstance: QuickJSContext | null = null;

const initVM = async () => {
    if (!vmInstance) {
        const QuickJS = await getQuickJS();
        vmInstance = QuickJS.newRuntime();
        contextInstance = vmInstance.newContext();
    }
    return { vm: vmInstance, ctx: contextInstance };
};

export const sandboxExports = async (exports: object) => {                                                             
    const { ctx } = await initVM();                                                                                    
    const wrappedExports: Record<string, any> = {};                                                                    
                                                                                                                       
    for (const [key, value] of Object.entries(exports)) {                                                              
        if (typeof value === 'function') {                                                                             
            if(!ctx) throw new Error('Context not initialized');                                                       
                                                                                                                       
            // Set up console.log bridge before evaluating any code                                                    
            const consoleObj = ctx.newObject();                                                                        
            const hostConsoleLog = ctx.newFunction("log", (...args) => {                                               
                // Unwrap the arguments and log them in host environment                                               
                const unwrappedArgs = args.map(arg => ctx.dump(arg));                                                  
                console.log("QUICKJS >",...unwrappedArgs);                                                                         
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
                                                                                                                       
                    return ctx.dump(ctx.unwrapResult(result));                                                         
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
