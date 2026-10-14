import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import apiClient from '../../services/api'

export default function KhoaDeadlinesPage() {
  const [rounds, setRounds] = useState([])
  const [round, setRound] = useState('')
  const [deadlines, setDeadlines] = useState([])
  const [dates, setDates] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState('')

  // Form tạo mốc báo cáo
  const [createRound, setCreateRound] = useState('')
  const [soTuan, setSoTuan] = useState(10)
  const [ngayBatDau, setNgayBatDau] = useState(() => new Date().toISOString().slice(0, 10))
  const [generating, setGenerating] = useState(false)

  const load = async () => {
    try {
      const result = await apiClient.get('/khoa/han-bao-cao', {
        params: round ? { maDot: round } : {},
      })
      setDeadlines(result.data)
      setError('')
    } catch (e) {
      setError(e.response?.data?.message || 'Không tải được lịch hạn báo cáo.')
    }
  }

  useEffect(() => {
    load()
  }, [round])

  useEffect(() => {
    apiClient
      .get('/khoa/dot-thuc-tap')
      .then((r) => {
        const list = r.data || []
        setRounds(list)
        if (list.length > 0 && !createRound) {
          const active = list.find((x) => x.trangThai === 'DangDienRa') || list[0]
          setCreateRound(active.maSo)
        }
      })
      .catch(() => {})
  }, [])

  const save = async (item) => {
    const next = dates[item.mocThoiGian] || item.mocThoiGian.slice(0, 10)
    if (next === item.mocThoiGian.slice(0, 10)) return
    setSaving(item.mocThoiGian)
    try {
      await apiClient.put(`/khoa/han-bao-cao/${encodeURIComponent(item.maDot)}`, {
        hanCu: item.mocThoiGian,
        hanMoi: next,
      })
      setSuccess('Đã cập nhật hạn báo cáo thành công.')
      setTimeout(() => setSuccess(''), 4000)
      await load()
    } catch (e) {
      setError(e.response?.data?.message || 'Không cập nhật được hạn báo cáo.')
    } finally {
      setSaving('')
    }
  }

  const handleGenerateSlots = async (e) => {
    e.preventDefault()
    if (!createRound) {
      setError('Vui lòng chọn đợt thực tập.')
      return
    }
    setGenerating(true)
    setError('')
    setSuccess('')
    try {
      const res = await apiClient.post('/khoa/bao-cao/tao-moc', {
        maDot: createRound,
        soTuan: Number(soTuan) || 10,
        ngayBatDau: ngayBatDau ? new Date(ngayBatDau).toISOString() : null,
      })
      setSuccess(res.data?.message || `Đã tạo ${res.data?.createdCount ?? 0} mốc báo cáo tiến độ.`)
      setTimeout(() => setSuccess(''), 5000)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể tạo mốc báo cáo.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Layout>
      <div className="page-head">
        <div>
          <span className="eyebrow">GIÁO VỤ KHOA</span>
          <h2>Lịch trình & quản lý deadline</h2>
          <p>
            Chỉnh hạn báo cáo theo mốc cho cả đợt; việc thay đổi cập nhật đồng loạt sinh viên ở mốc đó.
          </p>
        </div>
        <button className="small" onClick={load}>
          Làm mới
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {/* Form tạo mốc báo cáo tự động */}
      <div className="info-card" style={{ marginBottom: 20 }}>
        <h3>Tạo mốc báo cáo định kỳ cho đợt</h3>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 12 }}>
          Khởi tạo hàng loạt các mốc báo cáo tuần cho toàn bộ sinh viên có phân bổ hoặc đăng ký đã duyệt trong đợt.
        </p>
        <form onSubmit={handleGenerateSlots} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, fontWeight: 600 }}>
            Đợt thực tập
            <select
              value={createRound}
              onChange={(e) => setCreateRound(e.target.value)}
              style={{ marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              required
            >
              {rounds.map((r) => (
                <option key={r.maSo} value={r.maSo}>
                  {r.tenDot} ({r.namHoc})
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, fontWeight: 600 }}>
            Số tuần báo cáo
            <input
              type="number"
              min="1"
              max="20"
              value={soTuan}
              onChange={(e) => setSoTuan(e.target.value)}
              style={{ marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', width: 90 }}
              required
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, fontWeight: 600 }}>
            Ngày bắt đầu tính tuần
            <input
              type="date"
              value={ngayBatDau}
              onChange={(e) => setNgayBatDau(e.target.value)}
              style={{ marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              required
            />
          </label>

          <button type="submit" className="primary small" disabled={generating} style={{ height: 34 }}>
            {generating ? 'Đang tạo…' : 'Tạo mốc báo cáo'}
          </button>
        </form>
      </div>

      <div className="tabbar">
        <label>
          Lọc theo đợt{' '}
          <select value={round} onChange={(e) => setRound(e.target.value)}>
            <option value="">Tất cả đợt</option>
            {rounds.map((r) => (
              <option key={r.maSo} value={r.maSo}>
                {r.tenDot} · {r.namHoc}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="info-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Đợt</th>
                <th>Hạn hiện tại</th>
                <th>Số báo cáo</th>
                <th>Đã nộp</th>
                <th>Đã duyệt</th>
                <th>Chưa nộp quá hạn</th>
                <th>Đổi hạn</th>
              </tr>
            </thead>
            <tbody>
              {deadlines.map((x) => (
                <tr key={`${x.maDot}-${x.mocThoiGian}`}>
                  <td>{rounds.find((r) => r.maSo === x.maDot)?.tenDot || x.maDot}</td>
                  <td>{String(x.mocThoiGian).slice(0, 10)}</td>
                  <td>{x.reportCount}</td>
                  <td>{x.submitted}</td>
                  <td>{x.approved}</td>
                  <td>{x.overdue}</td>
                  <td>
                    <input
                      type="date"
                      value={dates[x.mocThoiGian] ?? String(x.mocThoiGian).slice(0, 10)}
                      onChange={(e) => setDates({ ...dates, [x.mocThoiGian]: e.target.value })}
                    />{' '}
                    <button
                      className="small primary"
                      disabled={saving === x.mocThoiGian}
                      onClick={() => save(x)}
                    >
                      {saving === x.mocThoiGian ? 'Đang lưu…' : 'Cập nhật'}
                    </button>
                  </td>
                </tr>
              ))}
              {!deadlines.length && (
                <tr>
                  <td colSpan="7">Chưa có mốc báo cáo để quản lý.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
