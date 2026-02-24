import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordField from '../components/PasswordField.jsx';
import CaptchaWidget from '../components/CaptchaWidget.jsx';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(form.email, form.password, captchaToken);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001';

  return (
    <div className="auth-card">
      <h2>Login</h2>
      <form onSubmit={onSubmit} className="stack">
        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={onChange} required />
        <PasswordField
          label="Password"
          name="password"
          value={form.password}
          onChange={onChange}
          required
        />
        <CaptchaWidget onVerify={setCaptchaToken} />
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="submit" disabled={!captchaToken}>Login</button>
        </div>
      </form>
      <p>
        Need an account? <Link to="/signup">Sign up</Link>
      </p>
      <p style={{ marginTop: '0.5rem' }}>
        Organizer? <Link to="/organizer/forgot-password">Forgot your password?</Link>
      </p>
    </div>
  );
};

export default LoginPage;
