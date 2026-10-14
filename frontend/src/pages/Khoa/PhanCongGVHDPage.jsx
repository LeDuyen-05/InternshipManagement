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
    if (selectedSvList.length === sinhViens.length) {
      setSelectedSvList([])
    } else {
      setSelectedSvList(sinhViens.map((s) => s.maSV))
    }
  }

  // Thực hiện phân công cho 1 giảng viên cụ thể
  const handleAssignToLecturer = async (gv) => {
    if (selectedSvList.length === 0) {
      alert('Vui lòng tích chọn ít nhất 1 sinh viên bên danh sách bên trái!')
      return
    }

    const slotsLeft = (gv.chiTieu ?? gv.soLuongSVHD ?? 10) - gv.soLuongHienTai
    if (slotsLeft <= 0) {
      alert(`Giảng viên ${gv.hoTen} đã đạt hạn ngạch tối đa (${gv.soLuongHienTai}/${gv.chiTieu ?? gv.soLuongSVHD ?? 10}).`)
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

  // Lọc danh sách GV theo từ khoá tìm kiếm
  const filteredGiangViens = giangViens.filter((gv) => {
    if (!gvKeyword.trim()) return true
    const kw = gvKeyword.toLowerCase()
    return (
      gv.hoTen?.toLowerCase().includes(kw) ||
      gv.maGV?.toLowerCase().includes(kw) ||
      gv.chuyenMon?.toLowerCase().includes(kw)
    )
  })

  // Mở modal chỉnh sửa chỉ tiêu
  const handleOpenEditQuota = (gv) => {
    setEditQuotaGV(gv)
    setNewQuota(String(gv.chiTieu ?? gv.soLuongSVHD ?? 10))
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

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAutoAssign}
            disabled={loadingAutoAssign || sinhViens.length === 0}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            title="Tự động ghép cặp sinh viên theo chuyên môn & cân bằng chỉ tiêu giảng viên"
          >
            {loadingAutoAssign ? (
              <span className="material-symbols-outlined text-base animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-base">smart_toy</span>
            )}
            <span>Phân công tự động thông minh</span>
          </button>

          <button
            onClick={loadData}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Làm mới
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

      {/* 2. Giao diện Phân công 2 Cột Trực Quan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (7/12): Danh sách Sinh viên Chưa Có GVHD */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px]">
          {/* Header Bảng SV */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 rounded-t-2xl">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-800 text-sm">Sinh Viên Chờ Phân Công</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                  {sinhViens.length} SV
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Tích chọn sinh viên để gán vào giảng viên bên phải</p>
            </div>

            {/* Ô tìm kiếm */}
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

          {/* Thanh tác vụ chọn hàng loạt */}
          <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={sinhViens.length > 0 && selectedSvList.length === sinhViens.length}
                onChange={handleSelectAllSv}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              Chọn tất cả ({selectedSvList.length}/{sinhViens.length})
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
            ) : sinhViens.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl text-emerald-400">task_alt</span>
                <p className="mt-2 text-sm font-semibold text-slate-700">Tuyệt vời! Đã phân công hết sinh viên</p>
                <p className="text-xs text-slate-400 mt-0.5">Không còn sinh viên nào đang chờ xếp giảng viên.</p>
              </div>
            ) : (
              sinhViens.map((sv) => {
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
                      <div className="text-xs font-semibold text-slate-800 flex items-center gap-1 justify-end">
                        <span className="material-symbols-outlined text-xs text-slate-400">apartment</span>
                        {sv?.tenCongTy || 'Chưa có DN tiếp nhận'}
                      </div>
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-1 inline-block">
                        Chưa có GVHD
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
          </div>

          {/* Danh sách cuộn Giảng viên */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {filteredGiangViens.map((gv) => {
              const quota = gv.chiTieu ?? gv.soLuongSVHD ?? 10
              const isFull = gv.soLuongHienTai >= quota
              const percent = Math.min(100, gv.tyLeTai || (quota > 0 ? Math.round((gv.soLuongHienTai / quota) * 100) : 0))

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
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{gv.hoTen}</span>
                        <span className="text-[11px] font-mono text-slate-400">({gv.maGV})</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Chuyên môn: {gv.chuyenMon || 'Công nghệ phần mềm'}
                      </p>
                    </div>

                    {/* Nút hành động Phân công */}
                    <button
                      onClick={() => handleAssignToLecturer(gv)}
                      disabled={isFull || submitting || selectedSvList.length === 0}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                        isFull
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : selectedSvList.length === 0
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">person_add</span>
                      {isFull ? 'Đã đầy' : 'Phân công'}
                    </button>
                  </div>

                  {/* Thanh Tiến độ Quota */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Tải hướng dẫn:</span>
                        <span className="font-bold text-slate-800">
                          {gv.soLuongHienTai} / {quota} SV ({percent}%)
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
                          onClick={() => navigate(`/giang-vien/sinh-vien?gv=${gv.maGV}`)}
                          className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                          title="Xem danh sách SV đang hướng dẫn"
                        >
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          Xem DS
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
                <p className="text-[11px] text-rose-600 font-bold uppercase">Chưa thể ghép (Hết slot)</p>
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
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            {item.lyDoGhep}
                          </span>
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
    </div>
  )
}
