"use client";

import { useMemo, useState, useRef } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from "@headlessui/react";
import { ChevronDown, Check, Loader2, Search } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: string;
  description?: string | null;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledMessage?: string;
  loading?: boolean;
  className?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "-- Auswählen --",
  disabled = false,
  disabledMessage,
  loading = false,
  className = "",
}: SearchableSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value]
  );

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.description && opt.description.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);

  // Display text for the button
  const displayText = useMemo(() => {
    if (disabled && disabledMessage) return disabledMessage;
    if (!selectedOption) return placeholder;
    return selectedOption.description
      ? `${selectedOption.label} - ${selectedOption.description}`
      : selectedOption.label;
  }, [selectedOption, disabled, disabledMessage, placeholder]);

  // Show search only if there are more than 3 options
  const showSearch = options.length > 3;

  return (
    <Listbox
      value={selectedOption}
      onChange={(opt: SelectOption | null) => {
        onChange(opt?.value ?? null);
        setSearchQuery("");
      }}
      disabled={disabled}
    >
      {({ open }) => {
        // Focus search input when dropdown opens
        if (open && showSearch) {
          setTimeout(() => searchInputRef.current?.focus(), 10);
        }
        if (!open && searchQuery) {
          setTimeout(() => setSearchQuery(""), 0);
        }
        
        return (
          <div className={`relative ${className}`}>
            <ListboxButton
              className={`w-full rounded-lg border border-border py-2 pl-3 pr-10 text-sm leading-5 text-left focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition ${
                disabled ? "bg-muted-foreground/10 cursor-not-allowed text-muted-foreground" : "bg-card cursor-pointer hover:border-muted"
              } ${disabled ? "" : (!selectedOption ? "text-muted-foreground" : "text-foreground")}`}
            >
              <span className="block truncate">{displayText}</span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                {loading ? (
                  <Loader2
                    className="h-5 w-5 text-primary animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronDown
                    className={`h-5 w-5 ${disabled ? "text-muted-foreground/50" : "text-muted-foreground"}`}
                    aria-hidden="true"
                  />
                )}
              </span>
            </ListboxButton>

            <ListboxOptions
              anchor="bottom start"
              className="z-[100] mt-1 max-h-72 w-[var(--button-width)] rounded-xl bg-card text-sm shadow-xl border border-border focus:outline-none"
            >
              {/* Search input */}
              {showSearch && (
                <div className="sticky top-0 bg-card px-2 py-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Suchen..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background text-foreground placeholder:text-muted-foreground"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}
              
              <div className="overflow-auto max-h-52 py-1">
                {/* Option zum Abwählen - nur wenn nicht gesucht wird */}
                {!searchQuery && (
                  <ListboxOption
                    value={null}
                    className={({ focus }) =>
                      `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                        focus ? "bg-primary text-white" : "text-muted-foreground"
                      }`
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span className="block truncate italic">{placeholder}</span>
                        {selected && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </ListboxOption>
                )}

                {/* Filtered options */}
                {filteredOptions.map((option) => (
                  <ListboxOption
                    key={option.value}
                    value={option}
                    className={({ focus }) =>
                      `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                        focus ? "bg-primary text-white" : "text-foreground"
                      }`
                    }
                  >
                    {({ selected, focus }) => (
                      <>
                        <div className="flex flex-col">
                          <span
                            className={`block ${
                              selected ? "font-semibold" : "font-normal"
                            }`}
                          >
                            {option.label}
                          </span>
                          {option.description && (
                            <span
                              className={`block text-xs ${
                                focus ? "text-white/70" : "text-muted-foreground"
                              }`}
                            >
                              {option.description}
                            </span>
                          )}
                        </div>
                        {selected && (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              focus ? "text-white" : "text-primary"
                            }`}
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </ListboxOption>
                ))}

                {/* No results message */}
                {searchQuery && filteredOptions.length === 0 && (
                  <div className="py-3 px-4 text-muted-foreground text-center text-sm">
                    Keine Ergebnisse
                  </div>
                )}
              </div>
            </ListboxOptions>
          </div>
        );
      }}
    </Listbox>
  );
}
