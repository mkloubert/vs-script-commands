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

import * as Crypto from 'crypto';
import * as Dgram from 'dgram';
import * as Events from 'events';
import * as FS from 'fs';
import * as FSExtra from 'fs-extra';
const Hexy = require('hexy');
import * as HtmlEntities from 'html-entities';
import * as HTTP from 'http';
import * as HTTPs from 'https';
import * as Glob from 'glob';
import * as Globals from './globals';
import * as Marked from 'marked';
import * as Moment from 'moment';
import * as Path from 'path';
const PublicIP = require('public-ip');
const RandomInt = require('random-int');
import * as sc_contracts from './contracts';
import * as sc_controller from './controller';
import * as sc_helpers from './helpers';
import * as sc_resources from './resources';
import * as URL from 'url';
import * as UUID from 'uuid';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';
import * as ZLib from 'zlib';


/**
 * A history of expressions.
 */
export type History = HistoryEntry | HistoryEntry[];

/**
 * An entry of history expressions.
 */
export interface HistoryEntry {
    /**
     * Stores the description (for the GUI).
     */
    description?: string;
    /**
     * The stored code expression.
     */
    expression?: string;
}

interface HistoryEntryEx extends HistoryEntry {
    index: number;
    source: string;
}

/**
 * A HTTP response.
 */
export interface HttpResponse {
    /**
     * The body.
     */
    body: Buffer;
    /**
     * The response code.
     */
    code: number;
    /**
     * The list of response headers.
     */
    headers: { [key: string]: string };
    /**
     * The status message.
     */
    message: string;
    /**
     * The raw object.
     */
    object: HTTP.IncomingMessage;
}

/**
 * A script module.
 */
export interface ScriptModule {
    /**
     * The optional logic to execute.
     * 
     * @param {any[]} [args] One or more argument for the execution.
     * 
     * @return {any} The result.
     */
    execute?: (...args: any[]) => any;
}

interface UDPServer {
    connection: Dgram.Socket;
    id: number;
}

type UDPServerAction = () => void;


let _events: NodeJS.EventEmitter;
let _lastResult: any;
let _nextUDPServerID;
let _permanentCurrentDirectory: string;
let _permanentDisableHexView: boolean;
let _permanentNoResultInfo: boolean;
let _permanentShowResultInTab: boolean;
let _prevVal: any;
let _state: any;
let _udpServerActions: UDPServerAction[];
let _udpServers: UDPServer[];
let _values: any[];

const KEY_HISTORY = 'vsscQuickCommandHistory';
const KEY_LAST_QUICK_COMMAND = 'vsscLastQuickCommand';

const MAX_RAND = 2147483647;
const MIN_RAND = -2147483648;


function _closeUDPSafe(socket: Dgram.Socket) {
    try {
        if (socket) {
            socket.close();
        }

        return true;
    }
    catch (e) {
        return false;
    }
}

