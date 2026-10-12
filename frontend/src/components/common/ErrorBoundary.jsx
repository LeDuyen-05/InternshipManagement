import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full border border-slate-200 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-3xl font-bold">
              <span className="material-symbols-outlined text-4xl">error</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Đã xảy ra sự cố hiển thị</h2>
              <p className="text-xs text-slate-500 mt-1">
                Giao diện gặp lỗi trong quá trình xử lý dữ liệu. Vui lòng bấm thử lại hoặc quay lại trang chủ.
              </p>
            </div>
            {this.state.error && (
              <div className="text-left bg-slate-100 p-3 rounded-xl text-xs font-mono text-rose-700 overflow-x-auto max-h-36">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer"
              >
                Tải lại trang
              </button>
              <button
                onClick={() => {
                  window.location.href = '/'
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
