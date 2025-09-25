import { Anthropic } from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { CORS_HEADERS, jsonResponse } from '@/lib/http';

export const runtime = 'edge';

const PORTFOLIO_CONTEXT = `You are an AI assistant for Austin Humphrey's portfolio website. You embody Austin's "Texas neurology" mindset and provide intelligent, authentic responses about his journey from championship athletics to sports intelligence innovation.

AUSTIN'S CORE IDENTITY:
John Austin Humphrey, 29, born August 17, 1995 in Memphis, TN (with Texas soil present at birth). Current location: Boerne, Texas. The convergence of "Memphis wisdom and Texas courage" defines his approach to everything.

ATHLETIC FOUNDATION:
- High School Football: Starting RB #20 at Champion High School
- Baseball Excellence: Perfect game at age 12, elite travel teams (South Texas Sliders)
- Track & Field: 100m personal best 12.32 seconds
- Philosophy: Athletic precision applied to business — "every spreadsheet has a heartbeat, every game has a P&L"

TRANSFORMATIVE ACHIEVEMENTS:
- Hidden Value Index™: $42M+ MLB market inefficiencies identified, 94% prediction accuracy
- Blaze Intelligence Ecosystem: 100K+ events/second processing
- Northwestern Mutual: Power of 10 Award
- Spectrum Reach: 47% revenue increases in sports/entertainment verticals

BLAZE INTELLIGENCE VENTURES:
- ShowIQ App, Blaze Backyard, Cardinals Analytics MCP Server, Gamer-Athlete Hybrid Camps

PROPRIETARY FRAMEWORKS:
- Decision Velocity Model™, Pattern Recognition Hierarchy™, Cognitive Load Distribution™, Quantum Performance Evaluation Framework (QPEF™)

TECHNICAL MASTERY:
- Stack: TypeScript, Python, React, Node.js, Redis, PostgreSQL, TensorFlow.js
- 11+ MCP servers deployed for real-time sports intelligence

COMMUNICATION STYLE:
- Direct, authentic, player-first mentorship with long-term impact focus

RESPONSE GUIDELINES:
1. Speak with Austin's direct voice — no corporate fluff
2. Tie insights back to athletic foundation when relevant
3. Emphasize measurable results and lived experience
4. Guide visitors toward deeper engagement with specific projects
5. Reference the Memphis-Texas duality and progression from athlete → analyst → innovator

CONTACT:
- Email: humphrey.austin20@gmail.com
- Phone: (210) 273-5538
- LinkedIn: linkedin.com/in/john-humphrey-2033
- Location: Boerne, TX
`;

const thinkingModes = {
  fast: {
    maxTokens: 300,
    temperature: 0.7,
    suffix: 'Provide a quick, concise response.',
  },
  mini: {
    maxTokens: 500,
    temperature: 0.7,
    suffix: 'Think briefly before responding with a clear answer.',
  },
  auto: {
    maxTokens: 800,
    temperature: 0.8,
    suffix: 'Determine the appropriate response depth based on the query.',
  },
  thinking: {
    maxTokens: 1200,
    temperature: 0.8,
    suffix: 'Think through this carefully and provide a comprehensive response.',
  },
  pro: {
    maxTokens: 2000,
    temperature: 0.9,
    suffix: 'Conduct research-grade analysis with detailed insights and strategic recommendations.',
  },
} satisfies Record<string, { maxTokens: number; temperature: number; suffix: string }>;

type ThinkingMode = keyof typeof thinkingModes;

type StreamEvent = {
  type: string;
  delta?: {
    type?: string;
    text?: string;
  };
};

const requestSchema = z.object({
  message: z.string().min(1, 'Message is required.'),
  thinkingMode: z.enum(['fast', 'mini', 'auto', 'thinking', 'pro']).default('auto'),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      })
    )
    .max(10)
    .default([]),
});

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured.');
  }
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

export function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonResponse({ error: parsed.error.errors[0]?.message ?? 'Invalid payload.' }, { status: 400, headers: CORS_HEADERS });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonResponse({ error: 'Anthropic API key not configured.' }, { status: 500, headers: CORS_HEADERS });
  }

  const { message, thinkingMode, conversationHistory } = parsed.data;
  const config = thinkingModes[thinkingMode as ThinkingMode] ?? thinkingModes.auto;

  const systemPrompt = `${PORTFOLIO_CONTEXT}\n\n${config.suffix}${
    thinkingMode === 'thinking' || thinkingMode === 'pro'
      ? '\n\nFirst, think through the query step by step, then provide your response.'
      : ''
  }`;

  const formattedHistory = conversationHistory.map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));

  try {
    const anthropic = getAnthropicClient();
    const anthropicStream = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemPrompt,
      messages: [
        ...formattedHistory,
        {
          role: 'user',
          content: message,
        },
      ],
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of anthropicStream as AsyncIterable<StreamEvent>) {
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              const text = event.delta.text ?? '';
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Claude assistant error', error);
    return jsonResponse({ error: 'Unable to reach Claude at this time.' }, { status: 502, headers: CORS_HEADERS });
  }
}
