# vs-script-commands

[![Latest Release](https://vsmarketplacebadge.apphb.com/version-short/mkloubert.vs-script-commands.svg)](https://marketplace.visualstudio.com/items?itemName=mkloubert.vs-script-commands)
[![Installs](https://vsmarketplacebadge.apphb.com/installs/mkloubert.vs-script-commands.svg)](https://marketplace.visualstudio.com/items?itemName=mkloubert.vs-script-commands)
[![Rating](https://vsmarketplacebadge.apphb.com/rating-short/mkloubert.vs-script-commands.svg)](https://marketplace.visualstudio.com/items?itemName=mkloubert.vs-script-commands#review-details)

Adds additional commands to [Visual Studio Code](https://code.visualstudio.com/) (VS Code) that uses scripts (JavaScript) for execution.

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=UHVN4LRJTEXQS) [![](https://api.flattr.com/button/flattr-badge-large.png)](https://flattr.com/submit/auto?fid=o62pkd&url=https%3A%2F%2Fgithub.com%2Fmkloubert%2Fvs-script-commands)

## Table of contents

1. [Install](#install-)
2. [How to use](#how-to-use-)
   * [Changes](#changes-)
   * [Settings](#settings-)
      * [Commands](#commands-)
   * [Key bindinds](#key-bindinds-)
   * [Invoke manually](#invoke-manually-)
   * [Status bar buttons](#status-bar-buttons-)
   * [Quick execution](#quick-execution-)
3. [Documentation](#documentation-)

## Install [[&uarr;](#table-of-contents)]

Launch VS Code Quick Open (Ctrl+P), paste the following command, and press enter:

```bash
ext install vs-script-commands
```

Or search for things like `vs-script-commands` in your editor:

![Screenshot VSCode Extension search](https://raw.githubusercontent.com/mkloubert/vs-script-commands/master/img/screenshot1.png)

## How to use [[&uarr;](#table-of-contents)]

### Changes [[&uarr;](#how-to-use-)]

* if you come from version 1.x, you should take a look at the [wiki](https://github.com/mkloubert/vs-script-commands/wiki#since-version-2x-) first ... if you have problems, you can open an [issue](https://github.com/mkloubert/vs-script-commands/issues) and/or download a version 1.x branch from [here](https://github.com/mkloubert/vs-script-commands/releases)

### Settings [[&uarr;](#how-to-use-)]

Open (or create) your `settings.json` in your `.vscode` subfolder of your workspace.

Add a `script.commands` section:

```json
{
    "script.commands": {
    }
}
```

| Name | Description |
| ---- | --------- |
| `commands` | One or more [commands](#commands-) to register. |
| `disableNewVersionPopups` | Disables the display of popups that reports for a new version of that extension. Default `(false)` |
| `globals` | Global data available for ALL commands defined by that extension. |
| `quick` | Settings for [quick execution](#quick-execution-) feature. |
| `showOutput` | Open output on startup or not. Default `(true)` |
| `showInternalVSCommands` | Show internal Visual Studio Code commands in GUI or not. Default `(false)` |

#### Commands [[&uarr;](#settings-)]

Define one or more command, by defining its `id` and the script file, which should be executed:

```json
{
    "script.commands": {
        "commands": [
            {
                "id": "mkloubert.mycommand",
                "script": "./my-command.js"
            }
        ]
    }
}
```

The `./my-command.js` must have a public / exported `execute()` function:

```javascript
exports.execute = function (args) {
    // access VSCode API (s. https://code.visualstudio.com/Docs/extensionAPI/vscode-api)
    var vscode = require('vscode');

    // access any NodeJS API provided by VSCode (s. https://nodejs.org/api/)
    var path = require('path');

    // import an own module
    var myModule = require('./myModule');

    // use the functions and classes provided by this extension
    // s. https://mkloubert.github.io/vs-script-commands/modules/_helpers_.html
    var helpers = args.require('./helpers');

    // access a module that is part of the extentsion
    // s. https://github.com/mkloubert/vs-script-commands/blob/master/package.json
    var moment = args.require('moment');

    // access the global data from the settings
    var globals = args.globals;

    // access the data of the entry from the settings
    var opts = args.options;

    // share / store data (while current session)...
    // ... for this script
    args.commandState = new Date();
    // ... with other scripts
    args.globalState['myCommand'] = new Date();

    // access permanent data storages
    // s. https://github.com/Microsoft/vscode/blob/master/src/vs/workbench/common/memento.ts
    var myAppWideValue = args.extension.globalState.get('myAppValue');  // app wide
    args.extension.workspaceState.update('myWorkspaceValue', 'New workspace wide value');  // workspace wide

    // share data between two executions
    var prevVal = args.previousValue;  // data from the previous execution
    args.nextValue = 'This is a value only for the next execution';  // data for the next execution

    // registers for a one-time event
    args.events.once('myCommandEvent', function(v) {
        // 'v' should be 'William Henry Gates'
        // if upcoming 'args.events.emit()' is called
        args.log("From 'myCommandEvent': " + v);
    });

    // emit 'myCommandEvent' event (s. above)
    args.events.emit('myCommandEvent', 'William Henry Gates');

    // logs a message to output window / channel
    args.log('A log message');

    // write to output channel of that extension
    // s. https://code.visualstudio.com/Docs/extensionAPI/vscode-api#OutputChannel
    args.outputChannel.appendLine('A message for the output channel.');


    var scriptFile = path.basename(__filename);

    // open HTML document in new tab (for reports e.g.)
    args.openHtml('<html>Hello from my extension: ' + scriptFile + '</html>', 'My HTML document').then(function() {
        // HTML opened
    }, function(err) {
        // opening HTML document failed
    });

    // deploys 'index.html' to 'My SFTP server'
    // s. https://github.com/mkloubert/vs-deploy
    args.deploy(['./index.html'], ['My SFTP server']).then(function() {
        // file deployed
    }, function(err) {
        // deployment failed
    });

    vscode.window.showInformationMessage('Hello from my extension: ' + scriptFile);

    // you also can return a Promise
    // if your command is executed async
    return 666;
}
```

The `args` parameter uses the [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html) interface.

You can now execute the command by anything that uses the [Visual Studio Code API](https://code.visualstudio.com/docs/extensionAPI/vscode-api#_commands):

```javascript
var vscode = require('vscode');

vscode.commands.executeCommand('mkloubert.mycommand').then(function(result) {
    // if we look at the upper example:
    // this should be: 666
}, function(err) {
    // handle an error
});
```

A command entry provides the following properties:

| Name | Description |
| ---- | --------- |
| `arguments` | One or more arguments for the callbacks. |
| `askForArgument` | Defines if the GUI asks for an argument when invoke manually or not. Default `(false)` |
| `async` | Invokes command async or not. Default `(true)` |
| `button` | Settings for optional [button](#status-bar-buttons-) in the status bar. |
| `cached` | Cache script or not. Default `(false)` |
| `commandState` | The initial value for [commandState](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html#commandstate) property. Default `{}` |
| `continueOnError` | Continue on error or cancel. Default `(true)` |
| `description` | The description for the command. |
| `displayName` | The custom display name. |
| `id` | The ID of the command. |
| `onClose` | Executes the command on VSCode closes or not. Default `(false)` |
| `onConfigChanged` | Is invoked after `settings.json` has been changed. Default `(false)` |
| `onEditorChanged` | Is invoked after a text editor changed. Default `(false)` |
| `onFileChanged` | Is invoked when a file has been changed. Default `(false)` |
| `onFileClosed` | Is invoked when a file has been closed. Default `(false)` |
| `onFileDeleted` | Is invoked when a file has been deleted. Default `(false)` |
| `onFileOpened` | Is invoked when a file has been opened. Default `(false)` |
| `onNewFile` | Is invoked when a file has been created. Default `(false)` |
| `onSaved` | Is invoked when a file has been saved. Default `(false)` |
| `onStartup` | Executes the command on startup or not. Default `(false)` |
| `onWillSave` | Is invoked when a file is going to be saved. Default `(false)` |
| `options` | Additional data for the execution. |
| `script` | The path to the script to execute. IF YOU USE A RELATIVE PATH: The path is relative to your workspace. |
| `sortOrder` | The sort order (for the GUI). Default `0` |
| `suppressArguments` | Supress own arguments of the extension or not. Default `(false)` |

### Key bindinds [[&uarr;](#how-to-use-)]

After defining one or more commands, you can open your [keybindings.json](https://code.visualstudio.com/docs/getstarted/keybindings#_advanced-customization) file and set shortcuts for them, by selecting `File > Preferences > Keyboard Shortcuts` (`Code > Preferences > Keyboard Shortcuts` on Mac) in your editor:

![Demo Key bindinds](https://raw.githubusercontent.com/mkloubert/vs-script-commands/master/img/demo1.gif)

### Invoke manually [[&uarr;](#how-to-use-)]

Press `F1` to open the list of commands and enter one of the following commands:

![Demo Invoke manually](https://raw.githubusercontent.com/mkloubert/vs-script-commands/master/img/demo2.gif)

| Name | Description | Command |
| ---- | ---- | --------- |
| `Script commands: Execute command` | Executes a command defined by that extension. | `extension.scriptCommands.execute` |
| `Script commands: Execute VSCode command` | Executes another command that is available in VSCode. | `extension.scriptCommands.executeVSCode` |
| `Script commands: Quick execution` | Executes a JavaScript expression quickly. | `extension.scriptCommands.quickExecution` |

### Status bar buttons [[&uarr;](#how-to-use-)]

You can activate buttons for your commands in the status bar, by defining the `button` property:

```json
{
    "script.commands": {
        "commands": [
            {
                "id": "mkloubert.mycommand",
                "script": "./my-command.js",
                
                "button": {
                    "text": "My command",
                    "tooltip": "This is a tooltip for my command"
                }
            }
        ]
    }
}
```

![Demo Status bar buttons](https://raw.githubusercontent.com/mkloubert/vs-script-commands/master/img/demo3.gif)

| Name | Description |
| ---- | --------- |
| `color` | The custom (text) color for the button. |
| `isRight` | Set button on the right side or not. Default `(false)` |
| `priority` | The custom priority. |
| `show` | Show button on startup or not. Default `(true)` |
| `text` | The caption for the button. |
| `tooltip` | The tooltip for the button. |

### Quick execution [[&uarr;](#how-to-use-)]

Press `F1` to open the list of commands and select `Script commands: Quick execution` to execute any JavaScript expression (execute `$help` to open a help tab which lists all available features, like functions and variables):

![Demo Quick execution](https://raw.githubusercontent.com/mkloubert/vs-script-commands/master/img/demo4.gif)

You can define custom settings for the feature:

```json
{
    "script.commands": {
        "quick": {
            "noResultInfo": false,
            "showResultInTab": true,
            
            "state": {
                "MK": 23979,
                "TM": "1979-09-05 23:09:19.079"
            }
        }
    }
}
```

| Name | Description |
| ---- | --------- |
| `cwd` | The initial current directory for the executions. |
| `disableHexView` | Do not show binary data in 'hex view'. Default: `(false)` |
| `noResultInfo` | Do not show results of executions. Default: `(false)` |
| `saveResultsToState` | Save all results to `$state` variable or not. Default: `(false)` |
| `showResultInTab` | Show results in tab instead of a popup or not. Default: `(false)` |
| `saveToGlobalHistory` | Save entries, that are stored automatically, to global history instead to workspace history. Default: `(false)` |
| `saveToHistory` | Automatically save entries to history or not. Default: `(false)` |
| `state` | The initial state value. |

## Documentation [[&uarr;](#table-of-contents)]

The full API documentation can be found [here](https://mkloubert.github.io/vs-script-commands/).
