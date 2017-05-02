/// <reference types="node" />

// The MIT License (MIT)
// 
// vs-script-commands (https://github.com/mkloubert/vs-script-commands)
// Copyright (c) Marcel Joachim Kloubert <marcel.kloubert@gmx.net>
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.

import * as ChildProcess from 'child_process';
import * as Crypto from 'crypto';
import * as FS from 'fs';
import * as Path from 'path';
import * as Moment from 'moment';
import * as sc_contracts from './contracts';
import * as vscode from 'vscode';

/**
 * Options for open function.
 */
export interface OpenOptions {
    /**
     * The app (or options) to open.
     */
    app?: string | string[];
    /**
     * The custom working directory.
     */
    cwd?: string;
    /**
     * Wait until exit or not.
     */
    wait?: boolean;
}

/**
 * Describes a simple 'completed' action.
 * 
 * @param {any} [err] The occurred error.
 * @param {TResult} [result] The result.
 */
export type SimpleCompletedAction<TResult> = (err?: any, result?: TResult) => void;


let nextHtmlDocId = -1;

/**
 * Returns a value as array.
 * 
 * @param {T | T[]} val The value.
 * 
 * @return {T[]} The value as array.
 */
export function asArray<T>(val: T | T[]): T[] {
    if (!Array.isArray(val)) {
        return [ val ];
    }

    return val;
}

/**
 * Clones an object / value deep.
 * 
 * @param {T} val The value / object to clone.
 * 
 * @return {T} The cloned value / object.
 */
export function cloneObject<T>(val: T): T {
    if (!val) {
        return val;
    }

    return JSON.parse(JSON.stringify(val));
}

/**
 * Compares two values for a sort operation.
 * 
 * @param {T} x The left value.
 * @param {T} y The right value.
 * 
 * @return {number} The "sort value".
 */
export function compareValues<T>(x: T, y: T): number {
    if (x === y) {
        return 0;
    }

    if (x > y) {
        return 1;
    }

    if (x < y) {
        return -1;
    }

    return 0;
}

/**
 * Creates a simple 'completed' callback for a promise.
 * 
 * @param {Function} resolve The 'succeeded' callback.
 * @param {Function} reject The 'error' callback.
 * 
 * @return {SimpleCompletedAction<TResult>} The created action.
 */
export function createSimplePromiseCompletedAction<TResult>(resolve: (value?: TResult | PromiseLike<TResult>) => void,
                                                            reject?: (reason: any) => void): SimpleCompletedAction<TResult> {
    return (err?, result?) => {
        if (err) {
            if (reject) {
                reject(err);
            }
        }
        else {
            if (resolve) {
                resolve(result);
            }
        }
    };
}

/**
 * Removes duplicate entries from an array.
 * 
 * @param {T[]} arr The input array.
 * 
 * @return {T[]} The filtered array.
 */
export function distinctArray<T>(arr: T[]): T[] {
    if (!arr) {
        return arr;
    }

    return arr.filter((x, i) => {
        return arr.indexOf(x) === i;
    });
}

/**
 * Removes duplicate entries from an array by using a selector.
 * 
 * @param {T[]} arr The input array.
 * @param {Function} selector The selector to use.
 * 
 * @return {T[]} The filtered array.
 */
export function distinctArrayBy<T, U>(arr: T[], selector: (item: T) => U): T[] {
    if (!arr) {
        return arr;
    }

    if (!selector) {
        selector = (item) => <any>item;
    }

    return arr.filter((x, i) => {
        return arr.map(y => selector(y))
                  .indexOf( selector(x) ) === i;
    });
}

/**
 * Returns the value from a "parameter" object.
 * 
 * @param {Object} params The object.
 * @param {string} name The name of the parameter.
 * 
 * @return {string} The value of the parameter (if found).
 */
export function getUrlParam(params: Object, name: string): string {
    if (params) {
        name = normalizeString(name);

        for (let p in params) {
            if (normalizeString(p) === name) {
                return toStringSafe(params[p]);
            }
        }
    }
}

