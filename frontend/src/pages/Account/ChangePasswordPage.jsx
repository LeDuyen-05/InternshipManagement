import { useState } from 'react';
import apiClient from '../../services/api';
import Layout from '../../components/Layout';

export default function ChangePasswordPage() {
    const [f, setF] = useState({
        MatKhauCu: '',
        MatKhauMoi: ''
    });

    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        setErr('');
        setMsg('');

        try {
            const r = await apiClient.post('/auth/change-password', f);

            setMsg(r.data.message);

            setF({
                MatKhauCu: '',
                MatKhauMoi: ''
            });
        } catch (e) {
            setErr(
                e.response?.data?.message ||
                'Đổi mật khẩu thất bại.'
            );
        }
    };

    return (
        <Layout>
            <div className="page-head">
                <div>
                    <span className="eyebrow">TÀI KHOẢN</span>
                    <h2>Đổi mật khẩu</h2>
                </div>
            </div>

            <div className="info-card password-card">
                <form onSubmit={submit} className="form-grid">
                    <label>
                        Mật khẩu hiện tại
                        <input
                            type="password"
                            value={f.MatKhauCu}
                            onChange={(e) =>
                                setF({
                                    ...f,
                                    MatKhauCu: e.target.value
                                })
                            }
                            required
                        />
                    </label>

                    <label>
                        Mật khẩu mới
                        <input
                            type="password"
                            value={f.MatKhauMoi}
                            onChange={(e) =>
                                setF({
                                    ...f,
                                    MatKhauMoi: e.target.value
                                })
                            }
                            required
                        />
                    </label>

                    <button className="primary" type="submit">
                        Đổi mật khẩu
                    </button>
                </form>

                {err && (
                    <div className="alert error">
                        {err}
                    </div>
                )}

                {msg && (
                    <div className="alert success">
                        {msg}
                    </div>
                )}
            </div>
        </Layout>
    );
}