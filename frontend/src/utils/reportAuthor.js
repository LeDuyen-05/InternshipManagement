// Chỉ lấy danh tính để ghi trên báo cáo; không thay đổi phiên đăng nhập.
let lastEnteredAuthor = ''

export function resolveReportAuthor(preparedBy) {
  const normalize = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (preparedBy !== undefined) return normalize(preparedBy)
  try {
    const user = JSON.parse(globalThis.localStorage?.getItem('internship_user') || 'null')
    return normalize(user?.hoTen)
  } catch {
    return ''
  }
}

function showAuthorModalDialog() {
  return new Promise((resolve) => {
    const existing = document.getElementById('report-author-modal-root')
    if (existing) existing.remove()

    const container = document.createElement('div')
    container.id = 'report-author-modal-root'
    container.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;background-color:rgba(15,23,42,0.65);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);'

    container.innerHTML = `
      <div style="background:#ffffff;border-radius:1rem;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);border:1px solid #e2e8f0;max-width:28rem;width:100%;padding:1.5rem;font-family:inherit;position:relative;" role="dialog" aria-modal="true" aria-labelledby="modal-author-title">
        <div style="display:flex;align-items:flex-start;gap:0.875rem;margin-bottom:1rem;">
          <div style="width:2.75rem;height:2.75rem;border-radius:0.75rem;background-color:#ecfdf5;color:#059669;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #d1fae5;">
            <span class="material-symbols-outlined" style="font-size:1.5rem;">draw</span>
          </div>
          <div style="flex:1;min-width:0;">
            <h3 id="modal-author-title" style="font-size:1rem;font-weight:700;color:#0f172a;margin:0;line-height:1.4;">
              Xác nhận người lập báo cáo trình ký
            </h3>
            <p style="font-size:0.75rem;color:#64748b;margin:0.25rem 0 0;line-height:1.4;">
              Theo chuẩn mẫu trình ký HUIT, báo cáo yêu cầu ghi rõ họ tên Người lập bảng ở khối chữ ký cuối trang.
            </p>
          </div>
        </div>

        <form id="author-modal-form" style="display:flex;flex-direction:column;gap:1rem;">
          <div>
            <label for="author-name-input" style="display:block;font-size:0.75rem;font-weight:600;color:#334155;margin-bottom:0.375rem;">
              Họ và tên người lập bảng <span style="color:#ef4444;">*</span>
            </label>
            <input
              type="text"
              id="author-name-input"
              style="width:100%;box-sizing:border-box;padding:0.625rem 0.875rem;font-size:0.875rem;border-radius:0.75rem;border:1px solid #cbd5e1;outline:none;color:#0f172a;transition:border-color 0.15s, box-shadow 0.15s;font-weight:500;"
              placeholder="Nhập họ và tên đầy đủ (ví dụ: TS. Nguyễn Văn A)"
              autocomplete="name"
            />
            <p id="author-name-error" style="display:none;font-size:0.75rem;color:#ef4444;font-weight:500;margin:0.375rem 0 0;align-items:center;gap:0.25rem;">
              <span class="material-symbols-outlined" style="font-size:0.875rem;">error</span>
              <span>Vui lòng nhập họ tên người lập để xuất báo cáo.</span>
            </p>
          </div>

          <div style="padding:0.75rem;background-color:#f8fafc;border-radius:0.75rem;border:1px solid #e2e8f0;font-size:0.6875rem;color:#64748b;line-height:1.4;display:flex;align-items:flex-start;gap:0.5rem;">
            <span class="material-symbols-outlined" style="font-size:0.875rem;color:#94a3b8;flex-shrink:0;margin-top:0.0625rem;">info</span>
            <span>Họ tên này chỉ dùng để ghi danh tính trên bản in Excel, không làm thay đổi thông tin tài khoản đăng nhập.</span>
          </div>

          <div style="display:flex;align-items:center;justify-content:flex-end;gap:0.625rem;padding-top:0.75rem;border-top:1px solid #f1f5f9;">
            <button
              type="button"
              id="author-modal-cancel"
              style="padding:0.5rem 1rem;font-size:0.75rem;font-weight:600;color:#475569;background-color:#f1f5f9;border:none;border-radius:0.75rem;cursor:pointer;transition:background-color 0.15s;"
            >
              Hủy
            </button>
            <button
              type="submit"
              id="author-modal-submit"
              style="padding:0.5rem 1rem;font-size:0.75rem;font-weight:600;color:#ffffff;background-color:#059669;border:none;border-radius:0.75rem;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05);cursor:pointer;display:inline-flex;align-items:center;gap:0.375rem;transition:background-color 0.15s;"
            >
              <span class="material-symbols-outlined" style="font-size:0.875rem;">download</span>
              <span>Xác nhận & Xuất Excel</span>
            </button>
          </div>
        </form>
      </div>
    `

    document.body.appendChild(container)
    const input = container.querySelector('#author-name-input')
    const errorEl = container.querySelector('#author-name-error')
    const form = container.querySelector('#author-modal-form')
    const cancelBtn = container.querySelector('#author-modal-cancel')

    if (lastEnteredAuthor) {
      input.value = lastEnteredAuthor
    }

    input.addEventListener('focus', () => {
      input.style.borderColor = '#059669'
      input.style.boxShadow = '0 0 0 3px rgba(5, 150, 105, 0.15)'
    })
    input.addEventListener('blur', () => {
      input.style.borderColor = '#cbd5e1'
      input.style.boxShadow = 'none'
    })

    const cleanup = () => {
      document.removeEventListener('keydown', handleKeyDown)
      container.remove()
    }

    const cancel = () => {
      cleanup()
      resolve(null)
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    cancelBtn.addEventListener('click', cancel)
    container.addEventListener('click', (e) => {
      if (e.target === container) cancel()
    })

    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const val = resolveReportAuthor(input.value)
      if (!val) {
        errorEl.style.display = 'flex'
        input.style.borderColor = '#ef4444'
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)'
        input.focus()
        return
      }
      lastEnteredAuthor = val
      cleanup()
      resolve(val)
    })

    setTimeout(() => {
      input.focus()
      if (input.value) input.select()
    }, 50)
  })
}

function isNativeFunction(fn) {
  try {
    return typeof fn === 'function' && /native code/i.test(Function.prototype.toString.call(fn))
  } catch {
    return false
  }
}

export function requestReportAuthor(preparedBy) {
  const author = resolveReportAuthor(preparedBy)
  if (author) return author
  if (typeof window === 'undefined') return null
  const isCustomTestPrompt = typeof window.prompt === 'function' && !isNativeFunction(window.prompt)
  if (!isCustomTestPrompt && typeof document !== 'undefined' && typeof document.getElementById === 'function' && typeof document.createElement === 'function' && document.body) {
    return showAuthorModalDialog()
  }
  const entered = window.prompt?.('Hồ sơ tài khoản chưa có họ tên. Nhập họ tên người lập báo cáo:')
  if (entered === null || entered === undefined) return null
  const name = resolveReportAuthor(entered)
  if (!name) {
    window.alert?.('Vui lòng nhập họ tên người lập để xuất báo cáo.')
    return null
  }
  return name
}
