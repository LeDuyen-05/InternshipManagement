const brokenEncoding = /\u00c3[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]|\u00e1[\u00ba\u00bb]|\u00c4[\u0080-\u00bf\u2018\u0192]|\u00c6[\u00a0-\u00bf]|\u00e2\u20ac/
const utf8Decoder = new TextDecoder('utf-8', { fatal: true })
const utf8Encoder = new TextEncoder()
const windowsSpecial = '\u20ac\u0081\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u008d\u017d\u008f\u0090\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u009d\u017e\u0178'
const windowsCharacters = Array.from({ length: 256 }, (_, byte) => byte >= 128 && byte < 160 ? windowsSpecial[byte - 128] : String.fromCharCode(byte))
const windowsBytes = new Map(windowsCharacters.map((character, byte) => [character, byte]))

function restoreWord(word) {
  if (!brokenEncoding.test(word) || /https?:\/\//i.test(word)) return word
  let restored = word
  for (let pass = 0; pass < 2 && brokenEncoding.test(restored); pass++) {
    const bytes = Array.from(restored, character => windowsBytes.get(character))
    if (bytes.some(byte => byte === undefined)) break
    try {
      const candidate = utf8Decoder.decode(Uint8Array.from(bytes))
      if (Array.from(utf8Encoder.encode(candidate), byte => windowsCharacters[byte]).join('') !== restored) break
      restored = candidate
    } catch { break }
  }
  return restored
}

// Khôi phục cả địa điểm bị lỗi mã hóa; không đổi chữ đúng hoặc đường dẫn cuộc họp.
export function formatInterviewMethod(value) {
  if (value == null || !String(value).trim()) return 'Chưa cập nhật hình thức phỏng vấn'
  return String(value).trim().split(/([ \t\r\n]+)/).map(restoreWord).join('')
    .replaceAll('Trá»±c tiáº¿p', 'Trực tiếp')
    .replaceAll('Tr?c ti?p', 'Trực tiếp')
    .replaceAll('Trá»±c tuyáº¿n', 'Trực tuyến')
    .replaceAll('Tr?c tuy?n', 'Trực tuyến')
}
