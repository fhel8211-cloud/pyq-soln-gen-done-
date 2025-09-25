'use client';

import { useEffect, useState } from 'react';
import { clientSupabase } from '@/lib/supabase';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  topic_id: string;
  part_id: string;
  slot_id: string;
  question_text: string;
  options: Option[];
  correct_option_ids: string[];
  answer: string | null;
  solution: string | null;
  topics: { notes: string | null } | null;
  parts: { name: string } | null;
  slots: { name: string } | null;
  updated_at?: string;
}

export default function SolutionMakerPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unsolved' | 'solved'>('unsolved');
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage] = useState(3);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await clientSupabase
        .from('questions_topic_wise')
        .select(`
          *,
          topics(notes),
          parts(name),
          slots(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setQuestions(data as Question[]);
    } catch (err: any) {
      console.error('Error fetching questions:', err.message);
      setError('Failed to load questions. Please check your network and Supabase configuration.');
    } finally {
      setLoading(false);
    }
  };

  const generateSolution = async (questionId: string) => {
    setGeneratingId(questionId);
    try {
      console.log('Starting solution generation for question:', questionId);
      
      const response = await fetch('/api/generate-solution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate solution`);
      }

      const result = await response.json();
      console.log('Generated solution:', result);

      // Update the specific question in the state
      setQuestions((prevQuestions) =>
        prevQuestions.map((q) => (q.id === questionId ? { ...q, ...result.question } : q))
      );
      
      // Show success message
      alert('Solution generated successfully! ✅');
      
    } catch (err: any) {
      console.error('Error generating solution:', err.message);
      alert(`❌ Error generating solution: ${err.message}`);
    } finally {
      setGeneratingId(null);
    }
  };

  // Filter questions based on current filter
  const filteredQuestions = questions.filter(question => {
    switch (filter) {
      case 'solved':
        return question.answer && question.solution;
      case 'unsolved':
        return !question.answer || !question.solution;
      default:
        return true;
    }
  });

  // Pagination
  const indexOfLastQuestion = currentPage * questionsPerPage;
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
  const currentQuestions = filteredQuestions.slice(indexOfFirstQuestion, indexOfLastQuestion);
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-400 p-8">
        <div className="text-center">
          <p className="text-xl font-bold mb-4">❌ Error: {error}</p>
          <button 
            onClick={fetchQuestions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-extrabold text-blue-400 mb-4">
          PyQS Solution Maker
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Generate precise answers and detailed solutions using Gemini 2.0 Flash AI
        </p>
        
        {/* Statistics */}
        <div className="mt-8 flex justify-center space-x-8 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{questions.length}</div>
            <div className="text-gray-400">Total Questions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {questions.filter(q => q.answer && q.solution).length}
            </div>
            <div className="text-gray-400">Solved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {questions.filter(q => !q.answer || !q.solution).length}
            </div>
            <div className="text-gray-400">Pending</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Filter Controls */}
        <div className="mb-8 flex justify-center space-x-4">
          <button
            onClick={() => { setFilter('all'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All Questions ({questions.length})
          </button>
          <button
            onClick={() => { setFilter('unsolved'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'unsolved' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Unsolved ({questions.filter(q => !q.answer || !q.solution).length})
          </button>
          <button
            onClick={() => { setFilter('solved'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'solved' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Solved ({questions.filter(q => q.answer && q.solution).length})
          </button>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="bg-gray-800 p-8 rounded-xl shadow-lg text-center text-gray-300">
            <p className="text-2xl mb-4">
              {questions.length === 0 ? 'No questions found.' : `No ${filter} questions found.`}
            </p>
            {questions.length === 0 && (
              <p>Please add questions to your `questions_topic_wise` table in Supabase.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-8">
            {currentQuestions.map((question, index) => (
              <div
                key={question.id}
                className={`bg-gray-800 p-6 rounded-xl shadow-lg border transition-all duration-300 ${
                  question.answer && question.solution 
                    ? 'border-green-500' 
                    : 'border-gray-600 hover:border-blue-500'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-2">
                      Question #{indexOfFirstQuestion + index + 1}
                      {question.answer && question.solution && (
                        <span className="ml-2 text-sm bg-green-600 text-white px-2 py-1 rounded-full">✓ Solved</span>
                      )}
                    </h2>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-blue-600 text-white px-2 py-1 rounded">
                        Part: {question.parts?.name || 'Unknown'}
                      </span>
                      <span className="bg-purple-600 text-white px-2 py-1 rounded">
                        Slot: {question.slots?.name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    ID: {question.id.slice(0, 8)}...
                  </div>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg mb-4">
                  <p className="text-lg text-white">{question.question_text}</p>
                </div>

                <div className="mb-4">
                  <h3 className="text-xl font-medium text-white mb-2">Options:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {question.options.map((option) => (
                      <div key={option.id} className="bg-gray-700 p-3 rounded-lg">
                        <span className="font-bold text-blue-400">{option.id}:</span> 
                        <span className="text-gray-200 ml-2">{option.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-medium text-white mb-2">Topic Notes:</h3>
                  <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
                    <p className="text-gray-300 text-sm">
                      {question.topics?.notes || 'No specific notes for this topic.'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end mb-6">
                  <button
                    onClick={() => generateSolution(question.id)}
                    disabled={generatingId === question.id}
                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingId === question.id ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5 mr-3 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      question.answer && question.solution ? 'Regenerate Solution' : 'Generate Solution'
                    )}
                  </button>
                </div>

                {question.answer && question.solution && (
                  <div className="mt-6 pt-6 border-t border-gray-600">
                    <h3 className="text-xl font-medium text-green-400 mb-3">Generated Answer:</h3>
                    <div className="bg-gray-700 p-4 rounded-lg border border-green-500 mb-4">
                      <div className="text-lg font-bold text-green-400">
                        <InlineMath math={question.answer} />
                      </div>
                    </div>

                    <h3 className="text-xl font-medium text-green-400 mb-3">Generated Solution:</h3>
                    <div className="bg-gray-700 p-4 rounded-lg border border-green-500">
                      <div className="whitespace-pre-wrap text-gray-200 leading-relaxed">
                        {question.solution}
                      </div>
                    </div>
                    
                    {question.updated_at && (
                      <div className="mt-2 text-xs text-gray-400">
                        Generated: {new Date(question.updated_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 flex justify-center space-x-2">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
              <button
                key={number}
                onClick={() => paginate(number)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === number
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {number}
              </button>
            ))}
            
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>

      <footer className="mt-16 text-center text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} PyQS Solution Maker. Powered by Gemini 2.0 Flash.</p>
      </footer>
    </div>
  );
}