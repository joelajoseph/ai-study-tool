import { describe, expect, it } from "vitest";
import { parsePlan } from "./study-plan";

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
