/**
 * Chuẩn hóa tên và phân loại đợt thực tập (Thực tập nghề nghiệp - TTNN / Thực tập kỹ sư - TTKS)
 * theo đúng danh mục học vụ Khoa CNTT.
 */

export function formatTenDot(dot) {
  if (!dot) return 'Đợt thực tập'
  const tenDot = typeof dot === 'string' ? dot : dot.tenDot || dot.ten || ''
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
