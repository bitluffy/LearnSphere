import React from 'react';
// import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const LatexRender = ({ latex }) => {
  if (!latex) return null;
  return (
    <div className="latex-container">
      <BlockMath math={latex} errorColor="#cc0000" />
    </div>
  );
};

export default LatexRender;
