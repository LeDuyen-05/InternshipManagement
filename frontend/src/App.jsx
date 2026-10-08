import AppRoutes from './routes/AppRoutes.jsx'
import { DotThucTapProvider } from './contexts/DotThucTapContext.jsx'

function App() {
  return (
    <DotThucTapProvider>
      <AppRoutes />
    </DotThucTapProvider>
  )
}

export default App
