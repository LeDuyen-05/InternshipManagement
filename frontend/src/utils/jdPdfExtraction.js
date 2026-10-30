import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { pdfItemsToLines } from './pdfTextLayout.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export async function extractPdfText(file) {
  let document
  try {
    const data = new Uint8Array(await file.arrayBuffer())
    document = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise
  } catch {
    throw new Error('Không đọc được PDF. Hãy kiểm tra file không bị hỏng/đặt mật khẩu hoặc dán nội dung JD.')
  }

  try {
    const pages = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push(pdfItemsToLines(content.items))
    }
    return pages.join('\n\n').trim()
  } finally {
    await document.destroy()
  }
}
