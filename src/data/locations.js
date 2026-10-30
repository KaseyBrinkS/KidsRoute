export const PRESET_LOCATIONS = [
  'RSM Battery Park',
  'Imagine Swimming',
  'Asphalt Green',
  'Manhattan Youth Tribeca',
  'Court16 Fidi',
  'Downtown Dance Factory',
  'Dance with Miss Rachel',
  'Renzo Gracie Jiu-Jitsu Wall Street',
  'Modern Martial Arts Tribeca',
  'ZPlaySchool Fidi',
  'Elite Gymnastics Tribeca',
  'Complete Playground',
  'Physique Swimming Fidi',
  'Wise Wonder Enrichment',
  'Spotlight Kids NY',
  'The Little Gym Tribeca',
  'KidStrong Soho',
  'KidStrong Battery Park',
  'My Gym Tribeca',
  'Playgarden Prep',
  'DSL Downtown Soccer League',
  'Downtown Baseball League',
  'Music Beans',
  'Riverside Music Studios Downtown',
  'Further Music School',
  'Cocoon Tribeca',
  'Church St School for Music and Art',
  'Socceroof Fidi',
  'Vivvi',
  'Downtown United Soccer Club',
  'Luna Performing Arts',
]

export function filterLocations(query, locations = PRESET_LOCATIONS) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return locations

  return locations.filter((location) => location.toLowerCase().includes(normalized))
}

export function matchesPresetLocation(name, locations = PRESET_LOCATIONS) {
  return locations.some((location) => location.toLowerCase() === name.trim().toLowerCase())
}
