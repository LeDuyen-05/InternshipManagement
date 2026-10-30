import mammoth from 'mammoth/mammoth.browser.js'

export async function extractDocxText(file) {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return result.value.trim()
  } catch {
    throw new Error('Không đọc được file Word .docx. Hãy kiểm tra file không bị hỏng/đặt mật khẩu hoặc dán nội dung JD.')
  }
}
