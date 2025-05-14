// ProfilePage.jsx
import React, { useState, useEffect } from "react";
import {
  FiEdit2,
  FiSave,
  FiX,
  FiUser,
  FiMail,
  FiBook,
  FiCalendar,
  FiAward,
} from "react-icons/fi";
import { RiMentalHealthLine } from "react-icons/ri";
import Navbar from "./Navbar";

// Initial profile with empty name and email (will be filled from MongoDB)
const initialProfile = {
  name: "",
  email: "",
  pronouns: "",
  institution: "",
  year: "",
  branch: "",
  learningStyle: "Visual",
  interests: [],
  badges: [
    { title: "Calculus Sensei", icon: "📐" },
    { title: "Bond Master", icon: "🧪" },
    { title: "Physics Pro", icon: "⚡" },
  ],
  progress: {
    physics: 0,
    chemistry: 0,
    maths: 0,
  },
};

const learningStyles = ["Visual", "Textual", "Step-by-step", "Examples"];
const interestOptions = ["Physics", "Chemistry", "Maths"];

export default function ProfilePage() {
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(initialProfile);
  const [error, setError] = useState("");

  // Fetch user data from MongoDB
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }
        const response = await fetch("http://localhost:3000/api/user/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
        const userData = await response.json();
        setProfile((prev) => ({
          ...prev,
          name: userData.username || "",
          email: userData.email || "",
        }));
        setEditedProfile((prev) => ({
          ...prev,
          name: userData.username || "",
          email: userData.email || "",
        }));
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load profile data. Please try again later.");
        setProfile({
          ...initialProfile,
          name: "Alex Johnson",
          email: "alex.johnson@example.com",
        });
        setEditedProfile({
          ...initialProfile,
          name: "Alex Johnson",
          email: "alex.johnson@example.com",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleEditToggle = () => {
    if (editing) {
      setEditedProfile(profile);
    } else {
      setEditedProfile(profile);
    }
    setEditing(!editing);
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const dataToUpdate = {
        ...editedProfile,
        name: profile.name,
        email: profile.email,
      };
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dataToUpdate),
      });
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      setProfile(dataToUpdate);
      setEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedProfile({ ...editedProfile, [name]: value });
  };

  const handleInterestToggle = (interest) => {
    setEditedProfile((prev) => {
      const interests = prev.interests || [];
      if (interests.includes(interest)) {
        return { ...prev, interests: interests.filter((i) => i !== interest) };
      } else {
        return { ...prev, interests: [...interests, interest] };
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-indigo-100 via-sky-100 to-emerald-50 flex items-center justify-center">
        <div className="animate-pulse text-indigo-700 text-xl">
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-tr from-indigo-900 via-purple-900 to-pink-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto opacity-100 transform translate-y-0 transition duration-500">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-md flex items-center">
              <p className="flex-1">{error}</p>
              <button
                onClick={() => setError("")}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <FiX className="inline" />
              </button>
            </div>
          )}

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden">
            {/* Header with edit/save buttons */}
            <div className="flex justify-between items-center p-6 border-b border-white/20">
              <h1 className="text-2xl font-bold text-white">Your Profile</h1>
              <div>
                {editing ? (
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-lg"
                    >
                      <FiSave className="mr-2" /> Save
                    </button>
                    <button
                      onClick={handleEditToggle}
                      className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors shadow-lg"
                    >
                      <FiX className="mr-2" /> Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleEditToggle}
                    className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-lg"
                  >
                    <FiEdit2 className="mr-2" /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
              {/* Left Column - Avatar and Basic Info */}
              <div className="md:col-span-1">
                <div className="flex flex-col items-center p-6 bg-white/5 rounded-xl backdrop-blur-sm hover:scale-105 transition-transform">
                  <div className="relative">
                    <img
                      src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${
                        typeof profile.name === "string"
                          ? profile.name.split(" ")[0]
                          : "User"
                      }`}
                      alt="avatar"
                      className="w-32 h-32 rounded-full border-4 border-indigo-300/50 shadow-lg mb-4"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-full shadow-lg">
                      <FiUser size={20} />
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-white mb-1">
                    {typeof profile.name === "string" ? profile.name : "User"}
                  </h2>

                  <div className="flex items-center text-indigo-200 mb-4">
                    <FiMail className="mr-2" />
                    <span>
                      {typeof profile.email === "string"
                        ? profile.email
                        : "email@example.com"}
                    </span>
                  </div>

                  {editing ? (
                    <div className="w-full space-y-3">
                      <div>
                        <label className="block text-indigo-200 text-sm font-medium mb-1">
                          Pronouns
                        </label>
                        <input
                          type="text"
                          name="pronouns"
                          value={editedProfile.pronouns || ""}
                          onChange={handleInputChange}
                          className="w-full bg-white/10 border border-indigo-300/30 rounded-lg px-3 py-2 text-white"
                          placeholder="e.g., they/them"
                        />
                      </div>
                    </div>
                  ) : (
                    profile.pronouns && (
                      <p className="text-indigo-200 text-sm">
                        ({profile.pronouns})
                      </p>
                    )
                  )}
                </div>

                {/* Badges Section */}
                <div className="mt-6 p-6 bg-white/5 rounded-xl backdrop-blur-sm transition-opacity duration-300">
                  <div className="flex items-center mb-4">
                    <FiAward className="text-yellow-400 mr-2" size={20} />
                    <h3 className="text-xl font-semibold text-white">
                      Achievements
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.badges.map((badge) => (
                      <div
                        key={badge.title}
                        className="flex items-center bg-gradient-to-r from-yellow-400/20 to-amber-500/20 backdrop-blur-sm text-yellow-100 rounded-full px-4 py-2 text-sm font-medium border border-yellow-400/30 shadow-lg hover:scale-105 transition-transform"
                      >
                        <span className="mr-2 text-xl">
                          {typeof badge.icon === "string" ? badge.icon : null}
                        </span>
                        {badge.title}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Details and Progress */}
              <div className="md:col-span-2 space-y-6">
                {/* Academic Info */}
                <div className="p-6 bg-white/5 rounded-xl backdrop-blur-sm transition-transform duration-300">
                  <div className="flex items-center mb-4">
                    <FiBook className="text-indigo-300 mr-2" size={20} />
                    <h3 className="text-xl font-semibold text-white">
                      Academic Information
                    </h3>
                  </div>

                  {editing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-indigo-200 text-sm font-medium mb-1">
                          Institution
                        </label>
                        <input
                          type="text"
                          name="institution"
                          value={editedProfile.institution || ""}
                          onChange={handleInputChange}
                          className="w-full bg-white/10 border border-indigo-300/30 rounded-lg px-3 py-2 text-white"
                          placeholder="Your school or university"
                        />
                      </div>
                      <div>
                        <label className="block text-indigo-200 text-sm font-medium mb-1">
                          Year
                        </label>
                        <input
                          type="text"
                          name="year"
                          value={editedProfile.year || ""}
                          onChange={handleInputChange}
                          className="w-full bg-white/10 border border-indigo-300/30 rounded-lg px-3 py-2 text-white"
                          placeholder="e.g., 2nd Year"
                        />
                      </div>
                      <div>
                        <label className="block text-indigo-200 text-sm font-medium mb-1">
                          Branch/Major
                        </label>
                        <input
                          type="text"
                          name="branch"
                          value={editedProfile.branch || ""}
                          onChange={handleInputChange}
                          className="w-full bg-white/10 border border-indigo-300/30 rounded-lg px-3 py-2 text-white"
                          placeholder="Your field of study"
                        />
                      </div>
                      <div>
                        <label className="block text-indigo-200 text-sm font-medium mb-1">
                          Learning Style
                        </label>
                        <select
                          name="learningStyle"
                          value={editedProfile.learningStyle || "Visual"}
                          onChange={handleInputChange}
                          className="w-full bg-white/10 border border-indigo-300/30 rounded-lg px-3 py-2 text-white"
                        >
                          {learningStyles.map((style) => (
                            <option key={style} value={style}>
                              {style}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start">
                        <FiCalendar className="text-indigo-300 mt-1 mr-2" />
                        <div>
                          <p className="text-indigo-200 text-sm">Institution</p>
                          <p className="text-white font-medium">
                            {profile.institution || "Not specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <FiCalendar className="text-indigo-300 mt-1 mr-2" />
                        <div>
                          <p className="text-indigo-200 text-sm">Year</p>
                          <p className="text-white font-medium">
                            {profile.year || "Not specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <FiBook className="text-indigo-300 mt-1 mr-2" />
                        <div>
                          <p className="text-indigo-200 text-sm">
                            Branch/Major
                          </p>
                          <p className="text-white font-medium">
                            {profile.branch || "Not specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <RiMentalHealthLine className="text-indigo-300 mt-1 mr-2" />
                        <div>
                          <p className="text-indigo-200 text-sm">
                            Learning Style
                          </p>
                          <p className="text-white font-medium">
                            {profile.learningStyle || "Visual"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Interests */}
                <div className="p-6 bg-white/5 rounded-xl backdrop-blur-sm transition-transform duration-300">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Interests
                  </h3>
                  {editing ? (
                    <div className="flex flex-wrap gap-2">
                      {interestOptions.map((interest) => (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => handleInterestToggle(interest)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            (editedProfile.interests || []).includes(interest)
                              ? "bg-indigo-600 text-white"
                              : "bg-white/10 text-indigo-200 hover:bg-white/20"
                          }`}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(profile.interests || []).length > 0 ? (
                        profile.interests.map((subject) => (
                          <span
                            key={subject}
                            className="inline-block bg-indigo-600/30 text-indigo-100 rounded-full px-4 py-2 text-sm font-medium border border-indigo-500/30"
                          >
                            {subject}
                          </span>
                        ))
                      ) : (
                        <p className="text-indigo-200">
                          No interests specified
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress Bars */}
                <div className="p-6 bg-white/5 rounded-xl backdrop-blur-sm transition-transform duration-300">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Learning Progress
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(profile.progress || {}).map(
                      ([subject, percent]) => (
                        <div key={subject}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize text-indigo-200">
                              {subject}
                            </span>
                            <span className="text-white font-medium">
                              {percent}%
                            </span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-1000"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
