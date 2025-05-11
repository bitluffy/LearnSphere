import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';

const Home = () => {
  const navigate = useNavigate(); 
  console.log("ESs was here!");

  const handleCardClick = (path) => {
    navigate(path);
  };

  return (
    <>
      <Navbar/>
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Choose Your Learning Agent</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Physics Card */}
          <div 
            className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
            onClick={() => handleCardClick('/Physics')}
          >
            <div className="p-6">
              <div className="flex justify-center mb-4">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white text-center">Physics</h2>
              <p className="mt-2 text-blue-100 text-center">
                Explore mechanics, electricity, thermodynamics and more with our Physics agent.
              </p>
            </div>
          </div>

          {/* Chemistry Card */}
          <div 
            className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
            onClick={() => handleCardClick('/Chemistry')}
          >
            <div className="p-6">
              <div className="flex justify-center mb-4">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white text-center">Chemistry</h2>
              <p className="mt-2 text-green-100 text-center">
                Discover elements, compounds, reactions and more with our Chemistry agent.
              </p>
            </div>
          </div>

          {/* Mathematics Card */}
          <div 
            className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
            onClick={() => handleCardClick('/Maths')}
          >
            <div className="p-6">
              <div className="flex justify-center mb-4">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white text-center">Mathematics</h2>
              <p className="mt-2 text-purple-100 text-center">
                Master algebra, calculus, statistics and more with our Mathematics agent.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
