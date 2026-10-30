import { useState, useEffect, useMemo } from 'react'
import Layout from '../../components/Layout'
import apiClient from '../../services/api'
import { useDotThucTap } from '../../contexts/DotThucTapContext'

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

const createInitialForm = (rubric = 'CNTT_CLO_V1') => ({
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
  const activeDotRubric = selectedDot?.maRubric || 'CNTT_CLO_V1'

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRubric, setSelectedRubric] = useState('CNTT_CLO_V1')
  const [form, setForm] = useState(() => createInitialForm('CNTT_CLO_V1'))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filterNhom, setFilterNhom] = useState('ALL') // 'ALL' | 'GV' | 'DN'
  const [searchKeyword, setSearchKeyword] = useState('')

  // Tải danh sách tiêu chí từ backend
  const load = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/khoa/tieu-chi')
      const data = Array.isArray(res.data) ? res.data : []
      setItems(data)
      setError('')

      const rubrics = Array.from(new Set(data.map((x) => x.maRubric).filter(Boolean)))
      if (rubrics.length > 0) {
        if (selectedDot?.maRubric && rubrics.includes(selectedDot.maRubric)) {
          setSelectedRubric(selectedDot.maRubric)
        } else if (rubrics.includes('CNTT_CLO_V1')) {
          setSelectedRubric('CNTT_CLO_V1')
        } else {
          setSelectedRubric(rubrics[0])
        }
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Không thể tải danh sách tiêu chí đánh giá.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [selectedDot?.maDot])

  // Danh sách các bộ rubric hiện có
  const rubricList = useMemo(() => {
    const set = new Set()
    if (activeDotRubric) set.add(activeDotRubric)
    set.add('CNTT_CLO_V1')
    items.forEach((x) => {
      if (x.maRubric) set.add(x.maRubric)
    })
    return Array.from(set)
  }, [items, activeDotRubric])

  const handleSelectRubric = (rubric) => {
    setSelectedRubric(rubric)
    setForm(createInitialForm(rubric))
  }

  // Danh sách tiêu chí thuộc bộ rubric đang chọn
  const rubricItems = useMemo(() => {
    return items
      .filter((x) => (x.maRubric || 'CNTT_CLO_V1') === selectedRubric)
      .sort((a, b) => {
        // Ưu tiên GV trước, DN sau; sau đó theo thuTu
        if (a.nhomDanhGia !== b.nhomDanhGia) {
          if (a.nhomDanhGia === 'GV') return -1
          if (b.nhomDanhGia === 'GV') return 1
        }
        return (a.thuTu || 0) - (b.thuTu || 0) || a.maTieuChi.localeCompare(b.maTieuChi)
      })
  }, [items, selectedRubric])

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

  // Mở modal Thêm mới
  const handleOpenAdd = () => {
    setForm(createInitialForm(selectedRubric))
    setEditing(false)
    setError('')
    setIsModalOpen(true)
  }

  // Mở modal Chỉnh sửa
  const handleEdit = (item) => {
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

  // Đóng modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditing(false)
  }

  // Lưu (Thêm mới hoặc Cập nhật)
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
      if (editing) {
        await apiClient.put(`/khoa/tieu-chi/${encodeURIComponent(form.maTieuChi)}`, payload)
        setNotice(`Đã cập nhật tiêu chí ${form.maTieuChi} thành công.`)
      } else {
        await apiClient.post('/khoa/tieu-chi', payload)
        setNotice(
          `Đã thêm mới tiêu chí ${payload.maTieuChi} vào bộ rubric ${payload.maRubric} thành công.`
        )
      }
      setIsModalOpen(false)
      await load()
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
    const confirmMsg = `Bạn có chắc chắn muốn xóa tiêu chí "${item.maTieuChi} - ${item.tenTieuChi}"?`
    if (!window.confirm(confirmMsg)) return

    try {
      await apiClient.delete(`/khoa/tieu-chi/${encodeURIComponent(item.maTieuChi)}`)
      setNotice(`Đã xóa tiêu chí ${item.maTieuChi} thành công.`)
      setError('')
      await load()
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Không thể xóa tiêu chí. Tiêu chí đã được sử dụng trong các phiếu chấm điểm của sinh viên nên được hệ thống bảo toàn lịch sử.'
      )
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
                CẤU HÌNH HỌC VỤ & CHUẨN ĐẦU RA
              </span>
              {selectedDot && (
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Đợt: {selectedDot.tenDot}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
              Tiêu chí đánh giá & Chuẩn đầu ra (CLO)
            </h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
              Quản lý chuẩn 11 tiêu chí CLO theo mẫu quy chuẩn của Khoa CNTT (GVHD chấm 5.00 điểm gồm CLO1.1–CLO3.4; Đơn vị thực tập chấm 5.00 điểm gồm CLO4.1–CLO4.2).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={load}
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
              onClick={handleOpenAdd}
              className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              <span>Thêm tiêu chí CLO</span>
            </button>
            <a
              href="/khoa/thong-ke-clo"
              className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all border border-indigo-200/70 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">analytics</span>
              <span>Báo cáo thống kê CLO</span>
            </a>
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

        {/* 4 Thẻ Bento KPI Thống Kê Điểm Chuẩn */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bento 1: Tổng điểm bộ Rubric */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Tổng điểm bộ Rubric
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  totalScore === 10
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {totalScore === 10 ? 'verified' : 'warning'}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-bold tracking-tight ${
                  totalScore === 10 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {totalScore.toFixed(2)}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 10.00 điểm</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {totalScore === 10 ? '✓ Đạt chuẩn 10.00 điểm HUIT' : '⚠ Chưa đủ/vượt thang điểm 10.00'}
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
              {countGV} tiêu chí (CLO1.1 – CLO3.4)
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
              {countDN} tiêu chí (CLO4.1 – CLO4.2)
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
              <span className="text-sm font-semibold text-slate-400">tiêu chí chuẩn</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate" title={`Bộ rubric: ${selectedRubric}`}>
              Bộ: <span className="font-semibold text-slate-700">{selectedRubric}</span>
            </p>
          </div>
        </div>

        {/* Thanh chọn bộ Rubric */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">schema</span>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Bộ Rubric đang quản lý:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {rubricList.map((rubric) => {
              const isSelected = rubric === selectedRubric
              const isDotActive = rubric === activeDotRubric
              const countInRubric = items.filter(
                (x) => (x.maRubric || 'CNTT_CLO_V1') === rubric
              ).length
              return (
                <button
                  key={rubric}
                  onClick={() => handleSelectRubric(rubric)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-indigo-100'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{rubric}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-indigo-800/60 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {countInRubric}
                  </span>
                  {isDotActive && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold uppercase ${
                        isSelected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Đang áp dụng
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* BẢNG DANH MỤC TIÊU CHÍ (Hiển thị toàn bộ 11 tiêu chí trực quan, không cắt vụn trang) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Header Bảng & Bộ Lọc */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 m-0">
                <span className="material-symbols-outlined text-indigo-600 text-lg">
                  format_list_bulleted
                </span>
                <span>Danh mục tiêu chí CLO ({selectedRubric})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 m-0">
                Hiển thị {displayItems.length} / {rubricItems.length} tiêu chí chuẩn
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
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 w-56 text-slate-900 placeholder:text-slate-400 shadow-2xs"
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
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3 w-14 text-center">STT</th>
                  <th className="py-3 px-4 w-28">Mã tiêu chí</th>
                  <th className="py-3 px-3 w-28">Mã CLO</th>
                  <th className="py-3 px-4">Tên chuẩn đầu ra / Tiêu chí đánh giá</th>
                  <th className="py-3 px-3 w-40">Người chấm</th>
                  <th className="py-3 px-3 w-28 text-center">Điểm tối đa</th>
                  <th className="py-3 px-4 w-32 text-center">Thao tác</th>
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
                          {rubricItems.length === 0
                            ? `Chưa có tiêu chí nào trong bộ rubric "${selectedRubric}". Bấm nút "Thêm tiêu chí CLO" ở trên để bổ sung.`
                            : 'Không tìm thấy tiêu chí nào phù hợp với từ khóa tìm kiếm.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayItems.map((item, index) => {
                    const nhomConfig = NHOM[item.nhomDanhGia] || {
                      label: 'Chưa phân nhóm',
                      color: 'bg-slate-100 text-slate-600',
                      icon: 'help',
                    }
                    return (
                      <tr
                        key={item.maTieuChi}
                        className="transition-colors hover:bg-slate-50/80"
                      >
                        <td className="py-3.5 px-3 text-center font-bold text-slate-400">
                          {item.thuTu || index + 1}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-[11px]">
                            {item.maTieuChi}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200/60 text-[11px]">
                            {item.maCLO || item.maTieuChi}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-900 leading-relaxed">
                          {item.tenTieuChi}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${nhomConfig.color}`}
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {nhomConfig.icon}
                            </span>
                            <span>{nhomConfig.label}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-xs">
                            {Number(item.diemToiDa).toFixed(2)} đ
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(item)}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Chỉnh sửa thông tin tiêu chí"
                            >
                              <span className="material-symbols-outlined text-xs">edit</span>
                              <span>Sửa</span>
                            </button>
                            <button
                              onClick={() => handleRemove(item)}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Xóa tiêu chí khỏi bộ rubric"
                            >
                              <span className="material-symbols-outlined text-xs">delete</span>
                              <span>Xóa</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer tóm tắt */}
          <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Hiển thị đầy đủ <strong className="text-slate-800">{displayItems.length} tiêu chí</strong> trong bộ rubric <strong className="text-indigo-700">{selectedRubric}</strong>.
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <span>GVHD chấm: <strong>{totalGV.toFixed(2)} / 5.00 đ</strong></span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                <span>Đơn vị TT: <strong>{totalDN.toFixed(2)} / 5.00 đ</strong></span>
              </span>
              <span className="flex items-center gap-1 font-bold text-slate-800">
                <span>Tổng: <strong>{totalScore.toFixed(2)} / 10.00 đ</strong></span>
              </span>
            </div>
          </div>
        </div>

        {/* Khung Nguyên Tắc Đánh Giá Chuẩn Đầu Ra (CLO) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">verified</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 m-0">
                  Khung đánh giá & Nguyên tắc phân bổ Chuẩn đầu ra (CLO)
                </h4>
                <p className="text-[11px] text-slate-500 m-0">
                  Áp dụng theo chuẩn kiểm định chất lượng đào tạo Khoa Công nghệ Thông tin
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                Thang điểm 10.00
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                Tỷ lệ 50% - 50%
              </span>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nhánh 1: Giảng viên hướng dẫn */}
            <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/70 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm">school</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Giảng viên hướng dẫn đánh giá
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Năng lực chuyên môn, tiến độ & báo cáo đề tài
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                  5.00 / 10.00 đ (50%)
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <p className="m-0 leading-relaxed">
                  Đánh giá trực tiếp trên hệ thống qua <strong>9 tiêu chí</strong> thành phần từ <strong>CLO1.1 đến CLO3.4</strong>:
                </p>
                <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                    <span className="text-slate-700">Mục tiêu, nội dung & Giới thiệu đơn vị thực tập (CLO1.1, CLO1.2)</span>
                    <strong className="text-indigo-700 font-mono">1.50 đ</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                    <span className="text-slate-700">Vị trí thực tập & Kế hoạch làm việc (CLO1.3)</span>
                    <strong className="text-indigo-700 font-mono">0.50 đ</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                    <span className="text-slate-700">Vận dụng kiến thức & Phương pháp giải quyết (CLO2.1, CLO2.2)</span>
                    <strong className="text-indigo-700 font-mono">1.00 đ</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                    <span className="text-slate-700">Yêu cầu công việc & Quyển báo cáo đề tài (CLO3.1, CLO3.2)</span>
                    <strong className="text-indigo-700 font-mono">1.00 đ</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                    <span className="text-slate-700">Thuyết trình đề tài & Trả lời vấn đáp (CLO3.3, CLO3.4)</span>
                    <strong className="text-indigo-700 font-mono">1.00 đ</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Nhánh 2: Đơn vị thực tập */}
            <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/70 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm">apartment</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Đơn vị thực tập đánh giá
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Tác phong công nghiệp & Khả năng vận dụng thực tiễn
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                  5.00 / 10.00 đ (50%)
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <p className="m-0 leading-relaxed">
                  Đánh giá qua Phiếu nhận xét doanh nghiệp bằng <strong>2 tiêu chí</strong> chuẩn đầu ra <strong>CLO4.1 và CLO4.2</strong>:
                </p>
                <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-800 block">CLO4.1 — Ý thức tổ chức kỷ luật</span>
                      <span className="text-[10px] text-slate-500">Tinh thần trách nhiệm, văn hóa doanh nghiệp, tuân thủ nội quy</span>
                    </div>
                    <strong className="text-teal-700 font-mono text-xs">2.00 đ</strong>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-800 block">CLO4.2 — Khả năng vận dụng vào thực tế</span>
                      <span className="text-[10px] text-slate-500">Kỹ năng kỹ thuật, giải quyết công việc được giao tại cơ sở</span>
                    </div>
                    <strong className="text-teal-700 font-mono text-xs">3.00 đ</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-teal-50/50 border border-teal-100 text-[10px] text-teal-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">info</span>
                    <span>Điểm doanh nghiệp được quy đổi trực tiếp vào hệ thống học vụ theo thang điểm chính thức.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs text-slate-400">rule</span>
              <span>Điểm tổng kết học phần = Điểm Giảng viên hướng dẫn (thang 5) + Điểm Doanh nghiệp (thang 5).</span>
            </span>
            <span className="font-medium text-slate-600">
              Quy chuẩn làm tròn 1 chữ số thập phân trước khi xếp loại
            </span>
          </div>
        </div>

        {/* BENTO MODAL POPUP: THÊM / CHỈNH SỬA TIÊU CHÍ */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      editing
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {editing ? 'edit_note' : 'add_circle'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 m-0">
                      {editing
                        ? `Chỉnh sửa tiêu chí: ${form.maTieuChi}`
                        : 'Thêm tiêu chí CLO mới'}
                    </h3>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">
                      Bộ rubric: <strong className="text-indigo-700">{form.maRubric || selectedRubric}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-8 h-8 rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Mã tiêu chí */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mã tiêu chí <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength="20"
                      disabled={editing}
                      value={form.maTieuChi}
                      onChange={(e) =>
                        setForm({ ...form, maTieuChi: e.target.value.toUpperCase().trim() })
                      }
                      placeholder="VD: CLO1.1, CLO4.1..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 font-mono font-bold shadow-2xs disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 m-0">
                      Khóa duy nhất (không đổi sau khi tạo)
                    </p>
                  </div>

                  {/* Mã CLO */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mã CLO chuẩn <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength="20"
                      value={form.maCLO}
                      onChange={(e) =>
                        setForm({ ...form, maCLO: e.target.value.toUpperCase().trim() })
                      }
                      placeholder="VD: CLO1.1, CLO4.1..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 font-semibold shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 m-0">
                      Ánh xạ chuẩn đầu ra chương trình
                    </p>
                  </div>

                  {/* Người chấm */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Người chấm <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={form.nhomDanhGia}
                      onChange={(e) => setForm({ ...form, nhomDanhGia: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-900 font-semibold shadow-2xs cursor-pointer"
                    >
                      <option value="GV">Giảng viên hướng dẫn (chấm tối đa 5.00đ)</option>
                      <option value="DN">Đơn vị thực tập (chấm tối đa 5.00đ)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1 m-0">
                      Phân quyền nhập điểm thành phần
                    </p>
                  </div>

                  {/* Điểm tối đa */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Điểm tối đa <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="10"
                      required
                      value={form.diemToiDa}
                      onChange={(e) => setForm({ ...form, diemToiDa: e.target.value })}
                      placeholder="VD: 0.50, 0.75, 2.00, 3.00..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 font-mono font-bold shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 m-0">
                      Thang điểm thành phần
                    </p>
                  </div>

                  {/* Thứ tự hiển thị */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Thứ tự hiển thị
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={form.thuTu}
                      onChange={(e) => setForm({ ...form, thuTu: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 font-semibold shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 m-0">
                      Thứ tự 1 đến 11 trên phiếu chấm
                    </p>
                  </div>

                  {/* Bộ rubric */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Bộ rubric
                    </label>
                    <input
                      type="text"
                      disabled
                      value={form.maRubric}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-mono shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 m-0">
                      Bộ rubric đang thao tác
                    </p>
                  </div>
                </div>

                {/* Tên tiêu chí */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tên tiêu chí / Nội dung chuẩn đầu ra <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows="3"
                    required
                    maxLength="200"
                    value={form.tenTieuChi}
                    onChange={(e) => setForm({ ...form, tenTieuChi: e.target.value })}
                    placeholder="Nhập nội dung mô tả chuẩn đầu ra sinh viên cần đạt được..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 shadow-2xs resize-none"
                  ></textarea>
                </div>

                {/* Modal Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {submitting ? 'progress_activity' : 'save'}
                    </span>
                    <span>{submitting ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm tiêu chí'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
