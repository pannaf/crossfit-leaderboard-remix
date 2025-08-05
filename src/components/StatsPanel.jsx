const StatsPanel = ({ stats }) => {
    return (
        <div className="stats-panel">
            <div className="stat-card">
                <h3>Original Rank</h3>
                <div className="stat-value">{stats.originalRank}</div>
            </div>
            <div className="stat-card">
                <h3>New Rank</h3>
                <div className="stat-value">{stats.newRank}</div>
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
        </div>
    )
}

export default StatsPanel 