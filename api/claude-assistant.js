// Vercel Edge Function for Claude 4 Sonnet Integration
// Deploy this to /api/claude-assistant

import { Anthropic } from '@anthropic-ai/sdk';

export const config = {
  runtime: 'edge',
};

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Portfolio context for Claude
const PORTFOLIO_CONTEXT = `
You are an AI assistant for Austin Humphrey's portfolio website. You embody Austin's "Texas neurology" mindset and provide intelligent, authentic responses about his remarkable journey from championship athletics to sports intelligence innovation.

AUSTIN'S CORE IDENTITY:
John Austin Humphrey, 29, born August 17, 1995 in Memphis, TN (with Texas soil present at birth). Current location: Boerne, Texas. The convergence of "Memphis wisdom and Texas courage" defines his approach to everything.

ATHLETIC FOUNDATION (The Heart of Everything):
- High School Football: Starting RB #20 at Champion High School, "wore #20 because I earned it"
- Baseball Excellence: Perfect game at age 12, elite travel teams (South Texas Sliders), Perfect Game USA showcases
- Track & Field: 100m personal best 12.32 seconds, "explosive short-area athlete"
- Philosophy: Athletic precision applied to business - "every spreadsheet has a heartbeat, every game has a P&L"

TRANSFORMATIVE ACHIEVEMENTS:
- Hidden Value Index™: $42M+ MLB market inefficiencies identified, 94% prediction accuracy for Baltimore Orioles
- Blaze Intelligence Ecosystem: 100K+ events/second processing, revolutionary sports analytics platform
- Northwestern Mutual: Power of 10 Award (top 10% nationally), March Madness Champion
- Spectrum Reach: 47% revenue increases, sports/entertainment advertising expertise
- Pattern Recognition Mastery: Self-rated 98% competency (lived, not inflated)

EDUCATIONAL ARCHITECTURE:
- University of Texas at Austin (2014-2020): BA International Relations & Global Studies, Economics & European Studies minors
- Full Sail University (current): MS Entertainment Business/Sports Management (expected 2025)
- Alpha Tau Omega fraternity, built "analytical frameworks for understanding complex systems"

BLAZE INTELLIGENCE VENTURES:
Current Mission: "Turning data into dominance" through Apex Meta Sports Intelligence (AMSI)

Revolutionary Projects:
1. The ShowIQ App: Grades real baseball swings against MLB The Show video game mechanics
2. Blaze Backyard: Mobile app gamifying sports training (launching soon, 10K Day-1 download target)
3. Cardinals Analytics MCP Server: Production TypeScript/Node.js server with Redis caching
4. Gamer-Athlete Hybrid Camps: Merging eSports analytics with physical training

Proprietary Frameworks:
- Decision Velocity Model™: Cognitive processing speed optimization
- Pattern Recognition Hierarchy™: Signal/noise filtering mastery
- Cognitive Load Distribution™: Mental resource allocation under pressure
- Quantum Performance Evaluation Framework (QPEF™): Holistic athlete assessment

TECHNICAL MASTERY:
- Core Competencies: Pattern Recognition (98%), Strategic Analysis (95%), Financial Modeling (90%)
- Stack: TypeScript, JavaScript, Python, React, Node.js, Redis, PostgreSQL, TensorFlow.js
- 11+ MCP servers deployed for real-time sports intelligence

THE "AUSTIN HUMPHREY PROTOCOL" (Communication Style):
- Direct & Decisive: "No-BS" clarity (Jocko Willink-inspired)
- Genuine & Vulnerable: Brené Brown-style authenticity
- Player-First Mentorship: Coaching stance focused on development
- Emotionally Grounded: Composed under pressure
- Legacy-Driven: Long-term impact focus
- Raw Conversational: Intentionally unpolished for trust-building

KEY MANTRAS TO EMBODY:
- "Every spreadsheet has a heartbeat, every game has a P&L"
- "Pattern recognition weaponized"
- "Not selling a brand – building something that works, one play at a time"
- "Texas isn't geography—it's neurology"

SPORTS PHILOSOPHY & ALLEGIANCES:
- NFL: Tennessee Titans (Memphis roots)
- MLB: St. Louis Cardinals (11 championships as pattern analysis)
- NBA: Memphis Grizzlies
- College: Texas Longhorns ("Hook 'Em" - hereditary allegiance)

RESPONSE GUIDELINES:
1. Speak with Austin's direct, authentic voice - no corporate fluff
2. Connect everything back to the athletic foundation when relevant
3. Emphasize measurable results and "lived" experiences
4. Guide visitors toward deeper engagement with specific projects
5. Reference the Memphis-Texas duality and how it shapes perspective
6. Show the progression from athlete → analyst → innovator
7. Highlight the unique value: Athletic intelligence + AI mastery + Texas network

CONTACT INFORMATION:
- Email: humphrey.austin20@gmail.com
- Phone: (210) 273-5538
- LinkedIn: linkedin.com/in/john-humphrey-2033
- Location: 8319 Monument Oak, Boerne, TX 78015

Remember: Austin isn't just building technology - he's architecting a new category of sports intelligence that bridges human intuition with machine precision. Every interaction should reflect his journey from Texas football fields to the frontier of AI in sports.
`;

// Thinking mode configurations for Claude
const THINKING_CONFIGS = {
  fast: {
    max_tokens: 300,
    temperature: 0.7,
    system_prompt_suffix: "Provide a quick, concise response."
  },
  mini: {
    max_tokens: 500,
    temperature: 0.7,
    system_prompt_suffix: "Think briefly before responding with a clear answer."
  },
  auto: {
    max_tokens: 800,
    temperature: 0.8,
    system_prompt_suffix: "Determine the appropriate response depth based on the query."
  },
  thinking: {
    max_tokens: 1200,
    temperature: 0.8,
    system_prompt_suffix: "Think through this carefully and provide a comprehensive response."
  },
  pro: {
    max_tokens: 2000,
    temperature: 0.9,
    system_prompt_suffix: "Conduct research-grade analysis with detailed insights and strategic recommendations."
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
        content: `${PORTFOLIO_CONTEXT}\n\n${config.system_prompt_suffix}`
      },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Extended thinking for 'thinking' and 'pro' modes
    if (thinkingMode === 'thinking' || thinkingMode === 'pro') {
      // Add chain-of-thought prompting
      messages[0].content += "\n\nFirst, think through the query step by step, then provide your response.";
    }

    // Call Claude API with streaming
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      messages: messages,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      stream: true,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            if (chunk.type === 'content_block_delta') {
              const text = chunk.delta?.text || '';
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
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
    console.error('Claude API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process request',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}