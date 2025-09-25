import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { model } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { questionId } = await request.json();

    if (!questionId) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    // Fetch the question with all related data
    const { data: questionData, error: questionError } = await supabase
      .from('questions_topic_wise')
      .select(`
        *,
        topics(notes),
        parts(name),
        slots(name)
      `)
      .eq('id', questionId)
      .single();

    if (questionError || !questionData) {
      console.error('Error fetching question:', questionError);
      return NextResponse.json({ error: 'Question not found or database error' }, { status: 404 });
    }

    const question = questionData;
    const topicNotes = (question.topics as { notes: string | null })?.notes || 'No specific notes provided for this topic.';
    const partName = (question.parts as { name: string })?.name || 'Unknown Part';
    const slotName = (question.slots as { name: string })?.name || 'Unknown Slot';

    // Fetch similar questions from the same part for context
    const { data: similarQuestions, error: similarError } = await supabase
      .from('questions_topic_wise')
      .select('question_text, answer, solution')
      .eq('part_id', question.part_id)
      .eq('topic_id', question.topic_id)
      .not('id', 'eq', questionId)
      .not('answer', 'is', null)
      .not('solution', 'is', null)
      .limit(3);

    const optionsFormatted = (question.options as Array<{ id: string; text: string }>).map(
      (opt) => `${opt.id}: ${opt.text}`
    ).join('\n');

    let similarQuestionsContext = '';
    if (similarQuestions && similarQuestions.length > 0) {
      similarQuestionsContext = `\n\n**Similar Questions from ${partName} for Reference:**\n` +
        similarQuestions.map((sq, idx) => 
          `Example ${idx + 1}:\nQuestion: ${sq.question_text}\nAnswer: ${sq.answer}\nSolution: ${sq.solution}\n`
        ).join('\n');
    }

    // Enhanced prompt for better accuracy
    const prompt = `
You are an expert educator specializing in academic question solving. Your task is to provide the CORRECT answer and a detailed, step-by-step solution.

**CRITICAL REQUIREMENTS:**
1. The answer MUST be absolutely correct - double and triple check your reasoning
2. Use the topic notes as your primary reference for concepts and methods
3. Consider the part type (${partName}) and slot (${slotName}) context
4. Format the answer as KaTeX-compatible text showing only the correct option ID(s)
5. Provide a clear, educational solution with step-by-step reasoning

**Question Details:**
- Part: ${partName}
- Slot: ${slotName}
- Topic Notes: ${topicNotes}

**Question:**
${question.question_text}

**Options:**
${optionsFormatted}

${similarQuestionsContext}

**Analysis Instructions:**
1. Carefully read and understand what the question is asking
2. Apply the concepts from the topic notes if relevant
3. Consider the context of similar questions from the same part
4. Analyze each option systematically
5. Determine the correct answer with absolute certainty
6. Provide a detailed explanation of your reasoning

**Output Format:**
Respond with a valid JSON object containing exactly these two keys:
- "answer": The correct option ID(s) in KaTeX format (e.g., "\\\\text{A}" for single option or "\\\\text{A, C}" for multiple)
- "solution": A detailed step-by-step explanation with clear reasoning

**Examples:**
Single correct option: {"answer": "\\\\text{A}", "solution": "Step 1: Analyze the question...\\nStep 2: Apply the relevant concept...\\nStep 3: Therefore, option A is correct because..."}
Multiple correct options: {"answer": "\\\\text{A, C}", "solution": "Step 1: Examine each option...\\nStep 2: Options A and C are both correct because..."}

**IMPORTANT:** 
- Be absolutely certain of your answer
- Use topic notes concepts when applicable
- Consider the part/slot context for question type patterns
- Provide educational value in your solution
- Ensure JSON is properly formatted
`;

    console.log('Generating solution for question:', questionId);
    console.log('Part:', partName, 'Slot:', slotName);
    console.log('Topic notes available:', topicNotes !== 'No specific notes provided for this topic.');
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log('Raw Gemini response:', text);

    // Parse the JSON response
    let generatedData: { answer: string; solution: string };
    try {
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

    // Validate answer format
    if (!generatedData.answer.includes('\\text{') || !generatedData.answer.includes('}')) {
      console.warn('Answer format may be incorrect:', generatedData.answer);
    }

    // Update the question in Supabase
    const { data: updatedQuestion, error: updateError } = await supabase
      .from('questions_topic_wise')
      .update({
        answer: generatedData.answer,
        solution: generatedData.solution,
        updated_at: new Date().toISOString(),
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