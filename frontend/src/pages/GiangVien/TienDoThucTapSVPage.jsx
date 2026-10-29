import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import tienDoThucTapService from '../../services/tienDoThucTapService'
import { gvHuongDanService } from '../../services/gvHuongDanService'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'
import { useIdentity } from '../../hooks/useIdentity'

export default function TienDoThucTapSVPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { selectedDot } = useDotThucTap()
  const { maGV: identityMaGV, role } = useIdentity() || {}
  const isStaff = role === 'VT01' || role === 'VT02'
  const currentMaGV = isStaff && searchParams.get('gv') ? searchParams.get('gv') : (identityMaGV || 'GV001')
  const [lecturerInfo, setLecturerInfo] = useState(null)

  const [studentList, setStudentList] = useState([])
  const urlMaSV = searchParams.get('sv')
  const [selectedMaSV, setSelectedMaSV] = useState(urlMaSV || '')

  const [listTienDo, setListTienDo] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [error, setError] = useState(null)

  // Modal duyệt báo cáo tuần
  const [selectedTienDo, setSelectedTienDo] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [duyetStatus, setDuyetStatus] = useState('DaDuyet')
  const [nhanXetGV, setNhanXetGV] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // 1. Tải danh sách sinh viên do GV hướng dẫn từ cơ sở dữ liệu thật theo currentMaGV
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoadingStudents(true)
        const [res, resTai] = await Promise.all([
          gvHuongDanService.getSVTheoGiangVien(currentMaGV),
          gvHuongDanService.getGiangVienTai().catch(() => ({ data: { data: [] } })),
        ])
        const data = res.data?.data || res.data || []
        const taiList = resTai.data?.data || []
        const foundGv = taiList.find((g) => g.maGV === currentMaGV)
        if (foundGv) setLecturerInfo(foundGv)

        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item) => ({
            maSV: item.sinhVien?.maSV || item.maSV,
            hoTen: item.sinhVien?.hoTen || item.hoTen,
            lop: item.sinhVien?.lop || item.lop || '—',
            tenCongTy: item.congTy?.tenCongTy || item.tenCongTy || 'Chưa phân bổ công ty',
          }))
          setStudentList(mapped)
          if (!urlMaSV) {
            setSelectedMaSV(mapped[0].maSV)
          } else {
            setSelectedMaSV(urlMaSV)
          }
        } else {
          setStudentList([])
          setSelectedMaSV('')
        }
      } catch (err) {
        console.error('Lỗi tải danh sách sinh viên:', err)
        setError('Không thể tải danh sách sinh viên hướng dẫn từ cơ sở dữ liệu: ' + (err.response?.data?.message || err.message))
      } finally {
        setLoadingStudents(false)
      }
    }
    fetchStudents()
  }, [currentMaGV, urlMaSV])

  // Đồng bộ selectedMaSV khi URL param thay đổi
  useEffect(() => {
    if (urlMaSV) {
      setSelectedMaSV(urlMaSV)
    }
  }, [urlMaSV])

  // 2. Tải tiến độ thực tập của sinh viên đang chọn từ SQL Server
  const loadData = async (svId) => {
    if (!svId) {
      setListTienDo([])
      return
    }
    try {
      setLoading(true)
      setError(null)
      const res = await tienDoThucTapService.getTienDoBySinhVien(svId, selectedDot?.maDot)
      const data = res.data?.data || res.data || []
      setListTienDo(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Lỗi tải tiến độ thực tập:', err)
      setError('Lỗi khi tải tiến độ thực tập từ server: ' + (err.response?.data?.message || err.message))
      setListTienDo([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedMaSV) {
      loadData(selectedMaSV)
    } else {
      setListTienDo([])
    }
  }, [selectedMaSV, selectedDot?.maDot])

  // Sinh viên hiện tại
  const currentStudent = studentList.find((s) => s.maSV === selectedMaSV)

  // Xử lý khi đổi sinh viên trong dropdown
  const handleSelectStudent = (newMaSV) => {
    setSelectedMaSV(newMaSV)
    setSearchParams({ sv: newMaSV })
  }

  const handleOpenDuyet = (item) => {
    setSelectedTienDo(item)
    setDuyetStatus(item.trangThaiDuyet === 'ChuaNop' ? 'DaDuyet' : item.trangThaiDuyet)
    setNhanXetGV(item.nhanXetGV || '')
    setShowModal(true)
  }

  // 3. Phê duyệt tiến độ — CHỈ cập nhật UI khi database cập nhật thành công!
  const handleSaveDuyet = async () => {
    if (!selectedTienDo) return
    try {
      setSubmitting(true)
      await tienDoThucTapService.duyetTienDo(selectedTienDo.maTienDo, duyetStatus, nhanXetGV)

      // Cập nhật lại danh sách trực tiếp từ DB
      await loadData(selectedMaSV)

      setShowModal(false)
      setToastMessage(`Đã cập nhật trạng thái duyệt cho báo cáo ${selectedTienDo.maTienDo} thành công!`)
      setTimeout(() => setToastMessage(''), 4000)
    } catch (err) {
      alert('Không thể lưu trạng thái duyệt vào cơ sở dữ liệu: ' + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DaNop':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ GV duyệt
          </span>
        )
      case 'DaDuyet':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="material-symbols-outlined text-xs">check</span>
            Đã duyệt đạt
          </span>
        )
      case 'YeuCauSua':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="material-symbols-outlined text-xs">edit</span>
            Yêu cầu sửa
          </span>
        )
      case 'ChuaNop':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            Chưa nộp
          </span>
        )
    }
  }

  // Thống kê tiến độ trực tiếp từ danh sách DB
  const totalWeeks = listTienDo.length
  const daDuyetCount = listTienDo.filter((t) => t.trangThaiDuyet === 'DaDuyet').length
  const choDuyetCount = listTienDo.filter((t) => t.trangThaiDuyet === 'DaNop').length
  const chuaNopCount = listTienDo.filter((t) => t.trangThaiDuyet === 'ChuaNop' || !t.trangThaiDuyet).length

  return (
    <div className="space-y-6">
      {/* 1. Header Trang & Thông tin Đợt */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/giang-vien/sinh-vien')}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer border border-slate-200"
              title="Quay lại danh sách sinh viên"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                <span>{selectedDot?.tenDot || 'Đợt thực tập hiện hành'}</span>
                <span>•</span>
                <span className="text-blue-600 font-bold">Theo Dõi Tiến Độ Báo Cáo Tuần</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Chi Tiết Tiến Độ Thực Tập
              </h1>
            </div>
          </div>

          {/* Phím tắt sang Chấm điểm CLO */}
          {selectedMaSV && (
            <div className="flex items-center gap-2">
              <Link
                to={`/giang-vien/cham-diem?sv=${selectedMaSV}`}
                className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-base">fact_check</span>
                Chấm điểm CLO sinh viên này
              </Link>
            </div>
          )}
        </div>

        {/* Bộ chọn sinh viên và thông tin tóm tắt */}
        {loadingStudents ? (
          <div className="py-6 text-center text-slate-400 text-xs">Đang tải danh sách sinh viên từ cơ sở dữ liệu...</div>
        ) : studentList.length === 0 ? (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600">info</span>
            <span>Chưa có sinh viên nào được phân công cho Giảng viên GV001 trong cơ sở dữ liệu. Vui lòng vào phân công sinh viên tại cổng Cán bộ Khoa trước.</span>
          </div>
        ) : (
          <>
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Chọn sinh viên hướng dẫn ({studentList.length} SV trong DB):
                </label>
                <div className="relative">
                  <select
                    value={selectedMaSV}
                    onChange={(e) => handleSelectStudent(e.target.value)}
                    className="w-full h-11 pl-3 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {studentList.map((s) => (
                      <option key={s.maSV} value={s.maSV}>
                        {s.hoTen} ({s.maSV}) - Lớp {s.lop}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-center">
                  <span className="text-slate-500 block">Tổng báo cáo</span>
                  <span className="text-lg font-black text-blue-700 font-mono">{totalWeeks}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
                  <span className="text-slate-500 block">Đã duyệt</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">{daDuyetCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 text-center">
                  <span className="text-slate-500 block">Chờ duyệt</span>
                  <span className="text-lg font-black text-amber-700 font-mono">{choDuyetCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-slate-500 block">Chưa nộp</span>
                  <span className="text-lg font-black text-slate-700 font-mono">{chuaNopCount}</span>
                </div>
              </div>
            </div>

            {/* Thông tin đơn vị thực tập của sinh viên */}
            {currentStudent && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-base">domain</span>
                  <span className="text-slate-500">Đơn vị thực tập tiếp nhận:</span>
                  <strong className="text-slate-800">{currentStudent.tenCongTy}</strong>
                </div>
                <span className="text-slate-400">GVHD: {lecturerInfo?.hoTen ? `ThS. ${lecturerInfo.hoTen}` : currentMaGV} ({currentMaGV})</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Thông báo cập nhật thành công nếu có */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* 2. Bảng Danh sách Tiến độ từ DB */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Nhật Ký Báo Cáo Thực Tập Định Kỳ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sinh viên nộp báo cáo định kỳ theo từng tuần. Giảng viên nhận xét và phê duyệt kết quả thực tập.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Đang tải dữ liệu tiến độ từ hệ thống...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-sm">{error}</div>
        ) : listTienDo.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-2">
            <span className="material-symbols-outlined text-4xl text-slate-300">history_edu</span>
            <p>Sinh viên này chưa nộp báo cáo tiến độ nào trong đợt thực tập này.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-28">Mã tiến độ</th>
                  <th className="py-3 px-4 w-32">Mốc thời gian</th>
                  <th className="py-3 px-4 w-32">Ngày nộp</th>
                  <th className="py-3 px-4 min-w-[240px]">Nội dung công việc & Kết quả</th>
                  <th className="py-3 px-4 min-w-[200px]">Nhận xét của GV</th>
                  <th className="py-3 px-4 w-36 text-center">Trạng thái</th>
                  <th className="py-3 px-4 w-28 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listTienDo.map((item, idx) => (
                  <tr key={item.maTienDo || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 align-top">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 font-mono">
                        {item.maTienDo}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 align-top font-medium">
                      {item.mocThoiGian
                        ? new Date(item.mocThoiGian).toLocaleDateString('vi-VN')
                        : `Tuần ${idx + 1}`}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 align-top">
                      {item.ngayNop
                        ? new Date(item.ngayNop).toLocaleDateString('vi-VN')
                        : <span className="italic text-slate-400">Chưa nộp</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 align-top leading-relaxed">
                      {item.noiDungBaoCao ? (
                        item.noiDungBaoCao
                      ) : (
                        <span className="italic text-slate-400">Sinh viên chưa cập nhật nội dung</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 align-top leading-relaxed">
                      {item.nhanXetGV ? (
                        <span className="text-blue-900 bg-blue-50/80 px-2 py-1 rounded-md inline-block border border-blue-100">
                          {item.nhanXetGV}
                        </span>
                      ) : (
                        <span className="italic text-slate-400">Chưa có nhận xét</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center align-top">
                      {getStatusBadge(item.trangThaiDuyet)}
                    </td>
                    <td className="py-3.5 px-4 text-center align-top">
                      <button
                        onClick={() => handleOpenDuyet(item)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition cursor-pointer"
                      >
                        Duyệt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Duyệt Tiến Độ */}
      {showModal && selectedTienDo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Phê Duyệt Tiến Độ — {selectedTienDo.maTienDo}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Trạng thái duyệt:</label>
                <select
                  value={duyetStatus}
                  onChange={(e) => setDuyetStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="DaDuyet">Đã duyệt đạt (DaDuyet)</option>
                  <option value="YeuCauSua">Yêu cầu sửa / bổ sung (YeuCauSua)</option>
                  <option value="DaNop">Đã nộp chờ xem (DaNop)</option>
                  <option value="ChuaNop">Chưa nộp (ChuaNop)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Nội dung báo cáo của SV:</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 max-h-36 overflow-y-auto text-slate-700 leading-relaxed">
                  {selectedTienDo.noiDungBaoCao || 'Sinh viên chưa nhập nội dung'}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Nhận xét & Góp ý của GV:</label>
                <textarea
                  rows={3}
                  value={nhanXetGV}
                  onChange={(e) => setNhanXetGV(e.target.value)}
                  placeholder="Nhập nhận xét, đánh giá kết quả công việc hoặc yêu cầu chỉnh sửa..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveDuyet}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                <span>Cập nhật vào Database</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
