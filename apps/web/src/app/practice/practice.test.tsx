import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const listDomains = vi.fn();
const listPublishedQuestions = vi.fn();
const countQuestions = vi.fn();

vi.mock("@/lib/server/bank", () => ({
  listDomains: () => listDomains(),
  listPublishedQuestions: (domain: string, limit?: number) =>
    listPublishedQuestions(domain, limit),
  countQuestions: (domain?: string) => countQuestions(domain),
}));

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", async () => ({
  notFound: () => notFound(),
}));

import PracticeIndexPage from "./page";
import PracticeDomainPage from "./[domain]/page";

const QUESTION = {
  id: "q1",
  questionText: "What is the maximum altitude for a small UA?",
  answers: ["400 feet AGL", "500 feet AGL"],
  correctAnswer: "400 feet AGL",
  explanation: "107.51(b) caps it at 400 feet above ground level.",
  hint: null,
};

/**
 * These pages exist to be readable — and indexable — without an account. Every
 * other content surface is a client component behind Apollo, so a crawler gets
 * an empty shell; the whole question bank was invisible to search.
 */
describe("the published practice pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listDomains.mockResolvedValue(["Regulations", "Airspace classification"]);
    listPublishedQuestions.mockResolvedValue([QUESTION]);
    countQuestions.mockResolvedValue(12);
  });

  it("lists every knowledge area with its question count", async () => {
    render(await PracticeIndexPage());

    expect(screen.getByText("Regulations")).toBeInTheDocument();
    expect(screen.getByText("Airspace classification")).toBeInTheDocument();
    expect(screen.getAllByText("12 questions").length).toBe(2);
  });

  it("links each area to its own page by slug", async () => {
    render(await PracticeIndexPage());

    expect(
      screen.getByRole("link", { name: /airspace classification/i }),
    ).toHaveAttribute("href", "/practice/airspace-classification");
  });

  it("renders the question, its answer and its explanation as text", async () => {
    render(
      await PracticeDomainPage({
        params: Promise.resolve({ domain: "regulations" }),
      }),
    );

    expect(screen.getByText(QUESTION.questionText)).toBeInTheDocument();
    expect(screen.getByText("400 feet AGL")).toBeInTheDocument();
    expect(screen.getByText(QUESTION.explanation)).toBeInTheDocument();
    // The wrong answer is on the page too — a question with one option shown
    // is not a practice question.
    expect(screen.getByText("500 feet AGL")).toBeInTheDocument();
  });

  /**
   * The structured data is what turns the page into an expandable search
   * result rather than a plain blue link.
   */
  it("emits Quiz structured data carrying the accepted answer", async () => {
    const { container } = render(
      await PracticeDomainPage({
        params: Promise.resolve({ domain: "regulations" }),
      }),
    );

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).not.toBeNull();

    const data = JSON.parse(script!.textContent!);
    expect(data["@type"]).toBe("Quiz");
    expect(data.hasPart[0].acceptedAnswer.text).toBe("400 feet AGL");
    expect(data.hasPart[0].suggestedAnswer[0].text).toBe("500 feet AGL");
  });

  it("offers a run on the same domain", async () => {
    render(
      await PracticeDomainPage({
        params: Promise.resolve({ domain: "regulations" }),
      }),
    );

    const links = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(links).toContain("/quiz?domain=Regulations");
  });

  it("404s a slug that matches no domain", async () => {
    await expect(
      PracticeDomainPage({
        params: Promise.resolve({ domain: "underwater-basket-weaving" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  /**
   * The reads behind these pages swallow their errors and return nothing, so
   * a database blink has to degrade the page rather than 500 it.
   */
  it("says so plainly when a domain has no published questions", async () => {
    listPublishedQuestions.mockResolvedValue([]);

    render(
      await PracticeDomainPage({
        params: Promise.resolve({ domain: "regulations" }),
      }),
    );

    expect(
      screen.getByText(/no questions have been published/i),
    ).toBeInTheDocument();
  });

  it("does not claim knowledge areas it could not read", async () => {
    listDomains.mockResolvedValue([]);

    render(await PracticeIndexPage());

    expect(
      screen.getByText(/no questions have been classified yet/i),
    ).toBeInTheDocument();
  });
});
