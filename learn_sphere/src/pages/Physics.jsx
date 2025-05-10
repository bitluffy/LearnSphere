import React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Navbar from './Navbar';
// Change to default export to match your import in App.jsx
const Physics = () => {
  const navigate = useNavigate();
  // If you need navigate, use it here
  
  return (
    <>
      <Navbar/>
      Chemistry
    </>
  )
}

export default Physics;
