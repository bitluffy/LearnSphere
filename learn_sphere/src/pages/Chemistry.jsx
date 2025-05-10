import React from 'react'
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
const Chemistry = () => {
  const navigate = useNavigate();
  return (
    <>
      <Navbar/>
      Chemistry
    </>
  )
}

export default Chemistry;