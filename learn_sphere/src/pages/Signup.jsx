import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();
      if (response.ok) {
        alert('Signup successful! You can log in now.');
        navigate('/login');
      } else {
        alert(data.message || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert('Something went wrong');
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-900">
      <form onSubmit={handleSignup} className="bg-gray-800 p-8 rounded-lg shadow-lg text-white w-96">
        <h2 className="text-3xl font-bold mb-6 text-center text-indigo-400">Sign Up</h2>
        <input
          type="text"
          placeholder="Full Name"
          className="w-full mb-4 p-3 rounded bg-gray-700"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-3 rounded bg-gray-700"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-3 rounded bg-gray-700"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 rounded font-semibold"
        >
          Sign Up
        </button>
      </form>
    </div>
  );
};

export default Signup;
