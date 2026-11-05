import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { transformSync } from 'esbuild'
import { roleLabel } from '../src/utils/roleLabels.js'

test('AdminPage mounts and renders successfully without ReferenceError', async () => {
  const source = readFileSync(new URL('../src/pages/Admin/AdminPage.jsx', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '')
    .replace('export default function AdminPage', 'function AdminPage')

  const slots = []
  let position = 0
  let effects = []

  const mockAccounts = [
    { maTaiKhoan: 'TK001', tenDangNhap: 'admin', maVaiTro: 'VT01', trangThai: 'HoatDong' },
    { maTaiKhoan: 'TK_DD001', tenDangNhap: 'dd001', maVaiTro: 'VT05', maDaiDien: 'DD001', trangThai: 'HoatDong', tenChuSoHuu: 'Đỗ Thị Thu Thảo', tenDonVi: 'Sao Việt' },
  ]
  const mockRoles = [
    { maVaiTro: 'VT01', tenVaiTro: 'Quản trị viên' },
    { maVaiTro: 'VT05', tenVaiTro: 'Đại diện Doanh nghiệp' },
  ]
  const mockOnboarding = [
    { maCongTy: 'CT004', tenCongTy: 'Sao Việt', daiDiens: [{ maDaiDien: 'DD001', hoTen: 'Đỗ Thị Thu Thảo', soTaiKhoan: 1, taiKhoanHoatDong: 1 }] }
  ]

  const context = {
    roleLabel,
    React: {
      createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    },
    useState(initial) {
      const i = position++
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next }]
    },
    useMemo(fn) { return fn() },
    useCallback(fn) { return fn },
    useRef(initial) { return { current: initial } },
    useEffect(fn) { effects.push(fn) },
    setTimeout(fn) { fn(); return 1 },
    clearTimeout() {},
    apiClient: {
      get: async (url) => {
        if (url === '/admin/accounts/paged') return { data: { items: mockAccounts, totalCount: mockAccounts.length, page: 1, pageSize: 20, summary: { total: mockAccounts.length } } }
        if (url === '/admin/roles') return { data: mockRoles }
        if (url === '/admin/enterprise-onboarding') return { data: mockOnboarding }
        return { data: [] }
      },
      post: async () => ({ data: {} }),
      put: async () => ({ data: {} }),
    },
    Layout: ({ children }) => children,
    EnterpriseOnboardingPanel: () => null,
    DatabaseBackupPanel: () => null,
    DocumentStorageAdmin: () => null,
    Pagination: () => null,
  }

  const code = transformSync(source + '\nAdminPage', { loader: 'jsx' }).code
  const script = new vm.Script(code)
  const Component = script.runInNewContext(context)

  // Verify component executes without ReferenceError
  position = 0
  effects = []
  const tree = Component()
  assert.ok(tree, 'AdminPage should render a valid tree')

  // Run initial useEffects
  for (const fn of effects) {
    await fn()
  }

  // Rerender after data loaded
  position = 0
  effects = []
  const renderedTree = Component()
  assert.ok(renderedTree, 'AdminPage should rerender after loading state')
})
