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
  /** Show only label in button (no description), dropdown still shows both */
  compact?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Auswählen",
  disabled = false,
  disabledMessage,
  loading = false,
  className = "",
  compact = false,
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
    if (compact) return selectedOption.label;
    return selectedOption.description
      ? `${selectedOption.label} - ${selectedOption.description}`
      : selectedOption.label;
  }, [selectedOption, disabled, disabledMessage, placeholder, compact]);

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
              className={`w-full rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm leading-5 text-left focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                disabled ? "bg-gray-50 cursor-not-allowed text-gray-300 opacity-40" : "bg-white cursor-pointer"
              } ${disabled ? "" : (!selectedOption ? "text-gray-500" : "text-gray-900")}`}
            >
              <span className="block truncate">{displayText}</span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                {loading ? (
                  <Loader2
                    className="h-5 w-5 text-blue-500 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronDown
                    className={`h-5 w-5 ${disabled ? "text-gray-300" : "text-gray-400"}`}
                    aria-hidden="true"
                  />
                )}
              </span>
            </ListboxButton>

            <ListboxOptions
              anchor="bottom start"
              style={compact ? undefined : { width: 'calc(var(--button-width) * 1.5)' }}
              className={`z-[100] mt-1 max-h-72 rounded-lg bg-white text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none min-w-[var(--button-width)] ${compact ? "w-max max-w-80" : ""}`}
            >
              {/* Search input */}
              {showSearch && (
                <div className="sticky top-0 bg-white px-2 py-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Suchen..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        // Let arrow keys and Enter through for Listbox navigation
                        if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) return;
                        e.stopPropagation();
                      }}
                    />
                  </div>
                </div>
              )}
              
              <div className="overflow-auto max-h-52 py-1">
                {/* Option zum Abwählen - nur wenn nicht gesucht wird */}
                {/* Null-Option entfernt — Placeholder wird nur im Button angezeigt */}

                {/* Filtered options */}
                {filteredOptions.map((option) => (
                  <ListboxOption
                    key={option.value}
                    value={option}
                    className={({ focus }) =>
                      `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                        focus ? "bg-blue-600 text-white" : "text-gray-900"
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
                                focus ? "text-blue-200" : "text-gray-500"
                              }`}
                            >
                              {option.description}
                            </span>
                          )}
                        </div>
                        {selected && (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              focus ? "text-white" : "text-blue-600"
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
                  <div className="py-2 px-4 text-gray-500 text-center">
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
