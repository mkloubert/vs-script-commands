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

import * as FS from 'fs';
import * as FSExtra from 'fs-extra';
import * as HtmlEntities from 'html-entities';
import * as Marked from 'marked';
import * as Moment from 'moment';
import * as Path from 'path';
import * as sc_contracts from './contracts';
import * as sc_controller from './controller';
import * as sc_helpers from './helpers';
import * as vscode from 'vscode';


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
let _permanentNoResultInfo: boolean;
let _permanentShowResultInTab: boolean;
let _state: any;

const HTML_FOOTER = `

    <div id="vsscriptcommands-footer">
        <p class="vsscriptcommands-generated-by">Generated by <a href="https://github.com/mkloubert/vs-script-commands" target="_blank">vs-script-commands</a></p>

        <p class="vsscriptcommands-donate-btns">
            <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=UHVN4LRJTEXQS" title="Donate via PayPal" target="_blank">
                <img src="https://img.shields.io/badge/Donate-PayPal-green.svg">
            </a>

            <a href="https://flattr.com/submit/auto?fid=o62pkd&url=https%3A%2F%2Fgithub.com%2Fmkloubert%2Fvs-script-commands" title="Donate via Flattr" target="_blank">
                <img src="https://api.flattr.com/button/flattr-badge-large.png">
            </a>
        </p>
    </div>
  </body>
</html>`;

const HTML_HEADER = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>[vs-script-commands] Quick execution help</title>

    <style type="text/css">

body {
    width: 100%;
}

a {
    color: inherit;
    font-weight: bold;
    text-decoration: none;
}

a:hover {
    color: white;
    text-decoration: underline;
}

h1, h2 {
    padding-bottom: 0.3em;
    border-bottom: 1px solid #333;
}

h1, h2, h3, h4, h5, h6 {
    margin-top: 24px;
    margin-bottom: 16px;
}

table {
    border-spacing: 0;
    border-collapse: collapse;
    margin-top: 0;
    margin-bottom: 16px;
    margin-right: 8px;
}

table td, table th {
    padding: 6px 13px;
    border: 1px solid #666;
}

table th {
    background-color: white;
    color: black;
    font-weight: bold;
}

table tr:nth-child(2n) {
    background-color: #333;
}

pre, p {
    margin: 8px 8px 8px 0px;
}

ul {
    display: block;
    list-style-type: disc;
    -webkit-margin-before: 1em;
    -webkit-margin-after: 1em;
    -webkit-margin-start: 0px;
    -webkit-margin-end: 0px;
    -webkit-padding-start: 40px;
}

li {
    display: list-item;
    text-align: -webkit-match-parent;
}

#vsscriptcommands-footer {
    margin-top: 32px;
}

#vsscriptcommands-footer p {
    clear: both !important;
    display: block !important;
    float: right;
    margin-bottom: 8px;
}

#vsscriptcommands-footer .vsscriptcommands-donate-btns img {
    border: 0px none transparent;
    height: 20px;
    margin-left: 8px;
    text-decoration: none;
}

#vsscriptcommands-footer .vsscriptcommands-donate-btns a {
    text-decoration: none;
}

    </style>
  </head>

  <body>

