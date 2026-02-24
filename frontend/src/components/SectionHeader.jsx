import React from 'react';

const SectionHeader = ({ title, subtitle, actions }) => (
  <div className="section-header">
    <div>
      <h3 className="section-title">{title}</h3>
      {subtitle && <p className="muted small-text">{subtitle}</p>}
    </div>
    {actions && <div className="section-actions">{actions}</div>}
  </div>
);

export default SectionHeader;
