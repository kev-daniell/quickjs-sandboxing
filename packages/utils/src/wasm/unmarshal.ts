import { QuickJSHandle, QuickJSContext } from "quickjs-emscripten";                                                    
                                                                                                                        
type UnmarshalOptions = {                                                                                              
  objectMap?: WeakMap<QuickJSHandle, any>;                                                                             
};                                                                                                                     
                                                                                                                       
interface PropertyDescriptorVM {                                                                                       
  configurable?: boolean;                                                                                              
  enumerable?: boolean;                                                                                                
  value?: unknown;                                                                                                     
  writable?: boolean;                                                                                                  
  get?: unknown;                                                                                                       
  set?: unknown;                                                                                                       
}                                                                                                                      
                                                                                                                       
function unmarshalPrimitive(                                                                                           
  ctx: QuickJSContext,                                                                                                 
  handle: QuickJSHandle,                                                                                               
): [any, boolean] {                                                                                                    
  const ty = ctx.typeof(handle);                                                                                       
  if (ty === "undefined" || ty === "number" || ty === "string" || ty === "boolean") {                                  
    return [ctx.dump(handle), true];                                                                                   
  } else if (ty === "object") {                                                                                        
    const isNull = ctx                                                                                                 
      .unwrapResult(ctx.evalCode("a => a === null"))                                                                   
      .consume(n => ctx.dump(ctx.unwrapResult(ctx.callFunction(n, ctx.undefined, handle))));                           
    if (isNull) {                                                                                                      
      return [null, true];                                                                                             
    }                                                                                                                  
  }                                                                                                                    
  return [undefined, false];                                                                                           
}                                                                                                                      
                                                                                                                       
