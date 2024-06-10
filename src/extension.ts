import * as vscode from 'vscode';
import * as os from 'os';

// Function to return whether a line is empty, excluding whitespace characters
function isLineEmpty(line: string): boolean {
    return line.trim().length === 0;
}

function removeEmptyLines(currentLines: string[], emptyLinesBetween: number, emptyLinesBehind: number, focusedLine: number): string[] {
    let newLines: string[] = [];
    let emptyIsFocused = false;
    let trailingEmptyLines: string[] = [];

    for (let i: number = 0; i < currentLines.length; i++) {
        const line = currentLines[i];

        if (isLineEmpty(line)) {
            // Check whether the current empty line is focused
            if (i === focusedLine) {
                emptyIsFocused = true;
            }

            trailingEmptyLines.push(line);
        } else {
            // Handle trailing empty lines
            if (trailingEmptyLines.length > 0) {
                if (!emptyIsFocused && emptyLinesBetween >= 0) {
                    trailingEmptyLines = trailingEmptyLines.slice(0, emptyLinesBetween);
                }
                
                emptyIsFocused = false;
                newLines.push(...trailingEmptyLines);
                trailingEmptyLines = [];
            }

            newLines.push(line);
        }
    }

    // Handle empty lines at the end of the file
    if (emptyIsFocused || emptyLinesBehind < 0) {
        newLines.push(...trailingEmptyLines);
    } else {
        newLines.push(...Array(emptyLinesBehind).fill(""));
    }

    return newLines;
}

// Variable to handle debouncing self-inflicted saves
let debounce = false;

async function collectAndActivate(document: vscode.TextDocument): Promise<void> {
    const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
    if (!editor || debounce) { return; }

    const currentContent: string = document.getText();
    const currentLines: string[] = currentContent.split(os.EOL);

    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("empty-lines");
    const emptyLinesBetween: number = config.get<number>("emptyLinesBetweenCode", 1);
    const emptyLinesBehind: number = config.get<number>("emptyLinesBehindCode", 2);

    const focusedLine: number = editor.selection.active.line;
    const newLines: string[] = removeEmptyLines(currentLines, emptyLinesBetween, emptyLinesBehind, focusedLine);

    const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
    const fullRange: vscode.Range = new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(currentLines.length, document.lineAt(currentLines.length - 1).text.length)
    );
    edit.replace(document.uri, fullRange, newLines.join(os.EOL));

    debounce = true;
    await vscode.workspace.applyEdit(edit);
    await document.save();
    debounce = false;
}

export function activate(context: vscode.ExtensionContext) {
    let disposable: vscode.Disposable = vscode.commands.registerCommand('extension.format', document => {
        collectAndActivate(document);
    });

    context.subscriptions.push(disposable);

    vscode.workspace.onDidSaveTextDocument(document => {
        collectAndActivate(document);
    });
}

export function deactivate() { }
