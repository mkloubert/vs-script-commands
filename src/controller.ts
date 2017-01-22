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

import * as Events from 'events';
import * as Moment from 'moment';
import * as Path from 'path';
import * as sc_contracts from './contracts';
import * as sc_helpers from './helpers';
import * as vscode from 'vscode';


/**
 * A script command entry.
 */
export interface ScriptCommandEntry {
    button?: vscode.StatusBarItem;
    /**
     * The command object.
     */
    command: vscode.Disposable;
    /**
     * The underlying script command object.
     */
    object: sc_contracts.ScriptCommand;
}

/**
 * A command entry.
 */
export interface CommandEntry {
    /**
     * Defines if the GUI asks for arguments or not.
     */
    askForArgument: boolean;
    /**
     * The scription.
     */
    description: string;
    /**
     * The ID of the command.
     */
    id: string;
    /**
     * The label.
     */
    label: string;
}

/**
 * A command entry quick pick item.
 */
export interface CommandEntryQuickPickItem extends sc_contracts.ScriptCommandQuickPickItem {
    /**
     * The underlying entry.
     */
    entry: CommandEntry;
}

/**
 * The controller class for that extension.
 */
export class ScriptCommandController extends Events.EventEmitter implements vscode.Disposable {
    /**
     * List of custom commands.
     */
    protected readonly _COMMANDS: ScriptCommandEntry[] = [];
    /**
     * Stores the current configuration.
     */
    protected _config: sc_contracts.Configuration;
    /**
     * Stores the extension context.
     */
    protected readonly _CONTEXT: vscode.ExtensionContext;
    /**
     * The global file system watcher.
     */
    protected _fileSystemWatcher: vscode.FileSystemWatcher;
    /**
     * Stores the global output channel.
     */
    protected readonly _OUTPUT_CHANNEL: vscode.OutputChannel;
    /**
     * Stores the package file of that extension.
     */
    protected _PACKAGE_FILE: sc_contracts.PackageFile;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {vscode.ExtensionContext} context The underlying extension context.
     * @param {vscode.OutputChannel} outputChannel The global output channel to use.
     * @param {sc_contracts.PackageFile} pkgFile The package file of that extension.
     */
    constructor(context: vscode.ExtensionContext,
                outputChannel: vscode.OutputChannel,
                pkgFile: sc_contracts.PackageFile) {
        super();

        this._CONTEXT = context;
        this._OUTPUT_CHANNEL = outputChannel;
        this._PACKAGE_FILE = pkgFile;
    }

    /**
     * Gets the current configuration.
     */
    public get config(): sc_contracts.Configuration {
        return this._config || {};
    }

    /** @inheritdoc */
    public dispose() {
        try {
            this.removeAllListeners();
        }
        catch (e) {
            console.log(`[ERROR] ScriptCommandController.dispose(): ${e}`);
        }
    }

    /**
     * Executes a command defined by this extension.
     */
    public executeCommand() {
        let entries: CommandEntry[] = this.getCommands().map(x => {
            let e: CommandEntry = {
                askForArgument: sc_helpers.toBooleanSafe(x.askForArgument),
                id: x.id,
                label: x.id,
                description: '',
            };

            if (!sc_helpers.isEmptyString(x.displayName)) {
                e.label = sc_helpers.toStringSafe(x.displayName).trim();
            }

            if (!sc_helpers.isEmptyString(x.description)) {
                e.description = sc_helpers.toStringSafe(x.description).trim();
            }

            return e;
        });

        this.selectAndExecuteCommand(entries);
    }

