import React, { useState, useEffect } from 'react'

const YearDropdown = ({ selectedYear, onYearChange, selectedGender }) => {
    const [years, setYears] = useState([])
    const [latest, setLatest] = useState('Latest')

    useEffect(() => {
        let isMounted = true
        const loadYears = async () => {
            try {
                const resp = await fetch(`${import.meta.env.BASE_URL}years_available.json`)
                if (!resp.ok) throw new Error('Failed to load years_available.json')
                const payload = await resp.json()
                const byGender = payload.byGender?.[selectedGender]
                const list = Array.isArray(byGender) ? byGender : payload.years
                if (isMounted) {
                    setYears(Array.isArray(list) ? list : [])
                    const latestByGender = payload.latestByGender?.[selectedGender]
                    setLatest(typeof latestByGender === 'number' ? String(latestByGender) : 'Latest')
                }
            } catch (e) {
                // Fallback to hardcoded range if file missing
                if (isMounted) {
                    setYears([2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007])
                    setLatest('Latest')
                }
            }
        }
        loadYears()
        return () => { isMounted = false }
    }, [selectedGender])

    return (
        <select
            id="year-select"
            aria-label="Year"
            value={selectedYear || 'Latest'}
            onChange={(e) => onYearChange(e.target.value)}
        >
            <option value="Latest">Latest</option>
            {years.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
            ))}
        </select>
    )
}

