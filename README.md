# LiveStream Monitoring System - Frontend

## Overview

A modern Vue.js 3 SPA for real-time livestream monitoring, notifications, and messaging. It provides responsive dashboards for both admin and agent roles, with real-time updates, dark/light themes, and mobile support.

---

## Architecture

- **Vue.js 3**: Composition API, Single File Components (SFC)
- **Vue CLI**: Project scaffolding and build
- **Webpack**: Custom build configuration
- **Socket.IO Client**: Real-time updates
- **Axios**: HTTP client for API calls
- **Anime.js**: UI animations
- **FontAwesome**: Icon library
- **date-fns**: Date/time formatting

### Main Folders

- `src/components/`: All UI components (Admin, Agent, Notifications, Messaging, etc.)
- `src/services/`: API and utility services
- `src/styles/`: Global and theme styles
- `src/composables/`: Reusable logic (e.g., mobile detection)
- `public/`: Static assets

---

## Configuration

- **API URL**: Set in `vue.config.js` (dev proxy) and in Axios defaults in `App.vue`
- **WebSocket**: Connects to backend Socket.IO endpoints (see `NotificationComponent.vue`, `AdminMessageComponent.vue`)
- **Theme**: Dark/light mode auto-detected and user-switchable
- **Environment Variables**: Use `.env` for custom builds if needed

---

## Component Breakdown

### Authentication

- `Login.vue`, `MobileLogin.vue`: Login forms, session management, theme toggle
- `MobileForgotPassword.vue`: Password recovery (mobile)

### Dashboards

- `AdminDashboard.vue`: Admin overview, navigation, stats
- `AgentDashboard.vue`: Agent overview, assigned streams/tasks
- `MobileAdminDashboard.vue`, `MobileAgentDashboard.vue`: Mobile-optimized dashboards

### Monitoring

- `AgentStreamsComponent.vue`: Agent's assigned streams, detection status, refresh controls
- `StreamCard.vue`, `StreamDetailsModal.vue`: Stream info and details
- `StatCard.vue`: Dashboard stats

### Notifications

- `AdminNotificationsPage.vue`, `AgentNotificationsComponent.vue`, `NotificationComponent.vue`: Real-time notifications, filters, sound, modals, actions

### Messaging

- `AdminMessageComponent.vue`: Real-time chat, typing indicators, file attachments, user status, info panel

### Tasks

- `AgentTasksComponent.vue`: Agent's task list, filters, actions
- `AddAgentModal.vue`: Admin agent creation modal

---

## Usage & Development

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run serve
```

- Hot reload, source maps, and dev proxy enabled

### Build for production

```bash
npm run build
```

- Output in `dist/`

### Linting

```bash
npm run lint
```

---

## Real-Time Features

- **Notifications**: Socket.IO connection for instant alerts (see `NotificationComponent.vue`)
- **Messaging**: Real-time chat with typing indicators, unread badges, and file attachments (see `AdminMessageComponent.vue`)
- **Stream Status**: Live updates for stream monitoring and detection

---

## Theming & Responsiveness

- **Dark/Light Mode**: Auto-detects system preference, user can toggle
- **Mobile Support**: Mobile-first layouts, touch-friendly controls, mobile-specific components
- **Animations**: Particle backgrounds, animated transitions, feedback for actions

---

## Example: Using the Notification Component

```vue
<NotificationComponent :isDarkMode="true" :refreshInterval="30000" />
```

---

## API Integration

- All API calls use Axios, with base URL set in `App.vue`
- Auth token is stored in localStorage and sent as Bearer token
- WebSocket events handled in each component (see `setupSocketConnection` in notification/messaging components)

---

## File/Folder Reference

- `src/components/` — All UI and logic components
- `src/services/` — API and utility services
- `src/styles/` — CSS variables, themes, global styles
- `vue.config.js` — Dev/prod config, proxy, build options
- `webpack.config.js` — Custom build tweaks

---

## Security

- Token-based authentication (JWT)
- Secure WebSocket connections
- XSS/CSRF protection via backend
- Session expiry and refresh logic

---

## Troubleshooting

- If API calls fail, check backend URL and CORS settings
- For WebSocket issues, verify backend is running and accessible
- For theme issues, clear localStorage and reload

---

## License

Copyright © 2025 LiveStream Monitoring System
