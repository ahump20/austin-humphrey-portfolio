// Vercel Edge Function for ChatGPT-5 Integration
// Deploy this to /api/chatgpt-assistant

import OpenAI from 'openai';

export const config = {
  runtime: 'edge',
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Portfolio context for ChatGPT
const PORTFOLIO_CONTEXT = `
You are an AI assistant for Austin Humphrey's portfolio website, helping visitors explore his achievements and expertise.

AUSTIN'S KEY ACHIEVEMENTS:
1. Hidden Value Index™ (HVI)
   - Identified $42M+ in MLB market inefficiencies
   - 94% prediction accuracy for Baltimore Orioles
   - Patent-pending talent valuation framework
   - Revolutionary sabermetrics + ML approach

2. Blaze Intelligence Platform
   - Processes 100K+ events/second
   - 6 advanced AI models
   - Cognitive analytics for MLB front offices
   - Quantifies decision-making speed

3. Cardinals Intelligence Dashboard
   - 87% win prediction accuracy
   - 24 real-time metrics
   - Live MLB analytics
   - Strategic decision support

4. Northwestern Mutual Success
   - Top 10 performance nationally
   - Power of 10 Award winner
   - Managed $2.3M in client assets
   - 156% goal achievement

5. Spectrum Reach Results
   - 47% revenue increase
   - 3.2x ROI improvement
   - 23 successful campaigns
   - Sports media optimization

TECHNICAL EXPERTISE:
- Programming: Python, JavaScript, TypeScript, SQL
- AI/ML: TensorFlow, PyTorch, Neural Networks, Pattern Recognition
- Web: React, Next.js, GraphQL, D3.js
- Cloud: AWS, Vercel, Netlify
- Analytics: Sabermetrics, Predictive Modeling, Statistical Analysis

BACKGROUND & EDUCATION:
- Born: Memphis, TN | Raised: Boerne, TX
- UT Austin: BA International Relations & Global Studies
- Full Sail University: MS Entertainment Business (in progress)
- Former varsity baseball player
- Founder of Blaze Intelligence

YOUR ROLE:
- Provide intelligent, contextual responses about Austin's work
- Highlight quantifiable achievements
- Guide visitors to relevant projects
- Adapt technical depth to audience needs
- Emphasize the unique combination of sports + AI expertise
- Be professional but personable

Austin's unique value: Championship athletics mindset + cutting-edge AI/analytics expertise
`;

// Thinking mode configurations for ChatGPT
const THINKING_CONFIGS = {
  fast: {
    model: 'gpt-4-turbo-preview',
    max_tokens: 300,
    temperature: 0.7,
    reasoning_effort: 'low',
    system_suffix: "Provide a quick, direct answer."
  },
  mini: {
    model: 'gpt-4-turbo-preview',
    max_tokens: 500,
    temperature: 0.7,
    reasoning_effort: 'medium',
    system_suffix: "Think briefly, then provide a clear response."
  },
  auto: {
    model: 'gpt-4-turbo-preview',
    max_tokens: 800,
    temperature: 0.8,
    reasoning_effort: 'auto',
    system_suffix: "Automatically determine the appropriate response depth."
  },
  thinking: {
    model: 'o1-preview',
    max_tokens: 1200,
    temperature: 0.8,
    reasoning_effort: 'high',
    system_suffix: "Think step-by-step through this query and provide a thorough response."
  },
  pro: {
    model: 'o1-preview',
    max_tokens: 2000,
    temperature: 0.9,
    reasoning_effort: 'maximum',
    system_suffix: "Conduct deep analysis with research-grade insights and strategic recommendations."
  }
};

export default async function handler(req) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { message, thinkingMode = 'auto', conversationHistory = [] } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get thinking configuration
    const config = THINKING_CONFIGS[thinkingMode] || THINKING_CONFIGS.auto;

    // Build messages array
    const messages = [
      {
        role: 'system',
        content: `${PORTFOLIO_CONTEXT}\n\n${config.system_suffix}`
      },
      ...conversationHistory.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // For thinking and pro modes, add reasoning tokens
    const streamOptions = {};
    if (thinkingMode === 'thinking' || thinkingMode === 'pro') {
      streamOptions.include_reasoning = true;
      
      // Add chain-of-thought instruction
      messages[0].content += "\n\nApproach: First reason through the query systematically, then formulate your response.";
    }

    // Call OpenAI API with streaming
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: messages,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      stream: true,
      ...streamOptions
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            
            // Handle reasoning tokens for o1 models
            if (chunk.choices[0]?.delta?.reasoning_content) {
              // Send reasoning as metadata
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                reasoning: chunk.choices[0].delta.reasoning_content 
              })}\n\n`));
            }
            
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process request',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}