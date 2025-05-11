import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const navigation = [
  { name: 'Home', href: '/Home', current: true },
  { name: 'Physics', href: '/Physics', current: false },
  { name: 'Chemistry', href: '/Chemistry', current: false },
  { name: 'Maths', href: '/Maths', current: false },
];

export default function Navbar() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const toggleProfileMenu = () => setIsProfileMenuOpen(!isProfileMenuOpen);

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleSignOut = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/signout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
        setUser(null);
        navigate('/');
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-gray-800 to-gray-900 shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Mobile menu button */}
          <div className="flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="bg-transparent border-0 p-2 text-gray-300 hover:text-white hover:scale-110 transition-all cursor-pointer"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              )}
            </button>
          </div>

          {/* Logo and navigation */}
          <div className="flex items-center justify-center flex-1">
            <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate('/Home')}>
              <img
                className="h-8 w-auto transition-transform duration-300 hover:scale-110"
                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
                alt="LearnSphere"
              />
            </div>
            <div className="hidden sm:flex ml-6 space-x-4">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={`relative px-3 py-2 text-sm font-medium rounded-md transition-colors duration-300 cursor-pointer
                    ${item.current 
                      ? 'text-white bg-gray-800' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    } 
                    after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 
                    after:bg-indigo-500 after:scale-x-0 after:origin-right after:transition-transform after:duration-300
                    hover:after:scale-x-100 hover:after:origin-left
                    ${item.current ? 'after:scale-x-100 after:origin-left' : ''}`}
                  aria-current={item.current ? 'page' : undefined}
                >
                  {item.name}
                </a>
              ))}
            </div>
          </div>

          {/* Right side icons and auth buttons */}
          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                <button className="p-2 rounded-full bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 hover:scale-110 transition-all" aria-label="View notifications">
                  <svg className="w-6 h-6 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={toggleProfileMenu}
                    className="p-0.5 rounded-full bg-gray-800 hover:scale-105 transition-transform"
                    aria-label="Toggle profile menu"
                  >
                    <img
                      className="h-8 w-8 rounded-full object-cover"
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt="User profile"
                    />
                  </button>
                  <div className={`absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg transform transition-all duration-200 
                    ${isProfileMenuOpen 
                      ? 'scale-100 opacity-100 visible' 
                      : 'scale-95 opacity-0 invisible'}`}>
                    <a onClick={() => navigate('/profile')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer">Your Profile</a>
                    <a onClick={() => navigate('/settings')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer">Settings</a>
                    <a onClick={handleSignOut} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer">Sign out</a>
                  </div>
                </div>
              </>
            ) : (
              <>
                <button 
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Log in
                </button>
                <button 
                  onClick={() => navigate('/signup')}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white rounded-md border border-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`sm:hidden bg-gray-900 p-4 ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
        {navigation.map((item) => (
          <a
            key={item.name}
            onClick={() => navigate(item.href)}
            className={`block px-4 py-3 text-base rounded-md mb-1 transition-colors duration-300 cursor-pointer
              ${item.current 
                ? 'text-white bg-gray-800' 
                : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
            aria-current={item.current ? 'page' : undefined}
          >
            {item.name}
          </a>
        ))}
        
        {/* Mobile auth buttons */}
        {!isLoggedIn && (
          <div className="mt-4 space-y-2">
            <button 
              onClick={() => navigate('/login')}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Log in
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="w-full px-4 py-2 text-sm font-medium text-indigo-600 bg-white rounded-md border border-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              Sign up
            </button>
          </div>
        )}
        
        {isLoggedIn && (
          <button 
            onClick={handleSignOut}
            className="w-full mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
          >
            Sign out
          </button>
        )}
      </div>
    </nav>
  );
}