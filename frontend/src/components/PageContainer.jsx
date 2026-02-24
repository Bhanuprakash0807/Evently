import React from 'react';

const PageContainer = ({ title, actions, children }) => {
  return (
    <div className="page-container">
      {(title || actions) && (
        <div className="section-header">
          <div>
            {title && <h2 className="section-title">{title}</h2>}
          </div>
          {actions && <div className="section-actions">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default PageContainer;
