import AppRoutes from './routes/AppRoutes.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
export default function App(){return <AuthProvider><AppRoutes/></AuthProvider>}
