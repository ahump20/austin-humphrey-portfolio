# Secure Deployment Guide

## 1. Get New API Keys (REQUIRED)
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/

## 2. Deploy to Vercel
```bash
npm install
npm run build
vercel deploy --prebuilt --prod
```

## 3. Set Environment Variables in Vercel Dashboard
```
ANTHROPIC_API_KEY=your_new_key
OPENAI_API_KEY=your_new_key
```

## 4. Test Your Live Chatbot
Visit your deployed URL and test both AI models with different thinking modes.

## Security Notes
- Never commit .env files
- Never share API keys publicly
- Regularly rotate your keys
- Monitor usage dashboards