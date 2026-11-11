import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'

function routes(role = 'VT02') {
  const source = readFileSync(new URL('../src/routes/AppRoutes.jsx', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace('export default function', 'function')
  return new vm.Script(transformSync(source + '\n({ AppRoutes, Guard, LegacyFacultyGradingRoute })', { loader: 'jsx' }).code)
    .runInNewContext({
      React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
      lazy: () => 'Page', Routes: 'Routes', Route: 'Route', Navigate: 'Navigate', Suspense: 'Suspense',
      useAuth: () => ({ user: { maVaiTro: role } }),
      useLocation: () => ({ search: '?sv=SV009&gv=GV003' }),
    })
}

function find(node, path) {
  if (node?.props?.path === path) return node
  return node?.props?.children?.map(child => find(child, path)).find(Boolean)
}

test('old faculty grading URL is registered, guarded, and retains the selected student and lecturer', () => {
  const app = routes()
  const route = find(app.AppRoutes(), '/khoa/cham-diem')
  assert.ok(route)
  assert.deepEqual(Array.from(route.props.element.props.roles), ['VT02'])
  const redirect = app.LegacyFacultyGradingRoute()
  assert.equal(redirect.props.to, '/giang-vien/cham-diem?sv=SV009&gv=GV003')
  assert.equal(redirect.props.replace, true)
  const guarded = routes('VT04').Guard({ roles: ['VT02'], children: 'grading' })
  assert.equal(guarded.props.to, '/sinh-vien')
})
