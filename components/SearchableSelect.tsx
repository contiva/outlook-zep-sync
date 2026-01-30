"use client";

import { useState, useMemo } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from "@headlessui/react";
import { ChevronDown, Check, Search } from "lucide-react";

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
  className?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "-- Auswählen --",
  disabled = false,
  disabledMessage,
  className = "",
}: SearchableSelectProps) {
  const [query, setQuery] = useState("");

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (query === "") return options;
    const lowerQuery = query.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lowerQuery) ||
        (opt.description && opt.description.toLowerCase().includes(lowerQuery))
    );
  }, [options, query]);

  return (
    <Combobox
      value={selectedOption}
      onChange={(opt: SelectOption | null) => onChange(opt?.value ?? null)}
      disabled={disabled}
    >
      <div className={`relative ${className}`}>
        <div className="relative">
          <ComboboxInput
            className={`w-full rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm leading-5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
              disabled ? "bg-gray-100 cursor-not-allowed text-gray-500" : "bg-white"
            }`}
            displayValue={(option: SelectOption | null) =>
              option
                ? option.description
                  ? `${option.label} - ${option.description}`
                  : option.label
                : ""
            }
            onChange={(event) => setQuery(event.target.value)}
            placeholder={disabled && disabledMessage ? disabledMessage : placeholder}
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown
              className={`h-5 w-5 ${disabled ? "text-gray-300" : "text-gray-400"}`}
              aria-hidden="true"
            />
          </ComboboxButton>
        </div>

        <ComboboxOptions
          anchor="bottom start"
          className="z-[100] mt-1 max-h-60 w-[var(--input-width)] overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
          {filteredOptions.length === 0 && query !== "" ? (
            <div className="relative cursor-default select-none px-4 py-2 text-gray-500">
              <div className="flex items-center gap-2">
                <Search size={14} />
                Keine Treffer für "{query}"
              </div>
            </div>
          ) : (
            <>
              {/* Option zum Abwählen */}
              <ComboboxOption
                value={null}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? "bg-blue-600 text-white" : "text-gray-500"
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
              </ComboboxOption>

              {filteredOptions.map((option) => (
                <ComboboxOption
                  key={option.value}
                  value={option}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                      active ? "bg-blue-600 text-white" : "text-gray-900"
                    }`
                  }
                >
                  {({ selected, active }) => (
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
                              active ? "text-blue-200" : "text-gray-500"
                            }`}
                          >
                            {option.description}
                          </span>
                        )}
                      </div>
                      {selected && (
                        <span
                          className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                            active ? "text-white" : "text-blue-600"
                          }`}
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  )}
                </ComboboxOption>
              ))}
            </>
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}
