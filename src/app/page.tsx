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
  question_text: string;
  options: Option[];
  correct_option_ids: string[];
  answer: string | null;
  solution: string | null;
  topics: { notes: string | null } | null; // Nested topic notes
  updated_at?: string;
}

export default function SolutionMakerPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unsolved' | 'solved'>('unsolved');
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage] = useState(5);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await clientSupabase
        .from('questions_topic_wise')
        .select('*, topics(notes)')
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
      <div className="min-h-screen flex items-center justify-center bg-background text-text">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
        <p className="ml-4 text-lg">Loading questions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-error p-8">
        <div className="text-center">
          <p className="text-xl font-bold mb-4">❌ Error: {error}</p>
          <button 
            onClick={fetchQuestions}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-accent transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text p-8 lg:p-12">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-extrabold text-primary mb-4 leading-tight tracking-tight">
          <span className="block animate-fade-in-down">PyQS Solution Maker</span>
        </h1>
        <p className="text-xl text-textSecondary max-w-3xl mx-auto animate-fade-in-up">
          Generate precise answers and detailed solutions using Gemini 2.0 Flash AI.
        </p>
        
        {/* Statistics */}
        <div className="mt-8 flex justify-center space-x-8 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{questions.length}</div>
            <div className="text-textSecondary">Total Questions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">
              {questions.filter(q => q.answer && q.solution).length}
            </div>
            <div className="text-textSecondary">Solved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">
              {questions.filter(q => !q.answer || !q.solution).length}
            </div>
            <div className="text-textSecondary">Pending</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Filter Controls */}
        <div className="mb-8 flex justify-center space-x-4">
          <button
            onClick={() => { setFilter('all'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-primary text-white' : 'bg-surface text-textSecondary hover:bg-border'
            }`}
          >
            All Questions ({questions.length})
          </button>
          <button
            onClick={() => { setFilter('unsolved'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'unsolved' ? 'bg-warning text-white' : 'bg-surface text-textSecondary hover:bg-border'
            }`}
          >
            Unsolved ({questions.filter(q => !q.answer || !q.solution).length})
          </button>
          <button
            onClick={() => { setFilter('solved'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'solved' ? 'bg-success text-white' : 'bg-surface text-textSecondary hover:bg-border'
            }`}
          >
            Solved ({questions.filter(q => q.answer && q.solution).length})
          </button>
        </div>
        {filteredQuestions.length === 0 ? (
          <div className="bg-surface p-8 rounded-xl shadow-lg text-center text-textSecondary">
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
                className={`bg-surface p-6 rounded-xl shadow-lg border transition-all duration-300 ease-in-out transform hover:-translate-y-1 ${
                  question.answer && question.solution 
                    ? 'border-success hover:border-success' 
                    : 'border-border hover:border-primary'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-semibold text-text">
                    Question #{indexOfFirstQuestion + index + 1}
                    {question.answer && question.solution && (
                      <span className="ml-2 text-sm bg-success text-white px-2 py-1 rounded-full">✓ Solved</span>
                    )}
                  </h2>
                  <div className="text-xs text-textSecondary">
                    ID: {question.id.slice(0, 8)}...
                  </div>
                </div>
                
                <p className="text-lg text-textSecondary mb-4">{question.question_text}</p>

                <div className="mb-4">
                  <h3 className="text-xl font-medium text-text mb-2">Options:</h3>
                  <ul className="list-disc list-inside text-textSecondary space-y-1">
                    {question.options.map((option) => (
                      <li key={option.id}>
                        <span className="font-bold text-primary">{option.id}:</span> {option.text}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-medium text-text mb-2">Topic Notes:</h3>
                  <p className="text-textSecondary italic text-sm bg-background p-3 rounded-md border border-border">
                    {question.topics?.notes || 'No specific notes for this topic.'}
                  </p>
                </div>

                <div className="flex justify-end mb-6">
                  <button
                    onClick={() => generateSolution(question.id)}
                    disabled={generatingId === question.id}
                    className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-accent transition-colors duration-300 ease-in-out flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="mt-6 pt-6 border-t border-border">
                    <h3 className="text-xl font-medium text-success mb-3">Generated Answer:</h3>
                    <div className="bg-background p-4 rounded-md border border-border mb-4">
                      <div className="text-lg font-bold text-success">
                        <InlineMath math={question.answer} />
                      </div>
                    </div>

                    <h3 className="text-xl font-medium text-success mb-3">Generated Solution:</h3>
                    <div className="bg-background p-4 rounded-md border border-border prose prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-textSecondary leading-relaxed">
                        {question.solution}
                      </div>
                    </div>
                    
                    {question.updated_at && (
                      <div className="mt-2 text-xs text-textSecondary">
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
              className="px-4 py-2 bg-surface text-textSecondary rounded-lg hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
              <button
                key={number}
                onClick={() => paginate(number)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === number
                    ? 'bg-primary text-white'
                    : 'bg-surface text-textSecondary hover:bg-border'
                }`}
              >
                {number}
              </button>
            ))}
            
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-surface text-textSecondary rounded-lg hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>

      <footer className="mt-16 text-center text-textSecondary text-sm">
        <p>&copy; {new Date().getFullYear()} PyQS Solution Maker. Powered by Gemini 2.0 Flash.</p>
      </footer>
    </div>
  );
}
