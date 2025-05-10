import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
const Home = () => {
  const navigate = useNavigate(); 
  console.log("ESs was here!");

  return (
    <>
      <Navbar/>
      Home
    </>
  );
};

export default Home;
