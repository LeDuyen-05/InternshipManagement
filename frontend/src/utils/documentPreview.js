export function documentPreviewType(row) {
  const extension = row?.fileName?.split('.').pop()?.toLowerCase()
  if (row?.contentType === 'application/pdf' && extension === 'pdf') return 'application/pdf'
  if (row?.contentType === 'image/png' && extension === 'png') return 'image/png'
  if (row?.contentType === 'image/jpeg' && ['jpg', 'jpeg'].includes(extension)) return 'image/jpeg'
  return null
}
