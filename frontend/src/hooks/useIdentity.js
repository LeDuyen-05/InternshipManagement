import { useAuth } from '../contexts/AuthContext'

export function useIdentity() {
  const { user } = useAuth()
  return {
    user,
    role: user?.maVaiTro ?? null,
    maSV: user?.maSV || null,
    maGV: user?.maGV || null,
    maDaiDien: user?.maDaiDien || null
  }
}

export default useIdentity
