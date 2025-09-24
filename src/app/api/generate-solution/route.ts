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

    // Enhanced prompt for better accuracy and structured output
    const prompt = `
      You are an expert educator and problem solver specializing in academic questions. Your task is to:
      1. Carefully analyze the given question and all options
      2. Determine the correct answer(s) based on fundamental principles
      3. Generate a detailed, step-by-step solution
      4. Use the provided topic notes as reference material when applicable
      
      CRITICAL REQUIREMENTS:
      - Answer must be EXACTLY correct - double-check your reasoning
      - Solution must be clear, logical, and educational
      - Use topic notes concepts when relevant to enhance understanding
      - Format answer as KaTeX-compatible text for option IDs only
      - Provide step-by-step reasoning in the solution

      **Question:**
      ${question.question_text}

      **Options:**
      ${optionsFormatted}

      **Topic Notes (use these concepts in the solution if applicable):**
      ${topicNotes}

      **Instructions:**
      1. Read the question carefully and understand what is being asked
      2. Analyze each option systematically
      3. Apply relevant concepts from the topic notes if applicable
      4. Determine the correct answer(s) with certainty
      5. Provide a clear, step-by-step solution

      **Output Format:**
      Respond with a valid JSON object containing exactly these two keys:
      - "answer": The correct option ID(s) in KaTeX format (e.g., "\\\\text{A}" for single option or "\\\\text{A, C}" for multiple)
      - "solution": A detailed step-by-step explanation with clear reasoning
      
      Example responses:
      Single correct option: {"answer": "\\\\text{A}", "solution": "Step 1: Analyze the question...\\nStep 2: Apply the concept...\\nStep 3: Therefore, option A is correct because..."}
      Multiple correct options: {"answer": "\\\\text{A, C}", "solution": "Step 1: Examine each option...\\nStep 2: Options A and C are both correct because..."}
      
      Ensure your JSON is properly formatted and the solution is comprehensive yet concise.
    `;

    console.log('Generating solution for question:', questionId);
    console.log('Topic notes available:', topicNotes !== 'No specific notes provided for this topic.');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log('Raw Gemini response:', text);
    // Attempt to parse the JSON response from Gemini
    let generatedData: { answer: string; solution: string };
    try {
      // Clean up the response - remove markdown code blocks and extra whitespace
      let jsonString = text.trim();
      
      // Remove markdown code block formatting if present
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      jsonString = jsonString.trim();
      
      generatedData = JSON.parse(jsonString);
      
      // Validate the response structure
      if (!generatedData.answer || !generatedData.solution) {
        throw new Error('Invalid response structure: missing answer or solution');
      }
      
      console.log('Parsed response successfully:', generatedData);
      
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError, 'Raw text:', text);
      return NextResponse.json({ 
        error: 'Failed to parse AI response. Please try again.', 
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
        raw: text 
      }, { status: 500 });
    }

    // Additional validation for answer format
    if (!generatedData.answer.includes('\\text{') || !generatedData.answer.includes('}')) {
      console.warn('Answer format may be incorrect:', generatedData.answer);
    }
    // Update the question in Supabase
    const { data: updatedQuestion, error: updateError } = await supabase
      .from('questions_topic_wise')
      .update({
        answer: generatedData.answer,
        solution: generatedData.solution,
        updated_at: new Date().toISOString(), // Track when solution was generated
      })
      .eq('id', questionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating question with solution:', updateError);
      return NextResponse.json({ error: 'Failed to save solution to database' }, { status: 500 });
    }

    console.log('Solution saved successfully for question:', questionId);
    return NextResponse.json({
      message: 'Solution generated and saved successfully!',
      question: updatedQuestion,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Unhandled error in generate-solution API:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