function _executeExpression(_expr: string) {
    _expr = sc_helpers.toStringSafe(_expr);
    if (sc_helpers.isEmptyString(_expr)) {
        return;
    }

    const $me: sc_controller.ScriptCommandController = this;
    const $config = sc_helpers.cloneObject($me.config);
    const $globalHistory = _normalizeHistory($me.context.globalState.get<History>(KEY_HISTORY, []));
    const $doNotShowResult = Symbol('DO_NOT_SHOW_RESULT');
    const $workspaceHistory = _normalizeHistory($me.context.workspaceState.get<History>(KEY_HISTORY, []));
    let $state = _state;
    let $nextValue: any;

    let _disableHexView = _permanentDisableHexView;
    let _noResultInfo = _permanentNoResultInfo;
    let _saveToHistory = true;
    let _showResultInTab = _permanentShowResultInTab;
    let _saveLastExpression = true;
    const _completed = (err: any, result?: any) => {
        _state = $state;
        _prevVal = $nextValue;

        if (sc_helpers.toBooleanSafe(_saveLastExpression)) {
            $me.context.workspaceState.update(KEY_LAST_QUICK_COMMAND, _expr).then(() => {
            }, (err) => {
                $me.log(`[ERROR] ScriptCommandController._executeExpression(1): ${sc_helpers.toStringSafe(err)}`);
            });
        }

        let saveResultsToState = false;
        let saveToGlobalHistory = false;
        let saveToHistory = false;
        if ($config.quick) {
            saveResultsToState = sc_helpers.toBooleanSafe($config.quick.saveResultsToState);
            saveToGlobalHistory = sc_helpers.toBooleanSafe($config.quick.saveToGlobalHistory);
            saveToHistory = sc_helpers.toBooleanSafe($config.quick.saveToHistory);
        }

        if (sc_helpers.toBooleanSafe(_saveToHistory) && saveToHistory) {
            let storage = saveToGlobalHistory ? $me.context.globalState : $me.context.workspaceState;
            let history = saveToGlobalHistory ? $globalHistory : $workspaceHistory;

            history.push({
                expression: _expr,
            });
        }

        let updateHistory = function(storage: vscode.Memento, history: History) {
            history = _normalizeHistory(history);

            storage.update(KEY_HISTORY, history).then(() => {
            }, (err) => {
                $me.log(`[ERROR] ScriptCommandController._executeExpression(9): ${sc_helpers.toStringSafe(err)}`);
            });
        };

        updateHistory($me.context.globalState, $globalHistory);
        updateHistory($me.context.workspaceState, $workspaceHistory);

        if (err) {
            vscode.window.showErrorMessage(`[vs-script-commands] ${sc_helpers.toStringSafe(err)}`).then(() => {
                // retry
                
                $me.quickExecution
                    .apply($me,
                            []);
            }, (e) => {
                $me.log(`[ERROR] ScriptCommandController._executeExpression(4): ${sc_helpers.toStringSafe(e)}`);
            });
        }
        else {
            _lastResult = result;
            if (saveResultsToState) {
                _state = result;
            }

            if (($doNotShowResult !== result) &&
                !_noResultInfo &&
                ('undefined' !== typeof result)) {
                // only if defined
                // and activated
                // -OR- $doNotShowResult

                if (_showResultInTab || Buffer.isBuffer(result)) {
                    // show in tab

                    $me.openHtml(_generateHTMLForResult(_expr, result, _disableHexView), '[vs-script-commands] Quick execution result').then(() => {
                    }, (err) => {
                        $me.log(`[ERROR] ScriptCommandController._executeExpression(3): ${sc_helpers.toStringSafe(err)}`);
                    });
                }
                else {
                    // show in popup

                    vscode.window.showInformationMessage('' + result).then(() => {
                    }, (err) => {
                        $me.log(`[ERROR] ScriptCommandController._executeExpression(2): ${sc_helpers.toStringSafe(err)}`);
                    });
                }
            }
        }
    };

    try {
        let $args: any[];
        let $maxDepth = 64;

        const $unwrap = function(valueOrResult: any, maxDepth?: number): Promise<any> {
            maxDepth = parseInt( sc_helpers.toStringSafe(maxDepth).trim() );
            if (isNaN(maxDepth)) {
                maxDepth = $maxDepth;
            }
            if (isNaN(maxDepth)) {
                maxDepth = 64;
            }

            return new Promise<any>((resolve, reject) => {
                let completed = (err: any, v?: any) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(v);
                    }
                };
                
                let unwrapNext: (val: any, level: number) => void;
                unwrapNext = (val, level) => {
                    try {
                        if (!isNaN(maxDepth) && (level >= maxDepth)) {
                            // maximum reached

                            completed(null, val);
                        }
                        else {
                            Promise.resolve( val ).then((v) => {
                                try {
                                    if ('function' === typeof v) {
                                        unwrapNext( v(), level + 1 );
                                    }
                                    else {
                                        completed(null, v);
                                    }
                                }
                                catch (e) {
                                    completed(e);
                                }
                            }).catch((err) => {
                                completed(err);
                            });
                        }
                    }
                    catch (e) {
                        completed(e);
                    }
                };

                unwrapNext(valueOrResult, 0);
            });
        };
        const $clone = function(valueOrResult: any): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                $unwrap(valueOrResult).then((value) => {
                    try {
                        let clonedValue: any;

                        if (Buffer.isBuffer(value)) {
                            clonedValue = Buffer.concat([ value ]);
                        }
                        else {
                            clonedValue = sc_helpers.cloneObject(value);
                        }

                        resolve( clonedValue );
                    }
                    catch (e) {
                        reject(e);
                    }
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $ = function(...args: any[]): Promise<any[]> {
            return new Promise<any>((resolve, reject) => {
                let wf = Workflows.create();

                wf.next((ctx) => {
                    ctx.result = [];
                });

                if (args) {
                    args.forEach(a => {
                        wf.next((ctx) => {
                            let result: any[] = ctx.result;

                            return new Promise<any>((res, rej) => {
                                try {
                                    Promise.resolve(a).then((r) => {
                                        try {
                                            result.push(r);

                                            res();
                                        }
                                        catch (e) {
                                            rej(e);
                                        }
                                    }).catch((err) => {
                                        rej(err);
                                    });
                                }
                                catch (e) {
                                    rej(e);
                                }
                            });
                        });
                    });
                }

                return wf.start().then((result: any[]) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $addValue = function(valueOrResult: any): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                try {
                    Promise.resolve( valueOrResult ).then((result) => {
                        try {
                            $values.push(result);

                            resolve(result);
                        }
                        catch (e) {
                            reject(e);
                        }
                    }).catch((err) => {
                        reject(err);
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        };
        const $appendFile = function(file: string, data: any): void {
            file = sc_helpers.toStringSafe(file);
            if (!Path.isAbsolute(file)) {
                file = Path.join(_currentDir, file);
            }

            FS.appendFileSync(file, data);
        };
        const $asString = function(val: any, enc?: string): string {
            if (sc_helpers.isNullOrUndefined(val)) {
                return val;
            }

            enc = sc_helpers.normalizeString(enc);
            if ('' === enc) {
                enc = undefined;
            }

            if (Buffer.isBuffer(val)) {
                return val.toString(enc);
            }

            if ('object' === typeof val) {
                return JSON.stringify(val);
            }

            return sc_helpers.toStringSafe(val);
        };

        let _currentDir = _permanentCurrentDirectory;

        const $base64Decode = function(valueOrResult: any): Promise<Buffer> {
            return new Promise<Buffer>((resolve, reject) => {
                $unwrap(valueOrResult).then((value) => {
                    try {
                        value = $asString(value);

                        let buffer: Buffer;

                        if (!sc_helpers.isEmptyString(value)) {
                            buffer = new Buffer(value.trim(), 'base64');
                        }

                        resolve(buffer);
                    }
                    catch (e) {
                        reject(e);
                    }
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $base64Encode = function(valueOrResult: any): Promise<string> {
            return new Promise<string>((resolve, reject) => {
                $unwrap(valueOrResult).then((value) => {
                    try {
                        let base64: string;

                        if (!sc_helpers.isNullOrUndefined(value)) {
                            if (!Buffer.isBuffer(value)) {
                                value = new Buffer( $asString(value, 'ascii') );
                            }

                            base64 = value.toString('base64');
                        }

                        resolve(base64);
                    }
                    catch (e) {
                        reject(e);
                    }
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $clearHistory = function(clearGlobal?: boolean): void {
            _saveLastExpression = false;
            _saveToHistory = false;

            let arrays = [];
            if (arguments.length < 1) {
                arrays.push($globalHistory);
                arrays.push($workspaceHistory);
            }
            else {
                if (sc_helpers.toBooleanSafe(clearGlobal)) {
                    arrays.push($globalHistory);
                }
                else {
                    arrays.push($workspaceHistory);
                }
            }

            let deletedEntries = 0;

            arrays.forEach(a => {
                while (a.length > 0) {
                    a.pop();
                    ++deletedEntries;
                }
            });
        };
        const $clearValues = function(): void {
            _values = [];
        };
        const $cwd = function(newPath?: string, permanent = false) {
            if (arguments.length > 0) {
                newPath = sc_helpers.toStringSafe(arguments[0]);
                if (sc_helpers.isEmptyString(newPath)) {
                    newPath = vscode.workspace.rootPath;
                }
                if (!Path.isAbsolute(newPath)) {
                    newPath = Path.join(_currentDir, newPath);
                }
                newPath = Path.resolve(newPath);

                _currentDir = newPath;
                if (sc_helpers.toBooleanSafe(permanent)) {
                    _permanentCurrentDirectory = newPath;
                }
            }

            return _currentDir;
        };

        const $DELETE = function(url: string, headersOrFileWithHeaders?: any, body?: string | Buffer): Promise<HttpResponse> {
            return new Promise<HttpResponse>((resolve, reject) => {
                _httpRequest(_currentDir, 'DELETE', url, headersOrFileWithHeaders, body).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $disableHexView = function(flag?: boolean, permanent = false): boolean {
            if (arguments.length > 0) {
                _disableHexView = sc_helpers.toBooleanSafe(flag);
                
                if (sc_helpers.toBooleanSafe(permanent)) {
                    _permanentDisableHexView = _disableHexView;
                }
            }

            return _disableHexView;
        };
        const $error = function(msg: string): Thenable<string> {
            return vscode.window
                         .showErrorMessage( sc_helpers.toStringSafe(msg) );
        };
        const $events = _events;
        const $execute = function(scriptPath: string): Promise<any> {
            let args = sc_helpers.toArray(arguments)
                                 .slice(1);  // without 'scriptPath'

            // resolve script path
            scriptPath = sc_helpers.toStringSafe(scriptPath);
            if ('' === scriptPath.trim()) {
                scriptPath = './script.js';
            }
            if (!Path.isAbsolute(scriptPath)) {
                scriptPath = Path.join(_currentDir, scriptPath);
            }
            scriptPath = Path.resolve(scriptPath);

            // remove from cache
            delete require.cache[scriptPath];

            // execute?
            let sm: ScriptModule = require(scriptPath);
            if (sm) {
                if (sm.execute) {
                    let execRes = Promise.resolve(sm.execute
                                                    .apply(sm, args));

                    return Promise.resolve(execRes);
                }
            }
        };
        const $executeCommand = function(id: string, ...args: any[]): Thenable<any> {
            return vscode.commands
                         .executeCommand
                         .apply(null,
                                [ id ].concat( args || [] ));
        };
        const $executeForState = function( result ): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                Promise.resolve(result).then((r) => {
                    $state = r;

                    resolve(r);
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $exists = function(path: string): boolean {
            path = sc_helpers.toStringSafe(path);
            if (!Path.isAbsolute(path)) {
                path = Path.join(_currentDir, path);
            }

            return FS.existsSync(path);
        };
        const $extension = $me.context;
        const $findFiles = function(pattern: string, ignore?: string[]): string[] {
            pattern = sc_helpers.toStringSafe(pattern);
            if ('' === pattern.trim()) {
                pattern = '**';
            }

            ignore = sc_helpers.asArray(ignore)
                               .map(x => sc_helpers.toStringSafe(x))
                               .filter(x => '' !== x.trim());
            ignore = sc_helpers.distinctArray(ignore);

            return Glob.sync(pattern, <any>{
                cwd: _currentDir,
                root: _currentDir,
                dot: true,
                nocase: true,
                nodir: true,
                nosort: false,
                realpath: false,
                ignore: ignore,
                absolute: true,
            });
        };
        const $fromMarkdown = function(markdown: string): string {
            return _fromMarkdown(markdown);
        };
        const $GET = function(url: string, headersOrFileWithHeaders?: any, body?: string | Buffer): Promise<HttpResponse> {
            return new Promise<HttpResponse>((resolve, reject) => {
                _httpRequest(_currentDir, 'GET', url, headersOrFileWithHeaders, body).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $getCronJobs = function(jobs: sc_contracts.CronJobNames): Promise<sc_contracts.CronJobInfo[]> {
            return new Promise<sc_contracts.CronJobInfo[]>((resolve, reject) => {
                try {
                    let callback = (err: any, jobs: sc_contracts.CronJobInfo[]) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(jobs);
                        }
                    };

                    vscode.commands.executeCommand('extension.cronJons.getJobs', callback).then(() => {
                        //TODO
                    }, (err) => {
                        reject(err);
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        };
        const $globalEvents = Globals.EVENTS;
        const $globals = $me.getGlobals();
        const $guid = function(v4 = true) {
            return sc_helpers.toBooleanSafe(v4) ? UUID.v4() : UUID.v1();
        };
        const $gunzip = function(valueOrResult: Buffer | string): Promise<Buffer> {
            return new Promise<Buffer>((resolve, reject) => {
                $unwrap(valueOrResult).then((val) => {
                    try {
                        if (sc_helpers.isNullOrUndefined(val)) {
                            val = Buffer.alloc(0);
                        }

                        if (!Buffer.isBuffer(val)) {
                            val = new Buffer(sc_helpers.toStringSafe(val).trim(), 'base64');
                        }

                        ZLib.gunzip(val, (err, uncompressedData) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve(uncompressedData);
                            }
                        });
                    }
                    catch (e) {
                        reject(e);    
                    }
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $gzip = function(valueOrResult: any, base64 = false): Promise<Buffer | string> {
            base64 = sc_helpers.toBooleanSafe(base64);
            
            return new Promise<Buffer | string>((resolve, reject) => {
                $unwrap(valueOrResult).then((val) => {
                    try {
                        if (sc_helpers.isNullOrUndefined(val)) {
                            val = Buffer.alloc(0);
                        }

                        if (!Buffer.isBuffer(val)) {
                            val = new Buffer( $asString(val) );
                        }

                        ZLib.gzip(val, (err, compressedData) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve(base64 ? compressedData.toString('base64')
                                               : compressedData);
                            }
                        });
                    }
                    catch (e) {
                        reject(e);
                    }
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $hash = function(algo: string, data: string | Buffer, asBuffer = false): string | Buffer {
            return sc_helpers.hash(algo, data, asBuffer);
        };
        const $HEAD = function(url: string, headersOrFileWithHeaders?: any, body?: string | Buffer): Promise<HttpResponse> {
            return new Promise<HttpResponse>((resolve, reject) => {
                _httpRequest(_currentDir, 'HEAD', url, headersOrFileWithHeaders, body).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $help = function() {
            return $me.openHtml(_generateHelpHTML(),
                                '[vs-script-commands] Quick execution');
        };
        const $history = function(): void {
            _saveToHistory = false;

            let allEntries = _normalizeHistory($workspaceHistory.map((h, i) => _toHistoryEntryEx(h, i, 'workspace'))
                                                                .concat($globalHistory.map((h, i) => _toHistoryEntryEx(h, i, 'global'))));

            let quickPicks: sc_contracts.ActionQuickPickItem[] = allEntries.sort((x, y) => {
                let comp0 = sc_helpers.compareValues( sc_helpers.normalizeString(x.expression),
                                                      sc_helpers.normalizeString(x.expression) );

                if (0 !== comp0) {
                    return comp0;  // first sort by expression
                }

                // then by description
                let comp1 = sc_helpers.compareValues( sc_helpers.normalizeString(x.description),
                                                      sc_helpers.normalizeString(x.description) );

                return comp1;
            }).map((h: HistoryEntryEx) => {
                let qp: sc_contracts.ActionQuickPickItem = {
                    action: function() {
                        _executeExpression.apply($me,
                                                 [ this.label ]);
                    },
                    description: sc_helpers.toStringSafe(h.description),
                    detail: `${h.source}[${h.index}]`,
                    label: h.expression,
                    tag: h,
                };

                return qp;
            });

            vscode.window.showQuickPick(quickPicks).then((item) => {
                if (!item) {
                    return;
                }

                try {
                    Promise.resolve( item.action() ).then(() => {

                    }).catch((err) => {
                        $me.log(`[ERROR] ScriptCommandController._executeExpression(7): ${sc_helpers.toStringSafe(err)}`);
                    });
                }
                catch (e) {
                    $me.log(`[ERROR] ScriptCommandController._executeExpression(6): ${sc_helpers.toStringSafe(e)}`);
                }
            }, (err) => {
                $me.log(`[ERROR] ScriptCommandController._executeExpression(5): ${sc_helpers.toStringSafe(err)}`);
            });
        };
        const $htmlDecode = function(str: string): string {
            str = sc_helpers.toStringSafe(str);

            return (new HtmlEntities.AllHtmlEntities()).decode(str);
        };
        const $htmlEncode = function(str: string): string {
            str = sc_helpers.toStringSafe(str);

            return (new HtmlEntities.AllHtmlEntities()).encode(str);
        };
        const $info = function(msg: string): Thenable<string> {
            return vscode.window
                         .showInformationMessage( sc_helpers.toStringSafe(msg) );
        };
        const $ip = function(v6 = false, useHTTPs = false, timeout = 5000): string {
            let opts = {
                https: sc_helpers.toBooleanSafe(useHTTPs),
                timeout: parseInt(sc_helpers.toStringSafe(timeout).trim()),
            };

            return sc_helpers.toBooleanSafe(v6) ? PublicIP.v6(opts)
                                                : PublicIP.v4(opts);
        };
        const $lastResult = _lastResult;
        let $level = 0;
        const $log = function(msg: any) {
            $me.log(msg);
        };
        const $lower = function(val: any, locale = false): string {
            val = sc_helpers.toStringSafe(val);

            return sc_helpers.toBooleanSafe(locale) ? val.toLocaleLowerCase()
                                                    : val.toLowerCase();
        };
        const $lstat = function(path: string): FS.Stats {
            path = sc_helpers.toStringSafe(path);
            if (!Path.isAbsolute(path)) {
                path = Path.join(_currentDir, path);
            }

            return FS.lstatSync(path);
        };
        const $max = function(...args: any[]): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                let wf = Workflows.create();

                if (args) {
                    args.forEach((a, i) => {
                        wf.next((wfCtx) => {
                            return new Promise<any>((res, rej) => {
                                $unwrap(a).then((val) => {
                                    if (wfCtx.index > 0) {
                                        if (val > wfCtx.result) {
                                            wfCtx.result = val;
                                        }
                                    }
                                    else {
                                        wfCtx.result = val;
                                    }

                                    res();
                                }).catch((err) => {
                                    rej(err);
                                });
                            });
                        });
                    });
                }

                wf.start().then((maxValue) => {
                    resolve(maxValue);
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $mkdir = function(dir: string): void {
            dir = sc_helpers.toStringSafe(dir);
            if (!Path.isAbsolute(dir)) {
                dir = Path.join(_currentDir, dir);
            }

            FSExtra.mkdirsSync(dir);
        };
        const $md5 = function(data: string | Buffer, asBuffer = false): string | Buffer {
            return sc_helpers.hash('md5', data, asBuffer);
        };
        const $min = function(...args: any[]): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                let wf = Workflows.create();

                if (args) {
                    args.forEach((a, i) => {
                        wf.next((wfCtx) => {
                            return new Promise<any>((res, rej) => {
                                $unwrap(a).then((val) => {
                                    if (wfCtx.index > 0) {
                                        if (val < wfCtx.result) {
                                            wfCtx.result = val;
                                        }
                                    }
                                    else {
                                        wfCtx.result = val;
                                    }

                                    res();
                                }).catch((err) => {
                                    rej(err);
                                });
                            });
                        });
                    });
                }

                wf.start().then((minValue) => {
                    resolve(minValue);
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $noResultInfo = function(flag?: boolean, permanent = false): boolean {
            if (arguments.length > 0) {
                _noResultInfo = sc_helpers.toBooleanSafe(flag);
                
                if (sc_helpers.toBooleanSafe(permanent)) {
                    _permanentNoResultInfo = _noResultInfo;
                }
            }

            return _noResultInfo;
        };
        const $now = function(): Moment.Moment {
            return Moment();
        };
        const $openHtml = function(htmlOrResult: any, title?: string): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                Promise.resolve(htmlOrResult).then((html) => {
                    $me.openHtml(sc_helpers.toStringSafe(html), title).then((r) => {
                        resolve(r);
                    }).catch((err) => {
                        reject(err);
                    });
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $OPTIONS = function(url: string, headersOrFileWithHeaders?: any, body?: string | Buffer): Promise<HttpResponse> {
            return new Promise<HttpResponse>((resolve, reject) => {
                _httpRequest(_currentDir, 'OPTIONS', url, headersOrFileWithHeaders, body).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $output = $me.outputChannel;
        const $password = function(size = 20, chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'): string {
            size = parseInt(sc_helpers.toStringSafe(size).trim());

            chars = sc_helpers.toStringSafe(chars);
            if (chars.length < 1) {
                return null;
            }

            let bytes = Crypto.randomBytes(size * 4);

            let pwd = '';
            for (let i = 0; i < (bytes.length / 4); i++) {
                let b = bytes.readUInt32LE(i);

                pwd += chars[ b % chars.length ];
            }

            return pwd;
        };
        const $PATCH = function(url: string, headersOrFileWithHeaders?: any, body?: string | Buffer): Promise<HttpResponse> {
            return new Promise<HttpResponse>((resolve, reject) => {
                _httpRequest(_currentDir, 'PATCH', url, headersOrFileWithHeaders, body).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $POST = function(url: string, headersOrFileWithHeaders?: any, body?: string | Buffer): Promise<HttpResponse> {
            return new Promise<HttpResponse>((resolve, reject) => {
                _httpRequest(_currentDir, 'POST', url, headersOrFileWithHeaders, body).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $previousValue = _prevVal;
        const $push = function(valueOrResult: any, ignorePromise = false): Promise<number> {
            ignorePromise = sc_helpers.toBooleanSafe(ignorePromise);
            
            return new Promise<any>((resolve, reject) => {
                let completed = (err: any, result?: any) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve( _values.push(result) );
                    }
                };

                try {
                    if (ignorePromise) {
                        completed(null, valueOrResult);
                    }
                    else {
                        Promise.resolve(valueOrResult).then((r) => {
                            completed(null, r);
                        }).catch((err) => {
                            completed(err);
                        });
                    }
                }
                catch (e) {
                    completed(e);
                }
            });
        };
        const $PUT = function(url: string, headersOrFileWithHeaders?: any, body?: string | Buffer): Promise<HttpResponse> {
            return new Promise<HttpResponse>((resolve, reject) => {
                _httpRequest(_currentDir, 'PUT', url, headersOrFileWithHeaders, body).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $rand = function(minOrMax?: number, max?: number): number {
            if (arguments.length < 2) {
                minOrMax = parseInt(sc_helpers.toStringSafe(minOrMax).trim());
                if (isNaN(minOrMax)) {
                    minOrMax = MAX_RAND;
                }

                return RandomInt(minOrMax >= 0 ? 0 : MIN_RAND,
                                 minOrMax);
            }

            max = parseInt(sc_helpers.toStringSafe(max).trim());
            if (isNaN(max)) {
                max = MAX_RAND;
            }

            minOrMax = parseInt(sc_helpers.toStringSafe(minOrMax).trim());
            if (isNaN(minOrMax)) {
                minOrMax = max >= 0 ? 0 : MIN_RAND;
            }

            return RandomInt(minOrMax, max);
        };
        const $randomString = function(size = 8, chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'): string {
            size = parseInt(sc_helpers.toStringSafe(size).trim());
            
            chars = sc_helpers.toStringSafe(chars);
            if (chars.length < 1) {
                return null;
            }

            let str = '';
            for (let i = 0; i < size; i++) {
                let index = RandomInt(0, chars.length);

                str += chars[index];
            }

            return str;
        };
        const $readFile = function(file: string): Buffer {
            file = sc_helpers.toStringSafe(file);
            if (!Path.isAbsolute(file)) {
                file = Path.join(_currentDir, file);
            }

            return FS.readFileSync(file);
        };
        const $readJSON = function(file: string, enc = 'utf8'): any {
            file = sc_helpers.toStringSafe(file);
            if (!Path.isAbsolute(file)) {
                file = Path.join(_currentDir, file);
            }

            enc = sc_helpers.normalizeString(enc);
            if ('' === enc) {
                enc = 'utf8';
            }

            return JSON.parse( FS.readFileSync(file).toString(enc) );
        };
        const $readString = function(file: string, enc = 'utf8'): string {
            file = sc_helpers.toStringSafe(file);
            if (!Path.isAbsolute(file)) {
                file = Path.join(_currentDir, file);
            }

            enc = sc_helpers.normalizeString(enc);
            if ('' === enc) {
                enc = 'utf8';
            }

            return FS.readFileSync(file).toString(enc);
        };
        const $receiveFrom = function(port: number, type?: string): Promise<Buffer> {
            port = parseInt( sc_helpers.toStringSafe(port).trim() );

            type = sc_helpers.normalizeString(type);
            if ('' === type) {
                type = 'udp4';
            }

            return new Promise<Buffer>((resolve, reject) => {
                let udp: Dgram.Socket;
                try {
                    let udp: UDPServer = {
                        connection: Dgram.createSocket(type),
                        id: ++_nextUDPServerID,
                    };

                    let closeUDPServer = () => {
                        _udpServerActions.push(() => {
                            _closeUDPSafe(udp.connection);

                            _udpServers = _udpServers.filter(other => other.id !== udp.id);
                        });

                        _handleUDPServerActionsSafe();
                    };

                    udp.connection.once('error', (err) => {
                        closeUDPServer();
                        
                        reject(err);
                    });

                    udp.connection.once('message', (data) => {
                        closeUDPServer();
                        
                        resolve(data);
                    });

                    udp.connection.bind(port);

                    _udpServers.push(udp);

                    vscode.window.showInformationMessage(`UDP server runs on ID '${udp.id}'`).then(() => {
                    }, (err) => {
                        $me.log(`[ERROR] ScriptCommandController._executeExpression(8): ${sc_helpers.toStringSafe(err)}`);
                    });
                }
                catch (e) {
                    _closeUDPSafe(udp);

                    reject(e);
                }
            });
        };
        const $receiveJSONFrom = function(port: number, type?: string): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                $receiveFrom(port, type).then((data) => {
                    try {
                        let val: any;
                        if (data.length > 0) {
                            val = JSON.parse( data.toString('utf8') );
                        }

                        resolve(val);
                    }
                    catch (e) {
                        reject(e);
                    }
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $removeFromHistory = function(index?: number, fromGlobal = false): void {
            _saveLastExpression = false;
            _saveToHistory = false;

            fromGlobal = sc_helpers.toBooleanSafe(fromGlobal);

            let history = fromGlobal ? $globalHistory : $workspaceHistory;

            index = parseInt( sc_helpers.toStringSafe(index).trim() );
            if (isNaN(index)) {
                index = history.length - 1;
            }

            let removedEntry = history[index];

            if ('undefined' !== typeof removedEntry) {
                history.splice(index, 1);
            }
        };
        const $REQUEST = function(method: string, url: string, headersOrFileWithHeaders?: any, body?: string | Buffer): Promise<HttpResponse> {
            return new Promise<HttpResponse>((resolve, reject) => {
                _httpRequest(_currentDir, method, url, headersOrFileWithHeaders, body).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $require = function(id: string): any {
            return require(sc_helpers.toStringSafe(id));
        };
        const $restartCronJobs = function(jobs: sc_contracts.CronJobNames): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                try {
                    vscode.commands.executeCommand('extension.cronJons.restartJobsByName', jobs).then((result) => {
                        resolve(result);
                    }, (err) => {
                        reject(err);
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        };
        const $saveJSON = function(file: string, val: any, enc = 'utf8'): void {
            file = sc_helpers.toStringSafe(file);
            if (!Path.isAbsolute(file)) {
                file = Path.join(_currentDir, file);
            }

            enc = sc_helpers.normalizeString(enc);
            if ('' === enc) {
                enc = 'utf8';
            }

            let json = JSON.parse(val);

            FS.writeFileSync(file, new Buffer(json, enc) );
        };
        const $saveToHistory = function(saveGlobal = false, desc?: string): void {
            _saveLastExpression = false;
            _saveToHistory = false;

            saveGlobal = sc_helpers.toBooleanSafe(saveGlobal);

            let storage = saveGlobal ? $me.context.globalState : $me.context.workspaceState;
            let history = saveGlobal ? $globalHistory : $workspaceHistory;

            if (history.map(h => h.expression).indexOf(_expr) < 0) {
                history.push({
                    description: sc_helpers.toStringSafe(desc),
                    expression: _expr,
                });
            }
        };
        const $sendTo = function(data: any, port: number, addr?: string, type?: string): Promise<any> {
            if (sc_helpers.isNullOrUndefined(data)) {
                data = Buffer.alloc(0);   
            }
            if (!Buffer.isBuffer(data)) {
                data = new Buffer( sc_helpers.toStringSafe(data), 'ascii' );
            }
            
            port = parseInt( sc_helpers.toStringSafe(port).trim() );
            
            addr = sc_helpers.normalizeString(addr);
            if ('' === addr) {
                addr = '127.0.0.1';
            }

            type = sc_helpers.normalizeString(type);
            if ('' === type) {
                type = 'udp4';
            }

            return new Promise<any>((resolve, reject) => {
                let udp: Dgram.Socket;
                try {
                    udp = Dgram.createSocket(type);

                    udp.send(data, port, addr, (err) => {
                        _closeUDPSafe(udp);

                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                }
                catch (e) {
                    _closeUDPSafe(udp);

                    reject(e);
                }
            });
        };
        const $sendJSONTo = function(data: any, port: number, addr?: string, type?: string): Promise<any> {
            let json = JSON.stringify(data);

            return $sendTo(new Buffer(json, 'utf8'), 
                           port, addr, type);
        };
        const $select = function(valueOrResult: any, selector: (val: any) => any): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                Promise.resolve(valueOrResult).then((val) => {
                    try {
                        if (selector) {
                            Promise.resolve( selector(val) ).then((v) => {
                                resolve(v);
                            }).catch((err) => {
                                reject(err);
                            });
                        }
                        else {
                            resolve(val);
                        }
                    }
                    catch (e) {
                        reject(e);
                    }
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $setState = function(valueOrResult: any, selector?: (val: any) => any): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                try {
                    Promise.resolve( valueOrResult ).then((val) => {
                        try {
                            let finished = (v: any) => {
                                $state = v;

                                resolve(v);
                            };

                            if (selector) {
                                Promise.resolve( selector(val) ).then((v) => {
                                    finished(v);
                                }).catch((err) => {
                                    reject(err);
                                });
                            }
                            else {
                                finished(val);
                            }
                        }
                        catch (e) {
                            reject(e);
                        }
                    }).catch((err) => {
                        reject(err);
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        };
        const $sha1 = function(data: string | Buffer, asBuffer = false): string | Buffer {
            return sc_helpers.hash('sha1', data, asBuffer);
        };
        const $sha256 = function(data: string | Buffer, asBuffer = false): string | Buffer {
            return sc_helpers.hash('sha256', data, asBuffer);
        };
        const $showResultInTab = function(flag?: boolean, permanent = false): boolean {
            if (arguments.length > 0) {
                _showResultInTab = sc_helpers.toBooleanSafe(flag);
                
                if (sc_helpers.toBooleanSafe(permanent)) {
                    _permanentShowResultInTab = _showResultInTab;
                }
            }

            return _showResultInTab;
        };
        const $shuffle = function(valueOrResult: any): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                $unwrap(valueOrResult).then((val) => {
                    try {
                        let arr: any;
            
                        let getValue: (index: number) => any = (i) => arr[i];
                        let setValue: (index: number, v: any) => void = (i, v) => arr[i] = v;
                        let getLength: () => number = () => arr.length;

                        if (!sc_helpers.isNullOrUndefined(val)) {
                            if (Buffer.isBuffer(val)) {
                                arr = val;

                                getValue = (i) => val.readUInt8(i);
                                setValue = (i, v) => val.writeUInt8(v, i);
                            }
                            else if (Array.isArray(val)) {
                                arr = val;
                            }
                            else {
                                arr = sc_helpers.toStringSafe(val);

                                setValue = (i, v) => {
                                    v = sc_helpers.toStringSafe(v);

                                    arr = arr.substr(0, i) + 
                                          v + 
                                          arr.substr(i + v.length);
                                };
                            }
                        }

                        if (!sc_helpers.isNullOrUndefined(arr)) {
                            for (let i = 0; i < getLength(); i++) {
                                let newIndex = RandomInt(0, getLength() - 1);

                                let temp = getValue(i);
                                setValue(i, getValue(newIndex));
                                setValue(newIndex, temp);
                            }
                        }

                        resolve(arr);
                    }
                    catch (e) {
                        reject(e);
                    }
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $startApi = function(): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                try {
                    vscode.commands.executeCommand('extension.restApi.startHost').then((result) => {
                        resolve(result);
                    }, (err) => {
                        reject(err);
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        };
        const $startCronJobs = function(jobs: sc_contracts.CronJobNames): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                try {
                    vscode.commands.executeCommand('extension.cronJons.startJobsByName', jobs).then((result) => {
                        resolve(result);
                    }, (err) => {
                        reject(err);
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        };
        const $stopApi = function(): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                try {
                    vscode.commands.executeCommand('extension.restApi.stopHost').then((result) => {
                        resolve(result);
                    }, (err) => {
                        reject(err);
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        };
        const $stopCronJobs = function(jobs: sc_contracts.CronJobNames): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                try {
                    vscode.commands.executeCommand('extension.cronJons.stopJobsByName', jobs).then((result) => {
                        resolve(result);
                    }, (err) => {
                        reject(err);
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        };
        const $stopReceiveFrom = function(id: number): boolean {
            id = parseInt( sc_helpers.toStringSafe(id).trim() );
            
            let found = false;

            _udpServers.filter(u => u && u.id === id).forEach(udp => {
                _udpServerActions.push(() => {
                    _closeUDPSafe(udp.connection);

                     _udpServers = _udpServers.filter(other => other.id !== udp.id);
                });
            });

            _handleUDPServerActionsSafe();
            
            return found;
        };
        let $thisArgs: any;
        const $toHexView = function(val: any): string {
            return Hexy.hexy(val);
        };
        const $trim = function(val: any): string {
            return sc_helpers.toStringSafe(val).trim();
        };
        const $unlink = function(path: string): void {
            path = sc_helpers.toStringSafe(path);
            if (!Path.isAbsolute(path)) {
                path = Path.join(_currentDir, path);
            }

            let stats = FS.lstatSync(path);

            if (stats.isDirectory()) {
                FSExtra.removeSync(path);
            }
            else {
                FS.unlinkSync(path);
            }
        };
        const $upper = function(val: any, locale = false): string {
            val = sc_helpers.toStringSafe(val);

            return sc_helpers.toBooleanSafe(locale) ? val.toLocaleUpperCase()
                                                    : val.toUpperCase();
        };
        const $uuid = function(v4 = true): string {
            return sc_helpers.toBooleanSafe(v4) ? UUID.v4() : UUID.v1();
        };
        const $values = _values;
        const $warn = function(msg: string) {
            return vscode.window
                         .showWarningMessage( sc_helpers.toStringSafe(msg) );
        };
        const $workflow = function(...args: (Workflows.WorkflowAction | string)[]): Promise<any> {
            let wf = Workflows.create();

            if (args) {
                args.filter(a => !sc_helpers.isNullOrUndefined(a)).forEach((a) => {
                    wf.next((wfCtx) => {
                        return new Promise<any>((resolve, reject) => {
                            try {
                                let result: any;
                                if ('function' === typeof a) {
                                    result = a(wfCtx);
                                }
                                else {
                                    result = eval('$execute(a, wfCtx)');
                                }

                                Promise.resolve(result).then((r) => {
                                    wfCtx.result = r;

                                    resolve(r);
                                }).catch((err) => {
                                    reject(err);
                                });
                            }
                            catch (e) {
                                reject(e);
                            }
                        });
                    });
                });
            }

            return wf.start($state);
        };
        const $workspace = vscode.workspace.rootPath;
        const $writeFile = function(file: string, data: any): void {
            file = sc_helpers.toStringSafe(file);
            if (!Path.isAbsolute(file)) {
                file = Path.join(_currentDir, file);
            }

            FS.writeFileSync(file, data);
        };
        const $xmlDecode = function(str: string): string {
            str = sc_helpers.toStringSafe(str);

            return (new HtmlEntities.XmlEntities()).decode(str);
        };
        const $xmlEncode = function(str: string): string {
            str = sc_helpers.toStringSafe(str);

            return (new HtmlEntities.XmlEntities()).encode(str);
        };

        const $download = function(url: string, file?: string): Promise<Buffer> {
            return new Promise<Buffer>((resolve, reject) => {
                $GET(url).then((result) => {
                    try {
                        if (!sc_helpers.isEmptyString(file)) {
                            $noResultInfo(true);

                            $writeFile(file, result.body);   
                        }
                        
                        resolve(result.body);
                    }
                    catch (e) {
                        reject(e);
                    }
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $openInEditor = function(valueOrResult: any, selector?: (val: any) => any): Promise<any> {
            return new Promise<any>((resolve, reject) => {
                let openEditor = (result: any) => {
                    if (sc_helpers.isNullOrUndefined(result)) {
                        result = '';
                    }
                    else {
                        if (Buffer.isBuffer(result)) {
                            result = result.toString('utf8');
                        }
                        else {
                            result = sc_helpers.toStringSafe(result);
                        }
                    }

                    vscode.workspace.openTextDocument(null).then((doc) => {
                        vscode.window.showTextDocument(doc).then(() => {
                            try {
                                let visibleTextEditors = vscode.window.visibleTextEditors;

                                let editor: vscode.TextEditor;
                                for (let i = 0; i < visibleTextEditors.length; i++) {
                                    let e = visibleTextEditors[i];

                                    if (e.document === doc) {
                                        editor = e;
                                        break;
                                    }
                                }

                                if (editor) {
                                    sc_helpers.setContentOfTextEditor(editor, result).then(() => {
                                        $noResultInfo(true);

                                        resolve();
                                    }).catch((e) => {
                                        reject(e);
                                    });
                                }
                                else {
                                    reject(new Error('No matching text editor found!'));
                                }
                            }
                            catch (e) {
                                reject(e);
                            }
                        }, (err) => {
                            reject(err);
                        });
                    }, (err) => {
                        reject(err);
                    });
                };

                Promise.resolve(valueOrResult).then((result) => {
                    try {
                        if (selector) {
                            Promise.resolve( selector(result) ).then((r) => {
                                openEditor(r);
                            }).catch((err) => {
                                reject(err);
                            });
                        }
                        else {
                            openEditor(result);
                        }
                    }
                    catch (e) {
                        reject(e);
                    }
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const $openInTab = function(valueOrResult: any, selector?: (val: any) => any): Promise<any> {
            $showResultInTab(true);

            return new Promise<any>((resolve, reject) => {
                Promise.resolve(valueOrResult).then((result) => {
                    try {
                        if (selector) {
                            Promise.resolve( selector(result) ).then((r) => {
                                resolve(r);
                            }).catch((err) => {
                                reject(err);
                            });
                        }
                        else {
                            resolve(result);
                        }
                    }
                    catch (e) {
                        reject(e);
                    }
                }).catch((err) => {
                    reject(err);
                });
            });
        };

        const $eval = function(): any {
            return eval( sc_helpers.toStringSafe(arguments[0]) );
        };

        // execute expression ...
        $unwrap( eval(_expr), $maxDepth ).then((result) => {
            _completed(null, result);
        }).catch((err) => {
            _completed(err);
        });
    }
    catch (e) {
        _completed(e);
    }
}

function _fromMarkdown(markdown: any): string {
    markdown = sc_helpers.toStringSafe(markdown);

    return Marked(markdown, {
        gfm: true,
        tables: true,
        breaks: true,
    });
};

function _generateHelpHTML(): string {
    let markdown = '';

    markdown += "# Help (Quick execution)\n";
    markdown += "\n";

    markdown += "\n";

    markdown += "## Functions\n";
    markdown += "| Name | Description |\n";
    markdown += "| ---- | --------- |\n";
    markdown += "| `$(...results: any[]): Promise<any[]>` | Executes a list of actions and returns its results. |\n";
    markdown += "| `$addValue(valueOrResult: any): Promise<any>` | Adds a value or result to `$value`. |\n";
    markdown += "| `$appendFile(path: string, data: any): void` | Appends data to a file. |\n";
    markdown += "| `$asString(val: any): string` | Returns a value as string. |\n";
    markdown += "| `$baseDecode(valueOrResult: any): Promise<Buffer>` | Decodes a Base64 string. |\n";
    markdown += "| `$baseEncode(valueOrResult: any): Promise<string>` | Encodes a value to a Base64 string. |\n";
    markdown += "| `$clearHistory(clearGlobal?: boolean): void` | Clears the history. |\n";
    markdown += "| `$clearValues(): void` | Clears the list of values. |\n";
    markdown += "| `$clone(valueOrResult: any): Promise<any>` | Clones a value or result. |\n";
    markdown += "| `$cwd(newPath?: string, permanent?: boolean = false): string` | Gets or sets the current working directory for the execution. |\n";
    markdown += "| `$DELETE(url: string, headersOrFileWithHeaders?: any, body?: any): Promise<HttpResponse>` | Does a HTTP DELETE request. |\n";
    markdown += "| `$disableHexView(flag?: boolean, permanent?: boolean = false): boolean` | Gets or sets if 'hex view' for binary results should be disabled or not. |\n";
    markdown += "| `$download(url: string, targetFile?: string): Promise<Buffer>` | Downloads data from an URL. |\n";
    markdown += "| `$eval(code: string): any` | Executes code from execution / extension context. |\n";
    markdown += "| `$error(msg: string): vscode.Thenable<any>` | Shows an error popup. |\n";
    markdown += "| `$execute(scriptPath: string, ...args: any[]): any` | Executes a script ([module](https://mkloubert.github.io/vs-script-commands/interfaces/_quick_.scriptmodule.html)). |\n";
    markdown += "| `$executeCommand(command: string, ...args: any[]): vscode.Thenable<any>` | Executes a command. |\n";
    markdown += "| `$executeForState(result: any): Promise<any>` | Executes an action and writes it to the `$state` variable. |\n";
    markdown += "| `$exists(path: string): boolean` | Checks if a path exists. |\n";
    markdown += "| `$findFiles(globPattern: string, ignore?: string[]): string[]` | Finds files using [glob patterns](https://github.com/isaacs/node-glob). |\n";
    markdown += "| `$fromMarkdown(markdown: string): string` | Converts [Markdown](https://guides.github.com/features/mastering-markdown/) to HTML. |\n";
    markdown += "| `$GET(url: string, headersOrFileWithHeaders?: any, body?: any): Promise<HttpResponse>` | Does a HTTP GET request. |\n";
    markdown += "| `$getCronJobs(): Promise<CronJobInfo[]>` | Returns a list of available [cron jobs](https://github.com/mkloubert/vs-cron). |\n";
    markdown += "| `$guid(v4: boolean = true): string` | Alias for `$uuid`. |\n";
    markdown += "| `$gunzip(bufferOrBase64StringAsValueOrResult: any): Buffer` | UNcompresses data with GZIP. |\n";
    markdown += "| `$gzip(valueOrResult: any, base64: boolean = false): Promise<any>` | Compresses data with GZIP. |\n";
    markdown += "| `$hash(algorithm: string, data: any, asBuffer: boolean = false): string` | Hashes data. |\n";
    markdown += "| `$HEAD(url: string, headersOrFileWithHeaders?: any, body?: any): Promise<HttpResponse>` | Does a HTTP HEAD request. |\n";
    markdown += "| `$help(): vscode.Thenable<any>` | Shows this help document. |\n";
    markdown += "| `$history(selectEntry?: boolean = true): void` | Opens the list of expressions to execute and returns it. |\n";
    markdown += "| `$htmlDecode(str: string): string` | Decodes the HTML entities in a string. |\n";
    markdown += "| `$htmlEncode(str: string): string` | Encodes the HTML entities in a string. |\n";
    markdown += "| `$info(msg: string): vscode.Thenable<any>` | Shows an info popup. |\n";
    markdown += "| `$ip(v6: boolean = false, useHTTPs: boolean = false, timeout: number = 5000): Promise<string>` | Returns the public / Internet IP. |\n";
    markdown += "| `$log(msg: any): void` | Logs a message. |\n";
    markdown += "| `$lower(val: any, locale: boolean = false): string` | Converts the chars of the string representation of a value to lower case. |\n";
    markdown += "| `$lstat(path: string): fs.Stats` | Gets information about a path. |\n";
    markdown += "| `$max(...valuesOrResults: any[]): Promise<any>` | Returns the maximum value from a list of values. |\n";
    markdown += "| `$md5(data: any, asBuffer: boolean = false): string` | Hashes data by MD5. |\n";
    markdown += "| `$min(...valuesOrResults: any[]): Promise<any>` | Returns the minimum value from a list of values. |\n";
    markdown += "| `$mkdir(dir: string): void` | Creates a directory (with all its sub directories). |\n";
    markdown += "| `$noResultInfo(flag?: boolean1, permanent?: boolean = false): boolean` | Gets or sets if result should be displayed or not. |\n";
    markdown += "| `$now(): Moment.Moment` | Returns the current [time](https://momentjs.com/docs/). |\n";
    markdown += "| `$openHtml(htmlOrResult: any, tabTitle?: string): vscode.Thenable<any>` | Opens a HTML document in a new tab. |\n";
    markdown += "| `$openInEditor(valueOrResult: any, resultSelector?: Function): Promise<any>` | Opens a result or value in a new text editor by using an optional selector function for result to show. |\n";
    markdown += "| `$openInTab(valueOrResult: any, resultSelector?: Function): Promise<any>` | Opens a result or value in a new tab by using an optional selector function for result to show. |\n";
    markdown += "| `$OPTIONS(url: string, headersOrFileWithHeaders?: any, body?: any): Promise<HttpResponse>` | Does a HTTP OPTIONS request. |\n";
    markdown += "| `$password(size?: number = 20, chars?: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'): string` | Generates a [password](https://nodejs.org/api/crypto.html#crypto_crypto_randombytes_size_callback). |\n";
    markdown += "| `$PATCH(url: string, headersOrFileWithHeaders?: any, body?: any): Promise<HttpResponse>` | Does a HTTP PATCH request. |\n";
    markdown += "| `$POST(url: string, headersOrFileWithHeaders?: any, body?: any): Promise<HttpResponse>` | Does a HTTP POST request. |\n";
    markdown += "| `$push(valueOrResult: any, ignorePromise?: boolean = false): Promise<number>` | Adds a value (or result of a Promise) to `$values`. |\n";
    markdown += "| `$PUT(url: string, headersOrFileWithHeaders?: any, body?: any): Promise<HttpResponse>` | Does a HTTP PUT request. |\n";
    markdown += "| `$rand(minOrMax?: number = 0, max?: number = 2147483647): number` | Returns a random integer number. |\n";
    markdown += "| `$randomString(size?: number = 8, chars?: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'): string` | Generates a random string. |\n";
    markdown += "| `$readFile(path: string): Buffer` | Reads the data of a file. |\n";
    markdown += "| `$readJSON(file: string, encoding?: string = 'utf8'): any` | Reads a JSON file and returns the its object / value. |\n";
    markdown += "| `$readString(file: string, encoding?: string = 'utf8'): string` | Reads a file as string. |\n";
    markdown += "| `$receiveFrom(port: number, type?: string = 'udp4'): Promise<Buffer>` | Reads data via [UDP](https://en.wikipedia.org/wiki/User_Datagram_Protocol). |\n";
    markdown += "| `$receiveJSONFrom(port: number, type?: string = 'udp4'): Promise<any>` | Reads data as UTF-8 string via [UDP](https://en.wikipedia.org/wiki/User_Datagram_Protocol) ans parses it as JSON. |\n";
    markdown += "| `$removeFromHistory(index?: number, fromGlobal = false): void` | Removes an expression from history. |\n";
    markdown += "| `$REQUEST(method: string, url: string, headersOrFileWithHeaders?: any, body?: any): Promise<HttpResponse>` | Does a HTTP request. |\n";
    markdown += "| `$require(id: string): any` | Loads a module from execution / extension context. |\n";
    markdown += "| `$restartCronJobs(jobNames: string[]): Promise<any>` | (Re-)Starts a list of [cron jobs](https://github.com/mkloubert/vs-cron). |\n";
    markdown += "| `$saveJSON(path: string, val: any, encoding?: string = 'utf8'): void` | Saves a file as JSON to a file. |\n";
    markdown += "| `$saveToHistory(saveGlobal: boolean = false, description?: string): void` | Saves the current expression to history. |\n";
    markdown += "| `$select(valueOrResult: any, selector: Function): Promise<any>` | Projects a value to a new one by using a selector function. |\n";
    markdown += "| `$sendJSONTo(val: any, port: number, addr?: string = '127.0.0.1', type?: string = 'udp4'): Promise<any>` | Sends data as UTF-8 JSON string via [UDP](https://en.wikipedia.org/wiki/User_Datagram_Protocol). |\n";
    markdown += "| `$sendTo(data: any, port: number, addr?: string = '127.0.0.1', type?: string = 'udp4'): Promise<any>` | Sends data via [UDP](https://en.wikipedia.org/wiki/User_Datagram_Protocol). |\n";
    markdown += "| `$setState(valueOrResult: any, selector?: Function): Promise<any>): Promise<any>` | Sets the value of `$state` variable by using an optional value selector and returns the new value. |\n";
    markdown += "| `$sha1(data: any, asBuffer: boolean = false): string` | Hashes data by SHA-1. |\n";
    markdown += "| `$sha256(data: any, asBuffer: boolean = false): string` | Hashes data by SHA-256. |\n";
    markdown += "| `$showResultInTab(flag?: boolean, permanent?: boolean = false): boolean` | Gets or sets if result should be shown in a tab window or a popup. |\n";
    markdown += "| `$shuffle(valueOrResult: any): Promise<any>` | Shuffles data. |\n";
    markdown += "| `$startApi(): Promise<any>` | Starts an [API host](https://github.com/mkloubert/vs-rest-api). |\n";
    markdown += "| `$startCronJobs(jobNames: string[]): Promise<any>` | Starts a list of [cron jobs](https://github.com/mkloubert/vs-cron). |\n";
    markdown += "| `$stopApi(): Promise<any>` | Stops an [API host](https://github.com/mkloubert/vs-rest-api). |\n";
    markdown += "| `$stopCronJobs(jobNames: string[]): Promise<any>` | Stops a list of [cron jobs](https://github.com/mkloubert/vs-cron). |\n";
    markdown += "| `$stopReceiveFrom(id: number): boolean` | Stops an UDP connection by its ID. |\n";
    markdown += "| `$toHexView(val: any): string` | Converts a value, like a buffer or string, to 'hex view'. |\n";
    markdown += "| `$trim(val: any): string` | Removes the whitespaces from a value. |\n";
    markdown += "| `$unlink(path: string): boolean` | Removes a file or folder. |\n";
    markdown += "| `$unwrap(valueOrResult: any, maxDepth: number = 64): Promise<any>` | Unwraps a value or result. |\n";
    markdown += "| `$upper(val: any, locale: boolean = false): string` | Converts the chars of the string representation of a value to upper case. |\n";
    markdown += "| `$uuid(v4: boolean = true): string` | Generates a new unique ID. |\n";
    markdown += "| `$warn(msg: string): vscode.Thenable<any>` | Shows a warning popup. |\n";
    markdown += "| `$writeFile(path: string, data: any): void` | Writes data to a file. |\n";
    markdown += "| `$workflow(...actionsOrScriptPaths: any[]): Promise<any>` | Runs a [workflows](https://github.com/mkloubert/node-workflows). |\n";
    markdown += "| `$xmlDecode(str: string): string` | Decodes the XML entities in a string. |\n";
    markdown += "| `$xmlEncode(str: string): string` | Encodes the XML entities in a string. |\n";
    markdown += "\n";

    markdown += "\n";

    markdown += "## Variables\n";
    markdown += "| Name | Description |\n";
    markdown += "| ---- | --------- |\n";
    markdown += "| `$config: Configuration` | The current [settings](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.configuration.html) of that extension. |\n";
    markdown += "| `$doNotShowResult: Symbol` | A unique symbol that can be used as result and indicates NOT to show a result tab or popup. |\n";
    markdown += "| `$events: NodeJS.EventEmitter` | Stores the underlying [event emitter](https://nodejs.org/api/events.html). |\n";
    markdown += "| `$extension: vscode.ExtensionContext` | Stores the [context](https://code.visualstudio.com/docs/extensionAPI/vscode-api#_a-nameextensioncontextaspan-classcodeitem-id1016extensioncontextspan) of that extension. |\n";
    markdown += "| `$globalEvents: NodeJS.EventEmitter` | Stores the global [event emitter](https://nodejs.org/api/events.html) that also can interact with all other things of that extension, like [commands](https://github.com/mkloubert/vs-script-commands#commands-). |\n";
    markdown += "| `$globals: any` | Stores the global data from the [settings](https://github.com/mkloubert/vs-script-commands#settings-). |\n";
    markdown += "| `$lastResult: any` | Stores the last result. |\n";
    markdown += "| `$me: ScriptCommandController` | The [controller](https://mkloubert.github.io/vs-script-commands/classes/_controller_.scriptcommandcontroller.html) of that extension. |\n";
    markdown += "| `$nextValue: any` | The value for the next execution. The value will be resettet after each execution. |\n";
    markdown += "| `$output: vscode.OutputChannel` | Stores the [output channel](https://code.visualstudio.com/docs/extensionAPI/vscode-api#OutputChannel) of that extension. |\n";
    markdown += "| `$previousValue: any` | The value from the previous execution. |\n";
    markdown += "| `$state: any` | Stores a value that should be available for next executions. |\n";
    markdown += "| `$values: any[]` | The list of permanent stored values. |\n";
    markdown += "| `$workspace: string` | Stores the path of the current workspace. |\n";
    markdown += "\n";

    let html = '';

    html += sc_resources.HTML_HEADER;

    html += _fromMarkdown(markdown);

    html += sc_resources.HTML_FOOTER;

    return html;
}

function _generateHTMLForResult(expr: string, result: any, disableHexView: boolean): string {
    disableHexView = sc_helpers.toBooleanSafe(disableHexView);

    let htmlEncoder = new HtmlEntities.AllHtmlEntities();

    let html = '';

    html += sc_resources.HTML_HEADER;

    let codeBlockLang = 'json';

    let strResult: string;
    try {
        if (sc_helpers.isNullOrUndefined(result)) {
            strResult = '' + result;
        }
        else if (Buffer.isBuffer(result)) {
            if (disableHexView) {
                strResult = result.toString('hex');
            }
            else {
                strResult = Hexy.hexy(result);
            }
        }
        else {
            strResult = JSON.stringify(result, null, 4);   
        }
    }
    catch (e) {
        strResult = sc_helpers.toStringSafe(e);
    }

    strResult = sc_helpers.replaceAllStrings(strResult, "\t", "&nbsp;");
    strResult = sc_helpers.replaceAllStrings(strResult, "\r", "");

    let markdown = '';

    markdown += "# Quick execution\n";
    markdown += "\n";

    markdown += "\n";

    markdown += "## Expression\n";
    markdown += "\n";

    markdown += "```javascript\n";
    markdown += sc_helpers.toStringSafe(expr);
    markdown += "```\n";

    markdown += "\n";

    markdown += "## Result\n";
    markdown += "\n";

    markdown += "\n";
    
    markdown += "```" + codeBlockLang + "\n";
    markdown += strResult;
    markdown += "```\n";

    html += _fromMarkdown(markdown);

    html += sc_resources.HTML_FOOTER;

    return html;
}

function _handleUDPServerActionsSafe(): boolean {
    let actions = _udpServerActions;
    if (actions) {
        actions.filter(a => a).forEach(action => {
            try {
                action();
            }
            catch (e) { }
        });

        return true;
    }
    
    return false;
}

function _httpRequest(currentDir: string, method: string, url: string, headers: any, body: string | Buffer): Promise<HttpResponse> {
    method = sc_helpers.toStringSafe(method).toUpperCase().trim();

    currentDir = sc_helpers.toStringSafe(currentDir);
    if ('' === currentDir.trim()) {
        currentDir = './';
    }
    
    if (!Path.isAbsolute(currentDir)) {
        currentDir = Path.join(vscode.workspace.rootPath, currentDir);
    }

    currentDir = Path.resolve(currentDir);
    
    return new Promise<HttpResponse>((resolve, reject) => {
        try {
            let u = URL.parse(url);

            let request: HTTP.ClientRequest;
            let requestOpts: HTTP.RequestOptions;

            let requestCallback = (resp: HTTP.IncomingMessage) => {
                sc_helpers.readHttpBody(resp).then((body) => {
                    resolve({
                        body: body,
                        code: resp.statusCode,
                        headers: resp.headers || {},
                        message: resp.statusMessage,
                        object: resp,
                    });
                }).catch((err) => {
                    reject(err);
                });
            };

            let requestFactory: (options: HTTP.RequestOptions,
                                 cb?: (res: HTTP.IncomingMessage) => void) => HTTP.ClientRequest;

            requestOpts = {
                hostname: sc_helpers.normalizeString(u.hostname),
                method: method,
                protocol: sc_helpers.normalizeString(u.protocol),
                path: sc_helpers.toStringSafe(u.pathname),
                port: parseInt( sc_helpers.toStringSafe(u.port).trim() ),
            };

            if ('' === requestOpts.hostname) {
                requestOpts.hostname = 'localhost';
            }

            switch (requestOpts.protocol) {
                case 'https:':
                    requestFactory = HTTPs.request;
                    if (isNaN(requestOpts.port)) {
                        requestOpts.port = 443;
                    }
                    break;

                default:
                    requestFactory = HTTP.request;
                    if (isNaN(requestOpts.port)) {
                        requestOpts.port = 80;
                    }
                    break;
            }

            request = requestFactory(requestOpts, requestCallback);

            request.once('error', (err) => {
                reject(err);
            });

            if (!sc_helpers.isNullOrUndefined(body)) {
                if (!Buffer.isBuffer(body)) {
                    body = new Buffer(sc_helpers.toStringSafe(body), 'ascii');
                }

                if (body.length > 0) {
                    request.write(body);
                }
            }

            let startRequest = () => {
                try {
                    request.end();
                }
                catch (e) {
                    reject(e);
                }
            };

            let getHeaders = () => {
                if (sc_helpers.isNullOrUndefined(headers)) {
                    startRequest();  // no headers
                }
                else {
                    if ('object' === typeof headers) {
                        requestOpts.headers = headers;

                        startRequest();
                    }
                    else {
                        // from file

                        let headerFile = sc_helpers.toStringSafe(headers);
                        if (!Path.isAbsolute(headerFile)) {
                            headerFile = Path.join(currentDir, headerFile);
                        }

                        FS.readFile(headerFile, (err, data) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                try {
                                    if (data.length > 0) {
                                        requestOpts.headers = JSON.parse( data.toString('utf8') );
                                    }

                                    startRequest();
                                }
                                catch (e) {
                                    reject(e);
                                }
                            }
                        });
                    }
                }
            };

            getHeaders();
        }
        catch (e) {
            reject(e);
        }
    });
}

function _normalizeHistory(history: History): HistoryEntry[] {
    let result = sc_helpers.asArray(history)
                           .map(h => sc_helpers.cloneObject(h))
                           .filter(h => h)
                           .map(h => {
                                    h.expression = sc_helpers.toStringSafe(h.expression);

                                    h.description = sc_helpers.toStringSafe(h.description).trim();
                                    if ('' === h.description) {
                                        h.description = undefined;
                                    }

                                    return h;
                                })
                           .filter(h => '' !== h.expression.trim());

    result = sc_helpers.distinctArrayBy(result, h => h.expression);

    return result;
}

function _toHistoryEntryEx(entry: HistoryEntry,
                           index: number, source: string): HistoryEntryEx {
    let ewi = <HistoryEntryEx>entry;
    ewi.index = index;
    ewi.source = source;

    return ewi;
}


/**
 * Does a "quick execution".
 */
export function quickExecution() {
    const $me: sc_controller.ScriptCommandController = this;

    let _inputBoxValue = $me.context.workspaceState.get<string>(KEY_LAST_QUICK_COMMAND);
    if (sc_helpers.isEmptyString(_inputBoxValue)) {
        _inputBoxValue = '$help';
    }

    vscode.window.showInputBox({
        placeHolder: "Input '$help' to show help, e.g.",
        prompt: "The JavaScript expression to execute...",
        value: _inputBoxValue,
    }).then((_expr) => {
        _executeExpression.apply($me,
                                 [ _expr ]);
    }, (err) => {
        $me.log(`[ERROR] ScriptCommandController.quickExecution(): ${sc_helpers.toStringSafe(err)}`);
    });
}

/**
 * Resets all states and data.
 */
export function reset() {
    let me: sc_controller.ScriptCommandController = this;

    let cfg = me.config;

    let oldEventEmitter = _events;
    if (oldEventEmitter) {
        try {
            oldEventEmitter.removeAllListeners();
        }
        catch (e) {
            me.log(`[ERROR] quick.reset(): ${sc_helpers.toStringSafe(e)}`);
        }
    }

    // close old UDP server connections
    let oldUDPServers = _udpServers;
    if (oldUDPServers) {
        oldUDPServers.forEach(udp => {
            _udpServerActions.push(() => {
                _closeUDPSafe(udp.connection);
            });
        });
    }

    _handleUDPServerActionsSafe();

    _lastResult = undefined;
    _nextUDPServerID = -1;
    _permanentCurrentDirectory = undefined;
    _permanentDisableHexView = false;
    _permanentNoResultInfo = false;
    _prevVal = undefined;
    _state = undefined;
    _udpServers = [];
    _udpServerActions = [];
    _values = [];

    if (cfg.quick) {
        _permanentCurrentDirectory = cfg.quick.cwd;
        _permanentDisableHexView = sc_helpers.toBooleanSafe(cfg.quick.disableHexView);
        _permanentNoResultInfo = sc_helpers.toBooleanSafe(cfg.quick.noResultInfo);
        _permanentShowResultInTab = sc_helpers.toBooleanSafe(cfg.quick.showResultInTab);
        _state = sc_helpers.cloneObject(cfg.quick.state);
    }

    _permanentCurrentDirectory = sc_helpers.toStringSafe(_permanentCurrentDirectory);
    if (sc_helpers.isEmptyString(_permanentCurrentDirectory)) {
        _permanentCurrentDirectory = './';
    }
    if (!Path.isAbsolute(_permanentCurrentDirectory)) {
        _permanentCurrentDirectory = Path.join(vscode.workspace.rootPath, _permanentCurrentDirectory);
    }
    _permanentCurrentDirectory = Path.resolve(_permanentCurrentDirectory);

    _events = new Events.EventEmitter();
}
