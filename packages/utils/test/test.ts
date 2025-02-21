import assert from 'assert';
import { describe, it } from 'node:test';
import { fooAdd, fooFn } from "../src";

describe("sandboxedModule", () => {
    it("should run fooFn", async () => {
        // fooFn is a function that hijacks Array.prototype.toString
        console.log('fooFn:', fooFn());


        // Array prototype pollution check
        const a = [1];
        assert.equal(a.toString(), '1');
    });
    it('should run fooAdd', async () => {
        const result = await fooAdd(1, 2);
        assert.strictEqual(result, 3);
    });
});
