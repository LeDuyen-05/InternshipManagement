import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PASSWORD_CHANGED_MESSAGE, signInAgainAfterPasswordChange } from '../src/utils/passwordChanged.js'

test('changing the password signs out locally and returns to the login page with a message', () => {
  const calls = []
  signInAgainAfterPasswordChange((options) => calls.push(['logout', options]), (to, options) => calls.push(['navigate', to, options]))
  assert.deepEqual(calls, [
    ['logout', { revoke: false }],
    ['navigate', '/auth', { replace: true, state: { message: PASSWORD_CHANGED_MESSAGE } }],
  ])
})

test('every password change form uses the same sign-in-again flow', () => {
  for (const file of ['components/layout/Header.jsx', 'components/layout/EnterpriseHeader.jsx', 'pages/Account/ChangePasswordPage.jsx']) {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')
    assert.match(source, /signInAgainAfterPasswordChange\(logout, navigate\)/, file)
    assert.doesNotMatch(source, /setPasswordStatus\('success'\)/, file)
  }
  const login = readFileSync(new URL('../src/pages/Auth/AuthPage.jsx', import.meta.url), 'utf8')
  assert.match(login, /useLocation\(\)\.state\?\.message/)
})
