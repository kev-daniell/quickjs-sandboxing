import assert from 'assert';
import { describe, it, test } from 'node:test';
import { fooAdd, fooFn, generateFoo } from "../src";
import { unmarshalFromVM } from '../src/wasm/index';
import { getQuickJS } from 'quickjs-emscripten';

describe("sandboxedModule", () => {
    it("should run fooFn", async () => {
        // fooFn is a function that hijacks Array.prototype.toString
        console.log('fooFn:', fooFn());


        // Array here should remain safe
        const a = [1];
        assert.equal(a.toString(), '1');
    });

    it('should run fooAdd', async () => {
        const result = await fooAdd(1, 2);
        assert.strictEqual(result, 3);
    });

    it('should run generateFoo', async () => {
        const foo = generateFoo();

        console.log('foo:', foo, typeof foo);
        assert.strictEqual(foo.prop, 42);
        // assert.strictEqual(foo.test2(), 'foo class test2 function');
    });
});



test('unmarshalFromVM', async function() {                                                                                                
    const ctx = (await getQuickJS()).newContext();                                                                       
                                                                                                                         
    try {                                                                                                                
      // Create a complex object in QuickJS with different types and features                                            
      const handle = ctx.unwrapResult(ctx.evalCode(`                                                                     
        ({                                                                                                               
          // Primitive values                                                                                            
          string: "hello",                                                                                               
          number: 42,                                                                                                    
          boolean: true,                                                                                                 
                                                                                                                         
          // Nested object                                                                                               
          nested: {                                                                                                      
            x: 1,                                                                                                        
            y: 2                                                                                                         
          },                                                                                                             
                                                                                                                         
          // Array                                                                                                       
          array: [1, 2, "three", { four: 4 }],                                                                           
                                                                                                                         
          // Method                                                                                                      
          method() {                                                                                                     
            return this.string + " world";                                                                               
          },                                                                                                             
                                                                                                                         
          // Getter/Setter                                                                                               
          _value: 0,                                                                                                     
          get value() {                                                                                                  
            return this._value;                                                                                          
          },                                                                                                             
          set value(v) {                                                                                                 
            this._value = v;                                                                                             
          }                                                                                                              
        })                                                                                                               
      `));                                                                                                               
                                                                                                                         
      // Unmarshal the object                                                                                            
      const obj = unmarshalFromVM(handle, ctx);                                                                          
                                                                                                                         
      // Test the unmarshalled object                                                                                    
      assert.strictEqual(obj.string, 'hello');
      assert.strictEqual(obj.number, 42);
      assert.strictEqual(obj.boolean, true);

      
      console.log("Nested object:", obj.nested);  // { x: 1, y: 2 }                                                      
      console.log("Array:", obj.array);  // [1, 2, "three", { four: 4 }]                                                 
                                                                                                                                                                                                                                                   
    //   console.log("Method call:", obj.method());  // "hello world"                                                       
                                                                                                                         
    //   obj.value = 123;                                                                                                   
    //   console.log("Getter after setter:", obj.value);  // 123                                                            
                                                                                                                         
      handle.dispose();                                                                                                  
    } finally {                                                                                                          
      ctx.dispose();                                                                                                     
    }                                                                                                                    
});
