// Đổi mật khẩu làm mọi phiên cũ hết hiệu lực, kể cả phiên đang dùng (máy chủ đổi security stamp):
// đăng xuất ngay và mời đăng nhập lại thay vì để lần bấm kế tiếp bị đẩy về trang đăng nhập không lời giải thích.
export const PASSWORD_CHANGED_MESSAGE = 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.'

export function signInAgainAfterPasswordChange(logout, navigate) {
  logout({ revoke: false })
  navigate('/auth', { replace: true, state: { message: PASSWORD_CHANGED_MESSAGE } })
}
