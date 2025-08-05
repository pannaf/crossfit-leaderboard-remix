const Controls = ({
    athletes,
    events,
    selectedAthlete,
    selectedEvent,
    selectedPlace,
    upToEvent,
    onAthleteChange,
    onEventChange,
    onPlaceChange,
    onUpToEventChange,
    onApplyChange,
    onResetAll
}) => {
    const places = [
        '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
        '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th', '20th',
        '21st', '22nd', '23rd', '24th', '25th', '26th', '27th', '28th', '29th', '30th'
    ]

    return (
        <div className="controls">
            <div className="control-group">
                <label htmlFor="athlete-select">Select Athlete:</label>
                <select
                    id="athlete-select"
                    value={selectedAthlete}
                    onChange={(e) => onAthleteChange(e.target.value)}
                >
                    <option value="">Choose an athlete...</option>
                    {athletes.map(athlete => (
                        <option key={athlete.name} value={athlete.name}>
                            {athlete.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="control-group">
                <label htmlFor="event-select">Select Event:</label>
                <select
                    id="event-select"
                    value={selectedEvent}
                    onChange={(e) => onEventChange(e.target.value)}
                >
                    <option value="">Choose an event...</option>
                    {events.map(event => (
                        <option key={event} value={event}>
                            {event}
                        </option>
                    ))}
                </select>
            </div>

            <div className="control-group">
                <label htmlFor="new-place">New Place:</label>
                <select
                    id="new-place"
                    value={selectedPlace}
                    onChange={(e) => onPlaceChange(e.target.value)}
                >
                    <option value="">Select place...</option>
                    {places.map(place => (
                        <option key={place} value={place}>
                            {place}
                        </option>
                    ))}
                </select>
            </div>

            <div className="control-group">
                <label htmlFor="up-to-event">Show Rankings Up To:</label>
                <select
                    id="up-to-event"
                    value={upToEvent}
                    onChange={(e) => onUpToEventChange(e.target.value)}
                >
                    <option value="">All Events (Final Rankings)</option>
                    {events.map((event, index) => (
                        <option key={event} value={event}>
                            {event} (After {index + 1} Event{index !== 0 ? 's' : ''})
                        </option>
                    ))}
                </select>
            </div>

            <button className="btn btn-primary" onClick={onApplyChange}>
                <i className="fas fa-play"></i> Apply Change
            </button>

            <button className="btn btn-secondary" onClick={onResetAll}>
                <i className="fas fa-undo"></i> Reset All
            </button>
        </div>
    )
}

export default Controls 