/* eslint-disable eqeqeq */
import * as vscode from 'vscode';

function getIndentation(line: string): number {
    const match = line.match(/^\s*/);
    return match ? match[0].length : 0;
}

function isLineEmpty(line: string): boolean {
    return /^\s*$/.test(line);
}

// The main function of the extension
async function addEmptyLines() {
    const config = vscode.workspace.getConfiguration('yourExtensionName');
    const emptyLinesBetween = config.get<number>('emptyLinesBetweenCode', 2);
    const emptyLinesBehind = config.get<number>('emptyLinesBehindCode', 2);

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return; // No active editor
    }

    const document = editor.document;
    const totalLines = document.lineCount;

    const processedLines: string[] = [];
    let emptyAmount = 0;

    const focusedLine = editor.selection.active.line;
    let emptyIsFocused = false;

    for (let i = 0; i < totalLines; i++) {
        const line = document.lineAt(i).text;

        if (isLineEmpty(line)) {
            emptyAmount++;
            if (i == focusedLine) {
                emptyIsFocused = true;
            }
            if (emptyAmount <= emptyLinesBetween || emptyIsFocused) {
                processedLines.push(line);
            }
        } else {
            // Fill the empty lines if needed
            if (emptyAmount > 0) {
                if (!emptyIsFocused && emptyAmount < emptyLinesBetween) {
                    const emptyLine = " ".repeat(getIndentation(line));
                    for (let j = emptyAmount; j < emptyLinesBetween; j++) {
                        processedLines.push(emptyLine);
                    }
                }
                emptyAmount = 0;
                emptyIsFocused = false;
            }
            processedLines.push(line);
        }
    }

    if (emptyLinesBehind >= 0) {
        // Remove all trailing empty lines
        while (processedLines.length > 0 && isLineEmpty(processedLines[processedLines.length - 1])) {
            processedLines.pop();
        }

        // Add empty lines
        for (let i = 0; i < emptyLinesBehind; i++) {
            processedLines.push("");
        }
    }

    // Replace the document content with the modified content
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(totalLines, document.lineAt(totalLines - 1).text.length)
    );
    edit.replace(document.uri, fullRange, processedLines.join('\n'));

    await vscode.workspace.applyEdit(edit);
    await document.save();
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
