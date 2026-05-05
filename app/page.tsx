"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Search,
  Sparkles,
  Tags,
  RotateCcw,
  Heart,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STORAGE_KEY = "word-garden-v1";

type Word = {
  id: string;
  word: string;
  meaning: string;
  example: string;
  why: string;
  tags: string[];
  status: "new" | "learning" | "known";
  ease: number;
  createdAt: string;
  nextReview: string;
};

type ReviewResult = "forgot" | "nearly" | "knew" | "loved";

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

type StatProps = {
  label: string;
  value: number;
};

function makeStarterWords(): Word[] {
  return [
    {
      id: crypto.randomUUID(),
      word: "splenetic",
      meaning: "Bad-tempered, spiteful, or irritable.",
      example: "His review was less critical than splenetic.",
      why: "It sounds sharp and slightly diseased, which suits the meaning.",
      tags: ["withering", "comic", "usable"],
      status: "learning",
      ease: 0,
      createdAt: new Date().toISOString(),
      nextReview: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      word: "susurrus",
      meaning: "A soft whispering, rustling, or murmuring sound.",
      example: "There was a susurrus of rain against the windows.",
      why: "The word almost performs the sound it names.",
      tags: ["beautiful", "gothic", "literary"],
      status: "new",
      ease: 0,
      createdAt: new Date().toISOString(),
      nextReview: new Date().toISOString(),
    },
  ];
}

const vibeOptions = [
  "withering",
  "comic",
  "elegant",
  "gothic",
  "academic",
  "insult",
  "praise",
  "usable",
  "literary",
  "pretentious",
  "beautiful",
  "archaic",
];

function loadWords(): Word[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Word[]) : makeStarterWords();
  } catch {
    return makeStarterWords();
  }
}

