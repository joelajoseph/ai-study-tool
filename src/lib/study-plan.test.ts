import { describe, expect, it } from "vitest";
import { calculateProgress, defaultPlanTitle, parsePlan, planDisplayLabel } from "./study-plan";

const validPlan = {
  overview: "Focus on formulas first.",
  topics: [
    { title: "Kinematics", priority: 1, estimatedMinutes: 90, rationale: "Weak spot.", suggestedDay: 1, materials: ["Lecture slides 12–18", "Problem set Q1–Q5"] },
    { title: "Thermodynamics", priority: 2, estimatedMinutes: 60, rationale: "Solid but worth reviewing.", suggestedDay: 2, materials: ["Textbook ch. 5"] },
  ],
};

describe("parsePlan", () => {
  it("accepts a valid JSON plan", () => {
    const plan = parsePlan(JSON.stringify(validPlan), 3);
    expect(plan.overview).toBe(validPlan.overview);
    expect(plan.daysRemaining).toBe(3);
    expect(plan.topics.map((topic) => topic.title)).toEqual(["Kinematics", "Thermodynamics"]);
    expect(plan.topics[0].materials).toEqual(["Lecture slides 12–18", "Problem set Q1–Q5"]);
  });

  it("rejects non-JSON responses", () => {
    expect(() => parsePlan("Sorry, I can't help with that.", 3)).toThrow("unexpected format");
  });

  it("rejects plans with no topics", () => {
    expect(() => parsePlan(JSON.stringify({ overview: "Hi", topics: [] }), 3)).toThrow();
  });

  it("rejects topics missing required text", () => {
    const broken = { overview: "Hi", topics: [{ priority: 1 }] };
    expect(() => parsePlan(JSON.stringify(broken), 2)).toThrow();
  });

  it("re-ranks tied priorities into a unique 1..N sequence", () => {
    const tied = {
      overview: "o",
      topics: [
        { title: "A", rationale: "r", priority: 1, suggestedDay: 1 },
        { title: "B", rationale: "r", priority: 1, suggestedDay: 1 },
        { title: "C", rationale: "r", priority: 1, suggestedDay: 2 },
      ],
    };
    const plan = parsePlan(JSON.stringify(tied), 3);
    expect(plan.topics.map((topic) => topic.priority)).toEqual([1, 2, 3]);
  });

  it("orders topics by day first, then priority within a day", () => {
    const shuffled = {
      overview: "o",
      topics: [
        { title: "Later", rationale: "r", priority: 1, suggestedDay: 3 },
        { title: "Same-day lower", rationale: "r", priority: 2, suggestedDay: 1 },
        { title: "Same-day higher", rationale: "r", priority: 1, suggestedDay: 1 },
      ],
    };
    expect(parsePlan(JSON.stringify(shuffled), 5).topics.map((topic) => topic.title)).toEqual(["Same-day higher", "Same-day lower", "Later"]);
  });

  it("keeps only non-empty string materials and defaults missing ones to empty", () => {
    const withMaterials = {
      overview: "o",
      topics: [
        { title: "A", rationale: "r", materials: ["Slides ch 4", 42, "   ", "Problem set Q1–Q3"] },
        { title: "B", rationale: "r" },
      ],
    };
    const plan = parsePlan(JSON.stringify(withMaterials), 2);
    expect(plan.topics[0].materials).toEqual(["Slides ch 4", "Problem set Q1–Q3"]);
    expect(plan.topics[1].materials).toEqual([]);
  });

  it("fills defaults for missing or invalid numeric fields and clamps suggestedDay", () => {
    const loose = {
      overview: "Go.",
      topics: [
        { title: "A", rationale: "r", suggestedDay: 99 },
        { title: "B", rationale: "r", priority: 0, estimatedMinutes: -5 },
      ],
    };
    const plan = parsePlan(JSON.stringify(loose), 2);
    expect(plan.topics[0]).toMatchObject({ title: "B", priority: 2, estimatedMinutes: 60, suggestedDay: 1 });
    expect(plan.topics[1]).toMatchObject({ title: "A", priority: 1, estimatedMinutes: 60, suggestedDay: 2 });
  });

  it("rejects markdown-fenced JSON instead of misparsing it", () => {
    const fenced = "```json\n" + JSON.stringify(validPlan) + "\n```";
    expect(() => parsePlan(fenced, 3)).toThrow("unexpected format");
  });
});

