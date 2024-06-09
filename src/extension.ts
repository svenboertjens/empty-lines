/* eslint-disable eqeqeq */
import * as vscode from 'vscode';
import * as os from 'os';

// Function to return whether a line is empty, excluding whitespace characters
function isLineEmpty(line: string): boolean {
	return line.trim().length === 0;
}

// List of languages that use curly brackets to indicate code blocks
const bracketPairLanguages: string[] = [
    "javascript",
    "go",
    "kotlin",
    "swift",
    "c",
    "cpp",
    "cs",
    "css",
    "typescript",
    "json",
    "rust",
    "go",
    "scala",
    "php",
    "ruby",
    "perl",
    "dart",
    "r",
    "haskell",
    "groovy",
    "julia",
    "shellscript"
];

// Function to get the indentation level of a line
function getIndentation(line: string): number {
    // Match leading whitespace characters using an expression
    const match = line.match(/^\s*/);
    // If there's a match, return the length of the matched whitespace. Else return 0
    return match ? match[0].length : 0;
}

// Function to ensure a number isn't negative
function ensureNonNegative(num: number): number {
    // If num is less than 0, return 0, otherwise return num
    return num < 0 ? 0 : num;
}

// Function to add indentation to a line
function addIndentation(line: string, indentationCharacter: string, requiredIndentation: number): string {
    // Get the current indentation of the line
    const currentIndentation: number = getIndentation(line);
    const toAdd: number = ensureNonNegative(requiredIndentation - currentIndentation);

    // Add additional indentation
    const indentedLine: string = indentationCharacter.repeat(toAdd) + line;

    return indentedLine;
}

// Function to get the indentation used in the current file
function getIndentationType(document: vscode.TextDocument): string {
    const firstNonEmptyLine = document.getText().match(/[^\s]/m);
    if (firstNonEmptyLine) {
        const indentation = firstNonEmptyLine[0].match(/^\s*/);
        if (indentation) {
            return indentation[0];
        }
    }
    // Default to using four spaces for indentation
    return "    ";
}

const stringCharacters: string[] = [
    "'",
    '"',
    "`"
];

function verifyBrackets(line: string): number {
    let inString: boolean = false;
    let stringChar: string = "";
    let bracketOpen: number = 0;

    for (let i: number = 0; i < line.length; i++) {
        const char = line[i];

        // Check whether we are inside of a string
        if (stringCharacters.includes(char)) {
            if (inString && stringChar === char) {
                inString = false;
                stringChar = "";
            } else if (stringChar === "") {
                inString = true;
                stringChar = char;
            }
            // Check for bracket opens and closes
        } else if (!inString) {
            if (char == "{") {
                bracketOpen = 1;
            } else if (char == "}") {
                if (bracketOpen == 1) {
                    bracketOpen = 0;
                } else {
                    bracketOpen = 2;
                }
            }
        }
    }

    return bracketOpen;
}

// Function that returns whether the current line is focused. Returns true if `isFocused` is already true
function isLineFocused(focusedLine: number, currentLine: number, isFocused: boolean): boolean {
    return isFocused || focusedLine === currentLine;
}

