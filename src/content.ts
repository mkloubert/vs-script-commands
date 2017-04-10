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


import * as sc_contracts from './contracts';
import * as sc_controller from './controller';
import * as sc_helpers from './helpers';
import * as vscode from 'vscode';


/**
 * HTML content provider.
 */
export class HtmlTextDocumentContentProvider implements vscode.TextDocumentContentProvider {
    /**
     * Stores the underlying controller.
     */
    protected readonly _CONTROLLER: sc_controller.ScriptCommandController;
    
    /**
     * Initializes a new instance of that class.
     * 
     * @param {sc_controller.ScriptCommandController} controller The underlying controller instance.
     */
    constructor(controller: sc_controller.ScriptCommandController) {
        this._CONTROLLER = controller;
    }

    /**
     * Gets the underlying controller.
     */
    public get controller(): sc_controller.ScriptCommandController {
        return this._CONTROLLER;
    }

    /** @inheritdoc */
    public provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Thenable<string> {
        let me = this;
        
        return new Promise<string>((resolve, reject) => {
            let completed = sc_helpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                let htmlDocs = me.controller.htmlDocuments;

                let doc: sc_contracts.Document;

                let params = sc_helpers.uriParamsToObject(uri);

                let idValue = decodeURIComponent(sc_helpers.getUrlParam(params, 'id'));

                if (!sc_helpers.isEmptyString(idValue)) {
                    let id = idValue.trim();
                    
                    // search for document
                    for (let i = 0; i < htmlDocs.length; i++) {
                        let d = htmlDocs[i];

                        if (sc_helpers.toStringSafe(d.id).trim() == id) {
                            doc = d;
                            break;
                        }
                    }
                }

                let html = '';

                if (doc) {
                    if (doc.body) {
                        let enc = sc_helpers.normalizeString(doc.encoding);
                        if (!enc) {
                            enc = 'utf8';
                        }

                        html = doc.body.toString(enc);
                    }
                }

                completed(null, html);
            }
            catch (e) {
                completed(e);
            }
        });
    }
}
