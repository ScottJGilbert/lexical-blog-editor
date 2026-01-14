/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateReader(reader) {
    return __asyncGenerator(this, arguments, function* generateReader_1() {
        let done = false;
        while (!done) {
            const res = yield __await(reader.read());
            const { value } = res;
            if (value !== undefined) {
                yield yield __await(value);
            }
            done = res.done;
        }
    });
}
async function readBytestoString(reader) {
    var _a, e_1, _b, _c;
    const output = [];
    const chunkSize = 0x8000;
    try {
        for (var _d = true, _e = __asyncValues(generateReader(reader)), _f; _f = await _e.next(), _a = _f.done, !_a; _d = true) {
            _c = _f.value;
            _d = false;
            const value = _c;
            for (let i = 0; i < value.length; i += chunkSize) {
                output.push(String.fromCharCode(...value.subarray(i, i + chunkSize)));
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return output.join('');
}
export async function docToHash(doc) {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    const [, output] = await Promise.all([
        writer
            .write(new TextEncoder().encode(JSON.stringify(doc)))
            .then(() => writer.close()),
        readBytestoString(cs.readable.getReader()),
    ]);
    return `#doc=${btoa(output)
        .replace(/\//g, '_')
        .replace(/\+/g, '-')
        .replace(/=+$/, '')}`;
}
export async function docFromHash(hash) {
    var _a, e_2, _b, _c;
    const m = /^#doc=(.*)$/.exec(hash);
    if (!m) {
        return null;
    }
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    const b64 = atob(m[1].replace(/_/g, '/').replace(/-/g, '+'));
    const array = new Uint8Array(b64.length);
    for (let i = 0; i < b64.length; i++) {
        array[i] = b64.charCodeAt(i);
    }
    const closed = writer.write(array).then(() => writer.close());
    const output = [];
    try {
        for (var _d = true, _e = __asyncValues(generateReader(ds.readable.pipeThrough(new TextDecoderStream()).getReader())), _f; _f = await _e.next(), _a = _f.done, !_a; _d = true) {
            _c = _f.value;
            _d = false;
            const chunk = _c;
            output.push(chunk);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
        }
        finally { if (e_2) throw e_2.error; }
    }
    await closed;
    return JSON.parse(output.join(''));
}
