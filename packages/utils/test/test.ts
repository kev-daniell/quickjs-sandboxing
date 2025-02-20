import assert from 'assert';
import { describe, it } from 'node:test';
import { loadPackage} from "../src";

describe("sandboxedModule", () => {
    it("should run fooFn", async () => {
        try { 
            const { fooFn } = await loadPackage();
            console.log('fooFn:', fooFn());


            // Array prototype pollution check
            const a = [1];
            assert.equal(a.toString(), '1');
        }
        catch (error) {
            console.error('Test error:', error);
            throw error;
        }
    });
    it('should run fooAdd', async () => {
        const { fooAdd } = await loadPackage();
        const result = await fooAdd(1, 2);
        assert.strictEqual(result, 3);
    });
});
