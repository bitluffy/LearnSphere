import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from 'axios';

const navigation = [
  { name: "Home", href: "/Home", current: true },
  { name: "Physics", href: "/Physics", current: false },
  { name: "Chemistry", href: "/Chemistry", current: false },
  { name: "Maths", href: "/Maths", current: false },
  { name: "Assessment", href:"/PersonalizedAssisstant",current: false},
];

export default function Navbar() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [currentNav, setCurrentNav] = useState(navigation);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const toggleProfileMenu = () => setIsProfileMenuOpen(!isProfileMenuOpen);

  useEffect(() => {
    // Update current navigation based on the current path
    const path = window.location.pathname;
    setCurrentNav(
      navigation.map((item) => ({
        ...item,
        current: item.href === path,
      }))
    );
  }, []);

  const handleNavigation = (href) => {
    navigate(href);
    setCurrentNav(
      currentNav.map((item) => ({
        ...item,
        current: item.href === href,
      }))
    );
  };

  // Fetch user data including profile photo
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get("http://localhost:3000/api/user/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });

      if (response.data) {
        setUser(response.data);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  // Check if user is logged in and fetch data
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchUserData();
    }
  }, []);

  const handleSignOut = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/signout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Clear local storage
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
        setUser(null);
        navigate("/");
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <nav className="sticky top-0 w-full z-50 backdrop-blur-md bg-black/90 shadow-lg border-b border-gray-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-lg text-blue-300 hover:text-blue-100 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all duration-300"
              aria-label="Toggle mobile menu"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Logo and navigation */}
          <div className="flex-1 flex items-center justify-center md:justify-start">
            <div
              className="flex-shrink-0 group"
              onClick={() => navigate("/Home")}
            >
              <svg
                className="h-10 w-auto group-hover:scale-110 transition-all duration-300"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4.5L2 9.5L12 14.5L22 9.5L12 4.5Z"
                  className="fill-blue-500"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 9.5V14.5"
                  className="stroke-blue-500"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 12V17.5C17 17.5 15 19.5 12 19.5C9 19.5 7 17.5 7 17.5V12"
                  className="stroke-blue-500"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="9.5" r="1.5" className="fill-blue-300" />
              </svg>
            </div>
            <div className="hidden md:flex ml-10 space-x-1">
              {currentNav.map((item) => (
                <a
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 cursor-pointer
                    relative overflow-hidden group
                    ${
                      item.current
                        ? "text-blue-100 bg-gray-800 shadow-lg shadow-blue-900/50"
                        : "text-blue-300 hover:text-blue-100 hover:bg-gray-800"
                    }`}
                >
                  <span className="relative z-10">{item.name}</span>
                  <div
                    className={`absolute inset-0 bg-gradient-to-r from-blue-900 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      item.current ? "opacity-100" : ""
                    }`}
                  />
                </a>
              ))}
            </div>
          </div>

          {/* Right side icons and auth buttons */}
          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                <button
                  className="p-2 rounded-lg bg-gray-800 text-blue-300 hover:text-blue-100 hover:bg-gray-700 transition-all duration-300 group"
                  aria-label="View notifications"
                >
                  <svg
                    className="w-6 h-6 stroke-current stroke-2 fill-none group-hover:scale-110 transition-transform duration-300"
                    viewBox="0 0 24 24"
                  >
                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>

                <div className="relative">
                  <button
                    onClick={toggleProfileMenu}
                    className="flex items-center space-x-2 focus:outline-none"
                  >
                    <div className="relative">
                      <img
                        src={user?.profilePhoto?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}&background=0D8ABC&color=fff&size=128`}
                        alt="Profile"
                        className="h-8 w-8 rounded-full object-cover border-2 border-blue-500"
                      />
                      <div className="absolute inset-0 rounded-full ring-2 ring-blue-500 ring-opacity-50"></div>
                    </div>
                    <span className="text-blue-300">{user?.username}</span>
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            navigate("/ProfilePage");
                            setIsProfileMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-blue-300 hover:bg-gray-700"
                        >
                          Profile
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate("/signup")}
                  className="px-4 py-2 text-sm font-medium text-blue-300 hover:text-blue-100 hover:bg-gray-800 rounded-lg transition-all duration-300"
                >
                  Sign up
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all duration-300"
                >
                  Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {currentNav.map((item) => (
              <a
                key={item.name}
                onClick={() => {
                  handleNavigation(item.href);
                  setIsMobileMenuOpen(false);
                }}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  item.current
                    ? "text-blue-100 bg-gray-800"
                    : "text-blue-300 hover:text-blue-100 hover:bg-gray-800"
                }`}
              >
                {item.name}
              </a>
            ))}
            {!isLoggedIn && (
              <div className="flex flex-col space-y-2 mt-4 pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    navigate("/signup");
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 text-base font-medium text-blue-300 hover:text-blue-100 hover:bg-gray-800 rounded-md"
                >
                  Sign up
                </button>
                <button
                  onClick={() => {
                    navigate("/login");
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 text-base font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-md"
                >
                  Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
