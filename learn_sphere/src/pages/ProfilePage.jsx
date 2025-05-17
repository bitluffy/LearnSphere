// ProfilePage.jsx
import React, { useState, useEffect } from "react";
import {
  FiEdit2,
  FiSave,
  FiX,
  FiMail,
  FiBook,
  FiCalendar,
  FiAward,
  FiTrendingUp,
} from "react-icons/fi";
import Navbar from "./Navbar";
import axios from 'axios';

// Initial profile with empty values (will be filled from MongoDB)
const initialProfile = {
  username: "",
  email: "",
  pronouns: "",
  institution: "",
  year: "",
  branch: "",
  badges: [],
  subjectProgress: {
    physics: { totalQuizzes: 0, averageScore: 0, highestScore: 0, progressHistory: [] },
    chemistry: { totalQuizzes: 0, averageScore: 0, highestScore: 0, progressHistory: [] },
    mathematics: { totalQuizzes: 0, averageScore: 0, highestScore: 0, progressHistory: [] }
  }
};

export default function ProfilePage() {
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(initialProfile);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Fetch user data from MongoDB
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await axios.get("http://localhost:3000/api/user/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });

        if (response.data) {
          setProfile(response.data);
          setEditedProfile(response.data);
        } else {
          throw new Error("No data received from server");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          setError(err.response.data.error || "Server error occurred");
        } else if (err.request) {
          // The request was made but no response was received
          setError("No response from server. Please check if the server is running.");
        } else {
          // Something happened in setting up the request that triggered an Error
          setError(err.message || "Failed to load profile data");
        }
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
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pronouns: editedProfile.pronouns,
          institution: editedProfile.institution,
          year: editedProfile.year,
          branch: editedProfile.branch,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      const updatedUser = await response.json();
      setProfile(updatedUser);
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

  const getProgressColor = (score) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setUploadError('Please upload a JPEG or PNG image');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await axios.post('http://localhost:3000/api/users/profile-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setProfile(prev => ({
        ...prev,
        profilePhoto: response.data.profilePhoto
      }));
    } catch (error) {
      setUploadError(error.response?.data?.message || 'Error uploading photo');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-blue-400 text-xl">
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto opacity-100 transform translate-y-0 transition duration-500">
          {error && (
            <div className="bg-red-900/50 border-l-4 border-red-500 text-red-200 p-4 mb-6 rounded shadow-md flex items-center">
              <p className="flex-1">{error}</p>
              <button
                onClick={() => setError("")}
                className="ml-auto text-red-300 hover:text-red-100"
              >
                <FiX className="inline" />
              </button>
            </div>
          )}

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
            {/* Header with edit/save buttons */}
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h1 className="text-2xl font-bold text-blue-400">Your Profile</h1>
              <div>
                {editing ? (
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg"
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
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg"
                  >
                    <FiEdit2 className="mr-2" /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
              {/* Left Column - Basic Info */}
              <div className="md:col-span-1">
                <div className="flex flex-col items-center p-6 bg-gray-800 rounded-xl hover:scale-105 transition-transform border border-gray-700">
                  {/* Profile Photo Upload Section */}
                  <div className="relative mb-4">
                    <img
                      src={profile.profilePhoto?.url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.username || 'User') + '&background=0D8ABC&color=fff&size=128'}
                      alt="Profile"
                      className="w-28 h-28 rounded-full object-cover border-4 border-blue-500"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors border-2 border-white"
                      title="Change profile photo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" />
                      </svg>
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={isUploading}
                    />
                  </div>
                  {uploadError && (
                    <div className="mb-2 text-red-500 text-xs">{uploadError}</div>
                  )}
                  {isUploading && (
                    <div className="mb-2 text-blue-400 text-xs">Uploading...</div>
                  )}
                  {/* End Profile Photo Upload Section */}
                  <h2 className="text-2xl font-bold text-blue-400 mb-1">
                    {profile.username}
                  </h2>

                  <div className="flex items-center text-gray-300 mb-4">
                    <FiMail className="mr-2" />
                    <span>{profile.email}</span>
                  </div>

                  {editing ? (
                    <div className="w-full space-y-3">
                      <div>
                        <label className="block text-gray-300 text-sm font-medium mb-1">
                          Pronouns
                        </label>
                        <input
                          type="text"
                          name="pronouns"
                          value={editedProfile.pronouns || ""}
                          onChange={handleInputChange}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g., they/them"
                        />
                      </div>
                    </div>
                  ) : (
                    profile.pronouns && (
                      <p className="text-gray-300 text-sm">
                        ({profile.pronouns})
                      </p>
                    )
                  )}
                </div>

                {/* Progress Overview */}
                <div className="mt-6 p-6 bg-gray-800 rounded-xl border border-gray-700">
                  <div className="flex items-center mb-4">
                    <FiTrendingUp className="text-blue-400 mr-2" size={20} />
                    <h3 className="text-xl font-semibold text-blue-400">Progress Overview</h3>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(profile.subjectProgress || {}).map(([subject, data]) => (
                      <div key={subject} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300 capitalize">{subject}</span>
                          <span className="text-white font-medium">{Math.round(data.averageScore)}%</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(data.averageScore)} transition-all duration-500`}
                            style={{ width: `${data.averageScore}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm text-gray-400">
                          <span>Quizzes: {data.totalQuizzes}</span>
                          <span>Highest: {Math.round(data.highestScore)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Badges Section */}
                <div className="mt-6 p-6 bg-gray-800 rounded-xl border border-gray-700">
                  <div className="flex items-center mb-4">
                    <FiAward className="text-blue-400 mr-2" size={20} />
                    <h3 className="text-xl font-semibold text-blue-400">
                      Achievements
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.badges?.map((badge, index) => (
                      <div
                        key={index}
                        className="flex items-center bg-blue-900/30 backdrop-blur-sm text-blue-100 rounded-full px-4 py-2 text-sm font-medium border border-blue-700 shadow-lg hover:scale-105 transition-transform"
                      >
                        <span className="mr-2 text-xl">{badge.icon}</span>
                        {badge.title}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Details and Progress */}
              <div className="md:col-span-2 space-y-6">
                {/* Academic Info */}
                <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
                  <div className="flex items-center mb-4">
                    <FiBook className="text-blue-400 mr-2" size={20} />
                    <h3 className="text-xl font-semibold text-blue-400">
                      Academic Information
                    </h3>
                  </div>

                  {editing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-300 text-sm font-medium mb-1">
                          Institution
                        </label>
                        <input
                          type="text"
                          name="institution"
                          value={editedProfile.institution || ""}
                          onChange={handleInputChange}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="Your institution"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 text-sm font-medium mb-1">
                          Year
                        </label>
                        <input
                          type="text"
                          name="year"
                          value={editedProfile.year || ""}
                          onChange={handleInputChange}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="Your year"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 text-sm font-medium mb-1">
                          Branch
                        </label>
                        <input
                          type="text"
                          name="branch"
                          value={editedProfile.branch || ""}
                          onChange={handleInputChange}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="Your branch"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.institution && (
                        <div>
                          <span className="text-gray-300 text-sm">Institution</span>
                          <p className="text-white">{profile.institution}</p>
                        </div>
                      )}
                      {profile.year && (
                        <div>
                          <span className="text-gray-300 text-sm">Year</span>
                          <p className="text-white">{profile.year}</p>
                        </div>
                      )}
                      {profile.branch && (
                        <div>
                          <span className="text-gray-300 text-sm">Branch</span>
                          <p className="text-white">{profile.branch}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Detailed Progress Section */}
                <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
                  <div className="flex items-center mb-4">
                    <FiTrendingUp className="text-blue-400 mr-2" size={20} />
                    <h3 className="text-xl font-semibold text-blue-400">Detailed Progress</h3>
                  </div>
                  <div className="space-y-6">
                    {Object.entries(profile.subjectProgress || {}).map(([subject, data]) => (
                      <div key={subject} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                        <h4 className="text-lg font-semibold text-blue-400 capitalize mb-3">{subject}</h4>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <p className="text-gray-300 text-sm">Total Quizzes</p>
                            <p className="text-white text-xl font-bold">{data.totalQuizzes}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-300 text-sm">Average Score</p>
                            <p className="text-white text-xl font-bold">{Math.round(data.averageScore)}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-300 text-sm">Highest Score</p>
                            <p className="text-white text-xl font-bold">{Math.round(data.highestScore)}%</p>
                          </div>
                        </div>
                        {data.progressHistory && data.progressHistory.length > 0 && (
                          <div className="mt-4">
                            <p className="text-gray-300 text-sm mb-2">Recent Progress</p>
                            <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                              {data.progressHistory.map((entry, index) => (
                                <div
                                  key={index}
                                  className={`h-full ${getProgressColor(entry.score)} transition-all duration-500`}
                                  style={{
                                    width: `${100 / data.progressHistory.length}%`,
                                    marginLeft: index === 0 ? '0' : '-2px'
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
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
