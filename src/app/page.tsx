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
}

export default function SolutionMakerPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await clientSupabase
        .from('questions_topic_wise')
        .select('*, topics(notes)') // Select question data and nested topic notes
        .order('created_at', { ascending: false }); // Assuming a created_at column for ordering

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
      const response = await fetch('/api/generate-solution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate solution');
      }

      const result = await response.json();
      console.log('Generated solution:', result);

      // Update the specific question in the state
      setQuestions((prevQuestions) =>
        prevQuestions.map((q) => (q.id === questionId ? { ...q, ...result.question } : q))
      );
    } catch (err: any) {
      console.error('Error generating solution:', err.message);
      alert(`Error generating solution: ${err.message}`);
    } finally {
      setGeneratingId(null);
    }
  };

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
        <p className="text-xl font-bold">Error: {error}</p>
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
          Effortlessly generate precise answers and detailed solutions for your questions using AI.
        </p>
      </header>

      <main className="max-w-6xl mx-auto">
        {questions.length === 0 ? (
          <div className="bg-surface p-8 rounded-xl shadow-lg text-center text-textSecondary">
            <p className="text-2xl mb-4">No questions found.</p>
            <p>Please add questions to your `questions_topic_wise` table in Supabase.</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {questions.map((question) => (
              <div
                key={question.id}
                className="bg-surface p-6 rounded-xl shadow-lg border border-border hover:border-primary transition-all duration-300 ease-in-out transform hover:-translate-y-1"
              >
                <h2 className="text-2xl font-semibold text-text mb-4">Question:</h2>
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
                      'Generate Solution'
                    )}
                  </button>
                </div>

                {question.answer && question.solution && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h3 className="text-xl font-medium text-success mb-3">Generated Answer:</h3>
                    <div className="bg-background p-4 rounded-md border border-border mb-4">
                      <InlineMath math={question.answer} />
                    </div>

                    <h3 className="text-xl font-medium text-success mb-3">Generated Solution:</h3>
                    <div className="bg-background p-4 rounded-md border border-border prose prose-invert max-w-none">
                      <BlockMath math={question.solution} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-16 text-center text-textSecondary text-sm">
        <p>&copy; {new Date().getFullYear()} PyQS Solution Maker. Powered by Bolt & Gemini.</p>
      </footer>
    </div>
  );
}
