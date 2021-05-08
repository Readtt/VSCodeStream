import * as vscode from 'vscode';
import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import * as fs from 'fs';
import * as logger from './logger';
import { JSONStruct } from './JSONStruct';
let server: http.Server;
let status: vscode.StatusBarItem;
let serverRunning: boolean;
let ms: number;
let port: number;
let wss: WebSocket.Server;

export function activate(context: vscode.ExtensionContext) {
	logger.Info("VSCodeStream - activate() called");
	getPort();
	startServer();
	commandHook();
	useStatusBar(context);
}

export function deactivate() {
	logger.Info("VSCodeStream - deactivate() called");
	stopServer();
}

function useStatusBar({ subscriptions }: vscode.ExtensionContext) {
	logger.Info("VSCodeStream - useStatusBar() called");
	status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	status.text = "$(ports-open-browser-icon) VSCodeStream - Running... $(debug-pause)";
	status.command = "status.pause";
	subscriptions.push(status);
	status.show();
	logger.Info("VSCodeStream - Status displayed...");

	subscriptions.push(vscode.commands.registerCommand('status.pause', () => {
		stopServer();
		logger.Info("VSCodeStream - status.pause called");
		status.text = "$(ports-open-browser-icon) VSCodeStream - Stopped... $(debug-continue)";
		status.command = "status.start";
	}));
	subscriptions.push(vscode.commands.registerCommand('status.start', () => {
		startServer();
		logger.Info("VSCodeStream - status.start called");
		status.text = "$(ports-open-browser-icon) VSCodeStream - Running... $(debug-pause)";
		status.command = "status.pause";
	}));
	logger.Info("VSCodeStream - status.pause and status.start registered");
}

function startServer() {
	logger.Info("VSCodeStream - startServer() called");
	const app = express();
	server = http.createServer(app);
	wss = new WebSocket.Server({
		server,
		path: "/ws"
	});

	wss.on('connection', (ws: WebSocket) => {
		logger.Info("VSCodeStream - New connection: " + wss.clients.size);
		const wsSend = function() {
			ms = getMSUpdate();
			ws.send(JSON.stringify(new JSONStruct(vscode, wss, getMSUpdate(), allVisibleTextEditors(), activeTextEditor()).JSON()));
			setTimeout(wsSend, ms);
		};
		setTimeout(wsSend, ms);
	});
	
	app.get('/json', (req, res) => {
		res.json(new JSONStruct(vscode, wss, getMSUpdate(), allVisibleTextEditors(), activeTextEditor()).JSON());
	});

	server.listen(port, () => {
		serverRunning = true;
		logger.Success(`VSCodeStream - Server started on port ${port}`);
	});
}

function commandHook() {
	logger.Info("VSCodeStream - commandHook() called");
	wss.on('connection', (ws) => {
		ws.on('message', (response) => {
			showErrorMessageHook(response);
			showInformationMessageHook(response);
			showWarningMessageHook(response);
			createTerminalHook(response);
			saveAllHook(response);
			editConfigurationHook(response);
		});
	});
}

function showErrorMessageHook(res: WebSocket.Data) {
	logger.Info("VSCodeStream - showErrorMessageHook() called");
	if(res.toString().includes("window.showErrorMessage:") && res.toString().length != 0) {
		vscode.window.showErrorMessage(res.toString().split(':').splice(1).join(':').trim());
		logger.Info("VSCodeStream - Error message displayed with the text: " + res.toString().split(':').splice(1).join(':').trim());
	}
}

function showInformationMessageHook(res: WebSocket.Data) {
	logger.Info("VSCodeStream - showInformationMessageHook() called");
	if(res.toString().includes("window.showInformationMessage:") && res.toString().length != 0) {
		vscode.window.showInformationMessage(res.toString().split(':').splice(1).join(':').trim());
		logger.Info("VSCodeStream - Information message displayed with the text: " + res.toString().split(':').splice(1).join(':').trim());
	}
}

function showWarningMessageHook(res: WebSocket.Data) {
	logger.Info("VSCodeStream - showWarningMessageHook() called");
	if(res.toString().includes("window.showWarningMessage:") && res.toString().length != 0) {
		vscode.window.showWarningMessage(res.toString().split(':').splice(1).join(':').trim());
		logger.Info("VSCodeStream - Warning message displayed with the text: " + res.toString().split(':').splice(1).join(':').trim());
	}
}

function createTerminalHook(res: WebSocket.Data) {
	logger.Info("VSCodeStream - createTerminalHook() called");
	if(res.toString().includes("window.createTerminal:")) {
		if(res.toString().split(':').splice(1).join(':').trim().length == 0) {
			vscode.window.createTerminal();
			logger.Info("VSCodeStream - Terminal created");
		} else {
			vscode.window.createTerminal(res.toString().split(':').splice(1).join(':').trim());
			logger.Info("VSCodeStream - Terminal with the name of " + res.toString().split(':').splice(1).join(':').trim() + " created");
		}
	}
}

