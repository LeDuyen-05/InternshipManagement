export function pdfItemsToLines(items) {
  const lines = []
  const orderedItems = items
    .filter(item => item.str?.trim())
    .map(item => ({
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
      text: item.str.trim(),
    }))
    .sort((left, right) => right.y - left.y || left.x - right.x)

  for (const item of orderedItems) {
    let line = lines.at(-1)
    if (!line || Math.abs(line.y - item.y) > 2) {
      line = { y: item.y, items: [] }
      lines.push(line)
    }
    line.items.push(item)
  }

  return lines
    .sort((left, right) => right.y - left.y)
    .map(line => line.items.sort((left, right) => left.x - right.x).map(item => item.text).join(' '))
    .filter(Boolean)
    .join('\n')
}
