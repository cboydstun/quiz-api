import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "../data/DataTable";
import { Select } from "../forms/Select";
import { FlipCard } from "./FlipCard";
import { QuestionCard } from "./QuestionCard";

describe("DataTable", () => {
  it("renders headers and rows", () => {
    render(
      <DataTable
        columns={["Rank", "Operator", "Score"]}
        rows={[
          ["01", "chris", "3,720"],
          ["02", "dana", "3,110"],
        ]}
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Operator" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2
  });

  it("washes the highlighted row in signal", () => {
    render(
      <DataTable
        columns={["Rank", "Operator"]}
        rows={[
          ["01", "chris"],
          ["02", "dana"],
        ]}
        highlightIndex={1}
      />,
    );
    const rows = screen.getAllByRole("row");
    expect(rows[2].className).toContain("bg-signal-wash");
    expect(rows[1].className).not.toContain("bg-signal-wash");
  });

  it("shows the empty slot when there are no rows", () => {
    render(
      <DataTable columns={["Rank"]} rows={[]} empty="No runs recorded." />,
    );
    expect(screen.getByText("No runs recorded.")).toBeInTheDocument();
  });
});

describe("DataTable sorting", () => {
  const COLUMNS = [
    "#",
    { label: "Question Text", sortKey: "questionText" },
    { label: "Points", sortKey: "points" },
  ];

  it("makes only the sortable headers into controls", () => {
    render(<DataTable columns={COLUMNS} rows={[["01", "q", "5"]]} />);
    // No onSort handler: nothing is clickable yet.
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("reports the key of the clicked header", async () => {
    const onSort = vi.fn();
    render(
      <DataTable columns={COLUMNS} rows={[["01", "q", "5"]]} onSort={onSort} />,
    );
    await userEvent.click(screen.getByText("Question Text"));
    expect(onSort).toHaveBeenCalledWith("questionText");
  });

  it("keeps the header findable by its plain label while sorted", async () => {
    // The direction arrow is a nested element, so Testing Library still
    // matches the header on its own text. Management's tests depend on this.
    const onSort = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        rows={[["01", "q", "5"]]}
        sortKey="points"
        sortDir="desc"
        onSort={onSort}
      />,
    );
    await userEvent.click(screen.getByText("Points"));
    expect(onSort).toHaveBeenCalledWith("points");
  });

  it("announces the sorted column and direction", () => {
    const { rerender } = render(
      <DataTable
        columns={COLUMNS}
        rows={[["01", "q", "5"]]}
        sortKey="points"
        sortDir="asc"
        onSort={() => {}}
      />,
    );
    const headers = screen.getAllByRole("columnheader");
    expect(headers[2]).toHaveAttribute("aria-sort", "ascending");
    expect(headers[1]).toHaveAttribute("aria-sort", "none");
    expect(headers[0]).not.toHaveAttribute("aria-sort");

    rerender(
      <DataTable
        columns={COLUMNS}
        rows={[["01", "q", "5"]]}
        sortKey="points"
        sortDir="desc"
        onSort={() => {}}
      />,
    );
    expect(screen.getAllByRole("columnheader")[2]).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });
});

describe("Select", () => {
  it("is a native select, so options stay addressable", async () => {
    const onChange = vi.fn();
    render(
      <Select id="role" label="Role" defaultValue="USER" onChange={onChange}>
        <option value="USER">USER</option>
        <option value="ADMIN">ADMIN</option>
      </Select>,
    );

    const select = screen.getByLabelText(/role/i);
    expect(select.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "ADMIN" })).toBeInTheDocument();

    await userEvent.selectOptions(select, "ADMIN");
    expect(onChange).toHaveBeenCalled();
  });

  it("marks itself invalid on error", () => {
    render(
      <Select id="role" label="Role" error hint="Pick one">
        <option value="">--</option>
      </Select>,
    );
    expect(screen.getByLabelText(/role/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Pick one").className).toContain("text-abort");
  });
});

describe("QuestionCard", () => {
  const ANSWERS = ["400 feet AGL", "400 feet MSL", "500 feet AGL"];

  it("renders the question and one radio per answer", () => {
    render(
      <QuestionCard
        questionText="What is the maximum altitude?"
        answers={ANSWERS}
        index={3}
        total={10}
      />,
    );
    expect(
      screen.getByText("What is the maximum altitude?"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("reports the chosen answer", async () => {
    const onSelect = vi.fn();
    render(
      <QuestionCard
        questionText="What is the maximum altitude?"
        answers={ANSWERS}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: /400 feet AGL/ }));
    expect(onSelect).toHaveBeenCalledWith("400 feet AGL");
  });

  it("reddens the clock at ten seconds and under", () => {
    const { rerender } = render(
      <QuestionCard questionText="Q" timeRemaining={42} />,
    );
    expect(screen.getByText(/42s/).className).not.toContain("text-abort");

    rerender(<QuestionCard questionText="Q" timeRemaining={9} />);
    expect(screen.getByText(/09s/).className).toContain("text-abort");
  });

  it("zero-pads the run counter", () => {
    render(<QuestionCard questionText="Q" index={4} total={40} />);
    expect(screen.getByText("04")).toBeInTheDocument();
    expect(screen.getByText("4 / 40")).toBeInTheDocument();
  });
});

describe("FlipCard", () => {
  it("flips on click when uncontrolled", async () => {
    render(<FlipCard front="Maximum altitude?" back="400 feet AGL" />);
    const card = screen.getByRole("button");
    expect(card).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(card);
    expect(card).toHaveAttribute("aria-pressed", "true");
  });

  it("defers to the controlled flipped prop", async () => {
    const onFlip = vi.fn();
    render(<FlipCard front="Q" back="A" flipped onFlip={onFlip} />);
    const card = screen.getByRole("button");
    expect(card).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(card);
    expect(onFlip).toHaveBeenCalledOnce();
    expect(card).toHaveAttribute("aria-pressed", "true");
  });

  it("numbers multiple answers and shows the citation", () => {
    render(
      <FlipCard
        front="Q"
        back={["First", "Second"]}
        citation="14 CFR 107.51"
      />,
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("14 CFR 107.51")).toBeInTheDocument();
  });
});
