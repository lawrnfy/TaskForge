# TaskForge — Chrome Extension MVP ✨

A **modern, beautiful** Chrome extension that combines Pomodoro timer, smart task management, and a credits economy system to help you stay focused and productive.

## 🚀 Quick Start

1. **Install the Extension:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the `taskforge-extension` folder
   - The TaskForge icon should appear in your toolbar

2. **Generate Icons (Optional):**
   - Open `create_icons.html` in your browser
   - Right-click each canvas and save as PNG files:
     - Save 16x16 as `icons/icon16.png`
     - Save 48x48 as `icons/icon48.png`
     - Save 128x128 as `icons/icon128.png`

3. **Start Using:**
   - Click the TaskForge toolbar icon
   - Add your first task with importance and effort estimates
   - Start a Pomodoro session to begin earning credits

## ✨ New Features & Design

### 🎨 Modern UI/UX
- **Gradient backgrounds** and smooth animations
- **Inter font** for crisp typography
- **Dark theme** with accent color customization
- **Responsive design** that works on all screen sizes
- **Smooth transitions** and hover effects

### 🍅 Enhanced Pomodoro Timer
- **Visual progress bar** showing session completion
- **Real-time countdown** with smooth animations
- **Session info display** showing current task
- **Smart button states** (active, paused, running)
- **Badge integration** with minutes remaining

### 📋 Advanced Task Management
- **Task filtering** (All, High Priority, Recent)
- **Edit functionality** for existing tasks
- **Empty state** with helpful messaging
- **Importance levels** with visual indicators
- **Effort estimation** with time tracking

### 🎯 Smart Focus Features
- **Animated site blocking** with modern overlay
- **Live stats display** on blocked sites
- **Smooth transitions** when blocking/unblocking
- **Customizable block lists** with easy management

### ⚙️ Enhanced Settings
- **Color picker** with 5 beautiful themes
- **Real-time preview** of color changes
- **Form validation** with helpful error messages
- **Auto-save** for instant feedback
- **Keyboard shortcuts** (Ctrl+S to save)

### 💰 Credits Economy
- **Visual progress indicators** for credit goals
- **Streak tracking** with bonus rewards
- **Importance multipliers** for higher rewards
- **Monthly reset** with goal tracking

## 🎨 Design System

### Color Themes
- **Blue** (Default) - Professional and calm
- **Green** - Growth and productivity
- **Orange** - Energy and creativity
- **Purple** - Premium and sophisticated
- **Pink** - Playful and modern

### Typography
- **Inter font family** for optimal readability
- **Consistent font weights** (400, 500, 600, 700, 800)
- **Proper spacing** and line heights
- **Responsive text sizing**

### Animations
- **Smooth transitions** (0.2s ease)
- **Hover effects** with transform animations
- **Loading states** with skeleton screens
- **Success feedback** with scale animations

## 📁 File Structure

```
taskforge-extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Service worker (core logic)
├── popup.html            # Modern main interface
├── popup.js              # Enhanced popup functionality
├── popup.css             # Modern dark theme styling
├── options.html          # Beautiful settings page
├── options.js            # Advanced settings functionality
├── content_blocker.js    # Animated site blocking overlay
├── create_icons.html     # Icon generator tool
├── README.md             # This file
└── icons/                # Icon directory
```

## 🎯 Usage Guide

### Adding Tasks
1. Open TaskForge popup
2. Enter task title with helpful placeholder
3. Set importance (1-5 stars with descriptions)
4. Set estimated effort (5-120 minutes)
5. Click "Add Task" with success animation

### Starting Pomodoro
- **Quick start:** Click "Start" for default session
- **Task-specific:** Select a task and click "Start for Task"
- **Direct from task list:** Click "Start" on any task
- **Visual feedback:** Timer shows progress and current task

### Managing Sessions
- **Pause:** Temporarily stop with visual indication
- **Resume:** Continue from where you left off
- **Stop:** End session early with confirmation
- **Progress tracking:** Real-time completion percentage

### Settings & Customization
- **Color themes:** Choose from 5 beautiful options
- **Timer settings:** Customize work/break durations
- **Focus mode:** Configure site blocking preferences
- **Notifications:** Enable/disable various alerts

## 🔧 Technical Highlights

### Modern Architecture
- **Manifest V3** compliant
- **Service worker** for background functionality
- **Local-first** data storage
- **Responsive design** principles
- **Accessibility** considerations

### Performance Features
- **Efficient rendering** with minimal reflows
- **Smooth animations** using CSS transforms
- **Optimized storage** with structured data
- **Memory management** with proper cleanup

### User Experience
- **Keyboard shortcuts** for power users
- **Form validation** with real-time feedback
- **Error handling** with user-friendly messages
- **Loading states** for better perceived performance

## 🚧 Future Features

### Planned Enhancements
- **Task completion tracking** and analytics
- **Calendar integration** (read-only)
- **Quiet hours** (10pm-8am auto-pause)
- **Account sync** (optional E2EE)
- **Free month logic** implementation
- **Break timer** with automatic work session start
- **Task categories** and filtering
- **Export/import** data functionality

### Design Improvements
- **Dark/light theme** toggle
- **Custom CSS** injection for advanced users
- **Animation preferences** (reduced motion)
- **Accessibility** enhancements (screen reader support)

## 🐛 Troubleshooting

### Extension Not Loading
- Ensure Developer mode is enabled
- Check for console errors in `chrome://extensions/`
- Verify all files are present in the folder
- Try reloading the extension

### Notifications Not Working
- Check Chrome notification permissions
- Ensure TaskForge has notification access
- Try clicking "Start Pomodoro" to test
- Verify settings are properly saved

### Site Blocking Issues
- Verify blocked sites are correctly formatted (hostname only)
- Check that site blocking is enabled in settings
- Ensure you're on a blocked site during active Pomodoro
- Try refreshing the page after enabling blocking

### Design Issues
- Clear browser cache and reload extension
- Check if Inter font is loading properly
- Verify CSS animations are supported in your browser
- Try different color themes to isolate issues

## 📄 License

This is an MVP implementation with modern design principles. Feel free to modify and extend for your needs.

## 🤝 Contributing

This is a working MVP with beautiful design. To contribute:
1. Test the extension thoroughly
2. Report any bugs or design issues
3. Suggest improvements or new features
4. Submit pull requests with fixes or enhancements

---

**Happy focusing! 🎯✨**
