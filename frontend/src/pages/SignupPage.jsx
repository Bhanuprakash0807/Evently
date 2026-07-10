import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordField from '../components/PasswordField.jsx';
import CaptchaWidget from '../components/CaptchaWidget.jsx';

const SignupPage = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    instituteName: '',
    collegeOrgName: '',
    contactNumber: '',
    isIIIT: false,
  });
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const IIIT_EMAIL_REGEX = /^[^@\s]+(?:\.[^@\s]+)?@(?:[^@\s]+\.)?iiit\.ac\.in$/i;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.isIIIT && !IIIT_EMAIL_REGEX.test(form.email.trim())) {
      setError('IIIT participants must use @iiit.ac.in email (subdomain optional)');
      return;
    }
    try {
      await signup({
        ...form,
        participantType: form.isIIIT ? 'iiit' : 'non-iiit',
        captchaToken,
      });
      navigate('/onboarding');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="auth-card">
      <h2>Participant Signup</h2>
      <form onSubmit={onSubmit} className="stack">
        <label>First Name</label>
        <input name="firstName" value={form.firstName} onChange={onChange} required />

        <label>Last Name</label>
        <input name="lastName" value={form.lastName} onChange={onChange} />

        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={onChange} required />

        <PasswordField
          label="Password"
          name="password"
          value={form.password}
          onChange={onChange}
          required
        />

        <label>Institute / Club (optional)</label>
        <input name="instituteName" value={form.instituteName} onChange={onChange} />

        <label>College / Organization (optional)</label>
        <input name="collegeOrgName" value={form.collegeOrgName} onChange={onChange} />

        <label>Contact Number (optional)</label>
        <input name="contactNumber" value={form.contactNumber} onChange={onChange} placeholder="+91 XXXXXXXXXX" />

        <label className="checkbox">
          <input name="isIIIT" type="checkbox" checked={form.isIIIT} onChange={onChange} />
          I am an IIIT participant (use IIIT email)
        </label>

        <CaptchaWidget onVerify={setCaptchaToken} />
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="submit" disabled={!captchaToken}>Create Account</button>
        </div>
      </form>
      <p>
        Already registered? <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

export default SignupPage;