/**
 * Hashes data.
 * 
 * @param {string} algo The algorithm to use.
 * @param {string|Buffer} data 
 * @param {boolean} [raw] Return hash in binary format or as (hext) string.
 */
export function hash(algo: string, data: string | Buffer, asBuffer = false): string | Buffer {
    if (isNullOrUndefined(data)) {
        return data;
    }
    
    algo = normalizeString(algo);
    if ('' === algo) {
        algo = 'sha256';
    }

    asBuffer = toBooleanSafe(asBuffer);

    let hash = Crypto.createHash(algo)
                     .update(data)
                     .digest();

    return asBuffer ? hash : hash.toString('hex');
}

/**
 * Checks if the string representation of a value is empty
 * or contains whitespaces only.
 * 
 * @param {any} val The value to check.
 * 
 * @return {boolean} Is empty or not.
 */
export function isEmptyString(val: any): boolean {
    return '' === toStringSafe(val).trim();
}

/**
 * Checks if a value is (null) or (undefined).
 * 
 * @param {any} val The value to check.
 * 
 * @return {boolean} Is (null)/(undefined) or not.
 */
export function isNullOrUndefined(val: any): boolean {
    return null === val ||
           'undefined' === typeof val;
}

/**
 * Loads a module.
 * 
 * @param {string} file The path of the module's file.
 * @param {boolean} useCache Use cache or not.
 * 
 * @return {TModule} The loaded module.
 */
export function loadModule<TModule>(file: string, useCache: boolean = false): TModule {
    if (!Path.isAbsolute(file)) {
        file = Path.join(vscode.workspace.rootPath, file);
    }
    file = Path.resolve(file);

    let stats = FS.lstatSync(file);
    if (!stats.isFile()) {
        throw new Error(`'${file}' is NO file!`);
    }

    if (!useCache) {
        delete require.cache[file];  // remove from cache
    }
    
    return require(file);
}

/**
 * Logs a message.
 * 
 * @param {any} msg The message to log.
 */
export function log(msg: any) {
    let now = Moment();

    msg = toStringSafe(msg);
    console.log(`[vs-script-commands :: ${now.format('YYYY-MM-DD HH:mm:ss')}] => ${msg}`);
}

/**
 * Normalizes a value as string so that is comparable.
 * 
 * @param {any} val The value to convert.
 * @param {(str: string) => string} [normalizer] The custom normalizer.
 * 
 * @return {string} The normalized value.
 */
export function normalizeString(val: any, normalizer?: (str: string) => string): string {
    if (!normalizer) {
        normalizer = (str) => str.toLowerCase().trim();
    }

    return normalizer(toStringSafe(val));
}

/**
 * Opens a target.
 * 
 * @param {string} target The target to open.
 * @param {OpenOptions} [opts] The custom options to set.
 * 
 * @param {Promise<ChildProcess.ChildProcess>} The promise.
 */
export function open(target: string, opts?: OpenOptions): Promise<ChildProcess.ChildProcess> {
    let me = this;

    if (!opts) {
        opts = {};
    }

    opts.wait = toBooleanSafe(opts.wait, true);
    
    return new Promise((resolve, reject) => {
        let completed = (err?: any, cp?: ChildProcess.ChildProcess) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(cp);
            }
        };
        
        try {
            if (typeof target !== 'string') {
                throw new Error('Expected a `target`');
            }

            let cmd: string;
            let appArgs: string[] = [];
            let args: string[] = [];
            let cpOpts: ChildProcess.SpawnOptions = {
                cwd: opts.cwd || vscode.workspace.rootPath,
            };

            if (Array.isArray(opts.app)) {
                appArgs = opts.app.slice(1);
                opts.app = opts.app[0];
            }

            if (process.platform === 'darwin') {
                // Apple

                cmd = 'open';

                if (opts.wait) {
                    args.push('-W');
                }

                if (opts.app) {
                    args.push('-a', opts.app);
                }
            }
            else if (process.platform === 'win32') {
                // Microsoft

                cmd = 'cmd';
                args.push('/c', 'start', '""');
                target = target.replace(/&/g, '^&');

                if (opts.wait) {
                    args.push('/wait');
                }

                if (opts.app) {
                    args.push(opts.app);
                }

                if (appArgs.length > 0) {
                    args = args.concat(appArgs);
                }
            }
            else {
                // Unix / Linux

                if (opts.app) {
                    cmd = opts.app;
                } else {
                    cmd = Path.join(__dirname, 'xdg-open');
                }

                if (appArgs.length > 0) {
                    args = args.concat(appArgs);
                }

                if (!opts.wait) {
                    // xdg-open will block the process unless
                    // stdio is ignored even if it's unref'd
                    cpOpts.stdio = 'ignore';
                }
            }

            args.push(target);

            if (process.platform === 'darwin' && appArgs.length > 0) {
                args.push('--args');
                args = args.concat(appArgs);
            }

            let cp = ChildProcess.spawn(cmd, args, cpOpts);

            if (opts.wait) {
                cp.once('error', (err) => {
                    completed(err);
                });

                cp.once('close', function (code) {
                    if (code > 0) {
                        completed(new Error('Exited with code ' + code));
                        return;
                    }

                    completed(null, cp);
                });
            }
            else {
                cp.unref();

                completed(null, cp);
            }
        }
        catch (e) {
            completed(e);
        }
    });
}

