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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false) // New state for sidebar collapse

  useEffect(() => {
    loadData()
  }, [selectedGender])

  // Reset state when gender changes
  useEffect(() => {
    setSelectedAthlete('')
    setSelectedEvent('')
    setSelectedPlace('')
    setUpToEvent('')
    setDirectlyModifiedAthletes(new Set())
    setActiveGapChanges(new Map())
    setCurrentView('original')
  }, [selectedGender])

  const loadData = async () => {
    try {
      console.log(`Loading ${selectedGender} data...`)
      const response = await fetch(`${import.meta.env.BASE_URL}leaderboard_data-${selectedGender}.json`)
      if (!response.ok) {
        throw new Error(`Failed to load ${selectedGender} data`)
      }
      const jsonData = await response.json()
      console.log(`${selectedGender} data loaded successfully:`, jsonData)
      setData(jsonData)

      // Create deep copies for original and simulated data
      setOriginalAthletes(JSON.parse(JSON.stringify(jsonData.athletes)))
      setSimulatedAthletes(JSON.parse(JSON.stringify(jsonData.athletes)))
      setLoading(false)
      console.log('App initialized successfully')
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
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

    // Sort by cumulative points and assign ranks
    const sortedAthletes = athletesWithCumulativePoints.sort((a, b) => b.total_points - a.total_points)
    return sortedAthletes.map((athlete, index) => ({
      ...athlete,
      rank: index + 1
    }))
  }

  // Function to update event rankings when an athlete's place changes
  const updateEventRankings = (athletes, eventName, athleteName, newPlace, newTime = null, isDirectChange = false) => {
    const placeString = getPlaceString(newPlace)
    const newPoints = data.point_system[placeString]

    // Get all athletes who participated in this event
    const eventParticipants = athletes.filter(a => a.events[eventName])

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

      const event = athlete.events[eventName]
      let newEventPlace = event.place
      let newEventPoints = event.points
      let totalPointsChange = 0
      let wasAffected = false

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
            newEventPoints = data.point_system[getPlaceString(newEventPlace)]
            totalPointsChange = newEventPoints - event.points
            wasAffected = true
          }
        } else {
          // Target athlete moved up (better place)
          if (event.place >= newPlace && event.place < oldPlace) {
            // Athletes between new and old place move down one position
            newEventPlace = event.place + 1
            newEventPoints = data.point_system[getPlaceString(newEventPlace)]
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

    const newPlace = getPlaceNumber(selectedPlace)

    // Update event rankings for all athletes
    const updatedAthletes = updateEventRankings(simulatedAthletes, selectedEvent, selectedAthlete, newPlace, null, true)

    // Recalculate overall ranks
    const sortedAthletes = [...updatedAthletes].sort((a, b) => b.total_points - a.total_points)
    const rankedAthletes = sortedAthletes.map((athlete, index) => ({
      ...athlete,
      rank: index + 1
    }))

    setSimulatedAthletes(rankedAthletes)
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
      athletes = updateEventRankings(athletes, change.eventName, change.athleteName, change.newPlace, change.time, true)
      modifiedAthletes.add(change.athleteName)
    }

    // Recalculate overall ranks
    const sortedAthletes = athletes.sort((a, b) => b.total_points - a.total_points)
    const finalAthletes = sortedAthletes.map((athlete, index) => ({
      ...athlete,
      rank: index + 1
    }))

    setSimulatedAthletes(finalAthletes)
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
    const sortedAthletes = updatedAthletes.sort((a, b) => b.total_points - a.total_points)
    const finalAthletes = sortedAthletes.map((athlete, index) => ({
      ...athlete,
      rank: index + 1
    }))

    setSimulatedAthletes(finalAthletes)

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

    // Get the original athlete data
    const originalAthlete = originalAthletes.find(a => a.name === selectedAthlete)
    if (!originalAthlete) return { originalRank: '-', newRank: '-', pointsChange: '-', totalPoints: '-' }

    // Get the current simulated athlete data (includes all cumulative changes)
    const simulatedAthlete = simulatedAthletes.find(a => a.name === selectedAthlete)
    if (!simulatedAthlete) return { originalRank: '-', newRank: '-', pointsChange: '-', totalPoints: '-' }

    // Calculate cumulative changes
    const pointsChange = simulatedAthlete.total_points - originalAthlete.total_points

    return {
      originalRank: originalAthlete.rank,
      newRank: simulatedAthlete.rank,
      pointsChange: pointsChange > 0 ? `+${pointsChange}` : pointsChange === 0 ? '0' : pointsChange.toString(),
      totalPoints: simulatedAthlete.total_points,
      isPositive: pointsChange >= 0
    }
  }

  if (loading) {
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
              athletes={currentView === 'original' ? originalAthletes : simulatedAthletes}
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
              stats={getStats()}
            />
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default App
