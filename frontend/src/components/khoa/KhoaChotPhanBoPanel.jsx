import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import apiClient from '../../services/api'
import { usePagination } from '../../hooks/usePagination'
import Pagination from '../common/Pagination'
import { PHAN_BO } from '../../utils/trangThai'
import ConfirmationDeadlinePanel from './ConfirmationDeadlinePanel'

const phanBoStatusColors = {
  ChoKhoaDuyet: 'bg-amber-50 text-amber-800 border-amber-200',
  ChuaNhanViec: 'bg-blue-50 text-blue-800 border-blue-200',
  DangThucTap: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  HoanThanh: 'bg-slate-100 text-slate-800 border-slate-200',
  Huy: 'bg-rose-50 text-rose-800 border-rose-200',
}

export default function KhoaChotPhanBoPanel({ maDot, canEdit }) {
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('ChoKhoaDuyet')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showDeadlinePanel, setShowDeadlinePanel] = useState(false)

  const version = useRef(0)
  const currentRound = useRef(maDot)
  currentRound.current = maDot

  const load = useCallback(async () => {
    if (!maDot) return
    const request = ++version.current
    setLoading(true)
    setError('')
    try {
      const { data } = await apiClient.get('/khoa/phan-bo', { params: { maDot } })
      if (currentRound.current === maDot && request === version.current) setRows(data || [])
    } catch (e) {
      if (currentRound.current === maDot && request === version.current)
        setError(e.response?.data?.message || 'Không tải được danh sách tiếp nhận.')
    } finally {
      if (currentRound.current === maDot && request === version.current) setLoading(false)
    }
  }, [maDot])

  useEffect(() => {
    setRows([])
    setBusy('')
    setMessage('')
    setError('')
    setFilter('ChoKhoaDuyet')
    setSearchKeyword('')
    load()
    const requestVersion = version
    return () => {
      requestVersion.current++
    }
  }, [load])

  const visible = useMemo(() => {
    return rows.filter((row) => {
      if (filter && row.trangThai !== filter) return false
      if (!searchKeyword.trim()) return true
      const q = searchKeyword.toLowerCase().trim()
      return (
        (row.maSinhVien && row.maSinhVien.toLowerCase().includes(q)) ||
        (row.sinhVien && row.sinhVien.toLowerCase().includes(q)) ||
        (row.congTy && row.congTy.toLowerCase().includes(q)) ||
        (row.lop && row.lop.toLowerCase().includes(q))
      )
    })
  }, [rows, filter, searchKeyword])

  const pagination = usePagination(visible, JSON.stringify([maDot, filter, searchKeyword]))

  const countChuaNhanViec = useMemo(() => rows.filter((r) => r.trangThai === 'ChuaNhanViec').length, [rows])
  const countChoKhoaDuyet = useMemo(() => rows.filter((r) => r.trangThai === 'ChoKhoaDuyet').length, [rows])
  const countDangThucTap = useMemo(() => rows.filter((r) => r.trangThai === 'DangThucTap').length, [rows])

  const approve = async (row) => {
    if (
      !canEdit ||
      loading ||
      busy ||
      row.maDot !== maDot ||
      row.daDuocKhoaDuyet ||
      row.trangThai !== 'ChoKhoaDuyet'
    )
      return
    if (!window.confirm(`Chốt phân bổ ${row.sinhVien} (${row.maSinhVien}) vào ${row.congTy}?`))
      return
    const request = version.current
    setBusy(row.maPhanBo)
    setError('')
    setMessage('')
    try {
      const { data } = await apiClient.post(
        `/khoa/phan-bo/${encodeURIComponent(row.maPhanBo)}/chot`,
        { maDot }
      )
      if (currentRound.current !== maDot || request !== version.current) return
      setMessage(data.message || 'Đã chốt phân bổ chính thức thành công!')
      await load()
    } catch (e) {
      if (currentRound.current === maDot && request === version.current)
        setError(e.response?.data?.message || 'Không chốt được phân bổ. Hãy tải lại hồ sơ.')
    } finally {
      if (currentRound.current === maDot) setBusy('')
    }
  }

  return (
    <div className="space-y-5">
      {/* 1. Thẻ Bento KPI Thống kê Tiếp nhận & Chốt phân bổ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => setFilter('ChoKhoaDuyet')}
          className={`bg-white p-4 rounded-xl border transition shadow-xs cursor-pointer flex items-center gap-3.5 ${
            filter === 'ChoKhoaDuyet' ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">pending_actions</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider truncate">Chờ Khoa chốt</p>
            <p className="text-xl font-black text-amber-700">{countChoKhoaDuyet}</p>
          </div>
        </div>

        <div
          onClick={() => setFilter('ChuaNhanViec')}
          className={`bg-white p-4 rounded-xl border transition shadow-xs cursor-pointer flex items-center gap-3.5 ${
            filter === 'ChuaNhanViec' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">schedule</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider truncate">Chờ SV xác nhận</p>
            <p className="text-xl font-black text-blue-700">{countChuaNhanViec}</p>
          </div>
        </div>

        <div
          onClick={() => setFilter('DangThucTap')}
          className={`bg-white p-4 rounded-xl border transition shadow-xs cursor-pointer flex items-center gap-3.5 ${
            filter === 'DangThucTap' ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">verified</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider truncate">Đã phân bổ chính thức</p>
            <p className="text-xl font-black text-emerald-700">{countDangThucTap}</p>
          </div>
        </div>

        <div
          onClick={() => setFilter('')}
          className={`bg-white p-4 rounded-xl border transition shadow-xs cursor-pointer flex items-center gap-3.5 ${
            filter === '' ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">assignment</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Tổng hồ sơ đợt</p>
            <p className="text-xl font-black text-slate-900">{rows.length}</p>
          </div>
        </div>
      </div>

      {/* 2. Thanh Quản lý Thời hạn xác nhận nhận việc (Collapsible accordion) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDeadlinePanel(!showDeadlinePanel)}
          className="w-full p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition cursor-pointer text-left bg-gradient-to-r from-blue-50/40 via-indigo-50/20 to-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">schedule</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  Quy chế Thời hạn sinh viên xác nhận nhận việc & Rà soát quá hạn
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Khung giờ UTC+7
                </span>
              </div>
              <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                Quy định hạn hoàn tất nhận việc sau phỏng vấn. Quá hạn hệ thống không tự hủy đơn nhằm bảo đảm quyền lợi SV.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-blue-700 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">tune</span>
              <span>{showDeadlinePanel ? 'Đóng cấu hình hạn' : 'Thiết lập thời hạn & Rà soát quá hạn'}</span>
            </span>
            <span className="material-symbols-outlined text-slate-400 text-base">
              {showDeadlinePanel ? 'expand_less' : 'expand_more'}
            </span>
          </div>
        </button>

        {/* Nội dung khi mở rộng */}
        {showDeadlinePanel && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60">
            <ConfirmationDeadlinePanel maDot={maDot} canEdit={canEdit} />
          </div>
        )}
      </div>

      {/* 3. Danh sách Chốt phân bổ chính thức (Bảng trọng tâm) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header & Bộ lọc */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 m-0">
                Phê duyệt & Chốt phân bổ thực tập chính thức
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Chờ Khoa chốt: {countChoKhoaDuyet}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                Chờ SV xác nhận: {countChuaNhanViec}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Đang thực tập: {countDangThucTap}
              </span>
            </div>
            <p className="text-xs text-slate-500 m-0">
              Sinh viên trúng tuyển phỏng vấn và đã bấm nhận việc sẽ chuyển về trạng thái <strong>Chờ Khoa chốt</strong> để Văn phòng Khoa ra quyết định phân bổ chính thức.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-base">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm MSSV, họ tên, DN..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none font-medium"
              />
            </div>

            <select
              value={filter}
              disabled={!!busy}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 outline-none cursor-pointer"
            >
              <option value="ChoKhoaDuyet">Chờ Khoa chốt ({countChoKhoaDuyet})</option>
              <option value="ChuaNhanViec">Chờ SV xác nhận ({countChuaNhanViec})</option>
              <option value="DangThucTap">Đang thực tập ({countDangThucTap})</option>
              <option value="HoanThanh">Hoàn thành</option>
              <option value="">Tất cả trạng thái ({rows.length})</option>
            </select>

            <button
              type="button"
              disabled={!maDot || loading || !!busy}
              onClick={load}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-base text-slate-500 ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Thông báo phản hồi */}
        {error && (
          <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600 text-base">error</span>
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="m-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
            <span>{message}</span>
          </div>
        )}

        {/* Bảng danh sách phân bổ */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Mã SV</th>
                <th className="py-3 px-4">Sinh viên / Lớp</th>
                <th className="py-3 px-4">Doanh nghiệp tiếp nhận</th>
                <th className="py-3 px-4">Sinh viên xác nhận</th>
                <th className="py-3 px-4">Trạng thái hồ sơ</th>
                <th className="py-3 px-4">Khoa chốt</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagination.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    {loading ? 'Đang tải danh sách...' : 'Không có hồ sơ nào phù hợp với bộ lọc hiện tại.'}
                  </td>
                </tr>
              ) : (
                pagination.items.map((row) => (
                  <tr key={row.maPhanBo} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{row.maSinhVien}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{row.sinhVien}</div>
                      {row.lop && <span className="text-[11px] text-slate-400 font-normal">{row.lop}</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{row.congTy}</div>
                      {row.viTri && <span className="text-[11px] text-slate-500 font-normal">{row.viTri}</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {row.ngaySVXacNhan ? (
                        new Date(row.ngaySVXacNhan).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      ) : (
                        <span className="text-slate-400 italic">Chưa xác nhận</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          phanBoStatusColors[row.trangThai] || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {PHAN_BO[row.trangThai] || row.trangThai}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {row.ngayKhoaDuyet ? (
                        <div>
                          <div>
                            {new Date(row.ngayKhoaDuyet).toLocaleString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {row.nguoiKhoaDuyet && (
                            <span className="text-[11px] text-slate-400 font-normal">{row.nguoiKhoaDuyet}</span>
                          )}
                        </div>
                      ) : row.daDuocKhoaDuyet ? (
                        <span className="text-emerald-700 font-semibold">Đã có quyết định</span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa chốt</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {!row.daDuocKhoaDuyet && row.trangThai === 'ChoKhoaDuyet' && (
                        <button
                          type="button"
                          disabled={!canEdit || loading || !!busy}
                          onClick={() => approve(row)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          <span>{busy === row.maPhanBo ? 'Đang chốt...' : 'Chốt phân bổ'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagination={pagination} label="hồ sơ tiếp nhận" />
      </div>
    </div>
  )
}
