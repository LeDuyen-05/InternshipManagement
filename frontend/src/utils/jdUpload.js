export const MAX_JD_FILE_SIZE_BYTES = 20 * 1024 * 1024

const JD_FILE_TYPES = {
  '.txt': 'text',
  '.docx': 'word',
  '.pdf': 'pdf',
}

export function getJdFileType(fileName = '') {
  const extension = fileName.toLowerCase().match(/\.[^.]+$/)?.[0]
  return JD_FILE_TYPES[extension] || null
}

export function validateJdFile(file) {
  if (!file) return 'Vui lòng chọn file JD.'

  const fileType = getJdFileType(file.name)
  if (!fileType) return 'Chỉ hỗ trợ file .txt, .docx và .pdf. File Word .doc cũ chưa được hỗ trợ.'
  if (file.size <= 0) return 'File đang trống, vui lòng chọn file khác.'
  if (file.size > MAX_JD_FILE_SIZE_BYTES) return 'File JD vượt quá 20 MB. Vui lòng chọn file nhỏ hơn.'

  return null
}
