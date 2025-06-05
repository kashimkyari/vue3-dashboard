<template>
  <SpeedInsights />
  <div id="app" :data-theme="isDarkTheme ? 'dark' : 'light'" :class="{ 'mobile-view': isMobile }" ref="appContainer"
    @mousemove="updateMousePosition">
    <!-- Loading overlay with anime.js particles -->
    <div v-if="isCheckingAuth || (isLoggedIn && !userRole)" class="loading-overlay">
      <div class="particle-background" ref="particleContainer"></div>
      <div class="loading-text">{{ loadingMessage }}</div>
      <div class="mouse-follower" ref="mouseFollower"></div>
    </div>

    <transition name="page-transition" mode="out-in">
      <!-- Authentication components -->
      <template v-if="!isCheckingAuth && !isLoggedIn">
        <template v-if="isMobile">
          <MobileLoginComponent v-if="mobileAuthView === 'login'" @login-success="handleLoginSuccess"
            @forgot-password="mobileAuthView = 'forgot-password'" :is-offline="isOffline" key="mobile-login" />
          <MobileForgotPassword v-else-if="mobileAuthView === 'forgot-password'" @back="mobileAuthView = 'login'"
            key="mobile-forgot-password" />
        </template>
        <LoginComponent v-else @login-success="handleLoginSuccess" key="desktop-login" />
      </template>

      <!-- Dashboard content -->
      <div v-else-if="!isCheckingAuth && isLoggedIn && userRole" class="dashboard" key="dashboard"
        ref="dashboardContainer">
        <div class="content-area theme-container">
          <div v-if="isOffline" class="offline-indicator">
            <font-awesome-icon icon="wifi-slash" /> Offline Mode
          </div>

          <div class="debug-info" v-if="showDebugInfo">
            <p>User Role: {{ userRole }}</p>
            <p>Is Admin: {{ userRole === 'admin' }}</p>
            <p>Is Agent: {{ userRole === 'agent' }}</p>
            <p>Is Mobile: {{ isMobile }}</p>
            <p>Is Dark Theme: {{ isDarkTheme }}</p>
            <p>Unread Notifications: {{ unreadNotificationCount }}</p>
            <p>Is Offline: {{ isOffline }}</p>
            <p>Session Last Checked: {{ sessionLastChecked }}</p>
          </div>

          <template v-if="userRole === 'admin'">
            <MobileAdminDashboard v-if="isMobile" key="mobile-admin" :theme="isDarkTheme ? 'dark' : 'light'"
              :unread-notifications="unreadNotificationCount" :is-offline="isOffline" />
            <AdminDashboard v-else key="admin" />
          </template>

          <template v-else-if="userRole === 'agent'">
            <MobileAgentDashboard v-if="isMobile" key="mobile-agent" :theme="isDarkTheme ? 'dark' : 'light'"
              :unread-notifications="unreadNotificationCount" :is-offline="isOffline" />
            <AgentDashboard v-else key="agent" />
          </template>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, provide, nextTick } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faMoon, faSun, faSignOutAlt, faBroadcastTower, faTachometerAlt,
  faVideo, faExclamationTriangle, faChartLine, faCog, faUserLock,
  faUser, faLock, faBell, faComment, faCommentAlt, faEye, faCommentDots,
  faExclamationCircle, faEyeSlash, faSpinner, faWifi3
} from '@fortawesome/free-solid-svg-icons'
import { faGoogle, faApple } from '@fortawesome/free-brands-svg-icons'
import axios from 'axios'
import anime from 'animejs/lib/anime.es.js'
import { SpeedInsights } from '@vercel/speed-insights/vue'
import { useToast } from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import { useIsMobile } from './composables/useIsMobile'

// Components
import LoginComponent from './components/Login.vue'
import AdminDashboard from './components/AdminDashboard.vue'
import AgentDashboard from './components/AgentDashboard.vue'
import MobileAdminDashboard from './components/MobileAdminDashboard.vue'
import MobileAgentDashboard from './components/MobileAgentDashboard.vue'
import MobileLoginComponent from './components/MobileLogin.vue'
import MobileForgotPassword from './components/MobileForgotPassword.vue'

