import React from 'react'
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate(); 
  console.log("Om was here!");
  return (
    <div>
      <h1>Welcome to LearnSphere</h1>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => navigate('/Home')}>Go to Home</button>
        <button onClick={() => navigate('/Maths')}>Go to Maths</button>
        <button onClick={() => navigate('/physics')}>Go to Physics</button>
        <button onClick={() => navigate('/Chemistry')}>Go to Chemistry</button>
      </div>
    </div>
  );
};

export default LandingPage;
