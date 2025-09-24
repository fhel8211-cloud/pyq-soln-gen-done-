import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { model } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { questionId } = await request.json();

    if (!questionId) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    // Fetch the question and its associated topic notes
    const { data: questionData, error: questionError } = await supabase
      .from('questions_topic_wise')
      .select('*, topics(notes)')
      .eq('id', questionId)
      .single();

    if (questionError || !questionData) {
      console.error('Error fetching question:', questionError);
      return NextResponse.json({ error: 'Question not found or database error' }, { status: 404 });
    }

    const question = questionData;
    const topicNotes = (question.topics as { notes: string | null })?.notes || 'No specific notes provided for this topic.';

    const optionsFormatted = (question.options as Array<{ id: string; text: string }>).map(
      (opt) => `${opt.id}: ${opt.text}`
    ).join('\n');

    const prompt = `
      You are an expert educator and problem solver. Your task is to generate the correct answer(s) and a detailed, point-by-point solution for the given question.
      The answer must be in KaTeX format, representing the correct option ID(s). If there are multiple correct options, list them comma-separated.
      The solution should be clear, concise, and leverage the provided topic notes where relevant.

      **Question:**
      ${question.question_text}

      **Options:**
      ${optionsFormatted}

      **Topic Notes (use these concepts in the solution if applicable):**
      ${topicNotes}

      **Output Format:**
      Provide your response as a JSON object with two keys: \`answer\` (string, KaTeX format for correct option IDs) and \`solution\` (string, detailed explanation).
      Example for single correct option 'A': \`{"answer": "\\\\text{A}", "solution": "..."}\`
      Example for multiple correct options 'A' and 'C': \`{"answer": "\\\\text{A, C}", "solution": "..."}\`
      Ensure the solution is well-structured with bullet points or numbered lists for clarity.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Attempt to parse the JSON response from Gemini
    let generatedData: { answer: string; solution: string };
    try {
      // Gemini might wrap JSON in markdown code block, so extract it
      const jsonString = text.replace(/```json\n|\n```/g, '').trim();
      generatedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError, 'Raw text:', text);
      return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 });
    }

    // Update the question in Supabase
    const { data: updatedQuestion, error: updateError } = await supabase
      .from('questions_topic_wise')
      .update({
        answer: generatedData.answer,
        solution: generatedData.solution,
      })
      .eq('id', questionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating question with solution:', updateError);
      return NextResponse.json({ error: 'Failed to save solution to database' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Solution generated and saved successfully!',
      question: updatedQuestion,
    });
  } catch (error) {
    console.error('Unhandled error in generate-solution API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
