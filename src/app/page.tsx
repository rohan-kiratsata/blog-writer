"use client";
import React, { useState, ChangeEvent, FormEvent } from "react";
import dynamic from "next/dynamic";

// Dynamically import react-markdown to avoid SSR issues
const ReactMarkdown = dynamic(() => import("react-markdown"), {
  ssr: false,
}) as React.FC<{ children: string }>;

// BlogGeneratorForm: Main UI for entering ideas and keywords, submitting, and downloading result
function BlogGeneratorForm() {
  // State: array of { idea: string, keywords: string[] }
  const [ideas, setIdeas] = useState<
    {
      idea: string;
      keywords: string[];
    }[]
  >([{ idea: "", keywords: ["", ""] }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  // Tab state: 'preview' or 'raw'
  const [tab, setTab] = useState<"preview" | "raw">("preview");

  // Handle input change for idea or keywords
  const handleInputChange = (idx: number, field: string, value: string) => {
    setIdeas((prev) => {
      const updated = [...prev];
      if (field === "idea") updated[idx].idea = value;
      else updated[idx].keywords[parseInt(field)] = value;
      return updated;
    });
  };

  // Add a new idea row
  const handleAddRow = () => {
    setIdeas((prev) => [...prev, { idea: "", keywords: ["", ""] }]);
  };

  // Remove an idea row
  const handleRemoveRow = (idx: number) => {
    setIdeas((prev) => prev.filter((_, i) => i !== idx));
  };

  // Validate: all ideas must be non-empty
  const isValid = ideas.every((row) => row.idea.trim().length > 0);

  // Submit handler
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setResult("");
    if (!isValid) {
      setError("Each idea is required.");
      return;
    }
    setLoading(true);
    try {
      // Prepare payload: only send non-empty keywords
      const payload = {
        ideas: ideas.map((row) => ({
          idea: row.idea.trim(),
          keywords: row.keywords.map((k) => k.trim()).filter(Boolean),
        })),
      };
      const res = await fetch("/api/generate-blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to generate blogs");
      const data = await res.json();
      if (data.markdown) setResult(data.markdown);
      else setError("No markdown returned.");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Download the markdown result as a file
  const handleDownload = () => {
    const blob = new Blob([result], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "blogs.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6">Blog Generator</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {ideas.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end border-b pb-2"
            >
              {/* Idea input (required) */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Idea <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1"
                  value={row.idea}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleInputChange(idx, "idea", e.target.value)
                  }
                  required
                  placeholder="Enter blog idea"
                />
              </div>
              {/* Keyword 1 (optional) */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Keyword 1
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1"
                  value={row.keywords[0]}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleInputChange(idx, "0", e.target.value)
                  }
                  placeholder="Keyword (optional)"
                />
              </div>
              {/* Keyword 2 (optional) */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Keyword 2
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1"
                    value={row.keywords[1]}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleInputChange(idx, "1", e.target.value)
                    }
                    placeholder="Keyword (optional)"
                  />
                  {ideas.length > 1 && (
                    <button
                      type="button"
                      className="text-red-500 font-bold px-2"
                      onClick={() => handleRemoveRow(idx)}
                      title="Remove this idea"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            className="bg-gray-200 rounded px-4 py-2"
            onClick={handleAddRow}
          >
            + Add Idea
          </button>
          <button
            type="submit"
            className="bg-blue-600 text-white rounded px-6 py-2 font-semibold disabled:opacity-50"
            disabled={!isValid || loading}
          >
            {loading ? "Generating..." : "Generate Blogs"}
          </button>
        </div>
        {error && <div className="text-red-600 font-medium">{error}</div>}
      </form>
      {result && (
        <div className="mt-8">
          <button
            className="bg-green-600 text-white rounded px-6 py-2 font-semibold mb-4"
            onClick={handleDownload}
          >
            Download Markdown
          </button>
          {/* Tabs for Preview/Raw */}
          <div className="mb-2 flex gap-2">
            <button
              className={`px-3 py-1 rounded-t border-b-2 font-semibold ${
                tab === "preview"
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-transparent text-gray-600 bg-gray-100"
              }`}
              onClick={() => setTab("preview")}
              type="button"
            >
              Preview
            </button>
            <button
              className={`px-3 py-1 rounded-t border-b-2 font-semibold ${
                tab === "raw"
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-transparent text-gray-600 bg-gray-100"
              }`}
              onClick={() => setTab("raw")}
              type="button"
            >
              Raw
            </button>
          </div>
          {/* Rendered Markdown Preview */}
          {tab === "preview" ? (
            <div className="prose prose-slate max-w-none bg-white p-4 rounded shadow overflow-x-auto">
              <ReactMarkdown>{result as string}</ReactMarkdown>
            </div>
          ) : (
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs max-h-96 mt-2">
              {result.slice(0, 5000)}
              {result.length > 5000 && "\n... (truncated)"}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// Main page: renders the BlogGeneratorForm
export default function Home() {
  return <BlogGeneratorForm />;
}
