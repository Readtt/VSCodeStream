# VSCodeStream

VSCodeStream is a VSCode extension for streaming VSCode data live to a websocket, it can also make requests to the users client.

## Installation

- Run `npm install` in terminal to install dependencies
- Run the `Run Extension` target in the Debug View. This will:
	- Start a task `npm: watch` to compile the code
	- Run the extension in a new VS Code window

## Structure

```json
{
	appName: String,
	appRoot: String,
	version: String,
	connections: Number,
	sendInterval: Number,
	language: String,
	workspace: {
		workspaceName: String,
		workspaceFolders: Array
	},
	textEditor: {
		allVisibleTextEditors: Array,
		activeTextEditor: Object,
	},
	terminal: {
		activeTerminal: String,
		activeTerminalProcessID: Number,
		terminals: Number,
	},
	debug: {
		breakpoints: Array,
	},
	tasks: {
		taskExecutions: Array,
	},
	window: {
		state: Object,
	},
	extensions: Array,
}
```

## Usage

Request Commands (send to websocket):
```js
window.showErrorMessage: String
window.showInformationMessage: String
window.showWarningMessage: String
window.createTerminal: String (optional)
window.saveAll

configuration.port: Number,
configuration.msUpdate: Number,
```