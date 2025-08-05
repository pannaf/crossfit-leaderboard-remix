import React, { useState } from 'react'
import Controls from './Controls'
import EventBrowser from './EventBrowser'
import PointSystem from './PointSystem'

const SidebarTabs = ({
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
    onResetAll,
    stats,
    pointSystem,
    onToggleSidebar,
    isCollapsed
}) => {
    const [activeTab, setActiveTab] = useState(0)

    const tabs = [
        { id: 0, name: 'Controls', icon: 'fas fa-sliders-h' },
        { id: 1, name: 'Events', icon: 'fas fa-dumbbell' },
        { id: 2, name: 'Points', icon: 'fas fa-chart-bar' }
    ]

    return (
        <div className="sidebar-tabs">
            <button
                className="sidebar-toggle"
                onClick={onToggleSidebar}
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                <i className="fas fa-chevron-left"></i>
            </button>
            <div className="tab-header">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <i className={tab.icon}></i>
                        <span>{tab.name}</span>
                    </button>
                ))}
            </div>

            <div className="tab-content">
                {activeTab === 0 && (
                    <div className="tab-panel">
                        <Controls
                            athletes={athletes}
                            events={events}
                            selectedAthlete={selectedAthlete}
                            selectedEvent={selectedEvent}
                            selectedPlace={selectedPlace}
                            upToEvent={upToEvent}
                            onAthleteChange={onAthleteChange}
                            onEventChange={onEventChange}
                            onPlaceChange={onPlaceChange}
                            onUpToEventChange={onUpToEventChange}
                            onApplyChange={onApplyChange}
                            onResetAll={onResetAll}
                        />

                    </div>
                )}

                {activeTab === 1 && (
                    <div className="tab-panel">
                        <EventBrowser events={events} />
                    </div>
                )}

                {activeTab === 2 && (
                    <div className="tab-panel">
                        <PointSystem pointSystem={pointSystem} />
                    </div>
                )}
            </div>
        </div>
    )
}

export default SidebarTabs 