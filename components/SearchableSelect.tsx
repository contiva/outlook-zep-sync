"use client";

import { useMemo } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from "@headlessui/react";
import { ChevronDown, Check, Loader2 } from "lucide-react";

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
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value]
  );

  // Display text for the button
  const displayText = useMemo(() => {
    if (disabled && disabledMessage) return disabledMessage;
    if (!selectedOption) return placeholder;
    return selectedOption.description
      ? `${selectedOption.label} - ${selectedOption.description}`
      : selectedOption.label;
  }, [selectedOption, disabled, disabledMessage, placeholder]);

  return (
    <Listbox
      value={selectedOption}
      onChange={(opt: SelectOption | null) => onChange(opt?.value ?? null)}
      disabled={disabled}
    >
      <div className={`relative ${className}`}>
        <ListboxButton
          className={`w-full rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm leading-5 text-left focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
            disabled ? "bg-gray-100 cursor-not-allowed text-gray-500" : "bg-white cursor-pointer"
          } ${!selectedOption ? "text-gray-500" : "text-gray-900"}`}
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
          className="z-[100] mt-1 max-h-60 w-[var(--button-width)] overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
          {/* Option zum Abwählen */}
          <ListboxOption
            value={null}
            className={({ focus }) =>
              `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                focus ? "bg-blue-600 text-white" : "text-gray-500"
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

          {options.map((option) => (
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
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