    /**
     * Executes script commands.
     * 
     * @param {sc_contracts.ScriptCommand[]} commandsToExecute The commands to execute.
     * @param {sc_contracts.ScriptCommandArgumentFactory} argsFactory The function that returns additional arguments for the execution of a command.
     * 
     * @return {Promise<any>} The promise.
     */
    protected executeScriptCommands(commandsToExecute: sc_contracts.ScriptCommand[],
                                    argsFactory?: sc_contracts.ScriptCommandArgumentFactory): Promise<any> {
        let me = this;
        
        commandsToExecute = sc_helpers.asArray(commandsToExecute)
                                      .filter(x => x)
                                      .map(x => x);

        return new Promise<any>((resolve, reject) =>  {
            let completed = (err?: any) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            };

            try {
                let invokeNextCommand: () => void;
                invokeNextCommand = () => {
                    if (commandsToExecute.length < 1) {
                        completed();
                        return;
                    }

                    let c = commandsToExecute.shift();
                    let async = sc_helpers.toBooleanSafe(c.async, true);
                    let continueOnError = sc_helpers.toBooleanSafe(c.async, true);

                    try {
                        let execArgs = [ c.id ];
                        if (argsFactory) {
                            let additionalArgs = argsFactory(c) || [];

                            execArgs = execArgs.concat(additionalArgs);
                        }

                        vscode.commands.executeCommand.apply(null, execArgs).then((result) => {
                            let exitCode = parseInt(sc_helpers.toStringSafe(result).trim());
                            if (!isNaN(exitCode)) {
                                console.log(`[vs-script-commands] '${c.id}' returned with exit code ${exitCode}`);
                            }

                            if (!async) {
                                invokeNextCommand();
                            }
                        }, (err) => {
                            me.log(`[ERROR] ScriptCommandController.executeScriptCommands(2)(${c.id}): ${sc_helpers.toStringSafe(err)}`);

                            if (continueOnError) {
                                if (!async) {
                                    invokeNextCommand();
                                }
                            }
                            else {
                                completed(err);
                            }
                        });

                        if (async) {
                            invokeNextCommand();
                        }
                    }
                    catch (e) {
                        me.log(`[ERROR] ScriptCommandController.executeScriptCommands(1)(${c.id}): ${sc_helpers.toStringSafe(e)}`);

                        if (continueOnError) {
                            invokeNextCommand();
                        }
                        else {
                            completed(e);
                        }
                    }
                };

                invokeNextCommand();
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /**
     * Executes another command of Visual Studio Code.
     */
    public executeVSCommand() {
        let me = this;
        let cfg = me.config;

        let filterInternal = !sc_helpers.toBooleanSafe(cfg.showInternalVSCommands); 

        vscode.commands.getCommands(filterInternal).then((commands) => {
            let entries = commands.map(x => {
                let e: CommandEntry = {
                    askForArgument: false,
                    id: x,
                    label: x,
                    description: '(VSCode command)',
                };

                return e;
            });

            entries.sort((x, y) => {
                return sc_helpers.compareValues(sc_helpers.toStringSafe(x.id).toLowerCase().trim(),
                                                sc_helpers.toStringSafe(x.id).toLowerCase().trim());
            });

            this.selectAndExecuteCommand(entries);
        }, (err) => {
            me.log(`[ERROR] ScriptCommandController.executeVSCommand(1): ${sc_helpers.toStringSafe(err)}`);
        });
    }

    /**
     * Returns a sorted list of the commands defined in the settings.
     * 
     * @returns {sc_contracts.ScriptCommand[]} The commands.
     */
    public getCommands(): sc_contracts.ScriptCommand[] {
        let me = this;
        let cfg = me.config;

        let commands: sc_contracts.ScriptCommand[];
        if (cfg.commands) {
            commands = sc_helpers.asArray(cfg.commands);
        }

        return sc_helpers.sortCommands(commands);
    }

    /**
     * Returns the global variables defined in settings.
     * 
     * @return {sc_contracts.GlobalVariables} The globals.
     */
    public getGlobals(): sc_contracts.GlobalVariables {
        let result: sc_contracts.GlobalVariables = {};
        
        let cfgGlobals = this.config.globals;
        if (cfgGlobals) {
            result = sc_helpers.cloneObject(cfgGlobals);
        }

        return result;
    }

    /**
     * Loads a message.
     * 
     * @param {any} msg The message to log.
     * 
     * @chainable
     */
    public log(msg: any): ScriptCommandController {
        let now = Moment();

        msg = sc_helpers.toStringSafe(msg);
        this.outputChannel
            .appendLine(`[${now.format('YYYY-MM-DD HH:mm:ss')}] ${msg}`);

        return this;
    }

    /**
     * Event after the extension has been activated.
     */
    public onActivated() {
        this.reloadConfiguration();

        this.setupFileSystemWatcher();
    }

    /**
     * Event when deactivating the extension.
     */
    public onDeactivate() {
        let me = this;

        // close commands
        let commandsToExecute = me.getCommands().filter(x => {
            return sc_helpers.toBooleanSafe(x.onClose);
        });
        me.executeScriptCommands(commandsToExecute).then(() => {
            //TODO
        }).catch((err) => {
            // TODO
        });
    }

    /**
     * Event after configuration changed.
     */
    public onDidChangeConfiguration() {
        this.reloadConfiguration();
    }

    /**
     * Event after a document has closed.
     * 
     * @param {vscode.TextDocument} doc The document.
     */
    public onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent) {
        if (!e) {
            return;
        }

        let me = this;

        try {
            let uri = vscode.Uri.file(e.document.fileName);

            me.onFileChange(uri, sc_contracts.FileChangeType.EditorChanged, (sc) => {
                let ctx: sc_contracts.ScriptCommandEditorChangeContext = {
                    changes: e.contentChanges,
                    document: e.document,
                };

                return [ ctx ];
            });
        }
        catch (e) {
            me.log(`[ERROR] ScriptCommandController.onDidCloseTextDocument(1): ${sc_helpers.toStringSafe(e)}`);
        }
    }

    /**
     * Event after a document has closed.
     * 
     * @param {vscode.TextDocument} doc The document.
     */
    public onDidCloseTextDocument(doc: vscode.TextDocument) {
        if (!doc) {
            return;
        }

        let me = this;

        try {
            let uri = vscode.Uri.file(doc.fileName);

            me.onFileChange(uri, sc_contracts.FileChangeType.Closed);
        }
        catch (e) {
            me.log(`[ERROR] ScriptCommandController.onDidCloseTextDocument(1): ${sc_helpers.toStringSafe(e)}`);
        }
    }

    /**
     * Event after a document has been opened.
     * 
     * @param {vscode.TextDocument} doc The document.
     */
    public onDidOpenTextDocument(doc: vscode.TextDocument) {
        if (!doc) {
            return;
        }

        let me = this;

        try {
            let uri = vscode.Uri.file(doc.fileName);

            me.onFileChange(uri, sc_contracts.FileChangeType.Opened);
        }
        catch (e) {
            me.log(`[ERROR] ScriptCommandController.onDidOpenTextDocument(1): ${sc_helpers.toStringSafe(e)}`);
        }
    }

    /**
     * Event after a document has been saved.
     * 
     * @param {vscode.TextDocument} doc The document.
     */
    public onDidSaveTextDocument(doc: vscode.TextDocument) {
        if (!doc) {
            return;
        }

        let me = this;

        try {
            let uri = vscode.Uri.file(doc.fileName);

            me.onFileChange(uri, sc_contracts.FileChangeType.Saved);
        }
        catch (e) {
            me.log(`[ERROR] ScriptCommandController.onDidSaveTextDocument(1): ${sc_helpers.toStringSafe(e)}`);
        }
    }

    /**
     * Is invoked on a file / directory change.
     * 
     * @param {vscode.Uri} e The URI of the item.
     * @param {sc_contracts.FileChangeType} type The type of change.
     * @param {sc_contracts.ScriptCommandArgumentFactory} [argsFactory] Function that returns additional arguments for the execution.
     */
    protected onFileChange(e: vscode.Uri, type: sc_contracts.FileChangeType,
                           argsFactory?: sc_contracts.ScriptCommandArgumentFactory) {
        let me = this;

        let filePath = Path.resolve(e.fsPath);

        let commandsToExecute = me.getCommands().filter(c => {
            let doesMatch = false;

            switch (type) {
                case sc_contracts.FileChangeType.Changed:
                    doesMatch = sc_helpers.toBooleanSafe(c.onFileChanged);
                    break;

                case sc_contracts.FileChangeType.Deleted:
                    doesMatch = sc_helpers.toBooleanSafe(c.onFileDeleted);
                    break;

                case sc_contracts.FileChangeType.New:
                    doesMatch = sc_helpers.toBooleanSafe(c.onNewFile);
                    break;

                case sc_contracts.FileChangeType.Saved:
                    doesMatch = sc_helpers.toBooleanSafe(c.onSaved);
                    break;

                case sc_contracts.FileChangeType.Opened:
                    doesMatch = sc_helpers.toBooleanSafe(c.onFileOpened);
                    break;

                case sc_contracts.FileChangeType.Closed:
                    doesMatch = sc_helpers.toBooleanSafe(c.onFileClosed);
                    break;

                case sc_contracts.FileChangeType.EditorChanged:
                    doesMatch = sc_helpers.toBooleanSafe(c.onEditorChanged);
                    break;
            }
            
            return doesMatch;
        });

        me.executeScriptCommands(commandsToExecute, (c) => {
            let ctx: sc_contracts.ScriptCommandFileChangeContext = {
                command: c.id,
                file: filePath,
                globals: me.getGlobals(),
                options: sc_helpers.cloneObject(c.options),
                require: function(id) {
                    return require(id);
                },
                type: type,
                uri: e,
            };

            let additionArgs = [ ctx ];
            if (argsFactory) {
                let moreAdditionalArgs = argsFactory(c);
                if (moreAdditionalArgs) {
                    additionArgs = additionArgs.concat(moreAdditionalArgs);
                }
            }

            return additionArgs;
        }).then(() => {
            //TODO
        }).catch((err) => {
            vscode.window.showErrorMessage(`[vs-script-commands] Execution of script commands (${sc_contracts.FileChangeType[type]}) failed: ${sc_helpers.toStringSafe(err)}`);
        });;           
    }

    /**
     * Gets the global output channel.
     */
    public get outputChannel(): vscode.OutputChannel {
        return this._OUTPUT_CHANNEL;
    }

    /**
     * Gets the package file of that extension.
     */
    public get packageFile(): sc_contracts.PackageFile {
        return this._PACKAGE_FILE;
    }

    /**
     * Reloads the commands.
     */
    protected reloadCommands() {
        let me = this;
        let cfg = me.config;

        try {
            // remove old commands
            while (this._COMMANDS.length > 0) {
                let oldCmd = this._COMMANDS.shift();

                sc_helpers.tryDispose(oldCmd.command);
                sc_helpers.tryDispose(oldCmd.button);
            }

            let newCommands = me.getCommands();

            let globalState: any = {};

            newCommands.forEach(c => {
                let cmdId = sc_helpers.toStringSafe(c.id);

                let btn: vscode.StatusBarItem;
                let cmd: vscode.Disposable;
                let commandState: any = {};
                try {
                    cmd = vscode.commands.registerCommand(cmdId, function() {
                        let args: sc_contracts.ScriptCommandExecutorArguments;
                        let completed = (err?: any, exitCode?: number) => {
                            if (err) {
                                vscode.window.showErrorMessage(`[vs-script-commands] Execution of ${cmdId} failed: ${sc_helpers.toStringSafe(err)}`);
                            }
                            else {
                                if (sc_helpers.isNullOrUndefined(exitCode)) {
                                    exitCode = 0;
                                }
                            }

                            if (!sc_helpers.isNullOrUndefined(exitCode)) {
                                console.log(`[vs-script-commands] '${cmdId}' returned with exit code ${exitCode}`);
                            }

                            if (args) {
                                commandState = args.commandState;
                                globalState = args.globalState;
                            }
                        };

                        try {
                            let cmdModule = sc_helpers.loadModule<sc_contracts.ScriptCommandModule>(c.script);
                            if (!cmdModule.execute) {
                                completed();
                                return;  // no execute() function found
                            }

                            args = {
                                arguments: arguments,
                                command: cmdId,
                                commandState: commandState,
                                globals: me.getGlobals(),
                                options: sc_helpers.cloneObject(c.options),
                                require: function(id) {
                                    return require(id);
                                },
                            };

                            try {
                                let result = cmdModule.execute(args);
                                if (!sc_helpers.isNullOrUndefined(result)) {
                                    if ('number' === typeof result) {
                                        completed(null, result);
                                    }
                                    else {
                                        let p = <Promise<number>>result;

                                        p.then((exitCode) => {
                                            if (sc_helpers.isEmptyString(exitCode)) {
                                                exitCode = 0;
                                            }
                                            else {
                                                exitCode = parseInt(sc_helpers.toStringSafe(exitCode).trim());
                                            }

                                            completed(null, exitCode);
                                        }).catch((err) => {
                                            completed(err);
                                        });
                                    }
                                }
                                else {
                                    completed();
                                }
                            }
                            catch (e) {
                                completed(e);
                            }
                        }
                        catch (e) {
                            completed(e);
                        }
                    });

                    me._COMMANDS.push({
                        button: btn,
                        command: cmd,
                        object: c,
                    });
                }
                catch (e) {
                    me.log(`[ERROR] ScriptCommandController.reloadCommands(2)(${cmdId}): ${sc_helpers.toStringSafe(e)}`);
                }
            });
        }
        catch (e) {
            me.log(`[ERROR] ScriptCommandController.reloadCommands(1): ${sc_helpers.toStringSafe(e)}`);
        }
    }

    /**
     * Reloads configuration.
     */
    public reloadConfiguration() {
        let me = this;

        try {
            let newCfg = <sc_contracts.Configuration>vscode.workspace.getConfiguration("script.commands");
            if (!newCfg) {
                newCfg = {};
            }

            me._config = newCfg;

            me.reloadCommands();

            // startup commands
            let commandsToExecute = me.getCommands().filter(x => {
                return sc_helpers.toBooleanSafe(x.onStartup);
            });
            me.executeScriptCommands(commandsToExecute).then(() => {
                //TODO
            }).catch((err) => {
                vscode.window.showErrorMessage(`[vs-script-commands] Execution of script commands (ScriptCommandController.reloadConfiguration) failed: ${sc_helpers.toStringSafe(err)}`);
            });;

            if (sc_helpers.toBooleanSafe(newCfg.showOutput)) {
                this.outputChannel.show();
            }
        }
        catch (e) {
            me.log(`[ERROR] ScriptCommandController.reloadConfiguration(1): ${sc_helpers.toStringSafe(e)}`);
        }
    }
    
    /**
     * Selects a command and executes a command.
     */
    protected selectAndExecuteCommand(entries: CommandEntry[]) {
        let me = this;
        let cfg = me.config;

        let cmdId: string;
        let completed = (err?: any) => {
            if (err) {
                if (cmdId) {
                    vscode.window.showErrorMessage(`[vs-script-commands] Manual execution of ${cmdId} failed: ${sc_helpers.toStringSafe(err)}`);
                }
                else {
                    vscode.window.showErrorMessage(`[vs-script-commands] Manual execution failed: ${sc_helpers.toStringSafe(err)}`);
                }
            }
        };

        try {
            entries = sc_helpers.asArray(entries)
                                .filter(x => x);

            if (entries.length > 0) {
                let quickPicks = entries.map(x => {
                    let qp: CommandEntryQuickPickItem = {
                        description: x.description,
                        entry: x,
                        label: x.label,
                    };

                    return qp;
                });

                vscode.window.showQuickPick(quickPicks, {
                    placeHolder: `Select one of the ${entries.length} commands...`,
                }).then((item) => {
                    if (!item) {
                        return;
                    }

                    let args = [ item.entry.id ];

                    let executeTheCommand = () => {
                        try {
                            vscode.commands.executeCommand.apply(null, args).then((result) => {
                                let exitCode = parseInt(sc_helpers.toStringSafe(result).trim());
                                if (!isNaN(exitCode)) {
                                    console.log(`[vs-script-commands] '${item.entry.id}' returned with exit code ${exitCode}`);
                                }
                            }, (err) => {
                                completed(err);
                            });
                        }
                        catch (e) {
                            completed(e);
                        }
                    };

                    if (item.entry.askForArgument) {
                        vscode.window.showInputBox({
                            placeHolder: 'Input the first argument for the execution here...',
                        }).then((value) => {
                            args = args.concat([ value ]);

                            executeTheCommand();
                        }, (err) => {
                            completed(err);
                        });
                    }
                    else {
                        executeTheCommand();
                    }
                }, (err) => {
                    completed(err);
                });
            }
            else {
                vscode.window.showWarningMessage(`[vs-script-commands] No command found that can be executed!`);
            }
        }
        catch (e) {
            completed(e);
        }
    }

    /**
     * Set ups the file system watcher.
     */
    protected setupFileSystemWatcher() {
        let me = this;

        let createWatcher = () => {
            me._fileSystemWatcher = null;

            let newWatcher: vscode.FileSystemWatcher;
            try {
                newWatcher = vscode.workspace.createFileSystemWatcher('**',
                                                                      false, false, false);
                newWatcher.onDidChange((e) => {
                    me.onFileChange(e, sc_contracts.FileChangeType.Changed);
                }, newWatcher);
                newWatcher.onDidCreate((e) => {
                    me.onFileChange(e, sc_contracts.FileChangeType.New);
                }, newWatcher);
                newWatcher.onDidDelete((e) => {
                    me.onFileChange(e, sc_contracts.FileChangeType.Deleted);
                }, newWatcher);

                me._fileSystemWatcher = newWatcher;
            }
            catch (e) {
                sc_helpers.tryDispose(newWatcher);

                this.log(`[ERROR] ScriptCommandController.setupFileSystemWatcher(2): ${sc_helpers.toStringSafe(e)}`);
            }
        };

        try {
            if (sc_helpers.tryDispose(me._fileSystemWatcher)) {
                createWatcher();
            }
        }
        catch (e) {
            this.log(`[ERROR] ScriptCommandController.setupFileSystemWatcher(1): ${sc_helpers.toStringSafe(e)}`);
        }
    }
}
