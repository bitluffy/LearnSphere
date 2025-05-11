import React from 'react'
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar'; 
const LandingPage = () => {
  const navigate = useNavigate(); 
  console.log("Om was here!");
  return (
    <div>
      <Navbar/>
      This page is for the landing page of the website.
      Here we will advertise the website and its features.
    </div>
  );
};

export default LandingPage;
