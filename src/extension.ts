'use strict';

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
import * as Path from 'path';
import * as sc_content from './content';
import * as sc_contracts from './contracts';
import * as sc_controller from './controller';
import * as sc_helpers from './helpers';
import * as vscode from 'vscode';


let controller: sc_controller.ScriptCommandController;

export function activate(context: vscode.ExtensionContext) {
    // version
    let pkgFile: sc_contracts.PackageFile;
    try {
        pkgFile = JSON.parse(FS.readFileSync(Path.join(__dirname, '../../package.json'), 'utf8'));
    }
    catch (e) {
        sc_helpers.log(`[ERROR] extension.activate(): ${sc_helpers.toStringSafe(e)}`);
    }

    let outputChannel = vscode.window.createOutputChannel("Script Commands");

    // show infos about the app
    {
        if (pkgFile) {
            outputChannel.appendLine(`${pkgFile.displayName} (${pkgFile.name}) - v${pkgFile.version}`);
        }

        outputChannel.appendLine(`Copyright (c) 2017  Marcel Joachim Kloubert <marcel.kloubert@gmx.net>`);
        outputChannel.appendLine('');
        outputChannel.appendLine(`GitHub : https://github.com/mkloubert/vs-script-commands`);
        outputChannel.appendLine(`Twitter: https://twitter.com/mjkloubert`);
        outputChannel.appendLine(`Donate : [PayPal] https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=UHVN4LRJTEXQS`);
        outputChannel.appendLine(`         [Flattr] https://flattr.com/submit/auto?fid=o62pkd&url=https%3A%2F%2Fgithub.com%2Fmkloubert%2Fvs-script-commands`);

        outputChannel.appendLine('');
    }

    let controller = new sc_controller.ScriptCommandController(context, outputChannel, pkgFile);

    // execute script command
    let executeCmd = vscode.commands.registerCommand('extension.scriptCommands.execute', () => {
        try {
            controller.executeCommand();
        }
        catch (e) {
            vscode.window.showErrorMessage(`[EXECUTE SCRIPT COMMAND ERROR]: ${sc_helpers.toStringSafe(e)}`);
        }
    });

    // execute Visual Studio Code command
    let executeVSCmd = vscode.commands.registerCommand('extension.scriptCommands.executeVSCode', () => {
        try {
            controller.executeVSCommand();
        }
        catch (e) {
            vscode.window.showErrorMessage(`[EXECUTE SCRIPT COMMAND ERROR]: ${sc_helpers.toStringSafe(e)}`);
        }
    });

    // open HTML document
    let openHtmlDoc = vscode.commands.registerCommand('extension.scriptCommands.openHtmlDoc', (doc: sc_contracts.Document) => {
        try {
            let htmlDocs = controller.htmlDocuments;

            let url = vscode.Uri.parse(`vs-script-commands-html://authority/?id=${encodeURIComponent(sc_helpers.toStringSafe(doc.id))}` + 
                                       `&x=${encodeURIComponent(sc_helpers.toStringSafe(new Date().getTime()))}`);

            let title = sc_helpers.toStringSafe(doc.title).trim();
            if (!title) {
                title = `[vs-script-commands] HTML document #${sc_helpers.toStringSafe(doc.id)}`;
            }

            vscode.commands.executeCommand('vscode.previewHtml', url, vscode.ViewColumn.One, title).then((success) => {
                sc_helpers.removeDocuments(doc, htmlDocs);
            }, (err) => {
                sc_helpers.removeDocuments(doc, htmlDocs);

                sc_helpers.log(`[ERROR] extension.scriptCommands.openHtmlDoc(2): ${err}`);
            });
        }
        catch (e) {
            sc_helpers.log(`[ERROR] extension.scriptCommands.openHtmlDoc(1): ${e}`);
        }
    });

    let htmlViewer = vscode.workspace.registerTextDocumentContentProvider('vs-script-commands-html',
                                                                          new sc_content.HtmlTextDocumentContentProvider(controller));

    // notfiy setting changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(controller.onDidChangeConfiguration,
                                                                         controller));
    // notifiy on document has been saved
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(controller.onDidSaveTextDocument,
                                                                      controller));

    // notifiy on document is going to be saved
    context.subscriptions.push(vscode.workspace.onWillSaveTextDocument(controller.onWillSaveTextDocument,
                                                                       controller));
                                                                      
    // notfiy open text editor
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(controller.onDidOpenTextDocument,
                                                                      controller));
    // notfiy close text editor
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(controller.onDidCloseTextDocument,
                                                                       controller));
    // notfiy change text editor
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(controller.onDidChangeTextDocument,
                                                                        controller));

    context.subscriptions.push(controller,
                               executeCmd, executeVSCmd, openHtmlDoc,
                               htmlViewer);

    controller.onActivated();
}

export function deactivate() {
    if (controller) {
        controller.onDeactivate();
    }
}
