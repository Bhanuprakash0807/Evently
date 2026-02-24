import React from 'react';

const Card = ({ children, padded = true }) => {
  return <div className={padded ? 'card card-padded' : 'card'}>{children}</div>;
};

export default Card;
