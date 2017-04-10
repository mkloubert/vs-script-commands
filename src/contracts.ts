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
import * as vscode from 'vscode';


/**
 * The configuration data for that extension.
 */
export interface Configuration {
    /**
     * One or more command to register.
     */
    commands?: ScriptCommand | ScriptCommand[];
    /**
     * Global data available for ALL commands defined by that extension.
     */
    globals?: GlobalVariables;
    /**
     * Open output on startup or not.
     */
    showOutput?: boolean;
    /**
     * Show internal Visual Studio Code commands in GUI or not.
     */
    showInternalVSCommands?: boolean;
}

/**
 * Information about a (cron) job.
 */
export interface CronJobInfo {
    /**
     * Gets the description of the underlying job.
     */
    readonly description: string;
    /**
     * Gets the details for the underlying job.
     */
    readonly detail: string;
    /**
     * Gets if the job is currently running or not.
     */
    readonly isRunning: boolean;
    /**
     * Gets the timestamp of the last execution in ISO format.
     */
    readonly lastExecution: string;
    /**
     * Gets the name of the job.
     */
    readonly name: string;
}

/**
 * (Cron) Job name(s).
 */
export type CronJobNames = string | string[];

/**
 * A document.
 */
export interface Document {
    /**
     * The body / content of the document.
     */
    body: Buffer;
    /**
     * The encoding.
     */
    encoding?: string;
    /**
     * The ID.
     */
    id?: any;
    /**
     * The MIME type.
     */
    mime?: string;
    /**
     * The title.
     */
    title?: string;
}

/**
 * List of file change types.
 */
export enum FileChangeType {
    /**
     * Files has been changed.
     */
    Changed = 0,
    /**
     * File has been created.
     */
    New = 1,
    /**
     * File has been deleted.
     */
    Deleted = 2,
    /**
     * File has been saved.
     */
    Saved = 3,
    /**
     * File has been opened.
     */
    Opened = 4,
    /**
     * File has been closed.
     */
    Closed = 5,
    /**
     * File has been changed in text editor.
     */
    EditorChanged = 6,
}

/**
 * Global variables.
 */
export type GlobalVariables = Object;

/**
 * Describes the structure of the package file of that extenstion.
 */
export interface PackageFile {
    /**
     * The display name.
     */
    displayName: string;
    /**
     * The (internal) name.
     */
    name: string;
    /**
     * The version string.
     */
    version: string;
}

/**
 * A script command.
 */
export interface ScriptCommand {
    /**
     * One or more arguments for the callbacks.
     */
    arguments?: any[];
    /**
     * Defines if the GUI asks for an argument when invoke manually or not.
     */
    askForArgument?: boolean;
    /**
     * Invokes command async or not.
     */
    async?: boolean;
    /**
     * Settings for optional button in the status bar.
     */
    button?: {
        /**
         * The custom (text) color for the button.
         */
        color?: string;
        /**
         * Set button on the right side or not.
         */
        isRight?: boolean;
        /**
         * The custom priority.
         */
        priority?: number;
        /**
         * Show button on startup or not.
         */
        show?: boolean;
        /**
         * The caption for the button.
         */
        text?: string;
        /**
         * The tooltip for the button.
         */
        tooltip?: string;
    },
    /**
     * Cache script or not.
     */
    cached?: boolean;
    /**
     * The initial value for ScriptCommandExecutorArguments.commandState property.
     */
    commandState?: any;
    /**
     * Continue on error or cancel.
     */
    continueOnError?: boolean;
    /**
     * The description for the command.
     */
    description?: string;
    /**
     * The custom display name.
     */
    displayName?: string;
    /**
     * The ID of the command.
     */
    id: string;
    /**
     * Executes the command on close or not.
     */
    onClose?: boolean;
    /**
     * Is invoked after settings.json has been changed.
     */
    onConfigChanged?: boolean;
    /**
     * Is invoked after a text editor changed.
     */
    onEditorChanged?: boolean;
    /**
     * Is invoked when a file has been changed.
     */
    onFileChanged?: boolean;
    /**
     * Is invoked when a file has been closed.
     */
    onFileClosed?: boolean;
    /**
     * Is invoked when a file has been deleted.
     */
    onFileDeleted?: boolean;
    /**
     * Is invoked when a file has been opened.
     */
    onFileOpened?: boolean;
    /**
     * Is invoked when a file has been created.
     */
    onNewFile?: boolean;
    /**
     * Is invoked when a file has been saved.
     */
    onSaved?: boolean;
    /**
     * Executes the command on startup or not.
     */
    onStartup?: boolean;
    /**
     * Additional data for the execution.
     */
    options?: any;
    /**
     * The path to the script to exeute.
     */
    script: string;
    /**
     * The sort order.
     */
    sortOrder?: number;
    /**
     * Supress own arguments of the extension or not.
     */
    suppressArguments?: boolean;
}

