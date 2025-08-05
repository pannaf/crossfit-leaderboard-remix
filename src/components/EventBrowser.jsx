import React, { useState } from 'react'

const EventBrowser = ({ events }) => {
    const [currentDayIndex, setCurrentDayIndex] = useState(0) // 0 = Friday, 1 = Saturday, 2 = Sunday
    const [expandedEvent, setExpandedEvent] = useState(null) // Track which event card is expanded

    // Helper function to render separate time cap badges for men and women
    const renderTimeCaps = (timeCap) => {
        if (!timeCap) return null

        // Check if it contains gender-specific time caps
        if (timeCap.includes('(Women)') || timeCap.includes('(Men)')) {
            const caps = []

            // Extract women's time cap
            const womenMatch = timeCap.match(/(\d+)\s*min\s*\(Women\)/i)
            if (womenMatch) {
                caps.push(
                    <div key="women" className="event-time-cap women">
                        <span className="timer-icon">⏱</span>
                        <span className="gender-label">W:</span>
                        {womenMatch[1]} min
                    </div>
                )
            }

            // Extract men's time cap
            const menMatch = timeCap.match(/(\d+)\s*min\s*\(Men\)/i)
            if (menMatch) {
                caps.push(
                    <div key="men" className="event-time-cap men">
                        <span className="timer-icon">⏱</span>
                        <span className="gender-label">M:</span>
                        {menMatch[1]} min
                    </div>
                )
            }

            return <div className="time-caps-container">{caps}</div>
        }

        // Single time cap for both genders - remove "Time cap:" prefix
        const cleanTimeCap = timeCap.replace(/^Time cap:\s*/i, '')
        return <div className="event-time-cap">{cleanTimeCap}</div>
    }

    const eventDetails = {
        'Run Row Run': {
            description: 'For time',
            details: '4-mile run\n3,000-meter row\n2-mile run',
            primaryMuscles: ['Cardiovascular', 'Legs', 'Core'],
            secondaryMuscles: ['Shoulders', 'Arms', 'Back']
        },
        'All Crossed Up': {
            description: 'For time',
            details: '20 wall walks\n10 DB shoulder-to-overheads\n20 double-under crossovers\n30 toes-to-bars\n20 double-under crossovers\n10 DB shoulder-to-overheads\n20 double-under crossovers\n30 toes-to-bars\n20 double-under crossovers\n10 DB shoulder-to-overheads',
            weights: 'Women: 70-lb dumbbell\nMen: 100-lb dumbbell',
            timeCap: 'Time cap: 10 min',
            primaryMuscles: ['Shoulders', 'Core', 'Arms'],
            secondaryMuscles: ['Legs', 'Back', 'Cardiovascular']
        },
        'Climbing Couplet': {
            description: '4-3-2-1 reps for time of',
            details: 'Pegboard\nSquat clean + front squat',
            weights: 'Women: 145, 165, 185, 205 lb\nMen: 235, 265, 285, 305 lb',
            timeCap: 'Time cap: 15 min (Women), 10 min (Men)',
            primaryMuscles: ['Back', 'Legs', 'Arms'],
            secondaryMuscles: ['Shoulders', 'Core', 'Grip']
        },
        'Albany Grip Trip': {
            description: '5 rounds for time of',
            details: '400-meter run\n12 deadlifts\n100-foot handstand walk\n*150-foot handstand walk on final round',
            weights: 'Women: 220-lb deadlift\nMen: 350-lb deadlift',
            timeCap: 'Time cap: 25 min (Women), 22 min (Men)',
            primaryMuscles: ['Legs', 'Back', 'Shoulders'],
            secondaryMuscles: ['Core', 'Arms', 'Cardiovascular']
        },
        '1RM Back Squat': {
            description: '1-rep-max back squat',
            details: '',
            primaryMuscles: ['Legs', 'Glutes'],
            secondaryMuscles: ['Core', 'Back']
        },
        'Throttle Up': {
            description: 'For time',
            details: '35-calorie ski erg\n28 chest-to-bar pull-ups\n24 burpee box jump-overs',
            weights: 'Women: 16-lb vest, 20-inch box\nMen: 22-lb vest, 24-inch box',
            timeCap: 'Time cap: 6 min',
            primaryMuscles: ['Back', 'Arms', 'Legs'],
            secondaryMuscles: ['Shoulders', 'Core', 'Cardiovascular']
        },
        'Hammer Down': {
            description: 'Starting 7 minutes after IE6',
            details: '35-calorie C2 bike\n28 bar muscle-ups\n24 burpee box jump-overs',
            weights: 'Women: 20-inch box\nMen: 24-inch box',
            timeCap: 'Time cap: 8 min',
            primaryMuscles: ['Arms', 'Shoulders', 'Legs'],
            secondaryMuscles: ['Back', 'Core', 'Cardiovascular']
        },
        'Going Dark': {
            description: 'For time',
            details: '50/40 calories on the Echo bike\n100-foot yoke carry\n30 deficit handstand push-ups\n100-foot yoke carry\n50/40 calories on the Echo bike',
            timeCap: 'Time cap: 15 min',
            primaryMuscles: ['Shoulders', 'Arms', 'Legs'],
            secondaryMuscles: ['Core', 'Back', 'Cardiovascular']
        },
        'Running Isabel': {
            description: '5 rounds for time of',
            details: '200-foot run\n6 snatches',
            weights: 'Women: 105 lb\nMen: 155 lb',
            primaryMuscles: ['Shoulders', 'Legs', 'Cardiovascular'],
            secondaryMuscles: ['Arms', 'Core', 'Back']
        },
        'Atlas': {
            description: 'For time',
            details: '9/15/21 thrusters\n3/5/7 rope climbs\nThen,\n100-foot overhead walking lunge',
            weights: 'Women: 95 lb\nMen: 135 lb',
            timeCap: 'Time cap: 15 min (Women), 10 min (Men)',
            primaryMuscles: ['Legs', 'Shoulders', 'Arms'],
            secondaryMuscles: ['Core', 'Back', 'Grip']
        }
    }

    // Define the day groupings
    const dayGroups = [
        {
            day: 'Friday',
            events: [0, 1, 2] // Events 1, 2, 3
        },
        {
            day: 'Saturday',
            events: [3, 4, 5, 6] // Events 4, 5, 6, 7
        },
        {
            day: 'Sunday',
            events: [7, 8, 9] // Events 8, 9, 10
        }
    ]

    const currentDay = dayGroups[currentDayIndex]
    const currentEvents = currentDay.events.map(index => events[index])

    const nextDay = () => {
        setCurrentDayIndex((prev) => (prev + 1) % dayGroups.length)
    }

    const prevDay = () => {
        setCurrentDayIndex((prev) => (prev - 1 + dayGroups.length) % dayGroups.length)
    }

    const toggleEventExpansion = (eventName) => {
        setExpandedEvent(expandedEvent === eventName ? null : eventName)
    }

    return (
        <div className="event-browser">
            <div className="event-browser-header">
                <button className="event-nav-btn" onClick={prevDay}>
                    <i className="fas fa-chevron-left"></i>
                </button>
                <h3>{currentDay.day}</h3>
                <button className="event-nav-btn" onClick={nextDay}>
                    <i className="fas fa-chevron-right"></i>
                </button>
            </div>

            <div className="events-grid">
                {currentDay.day === 'Saturday' ? (
                    // Special layout for Saturday with events 6 & 7 grouped
                    <>
                        {/* Events 4 & 5 */}
                        {currentEvents.slice(0, 2).map((eventName, index) => {
                            const eventData = eventDetails[eventName] || { description: '', details: '', weights: '', timeCap: '' }
                            const eventNumber = currentDay.events[index] + 1

                            return (
                                <div key={eventName} className={`event-card ${expandedEvent === eventName ? 'expanded' : ''}`} onClick={() => toggleEventExpansion(eventName)}>
                                    <div className="event-card-header">
                                        <h4>Event {eventNumber}: {eventName}</h4>
                                        <i className={`fas fa-chevron-${expandedEvent === eventName ? 'up' : 'down'} expand-icon`}></i>
                                    </div>
                                    <div className="event-card-content">
                                        <div className="event-description">{eventData.description}</div>
                                        {eventData.details && (
                                            <div className="event-details">
                                                {eventData.details.split('\n').map((line, lineIndex) => (
                                                    <div key={lineIndex} className="event-line">{line}</div>
                                                ))}
                                            </div>
                                        )}
                                        {eventData.weights && (
                                            <div className="event-weights">
                                                {eventData.weights.split('\n').map((line, lineIndex) => (
                                                    <div key={lineIndex} className="weight-line">{line}</div>
                                                ))}
                                            </div>
                                        )}
                                        {eventData.timeCap && renderTimeCaps(eventData.timeCap)}

                                        {expandedEvent === eventName && (
                                            <div className="muscle-groups">
                                                <div className="muscle-section">
                                                    <h5>Primary Muscles</h5>
                                                    <div className="muscle-tags">
                                                        {eventData.primaryMuscles.map((muscle, index) => (
                                                            <span key={index} className="muscle-tag primary">{muscle}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="muscle-section">
                                                    <h5>Secondary Muscles</h5>
                                                    <div className="muscle-tags">
                                                        {eventData.secondaryMuscles.map((muscle, index) => (
                                                            <span key={index} className="muscle-tag secondary">{muscle}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {/* Combined Events 6 & 7 */}
                        <div className="event-card combined-events" onClick={() => toggleEventExpansion('Throttle Up + Hammer Down')}>
                            <div className="event-card-header">
                                <h4>Events 6 & 7: Throttle Up + Hammer Down</h4>
                                <i className={`fas fa-chevron-${expandedEvent === 'Throttle Up + Hammer Down' ? 'up' : 'down'} expand-icon`}></i>
                            </div>
                            <div className="combined-indicator">Back-to-Back</div>
                            <div className="event-card-content">
                                <div className="combined-event-section">
                                    <h5>Event 6: Throttle Up</h5>
                                    <div className="event-description">For time</div>
                                    <div className="event-details">
                                        <div className="event-line">35-calorie ski erg</div>
                                        <div className="event-line">28 chest-to-bar pull-ups</div>
                                        <div className="event-line">24 burpee box jump-overs</div>
                                    </div>
                                    <div className="event-weights">
                                        <div className="weight-line">Women: 16-lb vest, 20-inch box</div>
                                        <div className="weight-line">Men: 22-lb vest, 24-inch box</div>
                                    </div>
                                    {renderTimeCaps("Time cap: 6 min")}
                                </div>

                                <div className="event-separator">
                                    <div className="separator-line"></div>
                                    <div className="separator-text">1 minute rest</div>
                                    <div className="separator-line"></div>
                                </div>

                                <div className="combined-event-section">
                                    <h5>Event 7: Hammer Down</h5>
                                    <div className="event-description">Starting 1 minute after event 6</div>
                                    <div className="event-details">
                                        <div className="event-line">35-calorie C2 bike</div>
                                        <div className="event-line">28 bar muscle-ups</div>
                                        <div className="event-line">24 burpee box jump-overs</div>
                                    </div>
                                    <div className="event-weights">
                                        <div className="weight-line">Women: 20-inch box</div>
                                        <div className="weight-line">Men: 24-inch box</div>
                                    </div>
                                    {renderTimeCaps("Time cap: 8 min")}
                                </div>

                                {expandedEvent === 'Throttle Up + Hammer Down' && (
                                    <div className="muscle-groups">
                                        <div className="muscle-section">
                                            <h5>Primary Muscles</h5>
                                            <div className="muscle-tags">
                                                <span className="muscle-tag primary">Back</span>
                                                <span className="muscle-tag primary">Arms</span>
                                                <span className="muscle-tag primary">Shoulders</span>
                                                <span className="muscle-tag primary">Legs</span>
                                            </div>
                                        </div>
                                        <div className="muscle-section">
                                            <h5>Secondary Muscles</h5>
                                            <div className="muscle-tags">
                                                <span className="muscle-tag secondary">Core</span>
                                                <span className="muscle-tag secondary">Cardiovascular</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    // Regular layout for Friday and Sunday
                    currentEvents.map((eventName, index) => {
                        const eventData = eventDetails[eventName] || { description: '', details: '', weights: '', timeCap: '' }
                        const eventNumber = currentDay.events[index] + 1

                        return (
                            <div key={eventName} className={`event-card ${expandedEvent === eventName ? 'expanded' : ''}`} onClick={() => toggleEventExpansion(eventName)}>
                                <div className="event-card-header">
                                    <h4>Event {eventNumber}: {eventName}</h4>
                                    <i className={`fas fa-chevron-${expandedEvent === eventName ? 'up' : 'down'} expand-icon`}></i>
                                </div>
                                <div className="event-card-content">
                                    <div className="event-description">{eventData.description}</div>
                                    {eventData.details && (
                                        <div className="event-details">
                                            {eventData.details.split('\n').map((line, lineIndex) => (
                                                <div key={lineIndex} className="event-line">{line}</div>
                                            ))}
                                        </div>
                                    )}
                                    {eventData.weights && (
                                        <div className="event-weights">
                                            {eventData.weights.split('\n').map((line, lineIndex) => (
                                                <div key={lineIndex} className="weight-line">{line}</div>
                                            ))}
                                        </div>
                                    )}
                                    {eventData.timeCap && renderTimeCaps(eventData.timeCap)}

                                    {expandedEvent === eventName && (
                                        <div className="muscle-groups">
                                            <div className="muscle-section">
                                                <h5>Primary Muscles</h5>
                                                <div className="muscle-tags">
                                                    {eventData.primaryMuscles.map((muscle, index) => (
                                                        <span key={index} className="muscle-tag primary">{muscle}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="muscle-section">
                                                <h5>Secondary Muscles</h5>
                                                <div className="muscle-tags">
                                                    {eventData.secondaryMuscles.map((muscle, index) => (
                                                        <span key={index} className="muscle-tag secondary">{muscle}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default EventBrowser 