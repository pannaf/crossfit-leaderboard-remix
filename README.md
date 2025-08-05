# CrossFit Games Leaderboard Simulator

**Live Demo: [https://pannaf.github.io/crossfit-leaderboard-remix/](https://pannaf.github.io/crossfit-leaderboard-remix/)**

> [!NOTE]
> **Contributions welcome!** This is an open-source project and we'd love your help making it even better. See the [Contributing](#contributing) section below for ideas. 

A modern React application that lets you experiment with different event finishes and see how they affect the overall CrossFit Games leaderboard rankings. No more mental math required! 

## What's This All About?

Ever wondered what would happen if your favorite athlete had just pushed a little harder in that one event? What if they had won instead of finishing 3rd? How would that change their overall standing? 

This tool lets you play out those "what-if" scenarios in real-time. Perfect for:
- **Fans** who want to explore alternate outcomes
- **Analysts** studying event impact on final rankings  
- **Anyone** who's ever thought "if only they had..."

For me, as a fan, this was the thought that sparked the whole project:

> It'd be cool if CrossFit had a version of the leaderboard where you could test different event finishes & see the revised rank. Like I'd be curious if Austin Hatfield - after declaring he'd win event 10 after his event 8 & 9 wins - had won event 10, where he would have finished.. but I don't want to do that math in my head 😂

## Current Features

- **Interactive Leaderboard**: View the complete CrossFit Games leaderboard with all 30 athletes and 10 events
- **Scenario Testing**: Change any athlete's finish in any event and see the impact on rankings
- **Real-time Calculations**: Automatic recalculation of total points and rankings
- **Visual Feedback**: Highlighted changes and rank movement indicators
- **Point System Display**: Visual reference for the CrossFit Games point system
- **Original vs Simulated Views**: Toggle between original results and your simulated scenarios
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Future Ideas (Contributions Welcome!)

Here are some feature ideas that could make this even more powerful:

### Multi-Year Analysis
- Compare athletes across different CrossFit Games years
- Track performance evolution over time
- Historical "what-if" scenarios

### Muscle Group Performance
- Analyze what if athletes improved specific movements or muscle groups, such as: "What if they improved their bicep strength?"

### Event Impact Analysis
- Identify which events had the most potential to change standings
- Find the most "leaderboard-changing" events
- Discover which athletes were most affected by specific events

### Community Features
- Share and view other people's analyses
- Community-driven scenario suggestions
- Collaborative "what-if" explorations

### Advanced Analytics
- Statistical probability of different outcomes
- Performance trend analysis
- Athlete strength/weakness identification

## Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and development server
- **CSS3** - Modern styling with CSS Grid and Flexbox
- **Font Awesome** - Icons
- **Inter Font** - Modern typography

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone or download the project
2. Navigate to the project directory:
   ```bash
   cd crossfit-leaderboard-remix
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and go to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## How to Use

1. **Select an Athlete**: Choose any athlete from the dropdown menu
2. **Select an Event**: Pick one of the 10 CrossFit Games events
3. **Choose New Place**: Select a new finishing position (1st through 30th)
4. **Apply Change**: Click "Apply Change" to see the impact on the leaderboard
5. **View Results**: Switch between "Original" and "Simulated" views to compare
6. **Reset**: Use "Reset All" to return to the original leaderboard

## Try This Scenario

Remember Austin Hatfield's bold declaration? Let's test it:

1. Select "Austin Hatfield" as the athlete
2. Select "Running Isabel" (Event 9) as the event  
3. Select "1st" as the new place (he already won, but try other scenarios!)
4. Click "Apply Change"

**Fun fact**: If Austin had won Event 10 instead of his actual finish, he would have been just 1 point behind Jayson for 2nd place! (Though as the original post noted, Jayson might not have paused at the 10ft mark in that case...)

## Point System

The app uses the official CrossFit Games point system:
- 1st place: 100 points
- 2nd place: 96 points
- 3rd place: 92 points
- And so on, decreasing by 4 points for places 1-14, 3 points for places 15-20, and 3 points for places 21-29
- 30th place: 0 points

## Contributing

**Contributions are welcome!**

This project is perfect for:
- **React developers** who want to add new features
- **Data analysts** who want to improve the analytics
- **CrossFit fans** who have ideas for new scenarios
- **UI/UX designers** who want to make it look even better

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Ideas for Contributions

- Add support for other CrossFit Games years
- Implement the muscle group performance analysis
- Create event impact visualization
- Add community sharing features
- Improve the UI/UX design
- Add more statistical analysis tools

## Project Structure

```
crossfit-leaderboard-remix/
├── public/
│   └── leaderboard_data.json    # Processed data
├── src/
│   ├── components/
│   │   ├── Header.jsx           # App header
│   │   ├── Controls.jsx         # Selection controls
│   │   ├── StatsPanel.jsx       # Statistics display
│   │   ├── Leaderboard.jsx      # Main leaderboard table
│   │   └── PointSystem.jsx      # Point system display
│   ├── App.jsx                  # Main app component
│   ├── App.css                  # Styles
│   └── main.jsx                 # App entry point
├── index.html                   # HTML template
└── package.json                 # Dependencies and scripts
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Data Format

The app expects a JSON file with the following structure:

```json
{
  "events": ["Event 1", "Event 2", ...],
  "point_system": {
    "1st": 100,
    "2nd": 96,
    ...
  },
  "athletes": [
    {
      "name": "Athlete Name",
      "rank": 1,
      "total_points": 787,
      "events": {
        "Event 1": {
          "place": 8,
          "time": "48:54.00",
          "points": 72
        }
      }
    }
  ]
}
```

## License

This project is open source and available under the [MIT License](LICENSE).

---

**Ready to explore the "what-if" scenarios? Start experimenting at [https://pannaf.github.io/crossfit-leaderboard-remix/](https://pannaf.github.io/crossfit-leaderboard-remix/)!**
