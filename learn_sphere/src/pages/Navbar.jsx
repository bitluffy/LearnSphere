import React from 'react';
import { useState } from 'react';
import './Navbar.css';
import { useNavigate } from 'react-router-dom';
const navigation = [
  { name: 'Dashboard', href: '#', current: true },
  { name: 'Team', href: '#', current: false },
  { name: 'Projects', href: '#', current: false },
  { name: 'Calendar', href: '#', current: false },
];

export default function App() {
    const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const toggleProfileMenu = () => setIsProfileMenuOpen(!isProfileMenuOpen);

  return (
    <nav className="navbar">
      <div className="container">
        <div className="nav-content">
          {/* Mobile menu button */}
          <div className="mobile-menu">
            <button
              onClick={toggleMobileMenu}
              className="mobile-menu-button"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <svg className="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              )}
            </button>
          </div>

          {/* Logo and navigation */}
          <div className="nav-main">
            <div className="logo">
              <img
                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
                alt="Your Company"
              />
            </div>
            <div className="nav-links desktop-nav">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`nav-link ${item.current ? 'active' : ''}`}
                  aria-current={item.current ? 'page' : undefined}
                >
                  {item.name}
                </a>
              ))}
            </div>
          </div>

          {/* Right side icons */}
          <div className="nav-right">
            <button className="notification-button" aria-label="View notifications">
              <svg className="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* Profile dropdown */}
            <div className="profile-menu">
              <button
                onClick={toggleProfileMenu}
                className="profile-button"
                aria-label="Toggle profile menu"
              >
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt="User profile"
                />
              </button>
              <div className={`dropdown ${isProfileMenuOpen ? 'open' : ''}`}>
                <a href="#" className="dropdown-item">Your Profile</a>
                <a href="#" className="dropdown-item">Settings</a>
                <a href="#" className="dropdown-item">Sign out</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`mobile-nav ${isMobileMenuOpen ? 'open' : ''}`}>
        {navigation.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={`mobile-nav-link ${item.current ? 'active' : ''}`}
            aria-current={item.current ? 'page' : undefined}
          >
            {item.name}
          </a>
        ))}
      </div>
    </nav>
  );
}