import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import Maths from "./pages/Maths";
import Physics from "./pages/Physics";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chemistry from "./pages/Chemistry";
import Navbar from "./pages/Navbar";
import ProfilePage from "./pages/ProfilePage";
import Assessment from "./pages/Assessment";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<Home />} />
      <Route path="/maths" element={<Maths />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/physics" element={<Physics />} />
      <Route path="/Chemistry" element={<Chemistry />} />
      <Route path="/Navbar" element={<Navbar />} />
      <Route path="/ProfilePage" element={<ProfilePage />} />
      <Route path="/assessment" element={<Assessment />} />
    </Routes>
  );
};

export default App;