// Icon setup
const faIcons = [
  faMoon, faSun, faSignOutAlt, faBroadcastTower, faTachometerAlt,
  faVideo, faExclamationTriangle, faChartLine, faCog, faUserLock,
  faUser, faLock, faBell, faComment, faCommentAlt, faEye, faCommentDots,
  faExclamationCircle, faEyeSlash, faSpinner, faWifi3
]
const fabIcons = [faGoogle, faApple]
library.add(...faIcons, ...fabIcons)

// State & refs
const toast = useToast()
const isDarkTheme = ref(true)
const isLoggedIn = ref(false)
const isCheckingAuth = ref(true)
const userRole = ref(null)
const appContainer = ref(null)
const sidebar = ref(null)
const logoutButton = ref(null)
const dashboardContainer = ref(null)
const showDebugInfo = ref(false)
const mobileAuthView = ref('login')
const unreadNotificationCount = ref(0)
const isOffline = ref(false)
const sessionLastChecked = ref('Never')
const loadingMessage = ref('Verifying session...')
const maxRetryAttempts = 3
const retryAttempts = ref(0)
const retryDelay = 3000
const sessionToken = ref(null)
const sessionExpiry = ref(null)
const particleContainer = ref(null)
const mouseFollower = ref(null)
const mousePosition = ref({ x: 0, y: 0 })
const particles = ref([])
const floatingParticles = ref([])

const SESSION_TOKEN_KEY = 'session_token'
const SESSION_EXPIRY_KEY = 'session_expiry'
const USER_ROLE_KEY = 'userRole'
const LAST_CHECKED_KEY = 'session_last_checked'

const { isMobile } = useIsMobile()

provide('theme', isDarkTheme)
provide('updateTheme', (isDark) => { isDarkTheme.value = isDark })
provide('toast', toast)

const detectSystemTheme = () => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDarkTheme.value = prefersDark
  localStorage.setItem('themePreference', prefersDark ? 'dark' : 'light')
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
}

watch(isDarkTheme, (newValue) => {
  const theme = newValue ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('themePreference', theme)
})

const createParticle = (x, y) => {
  const particle = document.createElement('div')
  particle.className = 'particle'

  // Random size between 3px and 8px
  const size = Math.random() * 5 + 3
  particle.style.width = `${size}px`
  particle.style.height = `${size}px`

  // Set initial position
  particle.style.left = `${x}px`
  particle.style.top = `${y}px`

  // Random blue hue
  const hue = 200 + Math.random() * 30
  particle.style.backgroundColor = `hsl(${hue}, 100%, 70%)`

  return particle
}

const createFloatingParticles = () => {
  if (!particleContainer.value) return

  // Clear existing particles
  particleContainer.value.innerHTML = ''
  floatingParticles.value = []

  // Create 80 floating particles
  for (let i = 0; i < 80; i++) {
    const particle = document.createElement('div')
    particle.className = 'floating-particle'

    // Random position in viewport
    const x = Math.random() * window.innerWidth
    const y = Math.random() * window.innerHeight
    particle.style.left = `${x}px`
    particle.style.top = `${y}px`

    // Random size between 2px and 6px
    const size = Math.random() * 4 + 2
    particle.style.width = `${size}px`
    particle.style.height = `${size}px`

    // Random blue hue
    const hue = 200 + Math.random() * 30
    particle.style.backgroundColor = `hsl(${hue}, 100%, 70%)`
    particle.style.boxShadow = `0 0 ${size * 2}px hsl(${hue}, 100%, 70%)`

    particleContainer.value.appendChild(particle)
    floatingParticles.value.push(particle)

    // Animate particle
    anime({
      targets: particle,
      translateX: () => anime.random(-100, 100),
      translateY: () => anime.random(-100, 100),
      duration: () => anime.random(3000, 8000),
      easing: 'easeInOutSine',
      direction: 'alternate',
      loop: true
    })

    // Pulsing glow effect
    anime({
      targets: particle,
      scale: () => [1, 1 + Math.random() * 0.5],
      opacity: () => [0.7, 1],
      duration: () => anime.random(2000, 4000),
      easing: 'easeInOutSine',
      direction: 'alternate',
      loop: true
    })
  }
}

