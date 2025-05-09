import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LandingPage from './pages/LandingPage';
import Maths from './pages/Maths';
import Physics from './pages/Physics';
import Chemistry from './pages/Chemistry';
import Navbar from './pages/Navbar';
const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<Home />} />
      <Route path="/maths" element={<Maths />} />
      <Route path="/physics" element={<Physics/>}/>
      <Route path="/Chemistry" element={<Chemistry/>}/>
      <Route path="/Navbar" element={<Navbar/>}/>
    </Routes>
  );
};

export default App;
