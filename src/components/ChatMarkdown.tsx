import { Fragment, type ReactNode } from "react";

/**
 * Minimal Markdown for chatbot replies: paragraphs, **bold**, *italic*, `code`,
 * headings, "---" rules, and bullet/numbered lists with one level of nesting.
 * Builds React elements only (no innerHTML), so replies can't inject markup.
 */

type ListBlock = { kind: "list"; ordered: boolean; start: number; items: ListItem[] };
type ListItem = { lines: string[]; children: ListBlock[] };
type Block =
  | ListBlock
  | { kind: "para"; lines: string[] }
  | { kind: "heading"; text: string }
  | { kind: "hr" };

const HR = /^\s*([-*_])(\s*\1){2,}\s*$/;
const ORDERED = /^(\s*)(\d+)[.)]\s+(.*)$/;
const BULLET = /^(\s*)[-*+•]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

const lastOf = <T,>(items: T[]): T | undefined => items[items.length - 1];

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  let inPara = false;

  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const last = blocks[blocks.length - 1];

    if (!line.trim()) {
      inPara = false;
      continue;
    }
    if (HR.test(line)) {
      blocks.push({ kind: "hr" });
      inPara = false;
      continue;
    }
    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({ kind: "heading", text: heading[1] ?? "" });
      inPara = false;
      continue;
    }

    const ordered = line.match(ORDERED);
    const bullet = ordered ? null : line.match(BULLET);
    if (ordered || bullet) {
      const indent = ((ordered ? ordered[1] : bullet?.[1]) ?? "").length;
      const isOrdered = Boolean(ordered);
      const text = (ordered ? ordered[3] : bullet?.[2]) ?? "";
      const start = ordered ? Number(ordered[2]) : 1;
      const item: ListItem = { lines: [text], children: [] };
      inPara = false;

      // Indented items nest under the previous top-level item.
      const parent = last?.kind === "list" ? lastOf(last.items) : undefined;
      if (indent >= 2 && parent) {
        const sub = lastOf(parent.children);
        if (sub && sub.ordered === isOrdered) sub.items.push(item);
        else parent.children.push({ kind: "list", ordered: isOrdered, start, items: [item] });
        continue;
      }
      // Blank lines between items don't break the list.
      if (last?.kind === "list" && last.ordered === isOrdered) last.items.push(item);
      else blocks.push({ kind: "list", ordered: isOrdered, start, items: [item] });
      continue;
    }

    // Indented text right after a list item continues that item.
    const lastItem = last?.kind === "list" ? lastOf(last.items) : undefined;
    if (/^\s{2,}/.test(raw) && lastItem) {
      const sub = lastOf(lastItem.children);
      const target = (sub && lastOf(sub.items)) ?? lastItem;
      target.lines.push(line.trim());
      continue;
    }

    if (inPara && last?.kind === "para") last.lines.push(line.trim());
    else blocks.push({ kind: "para", lines: [line.trim()] });
    inPara = true;
  }
  return blocks;
}

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*)/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null;
    if (
      (part.startsWith("**") && part.endsWith("**")) ||
      (part.startsWith("__") && part.endsWith("__"))
    ) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-background/60 px-1 py-0.5 text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function lines(ls: string[]): ReactNode {
  return ls.map((l, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {inline(l)}
    </Fragment>
  ));
}

function List({ block, nested = false }: { block: ListBlock; nested?: boolean }) {
  const className = `${block.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5 marker:text-muted-foreground ${
    nested ? "mt-1" : ""
  }`;
  const items = block.items.map((item, i) => (
    <li key={i}>
      {lines(item.lines)}
      {item.children.map((child, j) => (
        <List key={j} block={child} nested />
      ))}
    </li>
  ));
  return block.ordered ? (
    <ol start={block.start !== 1 ? block.start : undefined} className={className}>
      {items}
    </ol>
  ) : (
    <ul className={className}>{items}</ul>
  );
}

export function ChatMarkdown({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {parse(text).map((block, i) => {
        switch (block.kind) {
          case "hr":
            return <hr key={i} className="border-border" />;
          case "heading":
            return (
              <p key={i} className="font-semibold">
                {inline(block.text)}
              </p>
            );
          case "list":
            return <List key={i} block={block} />;
          default:
            return <p key={i}>{lines(block.lines)}</p>;
        }
      })}
    </div>
  );
}
