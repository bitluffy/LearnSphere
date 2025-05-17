import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

const PersonalizedAssessment = () => {
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("physics");
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(null);
  const [questionResults, setQuestionResults] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [recentQueries, setRecentQueries] = useState([]);

  // Fetch user's recent queries when component mounts or subject changes
  useEffect(() => {
    fetchRecentQueries();
  }, [selectedSubject]);

  const renderWithLatex = (text) => {
    const segments = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+\$)/g);
    return segments.map((segment, index) => {
      if (segment.startsWith("$$") && segment.endsWith("$$")) {
        return (
          <BlockMath
            key={index}
            math={segment.slice(2, -2).trim()}
            errorColor="#cc0000"
          />
        );
      } else if (segment.startsWith("$") && segment.endsWith("$")) {
        return (
          <InlineMath
            key={index}
            math={segment.slice(1, -1).trim()}
            errorColor="#cc0000"
          />
        );
      }
      return <span key={index}>{segment}</span>;
    });
  };

  const fetchRecentQueries = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to view your assessments");
      }

      const response = await fetch(
        `http://localhost:3000/api/recent-queries/${selectedSubject}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch recent queries");
      }

      const data = await response.json();
      setRecentQueries(data.queries);
    } catch (error) {
      console.error("Error fetching queries:", error);
      alert(error.message);
    }
  };

  const generatePersonalizedQuiz = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to generate a quiz");
      }

      const response = await fetch(
        `http://localhost:3000/api/generate-personalized-quiz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject: selectedSubject,
            queries: recentQueries,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate quiz");
      }

      setQuiz(data.quiz);
      setUserAnswers({});
      setShowResults(false);
      setScore(null);
      setQuestionResults([]);
      setFeedback("");
    } catch (error) {
      console.error("Error generating quiz:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, answer) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const submitQuiz = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to submit the quiz");
        return;
      }

      const response = await fetch(
        "http://localhost:3000/api/submit-personalized-quiz",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject: selectedSubject,
            answers: userAnswers,
            quiz: quiz.questions,  // Send the questions array instead of the entire quiz object
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to submit quiz");
      }

      const result = await response.json();
      setScore(result.score);
      setQuestionResults(result.questionResults);
      setFeedback(result.feedback);
      setShowResults(true);
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
          <h1 className="text-3xl font-bold mb-8 text-center text-blue-400">
            Personalized Assessment
          </h1>

          {/* Subject Selection */}
          <div className="mb-8 flex justify-center gap-4">
            {["physics", "chemistry", "maths"].map((subject) => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  selectedSubject === subject
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {subject.charAt(0).toUpperCase() + subject.slice(1)}
              </button>
            ))}
          </div>

          {/* Recent Queries Summary */}
          <div className="mb-8 bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">
              Recent Learning Topics
            </h2>
            <div className="space-y-2">
              {recentQueries.length > 0 ? (
                recentQueries.map((query, index) => (
                  <div key={index} className="bg-gray-700 p-3 rounded">
                    {query.query}
                  </div>
                ))
              ) : (
                <p className="text-gray-400">
                  No recent queries found for {selectedSubject}
                </p>
              )}
            </div>
          </div>

          {/* Generate Quiz Button */}
          <div className="text-center mb-8">
            <button
              onClick={generatePersonalizedQuiz}
              disabled={loading || recentQueries.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Personalized Quiz"}
            </button>
          </div>

          {/* Quiz Display */}
          {quiz && Array.isArray(quiz.questions) && quiz.questions.length > 0 ? (
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold mb-6 text-blue-400">
                Your Personalized{" "}
                {selectedSubject.charAt(0).toUpperCase() +
                  selectedSubject.slice(1)}{" "}
                Quiz
              </h2>

              {quiz.questions.map((question, index) => (
                <div
                  key={question.id}
                  className="mb-8 p-4 bg-gray-700 rounded-lg"
                >
                  <p className="text-lg mb-4">
                    <span className="font-bold text-blue-400">
                      Q{index + 1}:
                    </span>{" "}
                    {renderWithLatex(question.text)}
                  </p>

                  <div className="space-y-3">
                    // When displaying options, include the option letter
                    {question.options.map((option, optIndex) => {
                      const optionLetter = String.fromCharCode(65 + optIndex); // A, B, C, D
                      return (
                        <label
                          key={optIndex}
                          className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                            userAnswers[question.id] === optionLetter
                              ? "bg-blue-600"
                              : "bg-gray-600 hover:bg-gray-500"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={optionLetter} // Store the letter (A, B, C, D) instead of the text
                            checked={userAnswers[question.id] === optionLetter}
                            onChange={() =>
                              handleAnswerSelect(question.id, optionLetter)
                            }
                            className="mr-3"
                          />
                          <span className="font-bold mr-2">{optionLetter}.</span> {renderWithLatex(option)}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : quiz && (
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl text-center">
              <p className="text-lg text-yellow-400">
                No questions were generated for this quiz, or there was an issue fetching them.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Please try generating the quiz again or check if there are enough recent specific queries for the selected subject.
              </p>
            </div>
          )}

          {/* Submit Button and Results */}
          {quiz && Array.isArray(quiz.questions) && quiz.questions.length > 0 && (
            <div className="text-center mt-8">
              <button
                onClick={submitQuiz}
                disabled={(
                  loading ||
                  Object.keys(userAnswers).length !== quiz.questions.length
                )}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-all disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Quiz"}
              </button>
            </div>
          )}

          {/* Results Section */}
          {showResults && (
            <div className="bg-gray-900 rounded-xl p-6 shadow-xl mt-8">
              <h2 className="text-2xl font-bold mb-4 text-green-400 text-center">Quiz Results</h2>
              <p className="text-lg mb-2 text-center">Score: <span className="font-bold">{score}%</span></p>
              
              <div className="mb-4 space-y-6">
                {questionResults.map((result, idx) => (
                  <div key={idx} className="p-4 bg-gray-800 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">
                      <span className={result.correct ? "text-green-400" : "text-red-400"}>
                        Q{idx + 1}: {result.correct ? "Correct" : "Incorrect"}
                      </span>
                    </h3>
                    <p className="mb-3">{renderWithLatex(result.questionText)}</p>
                    
                    <div className="grid grid-cols-1 gap-2 mb-4">
                      {result.options.map((optionText, optIdx) => {
                        const optionLetter = String.fromCharCode(65 + optIdx); // A, B, C, D

                        const isThisOptionCorrect = optionLetter === result.correctAnswer;
                        const didUserPickThisOption = optionLetter === result.userAnswer;

                        let optionStyleClass = 'bg-gray-700'; // Default style for neutral options

                        if (isThisOptionCorrect) {
                          optionStyleClass = 'bg-green-700 bg-opacity-30 border border-green-500';
                        } else if (didUserPickThisOption && !isThisOptionCorrect) {
                          optionStyleClass = 'bg-red-700 bg-opacity-30 border border-red-500';
                        }

                        return (
                          <div 
                            key={optIdx} 
                            className={`p-2 rounded ${optionStyleClass}`}
                          >
                            {renderWithLatex(optionText)}
                            {isThisOptionCorrect && 
                              <span className="ml-2 text-green-400 text-sm">(Correct Answer)</span>}
                            {didUserPickThisOption && (
                              isThisOptionCorrect ?
                                <span className="ml-2 text-green-400 text-sm">(Your Answer)</span> :
                                <span className="ml-2 text-red-400 text-sm">(Your Answer)</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-900 bg-opacity-30 border border-blue-700 rounded">
                      <h4 className="font-semibold text-blue-400 mb-1">Explanation:</h4>
                      <div className="text-gray-300">{renderWithLatex(result.explanation)}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {feedback && (
                <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                  <h3 className="font-bold text-blue-400 mb-2">Overall Feedback:</h3>
                  <p className="text-gray-300">{renderWithLatex(feedback)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PersonalizedAssessment;