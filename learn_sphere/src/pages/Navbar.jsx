import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const navigation = [
  { name: "Home", href: "/Home", current: true },
  { name: "Physics", href: "/Physics", current: false },
  { name: "Chemistry", href: "/Chemistry", current: false },
  { name: "Maths", href: "/Maths", current: false },
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

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userData));
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
                    className="relative p-1 rounded-full ring-2 ring-blue-600 hover:ring-blue-500 transition-all duration-300 group"
                  >
                    <img
                      className="h-8 w-8 rounded-full object-cover group-hover:scale-105 transition-transform duration-300"
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt="User profile"
                    />
                  </button>
                  <div
                    className={`absolute right-0 mt-3 w-48 origin-top-right bg-black rounded-lg shadow-lg ring-1 ring-gray-800 divide-y divide-gray-800 transform transition-all duration-300 ${
                      isProfileMenuOpen
                        ? "scale-100 opacity-100"
                        : "scale-95 opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="py-1">
                      <a
                        onClick={() => navigate("/ProfilePage")}
                        className="group flex items-center px-4 py-2 text-sm text-blue-300 hover:bg-gray-800 hover:text-blue-100 cursor-pointer"
                      >
                        <svg
                          className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          />
                        </svg>
                        Your Profile
                      </a>
                      <a
                        onClick={() => navigate("/settings")}
                        className="group flex items-center px-4 py-2 text-sm text-blue-300 hover:bg-gray-800 hover:text-blue-100 cursor-pointer"
                      >
                        <svg
                          className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Settings
                      </a>
                    </div>
                    <div className="py-1">
                      <a
                        onClick={handleSignOut}
                        className="group flex items-center px-4 py-2 text-sm text-red-400 hover:bg-gray-800 cursor-pointer"
                      >
                        <svg
                          className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Sign out
                      </a>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate("/login")}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-700 to-blue-600 rounded-lg hover:from-blue-800 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-900/30 hover:shadow-blue-900/40 transition-all duration-300 hover:scale-105"
                >
                  Log in
                </button>
                <button
                  onClick={() => navigate("/signup")}
                  className="px-4 py-2 text-sm font-medium text-blue-300 bg-transparent rounded-lg border border-blue-600 hover:bg-gray-800 hover:text-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 hover:scale-105"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden transform transition-all duration-300 ${
          isMobileMenuOpen
            ? "translate-x-0 opacity-100"
            : "-translate-x-full opacity-0"
        }`}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 bg-black/90 backdrop-blur-md border-t border-gray-800/30">
          {currentNav.map((item) => (
            <a
              key={item.name}
              onClick={() => handleNavigation(item.href)}
              className={`block px-4 py-3 text-base font-medium rounded-lg transition-all duration-300 cursor-pointer
                ${
                  item.current
                    ? "text-blue-100 bg-gradient-to-r from-blue-900 to-blue-800 shadow-lg shadow-blue-900/30"
                    : "text-blue-300 hover:text-blue-100 hover:bg-gray-800"
                }`}
            >
              {item.name}
            </a>
          ))}

          {!isLoggedIn && (
            <div className="mt-6 space-y-3 px-4">
              <button
                onClick={() => navigate("/login")}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg hover:from-indigo-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all duration-300"
              >
                Log in
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="w-full px-4 py-2.5 text-sm font-medium text-indigo-600 bg-white dark:bg-gray-800 rounded-lg border border-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300"
              >
                Sign up
              </button>
            </div>
          )}

          {isLoggedIn && (
            <button
              onClick={handleSignOut}
              className="w-full mt-6 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Sign out</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