const updateMousePosition = (e) => {
  mousePosition.value = {
    x: e.clientX,
    y: e.clientY
  }

  // Update mouse follower position
  if (mouseFollower.value) {
    mouseFollower.value.style.left = `${e.clientX}px`
    mouseFollower.value.style.top = `${e.clientY}px`
  }

  // Create trail particles
  if (particleContainer.value && particles.value.length < 100) {
    const particle = createParticle(e.clientX, e.clientY)
    particleContainer.value.appendChild(particle)
    particles.value.push(particle)

    // Animate trail particle
    anime({
      targets: particle,
      translateX: () => anime.random(-50, 50),
      translateY: () => anime.random(-50, 50),
      scale: [1, 0],
      opacity: [1, 0],
      duration: 1000,
      easing: 'easeOutExpo',
      complete: () => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle)
          particles.value = particles.value.filter(p => p !== particle)
        }
      }
    })
  }
}

const checkNetworkStatus = () => {
  const online = navigator.onLine
  isOffline.value = !online

  if (!online && isLoggedIn.value) {
    toast.warning("You're currently offline. Limited functionality available.")
  }

  return online
}

const handleNetworkChange = () => {
  const wasOffline = isOffline.value
  const online = checkNetworkStatus()

  if (online && wasOffline) {
    toast.info("You're back online. Syncing data...")
    checkAuthentication(true)
  }
}

const isSessionExpired = () => {
  if (!sessionExpiry.value) return true
  return new Date().getTime() > parseInt(sessionExpiry.value)
}

const storeSessionToken = (token, expiresIn = 86400) => {
  if (!token) return

  sessionToken.value = token
  const expiryTime = new Date().getTime() + (expiresIn * 1000)
  sessionExpiry.value = expiryTime.toString()

  localStorage.setItem(SESSION_TOKEN_KEY, token)
  localStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString())
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

const restoreSessionFromStorage = () => {
  const storedToken = localStorage.getItem(SESSION_TOKEN_KEY)
  const storedExpiry = localStorage.getItem(SESSION_EXPIRY_KEY)
  const storedRole = localStorage.getItem(USER_ROLE_KEY)
  const lastChecked = localStorage.getItem(LAST_CHECKED_KEY)

  if (lastChecked) {
    sessionLastChecked.value = new Date(parseInt(lastChecked)).toLocaleString()
  }

  if (storedToken && storedExpiry) {
    sessionToken.value = storedToken
    sessionExpiry.value = storedExpiry

    if (!isSessionExpired()) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
      if (storedRole) {
        userRole.value = storedRole
        return true
      }
    }
  }

  return false
}

const hideLoading = () => {
  anime({
    targets: '.loading-overlay',
    opacity: [1, 0],
    duration: 800,
    easing: 'easeOutExpo',
    complete: () => (isCheckingAuth.value = false)
  })
}

const handleAuthSuccess = (user) => {
  isLoggedIn.value = true
  userRole.value = user.username === 'admin' ? 'admin' : 'agent'
  localStorage.setItem(USER_ROLE_KEY, userRole.value)
  animateControls()

  nextTick(() => {
    userRole.value = user.username === 'admin' ? 'admin' : 'agent'
  })

  if (user.token) {
    storeSessionToken(user.token, user.expiresIn || 86400)
  }

  const now = new Date().getTime()
  localStorage.setItem(LAST_CHECKED_KEY, now.toString())
  sessionLastChecked.value = new Date(now).toLocaleString()
}