/**
 * Factory for additional arguments for the execution of a script command.
 * 
 * @param {ScriptCommand} sc The underlying command.
 * 
 * @return {Array} The list of additional arguments.
 */
export type ScriptCommandArgumentFactory = (sc: ScriptCommand) => any[];

/**
 * A script executor.
 * 
 * @param {ScriptCommandExecutorArguments} args Arguments for the execution.
 * 
 * @return {Promise<number>|void|number} The result (with the exit code).
 */
export type ScriptCommandExecutor = (args: ScriptCommandExecutorArguments) => ScriptCommandExecutorResult;

/**
 * Possible results of a script executor.
 */
export type ScriptCommandExecutorResult = Promise<number> | void | number;

/**
 * Arguments for a script executor.
 */
export interface ScriptCommandExecutorArguments {
    /**
     * Arguments from the callback.
     */
    arguments: IArguments;
    /**
     * The additional status bar button of the underlying command.
     */
    button?: vscode.StatusBarItem;
    /**
     * The ID of the underlying command.
     */
    command: string;
    /**
     * Defines data that should be keeped while the current session
     * and is available for ONLY for current command.
     */
    commandState: any;
    /**
     * Deploys one or more file to a list of targets.
     * 
     * This requires 'extension.deploy.filesTo' command as available in extensions like 'vs-deploy'
     * s. https://github.com/mkloubert/vs-deploy
     * 
     * @param {string|string[]} files One or more file to deploy.
     * @param {string|string[]} targets One or more target (name) to deploy to.
     * 
     * @returns {Promise<any>} The promise.
     */
    readonly deploy: (files: string | string[],
                      targets: string | string[]) => Promise<any>;
    /**
     * Gets the event emitter that can be used by ALL commands.
     */
    readonly events: Events.EventEmitter;
    /**
     * Gets the context of that extension.
     */
    readonly extension: vscode.ExtensionContext;
    /**
     * Returns the list of current (cron) jobs.
     * 
     * @return {Promise<CronJobInfo[]>} The promise.
     */
    readonly getCronJobs: () => Promise<CronJobInfo[]>;
    /**
     * The global variables from the settings.
     */
    globals: GlobalVariables;
    /**
     * Defines data that should be keeped while the current session
     * and is available for ALL commands defined by that extension.
     */
    readonly globalState: any;
    /**
     * Logs a message.
     * 
     * @param {any} msg The message to log.
     * 
     * @chainable
     */
    readonly log: (msg: any) => ScriptCommandExecutorArguments;
    /**
     * Gets or sets the value for the next execution.
     */
    nextValue: any;
    /**
     * Opens a HTML document in a new tab.
     * 
     * @param {string} html The HTML document (source code).
     * @param {string} [title] The custom title for the tab.
     * @param {any} [id] The custom ID for the document in the storage.
     * 
     * @returns {Promise<any>} The promise.
     */
    readonly openHtml: (html: string, title?: string, id?: any) => Promise<any>;
    /**
     * Options for the execution (@see ScriptCommand).
     */
    options?: any;
    /**
     * Gets the list of (other) commands, defined by that extension.
     */
    readonly others: string[];
    /**
     * Gets the output channel that can be used by the underlying script.
     */
    readonly outputChannel: vscode.OutputChannel;
    /**
     * Gets the value from the previous execution.
     */
    readonly previousValue: any;
    /**
     * Loads a module from the script context.
     * 
     * @param {string} id The ID / path to the module.
     * 
     * @return {any} The loaded module.
     */
    require: (id: string) => any;
    /**
     * Re-starts cron jobs.
     * 
     * This requires 'extension.cronJons.restartJobsByName' command as available in extensions like 'vs-cron'
     * s. https://github.com/mkloubert/vs-cron
     * 
     * @param {CronJobNames} jobs The jobs to re-start.
     * 
     * @return {Promise<any>} The promise.
     */
    readonly restartCronJobs: (jobs: CronJobNames) => Promise<any>;
    /**
     * Starts REST API host.
     * 
     * This requires 'extension.restApi.startHost' command as available in extensions like 'vs-rest-api'
     * s. https://github.com/mkloubert/vs-rest-api
     * 
     * @return {Promise<any>} The promise.
     */
    readonly startApi: () => Promise<any>;
    /**
     * Starts cron jobs.
     * 
     * This requires 'extension.cronJons.startJobsByName' command as available in extensions like 'vs-cron'
     * s. https://github.com/mkloubert/vs-cron
     * 
     * @param {CronJobNames} jobs The jobs to start.
     * 
     * @return {Promise<any>} The promise.
     */
    readonly startCronJobs: (jobs: CronJobNames) => Promise<any>;
    /**
     * Stops REST API host.
     * 
     * This requires 'extension.restApi.stopHost' command as available in extensions like 'vs-rest-api'
     * s. https://github.com/mkloubert/vs-rest-api
     * 
     * @return {Promise<any>} The promise.
     */
    readonly stopApi: () => Promise<any>;
    /**
     * Stops cron jobs.
     * 
     * This requires 'extension.cronJons.stopJobsByName' command as available in extensions like 'vs-cron'
     * s. https://github.com/mkloubert/vs-cron
     * 
     * @param {CronJobNames} jobs The jobs to stop.
     * 
     * @return {Promise<any>} The promise.
     */
    readonly stopCronJobs: (jobs: CronJobNames) => Promise<any>;
}

