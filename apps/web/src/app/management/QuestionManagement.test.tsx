import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Question, User } from "@/types";
import QuestionManagement from "./QuestionManagement";

const editor: User = {
  id: "u1",
  username: "amelia",
  email: "amelia@example.com",
  role: "EDITOR",
};

const makeQuestion = (overrides: Partial<Question>): Question => ({
  id: "q1",
  prompt: "Prompt",
  questionText: "Question text",
  answers: ["a", "b"],
  correctAnswer: "a",
  hint: "hint",
  points: 1,
  createdBy: { id: "u1", username: "amelia" },
  ...overrides,
});

const questions: Question[] = [
  makeQuestion({
    id: "q1",
    prompt: "Charlie prompt",
    questionText: "Zulu question",
    correctAnswer: "Class B",
    answers: ["Class B", "Class G"],
    points: 30,
    createdBy: { id: "u2", username: "zara" },
  }),
  makeQuestion({
    id: "q2",
    prompt: "Alpha prompt",
    questionText: "Yankee question",
    correctAnswer: "Fog",
    answers: ["Fog", "Haze"],
    points: 10,
    createdBy: { id: "u1", username: "amelia" },
  }),
  makeQuestion({
    id: "q3",
    prompt: "Bravo prompt",
    questionText: "Xray question",
    correctAnswer: "VLOS",
    answers: ["VLOS", "BVLOS"],
    points: 20,
    createdBy: { id: "u3", username: "milo" },
  }),
];

const noop = () => {};

const renderTable = (
  props: Partial<Parameters<typeof QuestionManagement>[0]> = {},
) => {
  const handleUpdateQuestion = vi.fn();
  render(
    <QuestionManagement
      user={editor}
      questionsData={{ questions }}
      handleCreateQuestion={noop}
      handleUpdateQuestion={handleUpdateQuestion}
      handleDeleteQuestion={noop}
      editingQuestion={null}
      setEditingQuestion={noop}
      {...props}
    />,
  );
  return { handleUpdateQuestion };
};

/** First cell of each body row, in render order. */
const promptColumn = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);

describe("QuestionManagement sorting", () => {
  it("sorts by prompt ascending by default", () => {
    renderTable();
    expect(promptColumn()).toEqual([
      "Alpha prompt",
      "Bravo prompt",
      "Charlie prompt",
    ]);
  });

  it.each([
    ["Question Text", ["Bravo prompt", "Alpha prompt", "Charlie prompt"]],
    ["Correct Answer", ["Charlie prompt", "Alpha prompt", "Bravo prompt"]],
    ["Created By", ["Alpha prompt", "Bravo prompt", "Charlie prompt"]],
  ])(
    "sorts by the multi-word column %s",
    async (columnLabel, expectedOrder) => {
      // Deriving the sort key from the label used to lowercase it into
      // "questiontext", which matched no field and silently did nothing.
      const user = userEvent.setup();
      renderTable();
      await user.click(
        within(screen.getByRole("table")).getByText(columnLabel),
      );
      expect(promptColumn()).toEqual(expectedOrder);
    },
  );

  it("sorts points numerically, not lexicographically", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(within(screen.getByRole("table")).getByText("Points"));
    expect(promptColumn()).toEqual([
      "Alpha prompt", // 10
      "Bravo prompt", // 20
      "Charlie prompt", // 30
    ]);
  });

  it("reverses direction when the same column is clicked twice", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(within(screen.getByRole("table")).getByText("Prompt"));
    expect(promptColumn()).toEqual([
      "Charlie prompt",
      "Bravo prompt",
      "Alpha prompt",
    ]);
  });
});

describe("QuestionManagement search", () => {
  it("matches on answers", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.type(
      screen.getByPlaceholderText("Search questions..."),
      "BVLOS",
    );
    expect(promptColumn()).toEqual(["Bravo prompt"]);
  });

  it("matches on the creating user's name", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.type(screen.getByPlaceholderText("Search questions..."), "milo");
    expect(promptColumn()).toEqual(["Bravo prompt"]);
  });

  it("tolerates a null questions list", () => {
    render(
      <QuestionManagement
        user={editor}
        questionsData={{ questions: null }}
        handleCreateQuestion={noop}
        handleUpdateQuestion={noop}
        handleDeleteQuestion={noop}
        editingQuestion={null}
        setEditingQuestion={noop}
      />,
    );
    // The design system renders an explicit empty-state row rather than an
    // empty body, so the assertion is on the message rather than a row count.
    expect(screen.getByText("No questions match.")).toBeInTheDocument();
  });
});

describe("QuestionManagement editing", () => {
  it("passes the edited question to the save handler", async () => {
    const user = userEvent.setup();
    const editing = questions[1];
    const { handleUpdateQuestion } = renderTable({ editingQuestion: editing });

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(handleUpdateQuestion).toHaveBeenCalledWith(editing.id, editing);
  });
});
