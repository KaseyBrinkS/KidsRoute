import { useEffect, useRef, useState } from 'react'
import { filterLocations, matchesPresetLocation } from '../data/locations'

const inputClass =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

export default function LocationSearch({ value, onChange }) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const filtered = filterLocations(query)
  const trimmedQuery = query.trim()
  const showCustomOption =
    trimmedQuery.length > 0 && !matchesPresetLocation(trimmedQuery)

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectPreset(name) {
    onChange({ name, pendingReview: false })
    setQuery(name)
    setOpen(false)
  }

  function selectCustom() {
    onChange({ name: trimmedQuery, pendingReview: true })
    setQuery(trimmedQuery)
    setOpen(false)
  }

  function clearSelection() {
    onChange(null)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor="locationSearch" className="block text-sm font-medium text-gray-700">
        Location
      </label>

      {value ? (
        <div className="mt-1 flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{value.name}</p>
            {value.pendingReview && (
              <p className="text-xs text-amber-700">Submitted for review</p>
            )}
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            id="locationSearch"
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search for a location…"
            className={`mt-1 ${inputClass}`}
            autoComplete="off"
          />

          {open && (filtered.length > 0 || showCustomOption) && (
            <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
              {filtered.map((location) => (
                <li key={location}>
                  <button
                    type="button"
                    onClick={() => selectPreset(location)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-indigo-50"
                  >
                    {location}
                  </button>
                </li>
              ))}

              {showCustomOption && (
                <li className="border-t border-gray-100">
                  <button
                    type="button"
                    onClick={selectCustom}
                    className="w-full px-3 py-2 text-left hover:bg-amber-50"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      Add &ldquo;{trimmedQuery}&rdquo; as custom location
                    </span>
                    <span className="mt-0.5 block text-xs text-amber-700">
                      This location will be submitted for review
                    </span>
                  </button>
                </li>
              )}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