function removeEmptyLines(
        document: vscode.TextDocument,
        i: number,
        totalLines: number,
        focusedLine: number,
        emptyLinesBetween: number,
        focusOn: number,
        fixIndentation: boolean,
        indentationCharacter: string
    ): [string[], number] {
    let currLine: string = document.lineAt(i).text;
    let emptyAmount: number = 0;
    let emptyLines: string[] = [];
    let nonEmptyLines: string[] = [];
    let isFocused: boolean = false;

    // Get the indentation of the line before
    let indentationBefore: number = 0;
    if (fixIndentation && i > 0) {
        const lineBefore: string = document.lineAt(i - 1).text;
        indentationBefore = getIndentation(lineBefore);

        // Increment indentation by 1 if the next line opens a code block (thus has an indentation lower by one)
        if (verifyBrackets(lineBefore) == 1) {
            indentationBefore++;
        }
    }

    // Check whether the code block before the empty lines is selected
    let currentIndentation = getIndentation(currLine);
    if (focusOn == 2 && i > 0) {
        let indentation: number;

        for (let j: number = i - 1; j > -1; j--) {
            // Get the current line and its indentation
            const lineBefore: string = document.lineAt(j).text;
            indentation = getIndentation(lineBefore);
            
            // Check whether we need to stop checking lines
            if (isFocused || indentation !== currentIndentation) {
                break;
            }

            // Check whether the current line is focused
            isFocused = isLineFocused(focusedLine, j, isFocused);
        }
    }

    // Get all empty lines
    while (isLineEmpty(currLine)) {
        emptyAmount++;

        // Check if the current line is focused
        isFocused = isLineFocused(focusedLine, i, isFocused);

        // Add current line to the empty row
        emptyLines.push(currLine);

        // Increment iterator and check if end is reached
        i++;
        if (i === totalLines) {
            break;
        }

        // Get the next line
        currLine = document.lineAt(i).text;
    }

    // Compare current indentation to before/after indentation and correct it if necessary
    if (fixIndentation && i !== totalLines) {
        let indentationAfter = getIndentation(currLine);

        // Increment indentation by 1 if the next line closes a code block (thus has an indentation lower by one)
        if (verifyBrackets(currLine) == 2) {
            indentationAfter++;
        }

        if (indentationBefore == indentationAfter && currentIndentation != indentationBefore) {
            currentIndentation = indentationBefore;
        }
    }

    if (i < totalLines && focusOn === 2) {
        let indentation: number = currentIndentation;

        while (indentation === currentIndentation) {
            // Add line to the non-empty row
            nonEmptyLines.push(currLine);

            // Get the indentation of the current line
            indentation = getIndentation(currLine);

            // Increment iterator and check if end is reached
            i++;
            if (i === totalLines || indentation !== currentIndentation) {
                break;
            }

            // Check if the current line is focused
            isFocused = isLineFocused(focusedLine, i, isFocused);

            // Get the next line
            currLine = document.lineAt(i).text;
        }
    }

    // Calculate the amount of lines to exclude
    const excludeAmount: number = emptyAmount - emptyLinesBetween;

    // Set `isFocused` to false if it's not to be checked for
    isFocused = focusOn !== 0 && isFocused;

    // Remove all extra empty lines if the row isn't focused
    if (!isFocused && excludeAmount > 0) {
        for (let j = 0; j < excludeAmount; j++) {
            emptyLines.pop();
        }
    }

    // Correct all other empty lines if the current block isn't focused
    if (focusOn == 2 && emptyLinesBetween >= 0) {
        // Add the amount of lines that'll be checked here to `i` to skip over them later
        i += nonEmptyLines.length;
        // Check whether further empty lines should be removed
        if (!isFocused && emptyLinesBetween >= 0) {
            let trailingEmpty = 0;

            // Iterate over all lines and correct excessive trailing empty lines
            for (let j: number = 0; j < nonEmptyLines.length; j++) {
                // Check whether j is bigger than the array length, as the for-condition isn't updated
                if (j >= nonEmptyLines.length) {
                    break;
                }

                // Get the current line
                currLine = nonEmptyLines[j];

                if (isLineEmpty(currLine)) {
                    trailingEmpty++;

                    // Check whether the current empty line is excessive, remove if that's the case
                    if (trailingEmpty > emptyLinesBetween) {
                        nonEmptyLines.splice(j, 1);
                        // Decrement j to not skip over lines, as one is removed
                        j--;
                    }
                } else {
                    trailingEmpty = 0;
                }
            }
        }
    }

    // Correct indentation of empty lines
    if (fixIndentation && currentIndentation !== 0) {
        // Put all lines together in the `emptyLines` list and empty the other
        emptyLines.push(...nonEmptyLines);
        nonEmptyLines = [];

        for (let j: number = 0; j < emptyLines.length; j++) {
            currLine = addIndentation(emptyLines[j], indentationCharacter, currentIndentation);
            emptyLines[j] = currLine;
        }
    }

    // Decrease iterator by one to not skip over last non-empty line, if exists
    if (i !== totalLines) {
        i--;
    }

    // Add non-empty lines to the list
    emptyLines.push(...nonEmptyLines);

    return [emptyLines, i];
}

