# Change Log (vs-script-commands)

## 4.4.0 (May 1st, 2017; added support for Markdown and HTML parsing)

* added `$fromMarkdown()`, `$htmlEncode()` and `$log()` for [quick executions](https://github.com/mkloubert/vs-script-commands#quick-execution-)
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