const checkAuthentication = async (isRetry = false) => {
  try {
    if (isRetry) {
      loadingMessage.value = `Reconnecting... (Attempt ${retryAttempts.value + 1}/${maxRetryAttempts})`
    } else {
      loadingMessage.value = 'Verifying session...'
    }

    if (!checkNetworkStatus()) {
      if (restoreSessionFromStorage()) {
        isLoggedIn.value = true
        hideLoading()
        return
      } else {
        isLoggedIn.value = false
        hideLoading()
        return
      }
    }

    const useStoredSession = restoreSessionFromStorage()
    const { data } = await axios.get('/api/session')

    if (data.isLoggedIn) {
      handleAuthSuccess(data.user)
    } else {
      if (useStoredSession && !isSessionExpired()) {
        try {
          const tokenAuthResponse = await axios.post('/api/auth/token-verify', {
            token: sessionToken.value
          })

          if (tokenAuthResponse.data && tokenAuthResponse.data.valid) {
            handleAuthSuccess({
              role: userRole.value,
              token: tokenAuthResponse.data.refreshedToken || sessionToken.value,
              expiresIn: tokenAuthResponse.data.expiresIn || 86400
            })
            hideLoading()
            return
          }
        } catch (tokenError) {
          console.error("Token verification failed:", tokenError)
        }
      }
      logout(false)
    }
  } catch (error) {
    if (retryAttempts.value < maxRetryAttempts) {
      retryAttempts.value++
      if (restoreSessionFromStorage() && !isSessionExpired()) {
        isLoggedIn.value = true
        userRole.value = localStorage.getItem(USER_ROLE_KEY)
      }
      setTimeout(() => checkAuthentication(true), retryDelay)
      return
    }

    if (restoreSessionFromStorage() && !isSessionExpired()) {
      isLoggedIn.value = true
      toast.warning("Connection issues detected. Using offline mode.")
    } else {
      toast.error("Authentication check failed. Please log in again.")
      logout(false)
    }
  } finally {
    hideLoading()
  }
}

const animateControls = () => {
  anime({
    targets: '.header-controls',
    translateY: ['-50px', '0'],
    opacity: [0, 1],
    duration: 800,
    easing: 'easeOutExpo'
  })

  if (sidebar.value && isLoggedIn.value) {
    anime({
      targets: sidebar.value,
      translateX: ['-100%', '0'],
      opacity: [0, 1],
      duration: 800,
      easing: 'easeOutExpo'
    })

    anime({
      targets: sidebar.value.querySelectorAll('.sidebar-item'),
      translateX: ['-30px', '0'],
      opacity: [0, 1],
      delay: anime.stagger(60),
      duration: 800,
      easing: 'easeOutCubic'
    })
  }

  if (logoutButton.value) {
    anime({
      targets: logoutButton.value,
      translateY: ['20px', '0'],
      opacity: [0, 1],
      duration: 800,
      easing: 'easeOutExpo'
    })
  }
}

const startSessionRefresh = () => {
  const REFRESH_INTERVAL = 5 * 60 * 1000
  const sessionInterval = setInterval(async () => {
    if (isOffline.value) return

    try {
      const { data } = await axios.get('/api/session')
      if (data.isLoggedIn) {
        if (data.user && data.user.token) {
          storeSessionToken(data.user.token, data.user.expiresIn || 86400)
        }
        const now = new Date().getTime()
        localStorage.setItem(LAST_CHECKED_KEY, now.toString())
        sessionLastChecked.value = new Date(now).toLocaleString()
      } else {
        toast.warning("Your session has expired. Please log in again.")
        logout(false)
      }
    } catch (error) {
      console.error("Session refresh error:", error)
    }
  }, REFRESH_INTERVAL)

  onUnmounted(() => {
    if (sessionInterval) {
      clearInterval(sessionInterval)
    }
  })
}

const handleLoginSuccess = (userData) => {
  retryAttempts.value = 0
  handleAuthSuccess(userData)
  toast.success("Welcome back!", {
    timeout: 2000,
    position: "top-center",
    icon: true
  })
  startSessionRefresh()
}

const logout = (showAlert = true) => {
  localStorage.removeItem(SESSION_TOKEN_KEY)
  localStorage.removeItem(SESSION_EXPIRY_KEY)
  localStorage.removeItem(USER_ROLE_KEY)
  isLoggedIn.value = false
  userRole.value = null
  sessionToken.value = null
  sessionExpiry.value = null
  delete axios.defaults.headers.common['Authorization']
  if (showAlert) {
    toast.info("You have been logged out", {
      timeout: 2000,
      position: "top-center",
      icon: true
    })
  }
}

