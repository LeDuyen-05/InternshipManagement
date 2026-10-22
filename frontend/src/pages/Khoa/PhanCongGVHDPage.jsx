import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { gvHuongDanService } from '../../services/gvHuongDanService'

export default function PhanCongGVHDPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('phan-cong') // 'phan-cong' | 'lich-su'
  const [sinhViens, setSinhViens] = useState([])
  const [giangViens, setGiangViens] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  // State chọn sinh viên để phân công
  const [selectedSvList, setSelectedSvList] = useState([])
  const [svKeyword, setSvKeyword] = useState('')
  const [gvKeyword, setGvKeyword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // State Modal sửa chỉ tiêu
  const [editQuotaGV, setEditQuotaGV] = useState(null) // GV đang chỉnh chỉ tiêu
  const [newQuota, setNewQuota] = useState('')

  // State Modal Phân công tự động thông minh
  const [showAutoModal, setShowAutoModal] = useState(false)
  const [loadingAutoAssign, setLoadingAutoAssign] = useState(false)
  const [autoPreviewData, setAutoPreviewData] = useState(null)
  const [confirmingAuto, setConfirmingAuto] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [selectedLopFilter, setSelectedLopFilter] = useState('Tất cả')
  const [svCompanyFilter, setSvCompanyFilter] = useState('all') // 'all' | 'has_dn' | 'no_dn'
  const [svGpaFilter, setSvGpaFilter] = useState('all') // 'all' | 'high' | 'low'
  const [gvSlotFilter, setGvSlotFilter] = useState('all') // 'all' | 'available' | 'full'
  const [selectedGvList, setSelectedGvList] = useState([])
  const [showBatchSplitModal, setShowBatchSplitModal] = useState(false)
  const [batchSplitPreview, setBatchSplitPreview] = useState(null)
  const [savingBatchSplit, setSavingBatchSplit] = useState(false)

  // State Modal Xem danh sách & Đổi/Hủy phân công của 1 GV
  const [selectedGvForView, setSelectedGvForView] = useState(null)
  const [svListOfSelectedGv, setSvListOfSelectedGv] = useState([])
  const [loadingGvSv, setLoadingGvSv] = useState(false)
  const [reassigningSvId, setReassigningSvId] = useState(null) // maSo của SV đang chọn đổi GV
  const [targetNewGv, setTargetNewGv] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [modalMsg, setModalMsg] = useState(null) // { type: 'success' | 'error', text: '' }

  // Tải dữ liệu ban đầu
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [resSv, resGv] = await Promise.all([
        gvHuongDanService.getSVChuaPhanCong(svKeyword),
        gvHuongDanService.getGiangVienTai(),
      ])

      if (resSv.data?.success) {
        setSinhViens(resSv.data.data || [])
      }
      if (resGv.data?.success) {
        setGiangViens(resGv.data.data || [])
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể tải dữ liệu phân công')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setSelectedSvList([])
    loadData()
  }, [svKeyword])

  // Chọn / bỏ chọn 1 sinh viên
  const handleToggleSelectSv = (maSV) => {
    setSelectedSvList((prev) =>
      prev.includes(maSV) ? prev.filter((id) => id !== maSV) : [...prev, maSV]
    )
  }

  // Chọn tất cả / Bỏ chọn tất cả sinh viên
  const handleSelectAllSv = () => {
    if (selectedSvList.length === filteredSinhViens.length && filteredSinhViens.length > 0) {
      setSelectedSvList([])
    } else {
      setSelectedSvList(filteredSinhViens.map((s) => s.maSV))
    }
  }

  // Thực hiện phân công cho 1 giảng viên cụ thể
  const handleAssignToLecturer = async (gv) => {
    if (selectedSvList.length === 0) {
      alert('Vui lòng tích chọn ít nhất 1 sinh viên bên danh sách bên trái!')
      return
    }

    const slotsLeft = gv.soLuongSVHD - gv.soLuongHienTai
    if (slotsLeft <= 0) {
      alert(`Giảng viên ${gv.hoTen} đã đạt hạn ngạch tối đa (${gv.soLuongHienTai}/${gv.soLuongSVHD}).`)
      return
    }

    if (selectedSvList.length > slotsLeft) {
      const confirmExceed = window.confirm(
        `Giảng viên ${gv.hoTen} chỉ còn nhận được tối đa ${slotsLeft} sinh viên. Hệ thống sẽ chỉ gán ${slotsLeft} sinh viên đầu tiên. Bạn có muốn tiếp tục?`
      )
      if (!confirmExceed) return
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccessMsg('')

      let res
      if (selectedSvList.length === 1) {
        res = await gvHuongDanService.phanCongDonLe(gv.maGV, selectedSvList[0])
      } else {
        res = await gvHuongDanService.phanCongHangLoat(gv.maGV, selectedSvList)
      }

      const skipped = res.data?.data?.khongThanhCong || []
      setSuccessMsg(
        skipped.length > 0
          ? `${res.data?.message || `Đã phân công cho GV ${gv.hoTen}.`} Không thực hiện: ${skipped.map((item) => `${item.maSV} (${item.lyDo})`).join(', ')}`
          : (res.data?.message || `Đã phân công thành công cho GV ${gv.hoTen}!`)
      )
      setSelectedSvList([])
      await loadData() // Làm mới lại cả 2 danh sách
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi thực hiện phân công')
    } finally {
      setSubmitting(false)
    }
  }

  // Thống kê nhanh toàn Khoa
  const totalAssigned = giangViens.reduce((sum, gv) => sum + (gv.soLuongHienTai || 0), 0)
  const totalUnassigned = sinhViens.length
  const totalStudents = totalAssigned + totalUnassigned
  const totalQuota = giangViens.reduce((sum, gv) => sum + (gv.soLuongSVHD || 0), 0)
  const availableSlots = Math.max(0, totalQuota - totalAssigned)
  const percentAssigned = totalStudents > 0 ? Math.round((totalAssigned / totalStudents) * 100) : 0

  // Danh sách lớp để lọc nhanh
  const uniqueLops = ['Tất cả', ...new Set(sinhViens.map((s) => s.lop).filter(Boolean))]

  // Lọc danh sách SV theo từ khóa, lớp, doanh nghiệp và GPA
  const filteredSinhViens = sinhViens.filter((sv) => {
    if (selectedLopFilter !== 'Tất cả' && sv.lop !== selectedLopFilter) return false

    const compNorm = (sv.tenCongTy || '').trim().toLowerCase()
    const hasCompany = Boolean(
      compNorm &&
      compNorm !== 'chưa phân bổ' &&
      compNorm !== 'chưa có công ty' &&
      compNorm !== 'chưa có' &&
      compNorm !== 'chưa có nơi thực tập' &&
      compNorm !== '-'
    )
    if (svCompanyFilter === 'has_dn' && !hasCompany) return false
    if (svCompanyFilter === 'no_dn' && hasCompany) return false

    const gpaVal = Number(sv.gpa) || 0
    if (svGpaFilter === 'high' && gpaVal < 3.2) return false
    if (svGpaFilter === 'low' && gpaVal >= 2.5) return false

    return true
  })

  // Lọc danh sách GV theo từ khoá và tình trạng slot
  const filteredGiangViens = giangViens.filter((gv) => {
    if (gvKeyword.trim()) {
      const kw = gvKeyword.toLowerCase()
      const match =
        gv.hoTen?.toLowerCase().includes(kw) ||
        gv.maGV?.toLowerCase().includes(kw) ||
        gv.chuyenMon?.toLowerCase().includes(kw)
      if (!match) return false
    }
    const slotsLeft = (gv.soLuongSVHD || 0) - (gv.soLuongHienTai || 0)
    if (gvSlotFilter === 'available') return slotsLeft > 0
    if (gvSlotFilter === 'full') return slotsLeft <= 0
    return true
  })

  // Chọn / bỏ chọn Giảng viên để chia đều
  const handleToggleSelectGv = (maGV) => {
    setSelectedGvList((prev) =>
      prev.includes(maGV) ? prev.filter((id) => id !== maGV) : [...prev, maGV]
    )
  }

  // Chọn tất cả giảng viên còn slot trống
  const handleSelectAllAvailableGv = () => {
    const availableGvs = filteredGiangViens.filter((g) => (g.soLuongSVHD - g.soLuongHienTai) > 0)
    if (selectedGvList.length === availableGvs.length && availableGvs.length > 0) {
      setSelectedGvList([])
    } else {
      setSelectedGvList(availableGvs.map((g) => g.maGV))
    }
  }

  // Mở modal tính toán đề xuất chia đều sinh viên cho nhiều giảng viên
  const handleOpenBatchSplitPreview = () => {
    if (selectedSvList.length === 0) {
      alert('Vui lòng tích chọn danh sách sinh viên bên trái!')
      return
    }
    if (selectedGvList.length < 2) {
      alert('Vui lòng tích chọn ít nhất 2 giảng viên bên phải để chia đều!')
      return
    }

    const targetGvs = giangViens.filter((g) => selectedGvList.includes(g.maGV))
    const gvCapacities = targetGvs.map((g) => ({
      maGV: g.maGV,
      hoTen: g.hoTen,
      chuyenMon: g.chuyenMon || 'Chung',
      soLuongHienTai: g.soLuongHienTai || 0,
      soLuongSVHD: g.soLuongSVHD || 0,
      slotsLeft: Math.max(0, (g.soLuongSVHD || 0) - (g.soLuongHienTai || 0)),
      assignedCount: 0,
    }))

    const totalAvailableSlots = gvCapacities.reduce((sum, g) => sum + g.slotsLeft, 0)
    if (totalAvailableSlots === 0) {
      alert('Tất cả các giảng viên được chọn đều đã đầy hạn ngạch (0 slot trống)!')
      return
    }

    const svObjects = sinhViens.filter((s) => selectedSvList.includes(s.maSV))
    const pairings = []
    const unassigned = []

    let currentGvIdx = 0
    for (const sv of svObjects) {
      let found = false
      for (let i = 0; i < gvCapacities.length; i++) {
        const idx = (currentGvIdx + i) % gvCapacities.length
        if (gvCapacities[idx].slotsLeft > 0) {
          gvCapacities[idx].slotsLeft--
          gvCapacities[idx].assignedCount++
          pairings.push({
            maSV: sv.maSV,
            hoTenSV: sv.hoTen,
            lop: sv.lop || '-',
            tenCongTy: sv.tenCongTy || 'Chưa phân bổ',
            maGV: gvCapacities[idx].maGV,
            hoTenGV: gvCapacities[idx].hoTen,
            chuyenMonGV: gvCapacities[idx].chuyenMon,
          })
          currentGvIdx = (idx + 1) % gvCapacities.length
          found = true
          break
        }
      }
      if (!found) {
        unassigned.push(sv)
      }
    }

    setBatchSplitPreview({
      pairings,
      unassigned,
      gvSummary: gvCapacities,
      totalSelectedSv: selectedSvList.length,
      totalAssigned: pairings.length,
    })
    setShowBatchSplitModal(true)
  }

  // Xác nhận lưu kết quả chia đều hàng loạt vào CSDL SQL Server
  const handleConfirmBatchSplit = async () => {
    if (!batchSplitPreview || batchSplitPreview.pairings.length === 0) return
    try {
      setSavingBatchSplit(true)
      const payload = batchSplitPreview.pairings.map((p) => ({
        maGV: p.maGV,
        maSV: p.maSV,
      }))
      const res = await gvHuongDanService.xacNhanPhanCongTuDong(payload)
      if (res.data?.success) {
        setShowBatchSplitModal(false)
        setSuccessMsg(
          `Đã chia đều thành công ${payload.length} sinh viên cho ${selectedGvList.length} giảng viên!`
        )
        setSelectedSvList([])
        setSelectedGvList([])
        await loadData()
      }
    } catch (err) {
      alert('Lỗi khi lưu kết quả chia đều: ' + (err.response?.data?.message || err.message))
    } finally {
      setSavingBatchSplit(false)
    }
  }

  // Xử lý xuất Excel quyết định phân công chính thức
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true)
      const res = await gvHuongDanService.getTatCaPhanCong()
      const dataPhanCong = res.data?.data || []
      if (dataPhanCong.length === 0) {
        alert('Hiện chưa có dữ liệu phân công giảng viên hướng dẫn để xuất file!')
        return
      }
      gvHuongDanService.exportExcelPhanCong(dataPhanCong, giangViens)
      setSuccessMsg(`Đã xuất file Microsoft Excel Quyết định Phân công GVHD (${dataPhanCong.length} SV) thành công!`)
    } catch (err) {
      alert('Không thể xuất file Excel: ' + (err.response?.data?.message || err.message))
    } finally {
      setExportingExcel(false)
    }
  }

  // Mở modal chỉnh sửa chỉ tiêu
  const handleOpenEditQuota = (gv) => {
    setEditQuotaGV(gv)
    setNewQuota(String(gv.soLuongSVHD || 10))
  }

  const handleCloseEditQuota = () => {
    setEditQuotaGV(null)
    setNewQuota('')
  }

  // 1. Mở Modal & Lấy đề xuất phân công tự động từ Backend
  const handleOpenAutoAssign = async () => {
    try {
      setLoadingAutoAssign(true)
      setError(null)
      const res = await gvHuongDanService.deXuatPhanCongTuDong()
      if (res.data?.success) {
        setAutoPreviewData(res.data.data)
        setShowAutoModal(true)
      }
    } catch (err) {
      alert('Không thể tạo đề xuất phân công: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoadingAutoAssign(false)
    }
  }

  // 2. Chốt lưu phân công tự động vào cơ sở dữ liệu SQL Server
  const handleConfirmAutoAssign = async () => {
    if (!autoPreviewData || autoPreviewData.danhSachDeXuat.length === 0) return
    try {
      setConfirmingAuto(true)
      const payload = autoPreviewData.danhSachDeXuat.map((item) => ({
        maGV: item.maGV,
        maSV: item.maSV,
      }))

      const res = await gvHuongDanService.xacNhanPhanCongTuDong(payload)
      if (res.data?.success) {
        setShowAutoModal(false)
        setSuccessMsg(`Đã phân công tự động thành công cho ${payload.length} sinh viên!`)
        await loadData()
      }
    } catch (err) {
      alert('Lỗi khi lưu phân công tự động: ' + (err.response?.data?.message || err.message))
    } finally {
      setConfirmingAuto(false)
    }
  }

  // Lưu chỉ tiêu mới xuống Backend
  const handleSaveQuota = async () => {
    if (!editQuotaGV) return
    const quotaNum = parseInt(newQuota, 10)
    if (isNaN(quotaNum) || quotaNum < 0) {
      alert('Vui lòng nhập một số hợp lệ!')
      return
    }
    if (quotaNum < editQuotaGV.soLuongHienTai) {
      alert(`Chỉ tiêu không được nhỏ hơn số sinh viên hiện đang hướng dẫn (${editQuotaGV.soLuongHienTai})!`)
      return
    }

    try {
      setSubmitting(true)
      const res = await gvHuongDanService.capNhatChiTieu(editQuotaGV.maGV, quotaNum)
      setSuccessMsg(res.data?.message || `Đã cập nhật chỉ tiêu cho ${editQuotaGV.hoTen} thành ${quotaNum} SV!`)
      handleCloseEditQuota()
      await loadData()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi cập nhật chỉ tiêu')
    } finally {
      setSubmitting(false)
    }
  }

  // 3. Mở modal xem danh sách SV của 1 GV & Điều phối / Hủy phân công
  const handleOpenViewStudents = async (gv) => {
    setSelectedGvForView(gv)
    setReassigningSvId(null)
    setTargetNewGv('')
    setModalMsg(null)
    try {
      setLoadingGvSv(true)
      const res = await gvHuongDanService.getSVTheoGiangVien(gv.maGV)
      if (res.data?.success) {
        setSvListOfSelectedGv(res.data.data || [])
      } else {
        setSvListOfSelectedGv(res.data || [])
      }
    } catch (err) {
      setModalMsg({
        type: 'error',
        text: 'Không thể tải danh sách sinh viên: ' + (err.response?.data?.message || err.message),
      })
    } finally {
      setLoadingGvSv(false)
    }
  }

  const handleCloseViewStudents = () => {
    setSelectedGvForView(null)
    setSvListOfSelectedGv([])
    setReassigningSvId(null)
    setTargetNewGv('')
    setModalMsg(null)
  }

  // 4. Nghiệp vụ: Đổi sang Giảng viên khác (khi GV bận đột xuất)
  const handleConfirmReassign = async (maSo) => {
    if (!targetNewGv) {
      alert('Vui lòng chọn giảng viên mới từ danh sách!')
      return
    }
    const newLecturer = giangViens.find((g) => g.maGV === targetNewGv)
    if (newLecturer && newLecturer.soLuongHienTai >= newLecturer.soLuongSVHD) {
      alert(`Giảng viên ${newLecturer.hoTen} đã đủ chỉ tiêu (${newLecturer.soLuongHienTai}/${newLecturer.soLuongSVHD})! Vui lòng chọn giảng viên khác.`)
      return
    }

    try {
      setActionLoading(true)
      setModalMsg(null)
      const res = await gvHuongDanService.doiGiangVien(maSo, targetNewGv)
      setModalMsg({
        type: 'success',
        text: res.data?.message || `Đã chuyển sinh viên sang GV ${newLecturer?.hoTen || targetNewGv} thành công!`,
      })
      setReassigningSvId(null)
      setTargetNewGv('')

      // Tải lại danh sách SV trong modal và danh sách chính
      const resSv = await gvHuongDanService.getSVTheoGiangVien(selectedGvForView.maGV)
      setSvListOfSelectedGv(resSv.data?.data || resSv.data || [])
      await loadData()
    } catch (err) {
      setModalMsg({
        type: 'error',
        text: 'Lỗi khi đổi giảng viên: ' + (err.response?.data?.message || err.message),
      })
    } finally {
      setActionLoading(false)
    }
  }

  // 5. Nghiệp vụ: Hủy phân công (trả sinh viên về hàng chờ Chưa có GVHD)
  const handleCancelAssignment = async (sv) => {
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn hủy phân công sinh viên "${sv.hoTen}" (${sv.maSV}) khỏi GV ${selectedGvForView.hoTen}?\n\nSinh viên sẽ được đưa về lại danh sách "Sinh viên chờ phân công" ở cột bên trái.`
    )
    if (!confirmDelete) return

    try {
      setActionLoading(true)
      setModalMsg(null)
      const res = await gvHuongDanService.huyPhanCong(sv.maSo)
      setModalMsg({
        type: 'success',
        text: res.data?.message || `Đã hủy phân công cho sinh viên ${sv.hoTen}!`,
      })

      // Tải lại danh sách SV trong modal và danh sách chính
      const resSv = await gvHuongDanService.getSVTheoGiangVien(selectedGvForView.maGV)
      setSvListOfSelectedGv(resSv.data?.data || resSv.data || [])
      await loadData()
    } catch (err) {
      setModalMsg({
        type: 'error',
        text: 'Lỗi khi hủy phân công: ' + (err.response?.data?.message || err.message),
      })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Trang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <span className="material-symbols-outlined text-2xl">assignment_ind</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Phân Công Giảng Viên Hướng Dẫn</h1>
            <p className="text-sm text-slate-500">
              Điều phối sinh viên và cân bằng hạn ngạch hướng dẫn cho Hội đồng chuyên môn Khoa CNTT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Xuất quyết định phân công GVHD và bảng thống kê tải giảng viên ra file Excel (.xlsx)"
          >
            {exportingExcel ? (
              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-sm">table_chart</span>
            )}
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handleOpenAutoAssign}
            disabled={loadingAutoAssign || sinhViens.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Tự động ghép cặp sinh viên theo chuyên môn & cân bằng chỉ tiêu giảng viên"
          >
            {loadingAutoAssign ? (
              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-sm">smart_toy</span>
            )}
            <span>Phân công tự động</span>
          </button>

          <button
            onClick={loadData}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Thông báo Thành công / Thất bại */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600">error</span>
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* Thanh KPI Tổng quan Tiến độ Phân công Toàn Khoa */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <span className="material-symbols-outlined text-2xl">groups</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Tổng sinh viên</p>
            <p className="text-xl font-bold text-slate-800">{totalStudents} <span className="text-xs font-normal text-slate-400">SV</span></p>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">Đã đăng ký thực tập</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <span className="material-symbols-outlined text-2xl">how_to_reg</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Đã phân công</p>
            <p className="text-xl font-bold text-emerald-600">{totalAssigned} <span className="text-xs font-semibold text-emerald-700">({percentAssigned}%)</span></p>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">Đang có GV hướng dẫn</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <span className="material-symbols-outlined text-2xl">pending_actions</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Chờ phân công</p>
            <p className="text-xl font-bold text-amber-600">{totalUnassigned} <span className="text-xs font-normal text-slate-400">SV</span></p>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">Cần gán vào giảng viên</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <span className="material-symbols-outlined text-2xl">pie_chart</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Chỉ tiêu toàn Khoa</p>
            <p className="text-xl font-bold text-slate-800">{totalAssigned} / {totalQuota} <span className="text-xs font-normal text-slate-400">chỉ tiêu</span></p>
            <p className="text-[11px] text-indigo-600 font-semibold mt-0.5 truncate">Còn nhận thêm {availableSlots} sinh viên</p>
          </div>
        </div>
      </div>

      {/* 2. Giao diện Phân công 2 Cột Trực Quan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (7/12): Danh sách Sinh viên Chưa Có GVHD */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px]">
          {/* Header Bảng SV & Bộ lọc nâng cao */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 rounded-t-2xl space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-800 text-sm">Sinh Viên Chờ Phân Công</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                    {filteredSinhViens.length}/{sinhViens.length} SV
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Tích chọn sinh viên để gán vào giảng viên bên phải</p>
              </div>

              {/* Ô tìm kiếm MSSV, tên */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                  search
                </span>
                <input
                  type="text"
                  value={svKeyword}
                  onChange={(e) => setSvKeyword(e.target.value)}
                  placeholder="Tìm MSSV, họ tên..."
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                />
              </div>
            </div>

            {/* Hàng bộ lọc đa chiều (Lớp, Nơi thực tập, GPA) */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 text-xs">
              {/* Lọc theo Lớp */}
              <select
                value={selectedLopFilter}
                onChange={(e) => setSelectedLopFilter(e.target.value)}
                className="py-1 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="Tất cả">Tất cả lớp</option>
                {uniqueLops.filter((l) => l !== 'Tất cả').map((lop) => (
                  <option key={lop} value={lop}>Lớp {lop}</option>
                ))}
              </select>

              {/* Lọc theo Tình trạng Nơi thực tập */}
              <select
                value={svCompanyFilter}
                onChange={(e) => setSvCompanyFilter(e.target.value)}
                className="py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">Tất cả nơi thực tập</option>
                <option value="has_dn">Đã có nơi thực tập</option>
                <option value="no_dn">Chưa có nơi thực tập</option>
              </select>

              {/* Lọc theo GPA */}
              <select
                value={svGpaFilter}
                onChange={(e) => setSvGpaFilter(e.target.value)}
                className="py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">Tất cả điểm GPA</option>
                <option value="high">GPA từ 3.2 trở lên</option>
                <option value="low">GPA dưới 2.5</option>
              </select>

              {/* Nút Xóa lọc nếu đang kích hoạt */}
              {(selectedLopFilter !== 'Tất cả' || svCompanyFilter !== 'all' || svGpaFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLopFilter('Tất cả')
                    setSvCompanyFilter('all')
                    setSvGpaFilter('all')
                  }}
                  className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[13px]">close</span>
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          {/* Thanh tác vụ chọn hàng loạt */}
          <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={filteredSinhViens.length > 0 && selectedSvList.length === filteredSinhViens.length}
                onChange={handleSelectAllSv}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              Chọn tất cả ({selectedSvList.length}/{filteredSinhViens.length})
            </label>
            {selectedSvList.length > 0 && (
              <span className="text-indigo-600 font-semibold">
                Đã chọn {selectedSvList.length} sinh viên
              </span>
            )}
          </div>

          {/* Danh sách cuộn Sinh viên */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <span className="material-symbols-outlined text-3xl animate-spin text-indigo-600">sync</span>
                <p className="mt-2 text-xs">Đang tải danh sách sinh viên...</p>
              </div>
            ) : filteredSinhViens.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl text-emerald-400">task_alt</span>
                <p className="mt-2 text-sm font-semibold text-slate-700">Tuyệt vời! Đã phân công hết sinh viên</p>
                <p className="text-xs text-slate-400 mt-0.5">Không còn sinh viên nào đang chờ xếp giảng viên.</p>
              </div>
            ) : (
              filteredSinhViens.map((sv) => {
                const isSelected = selectedSvList.includes(sv.maSV)
                return (
                  <div
                    key={sv.maSV}
                    onClick={() => handleToggleSelectSv(sv.maSV)}
                    className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Đã bắt ở div parent
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">{sv.hoTen}</span>
                          <span className="text-xs font-mono text-slate-400">({sv.maSV})</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span>{sv.lop || 'CNTT'}</span>
                          <span>•</span>
                          <span>GPA: {sv.gpa || '3.0'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {(() => {
                        const compNorm = (sv.tenCongTy || '').trim().toLowerCase()
                        const hasComp = Boolean(
                          compNorm &&
                          compNorm !== 'chưa phân bổ' &&
                          compNorm !== 'chưa có công ty' &&
                          compNorm !== 'chưa có' &&
                          compNorm !== 'chưa có nơi thực tập' &&
                          compNorm !== '-'
                        )
                        return hasComp ? (
                          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1 justify-end">
                            <span className="material-symbols-outlined text-xs text-indigo-500">apartment</span>
                            <span>{sv.tenCongTy}</span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic flex items-center gap-1 justify-end">
                            <span>Chưa có nơi thực tập</span>
                          </div>
                        )
                      })()}
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-1 inline-block font-medium">
                        Chờ phân công GV
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* CỘT PHẢI (5/12): Danh sách Giảng viên & Chỉ số Quota */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px]">
          {/* Header Bảng GV */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 rounded-t-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Giảng Viên & Tải Công Việc</h2>
                <p className="text-xs text-slate-400 mt-0.5">Bấm "Phân công" để gán các SV đã chọn vào GV</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                {filteredGiangViens.length} GV
              </span>
            </div>
            {/* Ô tìm kiếm Giảng viên */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
              <input
                type="text"
                value={gvKeyword}
                onChange={(e) => setGvKeyword(e.target.value)}
                placeholder="Tìm theo tên, mã GV, chuyên môn..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {/* Lọc nhanh theo tình trạng slot */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setGvSlotFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  gvSlotFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({giangViens.length})
              </button>
              <button
                type="button"
                onClick={() => setGvSlotFilter('available')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  gvSlotFilter === 'available'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Còn chỉ tiêu ({giangViens.filter((g) => (g.soLuongSVHD - g.soLuongHienTai) > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setGvSlotFilter('full')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  gvSlotFilter === 'full'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Đã đủ chỉ tiêu ({giangViens.filter((g) => (g.soLuongSVHD - g.soLuongHienTai) <= 0).length})
              </button>
            </div>

            {/* Thanh chọn nhanh Giảng viên để chia đều */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={
                    filteredGiangViens.filter((g) => (g.soLuongSVHD - g.soLuongHienTai) > 0).length > 0 &&
                    selectedGvList.length === filteredGiangViens.filter((g) => (g.soLuongSVHD - g.soLuongHienTai) > 0).length
                  }
                  onChange={handleSelectAllAvailableGv}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Chọn GV để chia đều ({selectedGvList.length}/{filteredGiangViens.filter((g) => (g.soLuongSVHD - g.soLuongHienTai) > 0).length})</span>
              </label>
              {selectedGvList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedGvList([])}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold cursor-pointer"
                >
                  Bỏ chọn ({selectedGvList.length})
                </button>
              )}
            </div>
          </div>

          {/* Danh sách cuộn Giảng viên */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {filteredGiangViens.map((gv) => {
              const isFull = gv.soLuongHienTai >= gv.soLuongSVHD
              const percent = Math.min(100, gv.tyLeTai || 0)

              return (
                <div
                  key={gv.maGV}
                  className={`p-4 rounded-xl border transition-all ${
                    isFull
                      ? 'bg-slate-50/80 border-slate-200 opacity-75'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedGvList.includes(gv.maGV)}
                        disabled={isFull}
                        onChange={() => handleToggleSelectGv(gv.maGV)}
                        className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-30"
                        title="Chọn giảng viên này để chia đều sinh viên"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{gv.hoTen}</span>
                        <span className="text-[11px] font-mono text-slate-400">({gv.maGV})</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Chuyên môn: {gv.chuyenMon || 'Công nghệ phần mềm'}
                      </p>
                      </div>
                    </div>

                    {/* Nút hành động Phân công */}
                    <button
                      onClick={() => handleAssignToLecturer(gv)}
                      disabled={isFull || submitting || selectedSvList.length === 0}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        isFull
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : selectedSvList.length === 0
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">person_add</span>
                      {isFull ? 'Đã đầy' : 'Phân công'}
                    </button>
                  </div>

                  {/* Thanh Tiến độ Quota */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Đang hướng dẫn:</span>
                        <span className="font-bold text-slate-800">
                          {gv.soLuongHienTai} / {gv.soLuongSVHD} SV ({percent}%)
                        </span>
                        <button
                          onClick={() => handleOpenEditQuota(gv)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Điều chỉnh chỉ tiêu"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                      </div>
                      {gv.soLuongHienTai > 0 && (
                        <button
                          onClick={() => handleOpenViewStudents(gv)}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-semibold"
                          title="Xem danh sách SV & Điều chuyển / Hủy phân công"
                        >
                          <span className="material-symbols-outlined text-[14px]">groups</span>
                          Xem danh sách ({gv.soLuongHienTai})
                        </button>
                      )}
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          percent >= 100
                            ? 'bg-red-500'
                            : percent >= 75
                            ? 'bg-amber-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Thanh tác vụ nổi: Chia đều hàng loạt khi chọn Nhiều SV và Nhiều GV */}
      {selectedSvList.length > 0 && selectedGvList.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-6 border border-slate-700 animate-in fade-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-2xl">balance</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-300">Nghiệp vụ chia đều hàng loạt (Multi-SV to Multi-GV)</p>
              <p className="text-sm font-bold">
                Đã chọn <span className="text-amber-400 font-black">{selectedSvList.length}</span> SV và <span className="text-emerald-400 font-black">{selectedGvList.length}</span> Giảng viên
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setSelectedSvList([]); setSelectedGvList([]) }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Hủy chọn
            </button>
            <button
              type="button"
              onClick={handleOpenBatchSplitPreview}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all hover:scale-105"
            >
              <span className="material-symbols-outlined text-base">shuffle</span>
              <span>Chia đều {selectedSvList.length} SV cho {selectedGvList.length} GV</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal chỉnh sửa chỉ tiêu GV */}
      {editQuotaGV && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Điều chỉnh chỉ tiêu hướng dẫn</h3>
              <button onClick={handleCloseEditQuota} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-sm">
              <p className="font-semibold text-slate-800">{editQuotaGV.hoTen}</p>
              <p className="text-slate-500 text-xs mt-0.5">Đang hướng dẫn: {editQuotaGV.soLuongHienTai} sinh viên</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Số sinh viên tối đa được nhận:
              </label>
              <input
                type="number"
                min={editQuotaGV.soLuongHienTai}
                max={30}
                value={newQuota}
                onChange={(e) => setNewQuota(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-400 mt-1">Không thể thấp hơn số sinh viên hiện đang hướng dẫn ({editQuotaGV.soLuongHienTai}).</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={handleCloseEditQuota}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveQuota}
                disabled={submitting}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl flex items-center gap-1.5"
              >
                {submitting && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem trước & Xác nhận Phân công tự động thông minh */}
      {showAutoModal && autoPreviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">smart_toy</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Đề Xuất Phân Công Tự Động (Smart Match & Cân Bằng Tải)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hệ thống tự động rà soát chuyên môn và hạn ngạch còn trống của từng giảng viên
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAutoModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Thống kê nhanh */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[11px] text-slate-400 font-bold uppercase">Tổng SV cần phân công</p>
                <p className="text-lg font-black text-slate-800">{autoPreviewData.tongSoSVChuaPhanCong}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-[11px] text-emerald-600 font-bold uppercase">Đề xuất ghép thành công</p>
                <p className="text-lg font-black text-emerald-700">{autoPreviewData.soLuongGhepThanhCong}</p>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                <p className="text-[11px] text-rose-600 font-bold uppercase">Chưa thể ghép (Hết chỉ tiêu)</p>
                <p className="text-lg font-black text-rose-700">{autoPreviewData.soLuongKhongTheGhep}</p>
              </div>
            </div>

            {/* Bảng danh sách đề xuất */}
            <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl">
              {autoPreviewData.danhSachDeXuat.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Không thể ghép cặp nào. Vui lòng tăng chỉ tiêu của các Giảng viên trước!
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Sinh viên</th>
                      <th className="py-2.5 px-3">Đơn vị thực tập</th>
                      <th className="py-2.5 px-3">GVHD đề xuất</th>
                      <th className="py-2.5 px-3">Lý do ghép</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {autoPreviewData.danhSachDeXuat.map((item) => (
                      <tr key={item.maSV} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{item.hoTenSV}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{item.maSV} • {item.lop}</p>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.tenCongTy}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-indigo-700">{item.hoTenGV}</p>
                          <p className="text-[11px] text-slate-400">{item.chuyenMonGV}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          {item.lyDoGhep?.includes('kết nối & giới thiệu DN') ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-xs">
                              <span className="material-symbols-outlined text-[13px] text-purple-600">stars</span>
                              {item.lyDoGhep}
                            </span>
                          ) : item.lyDoGhep?.includes('chuyên môn') ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <span className="material-symbols-outlined text-[13px] text-indigo-600">psychology</span>
                              {item.lyDoGhep}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                              <span className="material-symbols-outlined text-[13px] text-slate-400">balance</span>
                              {item.lyDoGhep}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Thông báo nếu có sinh viên bị sót */}
            {autoPreviewData.sinhVienChuaTheGhep.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
                <span className="font-bold">Lưu ý:</span> Còn {autoPreviewData.sinhVienChuaTheGhep.length} sinh viên chưa được phân công do tổng chỉ tiêu các giảng viên hiện tại đã đầy.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAutoModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmAutoAssign}
                disabled={confirmingAuto || autoPreviewData.danhSachDeXuat.length === 0}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                {confirmingAuto && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                <span>Xác nhận & Lưu vào CSDL ({autoPreviewData.danhSachDeXuat.length} SV)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem trước & Chốt Chia Đều Hàng Loạt */}
      {showBatchSplitModal && batchSplitPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">balance</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Xem Trước Phương Án Chia Đều Hàng Loạt
                  </h3>
                  <p className="text-xs text-slate-500">
                    Phân bổ đều {batchSplitPreview.totalAssigned} sinh viên cho {selectedGvList.length} giảng viên đã chọn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchSplitModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Thống kê phân bổ từng Giảng viên */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-700">Tải công việc sau khi phân bổ:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {batchSplitPreview.gvSummary.map((gv) => (
                  <div key={gv.maGV} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <p className="font-bold text-slate-800 truncate">{gv.hoTen}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Được nhận thêm: <strong className="text-emerald-700 font-black">+{gv.assignedCount} SV</strong>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      Tải mới: {gv.soLuongHienTai + gv.assignedCount}/{gv.soLuongSVHD} SV
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bảng danh sách ghép cặp chi tiết */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl max-h-60">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 font-semibold text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Sinh viên</th>
                    <th className="py-2.5 px-3">Lớp</th>
                    <th className="py-2.5 px-3">Doanh nghiệp</th>
                    <th className="py-2.5 px-3">GVHD được gán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batchSplitPreview.pairings.map((p) => (
                    <tr key={p.maSV} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3">
                        <p className="font-bold text-slate-900">{p.hoTenSV}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{p.maSV}</p>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{p.lop}</td>
                      <td className="py-2 px-3 text-slate-600 truncate max-w-[140px]">{p.tenCongTy}</td>
                      <td className="py-2 px-3 font-semibold text-indigo-700">{p.hoTenGV}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cảnh báo nếu có sinh viên bị sót do hết slot */}
            {batchSplitPreview.unassigned.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
                <span className="font-bold">Lưu ý:</span> Còn {batchSplitPreview.unassigned.length} sinh viên chưa được phân bổ do tổng slot trống của các giảng viên được chọn không đủ.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBatchSplitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchSplit}
                disabled={savingBatchSplit || batchSplitPreview.pairings.length === 0}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {savingBatchSplit && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                <span>Xác nhận & Lưu vào CSDL ({batchSplitPreview.totalAssigned} SV)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Danh sách & Đổi / Hủy Giảng viên Hướng dẫn */}
      {selectedGvForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col border border-slate-100">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">groups</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Danh Sách Sinh Viên Hướng Dẫn: {selectedGvForView.hoTen}
                    </h3>
                    <span className="text-xs font-mono text-slate-400">({selectedGvForView.maGV})</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Chuyên môn: {selectedGvForView.chuyenMon || 'Chung'} • Tải: {svListOfSelectedGv.length}/{selectedGvForView.soLuongSVHD} SV
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseViewStudents}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Thông báo trong modal nếu có */}
            {modalMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center justify-between ${
                  modalMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">
                    {modalMsg.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span>{modalMsg.text}</span>
                </div>
                <button onClick={() => setModalMsg(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}

            {/* Hướng dẫn nghiệp vụ */}
            <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 flex items-start gap-2 text-xs text-amber-800">
              <span className="material-symbols-outlined text-base text-amber-600 mt-0.5">info</span>
              <div>
                <span className="font-bold">Xử lý khi Giảng viên bận đột xuất hoặc có nhu cầu điều chuyển:</span>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-amber-900">
                  <li>
                    <strong className="text-indigo-700">Đổi GV:</strong> Điều chuyển sinh viên trực tiếp sang một giảng viên khác còn hạn ngạch trống.
                  </li>
                  <li>
                    <strong className="text-rose-700">Hủy phân công:</strong> Thu hồi quyết định phân công, đưa sinh viên về lại hàng chờ &quot;Chờ phân công&quot;.
                  </li>
                </ul>
              </div>
            </div>

            {/* Bảng Danh sách Sinh viên */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl">
              {loadingGvSv ? (
                <div className="py-16 text-center text-slate-400">
                  <span className="material-symbols-outlined text-3xl animate-spin text-indigo-600">sync</span>
                  <p className="mt-2 text-xs">Đang tải danh sách sinh viên...</p>
                </div>
              ) : svListOfSelectedGv.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl text-slate-300">person_off</span>
                  <p className="mt-2 text-sm font-semibold text-slate-700">Chưa có sinh viên nào</p>
                  <p className="text-xs text-slate-400 mt-0.5">Giảng viên hiện không hướng dẫn sinh viên nào trong đợt này.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-3">STT</th>
                      <th className="py-3 px-3">Sinh viên</th>
                      <th className="py-3 px-3">Đơn vị thực tập</th>
                      <th className="py-3 px-3">Ngày phân công</th>
                      <th className="py-3 px-3 text-right">Thao tác điều phối</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {svListOfSelectedGv.map((sv, idx) => {
                      const isReassigning = reassigningSvId === sv.maSo
                      return (
                        <tr key={sv.maSo || sv.maSV} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900">{sv.hoTen}</p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {sv.maSV} • {sv.lop || 'CNTT'} {sv.gpa ? `• GPA: ${sv.gpa}` : ''}
                            </p>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <span className="material-symbols-outlined text-slate-400 text-sm">apartment</span>
                              <span className="font-medium">{sv.tenCongTy}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {sv.ngayPC ? new Date(sv.ngayPC).toLocaleDateString('vi-VN') : '—'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {isReassigning ? (
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <select
                                  value={targetNewGv}
                                  onChange={(e) => setTargetNewGv(e.target.value)}
                                  className="px-2 py-1 bg-white border border-indigo-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[210px]"
                                >
                                  <option value="">-- Chọn GV mới --</option>
                                  {giangViens
                                    .filter((g) => g.maGV !== selectedGvForView.maGV)
                                    .map((g) => {
                                      const slots = Math.max(0, g.soLuongSVHD - g.soLuongHienTai)
                                      return (
                                        <option key={g.maGV} value={g.maGV} disabled={slots === 0}>
                                          {g.hoTen} ({g.chuyenMon || 'CNPM'}) {slots > 0 ? `[còn ${slots} chỗ]` : '[Đã đầy]'}
                                        </option>
                                      )
                                    })}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmReassign(sv.maSo)}
                                  disabled={actionLoading || !targetNewGv}
                                  className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                                >
                                  {actionLoading ? 'Đang lưu...' : 'Lưu'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReassigningSvId(null)
                                    setTargetNewGv('')
                                  }}
                                  className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] hover:bg-slate-200 cursor-pointer"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReassigningSvId(sv.maSo)
                                    setTargetNewGv('')
                                    setModalMsg(null)
                                  }}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Đổi sang giảng viên khác"
                                >
                                  <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                                  Đổi GV
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelAssignment(sv)}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Hủy phân công để đưa về hàng chờ"
                                >
                                  <span className="material-symbols-outlined text-[14px]">person_remove</span>
                                  Hủy phân công
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate(`/giang-vien/sinh-vien?gv=${selectedGvForView.maGV}`)}
                className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                Mở trang quản lý tiến độ chi tiết của giảng viên
              </button>
              <button
                type="button"
                onClick={handleCloseViewStudents}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