const focusStringToNumber: { [key: string]: number } = {
    "None": 0,
    "Empty": 1,
    "Block": 2
};

// The main function of the extension
async function addEmptyLines() {
    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("empty-lines");
    const isEnabled: boolean = config.get<boolean>("enabled", true);
    // Do nothing if not enabled
    if (!isEnabled) {
        return;
    }
    
    const emptyLinesBetween: number = config.get<number>("emptyLinesBetweenCode", 1);
    const emptyLinesBehind: number = config.get<number>("emptyLinesBehindCode", 2);
    const fixUnknownIndentation: boolean = config.get<boolean>("fixUnknownLanguageIndentation", false);
    const preserveFocusedLines: string = config.get<string>("preserveFocusedLines", "Block");

    const focusOn: number = focusStringToNumber[preserveFocusedLines];

    const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
    if (!editor) {
        return; // No active editor
    }

    // Get some values about the focused document
    const document: vscode.TextDocument = editor.document;
    const totalLines: number = document.lineCount;
    const processedLines: string[] = [];
    const focusedLine: number = editor.selection.active.line;
    const indentationCharacter: string = getIndentationType(document);

    // Decide whether indentation should be fixed
    const language: string = document.languageId;
    const fixIndentation: boolean = config.get<boolean>("fixIndentation", true) && (bracketPairLanguages.includes(language) || fixUnknownIndentation);

    // Iterate over all document lines and take action when necessary
    for (let i = 0; i < totalLines; i++) {
        const line: string = document.lineAt(i).text;

        // Check whether the line is empty
        if (isLineEmpty(line)) {
            const results: any[] = removeEmptyLines(document, i, totalLines, focusedLine, emptyLinesBetween, focusOn, fixIndentation, indentationCharacter);

            // Add lines to the list
            processedLines.push(...results[0]);
            // Update iterator
            i = results[1];
        } else {
            // Simply add the line
            processedLines.push(line);
        }
    }

    if (emptyLinesBehind >= 0) {
        // Remove all trailing empty lines
        let firstTrailingEmpty: number = 0;
        for (let i: number = processedLines.length - 1; i > -1; i--) {
            if (!isLineEmpty(processedLines[i])) {
                firstTrailingEmpty = i + 1;
                break;
            }
        }

        // Only apply changes if a trailing empty line isn't focused
        if (focusedLine < firstTrailingEmpty) {
            const lineCount: number = processedLines.length;
            
            // Add empty lines if not enough, else remove excessive empty lines
            if (firstTrailingEmpty + emptyLinesBehind > lineCount) {
                for (let i: number = firstTrailingEmpty; i < lineCount; i++) {
                    processedLines.push("");
                }
            } else {
                for (let i: number = lineCount; i > firstTrailingEmpty + emptyLinesBehind; i--) {
                    processedLines.pop();
                }
            }
        }
	}

    // Replace the document content with the modified content
    const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
    const fullRange: vscode.Range = new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(totalLines, document.lineAt(totalLines - 1).text.length)
    );
	edit.replace(document.uri, fullRange, processedLines.join(os.EOL));
	
    // Apply changes
    await vscode.workspace.applyEdit(edit);
    await document.save();
}

export function activate(context: vscode.ExtensionContext) {
    // Register command to trigger adding empty lines
    let disposable: vscode.Disposable = vscode.commands.registerCommand('extension.addEmptyLines', () => {
        addEmptyLines();
    });

    context.subscriptions.push(disposable);

    // Add empty lines when a document is saved
    vscode.workspace.onDidSaveTextDocument(() => {
        addEmptyLines();
    });
}

export function deactivate() {}

