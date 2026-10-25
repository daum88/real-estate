'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { InAdsAddress } from '@/lib/types';

interface AddressSearchProps {
  onSelect: (address: InAdsAddress) => void;
  isLoading: boolean;
}

export default function AddressSearch({ onSelect, isLoading }: AddressSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<InAdsAddress[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestSeqRef = useRef(0);

  const searchAddresses = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Stale-response guard: only the latest request may update state.
    const seq = ++requestSeqRef.current;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://inaadress.maaamet.ee/inaadress/gazetteer?address=${encodeURIComponent(q)}&results=5`
      );
      if (!res.ok) throw new Error('Search failed');
      const raw = await res.json();
      if (seq !== requestSeqRef.current) return; // a newer request superseded us

      const results: InAdsAddress[] = Array.isArray(raw.addresses)
        ? raw.addresses.map((item: Record<string, unknown>) => {
            const tunnus = String(item.tunnus || '');
            const isBuildingEntry =
              item.liik === 'E' || item.liik === 'EHITISHOONE' || /^\d+$/.test(tunnus);
            return {
              adr_id: item.adr_id as number,
              address: (item.taisaadress || item.pikkaadress || item.aadresstekst) as string,
              katastritunnus:
                (item.katastritunnus as string) || (!isBuildingEntry ? tunnus : undefined),
              // Only use `tunnus` as an EHR code for building entries;
              // cadastral-unit entries carry the katastritunnus there instead.
              ehrCode: isBuildingEntry ? tunnus : undefined,
              x: Number(item.viitepunkt_x) || undefined,
              y: Number(item.viitepunkt_y) || undefined,
              lat: Number(item.viitepunkt_b) || undefined,
              lon: Number(item.viitepunkt_l) || undefined,
            };
          })
        : [];

      setSuggestions(results);
      setIsOpen(results.length > 0);
      setSelectedIndex(-1);
    } catch {
      if (seq === requestSeqRef.current) {
        setSuggestions([]);
        setIsOpen(false);
      }
    } finally {
      if (seq === requestSeqRef.current) setIsSearching(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddresses(val), 250);
  };

  const handleSelect = (address: InAdsAddress) => {
    setQuery(address.address);
    setIsOpen(false);
    setSuggestions([]);
    onSelect(address);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0 && selectedIndex >= 0) {
      handleSelect(suggestions[selectedIndex]);
    } else if (query.trim().length >= 2) {
      onSelect({ adr_id: 0, address: query.trim() });
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto">
      <div className="relative group">
        {/* Glassmorphism search bar */}
        <div className="
          absolute inset-0 rounded-2xl
          bg-gradient-to-r from-teal-200/30 via-teal-100/20 to-cyan-200/30
          blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500
        " />

        <div className="
          relative flex items-center
          bg-white/70 backdrop-blur-xl
          border border-teal-200/60
          rounded-2xl shadow-lg shadow-teal-900/5
          transition-all duration-300
          focus-within:border-teal-400/80
          focus-within:shadow-xl focus-within:shadow-teal-500/10
          focus-within:bg-white/90
        ">
          <div className="pl-5 pr-3">
            {isLoading || isSearching ? (
              <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-teal-400" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
            placeholder="Sisesta aadress... (nt Riia 2, Tartu)"
            disabled={isLoading}
            className="
              flex-1 py-4 pr-4 bg-transparent
              text-[15px] text-teal-900 placeholder:text-teal-300
              outline-none font-[family-name:var(--font-body)]
              disabled:opacity-50
            "
            autoComplete="off"
            spellCheck={false}
          />

          <button
            type="submit"
            disabled={isLoading || query.trim().length < 2}
            className="
              mr-2 px-5 py-2 rounded-xl
              bg-teal-600 text-white text-sm font-medium
              hover:bg-teal-700 active:scale-95
              transition-all duration-200
              disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
              shadow-md shadow-teal-900/10
            "
          >
            Otsi
          </button>
        </div>
      </div>

      {/* Dropdown suggestions */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="
              absolute top-full mt-2 left-0 right-0 z-50
              bg-white/90 backdrop-blur-xl
              border border-teal-100/80 rounded-2xl
              shadow-2xl shadow-teal-900/10
              overflow-hidden
            "
          >
            {suggestions.map((addr, i) => (
              <motion.button
                key={addr.adr_id}
                type="button"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                onClick={() => handleSelect(addr)}
                className={`
                  w-full flex items-center gap-3 px-5 py-3.5 text-left
                  transition-colors duration-150
                  font-[family-name:var(--font-body)] text-[14px]
                  ${i === selectedIndex
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-teal-700 hover:bg-teal-50/60'
                  }
                `}
              >
                <MapPin className="w-4 h-4 shrink-0 text-teal-400 mt-0.5" />
                <span className="leading-snug">{addr.address}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
