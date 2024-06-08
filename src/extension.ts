import * as vscode from 'vscode';

// The main function of the extension
function addEmptyLines() {
	const config = vscode.workspace.getConfiguration('yourExtensionName');
	const emptyLinesCount = config.get<number>('emptyLinesCount', 2);
	
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return; // No active editor
    }

    const document = editor.document;
    const lastLine = document.lineAt(document.lineCount - 1);
    const range = new vscode.Range(lastLine.range.end, lastLine.range.end);

    // Set the amount of lines
    const emptyLines = '\n'.repeat(emptyLinesCount);

    editor.edit(editBuilder => {
        editBuilder.insert(range.end, emptyLines);
    });
}

export function activate(context: vscode.ExtensionContext) {
    // Register command to trigger adding empty lines
    let disposable = vscode.commands.registerCommand('extension.addEmptyLines', () => {
        addEmptyLines();
    });

    context.subscriptions.push(disposable);

    // Add empty lines when a document is saved
    vscode.workspace.onDidSaveTextDocument(() => {
        addEmptyLines();
    });
}

export function deactivate() {}