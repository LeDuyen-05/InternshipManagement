/**
 * Chuẩn hóa tên và phân loại đợt thực tập. Hai loại mặc định là Thực tập nghề nghiệp (TTNN) và Thực tập kỹ sư (TTKS);
 * các loại khác do Quản trị viên thêm vào danh mục (VD: thực tập tốt nghiệp của khoa kinh tế) hiển thị theo tên trong danh mục.
 */

const LOAI_MAC_DINH = ['TTNN', 'TTNN_V1', 'TTKS', 'TTKS_V1']

/** Loại thực tập không thuộc hai loại mặc định: trả về { code, label } để hiển thị đúng tên trong danh mục. */
function loaiKhac(dot) {
  if (!dot || typeof dot !== 'object' || !dot.maLoaiThucTap || LOAI_MAC_DINH.includes(dot.maLoaiThucTap)) return null
  return { code: dot.maLoaiThucTap, label: dot.tenLoaiThucTap || dot.maLoaiThucTap }
}

/** Các lựa chọn bộ lọc loại thực tập lấy từ chính các đợt đang có. */
export function loaiThucTapOptions(dots = []) {
  const map = new Map()
  for (const d of dots) {
    if (!d?.maLoaiThucTap || map.has(d.maLoaiThucTap)) continue
    map.set(d.maLoaiThucTap, getLoaiThucTapInfo(d).label)
  }
  return [...map.entries()].map(([code, label]) => ({ code, label })).sort((a, b) => a.label.localeCompare(b.label, 'vi'))
}

export function formatTenDot(dot) {
  if (!dot) return 'Đợt thực tập'
  const tenDot = typeof dot === 'string' ? dot : dot.tenDot || dot.ten || ''
  if (loaiKhac(dot)) return tenDot || 'Đợt thực tập'
  const maLoai = typeof dot === 'object' ? (dot.maLoaiThucTap || dot.maRubric || '') : ''
  const maDot = typeof dot === 'object' ? (dot.maDot || dot.maSo || '') : ''
  const lower = tenDot.toLowerCase()

  const isTTKS =
    maLoai === 'TTKS' ||
    maLoai === 'TTKS_V1' ||
    maDot === 'DOT02' ||
    maDot === 'DOT03' ||
    lower.includes('kỹ sư') ||
    lower.includes('ky su') ||
    lower.includes('đợt 2') ||
    lower.includes('đợt 3') ||
    lower.includes('dot 2') ||
    lower.includes('dot 3')

  const isTTNN =
    !isTTKS && (
      maLoai === 'TTNN' ||
      maLoai === 'TTNN_V1' ||
      maDot === 'DOT01' ||
      lower.includes('nghề nghiệp') ||
      lower.includes('nghe nghiep') ||
      lower.includes('đợt 1') ||
      lower.includes('dot 1')
    )

  // Nếu tên đợt đã có "kỹ sư" hoặc "nghề nghiệp" thì trả về đúng tên
  if (lower.includes('kỹ sư') || lower.includes('nghề nghiệp')) {
    return tenDot
  }

  // Nếu tên đợt có chứa cụm từ chung "Thực tập tốt nghiệp"
  if (lower.includes('thực tập tốt nghiệp')) {
    if (isTTNN) return tenDot.replace(/thực tập tốt nghiệp/i, 'Thực tập nghề nghiệp')
    return tenDot.replace(/thực tập tốt nghiệp/i, 'Thực tập kỹ sư')
  }

  if (isTTNN) {
    return `Thực tập nghề nghiệp ${tenDot}`.trim()
  }
  return `Thực tập kỹ sư ${tenDot}`.trim()
}

export function getLoaiThucTapInfo(dot) {
  if (!dot) return { isTTKS: true, label: 'Thực tập kỹ sư', shortLabel: 'Kỹ sư (TTKS)', code: 'TTKS', tieuChiCount: 12, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' }
  const khac = loaiKhac(dot)
  if (khac) {
    return {
      isTTKS: false,
      label: khac.label,
      shortLabel: `${khac.label} (${khac.code})`,
      code: khac.code,
      tieuChiCount: null,
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    }
  }
  const maLoai = typeof dot === 'object' ? (dot.maLoaiThucTap || dot.maRubric || '') : ''
  const maDot = typeof dot === 'object' ? (dot.maDot || dot.maSo || '') : ''
  const tenDot = typeof dot === 'object' ? (dot.tenDot || '') : (typeof dot === 'string' ? dot : '')
  const lower = tenDot.toLowerCase()

  const isExplicitTTNN =
    maLoai === 'TTNN' ||
    maLoai === 'TTNN_V1' ||
    maDot === 'DOT01' ||
    lower.includes('nghề nghiệp') ||
    lower.includes('nghe nghiep') ||
    (lower.includes('đợt 1') && !lower.includes('kỹ sư'))

  if (isExplicitTTNN) {
    return {
      isTTKS: false,
      label: 'Thực tập nghề nghiệp',
      shortLabel: 'Nghề nghiệp (TTNN)',
      code: 'TTNN',
      tieuChiCount: 11,
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    }
  }

  return {
    isTTKS: true,
    label: 'Thực tập kỹ sư',
    shortLabel: 'Kỹ sư (TTKS)',
    code: 'TTKS',
    tieuChiCount: 12,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  }
}