function saveAllHook(res: WebSocket.Data) {
	logger.Info("VSCodeStream - saveAllHook() called");
	if(res.toString() == "window.saveAll") {
		vscode.workspace.saveAll();
		logger.Info("VSCodeStream - All files saved");
	}
}

function editConfigurationHook(res: WebSocket.Data) {
	logger.Info("VSCodeStream - editConfigurationHook() called");
	if(res.toString().includes("configuration.port:") && res.toString().length != 0) {
		if(isValidPort(Number(res.toString().split(':').splice(1).join(':').trim()))) {
			if(vscode.workspace.name === undefined) {
				vscode.window.showErrorMessage('VSCodeStream - No workspace opened');
				logger.Failure("VSCodeStream - No workspace opened, cannot update port");
			} else {
				vscode.workspace.getConfiguration('vscodestream').update('port', Number(res.toString().split(':').splice(1).join(':').trim()));
				port = Number(res.toString().split(':').splice(1).join(':').trim());
				logger.Info("VSCodeStream - Port updated to " + Number(res.toString().split(':').splice(1).join(':').trim()) + " (restart VSCodeStream to take effect)");
			}
		} else {
			vscode.window.showErrorMessage('VSCodeStream - Port ' + Number(res.toString().split(':').splice(1).join(':').trim()) + ' is invalid... ');
			logger.Info("VSCodeStream - Port kept at " + port);
		}
	} else if(res.toString().includes("configuration.msUpdate:") && res.toString().length != 0) {
		if(!isNaN(Number(res.toString().split(':').splice(1).join(':').trim()))) {
			if(vscode.workspace.name === undefined) {
				vscode.window.showErrorMessage('VSCodeStream - No workspace opened, cannot update msUpdate');
				logger.Failure("VSCodeStream - No workspace opened");
			} else {
				vscode.workspace.getConfiguration('vscodestream').update('msUpdate', Number(res.toString().split(':').splice(1).join(':').trim())).then(f => f);
				logger.Info("VSCodeStream - msUpdate updated to " + Number(res.toString().split(':').splice(1).join(':').trim()));
			}
		} else {
			vscode.window.showErrorMessage('VSCodeStream - msUpdate ' + Number(res.toString().split(':').splice(1).join(':').trim()) + ' is invalid...');
			logger.Info("VSCodeStream - msUpdate kept at " + Number(vscode.workspace.getConfiguration('vscodestream').get('msUpdate')));
		}
	}
}

function stopServer() {
	logger.Info("VSCodeStream - stopServer() called");
	if(serverRunning) {
		server.close((err) => {
			if (err) {
				logger.Failure(err.stack);
			}
			serverRunning = false;
			logger.Info("VSCodeStream - Server on port " +  port + " closed");
		});
	}
}

function getMSUpdate() {
	//logger.Info("VSCodeStream - getMSUpdate() called");
	if(!isNaN(Number(vscode.workspace.getConfiguration('vscodestream').get('msUpdate')))) {
		return Number(vscode.workspace.getConfiguration('vscodestream').get('msUpdate'));
	} else {
		return Number(vscode.workspace.getConfiguration('vscodestream').inspect("msUpdate")?.defaultValue);
	}
}

function getPort() {
	logger.Info("VSCodeStream - getPort() called");
	if(!isValidPort(Number(vscode.workspace.getConfiguration('vscodestream').get('port')))) {
		vscode.window.showErrorMessage('VSCodeStream - Port is invalid... starting on port 8999');
		port = Number(vscode.workspace.getConfiguration('vscodestream').inspect("port")?.defaultValue);
		logger.Failure("VSCodeStream - Port is invalid... starting on port 8999");
	} else {
		port = Number(vscode.workspace.getConfiguration('vscodestream').get('port'));
		logger.Info("VSCodeStream - Port updated to: " + port);
	}
}

