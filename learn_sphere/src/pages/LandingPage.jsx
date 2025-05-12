import React from 'react'
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar'; 
const LandingPage = () => {
  const navigate = useNavigate(); 
  return (
    <><Navbar/>
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center">
      
      <div className="bg-gray-800 bg-opacity-90 rounded-2xl shadow-2xl p-10 mt-12 max-w-xl w-full flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-400 mb-4 text-center drop-shadow-lg">Welcome to LearnSphere</h1>
        <p className="text-gray-200 text-lg mb-8 text-center">Empowering your learning journey in Physics, Chemistry, and Mathematics with expert AI agents.</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button onClick={() => navigate('/Home')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">Get Started</button>
        </div>
      </div>
      <footer className="mt-12 text-gray-500 text-sm">&copy; {new Date().getFullYear()} LearnSphere. All rights reserved.</footer>
    </div>
    </>
  );
};

export default LandingPage;
