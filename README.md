<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
A personal study-planning web app. The user uploads their study materials
(class notes, slides, textbook chapters, past quizzes) along with context
(exam date, days remaining, self-rated familiarity per topic), and the app:

1. Parses the materials into usable text/content.
2. Calls an LLM to generate a structured study plan — topics, priority order,
   estimated time per topic, and reasoning — tailored to the timeline and the
   user's stated knowledge gaps.
3. Lets the user chat with an LLM about the uploaded material for follow-up
   questions, with the material and plan as context (not a generic chatbot —
   answers should stay grounded in what was uploaded).
4. Lets the user track progress (mark topics/sessions as done) and regenerate
   the plan as the exam date approaches or new material is added.

This is a single-user personal project. No multi-user support, no auth
system needed beyond a simple password gate if any gate at all. Optimize for
simplicity over scalability.
>>>>>>> 782c0a22a7025d68930db46654a697fff4ad2221