function activeTextEditor() {
	//logger.Info("VSCodeStream - activeTextEditor() called");
	if(vscode.window.activeTextEditor === undefined) {
		return {};
	} else {
		return {
			file: {
				path: vscode.window.activeTextEditor?.document.fileName,
				version: vscode.window.activeTextEditor?.document.version,
				languageId: vscode.window.activeTextEditor?.document.languageId,
				uri: vscode.window.activeTextEditor?.document.uri,
				isDirty: vscode.window.activeTextEditor?.document.isDirty,
				eol: vscode.window.activeTextEditor?.document.eol,
				cursorStyle: vscode.window.activeTextEditor?.options.cursorStyle,
				insertSpaces: vscode.window.activeTextEditor?.options.insertSpaces,
				lineNumbers: vscode.window.activeTextEditor?.options.lineNumbers,
				tabSize: vscode.window.activeTextEditor?.options.tabSize,
				selections: vscode.window.activeTextEditor?.selections.map((selection) => {
					return {
						active: selection.active,
						anchor: selection.anchor,
						end: selection.end,
						isEmpty: selection.isEmpty,
						isReversed: selection.isReversed,
						isSingleLine: selection.isSingleLine,
						start: selection.start
					};
				}),
				isClosed: vscode.window.activeTextEditor?.document.isClosed,
				isSaved: vscode.window.activeTextEditor?.document.isUntitled,
				lineCount: vscode.window.activeTextEditor?.document.lineCount,
				name: vscode.window.activeTextEditor?.document.fileName.split('\\')[vscode.window.activeTextEditor?.document.fileName.split('\\').length - 1],
				stats: {
					atime: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).atime,
					atimeMs: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).atimeMs,
					birthtime: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).birthtime,
					birthtimeMs: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).birthtimeMs,
					blksize: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).blksize,
					blocks: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).blocks,
					ctime: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).ctime,
					ctimeMs: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).ctimeMs,
					dev: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).dev,
					gid: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).gid,
					ino: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).ino,
					mode: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).mode,
					mtime: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).mtime,
					mtimeMs: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).mtimeMs,
					nlink: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).nlink,
					rdev: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).rdev,
					size: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).size,
					uid: fs.statSync(fileFsPath(vscode.window.activeTextEditor)).uid
				}
			}
		};
	}
}

function allVisibleTextEditors() {
	//logger.Info("VSCodeStream - allVisibleTextEditors() called");
	return vscode.window.visibleTextEditors.map((textEditor) => {
		return {
			file: {
				path: textEditor.document.fileName,
				version: textEditor.document.version,
				languageId: textEditor.document.languageId,
				uri: textEditor.document.uri,
				isDirty: textEditor.document.isDirty,
				eol: textEditor.document.eol,
				cursorStyle: textEditor.options.cursorStyle,
				insertSpaces: textEditor.options.insertSpaces,
				lineNumbers: textEditor.options.lineNumbers,
				tabSize: textEditor.options.tabSize,
				selections: textEditor.selections.map((selection) => {
					return {
						active: selection.active,
						anchor: selection.anchor,
						end: selection.end,
						isEmpty: selection.isEmpty,
						isReversed: selection.isReversed,
						isSingleLine: selection.isSingleLine,
						start: selection.start
					};
				}),
				isClosed: textEditor.document.isClosed,
				isSaved: textEditor.document.isUntitled,
				lineCount: textEditor.document.lineCount,
				name: textEditor.document.fileName.split('\\')[textEditor.document.fileName.split('\\').length - 1],
				stats: {
					atime: fs.statSync(fileFsPath(textEditor)).atime,
					atimeMs: fs.statSync(fileFsPath(textEditor)).atimeMs,
					birthtime: fs.statSync(fileFsPath(textEditor)).birthtime,
					birthtimeMs: fs.statSync(fileFsPath(textEditor)).birthtimeMs,
					blksize: fs.statSync(fileFsPath(textEditor)).blksize,
					blocks: fs.statSync(fileFsPath(textEditor)).blocks,
					ctime: fs.statSync(fileFsPath(textEditor)).ctime,
					ctimeMs: fs.statSync(fileFsPath(textEditor)).ctimeMs,
					dev: fs.statSync(fileFsPath(textEditor)).dev,
					gid: fs.statSync(fileFsPath(textEditor)).gid,
					ino: fs.statSync(fileFsPath(textEditor)).ino,
					mode: fs.statSync(fileFsPath(textEditor)).mode,
					mtime: fs.statSync(fileFsPath(textEditor)).mtime,
					mtimeMs: fs.statSync(fileFsPath(textEditor)).mtimeMs,
					nlink: fs.statSync(fileFsPath(textEditor)).nlink,
					rdev: fs.statSync(fileFsPath(textEditor)).rdev,
					size: fs.statSync(fileFsPath(textEditor)).size,
					uid: fs.statSync(fileFsPath(textEditor)).uid
				}
			}
		};
	});
}

function isValidPort(portNum: number): boolean {
	//logger.Info("VSCodeStream - isValidPort() called");
	return Number.isSafeInteger(portNum) && (portNum >= 0 && portNum <= 65539);
}

function fileFsPath(editor: vscode.TextEditor | undefined): any {
	//logger.Info("VSCodeStream - fileFsPath() called");
	return editor?.document.uri.fsPath;
}

function getErrorCode(error: Error, errorcode: string) {
	if(error.message.includes(errorcode)) {
		return true;
	} else {
		return false;
	}
}


process.on('unhandledRejection', (warning) => {
	logger.Failure(warning);
});

process.on('uncaughtException', (err) => {
	if(getErrorCode(err, "EADDRINUSE")) {
		const newServer = server.listen(0);
		const newPort = JSON.parse(JSON.stringify(newServer.address())).port;
		logger.Warning(`VSCodeStream ----- Port ${port} is busy, using port ${newPort} -----`);
		vscode.window.showWarningMessage(`VSCodeStream ----- Port ${port} is busy, using port ${newPort} -----`);
		port = newPort;
	} else {
		logger.Failure(err.stack);
	}
});