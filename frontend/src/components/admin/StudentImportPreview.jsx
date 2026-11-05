import { useMemo, useState } from 'react'
import { usePagination } from '../../hooks/usePagination'
import Pagination from '../common/Pagination'

const labels = { TaoMoi: 'Sinh viên mới', CapTaiKhoan: 'Cần cấp tài khoản', DaCoTaiKhoan: 'Đã có tài khoản', TrungTrongFile: 'Trùng trong file', KhongHopLe: 'Không hợp lệ' }

export default function StudentImportPreview({ report }) {
  const [search, setSearch] = useState(''), [status, setStatus] = useState('')
  const filtered = useMemo(() => (report.items || []).filter(row => (!status || row.trangThai === status)
    && `${row.maSV} ${row.hoTen}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))), [report, status, search])
  const pagination = usePagination(filtered, `${search}|${status}`)
  return <section className="space-y-3">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
      {[['Tổng số dòng', report.totalRows], ['Cần cấp tài khoản', report.accountsToCreate], ['Đã có tài khoản', report.alreadyRegistered], ['Trùng / không hợp lệ', report.duplicateRows + report.invalidRows]].map(([label, count]) =>
        <div key={label} className="border border-slate-200 rounded-lg p-3 bg-slate-50"><div>{label}</div><strong className="text-lg">{count}</strong></div>)}
    </div>
    <div className="flex flex-wrap gap-2">
      <input aria-label="Tìm sinh viên trong file nhập" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm MSSV, họ tên…" className="border rounded-lg p-2 text-xs flex-1" />
      <select aria-label="Lọc kết quả kiểm tra import" value={status} onChange={e => setStatus(e.target.value)} className="border rounded-lg p-2 text-xs">
        <option value="">Tất cả kết quả</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </div>
    <div className="overflow-auto max-h-72 border border-slate-200 rounded-xl">
      <table className="w-full text-xs text-left"><thead className="sticky top-0 bg-slate-100"><tr>{['Dòng Excel', 'MSSV', 'Họ và tên', 'Kết quả', 'Nội dung kiểm tra'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead>
        <tbody>{pagination.items.map((row, index) => <tr key={`${row.dong}-${index}`} className={`border-t ${['KhongHopLe', 'TrungTrongFile'].includes(row.trangThai) ? 'bg-red-50' : ''}`}>
          <td className="p-2">{row.dong}</td><td className="p-2 font-mono">{row.maSV}</td><td className="p-2">{row.hoTen}</td><td className="p-2">{labels[row.trangThai]}</td><td className="p-2">{row.ghiChu}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <Pagination pagination={pagination} label="kiểm tra sinh viên nhập" />
    {(report.invalidRows > 0 || report.duplicateRows > 0) && <p role="alert" className="text-red-700 text-xs">Chưa thể nhập. Sửa các dòng trùng hoặc không hợp lệ rồi chọn lại file.</p>}
  </section>
}