describe("plan titles", () => {
  it("builds a sensible default title from the assessment type and date", () => {
    expect(defaultPlanTitle("quiz", "2026-08-28")).toBe("Quiz — 2026-08-28");
    expect(defaultPlanTitle("exam", "2026-09-01")).toBe("Exam — 2026-09-01");
  });

  it("falls back to a generated label when the saved title is missing or blank", () => {
    expect(planDisplayLabel({ title: null, assessmentType: "quiz", examDate: "2026-08-28" })).toBe("Quiz — 2026-08-28");
    expect(planDisplayLabel({ title: "   ", assessmentType: "exam", examDate: "2026-09-01" })).toBe("Exam — 2026-09-01");
  });

  it("uses the saved title when present", () => {
    expect(planDisplayLabel({ title: "Calc II midterm", assessmentType: "exam", examDate: "2026-09-01" })).toBe("Calc II midterm");
  });
});

describe("calculateProgress", () => {
  it("handles empty topics gracefully", () => {
    const progress = calculateProgress([]);
    expect(progress).toEqual({
      totalTopics: 0,
      completedTopics: 0,
      percent: 0,
      totalMinutes: 0,
      completedMinutes: 0,
      remainingMinutes: 0,
    });
  });

  it("computes 0% when no topics are completed", () => {
    const topics = [
      { completed: false, estimatedMinutes: 60 },
      { completed: false, estimatedMinutes: 90 },
    ];
    const progress = calculateProgress(topics);
    expect(progress).toEqual({
      totalTopics: 2,
      completedTopics: 0,
      percent: 0,
      totalMinutes: 150,
      completedMinutes: 0,
      remainingMinutes: 150,
    });
  });

  it("computes accurate percentage and remaining minutes for partial completion", () => {
    const topics = [
      { completed: true, estimatedMinutes: 60 },
      { completed: false, estimatedMinutes: 40 },
      { completed: false, estimatedMinutes: 80 },
    ];
    const progress = calculateProgress(topics);
    expect(progress.totalTopics).toBe(3);
    expect(progress.completedTopics).toBe(1);
    expect(progress.percent).toBe(33);
    expect(progress.totalMinutes).toBe(180);
    expect(progress.completedMinutes).toBe(60);
    expect(progress.remainingMinutes).toBe(120);
  });

  it("computes 100% when all topics are completed", () => {
    const topics = [
      { completed: true, estimatedMinutes: 30 },
      { completed: true, estimatedMinutes: 45 },
    ];
    const progress = calculateProgress(topics);
    expect(progress.totalTopics).toBe(2);
    expect(progress.completedTopics).toBe(2);
    expect(progress.percent).toBe(100);
    expect(progress.completedMinutes).toBe(75);
    expect(progress.remainingMinutes).toBe(0);
  });
});

describe("buildRegenerateStudyPlanPrompt", () => {
  it("includes completed topics as done and focuses on remaining topics", async () => {
    const { buildRegenerateStudyPlanPrompt } = await import("./prompts/study-plan");
    const prompt = buildRegenerateStudyPlanPrompt({
      examDate: "2026-09-10",
      assessmentType: "exam",
      daysRemaining: 3,
      priorKnowledge: "Knows basic calculus",
      originalTopics: "Integration, Series, Vectors",
      courseMaterials: "Chapter 7 and 8 notes",
      completedTopics: ["Integration by parts"],
      remainingTopics: ["Infinite series", "Vector fields"],
      progressNotes: "Need more practice on vector fields",
    });

    expect(prompt).toContain("What the learner has already completed (DONE — DO NOT reschedule these topics):");
    expect(prompt).toContain("Integration by parts");
    expect(prompt).toContain("Topics previously planned that still need work:");
    expect(prompt).toContain("Infinite series");
    expect(prompt).toContain("Vector fields");
    expect(prompt).toContain("Need more practice on vector fields");
    expect(prompt).toContain("Days remaining now: 3");
  });
});