export function unmarshalFromVM(                                                                                       
  handle: QuickJSHandle,                                                                                               
  ctx: QuickJSContext,                                                                                                 
  options: UnmarshalOptions = {}                                                                                       
): any {                                                                                                               
  const objectMap = options.objectMap ?? new WeakMap();                                                                
                                                                                                                       
  function unmarshal(handle: QuickJSHandle): any {                                                                                                                                                                                                                                                                                                       
    // Check if object was already unmarshalled                                                                        
    if (objectMap.has(handle)) {                                                                                       
      return objectMap.get(handle);                                                                                    
    }                                                                                                                  
                                                                                                                       
    // Handle primitives                                                                                               
    const [primitive, isPrimitive] = unmarshalPrimitive(ctx, handle);                                                  
    if (isPrimitive) {                                                                                                 
      return primitive;                                                                                                
    }                                                                                                                  
                                                                                                                       
    const type = ctx.typeof(handle);     
    
                                                                                                                       
    if (type === "object") {                                                                                           
      // Check if array                                                                                                
      const isArrayFn = ctx.unwrapResult(ctx.evalCode("(a) => Array.isArray(a)"));                                     
      const isArray = ctx.unwrapResult(ctx.callFunction(isArrayFn, ctx.undefined, handle));                            
      isArrayFn.dispose();                                                                                             
                                                                                                                       
      if (ctx.dump(isArray)) {                                                                                         
        isArray.dispose();                                                                                             
        const array: any[] = [];                                                                                       
        objectMap.set(handle, array);                                                                                  
                                                                                                                       
        const lengthHandle = ctx.getProp(handle, "length");                                                            
        const length = ctx.dump(lengthHandle);                                                                         
        lengthHandle.dispose();                                                                                        
                                                                                                                       
        for (let i = 0; i < length; i++) {                                                                             
          const elemHandle = ctx.getProp(handle, i.toString());                                                        
          array[i] = unmarshal(elemHandle);                                                                            
          elemHandle.dispose();                                                                                        
        }                                                                                                              
        return array;                                                                                                  
      }                                                                                                                
      isArray.dispose();                                                                                               
                                                                                                                       
      // Handle regular objects                                                                                        
      const result = Object.create(null); 

      objectMap.set(handle, result);                                                                                   
                                                                                                                       
      // Get prototype                                                                                                 
      const getProtoFn = ctx.unwrapResult(ctx.evalCode("Object.getPrototypeOf"));                                      
      const protoHandle = ctx.unwrapResult(ctx.callFunction(getProtoFn, ctx.undefined, handle));                       
      getProtoFn.dispose();                                                                                            
                                                                                                                       
      const isNullFn = ctx.unwrapResult(ctx.evalCode("(a) => a === null"));                                            
      const isNull = ctx.unwrapResult(ctx.callFunction(isNullFn, ctx.undefined, protoHandle));                         
      isNullFn.dispose();                                                                                              
                                                                                                                       
      if (!ctx.dump(isNull)) {                                                                                         
        Object.setPrototypeOf(result, unmarshal(protoHandle));                                                         
      }                                                                                                                
      protoHandle.dispose();                                                                                           
      isNull.dispose();                                                                                                
                                                                                                                       
      // Get property descriptors                                                                                      
      const getDescriptorsFn = ctx.unwrapResult(ctx.evalCode("Object.getOwnPropertyDescriptors"));                     
      const descriptorsHandle = ctx.unwrapResult(                                                                      
        ctx.callFunction(getDescriptorsFn, ctx.undefined, handle)                                                      
      );                                                                                                               
      getDescriptorsFn.dispose();                                                                                      
                                                                                                                       
      const descriptors = ctx.dump(descriptorsHandle) as Record<string, PropertyDescriptorVM>;                         
      descriptorsHandle.dispose();                                                                                     
                                                                                                                       
      // Process each property                                                                                         
      for (const [name, desc] of Object.entries(descriptors)) {                                                        
        const descriptor: PropertyDescriptor = {};                                                                     
                                                                                                                       
        // Handle getters/setters                                                                                      
        if (desc.get) {                                                                                                
          const getterFn = ctx.unwrapResult(ctx.evalCode(                                                              
            `(obj, prop) => Object.getOwnPropertyDescriptor(obj, prop).get`                                            
          ));                                                                                                          
          const getterHandle = ctx.unwrapResult(                                                                       
            ctx.callFunction(getterFn, ctx.undefined, handle, ctx.newString(name))                                     
          );                                                                                                           
          getterFn.dispose();                                                                                          
                                                                                                                       
          descriptor.get = function(this: any) {                                                                       
            const result = ctx.unwrapResult(                                                                           
              ctx.callFunction(getterHandle as QuickJSHandle, marshalToVM(this, ctx), [])                              
            );                                                                                                         
            return unmarshal(result);                                                                                  
          };                                                                                                           
          (getterHandle as QuickJSHandle).dispose();                                                                   
        }                                                                                                              
                                                                                                                       
        if (desc.set) {                                                                                                
          const setterFn = ctx.unwrapResult(ctx.evalCode(                                                              
            `(obj, prop) => Object.getOwnPropertyDescriptor(obj, prop).set`                                            
          ));                                                                                                          
          const setterHandle = ctx.unwrapResult(                                                                       
            ctx.callFunction(setterFn, ctx.undefined, handle, ctx.newString(name))                                     
          );                                                                                                           
          setterFn.dispose();                                                                                          
                                                                                                                       
          descriptor.set = function(this: any, value: any) {                                                           
            const valueHandle = marshalToVM(value, ctx);                                                               
            ctx.unwrapResult(                                                                                          
              ctx.callFunction(setterHandle as QuickJSHandle, marshalToVM(this, ctx), [valueHandle])                   
            );                                                                                                         
            valueHandle.dispose();                                                                                     
          };                                                                                                           
          (setterHandle as QuickJSHandle).dispose();                                                                   
        }                                                                                                              
                                                                                                                       
        // Handle regular properties                                                                                   
        if ('value' in desc) {                                                                                         
          const valueHandle = ctx.getProp(handle, name);                                                               
          descriptor.value = unmarshal(valueHandle);                                                                   
          valueHandle.dispose();                                                                                       
        }                                                                                                              
                                                                                                                       
        descriptor.configurable = !!desc.configurable;                                                                 
        descriptor.enumerable = !!desc.enumerable;                                                                     
        if (!desc.get && !desc.set) {                                                                                  
          descriptor.writable = !!desc.writable;                                                                       
        }                                                                                                              
                                                                                                                       
        Object.defineProperty(result, name, descriptor);                                                               
      }                                                                                                                
                                                                                                                       
      return result;                                                                                                   
    }                                                                                                                  
                                                                                                                                                                                                                                 
    return undefined;                                                                                                  
  }                                                                                                                    
                                                                                                                       
  return unmarshal(handle);                                                                                            
}                                                                                                                      
                                                                                                                       
// Basic marshal function                                                                                              
function marshalToVM(value: any, ctx: QuickJSContext): QuickJSHandle {                                                 
  if (value === null || value === undefined) {                                                                         
    return ctx.undefined;                                                                                              
  }                                                                                                                    
                                                                                                                       
  switch (typeof value) {                                                                                              
    case "string":                                                                                                     
      return ctx.newString(value);                                                                                     
    case "number":                                                                                                     
      return ctx.newNumber(value);                                                                                     
    case "boolean":                                                                                                    
      return value ? ctx.true : ctx.false;                                                                             
    case "object":                                                                                                     
      if (Array.isArray(value)) {                                                                                      
        const arr = ctx.newArray();                                                                                    
        value.forEach((v, i) => {                                                                                      
          const handle = marshalToVM(v, ctx);                                                                          
          ctx.setProp(arr, i.toString(), handle);                                                                      
          handle.dispose();                                                                                            
        });                                                                                                            
        return arr;                                                                                                    
      }                                                                                                                
      const obj = ctx.newObject();                                                                                     
      Object.entries(value).forEach(([k, v]) => {                                                                      
        const handle = marshalToVM(v, ctx);                                                                            
        ctx.setProp(obj, k, handle);                                                                                   
        handle.dispose();                                                                                              
      });                                                                                                              
      return obj;                                                                                                      
    default:                                                                                                           
      return ctx.undefined;                                                                                            
  }                                                                                                                    
}                                                                                                                      
   