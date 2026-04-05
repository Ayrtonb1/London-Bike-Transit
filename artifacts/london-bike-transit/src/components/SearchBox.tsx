import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearchPlaces, getSearchPlacesQueryKey } from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";
import type { Place } from "@workspace/api-client-react/src/generated/api.schemas";

interface SearchBoxProps {
  placeholder: string;
  onSelect: (place: Place) => void;
  value?: Place | null;
}

export function SearchBox({ placeholder, onSelect, value }: SearchBoxProps) {
  const [query, setQuery] = useState(value?.name || "");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: places, isLoading } = useSearchPlaces(
    { query: debouncedQuery },
    {
      query: {
        enabled: debouncedQuery.length >= 2,
        queryKey: getSearchPlacesQueryKey({ query: debouncedQuery }),
      },
    }
  );

  useEffect(() => {
    if (value) {
      setQuery(value.name);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 h-12 bg-background border-border text-lg shadow-sm"
        />
      </div>

      {isOpen && debouncedQuery.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Searching...</div>
          ) : places && places.length > 0 ? (
            <ul className="py-1">
              {places.map((place) => (
                <li
                  key={place.id}
                  className="px-4 py-3 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => {
                    onSelect(place);
                    setQuery(place.name);
                    setIsOpen(false);
                  }}
                >
                  <div className="font-medium">{place.name}</div>
                  {place.address && (
                    <div className="text-sm text-muted-foreground truncate">{place.address}</div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-sm text-muted-foreground text-center">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
