export const PAGE_SIZES = [10, 20, 50]

export function paginate(items, requestedPage = 1, requestedSize = 10) {
  const pageSize = PAGE_SIZES.includes(Number(requestedSize)) ? Number(requestedSize) : 10
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const number = Number(requestedPage)
  const page = Math.min(totalPages, Math.max(1, Number.isFinite(number) ? Math.trunc(number) : 1))
  const offset = (page - 1) * pageSize
  return {
    items: items.slice(offset, offset + pageSize), page, pageSize, totalItems, totalPages,
    start: totalItems ? offset + 1 : 0, end: Math.min(offset + pageSize, totalItems),
  }
}

export function paginationPages(page, totalPages) {
  const numbers = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter(number => number >= 1 && number <= totalPages).sort((a, b) => a - b)
  return numbers.flatMap((number, index) => index && number - numbers[index - 1] > 1 ? ['…', number] : [number])
}
