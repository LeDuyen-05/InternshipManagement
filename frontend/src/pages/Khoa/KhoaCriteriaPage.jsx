import { useState, useEffect, useMemo, useCallback } from 'react'
import Layout from '../../components/Layout'
import ModalOverlay from '../../components/common/ModalOverlay'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import { rubricService } from '../../services/rubricService'

const NHOM = {
  GV: {
    label: 'GVHD chấm',
    role: 'Giảng viên hướng dẫn',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    icon: 'school',
    maxScore: '5.00',
  },
  DN: {
    label: 'Đơn vị TT chấm',
    role: 'Đơn vị thực tập',
    color: 'bg-teal-50 text-teal-700 border-teal-200/80',
    icon: 'apartment',
    maxScore: '5.00',
  },
}

const createInitialForm = (rubric = '') => ({
  maTieuChi: '',
  maCLO: '',
  maRubric: rubric,
  tenTieuChi: '',
  diemToiDa: '',
  nhomDanhGia: 'GV',
  thuTu: 1,
})

export default function KhoaCriteriaPage() {
  const { selectedDot } = useDotThucTap()
  // Không mặc định bộ của CNTT: chờ danh sách bộ tiêu chí của khoa rồi chọn bộ của đợt đang chọn.
  const activeDotRubric = selectedDot?.maRubric || ''

  const [loaiList, setLoaiList] = useState([])
  const [selectedLoai, setSelectedLoai] = useState('ALL')
  const [rubricList, setRubricList] = useState([])
  const [selectedRubric, setSelectedRubric] = useState('')
  const [rubricDetail, setRubricDetail] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState(() => createInitialForm())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filterNhom, setFilterNhom] = useState('ALL') // 'ALL' | 'GV' | 'DN'
  const [searchKeyword, setSearchKeyword] = useState('')

  // Modal tạo / sao chép bộ tiêu chí
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false)
  const [rubricForm, setRubricForm] = useState({
    maRubric: '',
    tenBo: '',
    maLoaiThucTap: 'TTKS',
    phienBan: 2,
    saoChepTu: '',
  })

  // Tải danh sách loại thực tập
  useEffect(() => {
    async function loadLoai() {
      try {
        const types = await rubricService.getLoaiThucTap()
        setLoaiList(types)
      } catch {
        // ignore
      }
    }
    loadLoai()
  }, [])

  // Tải danh sách bộ tiêu chí theo loại
  const loadRubrics = useCallback(async () => {
    try {
      setLoading(true)
      const rubrics = await rubricService.getBoTieuChi(
        selectedLoai === 'ALL' ? undefined : selectedLoai
      )
      const validRubrics = (rubrics || []).filter(
        (r) => r.maLoaiThucTap && r.maRubric !== 'CNTT_CLO_V1'
      )
      setRubricList(validRubrics)

      // Chọn rubric hợp lệ
      if (validRubrics.length > 0) {
        const currentFound = validRubrics.find((r) => r.maRubric === selectedRubric)
        if (!currentFound) {
          const dotMatch = validRubrics.find((r) => r.maRubric === activeDotRubric)
          setSelectedRubric(dotMatch?.maRubric || validRubrics[0].maRubric)
        }
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Không thể tải danh sách bộ tiêu chí.')
    } finally {
      setLoading(false)
    }
  }, [selectedLoai, selectedRubric, activeDotRubric])

  useEffect(() => {
    loadRubrics()
  }, [loadRubrics])

  // Tải chi tiết bộ tiêu chí đang chọn
  const loadRubricDetail = useCallback(async () => {
    if (!selectedRubric) return
    try {
      setLoading(true)
      const detail = await rubricService.getBoTieuChiDetail(selectedRubric)
      setRubricDetail(detail)
      setItems(detail?.tieuChis || [])
      setError('')
    } catch (e) {
      setError(e.response?.data?.message || 'Không thể tải chi tiết bộ tiêu chí.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [selectedRubric])

  useEffect(() => {
    loadRubricDetail()
  }, [loadRubricDetail])

  const currentRubricInfo = useMemo(() => {
    return rubricList.find((r) => r.maRubric === selectedRubric) || rubricDetail?.boTieuChi
  }, [rubricList, selectedRubric, rubricDetail])

  const isPublished = currentRubricInfo?.trangThai === 'PhatHanh'
  const isRetired = currentRubricInfo?.trangThai === 'NgungApDung'
  const isDraft = !isPublished && !isRetired

  const handleSelectRubric = (rubricId) => {
    setSelectedRubric(rubricId)
    setForm(createInitialForm(rubricId))
  }

  // Danh sách tiêu chí thuộc bộ rubric đang chọn
  const rubricItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.nhomDanhGia !== b.nhomDanhGia) {
        if (a.nhomDanhGia === 'GV') return -1
        if (b.nhomDanhGia === 'GV') return 1
      }
      return (a.thuTu || 0) - (b.thuTu || 0) || a.maTieuChi.localeCompare(b.maTieuChi)
    })
  }, [items])

  // Lọc theo nhóm người chấm & từ khóa tìm kiếm
  const displayItems = useMemo(() => {
    return rubricItems.filter((item) => {
      if (filterNhom !== 'ALL' && item.nhomDanhGia !== filterNhom) return false
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase()
        const matchMa = item.maTieuChi?.toLowerCase().includes(kw)
        const matchTen = item.tenTieuChi?.toLowerCase().includes(kw)
        const matchCLO = item.maCLO?.toLowerCase().includes(kw)
        if (!matchMa && !matchTen && !matchCLO) return false
      }
      return true
    })
  }, [rubricItems, filterNhom, searchKeyword])

  // Thống kê điểm số
  const totalScore = useMemo(() => {
    return rubricItems.reduce((sum, x) => sum + Number(x?.diemToiDa || 0), 0)
  }, [rubricItems])

  const totalGV = useMemo(() => {
    return rubricItems
      .filter((x) => x.nhomDanhGia === 'GV')
      .reduce((sum, x) => sum + Number(x?.diemToiDa || 0), 0)
  }, [rubricItems])

  const totalDN = useMemo(() => {
    return rubricItems
      .filter((x) => x.nhomDanhGia === 'DN')
      .reduce((sum, x) => sum + Number(x?.diemToiDa || 0), 0)
  }, [rubricItems])

  const countGV = useMemo(
    () => rubricItems.filter((x) => x.nhomDanhGia === 'GV').length,
    [rubricItems]
  )
  const countDN = useMemo(
    () => rubricItems.filter((x) => x.nhomDanhGia === 'DN').length,
    [rubricItems]
  )

  // Mở modal Thêm mới tiêu chí
  const handleOpenAdd = () => {
    if (isRetired) {
      setError('Bộ tiêu chí này đã ngừng áp dụng. Không thể thêm tiêu chí.')
      return
    }
    if (isPublished) {
      setError('Bộ tiêu chí đã ban hành: chỉ sửa được mô tả và thứ tự. Muốn đổi điểm, thêm hoặc xóa tiêu chí, hãy sao chép thành phiên bản mới.')
      return
    }
    setForm(createInitialForm(selectedRubric))
    setEditing(false)
    setError('')
    setIsModalOpen(true)
  }

  // Mở modal Chỉnh sửa tiêu chí
  const handleEdit = (item) => {
    if (isRetired) {
      setError('Bộ tiêu chí này đã ngừng áp dụng. Không thể chỉnh sửa.')
      return
    }
    setForm({
      maTieuChi: item.maTieuChi,
      maCLO: item.maCLO || item.maTieuChi,
      maRubric: item.maRubric || selectedRubric,
      tenTieuChi: item.tenTieuChi,
      diemToiDa: item.diemToiDa,
      nhomDanhGia: item.nhomDanhGia || 'GV',
      thuTu: item.thuTu || 0,
    })
    setEditing(true)
    setError('')
    setIsModalOpen(true)
  }

  // Lưu tiêu chí (Thêm mới hoặc Cập nhật)
  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setSubmitting(true)

    const payload = {
      maTieuChi: form.maTieuChi.trim(),
      maCLO: (form.maCLO || form.maTieuChi).trim(),
      maRubric: (form.maRubric || selectedRubric).trim(),
      tenTieuChi: form.tenTieuChi.trim(),
      diemToiDa: Number(form.diemToiDa),
      nhomDanhGia: form.nhomDanhGia,
      thuTu: Number(form.thuTu) || 0,
    }

    if (!payload.maTieuChi) {
      setError('Vui lòng nhập mã tiêu chí!')
      setSubmitting(false)
      return
    }

    if (!payload.tenTieuChi) {
      setError('Vui lòng nhập tên tiêu chí / nội dung chuẩn đầu ra!')
      setSubmitting(false)
      return
    }

    if (!payload.diemToiDa || payload.diemToiDa <= 0) {
      setError('Điểm tối đa phải lớn hơn 0!')
      setSubmitting(false)
      return
    }

    try {
      await rubricService.saveTieuChi(payload, editing)
      setNotice(`Đã lưu tiêu chí ${payload.maTieuChi} thành công.`)
      setIsModalOpen(false)
      await loadRubricDetail()
    } catch (err) {
      setError(
        err.response?.data?.message || 'Không thể lưu tiêu chí. Vui lòng kiểm tra lại thông tin.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Xóa tiêu chí
  const handleRemove = async (item) => {
    if (isRetired) {
      setError('Bộ tiêu chí này đã ngừng áp dụng. Không thể xóa tiêu chí.')
      return
    }
    if (isPublished) {
      setError('Bộ tiêu chí đã ban hành: chỉ sửa được mô tả và thứ tự. Muốn đổi điểm, thêm hoặc xóa tiêu chí, hãy sao chép thành phiên bản mới.')
      return
    }
    const confirmMsg = `Bạn có chắc chắn muốn xóa tiêu chí "${item.maTieuChi} - ${item.tenTieuChi}"?`
    if (!window.confirm(confirmMsg)) return

    try {
      await rubricService.deleteTieuChi(item.maTieuChi)
      setNotice(`Đã xóa tiêu chí ${item.maTieuChi} thành công.`)
      setError('')
      await loadRubricDetail()
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Không thể xóa tiêu chí. Tiêu chí đã được sử dụng nên được bảo toàn lịch sử.'
      )
    }
  }

  // Phát hành bộ tiêu chí
  const handlePublish = async () => {
    const version = currentRubricInfo?.phienBanCapNhat ?? 0
    if (Math.abs(totalScore - 10) > 0.001) {
      setError(`Tổng điểm của bộ tiêu chí phải bằng 10.00 (hiện tại: ${totalScore.toFixed(2)}).`)
      return
    }
    if (Math.abs(totalGV - 5) > 0.001) {
      setError(`Tổng điểm phần GVHD phải bằng 5.00 (hiện tại: ${totalGV.toFixed(2)}).`)
      return
    }
    if (Math.abs(totalDN - 5) > 0.001) {
      setError(`Tổng điểm phần Doanh nghiệp phải bằng 5.00 (hiện tại: ${totalDN.toFixed(2)}).`)
      return
    }

    if (!window.confirm(`Xác nhận phát hành bộ tiêu chí "${selectedRubric}"? Sau khi phát hành, nội dung và điểm của bộ sẽ không thể sửa đổi.`)) {
      return
    }

    try {
      await rubricService.phatHanhBoTieuChi(selectedRubric, version)
      setNotice(`Đã phát hành bộ tiêu chí "${selectedRubric}" thành công.`)
      setError('')
      await loadRubrics()
      await loadRubricDetail()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể phát hành bộ tiêu chí. Kiểm tra lại phiên bản.')
    }
  }

  // Ngừng áp dụng bộ tiêu chí
  const handleRetire = async () => {
    const version = currentRubricInfo?.phienBanCapNhat ?? 0
    if (!window.confirm(`Xác nhận ngừng áp dụng bộ tiêu chí "${selectedRubric}"? Các đợt thực tập mới sẽ không thể chọn bộ này.`)) {
      return
    }

    try {
      await rubricService.ngungApDungBoTieuChi(selectedRubric, version)
      setNotice(`Đã ngừng áp dụng bộ tiêu chí "${selectedRubric}".`)
      setError('')
      await loadRubrics()
      await loadRubricDetail()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể ngừng áp dụng bộ tiêu chí.')
    }
  }

  // Tạo / sao chép bộ mới
  const handleCreateRubric = async (e) => {
    e.preventDefault()
    if (!rubricForm.maRubric.trim()) {
      setError('Vui lòng nhập mã bộ tiêu chí!')
      return
    }
    if (!rubricForm.tenBo.trim()) {
      setError('Vui lòng nhập tên bộ tiêu chí!')
      return
    }

    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      await rubricService.createBoTieuChi({
        maRubric: rubricForm.maRubric.trim().toUpperCase(),
        tenBo: rubricForm.tenBo.trim(),
        maLoaiThucTap: rubricForm.maLoaiThucTap,
        phienBan: Number(rubricForm.phienBan) || 1,
        saoChepTu: rubricForm.saoChepTu || null,
      })
      setNotice(`Đã tạo thành công bộ tiêu chí nháp "${rubricForm.maRubric.toUpperCase()}".`)
      setIsRubricModalOpen(false)
      setSelectedRubric(rubricForm.maRubric.toUpperCase())
      await loadRubrics()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo bộ tiêu chí mới.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Top Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                QUẢN LÝ BỘ ĐIỂM THEO LOẠI THỰC TẬP
              </span>
              {selectedDot && (
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Đợt: {selectedDot.tenDot} ({selectedDot.maLoaiThucTap || 'TTKS'})
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
              Tiêu chí đánh giá &amp; Chuẩn đầu ra (CLO)
            </h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
              Khung tiêu chí đánh giá chuẩn đầu ra học phần Thực tập tốt nghiệp. Tổng điểm thang 10 gồm Giảng viên hướng dẫn đánh giá 5.00 điểm và Đơn vị thực tập đánh giá 5.00 điểm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                loadRubrics()
                loadRubricDetail()
              }}
              disabled={loading}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Tải lại danh sách tiêu chí"
            >
              <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Làm mới</span>
            </button>

            <button
              onClick={() => {
                setRubricForm({
                  maRubric: '',
                  tenBo: '',
                  maLoaiThucTap: currentRubricInfo?.maLoaiThucTap || 'TTKS',
                  phienBan: (currentRubricInfo?.phienBan || 1) + 1,
                  saoChepTu: selectedRubric || '',
                })
                setIsRubricModalOpen(true)
              }}
              className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">content_copy</span>
              <span>Tạo phiên bản mới</span>
            </button>



            {isDraft && (
              <button
                onClick={handlePublish}
                className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">verified</span>
                <span>Ban hành chính thức</span>
              </button>
            )}

            {isPublished && (
              <button
                onClick={handleRetire}
                className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">block</span>
                <span>Ngừng áp dụng</span>
              </button>
            )}
          </div>
        </div>

        {/* Thông báo Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs shadow-2xs">
            <span className="material-symbols-outlined text-rose-600 text-base shrink-0 mt-0.5">
              error
            </span>
            <div className="flex-1 font-medium">{error}</div>
            <button
              onClick={() => setError('')}
              className="text-rose-500 hover:text-rose-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {notice && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800 text-xs shadow-2xs">
            <span className="material-symbols-outlined text-emerald-600 text-base shrink-0 mt-0.5">
              check_circle
            </span>
            <div className="flex-1 font-medium">{notice}</div>
            <button
              onClick={() => setNotice('')}
              className="text-emerald-500 hover:text-emerald-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {/* Banner trạng thái bộ tiêu chí */}
        {isRetired && (
          <div className="p-4 rounded-2xl border bg-rose-50 border-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600 text-lg">
                block
              </span>
              <span className="text-slate-700 font-medium">
                Bộ tiêu chí <strong>{selectedRubric}</strong> đã ngừng áp dụng. Dữ liệu chỉ dùng để tra cứu lịch sử đánh giá.
              </span>
            </div>
          </div>
        )}

        {/* 4 Thẻ Bento KPI Thống Kê Điểm Chuẩn */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bento 1: Tổng điểm bộ Rubric */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Tổng điểm đánh giá
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  Math.abs(totalScore - 10) < 0.001
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {Math.abs(totalScore - 10) < 0.001 ? 'verified' : 'warning'}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-bold tracking-tight ${
                  Math.abs(totalScore - 10) < 0.001 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {totalScore.toFixed(2)}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 10.00 điểm</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {Math.abs(totalScore - 10) < 0.001 ? '✓ Đạt chuẩn thang điểm 10.00' : '⚠ Chưa đạt tổng điểm 10.00'}
            </p>
          </div>

          {/* Bento 2: GVHD chấm */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Giảng viên hướng dẫn
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">school</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-indigo-700 tracking-tight">
                {totalGV.toFixed(2)}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 5.00 điểm</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {countGV} tiêu chí ({currentRubricInfo?.maLoaiThucTap === 'TTKS' ? 'CLO1.1–CLO3.5' : 'CLO1.1–CLO3.4'})
            </p>
          </div>

          {/* Bento 3: Doanh nghiệp chấm */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Đơn vị thực tập
              </span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">apartment</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-teal-700 tracking-tight">
                {totalDN.toFixed(2)}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 5.00 điểm</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {countDN} tiêu chí (CLO4.1=2.00, CLO4.2=3.00)
            </p>
          </div>

          {/* Bento 4: Số lượng tiêu chí */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Số lượng tiêu chí
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">checklist</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {rubricItems.length}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                tiêu chí ({currentRubricInfo?.maLoaiThucTap || 'TTKS'})
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              {isPublished ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                  Đã ban hành
                </span>
              ) : isRetired ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">
                  Ngừng áp dụng
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                  Bản dự thảo
                </span>
              )}
              <span className="text-[11px] text-slate-400 font-mono">
                v{currentRubricInfo?.phienBan ?? 1}
              </span>
            </div>
          </div>
        </div>

        {/* Thanh chọn loại và bộ Rubric */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-slate-400 text-lg">filter_alt</span>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Loại:
              </label>
              <select
                value={selectedLoai}
                onChange={(e) => setSelectedLoai(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
              >
                <option value="ALL">Tất cả loại thực tập</option>
                {loaiList.map((l) => (
                  <option key={l.maLoai} value={l.maLoai}>
                    {l.tenLoai} ({l.maLoai})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {rubricList.map((rubric) => {
              const isSelected = rubric.maRubric === selectedRubric
              const isDotActive = rubric.maRubric === activeDotRubric
              return (
                <button
                  key={rubric.maRubric}
                  onClick={() => handleSelectRubric(rubric.maRubric)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-indigo-100'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{rubric.maRubric}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-indigo-800/60 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {rubric.soTieuChi || rubric.tieuChis?.length || 0}
                  </span>
                  {rubric.trangThai === 'PhatHanh' ? (
                    <span
                      className={`text-[9px] px-1 rounded-md font-bold uppercase ${
                        isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Ban hành
                    </span>
                  ) : rubric.trangThai === 'NgungApDung' ? (
                    <span
                      className={`text-[9px] px-1 rounded-md font-bold uppercase ${
                        isSelected ? 'bg-slate-500 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      Ngừng
                    </span>
                  ) : (
                    <span
                      className={`text-[9px] px-1 rounded-md font-bold uppercase ${
                        isSelected ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Dự thảo
                    </span>
                  )}
                  {isDotActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Đợt đang chọn áp dụng bộ này"></span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* BẢNG DANH MỤC TIÊU CHÍ */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Header Bảng & Bộ Lọc */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 m-0">
                <span className="material-symbols-outlined text-indigo-600 text-lg">
                  format_list_bulleted
                </span>
                <span>
                  Danh mục tiêu chí ({selectedRubric} - {currentRubricInfo?.tenBo || 'Bộ tiêu chí'})
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 m-0">
                Hiển thị {displayItems.length} / {rubricItems.length} tiêu chí • Loại: {currentRubricInfo?.maLoaiThucTap || 'TTKS'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Lọc theo người chấm */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setFilterNhom('ALL')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    filterNhom === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({rubricItems.length})
                </button>
                <button
                  onClick={() => setFilterNhom('GV')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                    filterNhom === 'GV'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">school</span>
                  <span>GVHD ({countGV})</span>
                </button>
                <button
                  onClick={() => setFilterNhom('DN')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                    filterNhom === 'DN'
                      ? 'bg-white text-teal-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">apartment</span>
                  <span>Đơn vị TT ({countDN})</span>
                </button>
              </div>

              {/* Tìm kiếm */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  search
                </span>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm mã hoặc tên tiêu chí..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 w-48 text-slate-900 placeholder:text-slate-400 shadow-2xs"
                />
                {searchKeyword && (
                  <button
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>

              {/* Nút Thêm tiêu chí đặt đúng trên thanh công cụ bảng (bộ đã ban hành chỉ sửa mô tả/thứ tự) */}
              {isDraft && (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="Thêm một tiêu chí đánh giá mới vào bảng này"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>Thêm tiêu chí</span>
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3 w-14 text-center">STT</th>
                  <th className="py-3 px-4 w-28 text-center">Mã CLO</th>
                  <th className="py-3 px-4">Nội dung chuẩn đầu ra / Tiêu chí đánh giá</th>
                  <th className="py-3 px-3 w-36 text-center">Phụ trách chấm</th>
                  <th className="py-3 px-3 w-28 text-center">Điểm tối đa</th>
                  <th className="py-3 px-4 w-24 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined text-2xl animate-spin">
                          progress_activity
                        </span>
                        <span className="text-xs">Đang tải danh sách tiêu chí...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined text-3xl text-slate-300">rule</span>
                        <span className="text-xs font-medium text-slate-500">
                          {searchKeyword
                            ? 'Không tìm thấy tiêu chí nào phù hợp với từ khóa'
                            : 'Chưa có tiêu chí nào trong bộ rubric này'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayItems.map((item, idx) => {
                    const nhom = NHOM[item.nhomDanhGia] || NHOM.GV
                    return (
                      <tr key={item.maTieuChi} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-500 font-medium">
                          {item.thuTu || idx + 1}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-indigo-700 bg-indigo-50/70 px-2.5 py-1 rounded-md text-xs font-mono" title={`Mã hệ thống: ${item.maTieuChi}`}>
                            {item.maCLO || item.maTieuChi}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          {item.tenTieuChi}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${nhom.color}`}
                          >
                            <span className="material-symbols-outlined text-[13px]">{nhom.icon}</span>
                            <span>{nhom.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                          {Number(item.diemToiDa).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {!isRetired ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEdit(item)}
                                className="w-7 h-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors cursor-pointer"
                                title="Chỉnh sửa tiêu chí"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span>
                              </button>
                              {isDraft && (
                              <button
                                onClick={() => handleRemove(item)}
                                className="w-7 h-7 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                                title="Xóa tiêu chí"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Đã khóa</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Thêm / Chỉnh sửa Tiêu chí */}
      {isModalOpen && (
        <ModalOverlay isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editing ? 'Chỉnh sửa tiêu chí đánh giá' : 'Thêm tiêu chí CLO mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {isPublished && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                Bộ tiêu chí đã ban hành: chỉ sửa được tên/mô tả và thứ tự. Muốn đổi CLO, người chấm hoặc điểm tối đa,
                hãy sao chép thành phiên bản mới.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mã chuẩn đầu ra (CLO) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: CLO3.5"
                  disabled={isPublished}
                  value={form.maCLO}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({
                      ...form,
                      maCLO: val,
                      maTieuChi: editing ? form.maTieuChi : (selectedRubric + '_' + val.trim().toUpperCase()),
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bộ tiêu chí áp dụng
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedRubric + ' (' + (currentRubricInfo?.tenBo || '') + ')'}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tên tiêu chí / Nội dung chuẩn đầu ra <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="VD: Trả lời câu hỏi của Giảng viên hướng dẫn..."
                value={form.tenTieuChi}
                onChange={(e) => setForm({ ...form, tenTieuChi: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Người chấm <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={isPublished}
                  value={form.nhomDanhGia}
                  onChange={(e) => setForm({ ...form, nhomDanhGia: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="GV">GVHD chấm</option>
                  <option value="DN">Đơn vị TT chấm</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Điểm tối đa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="10"
                  required
                  placeholder="0.50"
                  disabled={isPublished}
                  value={form.diemToiDa}
                  onChange={(e) => setForm({ ...form, diemToiDa: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Thứ tự sắp xếp
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={form.thuTu}
                  onChange={(e) => setForm({ ...form, thuTu: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang lưu...' : editing ? 'Cập nhật tiêu chí' : 'Thêm tiêu chí'}
              </button>
            </div>
          </form>
        </div>
      </ModalOverlay>
      )}

      {/* Modal Tạo / Sao chép Bộ Rubric */}
      {isRubricModalOpen && (
        <ModalOverlay isOpen={isRubricModalOpen} onClose={() => setIsRubricModalOpen(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Tạo phiên bản bộ tiêu chí mới
              </h3>
              <button
                type="button"
                onClick={() => setIsRubricModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateRubric} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{error}</span>
                </div>
              )}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mã bộ tiêu chí mới <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={12}
                placeholder="VD: TTKS_V2"
                value={rubricForm.maRubric}
                onChange={(e) =>
                  setRubricForm({
                    ...rubricForm,
                    maRubric: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''),
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Mã viết liền không dấu, tối đa 12 ký tự (Ví dụ: TTKS_V2, TTNN_V2).
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tên bộ tiêu chí <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                placeholder="VD: Tiêu chí Thực tập kỹ sư (Ban hành 2026)"
                value={rubricForm.tenBo}
                onChange={(e) => setRubricForm({ ...rubricForm, tenBo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Loại thực tập <span className="text-rose-500">*</span>
                </label>
                <select
                  value={rubricForm.maLoaiThucTap}
                  onChange={(e) =>
                    setRubricForm({ ...rubricForm, maLoaiThucTap: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  {loaiList.filter((l) => l.hoatDong).map((l) => (
                    <option key={l.maLoai} value={l.maLoai}>{l.tenLoai} ({l.maLoai})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Số phiên bản
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={rubricForm.phienBan}
                  onChange={(e) =>
                    setRubricForm({ ...rubricForm, phienBan: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Kế thừa dữ liệu từ bộ tiêu chí hiện có (tùy chọn)
              </label>
              <select
                value={rubricForm.saoChepTu}
                onChange={(e) =>
                  setRubricForm({ ...rubricForm, saoChepTu: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              >
                <option value="">-- Khởi tạo bộ tiêu chí trống --</option>
                {rubricList.map((r) => (
                  <option key={r.maRubric} value={r.maRubric}>
                    {r.maRubric} - {r.tenBo} ({r.soTieuChi || r.tieuChis?.length || 0} tiêu chí)
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Hệ thống sẽ sao chép toàn bộ danh mục tiêu chí và điểm số từ bộ đã chọn sang phiên bản mới.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRubricModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang lưu...' : 'Lưu bộ tiêu chí'}
              </button>
            </div>
          </form>
        </div>
      </ModalOverlay>
      )}
    </Layout>
  )
}
