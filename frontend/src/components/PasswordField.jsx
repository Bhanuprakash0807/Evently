import React, { useState } from 'react';

const PasswordField = ({ label, name, value, onChange, placeholder, required = false }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      {label && <label htmlFor={name}>{label}</label>}
      <div className="password-input-row">
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          required={required}
        />
        <button type="button" className="toggle-password" onClick={() => setVisible((v) => !v)}>
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
};

export default PasswordField;