/**
 * A context that stores the data when a command is executed on editor change.
 */
export interface ScriptCommandEditorChangeContext {
    /**
     * The list of changes.
     */
    changes: vscode.TextDocumentContentChangeEvent[];
    /**
     * The underlying document.
     */
    document: vscode.TextDocument;
}

/**
 * A context that stores the data when a command is executed on file change.
 */
export interface ScriptCommandFileChangeContext {
    /**
     * The command.
     */
    command: string;
    /**
     * The file.
     */
    file: string;
    /**
     * The global variables from the settings.
     */
    globals?: GlobalVariables;
    /**
     * Options for the execution (@see ScriptCommand).
     */
    options?: any;
    /**
     * Loads a module from the script context.
     * 
     * @param {string} id The ID / path to the module.
     * 
     * @return {any} The loaded module.
     */
    require: (id: string) => any;
    /**
     * The change type.
     */
    type: FileChangeType;
    /**
     * The URI of the file.
     */
    uri: vscode.Uri;
}

/**
 * A script module.
 */
export interface ScriptCommandModule {
    /**
     * The script executor.
     */
    execute?: ScriptCommandExecutor;
}

/**
 * A quick pick item.
 */
export interface ScriptCommandQuickPickItem extends vscode.QuickPickItem {
}

/**
 * Describes a function that provides a value.
 * 
 * @return {TValue} The value.
 */
export type ValueProvider<TValue> = () => TValue;
