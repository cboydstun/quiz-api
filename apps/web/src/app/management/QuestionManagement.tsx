"use client";

import React, { useState, useMemo } from "react";
import { joinAnswers, splitAnswers } from "@/lib/questions";
import type { Question, User } from "@/types";
import {
  Button,
  DataTable,
  Label,
  Panel,
  TextField,
  type DataTableColumn,
  type SortDirection,
} from "@/components/ds";

type SortField =
  | "prompt"
  | "questionText"
  | "answers"
  | "correctAnswer"
  | "hint"
  | "explanation"
  | "points"
  | "domain"
  | "createdBy";

// Explicit label -> sort field mapping. Deriving the field from the label
// silently broke every multi-word column ("Question Text" -> "questiontext").
const COLUMNS: { label: string; field: SortField | null }[] = [
  { label: "Prompt", field: "prompt" },
  { label: "Question Text", field: "questionText" },
  { label: "Answers", field: "answers" },
  { label: "Correct Answer", field: "correctAnswer" },
  { label: "Hint", field: "hint" },
  { label: "Explanation", field: "explanation" },
  { label: "Points", field: "points" },
  { label: "Domain", field: "domain" },
  { label: "Created By", field: "createdBy" },
  { label: "Actions", field: null },
];

/** The editable columns, in the order they appear in the table. */
const EDITABLE_FIELDS = [
  "prompt",
  "questionText",
  "answers",
  "correctAnswer",
  "hint",
  "explanation",
  "points",
  "domain",
] as const;

interface QuestionManagementProps {
  user: User;
  questionsData?: { questions: Question[] | null };
  handleCreateQuestion: (event: React.FormEvent<HTMLFormElement>) => void;
  handleUpdateQuestion: (id: string, updatedQuestion: Question) => void;
  handleDeleteQuestion: (id: string) => void;
  editingQuestion: Question | null;
  setEditingQuestion: (question: Question | null) => void;
}

