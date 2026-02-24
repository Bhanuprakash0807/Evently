import { useState } from 'react';

export default function PasswordInput({ value, onChange, placeholder, name }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="password-input-row">
      <input
        type={showPassword ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="password-input"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="toggle-password"
        aria-label="Toggle password visibility"
      >
        {showPassword ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
