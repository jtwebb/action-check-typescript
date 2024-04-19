import { warning } from '@actions/core'
import { ErrorTs } from './main'

export type FileWithLineNumbers = { path: string, added: number[], removed: number[] }

type Input = {
    errorsBefore: ErrorTs[]
    errorsAfter: ErrorTs[]
    filesChanged: string[]
    filesAdded: string[]
    filesDeleted: string[]
    lineNumbers: FileWithLineNumbers[]
}

type Result = {
    errorsAdded: ErrorTs[]
}

/**
 * Compare errors from the current and base branches
 */
export function compareErrors({ errorsBefore, errorsAfter, filesChanged, filesAdded, lineNumbers }: Input): Result {

    /*
        Determine line numbers of the errors in the base branch. If the file is modified in the current branch, we will 
    */
    const errorsBeforeTransformed: (ErrorTs & { lineInPr: number })[] = errorsBefore.map(errBefore => {

        const isModified = filesChanged.includes(errBefore.fileName)
        if (!isModified) {
            return {
                ...errBefore,
                lineInPr: errBefore.line
            }
        }

        const lineNumbersForThisFile = lineNumbers.find(o => o.path === errBefore.fileName)
        if (!lineNumbersForThisFile) {
            warning(`Unable to find line numbers for file ${errBefore.fileName}`)
            return {
                ...errBefore,
                lineInPr: errBefore.line
            }
        }
        const linesAddedBeforeLine = lineNumbersForThisFile.added.filter(n => n <= errBefore.line)
        const linesRemoveBeforeLine = lineNumbersForThisFile.removed.filter(n => n <= errBefore.line)
        const newLineNumber = errBefore.line + linesAddedBeforeLine.length - linesRemoveBeforeLine.length
        return {
            ...errBefore,
            lineInPr: newLineNumber
        }
    })

    const errorsAdded: ErrorTs[] = errorsAfter.reduce((newErrors, errAfter) => {

        const isErrorInNewFile = filesAdded.includes(errAfter.fileName)
        if (isErrorInNewFile) {
            newErrors.push(errAfter)
            return newErrors
        }
        let isNew = true
        const isStrictlySameExisting = errorsBeforeTransformed.find(errBefore => {
            const isInSameFile = errBefore.fileName === errAfter.fileName
            return isInSameFile && errBefore.code === errAfter.code && errAfter.message === errBefore.message && errBefore.lineInPr === errAfter.line
        })
        if (isStrictlySameExisting) {
            isNew = false
        }
        if (isNew) {
            newErrors.push(errAfter)
        }
        return newErrors
    }, [] as ErrorTs[])

    return {
        errorsAdded
    }

}
