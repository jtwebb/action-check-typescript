import { compareErrors, FileWithLineNumbers } from '../src/compareErrors'
import { outputBaseBranch } from './test_compare_1/outputBaseBranch'
import { errorsCurrentBranch } from './test_compare_1/errorsCurrentBranch'
import { errorsBaseBranch } from './test_compare_1/erreursBaseBranch'
import { lineNumbers } from './test_compare_1/lineNumbers'
import { filesAdded, filesModified, filesRemoved } from './test_compare_1/filesChanged'

import { escapeForMarkdown, getBodyComment } from '../src/getBodyComment'

test('1. compareErrors', () => {

  const errorsBefore: ErrorTs[] = [{
    message: 'test',
    line: 3,
    column: 20,
    code: 60312,
    fileName: 'src/fakeErrors.ts',
    fileNameResolved: 'src/fakeErrors.ts'
  }]

  const errorsAfter: ErrorTs[] = [{
    message: 'test',
    line: 3,
    column: 20,
    code: 60312,
    fileName: 'src/fakeErrors.ts',
    fileNameResolved: 'src/fakeErrors.ts'
  }, {
    message: 'test2',
    line: 10,
    column: 20,
    code: 60312,
    fileName: 'src/fakeErrors.ts',
    fileNameResolved: 'src/fakeErrors.ts'
  }]

  const lineNumbers: FileWithLineNumbers[] = [{
    path: 'src/fakeErrors.ts',
    added: [2],
    removed: [2]
  }]

  const { errorsAdded } = compareErrors({
    errorsBefore: errorsBefore,
    errorsAfter: errorsAfter,
    lineNumbers: lineNumbers,
    filesChanged: ['src/fakeErrors.ts'],
    filesDeleted: [],
    filesAdded: []
  })

  expect(errorsAdded).toHaveLength(1)
  expect(errorsAdded[0].message).toEqual("test2")

})

test('4. Parsing output', () => {
  const parsedErrors = parseOutputTsc(outputBaseBranch)
  expect(parsedErrors).toHaveLength(1252)
  expect(parsedErrors[0]).toHaveProperty('extraMsg')
  expect(parsedErrors[0].extraMsg).toEqual("Type 'LastCnt' is missing the following properties from type 'SelectionPeriaDataCnt': catc_id, src_id")
})

test('5. compare errors test 1', () => {

  const resultCompareErrors = compareErrors({
    errorsBefore: errorsBaseBranch,
    errorsAfter: errorsCurrentBranch,
    filesChanged: filesModified.split(' '),
    filesAdded: filesAdded.split(' '),
    filesDeleted: filesRemoved.split(' '),
    lineNumbers: lineNumbers
  })

  expect(resultCompareErrors.errorsAdded).toHaveLength(15)

  const errorsInModifiedFiles = errorsCurrentBranch.filter(err => {
    return filesModified.concat(filesAdded).includes(err.fileName)
  })

  const newErrorsInModifiedFiles = resultCompareErrors.errorsAdded.filter(err => {
    return filesModified.concat(filesAdded).includes(err.fileName)
  })

  const comment = getBodyComment({
    errorsInProjectBefore: errorsBaseBranch as unknown as ErrorTs[],
    errorsInProjectAfter: errorsCurrentBranch as unknown as ErrorTs[],
    newErrorsInProject: resultCompareErrors.errorsAdded,
    errorsInModifiedFiles: errorsInModifiedFiles as unknown as ErrorTs[],
    newErrorsInModifiedFiles
  })

  expect(comment).toMatch(/\*\*15 new errors added\*\*/)
  expect(comment).toMatch(/\*\*15 new errors added\*\*/)

})

test('6.1 escapeForMarkdown', () => {
  expect(escapeForMarkdown('|')).toEqual("\\|")
})

test('6.2 escapeForMarkdown', () => {
  expect(escapeForMarkdown("Type 'boolean' is not assignable to type 'string | number'.")).toEqual("Type 'boolean' is not assignable to type 'string \\| number'.")
})
