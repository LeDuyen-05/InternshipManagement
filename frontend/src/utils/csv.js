export function downloadCsv(filename, rows) {
  const csv =
    '\uFEFF' +
    rows
      .map((r) =>
        r
          .map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`)
          .join(',')
      )
      .join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