const Leaderboard = ({
    athletes,
    events,
    currentView,
    onViewChange,
    selectedAthlete,
    selectedEvent,
    originalAthletes,
    upToEvent,
    onGapClick,
    onGapRemove,
    activeGapChanges,
    onCancelAthleteChanges,
    directlyModifiedAthletes,
    selectedGender,
    onGenderChange,
    selectedYear,
    onYearChange,
    stats,
    calculateRankingsUpToEvent
}) => {
    // Event details with cap times
    const eventDetails = {
        'Run Row Run': { timeCap: null },
        'All Crossed Up': { timeCap: 600 }, // 10 minutes in seconds
        'Climbing Couplet': { timeCap: { women: 900, men: 600 } }, // 15 min (women), 10 min (men) in seconds
        'Albany Grip Trip': { timeCap: { women: 1500, men: 1320 } }, // 25 min (women), 22 min (men) in seconds
        '1RM Back Squat': { timeCap: null },
        'Throttle Up': { timeCap: 360 }, // 6 minutes in seconds
        'Hammer Down': { timeCap: 480 }, // 8 minutes in seconds
        'Going Dark': { timeCap: 900 }, // 15 minutes in seconds
        'Running Isabel': { timeCap: null },
        'Atlas': { timeCap: { women: 900, men: 600 } } // 15 min (women), 10 min (men) in seconds
    }

    const getCapTime = (eventName) => {
        const capTime = eventDetails[eventName]?.timeCap
        if (capTime && typeof capTime === 'object') {
            // Gender-specific cap time
            return capTime[selectedGender] || capTime.men // Default to men's time
        }
        return capTime || null
    }
    const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' })
    const [expandedAthlete, setExpandedAthlete] = useState(null)
    const [isTributeOpen, setIsTributeOpen] = useState(false)
    // Reset expanded athlete when gender changes
    useEffect(() => {
        setExpandedAthlete(null)
    }, [selectedGender])

    // Handle sticky table headers with JavaScript since CSS sticky doesn't work with horizontal scroll containers
    useEffect(() => {
        const handleScroll = () => {
            const leaderboardHeader = document.querySelector('.leaderboard-header')
            const tableHeaders = document.querySelectorAll('#leaderboard-table th')

            if (!leaderboardHeader || !tableHeaders.length) return

            // Calculate the bottom position of the leaderboard header
            const leaderboardRect = leaderboardHeader.getBoundingClientRect()
            const leaderboardBottom = leaderboardRect.bottom

            // Calculate how much we need to translate the headers
            const shouldStick = leaderboardBottom <= 8 // App padding offset
            const translateY = shouldStick ? Math.abs(leaderboardBottom - 8) : 0

            // Apply transform to all table headers
            tableHeaders.forEach(th => {
                th.style.transform = shouldStick ? `translateY(${translateY}px)` : 'translateY(0px)'
            })
        }

        // Add scroll listener
        window.addEventListener('scroll', handleScroll)

        // Initial call
        handleScroll()

        // Cleanup
        return () => {
            window.removeEventListener('scroll', handleScroll)
        }
    }, []) // Run once on mount

    const getOrdinal = (num) => {
        const suffixes = ['th', 'st', 'nd', 'rd']
        const v = num % 100
        return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
    }

    const getRankChange = (athlete) => {
        if (currentView !== 'simulated') return ''

        // Get the original athlete data (with upToEvent filtering applied if needed)
        let originalAthlete = originalAthletes.find(a => a.name === athlete.name)
        if (!originalAthlete) return ''

        // Do not show rank deltas for non-ranked athletes (rank <= 0)
        if ((typeof athlete.rank === 'number' && athlete.rank <= 0) ||
            (typeof originalAthlete.rank === 'number' && originalAthlete.rank <= 0)) {
            return ''
        }

        // If upToEvent is set, we need to compare with the filtered original data
        if (upToEvent) {
            // Calculate what the original rank would be with upToEvent filtering
            const originalAthletesFiltered = calculateRankingsUpToEvent(originalAthletes, upToEvent)
            const originalAthleteFiltered = originalAthletesFiltered.find(a => a.name === athlete.name)
            if (originalAthleteFiltered) {
                originalAthlete = originalAthleteFiltered
            }
        }

        const rankChange = originalAthlete.rank - athlete.rank
        if (rankChange === 0) return ''

        const icon = rankChange > 0 ? '↑' : '↓'
        const className = rankChange > 0 ? 'rank-up' : 'rank-down'

        return <span className={`rank-change ${className}`}>{icon} {Math.abs(rankChange)}</span>
    }

    const hasChanges = (athlete) => {
        if (currentView !== 'simulated') return false

        // Only show changes for athletes that were directly modified
        return directlyModifiedAthletes.has(athlete.name)
    }

    const handleSort = (key) => {
        let direction = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <i className="fas fa-sort" />
        }
        return sortConfig.direction === 'asc'
            ? <i className="fas fa-sort-up" />
            : <i className="fas fa-sort-down" />
    }

    const sortAthletes = (athletesToSort) => {
        return [...athletesToSort].sort((a, b) => {
            let aValue, bValue

            if (sortConfig.key === 'rank') {
                // Always place non-ranked (<= 0) at the bottom regardless of sort direction
                const aIsNA = (typeof a.rank === 'number' && a.rank <= 0)
                const bIsNA = (typeof b.rank === 'number' && b.rank <= 0)
                if (aIsNA && !bIsNA) return 1
                if (!aIsNA && bIsNA) return -1
                aValue = a.rank
                bValue = b.rank
            } else if (sortConfig.key === 'total_points') {
                aValue = a.total_points
                bValue = b.total_points
            } else if (sortConfig.key === 'name') {
                aValue = a.name.toLowerCase()
                bValue = b.name.toLowerCase()
            } else if (sortConfig.key === 'country') {
                aValue = a.country.toLowerCase()
                bValue = b.country.toLowerCase()
            } else {
                // Event sorting
                const aEvent = a.events[sortConfig.key]
                const bEvent = b.events[sortConfig.key]

                if (!aEvent && !bEvent) return 0
                if (!aEvent) return 1
                if (!bEvent) return -1

                aValue = aEvent.place
                bValue = bEvent.place
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1
            }
            return 0
        })
    }

    const renderEventCell = (athlete, eventName) => {
        const event = athlete.events[eventName]
        if (!event) return <td>-</td>

        // Check if this event has been simulated for styling
        const originalAthlete = originalAthletes.find(a => a.name === athlete.name)
        const originalEvent = originalAthlete?.events[eventName]
        const isSimulated = currentView === 'simulated' &&
            originalEvent &&
            (event.place !== originalEvent.place ||
                event.points !== originalEvent.points ||
                event.time !== originalEvent.time)

        // Use simulated place and points, but always show original time/performance
        const displayPlace = event.place
        const displayPoints = event.points
        const displayTime = originalEvent ? originalEvent.time : event.time

        const isLazar2024 = isYear2024 && isLazar(athlete.name)
        return (
            <td className={`event-result ${isSimulated ? 'simulated' : ''} ${isLazar2024 ? 'lazar-event' : ''}`}>
                {isLazar2024 ? (
                    <div className="lazar-event-message">In memory of Lazar Đukić</div>
                ) : (
                    <div className="event-compact">
                        <span className="event-place">{displayPlace > 0 ? getOrdinal(displayPlace) : '—'}</span>
                        <span className="event-time">{displayTime}</span>
                        <span className="event-points">{displayPoints} pts</span>
                    </div>
                )}
            </td>
        )
    }

    const renderSortableHeader = (key, label, className = '') => {
        const isActiveSort = sortConfig.key === key
        return (
            <th
                className={`sortable-header ${className} ${isActiveSort ? 'active-sort' : ''}`}
                onClick={() => handleSort(key)}
            >
                <div className="header-content">
                    <span>{label}</span>
                    <span className="sort-icon">{getSortIcon(key)}</span>
                </div>
            </th>
        )
    }

    const toggleAthleteExpansion = (athleteName) => {
        setExpandedAthlete(expandedAthlete === athleteName ? null : athleteName)
    }

    const handleAthleteNameClick = (e, athleteName) => {
        if (selectedYear === '2024' && (athleteName === 'Lazar Đukić' || athleteName === 'Lazar Dukic')) {
            e.stopPropagation()
            setIsTributeOpen(true)
        }
    }

    // Handle different time formats (MM:SS.ss or HH:MM:SS.ss)
    const parseTime = (timeStr) => {
        const parts = timeStr.split(':')
        if (parts.length === 2) {
            // MM:SS.ss format
            return parseFloat(parts[0]) * 60 + parseFloat(parts[1])
        } else if (parts.length === 3) {
            // HH:MM:SS.ss format
            return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2])
        }
        return 0
    }

    const calculateTimeGap = (athleteTime, betterTime, eventName) => {
        // Check if either time is a CAP event
        if (athleteTime.includes('CAP') || betterTime.includes('CAP')) {
            // Handle CAP events - compare the numbers after CAP+
            const getCapNumber = (timeStr) => {
                if (timeStr.includes('CAP+')) {
                    return parseInt(timeStr.split('CAP+')[1]) || 0
                }
                return 0
            }

            const athleteCap = getCapNumber(athleteTime)
            const betterCap = getCapNumber(betterTime)
            const capTime = getCapTime(eventName)

            // If athlete has a time but target is CAP+, calculate both reps and time needed
            if (!athleteTime.includes('CAP') && betterTime.includes('CAP')) {
                const athleteSeconds = parseTime(athleteTime)

                if (capTime) {
                    const timeToCap = capTime - athleteSeconds
                    if (timeToCap <= 0) {
                        // Athlete already hit the cap time, only need reps
                        return `+ ${betterCap} reps`
                    } else {
                        // Athlete needs both time and reps
                        const formattedTime = timeToCap < 60 ?
                            `${timeToCap.toFixed(2)} s` :
                            `${Math.floor(timeToCap / 60)}:${(timeToCap % 60).toFixed(2).padStart(5, '0')}`
                        return `+ ${betterCap} reps & ${formattedTime}`
                    }
                } else {
                    // No cap time available, just show reps
                    return `${betterCap} more reps`
                }
            }

            // If athlete has CAP+ but target has a time, calculate both reps and time needed
            if (athleteTime.includes('CAP') && !betterTime.includes('CAP')) {
                const betterSeconds = parseTime(betterTime)

                if (capTime) {
                    const timeToCap = capTime - betterSeconds
                    // Always show both reps and time when comparing CAP+ to a time
                    const formattedTime = timeToCap < 60 ?
                        `${timeToCap.toFixed(2)} s` :
                        `${Math.floor(timeToCap / 60)}:${(timeToCap % 60).toFixed(2).padStart(5, '0')}`
                    return `+ ${athleteCap} reps & ${formattedTime}`
                } else {
                    // No cap time available, just show reps
                    return `+ ${athleteCap} reps`
                }
            }

            // Both are CAP+ events
            const capDifference = athleteCap - betterCap // Higher CAP+ number is worse
            if (capDifference === 0) {
                return "Same reps"
            } else if (capDifference > 0) {
                return `+ ${capDifference} reps`
            } else {
                return `- ${Math.abs(capDifference)} reps`
            }
        }

        const athleteSeconds = parseTime(athleteTime)
        const betterSeconds = parseTime(betterTime)
        const gapSeconds = (athleteSeconds - betterSeconds) + 0.01 // Add 0.01s to ensure they finish ahead

        // Format the gap (how much faster you needed to be)
        if (gapSeconds < 60) {
            return `${gapSeconds.toFixed(2)} s`
        } else if (gapSeconds < 3600) {
            const minutes = Math.floor(gapSeconds / 60)
            const seconds = gapSeconds % 60
            return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`
        } else {
            const hours = Math.floor(gapSeconds / 3600)
            const minutes = Math.floor((gapSeconds % 3600) / 60)
            const seconds = gapSeconds % 60
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`
        }
    }

    const calculateWeightGap = (athleteWeight, betterWeight) => {
        const athleteLbs = parseFloat(athleteWeight.replace(' lb', ''))
        const betterLbs = parseFloat(betterWeight.replace(' lb', ''))
        const gapLbs = betterLbs - athleteLbs

        if (gapLbs === 0) {
            return "Same weight"
        } else if (gapLbs > 0) {
            return `+ ${gapLbs.toFixed(0)} lb`
        } else {
            return `- ${Math.abs(gapLbs).toFixed(0)} lb`
        }
    }

    const getTop10Distance = (athlete, eventName) => {
        // Always use the original athlete data for gap calculations
        const originalAthlete = originalAthletes.find(a => a.name === athlete.name)
        if (!originalAthlete) return null

        const event = originalAthlete.events[eventName]
        if (!event) return null

        // Find all athletes who finished above this athlete in this event
        // Always use originalAthletes to ensure consistent gap calculations
        const eventResults = originalAthletes
            .map(a => ({ name: a.name, event: a.events[eventName] }))
            .filter(a => a.event)
            .sort((a, b) => a.event.place - b.event.place)

        // Find the immediate next place above this athlete
        const nextPlace = event.place - 1
        const maxPlacesToShow = Math.min(10, event.place - 1) // Show up to 10 places above, but not more than available

        if (maxPlacesToShow === 0) return null

        // Check if this is a weight-based event
        const isWeightEvent = eventName.toLowerCase().includes('squat') ||
            eventName.toLowerCase().includes('lift') ||
            eventName.toLowerCase().includes('weight') ||
            event.time.includes(' lb')

        // Calculate gaps for each place from the immediate next place up to 10 places above
        const gaps = []
        for (let targetPlace = nextPlace; targetPlace >= Math.max(1, nextPlace - 9); targetPlace--) {
            // Find the athlete(s) at this target place
            const athletesAtPlace = eventResults.filter(a => a.event.place === targetPlace)

            if (athletesAtPlace.length > 0) {
                // Use the first athlete at this place (they all have the same performance)
                const athleteAtPlace = athletesAtPlace[0]

                let gap
                if (isWeightEvent) {
                    // Weight-based event
                    gap = calculateWeightGap(event.time, athleteAtPlace.event.time)
                } else {
                    // Time-based event
                    gap = calculateTimeGap(event.time, athleteAtPlace.event.time, eventName)
                }

                gaps.push({
                    name: athleteAtPlace.name,
                    place: athleteAtPlace.event.place,
                    time: athleteAtPlace.event.time,
                    points: athleteAtPlace.event.points,
                    gap: gap,
                    targetPlace: athleteAtPlace.event.place
                })
            }
        }

        return { athletesAbove: gaps }
    }

    const handleGapClick = (athlete, eventName, gap) => {
        const gapId = `${athlete.name}-${eventName}-${gap.place}`

        // Check if this gap is currently selected
        if (activeGapChanges.has(gapId)) {
            // Deselecting this gap
            onGapRemove(gapId)
        } else {
            // Selecting this gap (App.jsx will handle one-per-column logic)
            onGapClick(athlete, eventName, gap)
        }
    };

    const renderAthleteDetail = (athlete) => {
        const athletesAboveInfo = events.map(eventName => ({
            event: eventName,
            ...getTop10Distance(athlete, eventName)
        }))

        // Find the maximum number of gaps across all events
        const maxGaps = Math.max(...athletesAboveInfo.map(info => info.athletesAbove?.length || 0))

        return (
            <>
                {/* Performance Gaps Rows - One row per place improvement */}
                {Array.from({ length: maxGaps }, (_, gapIndex) => (
                    <tr key={gapIndex} className="performance-gaps-row">
                        <td className="sticky-rank"></td>
                        <td className="sticky-athlete"></td>
                        <td className="sticky-points"></td>

                        {events.map((eventName, colIndex) => {
                            const eventInfo = athletesAboveInfo[colIndex];
                            const gap = eventInfo?.athletesAbove?.[gapIndex];

                            if (gap) {
                                const gapId = `${athlete.name}-${eventName}-${gap.place}`
                                const isSelected = currentView === 'simulated' && activeGapChanges.has(gapId)

                                return (
                                    <td key={colIndex} className={`event-gap-cell clickable-gap ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleGapClick(athlete, eventName, gap)}>
                                        <div className="gap-info">
                                            <div className="gap-target">{gap.place}</div>
                                            <div className="gap-delta">{gap.gap}</div>
                                            <div className="gap-time">{gap.time}</div>
                                        </div>
                                    </td>
                                );
                            } else {
                                return <td key={colIndex}></td>;
                            }
                        })}
                    </tr>
                ))}
            </>
        )
    }

    const sortedAthletes = sortAthletes(athletes)
    const isYear2024 = String(selectedYear) === '2024'
    const isLazar = (name) => {
        if (!name) return false
        const n = String(name).toLowerCase()
        return n === 'lazar đukić' || n === 'lazar dukic' || n === 'lazar djukic'
    }

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-header">
                <div className="header-left">
                    {selectedYear === '2024' && (
                        <div
                            className="memorial-banner"
                            role="button"
                            tabIndex={0}
                            aria-label="Open tribute to Lazar Đukić"
                            title="Open tribute to Lazar Đukić"
                            onClick={() => setIsTributeOpen(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setIsTributeOpen(true);
                                }
                            }}
                        >
                            <i className="fas fa-ribbon" aria-hidden="true"></i>
                            <span>In memory of <strong>Lazar Đukić</strong> (1996–2024)</span>
                        </div>
                    )}
                    <div className="leaderboard-title-section">
                        <div className="year-select">
                            <YearDropdown selectedYear={selectedYear} onYearChange={onYearChange} selectedGender={selectedGender} />
                        </div>
                        <h2>Leaderboard</h2>
                        <div className="gender-toggle">
                            <button
                                className={`btn-toggle ${selectedGender === 'men' ? 'active' : ''}`}
                                onClick={() => onGenderChange('men')}
                            >
                                Men
                            </button>
                            <button
                                className={`btn-toggle ${selectedGender === 'women' ? 'active' : ''}`}
                                onClick={() => onGenderChange('women')}
                            >
                                Women
                            </button>
                        </div>
                    </div>
                    {upToEvent && (
                        <div className="up-to-event-indicator">
                            <i className="fas fa-clock"></i>
                            <span>Showing rankings up to: <strong>{upToEvent}</strong></span>
                        </div>
                    )}
                </div>
                <div className="header-stats">
                    {isYear2024 && isLazar(selectedAthlete) ? (
                        <>
                            <div className="stat-card">
                                <h3>Original Rank</h3>
                                <div className="stat-value" aria-label="In memory"><i className="fas fa-ribbon"></i></div>
                            </div>
                            <div className="stat-card">
                                <h3>New Rank</h3>
                                <div className="stat-value" aria-label="In memory"><i className="fas fa-ribbon"></i></div>
                            </div>
                            <div className="stat-card">
                                <h3>Points Change</h3>
                                <div className="stat-value" aria-label="In memory"><i className="fas fa-ribbon"></i></div>
                            </div>
                            <div className="stat-card">
                                <h3>Total Points</h3>
                                <div className="stat-value" aria-label="In memory"><i className="fas fa-ribbon"></i></div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="stat-card">
                                <h3>Original Rank</h3>
                                <div className="stat-value">{stats.originalRank}</div>
                            </div>
                            <div className="stat-card">
                                <h3>New Rank</h3>
                                <div className={`stat-value ${stats.newRank < stats.originalRank ? 'positive' :
                                    stats.newRank > stats.originalRank ? 'negative' :
                                        'neutral'
                                    }`}>
                                    {stats.newRank}
                                </div>
                            </div>
                            <div className="stat-card">
                                <h3>Points Change</h3>
                                <div className={`stat-value ${stats.isPositive ? 'positive' : 'negative'}`}>
                                    {stats.pointsChange}
                                </div>
                            </div>
                            <div className="stat-card">
                                <h3>Total Points</h3>
                                <div className="stat-value">{stats.totalPoints}</div>
                            </div>
                        </>
                    )}
                </div>
                <div className="view-toggle">
                    <button
                        className={`btn-toggle ${currentView === 'original' ? 'active' : ''}`}
                        onClick={() => onViewChange('original')}
                    >
                        Original
                    </button>
                    <button
                        className={`btn-toggle ${currentView === 'simulated' ? 'active' : ''}`}
                        onClick={() => onViewChange('simulated')}
                    >
                        Simulated
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table id="leaderboard-table">
                    <thead>
                        <tr>
                            {renderSortableHeader('rank', 'Rank', 'rank-header')}
                            {renderSortableHeader('name', 'Athlete', 'athlete-header')}
                            {renderSortableHeader('total_points', 'Points', 'points-header')}
                            {events.map(event => renderSortableHeader(event, event, 'event-header'))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAthletes.map((athlete) => (
                            <React.Fragment key={athlete.name}>
                                <tr
                                    className={`athlete-row ${hasChanges(athlete) ? 'modified' : ''} ${expandedAthlete === athlete.name ? 'expanded' : ''} ${isYear2024 && isLazar(athlete.name) ? 'lazar-tribute' : ''}`}
                                    onClick={() => toggleAthleteExpansion(athlete.name)}
                                >
                                    <td className="rank">
                                        {isYear2024 && isLazar(athlete.name) ? (
                                            <i className="fas fa-ribbon" aria-hidden="true" title="In memory of Lazar Đukić"></i>
                                        ) : (
                                            (typeof athlete.rank === 'number' && athlete.rank <= 0) ? (
                                                athlete.rank_label ? athlete.rank_label : <i className="fas fa-ribbon" aria-hidden="true" title="N/A"></i>
                                            ) : (
                                                athlete.rank
                                            )
                                        )}
                                        {getRankChange(athlete)}
                                    </td>
                                    <td className={`athlete-column ${isYear2024 && isLazar(athlete.name) ? 'lazar-row' : ''}`}>
                                        <div className="athlete-info">
                                            <div
                                                className="athlete-name"
                                                onClick={(e) => handleAthleteNameClick(e, athlete.name)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Enter' || e.key === ' ') && selectedYear === '2024' && (athlete.name === 'Lazar Đukić' || athlete.name === 'Lazar Dukic')) {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        setIsTributeOpen(true)
                                                    }
                                                }}
                                            >
                                                {athlete.name}
                                                <i className={`fas fa-chevron-${expandedAthlete === athlete.name ? 'up' : 'down'} expand-icon`}></i>
                                            </div>
                                            <div className="athlete-details">{athlete.affiliate}</div>
                                        </div>
                                        {hasChanges(athlete) && (
                                            <button
                                                className="btn-cancel-athlete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCancelAthleteChanges(athlete.name);
                                                }}
                                                title="Cancel changes for this athlete"
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        )}
                                    </td>
                                    <td className="total-points">
                                        {isYear2024 && isLazar(athlete.name) ? (
                                            <i className="fas fa-ribbon" aria-hidden="true" title="In memory of Lazar Đukić"></i>
                                        ) : (
                                            athlete.total_points
                                        )}
                                    </td>
                                    {isYear2024 && isLazar(athlete.name) ? (
                                        <td className="lazar-event-merged" colSpan={events.length}>
                                            In memory of Lazar Đukić
                                        </td>
                                    ) : (
                                        events.map(event => renderEventCell(athlete, event))
                                    )}
                                </tr>
                                {expandedAthlete === athlete.name && renderAthleteDetail(athlete)}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {isTributeOpen && (
                <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Tribute to Lazar Đukić" onClick={() => setIsTributeOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" aria-label="Close tribute" onClick={() => setIsTributeOpen(false)}>
                            <i className="fas fa-times"></i>
                        </button>
                        <div className="modal-header">
                            <i className="fas fa-ribbon"></i>
                            <h3>In memory of Lazar Đukić</h3>
                        </div>
                        <div className="modal-body">
                            <p>
                                Tribute placeholder. Add photos, memories, and a brief note celebrating his life and impact on the sport.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Leaderboard 