function saveWords(words: Word[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function todayISO(): string {
  return new Date().toISOString();
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function normaliseTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/^#/, "");
}

export default function WordGardenApp() {
  const [words, setWords] = useState<Word[]>([]);
  const [tab, setTab] = useState<"today" | "add" | "library">("today");
  const [query, setQuery] = useState<string>("");
  const [activeTag, setActiveTag] = useState<string>("all");
  const [reviewIndex, setReviewIndex] = useState<number>(0);
  const [revealed, setRevealed] = useState<boolean>(false);
  const [form, setForm] = useState({
    word: "",
    meaning: "",
    example: "",
    why: "",
    tags: "",
  });

  useEffect(() => {
    setWords(loadWords());
  }, []);

  useEffect(() => {
    if (words.length > 0) saveWords(words);
  }, [words]);

  const allTags = useMemo<string[]>(() => {
    const set = new Set<string>();
    words.forEach((w) => (w.tags || []).forEach((t) => set.add(t)));
    return ["all", ...Array.from(set).sort()];
  }, [words]);

  const dueWords = useMemo<Word[]>(() => {
    const now = new Date();
    return words
      .filter((w) => !w.nextReview || new Date(w.nextReview) <= now)
      .sort(
        (a, b) =>
          new Date(a.nextReview || 0).getTime() -
          new Date(b.nextReview || 0).getTime()
      )
      .slice(0, 5);
  }, [words]);

  const filteredWords = useMemo<Word[]>(() => {
    return words
      .filter((w) => {
        const haystack = `${w.word} ${w.meaning} ${w.example} ${w.why} ${(
          w.tags || []
        ).join(" ")}`.toLowerCase();
        const matchesQuery = haystack.includes(query.toLowerCase());
        const matchesTag = activeTag === "all" || (w.tags || []).includes(activeTag);
        return matchesQuery && matchesTag;
      })
      .sort((a, b) => a.word.localeCompare(b.word));
  }, [words, query, activeTag]);

  const currentReview = dueWords[reviewIndex] || null;

  function addWord(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!form.word.trim()) return;

    const newWord: Word = {
      id: crypto.randomUUID(),
      word: form.word.trim(),
      meaning: form.meaning.trim(),
      example: form.example.trim(),
      why: form.why.trim(),
      tags: form.tags
        .split(",")
        .map(normaliseTag)
        .filter(Boolean),
      status: "new",
      ease: 0,
      createdAt: todayISO(),
      nextReview: todayISO(),
    };

    setWords([newWord, ...words]);
    setForm({ word: "", meaning: "", example: "", why: "", tags: "" });
    setTab("today");
  }

  function quickAddTag(tag: string): void {
    const tags = form.tags
      .split(",")
      .map(normaliseTag)
      .filter(Boolean);

    if (!tags.includes(tag)) {
      setForm({ ...form, tags: [...tags, tag].join(", ") });
    }
  }

  function reviewWord(result: ReviewResult): void {
    if (!currentReview) return;

    const spacing: Record<ReviewResult, number> = {
      forgot: 1,
      nearly: 3,
      knew: 7,
      loved: 21,
    };

    const status: Word["status"] =
      result === "forgot" || result === "nearly" ? "learning" : "known";

    setWords((prev) =>
      prev.map((w) =>
        w.id === currentReview.id
          ? {
              ...w,
              status,
              ease: Math.max(
                0,
                (w.ease || 0) +
                  (result === "forgot" ? -1 : result === "nearly" ? 0 : 1)
              ),
              nextReview: addDays(spacing[result]),
            }
          : w
      )
    );

    setRevealed(false);
    setReviewIndex((i) => i + 1);
  }

  function resetDemo(): void {
    localStorage.removeItem(STORAGE_KEY);
    setWords(makeStarterWords());
    setReviewIndex(0);
    setRevealed(false);
    setTab("today");
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900">
              <Leaf className="h-4 w-4" /> Word Garden
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Collect words. Actually learn them.
            </h1>
            <p className="mt-2 max-w-2xl text-stone-600">
              A tiny personal vocabulary app for beautiful, useful, withering,
              comic, and faintly pretentious words.
            </p>
          </div>
          <Button onClick={resetDemo} variant="outline" className="w-fit rounded-2xl">
            <RotateCcw className="mr-2 h-4 w-4" /> Reset demo
          </Button>
        </header>

        <nav className="mb-6 grid grid-cols-3 gap-2 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-stone-200">
          {[
            { key: "today", label: "Today", Icon: BookOpen },
            { key: "add", label: "Add", Icon: Plus },
            { key: "library", label: "Library", Icon: Search },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as "today" | "add" | "library")}
              className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                tab === key
                  ? "bg-stone-950 text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          {tab === "today" && (
            <motion.main
              key="today"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"
            >
              <Card className="rounded-3xl border-stone-200 bg-white shadow-sm">
                <CardContent className="p-5 sm:p-7">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold">Today’s review</h2>
                      <p className="mt-1 text-sm text-stone-600">
                        Five words max. No grim homework pile.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-stone-100 px-3 py-2 text-sm font-medium text-stone-700">
                      {Math.min(reviewIndex, dueWords.length)} / {dueWords.length}
                    </div>
                  </div>

                  {!currentReview ? (
                    <div className="rounded-3xl bg-emerald-50 p-7 text-center ring-1 ring-emerald-100">
                      <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-700" />
                      <h3 className="text-xl font-semibold">Nothing due.</h3>
                      <p className="mt-2 text-stone-600">
                        Add a new word, or enjoy the rare luxury of being done.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-3xl bg-stone-50 p-5 ring-1 ring-stone-200 sm:p-7">
                      <p className="mb-2 text-sm font-medium uppercase tracking-wide text-stone-500">
                        What does this mean?
                      </p>
                      <h3 className="mb-5 text-5xl font-semibold tracking-tight">
                        {currentReview.word}
                      </h3>

                      {!revealed ? (
                        <Button
                          onClick={() => setRevealed(true)}
                          className="rounded-2xl px-5 py-6 text-base"
                        >
                          <HelpCircle className="mr-2 h-5 w-5" /> Reveal
                        </Button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-4"
                        >
                          <div>
                            <p className="text-sm font-medium text-stone-500">Meaning</p>
                            <p className="text-lg">
                              {currentReview.meaning || "No meaning added yet."}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-500">Example</p>
                            <p className="text-lg italic text-stone-700">
                              {currentReview.example || "No example yet."}
                            </p>
                          </div>
                          {currentReview.why && (
                            <div>
                              <p className="text-sm font-medium text-stone-500">
                                Why you liked it
                              </p>
                              <p className="text-stone-700">{currentReview.why}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
                            <Button
                              variant="outline"
                              onClick={() => reviewWord("forgot")}
                              className="rounded-2xl"
                            >
                              <XCircle className="mr-2 h-4 w-4" /> Forgot
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => reviewWord("nearly")}
                              className="rounded-2xl"
                            >
                              Nearly
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => reviewWord("knew")}
                              className="rounded-2xl"
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Knew
                            </Button>
                            <Button
                              onClick={() => reviewWord("loved")}
                              className="rounded-2xl"
                            >
                              <Heart className="mr-2 h-4 w-4" /> Love
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-stone-200 bg-white shadow-sm">
                <CardContent className="p-5 sm:p-7">
                  <h2 className="mb-4 text-xl font-semibold">Your garden</h2>
                  <div className="grid grid-cols-3 gap-3">
                    <Stat label="Words" value={words.length} />
                    <Stat label="Due" value={dueWords.length} />
                    <Stat
                      label="Known"
                      value={words.filter((w) => w.status === "known").length}
                    />
                  </div>
                  <div className="mt-5 rounded-3xl bg-stone-950 p-5 text-white">
                    <Sparkles className="mb-3 h-6 w-6" />
                    <h3 className="text-lg font-semibold">Make it stick</h3>
                    <p className="mt-2 text-sm text-stone-300">
                      Do not add perfect dictionary entries. Add the word quickly,
                      then make it yours later with one sentence and one reason you
                      liked it.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.main>
          )}

          {tab === "add" && (
            <motion.main
              key="add"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <Card className="rounded-3xl border-stone-200 bg-white shadow-sm">
                <CardContent className="p-5 sm:p-7">
                  <h2 className="text-2xl font-semibold">Add a word</h2>
                  <p className="mt-1 text-sm text-stone-600">
                    Only the word is required. Everything else can be filled in later.
                  </p>

                  <form onSubmit={addWord} className="mt-6 grid gap-4">
                    <Field
                      label="Word"
                      value={form.word}
                      onChange={(v) => setForm({ ...form, word: v })}
                      placeholder="e.g. rebarbative"
                      autoFocus
                    />
                    <Field
                      label="Meaning"
                      value={form.meaning}
                      onChange={(v) => setForm({ ...form, meaning: v })}
                      placeholder="Rough, unattractive, irritating, off-putting..."
                    />
                    <Field
                      label="Example sentence"
                      value={form.example}
                      onChange={(v) => setForm({ ...form, example: v })}
                      placeholder="The prose was clever but rebarbative."
                    />
                    <Field
                      label="Why I liked it"
                      value={form.why}
                      onChange={(v) => setForm({ ...form, why: v })}
                      placeholder="It sounds abrasive without being cartoonish."
                    />
                    <Field
                      label="Tags, comma separated"
                      value={form.tags}
                      onChange={(v) => setForm({ ...form, tags: v })}
                      placeholder="withering, usable, comic"
                    />

                    <div>
                      <p className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-600">
                        <Tags className="h-4 w-4" /> Quick vibes
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {vibeOptions.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => quickAddTag(tag)}
                            className="rounded-full bg-stone-100 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-200"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button type="submit" className="mt-2 rounded-2xl py-6 text-base">
                      <Plus className="mr-2 h-5 w-5" /> Add word
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.main>
          )}

          {tab === "library" && (
            <motion.main
              key="library"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <Card className="rounded-3xl border-stone-200 bg-white shadow-sm">
                <CardContent className="p-5 sm:p-7">
                  <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold">Library</h2>
                      <p className="mt-1 text-sm text-stone-600">
                        Search by word, meaning, sentence, or vibe.
                      </p>
                    </div>
                    <div className="relative sm:w-80">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3 outline-none focus:ring-2 focus:ring-stone-300"
                      />
                    </div>
                  </div>

                  <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setActiveTag(tag)}
                        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
                          activeTag === tag
                            ? "bg-stone-950 text-white"
                            : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                        }`}
                      >
                        {tag === "all" ? "all" : `#${tag}`}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-3">
                    {filteredWords.map((w) => (
                      <div
                        key={w.id}
                        className="rounded-3xl bg-stone-50 p-5 ring-1 ring-stone-200"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-2xl font-semibold">{w.word}</h3>
                            <p className="mt-1 text-stone-700">
                              {w.meaning || "No meaning added yet."}
                            </p>
                          </div>
                          <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-600 ring-1 ring-stone-200">
                            {w.status}
                          </span>
                        </div>
                        {w.example && (
                          <p className="mt-3 italic text-stone-600">“{w.example}”</p>
                        )}
                        {w.why && <p className="mt-3 text-sm text-stone-500">{w.why}</p>}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(w.tags || []).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-white px-3 py-1 text-xs text-stone-600 ring-1 ring-stone-200"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {!filteredWords.length && (
                      <p className="rounded-3xl bg-stone-50 p-8 text-center text-stone-500 ring-1 ring-stone-200">
                        No words found.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.main>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="rounded-2xl bg-stone-50 p-4 text-center ring-1 ring-stone-200">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, autoFocus }: FieldProps) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-300"
      />
    </label>
  );
}
