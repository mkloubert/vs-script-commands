# Change Log (vs-script-commands)

## 1.7.0 (February 20th, 2017; open HTML documents)

* added [openHtml](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html#openhtml) method to [ScriptCommandExecutorArguments](https://mkloubert.github.io/vs-script-commands/interfaces/_contracts_.scriptcommandexecutorarguments.html) which can open HTML documents in a new tab

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
