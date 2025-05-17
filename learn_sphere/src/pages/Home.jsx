import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import axios from 'axios';

const RatingGraph = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRating = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');
        const response = await axios.get('http://localhost:3000/api/user/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        });
        setHistory(response.data?.rating?.history || []);
      } catch (err) {
        setError('Failed to load rating history');
      } finally {
        setLoading(false);
      }
    };
    fetchRating();
  }, []);

  if (loading) return <div className="text-blue-400 text-center mb-8">Loading rating graph...</div>;
  if (error) return <div className="text-red-400 text-center mb-8">{error}</div>;
  if (!history.length) return <div className="text-gray-400 text-center mb-8">No rating history yet. Take quizzes to build your rating!</div>;

  // Prepare data for SVG
  const maxRating = Math.max(...history.map(h => h.newRating), 2000);
  const minRating = Math.min(...history.map(h => h.newRating), 1000);
  const points = history.map((h, i) => {
    const x = (i / (history.length - 1 || 1)) * 500;
    const y = 120 - ((h.newRating - minRating) / (maxRating - minRating || 1)) * 100;
    return `${x},${y}`;
  }).join(' ');
  const latest = history[history.length - 1];

  return (
    <div className="w-full max-w-2xl mx-auto mb-10 bg-gray-800 rounded-xl p-6 border border-blue-700 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-blue-400">Your Rating Progress</h2>
        <span className="text-lg text-gray-300">Current: <span className="font-bold text-blue-300">{latest.newRating}</span></span>
      </div>
      <svg width="100%" height="140" viewBox="0 0 500 140" className="block">
        <polyline
          fill="none"
          stroke="url(#rating-gradient)"
          strokeWidth="4"
          points={points}
        />
        <defs>
          <linearGradient id="rating-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        {/* Dots for each point */}
        {history.map((h, i) => {
          const x = (i / (history.length - 1 || 1)) * 500;
          const y = 120 - ((h.newRating - minRating) / (maxRating - minRating || 1)) * 100;
          return (
            <circle key={i} cx={x} cy={y} r="5" fill="#38bdf8" stroke="#fff" strokeWidth="2">
              <title>{`Rating: ${h.newRating}\n${new Date(h.timestamp).toLocaleDateString()}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>{minRating}</span>
        <span>{maxRating}</span>
      </div>
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate(); 

  const handleCardClick = (path) => {
    navigate(path);
  };

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-start py-12 overflow-y-auto">
        <RatingGraph />
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-400 mb-10 text-center drop-shadow-lg">Choose Your Learning Agent</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl px-4">
          {/* Physics Card */}
          <div 
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border-2 border-blue-500/40"
            onClick={() => handleCardClick('/Physics')}
          >
            <div className="p-8 flex flex-col items-center">
              <div className="flex justify-center mb-4">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white text-center mb-2">Physics</h2>
              <p className="text-blue-100 text-center">Explore mechanics, electricity, thermodynamics and more with our Physics agent.</p>
            </div>
          </div>

          {/* Chemistry Card */}
          <div 
            className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border-2 border-green-500/40"
            onClick={() => handleCardClick('/Chemistry')}
          >
            <div className="p-8 flex flex-col items-center">
              <div className="flex justify-center mb-4">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white text-center mb-2">Chemistry</h2>
              <p className="text-green-100 text-center">Discover elements, compounds, reactions and more with our Chemistry agent.</p>
            </div>
          </div>

          {/* Mathematics Card */}
          <div 
            className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border-2 border-purple-500/40"
            onClick={() => handleCardClick('/Maths')}
          >
            <div className="p-8 flex flex-col items-center">
              <div className="flex justify-center mb-4">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white text-center mb-2">Mathematics</h2>
              <p className="text-purple-100 text-center">Master algebra, calculus, statistics and more with our Mathematics agent.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