onMounted(() => {
  detectSystemTheme()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    isDarkTheme.value = e.matches
  })

  axios.defaults.baseURL = "https://monitor-backend.jetcamstudio.com:5000"
  axios.defaults.withCredentials = true

  axios.interceptors.request.use(config => {
    console.log(`Making ${config.method.toUpperCase()} request to ${config.url}`)
    return config
  })

  axios.interceptors.response.use(
    response => {
      console.log(`Response from ${response.config.url}:`, response.status)
      return response
    },
    error => {
      console.error(`Error response from ${error.config?.url}:`, error.response?.status)
      return Promise.reject(error)
    }
  )

  document.documentElement.setAttribute('data-theme', isDarkTheme.value ? 'dark' : 'light')

  // Initialize particles
  nextTick(() => {
    createFloatingParticles()

    // Initialize mouse follower
    if (mouseFollower.value) {
      anime({
        targets: mouseFollower.value,
        scale: [0, 1],
        opacity: [0, 1],
        duration: 500,
        easing: 'easeOutExpo'
      })
    }
  })

  const urlParams = new URLSearchParams(window.location.search)
  showDebugInfo.value = urlParams.get('debug') === 'true'

  window.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.altKey && e.code === 'KeyD') {
      showDebugInfo.value = !showDebugInfo.value
      toast.info(showDebugInfo.value ? 'Debug mode activated' : 'Debug mode deactivated')
    }
  })

  window.addEventListener('online', handleNetworkChange)
  window.addEventListener('offline', handleNetworkChange)
  checkNetworkStatus()
  setTimeout(checkAuthentication, 1500)
})

onUnmounted(() => {
  window.removeEventListener('online', handleNetworkChange)
  window.removeEventListener('offline', handleNetworkChange)
})
</script>

<style>
@import url('./styles/theme.css');

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  overflow: hidden;
  cursor: none;
  /* Hide default cursor */
}

.particle-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.floating-particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 2;
  transform: translateZ(0);
}

.particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 3;
  transform: translateZ(0);
}

.mouse-follower {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: hsl(210, 100%, 70%);
  box-shadow: 0 0 15px hsl(210, 100%, 70%),
    0 0 30px hsl(210, 100%, 70%);
  pointer-events: none;
  z-index: 10;
  transform: translate(-50%, -50%);
  transition: transform 0.1s ease-out;
}

.loading-text {
  position: relative;
  z-index: 4;
  color: var(--text-primary);
  font-size: 1.4rem;
  font-weight: 600;
  text-align: center;
  opacity: 0.95;
  animation: text-fade 2s ease-in-out infinite;
  text-shadow:
    0 0 10px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(0, 0, 0, 0.3);
  padding: 15px 25px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(5px);
}

@keyframes text-fade {

  0%,
  100% {
    opacity: 0.9;
  }

  50% {
    opacity: 1;
  }
}

[data-theme="dark"] .loading-overlay {
  background: rgba(10, 15, 30, 0.95);
}

[data-theme="light"] .loading-overlay {
  background: rgba(230, 240, 255, 0.95);
}

[data-theme="light"] .loading-text {
  color: #1a1a2e;
  text-shadow:
    0 0 10px rgba(255, 255, 255, 0.7),
    0 0 20px rgba(255, 255, 255, 0.5);
}

@media (max-width: 768px) {
  .loading-text {
    font-size: 1.2rem;
    padding: 10px 20px;
  }

  .mouse-follower {
    width: 8px;
    height: 8px;
    box-shadow: 0 0 10px hsl(210, 100%, 70%),
      0 0 20px hsl(210, 100%, 70%);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {

  .floating-particle,
  .particle,
  .mouse-follower {
    animation: none !important;
  }

  .loading-text {
    animation: none !important;
  }
}
</style>