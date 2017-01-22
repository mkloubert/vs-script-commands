# vs-script-commands

Adds additional commands to [Visual Studio Code](https://code.visualstudio.com/) (VS Code) that uses scripts (JavaScript) for execution.

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=UHVN4LRJTEXQS) [![](https://api.flattr.com/button/flattr-badge-large.png)](https://flattr.com/submit/auto?fid=o62pkd&url=https%3A%2F%2Fgithub.com%2Fmkloubert%2Fvs-script-commands)

## Table of contents

1. [Install](#install-)
2. [How to use](#how-to-use-)
   * [Settings](#settings-)
      * [Commands](#commands-)
   
## Install [[&uarr;](#table-of-contents)]

Launch VS Code Quick Open (Ctrl+P), paste the following command, and press enter:

```bash
ext install vs-script-commands
```

## How to use [[&uarr;](#table-of-contents)]

### Settings [[&uarr;](#how-to-use-)]

Open (or create) your `settings.json` in your `.vscode` subfolder of your workspace.

Add a `script.commands` section:

```json
{
    "script.commands": {
    }
}
```

#### Commands [[&uarr;](#settings-)]

Define one or more command, by defining its `ID` and the script file (relative to your workspace) which should be executed:

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

The `./my-command.js` file must have the following structure:

```javascript
function execute(args) {
    // do the magic here
}

exports.compile = compile;
```
