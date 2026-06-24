"use client";

import Icon from "@/components/Icon";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

const SearchBar = ({ value, onChange, className }: Props) => (
  <label
    className={`flex h-10 items-center justify-between overflow-hidden rounded-xl bg-surface-01 pl-1 pr-2.5 py-1 ${className ?? ""}`}
  >
    <span className="sr-only">Search capabilities</span>
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg">
        <Icon className="!size-4 fill-secondary" name="search" aria-hidden="true" />
      </span>
      <input
        className="min-w-0 flex-1 bg-transparent text-body-md text-primary outline-none placeholder:text-secondary"
        type="search"
        name="capability-search"
        autoComplete="off"
        spellCheck={false}
        placeholder="Search…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
    <kbd className="key shrink-0" aria-hidden="true">
      ⌘&nbsp;K
    </kbd>
  </label>
);

export default SearchBar;
