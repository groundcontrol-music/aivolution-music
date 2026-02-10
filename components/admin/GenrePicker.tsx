'use client';

import { useState, useEffect, useRef } from 'react';

const MASTER_GENRES = [
  "Ambient", "Afrobeat", "Alternative Rock", "Bass House", "Blues", "Breakbeat", 
  "Chillout", "Classical", "Country", "Dancehall", "Deep House", "Disco", 
  "Drum & Bass", "Dubstep", "EDM", "Electro", "Experimental", "Folk", "Funk", 
  "Future Bass", "Garage", "Glitch", "Grime", "Hardstyle", "Hip Hop", "House", 
  "Indie", "Industrial", "Jazz", "Jungle", "K-Pop", "Latin", "Lo-Fi", "Metal", 
  "Minimal", "Nu-Disco", "Opera", "Piano", "Pop", "Progressive House", "Punk", 
  "R&B", "Reggae", "Reggaeton", "Rock", "Soul", "Synthwave", "Tech House", 
  "Techno", "Trance", "Trap", "Trip Hop", "World"
];

export default function GenrePicker() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    const filtered = MASTER_GENRES.filter(genre => 
      genre.toLowerCase().includes(query.toLowerCase())
    );
    setSuggestions(filtered);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const selectGenre = (genre: string) => {
    setQuery(genre);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <label className="text-xs font-black uppercase block mb-2">Genre (Smart Search)</label>
      
      <input
        type="text"
        name="genre"
        value={query}
        onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Tippe z.B. 'Tech'..."
        autoComplete="off"
        className="w-full p-3 border-4 border-black font-bold text-sm uppercase bg-white focus:outline-none focus:bg-gray-50 transition"
        required
      />

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          {suggestions.map((genre) => (
            <li 
              key={genre}
              onClick={() => selectGenre(genre)}
              className="px-4 py-2 font-bold uppercase hover:bg-red-600 hover:text-white cursor-pointer transition-colors text-sm border-b border-gray-100 last:border-0"
            >
              {genre}
            </li>
          ))}
        </ul>
      )}
      
      {query && suggestions.length === 0 && isOpen && (
          <div className="absolute left-0 right-0 mt-1 p-2 bg-black text-white text-[10px] font-bold uppercase">
              Neues Genre: &quot;{query}&quot; wird erstellt.
          </div>
      )}
    </div>
  );
}