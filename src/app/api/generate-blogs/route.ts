import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { prompt as promptTemplate } from "@/prompt";

// Helper to build the full prompt for each idea
function buildPrompt(promptTemplate: string, idea: string, keywords: string[]) {
  let keywordStr =
    keywords.length > 0 ? `\nKeywords: ${keywords.join(", ")}` : "";
  return `You are to write a blog based on the following idea and keywords.\n\nIdea: ${idea}${keywordStr}\n\n${promptTemplate}`;
}

// POST handler for generating blogs
export async function POST(req: NextRequest) {
  let ideas;
  try {
    const body = await req.json();
    ideas = body.ideas;
    if (!Array.isArray(ideas) || ideas.length === 0) {
      console.error("[API] No ideas provided in request:", body);
      return NextResponse.json(
        { error: "No ideas provided." },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("[API] Failed to parse request body:", err);
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  // For each idea, generate a blog using the model
  const blogPromises = ideas.map(
    async (item: { idea: string; keywords: string[] }, idx: number) => {
      const fullPrompt = buildPrompt(promptTemplate, item.idea, item.keywords);
      try {
        const { text } = await generateText({
          model: openai("gpt-4o"),
          prompt: fullPrompt,
          maxTokens: 3000, // ~2300 words, adjust as needed
          temperature: 0.7,
        });
        const blogText = text.trim();
        // Log the response for this blog
        console.log(
          `[API] Blog #${idx + 1} generated for idea: '${
            item.idea
          }' | keywords: [${item.keywords.join(", ")}]\n${blogText.slice(
            0,
            300
          )}${blogText.length > 300 ? "\n... (truncated)" : ""}`
        );
        return blogText;
      } catch (err) {
        console.error(`[API] Blog generation failed for idea #${idx + 1}:`, {
          idea: item.idea,
          keywords: item.keywords,
          error: err instanceof Error ? err.message : err,
          stack: err instanceof Error ? err.stack : undefined,
        });
        throw err;
      }
    }
  );

  // Wait for all blogs to be generated
  let blogs: string[] = [];
  try {
    blogs = await Promise.all(blogPromises);
  } catch (err) {
    console.error("[API] One or more blog generations failed:", err);
    return NextResponse.json(
      { error: "Blog generation failed. Please try again later." },
      { status: 500 }
    );
  }

  // Bundle all blogs into a single markdown string, separated by ---
  const bundledMarkdown = blogs.join("\n\n---\n\n");

  // Log the response (first 500 chars and count)
  console.log(
    `[API] Returning bundled markdown for ${
      blogs.length
    } blog(s):\n${bundledMarkdown.slice(0, 500)}${
      bundledMarkdown.length > 500 ? "\n... (truncated)" : ""
    }`
  );

  return NextResponse.json({ markdown: bundledMarkdown });
}