const QuestionManagement: React.FC<QuestionManagementProps> = ({
  questionsData,
  handleCreateQuestion,
  handleUpdateQuestion,
  handleDeleteQuestion,
  editingQuestion,
  setEditingQuestion,
}) => {
  const [sortField, setSortField] = useState<SortField>("prompt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field as SortField);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedQuestions = useMemo(() => {
    const filtered = (questionsData?.questions ?? []).filter((question) => {
      const searchLower = searchQuery.toLowerCase();
      return Object.entries(question).some(([key, value]) => {
        if (key === "createdBy") {
          return question.createdBy?.username
            ?.toLowerCase()
            .includes(searchLower);
        }
        if (key === "answers") {
          return question.answers.some((answer) =>
            answer.toLowerCase().includes(searchLower),
          );
        }
        return String(value).toLowerCase().includes(searchLower);
      });
    });

    return filtered.sort((a, b) => {
      let aValue: string | number = a[sortField] as string | number;
      let bValue: string | number = b[sortField] as string | number;

      if (sortField === "answers") {
        aValue = a.answers.join(", ");
        bValue = b.answers.join(", ");
      } else if (sortField === "createdBy") {
        aValue = a.createdBy?.username ?? "";
        bValue = b.createdBy?.username ?? "";
      } else if (sortField === "domain") {
        // Unclassified questions sort last rather than jumbling with "".
        aValue = a.domain ?? "￿";
        bValue = b.domain ?? "￿";
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [questionsData, searchQuery, sortField, sortDirection]);

  const isEditableField = (
    key: string,
  ): key is (typeof EDITABLE_FIELDS)[number] =>
    (EDITABLE_FIELDS as readonly string[]).includes(key);

  const renderCellContent = (
    question: Question,
    field: string,
  ): React.ReactNode => {
    if (!isEditableField(field)) return "";

    if (editingQuestion?.id === question.id) {
      return (
        <input
          type={field === "points" ? "number" : "text"}
          aria-label={field}
          value={
            field === "answers"
              ? joinAnswers(editingQuestion.answers)
              : String(editingQuestion[field] ?? "")
          }
          onChange={(e) => {
            const raw = e.target.value;
            const parsedPoints = parseInt(raw, 10);
            setEditingQuestion({
              ...editingQuestion,
              [field]:
                field === "answers"
                  ? splitAnswers(raw)
                  : field === "points"
                    ? // An emptied number input yields NaN, which the backend
                      // rejects and React warns about as an uncontrolled value.
                      Number.isNaN(parsedPoints)
                      ? 0
                      : parsedPoints
                    : raw,
            });
          }}
          className="w-full border border-line-hairline bg-ink-950 px-2 py-1 font-mono text-sm tracking-mono text-bone-100 outline-hidden transition-fast focus:border-signal focus:shadow-glow-focus"
        />
      );
    }

    if (field === "answers") return joinAnswers(question.answers);
    if (field === "domain") {
      return (
        question.domain ?? (
          <span className="font-mono text-3xs uppercase tracking-label text-mute-600">
            Unassigned
          </span>
        )
      );
    }
    return String(question[field] ?? "");
  };

  const columns: Array<string | DataTableColumn> = COLUMNS.map((col) =>
    col.field ? { label: col.label, sortKey: col.field } : col.label,
  );

  const rows = filteredAndSortedQuestions.map((question) => [
    ...EDITABLE_FIELDS.map((field) => renderCellContent(question, field)),
    question.createdBy?.username ?? "—",
    <div key="actions" className="flex gap-2">
      {editingQuestion?.id === question.id ? (
        <Button
          variant="go"
          size="sm"
          onClick={() => handleUpdateQuestion(question.id, editingQuestion)}
        >
          Save
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditingQuestion(question)}
        >
          Edit
        </Button>
      )}
      <Button
        variant="abort"
        size="sm"
        onClick={() => handleDeleteQuestion(question.id)}
      >
        Delete
      </Button>
    </div>,
  ]);

  return (
    <div>
      <Panel label="New Item" tag="///" padding="lg" className="mb-px">
        <form onSubmit={handleCreateQuestion}>
          <TextField
            name="prompt"
            label="Prompt"
            placeholder="Prompt"
            required
          />
          <TextField
            name="questionText"
            label="Question Text"
            placeholder="Question Text"
            required
          />
          <TextField
            name="answers"
            label="Answers"
            placeholder="Answers (comma-separated)"
            hint="Comma-separated"
            required
          />
          <TextField
            name="correctAnswer"
            label="Correct Answer"
            placeholder="Correct Answer"
            required
          />
          <TextField name="hint" label="Hint" placeholder="Hint (optional)" />
          {/*
            Shown after a run is graded, and on the public /practice pages.
            Distinct from the hint, which is offered before answering and must
            not give the answer away.
          */}
          <TextField
            name="explanation"
            label="Explanation"
            placeholder="Why the correct answer is correct (optional)"
            hint="Shown after grading and on the public practice pages"
          />
          <TextField
            name="points"
            label="Points"
            type="number"
            min={1}
            placeholder="Points"
            required
          />
          <TextField
            name="domain"
            label="Domain"
            placeholder="Regulations"
            hint="Optional — drives the per-domain accuracy breakdown"
          />
          <Button type="submit" variant="signal" size="md" fullWidth>
            Create Question
          </Button>
        </form>
      </Panel>

      <Panel
        label="Question Bank"
        meta={`${filteredAndSortedQuestions.length} records`}
        padding="none"
      >
        <div className="border-b border-line-hairline p-4">
          <Label className="mb-2">Search</Label>
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full border border-line-hairline bg-ink-950 px-3.5 py-3 font-mono text-sm tracking-mono text-bone-100 placeholder:text-mute-600 outline-hidden transition-fast focus:border-signal focus:shadow-glow-focus"
          />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          sortKey={sortField}
          sortDir={sortDirection}
          onSort={handleSort}
          empty="No questions match."
        />
      </Panel>
    </div>
  );
};

export default QuestionManagement;