`;

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
    markdown += "| `$asString(val: any): string` | Returns a value as string. |\n";
    markdown += "| `$cwd(newPath?: string, permanent?: boolean = false): string` | Gets or sets the current working directory for the execution. |\n";
    markdown += "| `$eval(code: string): any` | Executes code from execution / extension context. |\n";
    markdown += "| `$error(msg: string): vscode.Thenable<any>` | Shows an error popup. |\n";
    markdown += "| `$execute(scriptPath: string, ...args: any[]): any` | Executes a script ([module](https://mkloubert.github.io/vs-script-commands/interfaces/_quick_.scriptmodule.html)). |\n";
    markdown += "| `$executeCommand(command: string, ...args: any[]): vscode.Thenable<any>` | Executes a command. |\n";
    markdown += "| `$exists(path: string): boolean` | Checks if a path exists. |\n";
    markdown += "| `$fromMarkdown(markdown: string): string` | Converts [Markdown](https://guides.github.com/features/mastering-markdown/) to HTML. |\n";
    markdown += "| `$help(): vscode.Thenable<any>` | Shows this help document. |\n";
    markdown += "| `$htmlEncode(str: string): string` | Encodes the HTML entities in a string. |\n";
    markdown += "| `$info(msg: string): vscode.Thenable<any>` | Shows an info popup. |\n";
    markdown += "| `$log(msg: any): void` | Logs a message. |\n";
    markdown += "| `$lstat(path: string): fs.Stats` | Gets information about a path. |\n";
    markdown += "| `$mkdir(dir: string): void` | Creates a directory (with all its sub directories). |\n";
    markdown += "| `$noResultInfo(flag?: boolean, permanent?: boolean = false): boolean` | Gets or sets if result should be displayed or not. |\n";
    markdown += "| `$now(): Moment.Moment` | Returns the current [time](https://momentjs.com/docs/). |\n";
    markdown += "| `$openHtml(html: string, tabTitle?: string): vscode.Thenable<any>` | Opens a HTML document in a new tab. |\n";
    markdown += "| `$readFile(path: string): Buffer` | Reads the data of a file. |\n";
    markdown += "| `$require(id: string): any` | Loads a module from execution / extension context. |\n";
    markdown += "| `$setState(newValue: any): any` | Sets the value of `$state` variable and returns the new value. |\n";
    markdown += "| `$showResultInTab(flag?: boolean, permanent?: boolean = false): boolean` | Gets or sets if result should be shown in a tab window or a popup. |\n";
    markdown += "| `$unlink(path: string): boolean` | Removes a file or folder. |\n";
    markdown += "| `$warn(msg: string): vscode.Thenable<any>` | Shows a warning popup. |\n";
    markdown += "| `$writeFile(path: string, data: any): void` | Writes data to a file. |\n";
    markdown += "\n";

    markdown += "\n";

    markdown += "## Variables\n";
    markdown += "| Name | Description |\n";
    markdown += "| ---- | --------- |\n";
    markdown += "| `$extension: vscode.ExtensionContext` | Stores the [context](https://code.visualstudio.com/docs/extensionAPI/vscode-api#_a-nameextensioncontextaspan-classcodeitem-id1016extensioncontextspan) of that extension. |\n";
    markdown += "| `$globals: any` | Stores the global data from the settings. |\n";
    markdown += "| `$output: vscode.OutputChannel` | Stores the [output channel](https://code.visualstudio.com/docs/extensionAPI/vscode-api#OutputChannel) of that extension. |\n";
    markdown += "| `$state: any` | Stores a value that should be available for next executions. |\n";
    markdown += "| `$workspace: string` | Stores the path of the current workspace. |\n";
    markdown += "\n";

    let html = '';

    html += HTML_HEADER;

    html += _fromMarkdown(markdown);

    html += HTML_FOOTER;

    return html;
}

function _generateHTMLForResult(expr: string, result: any): string {
    let htmlEncoder = new HtmlEntities.AllHtmlEntities();

    let html = '';

    html += HTML_HEADER;

    let codeBlockLang = 'json';

    let strResult: string;
    try {
        if (sc_helpers.isNullOrUndefined(result)) {
            strResult = '' + result;
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

    html += HTML_FOOTER;

    return html;
}

/**
 * Does a "quick execution".
 */
export function quickExecution() {
    let $me: sc_controller.ScriptCommandController = this;
    let $state = _state;

    let _inputBoxValue = $me.context.workspaceState.get<string>('vsscLastQuickCommand');
    if (sc_helpers.isEmptyString(_inputBoxValue)) {
        _inputBoxValue = '$help';
    }

    vscode.window.showInputBox({
        placeHolder: "Input '$help' to show help, e.g.",
        prompt: "The JavaScript expression to execute...",
        value: _inputBoxValue,
    }).then((_expr) => {
        let _noResultInfo = _permanentNoResultInfo;
        let _showResultInTab = _permanentShowResultInTab;
        let _completed = (err: any, result?: any) => {
            _state = $state;

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
                if (!_noResultInfo && 'undefined' !== typeof result) {
                    // only if defined
                    // and activated

                    if (_showResultInTab) {
                        // show in tab

                        $me.openHtml(_generateHTMLForResult(_expr, result), '[vs-script-commands] Quick execution result').then(() => {
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

        if (sc_helpers.isEmptyString(_expr)) {
            return;
        }

        try {
            $me.context.workspaceState.update('vsscLastQuickCommand', _expr).then(() => {
            }, (err) => {
                $me.log(`[ERROR] ScriptCommandController.quickExecution(2): ${sc_helpers.toStringSafe(err)}`);
            });

            let $args: any[];
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

            const $error = function(msg: string) {
                return vscode.window
                             .showErrorMessage( sc_helpers.toStringSafe(msg) );
            };
            const $execute = function(scriptPath: string) {
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
            const $executeCommand = function(id: string, ...args: any[]) {
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
            const $fromMarkdown = function(markdown: string): string {
                return _fromMarkdown(markdown);
            };
            const $globals = $me.getGlobals();
            const $help = function() {
                return $me.openHtml(_generateHelpHTML(),
                                    '[vs-script-commands] Quick execution');
            };
            const $htmlEncode = function(str: string) {
                str = sc_helpers.toStringSafe(str);

                return (new HtmlEntities.AllHtmlEntities()).encode(str);
            };
            const $info = function(msg: string) {
                return vscode.window
                             .showInformationMessage( sc_helpers.toStringSafe(msg) );
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
            const $mkdir = function(dir: string) {
                dir = sc_helpers.toStringSafe(dir);
                if (!Path.isAbsolute(dir)) {
                    dir = Path.join(_currentDir, dir);
                }

                FSExtra.mkdirsSync(dir);
            };
            let $maxDepth = 64;
            const $noResultInfo = function(flag?: boolean, permanent = false): boolean {
                if (arguments.length > 0) {
                    _noResultInfo = sc_helpers.toBooleanSafe(flag);
                    
                    if (sc_helpers.toBooleanSafe(permanent)) {
                        _permanentNoResultInfo = _noResultInfo;
                    }
                }

                return _noResultInfo;
            };
            const $now = function() {
                return Moment();
            };
            const $openHtml = function(html: string, title?: string) {
                return $me.openHtml(html, title);
            };
            const $output = $me.outputChannel;
            const $readFile = function(file: string) {
                file = sc_helpers.toStringSafe(file);
                if (!Path.isAbsolute(file)) {
                    file = Path.join(_currentDir, file);
                }

                return FS.readFileSync(file);
            };
            const $require = function(id: string): any {
                return require(sc_helpers.toStringSafe(id));
            };
            const $setState = function(val: any): any {
                return $state = val;
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
            let $thisArgs: any;
            const $unlink = function(path: string) {
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
            const $warn = function(msg: string) {
                return vscode.window
                             .showWarningMessage( sc_helpers.toStringSafe(msg) );
            };
            const $workspace = vscode.workspace.rootPath;
            const $writeFile = function(file: string, data: any) {
                file = sc_helpers.toStringSafe(file);
                if (!Path.isAbsolute(file)) {
                    file = Path.join(_currentDir, file);
                }

                return FS.writeFileSync(file, data);
            };

            const $eval = function() {
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
    _permanentNoResultInfo = false;
    _state = undefined;

    if (cfg.quick) {
        _permanentCurrentDirectory = cfg.quick.cwd;
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
