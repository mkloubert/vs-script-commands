# Change Log (vs-script-commands)

## 4.15.0 (?????? ????, ????; functions and variables)

* `$download`, `$openInEditor`, `$select`, `$unwrap` functions for [quick executions](https://github.com/mkloubert/vs-script-commands#quick-execution-)
* `$setState` function can also handle async (Promise based) results now

## 4.14.0 (May 7th, 2017; functions and variables)

* `$addValue`, `$DELETE`, `$GET`, `$HEAD`, `$htmlDecode`, `$openInTab`, `$OPTIONS`, `$PATCH`, `$POST`, `$PUT`, `$readJSONFrom`, `$REQUEST`, `$sendJSONTo`, `$workflow`, `$xmlDecode`, `$htmlEncode` functions for [quick executions](https://github.com/mkloubert/vs-script-commands#quick-execution-)
* `$openHtml` can handle async Promise results now
* bugfixes

## 4.13.0 (May 6th, 2017; functions and variables)

* added `$appendFile()`, `$executeForState()`, `$ip()`, `$push()`, `$receiveFrom()`, `$saveJSON`, `$stopReceiveFrom()` and `$sendTo` functions for [quick executions](https://github.com/mkloubert/vs-script-commands#quick-execution-)
* added `$events`, `$globalEvents`, `$lastResult`, `$previousValue`, `$nextValue` and `$values` variables for [quick executions](https://github.com/mkloubert/vs-script-commands#quick-execution-)
* added `saveResultsToState` [quick execution setting](https://github.com/mkloubert/vs-script-commands#quick-execution-)
* added `globalEvents` property to [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html) interface

## 4.12.0 (May 2nd, 2017; REST API and cron jobs)

* added `$startApi()` and `$stopApi()` functions for [quick executions](https://github.com/mkloubert/vs-script-commands#quick-execution-), that can interact with extensions like [vs-rest-api](https://github.com/mkloubert/vs-rest-api)
* added `$getCronJobs()`, `$restartCronJobs()`, `$startCronJobs()` and `$stopCronJobs()` functions for [quick executions](https://github.com/mkloubert/vs-script-commands#quick-execution-), that can interact with extensions like [vs-cron](https://github.com/mkloubert/vs-cron)

## 4.11.0 (May 2nd, 2017; quick execution)

* added `$clearHistory`, `$history`, `$removeFromHistory` and `$saveToHistory` functions
* added `$doNotShowResult` [symbol](https://www.typescriptlang.org/docs/handbook/symbols.html)
* added `saveToGlobalHistory` and `saveToHistory` settings

## 4.10.0 (May 2nd, 2017; quick execution functions)

* added `$password()` and `$randomString()` functions for [quick executions](https://github.com/mkloubert/vs-script-commands#quick-execution-)

## 4.9.0 (May 2nd, 2017; quick execution functions)

* added `$rand()` function for [quick executions](https://github.com/mkloubert/vs-script-commands#quick-execution-)

## 4.8.0 (May 2nd, 2017; quick execution functions)

* added `$` and `$readJSON()` and `$readString()` functions for [quick executions](https://github.com/mkloubert/vs-script-commands#quick-execution-)

## 4.7.0 (May 2nd, 2017; hashes and UUIDs)

* added `$guid()`, `$hash()`, `$md5()`, `$sha1()`, `$sha256()` and `$uuid()` functions for [quick executions](https://github.com/mkloubert/vs-script-commands#quick-execution-)

## 4.6.0 (May 1st, 2017; hex view of binary files)

* [Buffer](https://nodejs.org/api/buffer.html) results are displayed in "hex view" now, when displaying in tab
* added `$toHexView()`, `$disableHexView()` functions and `$config` variable for [quick executions](https://github.com/mkloubert/vs-script-commands#quick-execution-)
* added `toHexView()` method for [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html) interface

## 4.5.0 (May 1st, 2017; find files)

* added `$findFiles()` function for [quick executions](https://github.com/mkloubert/vs-script-commands#quick-execution-)
* added `findFiles()` method for [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html) interface

## 4.4.0 (May 1st, 2017; added support for Markdown and HTML parsing)

* added `$fromMarkdown()`, `$htmlEncode()` and `$log()` functions for [quick executions](https://github.com/mkloubert/vs-script-commands#quick-execution-)
* added `fromMarkdown()` and `htmlEncode()` methods for [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html) interface

## 4.3.0 (May 1st, 2017; quick JavaScript execution - $output)

* added `$output` variable for [Quick execution](https://github.com/mkloubert/vs-script-commands#quick-execution-) command

## 4.2.0 (April 29th, 2017; quick JavaScript execution - $global)

* added `$globals` variable for [Quick execution](https://github.com/mkloubert/vs-script-commands#quick-execution-) command

## 4.1.0 (April 29th, 2017; quick JavaScript execution - $mkdir)

* added `$mkdir` function for [Quick execution](https://github.com/mkloubert/vs-script-commands#quick-execution-) command

## 4.0.0 (April 29th, 2017; quick JavaScript execution)

* added `Script commands: Quick execution` command that can [execute JavaScript code quickly](https://github.com/mkloubert/vs-script-commands#quick-execution-) ... enter `$help` as first action to get information about available functions and variables

## 3.0.0 (April 21st, 2017; execute command before save document)

* added `onWillSave` setting for commands, which indicates to invoke commands if a file is going to be saved

## 2.0.1 (April 11th, 2017; improved execution of scripts)

* the behavior of executing scripts has been improved ... if you come from version 1.x, have a look at the [wiki](https://github.com/mkloubert/vs-script-commands/wiki#since-version-2x-) first
* if you have problems, you can open an [issue](https://github.com/mkloubert/vs-script-commands/issues) and/or download a version 1.x branch from [here](https://github.com/mkloubert/vs-script-commands/releases)

## 1.12.0 (April 10th, 2017; REST API)

* added `startApi()` and `stopApi()` methods to [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html) interface, which make use of commands provided by extensions like [vs-rest-api](https://github.com/mkloubert/vs-rest-api)

## 1.11.0 (April 10th, 2017; cron jobs)

* added `getCronJobs()`, `restartCronJobs()`, `startCronJobs()` and `stopCronJobs()` methods to [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html) interface, which make use of commands provided by extensions like [vs-cron](https://github.com/mkloubert/vs-cron)
* added `others` property to [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html) interface

## 1.10.0 (February 20th, 2017; deploy files)

* added [deploy](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html#deploy) method to [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html) which make use of `extension.deploy.filesTo` command, provided by [vs-deploy](https://github.com/mkloubert/vs-deploy) extension

## 1.9.0 (February 20th, 2017; output channel)

* added [outputChannel](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html#outputChannel) property to [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html) that gets the [OutputChannel](https://code.visualstudio.com/Docs/extensionAPI/vscode-api#OutputChannel) instance of that extension

## 1.8.0 (February 20th, 2017; log() method)

* added [log()](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html#log) method to [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html) that writes log messages to output window / channel

## 1.7.0 (February 20th, 2017; open HTML documents)

* added [openHtml()](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html#openhtml) method to [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html) which can open HTML documents in a new tab

## 1.6.0 (February 18th, 2017; command events)

* added [events](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html#events) property, that can handle events for all commands created by that extension
* added [cached](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommand.html#cached) property

## 1.5.0 (February 18th, 2017; extension context and sharing data between two executions)

* added [previousValue](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html#previousvalue) and [nextValue](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html#nextvalue) properties that can share data between two executions
* added [extension](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html#extension) property that returns the [context of this extension](https://code.visualstudio.com/Docs/extensionAPI/vscode-api#_a-nameextensioncontextaspan-classcodeitem-id988extensioncontextspan)

## 1.4.0 (January 23rd, 2017; commandState)

* added `commandState` to [ScriptCommand](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommand.html)

## 1.2.0 (January 23rd, 2017; extended ScriptCommandExecutorArguments)

* added `arguments` and `suppressArguments` to [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html)

## 1.1.0 (January 23rd, 2017; extended API)

* extended [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html) interface

## 1.0.0 (January 23rd, 2017; first release)

* first official release
