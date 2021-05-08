export class JSONStruct {
    vscode: any;
    wss: any;
    getMSUpdate: any;
    allVisibleTextEditors: any;
    activeTextEditor: any;
    constructor(vscode: any, wss: any, getMSUpdate: any, allVisibleTextEditors: any, activeTextEditor: any) {
        this.vscode = vscode;
        this.wss = wss;
        this.getMSUpdate = getMSUpdate;
        this.allVisibleTextEditors = allVisibleTextEditors;
        this.activeTextEditor = activeTextEditor;
    }

    JSON() {
        return {
            appName: this.vscode.env.appName,
            appRoot: this.vscode.env.appRoot,
            version: this.vscode.version,
            connections: this.wss.clients.size,
            sendInterval: this.getMSUpdate,
            language: this.vscode.env.language,
            workspace: {
                workspaceName: this.vscode.workspace.name,
                workspaceFolders: this.vscode.workspace.workspaceFolders
            },
            textEditor: {
                allVisibleTextEditors: this.allVisibleTextEditors,
                activeTextEditor: this.activeTextEditor
            },
            terminal: {
                activeTerminal: this.vscode.window.activeTerminal?.name,
                activeTerminalProcessID: this.vscode.window.activeTerminal?.processId,
                terminals: this.vscode.window.terminals.length
            },
            debug: {
                breakpoints: this.vscode.debug.breakpoints
            },
            tasks: {
                taskExecutions: this.vscode.tasks.taskExecutions.map((task: { task: any; }) => {
                    return {
                        task: task.task
                    };
                })
            },
            window: {
                state: this.vscode.window.state
            },
            extensions: this.vscode.extensions.all.map((extension: { extensionPath: any; id: any; isActive: any; }) => {
                return {
                    extensionPath: extension.extensionPath,
                    id: extension.id,
                    isActive: extension.isActive
                };
            })
        };
    }
}