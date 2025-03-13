# Learnify MultiQuiz

An interactive quiz platform for creating and sharing educational quizzes.

## Environment Setup

This project uses environment variables for configuration. For local development:

1. Copy `.env.example` to `.env`
2. Fill in your Firebase credentials

```bash
cp .env.example .env
```

**IMPORTANT: Never commit your `.env` file to version control!**

## Development

To run the development server:

```bash
npm install
npm run dev
```

## Deployment

This project is configured for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Add all environment variables from your `.env` file to Vercel's Environment Variables section
3. Deploy!

Vercel will automatically build and deploy the application with the secure environment variables.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
