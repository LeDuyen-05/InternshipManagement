import { useEffect, useState } from 'react'
import { sinhVienService } from '../../services/sinhVienService'

// Trang mẫu — dùng làm khuôn mẫu cho các trang danh sách khác (CongTy, GiangVien...).
function SinhVienListPage() {
  const [sinhViens, setSinhViens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    sinhVienService
      .getAll()
      .then((res) => setSinhViens(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="p-4">Đang tải...</p>
  if (error) return <p className="p-4 text-red-600">Lỗi: {error}</p>

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Danh sách sinh viên</h1>
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Mã SV</th>
            <th className="border p-2 text-left">Họ tên</th>
            <th className="border p-2 text-left">Lớp</th>
            <th className="border p-2 text-left">GPA</th>
          </tr>
        </thead>
        <tbody>
          {sinhViens.map((sv) => (
            <tr key={sv.maSV}>
              <td className="border p-2">{sv.maSV}</td>
              <td className="border p-2">{sv.hoTen}</td>
              <td className="border p-2">{sv.lop}</td>
              <td className="border p-2">{sv.gpa}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default SinhVienListPage
