import { warning } from '@actions/core'
import { ErrorTs } from './main'

export type FileWithLineNumbers = { path: string, added: number[], removed: number[] }

type Input = {
    errorsBefore: any[]
    errorsAfter: any[]
    filesChanged: string[]
    filesAdded: string[]
    filesDeleted: string[]
    lineNumbers: FileWithLineNumbers[]
}

type Result = {
    errorsAdded: any[]
}

/**
 * Compare TS errors from the current and base branches
 */
export function compareErrors({ errorsBefore, errorsAfter, filesChanged, filesAdded, lineNumbers }: Input): Result {
    
     // Transform errors from the 'errorsBefore' array
     const errorsBeforeTransformed: (any & { lineInPr: number })[] = errorsBefore.map(errBefore => {

        const errorBeforeFileName = errBefore.value.path.value;
        const errorBeforeLineInPr = errBefore.value.cursor.value.line;

        // Check if the file containing the error has been modified
        const isModified = filesChanged.includes(errorBeforeFileName);
        if (!isModified) {
            // If file not modified, assign the existing line number to 'lineInPr'
            return {
                ...errBefore,
                lineInPr: errorBeforeLineInPr
            };
        }

        // If file is modified, calculate the new line number
        const lineNumbersForThisFile = lineNumbers.find(o => o.path === errorBeforeFileName);
        if (!lineNumbersForThisFile) {
            // If line numbers not found for the file, log a warning and use original line number
            warning(`Unable to find line numbers for file ${errorBeforeFileName}`);
            return {
                ...errBefore,
                lineInPr: errorBeforeLineInPr
            };
        }
        const linesAddedBeforeLine = lineNumbersForThisFile.added.filter(n => n <= errorBeforeLineInPr);
        const linesRemoveBeforeLine = lineNumbersForThisFile.removed.filter(n => n <= errorBeforeLineInPr);
        const newLineNumber = errorBeforeLineInPr + linesAddedBeforeLine.length - linesRemoveBeforeLine.length;
        
        // Return the error object with the adjusted line number
        return {
            ...errBefore,
            lineInPr: newLineNumber
        };
    });

    // Identify errors added in the current state compared to the base state
    const errorsAdded: ErrorTs[] = errorsAfter.reduce((newErrors, errAfter) => {

        const errorAfterFileName = errAfter.value.path.value;
        const errorAfterLineInPr = errAfter.value.cursor.value.line;
        const errorAfterCode = errAfter.value.tsError.value.errorString;
        const errorAfterMessage = errAfter.value.message.value;

        // Check if the error is in a newly added file
        const isErrorInNewFile = filesAdded.includes(errorAfterFileName);
        if (isErrorInNewFile) {
            // If error is in a newly added file, add it to 'newErrors' array
            newErrors.push(errAfter);
            return newErrors;
        }

        // Check if the error is strictly the same as any error in 'errorsBeforeTransformed' array
        let isNew = true;
        const isStrictlySameExisting = errorsBeforeTransformed.find(errBefore => {
            const errorBeforeFileName = errBefore.value.path.value;
            const errorBeforeLineInPr = errBefore.value.cursor.value.line;
            const errorBeforeCode = errBefore.value.tsError.value.errorString;
            const errorBeforeMessage = errBefore.value.message.value;

            const isInSameFile = errorBeforeFileName === errorAfterFileName;
            return isInSameFile && errorBeforeCode === errorAfterCode && errorAfterMessage === errorBeforeMessage && errorBeforeLineInPr === errorAfterLineInPr;
        });
        if (isStrictlySameExisting) {
            // If error is strictly the same as an error in 'errorsBeforeTransformed', mark it as not new
            isNew = false;
        }

        // If error is new, add it to 'newErrors' array
        if (isNew) {
            newErrors.push(errAfter);
        }
        return newErrors;
    }, [] as any[]);

    // Return an object containing the errors added in the current state
    return {
        errorsAdded
    };
}
