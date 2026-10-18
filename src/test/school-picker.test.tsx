import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SchoolPicker, filterSchools } from "@/components/SchoolPicker";
import { SCHOOL_REGISTRY } from "@/lib/school-demo";

const ids = (query: string) => filterSchools(SCHOOL_REGISTRY, query).map((s) => s.id);
const KOUSERI = "School Bravo";

describe("SchoolPicker searchable registry dropdown", () => {
  it("finds the schools the brief asks to test", () => {
    expect(ids("Kousseri")).toEqual(["s2"]);
    expect(ids("Mbalmayo")).toEqual(["s1"]);
    expect(ids("Centre")).toEqual(["s1"]);
  });

  it("is case-insensitive and matches partial words, communities, regions and registration IDs", () => {
    expect(ids("KOUSSERI")).toEqual(["s2"]);
    expect(ids("kOuSsErI bra")).toEqual(["s2"]);
    expect(ids("BRAVO")).toEqual(["s2"]);
    expect(ids("  balm  ")).toEqual(["s1"]);
    expect(ids("buea char")).toEqual(["s3"]);
    expect(ids("far north")).toEqual(["s2"]);
    expect(ids("cn-demo-004")).toEqual(["s4"]);
    expect(ids("school")).toHaveLength(5);
  });

  it("lists all five registered schools when nothing is typed and none when nothing matches", () => {
    expect(ids("")).toHaveLength(5);
    expect(ids("   ")).toHaveLength(5);
    expect(ids("Kribi")).toHaveLength(0);
  });

  it("filters as the user types, shows community and region, and reports the chosen school", () => {
    const onChange = vi.fn();
    render(<SchoolPicker schools={SCHOOL_REGISTRY} value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Mbalmayo" } });
    const option = screen.getByRole("option");
    expect(option).toHaveTextContent("School Alpha");
    expect(option).toHaveTextContent("Mbalmayo");
    expect(option).toHaveTextContent("Centre");
    fireEvent.mouseDown(option);
    expect(onChange).toHaveBeenLastCalledWith("s1");
  });

  it("says so when no registered school matches", () => {
    render(<SchoolPicker schools={SCHOOL_REGISTRY} value="" onChange={() => {}} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Kribi" } });
    expect(screen.getByText("No registered schools found.")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("keeps the chosen school in the field and clears the choice as soon as the text is edited again", () => {
    const onChange = vi.fn();
    render(<SchoolPicker schools={SCHOOL_REGISTRY} value="s2" onChange={onChange} />);
    expect(screen.getByRole("combobox")).toHaveValue(KOUSERI);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Kousseri" } });
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("selects a filtered school with the keyboard", () => {
    const onChange = vi.fn();
    render(<SchoolPicker schools={SCHOOL_REGISTRY} value="" onChange={onChange} />);
    const box = screen.getByRole("combobox");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(box).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("s2");
  });
});
