import React from 'react'

export default function NoLinkedAccount({ type = 'tài khoản' }) {
  return (
    <div className="p-8 max-w-lg mx-auto text-center bg-white rounded-xl shadow-sm border border-slate-200 mt-12">
      <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="material-symbols-outlined text-3xl">warning</span>
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Chưa liên kết thông tin {type}</h2>
      <p className="text-slate-600 mb-6 text-sm leading-relaxed">
        Tài khoản của bạn chưa được liên kết với mã {type} trong hệ thống. Vui lòng liên hệ Văn phòng Khoa để được hỗ trợ cập nhật dữ liệu hồ sơ.
      </p>
    </div>
  )
}
