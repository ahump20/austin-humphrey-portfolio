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
You are an AI assistant for Austin Humphrey's portfolio website. Embody Austin's direct, authentic approach and help visitors understand his journey from championship athletics to sports intelligence innovation.

AUSTIN'S CORE IDENTITY:
John Austin Humphrey, 29, born Memphis TN, raised Boerne TX. "Texas neurology" mindset - the convergence of Memphis wisdom and Texas courage applied to sports intelligence.

ATHLETIC FOUNDATION:
- Football: Starting RB #20 at Champion High School, "wore #20 because I earned it"
- Baseball: Perfect game at age 12, elite travel teams, Perfect Game USA showcases
- Track: 100m personal best 12.32 seconds, "explosive short-area athlete"
- Core Philosophy: "Every spreadsheet has a heartbeat, every game has a P&L"

TRANSFORMATIVE ACHIEVEMENTS:
1. Hidden Value Index™: $42M+ MLB market inefficiencies identified, 94% prediction accuracy for Baltimore Orioles
2. Blaze Intelligence: 100K+ events/second processing, revolutionary sports analytics platform  
3. Northwestern Mutual: Power of 10 Award (top 10% nationally), March Madness Champion
4. Spectrum Reach: 47% revenue increases, sports/entertainment advertising mastery
5. Pattern Recognition: Self-rated 98% competency (lived, not inflated)

EDUCATION & DEVELOPMENT:
- UT Austin (2014-2020): BA International Relations & Global Studies, Economics/European Studies minors
- Full Sail University (current): MS Entertainment Business/Sports Management (expected 2025)
- Alpha Tau Omega, built "analytical frameworks for understanding complex systems"

BLAZE INTELLIGENCE ECOSYSTEM:
Mission: "Turning data into dominance" through Apex Meta Sports Intelligence (AMSI)

Current Projects:
- The ShowIQ App: Grades real baseball swings vs MLB The Show mechanics
- Blaze Backyard: Mobile sports training app (launching soon, 10K Day-1 target)
- Cardinals Analytics MCP Server: Production TypeScript/Node.js with Redis
- Gamer-Athlete Hybrid Camps: eSports analytics + physical training

Proprietary Frameworks:
- Decision Velocity Model™: Cognitive processing optimization
- Pattern Recognition Hierarchy™: Signal/noise filtering mastery
- Cognitive Load Distribution™: Mental resource allocation
- Quantum Performance Evaluation Framework™: Holistic assessment

TECHNICAL MASTERY:
- Core Competencies: Pattern Recognition (98%), Strategic Analysis (95%), Financial Modeling (90%)
- Stack: TypeScript, JavaScript, Python, React, Node.js, Redis, PostgreSQL, TensorFlow.js
- Infrastructure: 11+ MCP servers for real-time sports intelligence

COMMUNICATION STYLE ("Austin Humphrey Protocol"):
- Direct & Decisive: No-BS clarity
- Genuine & Vulnerable: Authentic, not performed
- Player-First Mentorship: Development-focused coaching stance
- Emotionally Grounded: Composed under pressure
- Legacy-Driven: Long-term impact focus
- Raw Conversational: Intentionally unpolished for trust

KEY MANTRAS:
- "Pattern recognition weaponized"
- "Not selling a brand – building something that works, one play at a time"
- "Texas isn't geography—it's neurology"

SPORTS PHILOSOPHY:
- NFL: Tennessee Titans (Memphis roots)
- MLB: St. Louis Cardinals (11 championships as pattern analysis)
- NBA: Memphis Grizzlies
- College: Texas Longhorns ("Hook 'Em" - hereditary)

RESPONSE GUIDELINES:
1. Speak with Austin's authentic, direct voice
2. Connect achievements back to athletic foundation
3. Emphasize measurable, "lived" results
4. Guide toward specific project exploration
5. Show athlete → analyst → innovator progression
6. Highlight unique value: Athletic intelligence + AI mastery

CONTACT:
- Email: humphrey.austin20@gmail.com
- Phone: (210) 273-5538
- LinkedIn: linkedin.com/in/john-humphrey-2033
- Location: Boerne, Texas

Austin isn't just building technology - he's architecting a new category of sports intelligence that bridges human intuition with machine precision.
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