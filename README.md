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

## Formula Engine — Design Decisions

The formula engine uses a **regex-based evaluator** rather than a full AST parser.

**Justification**: For a spreadsheet supporting `=SUM(A1:A5)` and basic arithmetic, a regex evaluator is:
- Simpler to maintain
- Faster to execute
- Sufficient for the required feature set

A full AST parser (like those used in Excel or Google Sheets) would be needed for:
- Nested functions: `=SUM(A1, MAX(B1:B5))`
- String functions: `=CONCAT(A1, " ", B1)`
- Conditional logic: `=IF(A1>10, "High", "Low")`

These are outside scope but the evaluator is designed to be extended — add new functions to `src/lib/formula/functions.ts`.

## Demo

![Dashboard](./public/demo-dashboard.png)
![Spreadsheet](./public/demo-sheet.png)

> Open two browser tabs on the same document to see real-time collaboration in action.