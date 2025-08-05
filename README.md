# CrossFit Games Leaderboard Simulator (React)

A modern React application built with Vite that lets you experiment with different event finishes and see how they affect the overall CrossFit Games leaderboard rankings.

## Features

- **Interactive Leaderboard**: View the complete CrossFit Games leaderboard with all 30 athletes and 10 events
- **Scenario Testing**: Change any athlete's finish in any event and see the impact on rankings
- **Real-time Calculations**: Automatic recalculation of total points and rankings
- **Visual Feedback**: Highlighted changes and rank movement indicators
- **Point System Display**: Visual reference for the CrossFit Games point system
- **Original vs Simulated Views**: Toggle between original results and your simulated scenarios
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern React**: Built with React 18, Vite, and modern JavaScript features

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
   cd crossfit-leaderboard-react
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

## Example Scenario

Try this interesting scenario: What if Austin Hatfield had won "Running Isabel" (Event 9) instead of finishing 1st? 

1. Select "Austin Hatfield" as the athlete
2. Select "Running Isabel" as the event  
3. Select "1st" as the new place
4. Click "Apply Change"

You'll see that Austin would have gained 0 points (he already finished 1st), but you can experiment with other scenarios!

## Point System

The app uses the official CrossFit Games point system:
- 1st place: 100 points
- 2nd place: 96 points
- 3rd place: 92 points
- And so on, decreasing by 4 points for places 1-14, 3 points for places 15-20, and 3 points for places 21-29
- 30th place: 0 points

## Project Structure

```
crossfit-leaderboard-react/
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

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the [MIT License](LICENSE).

---

Enjoy experimenting with different "what-if" scenarios in the CrossFit Games! 🏋️‍♂️
