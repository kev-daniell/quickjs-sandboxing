import assert from 'assert';
import { describe, it } from 'node:test';
import createSandboxedModule from "../src";

describe("sandboxedModule", () => {
    it("should return an object with the expected properties", async () => {
        try {
            const sb = await createSandboxedModule();
            console.log('Sandbox module:', sb);
            console.log(typeof sb.testFn, typeof sb.fooFn, typeof sb.fooClassInstance, typeof sb.fooClass);
            

        } catch (error) {
            console.error('Test error:', error);
            throw error;
        }
    });
});
