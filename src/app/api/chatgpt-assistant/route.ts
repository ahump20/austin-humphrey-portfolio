import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { CORS_HEADERS, jsonResponse } from '@/lib/http';

export const runtime = 'edge';

const PORTFOLIO_CONTEXT = `You are an AI assistant for Austin Humphrey's portfolio website. Embody Austin's direct, authentic approach and help visitors understand his journey from championship athletics to sports intelligence innovation.

AUSTIN'S CORE IDENTITY:
John Austin Humphrey, 29, born Memphis TN, raised Boerne TX. "Texas neurology" mindset — the convergence of Memphis wisdom and Texas courage applied to sports intelligence.

ATHLETIC FOUNDATION:
- Football: Starting RB #20 at Champion High School
- Baseball: Perfect game at age 12, elite travel teams, Perfect Game USA showcases
- Track: 100m personal best 12.32 seconds
- Core Philosophy: "Every spreadsheet has a heartbeat, every game has a P&L"

TRANSFORMATIVE ACHIEVEMENTS:
1. Hidden Value Index™: $42M+ MLB market inefficiencies identified, 94% prediction accuracy for Baltimore Orioles
2. Blaze Intelligence: 100K+ events/second processing, revolutionary sports analytics platform
3. Northwestern Mutual: Power of 10 Award (top 10% nationally)
4. Spectrum Reach: 47% revenue increases in sports/entertainment verticals
5. Pattern Recognition: Self-rated 98% competency (lived, not inflated)

EDUCATION:
- UT Austin (2014-2020): BA International Relations & Global Studies, Economics/European Studies minors
- Full Sail University (current): MS Entertainment Business / Sports Management (expected 2025)

BLAZE INTELLIGENCE ECOSYSTEM:
Mission: "Turning data into dominance" through Blaze Intelligence deployments.

Current Projects:
- The ShowIQ App
- Blaze Backyard mobile training
- Cardinals Analytics MCP Server
- Gamer-Athlete Hybrid Camps

Proprietary Frameworks:
- Decision Velocity Model™, Pattern Recognition Hierarchy™, Cognitive Load Distribution™, Quantum Performance Evaluation Framework™

TECHNICAL MASTERY:
- Stack: TypeScript, Python, React, Node.js, Redis, PostgreSQL, TensorFlow.js
- Infrastructure: 11+ MCP servers for real-time sports intelligence

COMMUNICATION STYLE:
- Direct & decisive, genuine, player-first mentorship, emotionally grounded, legacy-driven, raw conversational tone

CONTACT:
- Email: humphrey.austin20@gmail.com
- Phone: (210) 273-5538
- LinkedIn: linkedin.com/in/john-humphrey-2033
- Location: Boerne, Texas
`;

const thinkingModes = {
  fast: {
    model: 'gpt-4o-mini',
    maxTokens: 300,
    temperature: 0.7,
    suffix: 'Provide a quick, direct answer.',
  },
  mini: {
    model: 'gpt-4o-mini',
    maxTokens: 500,
    temperature: 0.7,
    suffix: 'Think briefly, then provide a clear response.',
  },
  auto: {
    model: 'gpt-4o',
    maxTokens: 800,
    temperature: 0.8,
    suffix: 'Automatically determine the appropriate response depth.',
  },
  thinking: {
    model: 'o1-mini',
    maxTokens: 1200,
    temperature: 0.8,
    suffix: 'Think step-by-step through this query and provide a thorough response.',
  },
  pro: {
    model: 'o1',
    maxTokens: 2000,
    temperature: 0.9,
    suffix: 'Conduct deep analysis with strategic recommendations.',
  },
} satisfies Record<string, { model: string; maxTokens: number; temperature: number; suffix: string }>;

type ThinkingMode = keyof typeof thinkingModes;

type ChatStreamChunk = {
  choices: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

const requestSchema = z.object({
  message: z.string().min(1, 'Message is required.'),
  thinkingMode: z.enum(['fast', 'mini', 'auto', 'thinking', 'pro']).default('auto'),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'ai']),
        content: z.string().min(1),
      })
    )
    .max(10)
    .default([]),
});

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured.');
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
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

  if (!process.env.OPENAI_API_KEY) {
    return jsonResponse({ error: 'OpenAI API key not configured.' }, { status: 500, headers: CORS_HEADERS });
  }

  const { message, thinkingMode, conversationHistory } = parsed.data;
  const config = thinkingModes[thinkingMode as ThinkingMode] ?? thinkingModes.auto;

  const messages = [
    {
      role: 'system' as const,
      content: `${PORTFOLIO_CONTEXT}\n\n${config.suffix}`,
    },
    ...conversationHistory.map((entry) => ({
      role: entry.role === 'ai' ? 'assistant' : entry.role,
      content: entry.content,
    })),
    {
      role: 'user' as const,
      content: message,
    },
  ];

  if (thinkingMode === 'thinking' || thinkingMode === 'pro') {
    messages[0] = {
      ...messages[0],
      content: `${messages[0].content}\n\nApproach: First reason through the query systematically, then deliver the answer.`,
    };
  }

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of completion as AsyncIterable<ChatStreamChunk>) {
            const text = chunk.choices[0]?.delta?.content ?? '';
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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
    console.error('OpenAI assistant error', error);
    return jsonResponse({ error: 'Unable to reach ChatGPT at this time.' }, { status: 502, headers: CORS_HEADERS });
  }
}
