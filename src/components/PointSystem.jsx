const PointSystem = ({ pointSystem }) => {
    return (
        <div className="point-system-panel">
            <h3>Point System</h3>
            <div className="point-grid">
                {Object.entries(pointSystem).map(([place, points]) => (
                    <div key={place} className="point-item">
                        <div className="point-place">{place}</div>
                        <div className="point-value">{points}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default PointSystem 