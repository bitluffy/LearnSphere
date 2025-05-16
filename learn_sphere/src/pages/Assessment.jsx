import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { InlineMath, BlockMath } from "react-katex";
import 'katex/dist/katex.min.css';

const Assessment = () => {
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('physics');
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(null);
  const [questionResults, setQuestionResults] = useState([]);
  const [feedback, setFeedback] = useState('');
  const navigate = useNavigate();

  const renderWithLatex = (text) => {
    const segments = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+\$)/g);
    return segments.map((segment, index) => {
      if (segment.startsWith("$$") && segment.endsWith("$$")) {
        return <BlockMath key={index} math={segment.slice(2, -2).trim()} errorColor="#cc0000" />;
      } else if (segment.startsWith("$") && segment.endsWith("$")) {
        return <InlineMath key={index} math={segment.slice(1, -1).trim()} errorColor="#cc0000" />;
      }
      return <span key={index}>{segment}</span>;
    });
  };

  const generateQuiz = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to generate a quiz");
      }

      console.log("Generating quiz for subject:", selectedSubject);
      const response = await fetch(`http://localhost:3000/api/generate-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subject: selectedSubject })
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Handle rate limit error
        if (response.status === 429) {
          const retryAfter = data.retryAfter || 5;
          throw new Error(`We've reached our API limit. Please try again in ${retryAfter} minutes.`);
        }
        throw new Error(data.message || data.error || 'Failed to generate quiz');
      }

      console.log("Received quiz data:", data);
      
      if (!data.quiz || !data.quiz.questions) {
        throw new Error("Invalid quiz data received");
      }

      setQuiz(data.quiz);
      setUserAnswers({});
      setShowResults(false);
      setScore(null);
      setQuestionResults([]);
      setFeedback('');
    } catch (error) {
      console.error('Error generating quiz:', error);
      alert(error.message || 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const submitQuiz = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to submit the quiz");
        return;
      }

      const response = await fetch("http://localhost:3000/api/submit-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: selectedSubject,
          answers: userAnswers,
          quizId: quiz.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit quiz");
      }

      const result = await response.json();
      setScore(result.score);
      setQuestionResults(result.questionResults);
      setFeedback(result.feedback);
      setShowResults(true);
      
      // Update user's progress in localStorage
      const userData = JSON.parse(localStorage.getItem("userData"));
      if (userData) {
        const currentProgress = userData.progress?.[selectedSubject] || 0;
        const newProgress = Math.min(100, currentProgress + result.score);
        userData.progress = {
          ...userData.progress,
          [selectedSubject]: newProgress,
        };
        localStorage.setItem("userData", JSON.stringify(userData));
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Failed to submit quiz. Please try again.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-center text-blue-400">Assessment Center</h1>
          
          {/* Subject Selection */}
          <div className="mb-8 flex justify-center gap-4">
            {['physics', 'chemistry', 'maths'].map((subject) => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  selectedSubject === subject
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {subject.charAt(0).toUpperCase() + subject.slice(1)}
              </button>
            ))}
          </div>

          {/* Generate Quiz Button */}
          <div className="text-center mb-8">
            <button
              onClick={generateQuiz}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Quiz'}
            </button>
          </div>

          {/* Quiz Display */}
          {quiz && (
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold mb-6 text-blue-400">
                {selectedSubject.charAt(0).toUpperCase() + selectedSubject.slice(1)} Quiz
              </h2>
              
              {quiz.questions.map((question, index) => (
                <div key={question.id} className="mb-8 p-4 bg-gray-700 rounded-lg">
                  <p className="text-lg mb-4">
                    <span className="font-bold text-blue-400">Q{index + 1}:</span>{' '}
                    {renderWithLatex(question.text)}
                  </p>
                  
                  <div className="space-y-3">
                    {question.options.map((option, optIndex) => (
                      <label
                        key={optIndex}
                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                          userAnswers[question.id] === option
                            ? 'bg-blue-600'
                            : 'bg-gray-600 hover:bg-gray-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option}
                          checked={userAnswers[question.id] === option}
                          onChange={() => handleAnswerSelect(question.id, option)}
                          className="mr-3"
                        />
                        {renderWithLatex(option)}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* Submit Button */}
              <div className="text-center mt-8">
                <button
                  onClick={submitQuiz}
                  disabled={loading || Object.keys(userAnswers).length !== quiz.questions.length}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Quiz'}
                </button>
              </div>
            </div>
          )}

          {/* Results Display */}
          {showResults && score !== null && (
            <div className="mt-8 bg-gray-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-2xl font-bold mb-4 text-blue-400 text-center">Quiz Results</h3>
              
              {/* Overall Score and Feedback */}
              <div className="mb-8 text-center">
                <p className="text-xl mb-2">
                  Your Score: <span className="font-bold text-green-400">{score}%</span>
                </p>
                <p className="text-gray-300">{feedback}</p>
              </div>

              {/* Detailed Question Results */}
              <div className="space-y-6">
                {questionResults.map((result, index) => (
                  <div 
                    key={result.questionId}
                    className={`p-4 rounded-lg ${
                      result.isCorrect ? 'bg-green-900/30' : 'bg-red-900/30'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <span className="font-bold text-lg mr-2">Q{index + 1}:</span>
                      <span className={`text-sm font-semibold ${
                        result.isCorrect ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <p className="text-gray-300">Your Answer: {renderWithLatex(result.userAnswer)}</p>
                      {!result.isCorrect && (
                        <p className="text-gray-300">Correct Answer: {renderWithLatex(result.correctAnswer)}</p>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-400">
                      {renderWithLatex(result.explanation)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Try Another Quiz Button */}
              <div className="text-center mt-8">
                <button
                  onClick={generateQuiz}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-all"
                >
                  Try Another Quiz
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Assessment; 