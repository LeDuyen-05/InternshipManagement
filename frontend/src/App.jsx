import AppRoutes from './routes/AppRoutes.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { DotThucTapProvider } from './contexts/DotThucTapContext.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DotThucTapProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </DotThucTapProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