/**
 * Opens a HTML document in a new tab for a document storage.
 * 
 * @param {sc_contracts.Document[]} storage The storage to open for.
 * @param {string} html The HTML document (source code).
 * @param {string} [title] The custom title for the tab.
 * @param {any} [id] The custom ID for the document in the storage.
 * 
 * @returns {Promise<any>} The promise.
 */
export function openHtmlDocument(storage: sc_contracts.Document[],
                                 html: string, title?: string, id?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        let completed = createSimplePromiseCompletedAction(resolve, reject);

        try {
            let body: Buffer;
            let enc = 'utf8';
            if (html) {
                body = new Buffer(toStringSafe(html), enc);
            }

            if (isNullOrUndefined(id)) {
                id = 'vsscGlobalHtmlDocs::22c1e089-269f-44e8-b112-c56549deaaaa::' + (++nextHtmlDocId);
            }

            let doc: sc_contracts.Document = {
                body: body,
                encoding: enc,
                id: id,
                mime: 'text/html',
            };

            if (!isEmptyString(title)) {
                doc.title = toStringSafe(title).trim();
            }

            if (storage) {
                storage.push(doc);
            }

            vscode.commands.executeCommand('extension.scriptCommands.openHtmlDoc', doc).then((result: any) => {
                completed(null, result);
            }, (err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}

/**
 * Removes documents from a storage.
 * 
 * @param {sc_contracts.Document|sc_contracts.Document[]} docs The document(s) to remove.
 * @param {sc_contracts.Document[]} storage The storage.
 * 
 * @return {sc_contracts.Document[]} The removed documents.
 */
export function removeDocuments(docs: sc_contracts.Document | sc_contracts.Document[],
                                storage: sc_contracts.Document[]): sc_contracts.Document[] {
    let ids = asArray(docs).filter(x => x)
                           .map(x => x.id);

    let removed = [];

    if (storage) {
        for (let i = 0; i < storage.length; ) {
            let d = storage[i];
            if (ids.indexOf(d.id) > -1) {
                removed.push(d);
                storage.splice(i, 1);
            }
            else {
                ++i;
            }
        }
    }

    return removed;
}

/**
 * Replaces all occurrences of a string.
 * 
 * @param {any} str The input string.
 * @param {any} searchValue The value to search for.
 * @param {any} replaceValue The value to replace 'searchValue' with.
 * 
 * @return {string} The output string.
 */
export function replaceAllStrings(str: any, searchValue: any, replaceValue: any) {
    str = toStringSafe(str);
    searchValue = toStringSafe(searchValue);
    replaceValue = toStringSafe(replaceValue);

    return str.split(searchValue)
              .join(replaceValue);
}

/**
 * Sorts a list of commands.
 * 
 * @param {deploy_contracts.ScriptCommand[]} pkgs The input list.
 * @param {deploy_contracts.ValueProvider<string>} [nameProvider] The custom function that provides the name of the machine.
 * 
 * @return {deploy_contracts.ScriptCommand[]} The sorted list.
 */
export function sortCommands(pkgs: sc_contracts.ScriptCommand[],
                             nameProvider?: sc_contracts.ValueProvider<string>): sc_contracts.ScriptCommand[] {
    if (!pkgs) {
        pkgs = [];
    }

    return pkgs.filter(x => x)
               .map((x, i) => {
                        let sortValue = x.sortOrder;
                        if (isNullOrUndefined(sortValue)) {
                            sortValue = 0;
                        }
                        sortValue = parseFloat(toStringSafe(sortValue).trim());

                        if (isNaN(sortValue)) {
                            sortValue = 0;
                        }

                        return {
                            index: i,
                            level0: sortValue,  // first sort by "sortOrder"
                            level1: toStringSafe(x.displayName).toLowerCase().trim(),  // then by "displayName"
                            level2: toStringSafe(x.id).toLowerCase().trim(),  // then by "ID"
                            value: x,
                        };
                    })
               .sort((x, y) => {
                   let comp0 = compareValues(x.level0, y.level0);
                   if (0 != comp0) {
                       return comp0;
                   }

                   let comp1 = compareValues(x.level1, y.level1);
                   if (0 != comp1) {
                       return comp1;
                   }

                   let comp2 = compareValues(x.level2, y.level2);
                   if (0 != comp2) {
                       return comp2;
                   }

                   return compareValues(x.index, y.index);
               })
               .map(x => x.value);
}

/**
 * Returns an array like object as new array.
 * 
 * @param {ArrayLike<T>} arr The input object. 
 * @param {boolean} [normalize] Returns an empty array, if input object is (null) / undefined.
 * 
 * @return {T[]} The input object as array. 
 */
export function toArray<T>(arr: ArrayLike<T>, normalize = true): T[] {
    if (isNullOrUndefined(arr)) {
        if (toBooleanSafe(normalize)) {
            return [];
        }
        
        return <any>arr;
    }

    let newArray: T[] = [];
    for (let i = 0; i < arr.length; i++) {
        newArray.push(arr[i]);
    }

    return newArray;
}

/**
 * Converts a value to a boolean.
 * 
 * @param {any} val The value to convert.
 * @param {any} defaultValue The value to return if 'val' is (null) or (undefined).
 * 
 * @return {boolean} The converted value.
 */
export function toBooleanSafe(val: any, defaultValue: any = false): boolean {
    if (isNullOrUndefined(val)) {
        return defaultValue;
    }

    return !!val;
}

/**
 * Converts a value to a string that is NOT (null) or (undefined).
 * 
 * @param {any} str The input value.
 * @param {any} defValue The default value.
 * 
 * @return {string} The output value.
 */
export function toStringSafe(str: any, defValue: any = ''): string {
    if (!str) {
        str = '';
    }
    str = '' + str;
    if (!str) {
        str = defValue;
    }

    return str;
}

/**
 * Tries to dispose an object.
 * 
 * @param {vscode.Disposable} obj The object to dispose.
 * 
 * @return {boolean} Operation was successful or not.
 */
export function tryDispose(obj: vscode.Disposable): boolean {
    try {
        if (obj) {
            obj.dispose();
        }

        return true;
    }
    catch (e) {
        log(`[ERROR] helpers.tryDispose(): ${toStringSafe(e)}`);

        return false;
    }
}

/**
 * Extracts the query parameters of an URI to an object.
 * 
 * @param {vscode.Uri} uri The URI.
 * 
 * @return {Object} The parameters of the URI as object.
 */
export function uriParamsToObject(uri: vscode.Uri): Object {
    if (!uri) {
        return uri;
    }

    let params: any;
    if (!isEmptyString(uri.query)) {
        // s. https://css-tricks.com/snippets/jquery/get-query-params-object/
        params = uri.query.replace(/(^\?)/,'')
                          .split("&")
                          .map(function(n) { return n = n.split("="), this[normalizeString(n[0])] =
                                                                           toStringSafe(decodeURIComponent(n[1])), this}
                          .bind({}))[0];
    }

    if (!params) {
        params = {};
    }

    return params;
}
