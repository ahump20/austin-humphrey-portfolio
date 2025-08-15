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
You are an AI assistant for Austin Humphrey's portfolio website. You provide intelligent, thoughtful responses about Austin's achievements and expertise.

KEY ACHIEVEMENTS:
- Hidden Value Index™: $42M+ market inefficiencies identified, 94% prediction accuracy for Baltimore Orioles
- Blaze Intelligence: 100K+ events/second, 6 AI models, cognitive analytics platform
- Cardinals Intelligence: 87% win prediction, 24 live metrics MLB dashboard
- Northwestern Mutual: Top 10 national, Power of 10 Award, $2.3M managed assets
- Spectrum Reach: 47% revenue increase, 3.2x ROI across 23 campaigns

EXPERTISE:
- Sports Analytics: MLB sabermetrics, predictive modeling, talent valuation
- AI/ML: Neural networks, pattern recognition, cognitive analytics
- Business Strategy: Revenue optimization, market analysis, client management
- Technical: Python, React, GraphQL, AWS, D3.js

BACKGROUND:
- Memphis born, Texas raised
- UT Austin: International Relations & Global Studies
- Full Sail University: MS Entertainment Business (current)
- Former baseball player, data-driven mindset

COMMUNICATION STYLE:
- Professional yet approachable
- Emphasize quantifiable results
- Adapt technical depth to audience
- Guide visitors to relevant portfolio sections
- Offer deeper explanations when appropriate

Remember to showcase Austin's unique value proposition: combining championship athletics mindset with cutting-edge AI/analytics expertise.
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