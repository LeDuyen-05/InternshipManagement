import { getJdFileType, validateJdFile } from './jdUpload.js'

export async function extractJdText(file) {
  const validationError = validateJdFile(file)
  if (validationError) throw new Error(validationError)

  const fileType = getJdFileType(file.name)
  if (fileType === 'text') return (await file.text()).replace(/^\uFEFF/, '').trim()

  if (fileType === 'word') {
    const { extractDocxText } = await import('./jdDocxExtraction.js')
    return extractDocxText(file)
  }

  const { extractPdfText } = await import('./jdPdfExtraction.js')
  return extractPdfText(file)
}
