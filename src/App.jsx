import { useState, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import SidebarTabs from './components/SidebarTabs'
import Leaderboard from './components/Leaderboard'
import Footer from './components/Footer'

function App() {
  const [data, setData] = useState(null)
  const [originalAthletes, setOriginalAthletes] = useState([])
  const [simulatedAthletes, setSimulatedAthletes] = useState([])
  const [currentView, setCurrentView] = useState('original')
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [selectedEvent, setSelectedEvent] = useState('')
  const [selectedPlace, setSelectedPlace] = useState('')
  const [upToEvent, setUpToEvent] = useState('') // New state for "up to event"
  const [directlyModifiedAthletes, setDirectlyModifiedAthletes] = useState(new Set()) // Track athletes directly modified
  const [activeGapChanges, setActiveGapChanges] = useState(new Map()) // Track active gap changes by gapId
  const [loading, setLoading] = useState(true)
  const [selectedGender, setSelectedGender] = useState('men') // New state for gender selection
  const [selectedYear, setSelectedYear] = useState('Latest') // New state for year selection
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false) // New state for sidebar collapse
  const [eventPointMap, setEventPointMap] = useState({}) // Per-event place→points map derived from data
  const [originalEventPoints, setOriginalEventPoints] = useState({}) // Exact points observed per event/place in the source data

  useEffect(() => {
    loadData()
  }, [selectedGender, selectedYear])

  // Reset state when gender or year changes
  useEffect(() => {
    setSelectedAthlete('')
    setSelectedEvent('')
    setSelectedPlace('')
    setUpToEvent('')
    setDirectlyModifiedAthletes(new Set())
    setActiveGapChanges(new Map())
    setCurrentView('original')
  }, [selectedGender, selectedYear])

  const loadData = async () => {
    try {
      setLoading(true)
      console.log(`Loading ${selectedGender} data for year: ${selectedYear}...`)

      const urlsToTry = []
      if (selectedYear && selectedYear !== 'Latest') {
        urlsToTry.push(`${import.meta.env.BASE_URL}${selectedYear}_leaderboard_data-${selectedGender}.json`)
      }
      // Always try the default ("Latest") file as a fallback
      urlsToTry.push(`${import.meta.env.BASE_URL}leaderboard_data-${selectedGender}.json`)

      let jsonData = null
      let lastError = null
      for (const url of urlsToTry) {
        try {
          const resp = await fetch(url)
          if (!resp.ok) {
            lastError = new Error(`Failed to load data from ${url} (status ${resp.status})`)
            continue
          }
          jsonData = await resp.json()
          break
        } catch (err) {
          lastError = err
        }
      }

      if (!jsonData) {
        throw lastError || new Error('Failed to load leaderboard data')
      }
      // Build or use provided event point scales
      const derivedEventPointMap = jsonData.event_point_map || buildEventPointMap(jsonData)

      const dataWithEventMap = { ...jsonData, event_point_map: derivedEventPointMap }

      console.log(`${selectedGender} data loaded successfully:`, dataWithEventMap)
      setData(dataWithEventMap)
      setEventPointMap(derivedEventPointMap)

      // Create deep copies for original and simulated data
      setOriginalAthletes(JSON.parse(JSON.stringify(dataWithEventMap.athletes)))
      setSimulatedAthletes(JSON.parse(JSON.stringify(dataWithEventMap.athletes)))

      // Build a per-event exact place→points table from the original data for scoring during simulations
      setOriginalEventPoints(buildOriginalEventPoints(dataWithEventMap.athletes, dataWithEventMap.events))
      setLoading(false)
      console.log('App initialized successfully')
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  const isYear2024 = () => String(selectedYear) === '2024'
  const isLazar = (name) => {
    if (!name) return false
    const n = String(name).toLowerCase()
    return n === 'lazar đukić' || n === 'lazar dukic' || n === 'lazar djukic'
  }

  // Athletes that originally have rank < 1 (including 0 and -1) are excluded from any re-ranking
  const isExcludedFromRerank = (athleteName) => {
    const original = originalAthletes.find(a => a.name === athleteName)
    return original && typeof original.rank === 'number' && original.rank < 1
  }

  // Build per-event scoring table from provided athlete results
  const buildEventPointMap = (loadedData) => {
    if (!loadedData?.events || !loadedData?.athletes) return {}
    const map = {}
    for (const eventName of loadedData.events) {
      map[eventName] = {}
    }
    for (const athlete of loadedData.athletes) {
      // Skip athletes excluded from re-ranking (rank < 1)
      if (typeof athlete.rank === 'number' && athlete.rank < 1) continue
      if (!athlete.events) continue
      for (const [eventName, eventResult] of Object.entries(athlete.events)) {
        if (!eventResult) continue
        const placeStr = getPlaceString(eventResult.place)
        // Prefer higher points if duplicates appear for safety
        const prev = map[eventName]?.[placeStr]
        if (prev === undefined || (typeof eventResult.points === 'number' && eventResult.points > prev)) {
          map[eventName][placeStr] = typeof eventResult.points === 'number' ? eventResult.points : 0
        }
      }
    }
    return map
  }

  // Build exact observed points per event/place from the original dataset
  const buildOriginalEventPoints = (athletesSource, eventsList) => {
    if (!athletesSource || !eventsList) return {}
    const map = {}
    for (const eventName of eventsList) {
      map[eventName] = {}
    }
    for (const athlete of athletesSource) {
      if (typeof athlete.rank === 'number' && athlete.rank < 1) continue
      if (!athlete?.events) continue
      for (const [eventName, result] of Object.entries(athlete.events)) {
        if (!result) continue
        const placeStr = getPlaceString(result.place)
        if (map[eventName][placeStr] === undefined) {
          map[eventName][placeStr] = typeof result.points === 'number' ? result.points : 0
        }
      }
    }
    return map
  }

  const getPointsFor = (eventName, place) => {
    // 1) Use observed finish order (handles sliding scales, ties, cuts)
    const finishes = data?.event_finish_order?.[eventName]
    if (Array.isArray(finishes)) {
      // Prefer exact matching place (not index), and ignore excluded athletes by name if available
      const filtered = finishes.filter(r => !r?.name || !isExcludedFromRerank(r.name))
      const rowByPlace = filtered.find(r => Number(r?.place) === Number(place))
      if (rowByPlace && typeof rowByPlace.points === 'number' && rowByPlace.points > 0) {
        return rowByPlace.points
      }
    }
    // 2) Fallback: exact observed points per place built from athlete results
    const placeStr = getPlaceString(place)
    if (originalEventPoints?.[eventName]?.[placeStr] !== undefined) {
      const val = originalEventPoints[eventName][placeStr]
      if (typeof val === 'number' && val > 0) return val
    }
    // 2b) Dynamic fallback: derive from originalAthletes on the fly
    if (Array.isArray(originalAthletes)) {
      const rows = originalAthletes
        .map(a => a.events?.[eventName])
        .filter(Boolean)
      // Try exact place match, take max points > 0 among matches
      const exactMatches = rows.filter(r => Number(r.place) === Number(place))
      const maxExact = exactMatches.reduce((m, r) => (typeof r.points === 'number' ? Math.max(m, r.points) : m), 0)
      if (maxExact > 0) return maxExact
      // As a last resort, use the maximum points observed in the event when place=1
      if (Number(place) === 1) {
        const maxAny = rows.reduce((m, r) => (typeof r.points === 'number' ? Math.max(m, r.points) : m), 0)
        if (maxAny > 0) return maxAny
      }
    }
    // 3) Fallback: derived event map
    const byEvent = (data?.event_point_map || eventPointMap || {})
    if (byEvent?.[eventName]?.[placeStr] !== undefined) {
      const val = byEvent[eventName][placeStr]
      if (typeof val === 'number' && val > 0) return val
    }
    // 4) Legacy fallback if available
    if (data?.point_system?.[placeStr] !== undefined) return data.point_system[placeStr]
    return 0
  }

  // Calculate rankings up to a specific event
  const calculateRankingsUpToEvent = (athletes, eventName) => {
    if (!eventName || !data) return athletes

    const eventIndex = data.events.indexOf(eventName)
    if (eventIndex === -1) return athletes

    // Get events up to the selected event
    const eventsUpTo = data.events.slice(0, eventIndex + 1)

    // Calculate cumulative points for each athlete up to the selected event
    const athletesWithCumulativePoints = athletes.map(athlete => {
      let cumulativePoints = 0
      const eventsUpToData = {}

      eventsUpTo.forEach(event => {
        if (athlete.events[event]) {
          cumulativePoints += athlete.events[event].points
          eventsUpToData[event] = athlete.events[event]
        }
      })

      return {
        ...athlete,
        total_points: cumulativePoints,
        events: eventsUpToData
      }
    })

    // Split into included and excluded for re-ranking
    const excluded = athletesWithCumulativePoints.filter(a => isExcludedFromRerank(a.name))
    let included = athletesWithCumulativePoints.filter(a => !isExcludedFromRerank(a.name))

    // Sort included by cumulative points
    let sortedAthletes = included.sort((a, b) => b.total_points - a.total_points)

    // Anchor Lazar at original rank for 2024
    if (isYear2024()) {
      const originalLazar = originalAthletes.find(a => isLazar(a.name))
      if (originalLazar) {
        const lazarIdx = sortedAthletes.findIndex(a => isLazar(a.name))
        if (lazarIdx !== -1) {
          const lazar = sortedAthletes.splice(lazarIdx, 1)[0]
          const insertIdx = Math.max(0, (originalLazar.rank || 1) - 1)
          sortedAthletes.splice(insertIdx, 0, lazar)
        }
      }
    }

    const rankedIncluded = sortedAthletes.map((athlete, index) => ({
      ...athlete,
      rank: index + 1
    }))

    // Excluded remain unranked (-1)
    const finalExcluded = excluded.map(a => ({ ...a, rank: -1 }))

    return [...rankedIncluded, ...finalExcluded]
  }

  // Function to update event rankings when an athlete's place changes
  const updateEventRankings = (athletes, eventName, athleteName, newPlace, newTime = null, isDirectChange = false) => {
    // Never modify Lazar in 2024
    if (isYear2024() && isLazar(athleteName)) {
      return athletes
    }
    // Don't modify excluded athletes
    if (isExcludedFromRerank(athleteName)) {
      return athletes
    }
    const placeString = getPlaceString(newPlace)
    const newPoints = getPointsFor(eventName, newPlace)

    // Get all athletes who participated in this event
    const eventParticipants = athletes.filter(a => a.events[eventName] && !isExcludedFromRerank(a.name))

    // Find the athlete being updated
    const targetAthlete = eventParticipants.find(a => a.name === athleteName)
    if (!targetAthlete) return athletes

    const oldPlace = targetAthlete.events[eventName].place
    const oldPoints = targetAthlete.events[eventName].points

    // If the place hasn't changed, no need to update
    if (oldPlace === newPlace) return athletes

    // Calculate points change
    const pointsChange = newPoints - oldPoints

    // Track which athletes were directly modified vs indirectly affected
    const affectedAthletes = new Set()
    if (isDirectChange) {
      affectedAthletes.add(athleteName)
    }

    // Update all athletes' event rankings
    const updatedAthletes = athletes.map(athlete => {
      if (!athlete.events[eventName]) return athlete

      // Skip excluded athletes entirely
      if (isExcludedFromRerank(athlete.name)) return athlete

      const event = athlete.events[eventName]
      let newEventPlace = event.place
      let newEventPoints = event.points
      let totalPointsChange = 0
      let wasAffected = false

      // Lock Lazar in 2024: do not change his row
      if (isYear2024() && isLazar(athlete.name)) {
        return athlete
      }

      if (athlete.name === athleteName) {
        // Update the target athlete
        newEventPlace = newPlace
        newEventPoints = newPoints
        totalPointsChange = pointsChange
        wasAffected = true
      } else {
        // Update other athletes' rankings based on the change
        if (oldPlace < newPlace) {
          // Target athlete moved down (worse place)
          if (event.place > oldPlace && event.place <= newPlace) {
            // Athletes between old and new place move up one position
            newEventPlace = event.place - 1
            newEventPoints = getPointsFor(eventName, newEventPlace)
            totalPointsChange = newEventPoints - event.points
            wasAffected = true
          }
        } else {
          // Target athlete moved up (better place)
          if (event.place >= newPlace && event.place < oldPlace) {
            // Athletes between new and old place move down one position
            newEventPlace = event.place + 1
            newEventPoints = getPointsFor(eventName, newEventPlace)
            totalPointsChange = newEventPoints - event.points
            wasAffected = true
          }
        }
      }

      if (wasAffected && !isDirectChange) {
        affectedAthletes.add(athlete.name)
      }

      return {
        ...athlete,
        total_points: athlete.total_points + totalPointsChange,
        events: {
          ...athlete.events,
          [eventName]: {
            ...event,
            place: newEventPlace,
            points: newEventPoints,
            time: athlete.name === athleteName && newTime ? newTime : event.time
          }
        }
      }
    })

    // Update the directly modified athletes set
    if (isDirectChange) {
      setDirectlyModifiedAthletes(prev => new Set([...prev, ...affectedAthletes]))
    }

    return updatedAthletes
  }

  const getPlaceString = (place) => {
    if (place === 1) return '1st'
    if (place === 2) return '2nd'
    if (place === 3) return '3rd'
    if (place % 10 === 1 && place !== 11) return `${place}st`
    if (place % 10 === 2 && place !== 12) return `${place}nd`
    if (place % 10 === 3 && place !== 13) return `${place}rd`
    return `${place}th`
  }

  const applyChange = () => {
    if (!selectedAthlete || !selectedEvent || !selectedPlace) {
      alert('Please select an athlete, event, and new place.')
      return
    }

    if (isYear2024() && isLazar(selectedAthlete)) {
      // Soft, non-blocking notice instead of alert
      try {
        const toast = document.createElement('div')
        toast.className = 'soft-toast'
        toast.innerHTML = '<i class="fas fa-ribbon"></i> In memory of Lazar Đukić — results cannot be modified for 2024.'
        document.body.appendChild(toast)
        setTimeout(() => toast.classList.add('show'))
        setTimeout(() => {
          toast.classList.remove('show')
          setTimeout(() => toast.remove(), 300)
        }, 2500)
      } catch (e) {
        console.log('Notice: In memory of Lazar Đukić — results cannot be modified for 2024.')
      }
      return
    }

    if (isExcludedFromRerank(selectedAthlete)) {
      alert('This athlete is not eligible for re-ranking.')
      return
    }

    const newPlace = getPlaceNumber(selectedPlace)

    // Update event rankings for all athletes
    const updatedAthletes = updateEventRankings(simulatedAthletes, selectedEvent, selectedAthlete, newPlace, null, true)

    // Recalculate overall ranks (exclude <=0)
    const excluded = updatedAthletes.filter(a => isExcludedFromRerank(a.name) || (typeof a.rank === 'number' && a.rank <= 0))
    const included = updatedAthletes.filter(a => !(isExcludedFromRerank(a.name) || (typeof a.rank === 'number' && a.rank <= 0)))
    const sortedAthletes = [...included].sort((a, b) => b.total_points - a.total_points)
    // Anchor Lazar at original rank for 2024
    let rankedAthletes = sortedAthletes
    if (isYear2024()) {
      const originalLazar = originalAthletes.find(a => isLazar(a.name))
      if (originalLazar) {
        const lazarIdx = rankedAthletes.findIndex(a => isLazar(a.name))
        if (lazarIdx !== -1) {
          const lazar = rankedAthletes.splice(lazarIdx, 1)[0]
          const insertIdx = Math.max(0, (originalLazar.rank || 1) - 1)
          rankedAthletes.splice(insertIdx, 0, lazar)
        }
      }
    }
    rankedAthletes = rankedAthletes.map((athlete, index) => ({ ...athlete, rank: index + 1 }))
    const finalExcluded = excluded.map(a => ({ ...a, rank: -1 }))

    setSimulatedAthletes([...rankedAthletes, ...finalExcluded])
    setCurrentView('simulated')

    // Keep all selections for the stats panel (don't clear them)
    console.log('Change applied successfully!')
  }

  const resetAll = () => {
    setSimulatedAthletes(JSON.parse(JSON.stringify(originalAthletes)))
    setSelectedAthlete('')
    setSelectedEvent('')
    setSelectedPlace('')
    setUpToEvent('')
    setCurrentView('original')
    setDirectlyModifiedAthletes(new Set())
    setActiveGapChanges(new Map())
  }

  // Rebuild simulation from all active gap changes
  const rebuildSimulation = (gapChanges) => {
    let athletes = JSON.parse(JSON.stringify(originalAthletes))
    const modifiedAthletes = new Set()

    // Apply all gap changes
    for (const [gapId, change] of gapChanges) {
      if (isYear2024() && isLazar(change.athleteName)) {
        continue
      }
      if (isExcludedFromRerank(change.athleteName)) {
        continue
      }
      athletes = updateEventRankings(athletes, change.eventName, change.athleteName, change.newPlace, change.time, true)
      modifiedAthletes.add(change.athleteName)
    }

    // Recalculate overall ranks
    const excluded = athletes.filter(a => isExcludedFromRerank(a.name) || (typeof a.rank === 'number' && a.rank <= 0))
    let included = athletes.filter(a => !(isExcludedFromRerank(a.name) || (typeof a.rank === 'number' && a.rank <= 0)))
    const sortedAthletes = included.sort((a, b) => b.total_points - a.total_points)
    // Anchor Lazar at original rank for 2024
    let finalAthletes = sortedAthletes
    if (isYear2024()) {
      const originalLazar = originalAthletes.find(a => isLazar(a.name))
      if (originalLazar) {
        const lazarIdx = finalAthletes.findIndex(a => isLazar(a.name))
        if (lazarIdx !== -1) {
          const lazar = finalAthletes.splice(lazarIdx, 1)[0]
          const insertIdx = Math.max(0, (originalLazar.rank || 1) - 1)
          finalAthletes.splice(insertIdx, 0, lazar)
        }
      }
    }
    finalAthletes = finalAthletes.map((athlete, index) => ({ ...athlete, rank: index + 1 }))
    const finalExcluded = excluded.map(a => ({ ...a, rank: -1 }))

    setSimulatedAthletes([...finalAthletes, ...finalExcluded])
    setDirectlyModifiedAthletes(modifiedAthletes)

    return finalAthletes
  }

  const handleGapClick = (athlete, eventName, gap) => {
    const gapId = `${athlete.name}-${eventName}-${gap.place}`
    const newPlace = gap.place
    const placeString = getPlaceString(newPlace)

    setActiveGapChanges(prevChanges => {
      const newChanges = new Map(prevChanges)

      // Remove any existing change for this event (one per column rule)
      const existingKey = Array.from(newChanges.keys()).find(key => key.includes(`-${eventName}-`))
      if (existingKey) {
        newChanges.delete(existingKey)
      }

      // Add the new change
      newChanges.set(gapId, {
        athleteName: athlete.name,
        eventName: eventName,
        newPlace: newPlace,
        time: gap.time
      })

      // Rebuild simulation with all changes
      rebuildSimulation(newChanges)
      setCurrentView('simulated')

      // Update the selected athlete and event for the stats panel
      setSelectedAthlete(athlete.name)
      setSelectedEvent(eventName)
      setSelectedPlace(placeString)

      return newChanges
    })
  }

  const handleGapRemove = (gapId) => {
    setActiveGapChanges(prevChanges => {
      const newChanges = new Map(prevChanges)
      newChanges.delete(gapId)

      if (newChanges.size === 0) {
        // No more changes, revert to original
        setSimulatedAthletes(JSON.parse(JSON.stringify(originalAthletes)))
        setCurrentView('original')
        setDirectlyModifiedAthletes(new Set())
      } else {
        // Rebuild simulation with remaining changes
        rebuildSimulation(newChanges)
      }

      return newChanges
    })
  }

  const cancelGapSelection = () => {
    setSimulatedAthletes(originalAthletes)
    setCurrentView('original')
    setSelectedAthlete('')
    setSelectedEvent('')
    setSelectedPlace('')
    setDirectlyModifiedAthletes(new Set())
  }

  const cancelAthleteChanges = (athleteName) => {
    // Find the original athlete data
    const originalAthlete = originalAthletes.find(a => a.name === athleteName)
    if (!originalAthlete) return

    // For each event that the athlete participated in, we need to reset their ranking
    // and update other athletes' rankings accordingly
    let updatedAthletes = [...simulatedAthletes]

    Object.keys(originalAthlete.events).forEach(eventName => {
      const currentEvent = updatedAthletes.find(a => a.name === athleteName)?.events[eventName]
      const originalEvent = originalAthlete.events[eventName]

      if (currentEvent && currentEvent.place !== originalEvent.place) {
        // Reset this athlete's ranking for this event and update others
        updatedAthletes = updateEventRankings(
          updatedAthletes,
          eventName,
          athleteName,
          originalEvent.place,
          originalEvent.time,
          false
        )
      }
    })

    // Recalculate overall ranks
    const excluded = updatedAthletes.filter(a => isExcludedFromRerank(a.name) || (typeof a.rank === 'number' && a.rank <= 0))
    const included = updatedAthletes.filter(a => !(isExcludedFromRerank(a.name) || (typeof a.rank === 'number' && a.rank <= 0)))
    const sortedAthletes = included.sort((a, b) => b.total_points - a.total_points)
    const finalIncluded = sortedAthletes.map((athlete, index) => ({
      ...athlete,
      rank: index + 1
    }))
    const finalExcluded = excluded.map(a => ({ ...a, rank: -1 }))

    setSimulatedAthletes([...finalIncluded, ...finalExcluded])

    // Remove this athlete from the directly modified set
    setDirectlyModifiedAthletes(prev => {
      const newSet = new Set(prev)
      newSet.delete(athleteName)
      return newSet
    })

    // Clear any gap changes associated with this athlete
    setActiveGapChanges(prevChanges => {
      const newChanges = new Map(prevChanges)
      // Remove all gap changes that start with this athlete's name
      for (const [gapId] of newChanges) {
        if (gapId.startsWith(`${athleteName}-`)) {
          newChanges.delete(gapId)
        }
      }
      return newChanges
    })

    // Clear selections if this was the selected athlete
    if (selectedAthlete === athleteName) {
      setSelectedAthlete('')
      setSelectedEvent('')
      setSelectedPlace('')
    }
  }

  const getPlaceNumber = (placeStr) => {
    return parseInt(placeStr.replace(/\D/g, ''))
  }

  const getCurrentAthletes = () => {
    let athletes = currentView === 'original' ? originalAthletes : simulatedAthletes

    // Apply "up to event" filtering if selected
    if (upToEvent) {
      athletes = calculateRankingsUpToEvent(athletes, upToEvent)
    }

    return athletes
  }

  const getStats = () => {
    if (!selectedAthlete || !data) {
      return { originalRank: '-', newRank: '-', pointsChange: '-', totalPoints: '-' }
    }

    // Get the current athletes (with upToEvent filtering applied)
    const currentAthletes = getCurrentAthletes()

    // Find the athlete in the current filtered data
    const currentAthlete = currentAthletes.find(a => a.name === selectedAthlete)
    if (!currentAthlete) return { originalRank: '-', newRank: '-', pointsChange: '-', totalPoints: '-' }

    // Get the original athlete data (also filtered if upToEvent is set)
    const originalAthletesFiltered = upToEvent ?
      calculateRankingsUpToEvent(originalAthletes, upToEvent) :
      originalAthletes
    const originalAthlete = originalAthletesFiltered.find(a => a.name === selectedAthlete)
    if (!originalAthlete) return { originalRank: '-', newRank: '-', pointsChange: '-', totalPoints: '-' }

    // Calculate cumulative changes based on filtered data
    const pointsChange = currentAthlete.total_points - originalAthlete.total_points

    return {
      originalRank: originalAthlete.rank,
      newRank: currentAthlete.rank,
      pointsChange: pointsChange > 0 ? `+${pointsChange}` : pointsChange === 0 ? '0' : pointsChange.toString(),
      totalPoints: currentAthlete.total_points,
      isPositive: pointsChange >= 0
    }
  }

  if (loading && !data) {
    console.log('Rendering loading state...')
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading CrossFit Leaderboard...</p>
      </div>
    )
  }

  if (!data) {
    console.log('Rendering error state - no data')
    return (
      <div className="error-container">
        <h2>Error Loading Data</h2>
        <p>Failed to load leaderboard data. Please refresh the page.</p>
      </div>
    )
  }

  console.log('Rendering main app with data:', data)

  return (
    <>
      <div className="app">
        <Header />



        <div className="main-content">
          <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <SidebarTabs
              athletes={data.athletes}
              events={data.events}
              selectedAthlete={selectedAthlete}
              selectedEvent={selectedEvent}
              selectedPlace={selectedPlace}
              upToEvent={upToEvent}
              onAthleteChange={setSelectedAthlete}
              onEventChange={setSelectedEvent}
              onPlaceChange={setSelectedPlace}
              onUpToEventChange={setUpToEvent}
              onApplyChange={applyChange}
              onResetAll={resetAll}
              stats={getStats()}
              pointSystem={data.point_system}
              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
              isCollapsed={sidebarCollapsed}
            />
          </div>

          <div className="content-area">
            <Leaderboard
              athletes={getCurrentAthletes()}
              events={data.events}
              currentView={currentView}
              onViewChange={setCurrentView}
              selectedAthlete={selectedAthlete}
              selectedEvent={selectedEvent}
              originalAthletes={originalAthletes}
              upToEvent={upToEvent}
              onGapClick={handleGapClick}
              onGapRemove={handleGapRemove}
              activeGapChanges={activeGapChanges}
              onCancelAthleteChanges={cancelAthleteChanges}
              directlyModifiedAthletes={directlyModifiedAthletes}
              selectedGender={selectedGender}
              onGenderChange={setSelectedGender}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              stats={getStats()}
              calculateRankingsUpToEvent={calculateRankingsUpToEvent}
            />
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default App
