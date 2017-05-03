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
import * as FS from 'fs';
import * as FSExtra from 'fs-extra';
const Hexy = require('hexy');
import * as HtmlEntities from 'html-entities';
import * as Glob from 'glob';
import * as Marked from 'marked';
import * as Moment from 'moment';
import * as Path from 'path';
const PublicIP = require('public-ip');
const RandomInt = require('random-int');
import * as sc_contracts from './contracts';
import * as sc_controller from './controller';
import * as sc_helpers from './helpers';
import * as sc_resources from './resources';
import * as UUID from 'uuid';
import * as vscode from 'vscode';
import * as Workflows from 'node-workflows';


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


let _permanentCurrentDirectory: string;
let _permanentDisableHexView: boolean;
let _permanentNoResultInfo: boolean;
let _permanentShowResultInTab: boolean;
let _state: any;

const KEY_HISTORY = 'vsscQuickCommandHistory';
const KEY_LAST_QUICK_COMMAND = 'vsscLastQuickCommand';

const MAX_RAND = 2147483647;
const MIN_RAND = -2147483648;

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

    let _disableHexView = _permanentDisableHexView;
    let _noResultInfo = _permanentNoResultInfo;
    let _saveToHistory = true;
    let _showResultInTab = _permanentShowResultInTab;
    let _saveLastExpression = true;
    const _completed = (err: any, result?: any) => {
        _state = $state;

        if (sc_helpers.toBooleanSafe(_saveLastExpression)) {
            $me.context.workspaceState.update(KEY_LAST_QUICK_COMMAND, _expr).then(() => {
            }, (err) => {
                $me.log(`[ERROR] ScriptCommandController.quickExecution(2): ${sc_helpers.toStringSafe(err)}`);
            });
        }

        let saveToGlobalHistory = false;
        let saveToHistory = false;
        if ($config.quick) {
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
                $me.log(`[ERROR] ScriptCommandController.quickExecution(6): ${sc_helpers.toStringSafe(err)}`);
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
                $me.log(`[ERROR] ScriptCommandController.quickExecution(5): ${sc_helpers.toStringSafe(e)}`);
            });
        }
        else {
            if (($doNotShowResult !== result) &&
                !_noResultInfo &&
                ('undefined' !== typeof result)) {
                // only if defined
                // and activated
                // -OR- $doNotShowResult

                if (_showResultInTab) {
                    // show in tab

                    $me.openHtml(_generateHTMLForResult(_expr, result, _disableHexView), '[vs-script-commands] Quick execution result').then(() => {
                    }, (err) => {
                        $me.log(`[ERROR] ScriptCommandController.quickExecution(4): ${sc_helpers.toStringSafe(err)}`);
                    });
                }
                else {
                    // show in popup

                    vscode.window.showInformationMessage('' + result).then(() => {
                    }, (err) => {
                        $me.log(`[ERROR] ScriptCommandController.quickExecution(3): ${sc_helpers.toStringSafe(err)}`);
                    });
                }
            }
        }
    };

    try {
        let $args: any[];
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

            return sc_helpers.toStringSafe(val);
        };

        let _currentDir = _permanentCurrentDirectory;

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
        const $globals = $me.getGlobals();
        const $guid = function(v4 = true) {
            return sc_helpers.toBooleanSafe(v4) ? UUID.v4() : UUID.v1();
        };
        const $hash = function(algo: string, data: string | Buffer, asBuffer = false): string | Buffer {
            return sc_helpers.hash(algo, data, asBuffer);
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
                        $me.log(`[ERROR] ScriptCommandController.quickExecution(8): ${sc_helpers.toStringSafe(err)}`);
                    });
                }
                catch (e) {
                    $me.log(`[ERROR] ScriptCommandController.quickExecution(7): ${sc_helpers.toStringSafe(e)}`);
                }
            }, (err) => {
                $me.log(`[ERROR] ScriptCommandController.quickExecution(6): ${sc_helpers.toStringSafe(err)}`);
            });
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
        let $level = 0;
        const $log = function(msg: any) {
            $me.log(msg);
        };
        const $lstat = function(path: string): FS.Stats {
            path = sc_helpers.toStringSafe(path);
            if (!Path.isAbsolute(path)) {
                path = Path.join(_currentDir, path);
            }

            return FS.lstatSync(path);
        };
        const $mkdir = function(dir: string): void {
            dir = sc_helpers.toStringSafe(dir);
            if (!Path.isAbsolute(dir)) {
                dir = Path.join(_currentDir, dir);
            }

            FSExtra.mkdirsSync(dir);
        };
        let $maxDepth = 64;
        const $md5 = function(data: string | Buffer, asBuffer = false): string | Buffer {
            return sc_helpers.hash('md5', data, asBuffer);
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
        const $openHtml = function(html: string, title?: string): Promise<any> {
            return $me.openHtml(html, title);
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
        const $setState = function(val: any): any {
            return $state = val;
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
        let $thisArgs: any;
        const $toHexView = function(val: any): string {
            return Hexy.hexy(val);
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
        const $uuid = function(v4 = true): string {
            return sc_helpers.toBooleanSafe(v4) ? UUID.v4() : UUID.v1();
        };
        const $warn = function(msg: string) {
            return vscode.window
                         .showWarningMessage( sc_helpers.toStringSafe(msg) );
        };
        const $workspace = vscode.workspace.rootPath;
        const $writeFile = function(file: string, data: any): void {
            file = sc_helpers.toStringSafe(file);
            if (!Path.isAbsolute(file)) {
                file = Path.join(_currentDir, file);
            }

            FS.writeFileSync(file, data);
        };

        const $eval = function(): any {
            return eval( sc_helpers.toStringSafe(arguments[0]) );
        };

        // execute expression ...
        Promise.resolve( eval(_expr) ).then((result: any) => {
            try {
                let executeWhile: (r: any, level: number) => void;
                executeWhile = (r, level) => {
                    level = parseInt(sc_helpers.toStringSafe(level).trim());

                    // check if maximum reached
                    let md = parseInt(sc_helpers.toStringSafe($maxDepth).trim());
                    if (!isNaN(md) && level >= md) {
                        _completed(null, r);  // yes
                        return;
                    }

                    if ('function' === typeof r) {
                        let rRes = r.apply($thisArgs,
                                           sc_helpers.toArray( $args ));

                        Promise.resolve( rRes ).then((result2) => {
                            try {
                                executeWhile(result2, level + 1);
                            }
                            catch (e) {
                                _completed(e);
                            }
                        }).catch((err) => {
                            _completed(err);
                        });
                    }
                    else {
                        _completed(null, r);
                    }
                };

                // execute while a result
                // is a function
                executeWhile(result, $level);
            }
            catch (e) {
                _completed(e);
            }
        }).catch((e) => {
            _completed(e);
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
    markdown += "| `$asString(val: any): string` | Returns a value as string. |\n";
    markdown += "| `$clearHistory(clearGlobal?: boolean): void` | Clears the history. |\n";
    markdown += "| `$cwd(newPath?: string, permanent?: boolean = false): string` | Gets or sets the current working directory for the execution. |\n";
    markdown += "| `$disableHexView(flag?: boolean, permanent?: boolean = false): boolean` | Gets or sets if 'hex view' for binary results should be disabled or not. |\n";
    markdown += "| `$eval(code: string): any` | Executes code from execution / extension context. |\n";
    markdown += "| `$error(msg: string): vscode.Thenable<any>` | Shows an error popup. |\n";
    markdown += "| `$execute(scriptPath: string, ...args: any[]): any` | Executes a script ([module](https://mkloubert.github.io/vs-script-commands/interfaces/_quick_.scriptmodule.html)). |\n";
    markdown += "| `$executeCommand(command: string, ...args: any[]): vscode.Thenable<any>` | Executes a command. |\n";
    markdown += "| `$exists(path: string): boolean` | Checks if a path exists. |\n";
    markdown += "| `$findFiles(globPattern: string, ignore?: string[]): string[]` | Finds files using [glob patterns](https://github.com/isaacs/node-glob). |\n";
    markdown += "| `$fromMarkdown(markdown: string): string` | Converts [Markdown](https://guides.github.com/features/mastering-markdown/) to HTML. |\n";
    markdown += "| `$getCronJobs(): Promise<CronJobInfo[]>` | Returns a list of available [cron jobs](https://github.com/mkloubert/vs-cron). |\n";
    markdown += "| `$guid(v4: boolean = true): string` | Alias for `$uuid`. |\n";
    markdown += "| `$hash(algorithm: string, data: any, asBuffer: boolean = false): string` | Hashes data. |\n";
    markdown += "| `$help(): vscode.Thenable<any>` | Shows this help document. |\n";
    markdown += "| `$history(selectEntry?: boolean = true): void` | Opens the list of expressions to execute and returns it. |\n";
    markdown += "| `$htmlEncode(str: string): string` | Encodes the HTML entities in a string. |\n";
    markdown += "| `$info(msg: string): vscode.Thenable<any>` | Shows an info popup. |\n";
    markdown += "| `$ip(v6: boolean = false, useHTTPs: boolean = false, timeout: number = 5000): Promise<string>` | Returns the public / Internet IP. |\n";
    markdown += "| `$log(msg: any): void` | Logs a message. |\n";
    markdown += "| `$lstat(path: string): fs.Stats` | Gets information about a path. |\n";
    markdown += "| `$md5(data: any, asBuffer: boolean = false): string` | Hashes data by MD5. |\n";
    markdown += "| `$mkdir(dir: string): void` | Creates a directory (with all its sub directories). |\n";
    markdown += "| `$noResultInfo(flag?: boolean, permanent?: boolean = false): boolean` | Gets or sets if result should be displayed or not. |\n";
    markdown += "| `$now(): Moment.Moment` | Returns the current [time](https://momentjs.com/docs/). |\n";
    markdown += "| `$openHtml(html: string, tabTitle?: string): vscode.Thenable<any>` | Opens a HTML document in a new tab. |\n";
    markdown += "| `$password(size?: number = 20, chars?: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'): string` | Generates a [password](https://nodejs.org/api/crypto.html#crypto_crypto_randombytes_size_callback). |\n";
    markdown += "| `$rand(minOrMax?: number = 0, max?: number = 2147483647): number` | Returns a random integer number. |\n";
    markdown += "| `$randomString(size?: number = 8, chars?: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'): string` | Generates a random string. |\n";
    markdown += "| `$readFile(path: string): Buffer` | Reads the data of a file. |\n";
    markdown += "| `$readJSON(file: string, encoding?: string = 'utf8'): any` | Reads a JSON file and returns the its object / value. |\n";
    markdown += "| `$readString(file: string, encoding?: string = 'utf8'): string` | Reads a file as string. |\n";
    markdown += "| `$removeFromHistory(index?: number, fromGlobal = false): void` | Removes an expression from history. |\n";
    markdown += "| `$require(id: string): any` | Loads a module from execution / extension context. |\n";
    markdown += "| `$restartCronJobs(jobNames: string[]): Promise<any>` | (Re-)Starts a list of [cron jobs](https://github.com/mkloubert/vs-cron). |\n";
    markdown += "| `$saveToHistory(saveGlobal: boolean = false, description?: string): void` | Saves the current expression to history. |\n";
    markdown += "| `$setState(newValue: any): any` | Sets the value of `$state` variable and returns the new value. |\n";
    markdown += "| `$sha1(data: any, asBuffer: boolean = false): string` | Hashes data by SHA-1. |\n";
    markdown += "| `$sha256(data: any, asBuffer: boolean = false): string` | Hashes data by SHA-256. |\n";
    markdown += "| `$showResultInTab(flag?: boolean, permanent?: boolean = false): boolean` | Gets or sets if result should be shown in a tab window or a popup. |\n";
    markdown += "| `$startApi(): Promise<any>` | Starts an [API host](https://github.com/mkloubert/vs-rest-api). |\n";
    markdown += "| `$startCronJobs(jobNames: string[]): Promise<any>` | Starts a list of [cron jobs](https://github.com/mkloubert/vs-cron). |\n";
    markdown += "| `$stopApi(): Promise<any>` | Stops an [API host](https://github.com/mkloubert/vs-rest-api). |\n";
    markdown += "| `$stopCronJobs(jobNames: string[]): Promise<any>` | Stops a list of [cron jobs](https://github.com/mkloubert/vs-cron). |\n";
    markdown += "| `$toHexView(val: any): string` | Converts a value, like a buffer or string, to 'hex view'. |\n";
    markdown += "| `$unlink(path: string): boolean` | Removes a file or folder. |\n";
    markdown += "| `$uuid(v4: boolean = true): string` | Generates a new unique ID. |\n";
    markdown += "| `$warn(msg: string): vscode.Thenable<any>` | Shows a warning popup. |\n";
    markdown += "| `$writeFile(path: string, data: any): void` | Writes data to a file. |\n";
    markdown += "\n";

    markdown += "\n";

    markdown += "## Variables\n";
    markdown += "| Name | Description |\n";
    markdown += "| ---- | --------- |\n";
    markdown += "| `$config: Configuration` | The current [settings](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.configuration.html) of that extension. |\n";
    markdown += "| `$doNotShowResult: Symbol` | A unique symbol that can be used as result and indicates NOT to show a result tab or popup. |\n";
    markdown += "| `$extension: vscode.ExtensionContext` | Stores the [context](https://code.visualstudio.com/docs/extensionAPI/vscode-api#_a-nameextensioncontextaspan-classcodeitem-id1016extensioncontextspan) of that extension. |\n";
    markdown += "| `$globals: any` | Stores the global data from the [settings](https://github.com/mkloubert/vs-script-commands#settings-). |\n";
    markdown += "| `$me: ScriptCommandController` | The [controller](https://mkloubert.github.io/vs-script-commands/classes/_controller_.scriptcommandcontroller.html) of that extension. |\n";
    markdown += "| `$output: vscode.OutputChannel` | Stores the [output channel](https://code.visualstudio.com/docs/extensionAPI/vscode-api#OutputChannel) of that extension. |\n";
    markdown += "| `$state: any` | Stores a value that should be available for next executions. |\n";
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
        $me.log(`[ERROR] ScriptCommandController.quickExecution(1): ${sc_helpers.toStringSafe(err)}`);
    });
}

/**
 * Resets all states and data.
 */
export function reset() {
    let me: sc_controller.ScriptCommandController = this;

    let cfg = me.config;

    _permanentCurrentDirectory = undefined;
    _permanentDisableHexView = false;
    _permanentNoResultInfo = false;
    _state = undefined;

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
}
