<template>
  <div class="agent-settings-page">
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>Settings</h3>
      </div>
      <ul class="sidebar-menu">
        <li class="menu-item" :class="{ active: activeSection === 'general' }" @click="setActiveSection('general')">
          <font-awesome-icon icon="cog" class="menu-icon" />
          <span>General Settings</span>
        </li>
        <li class="menu-item" :class="{ active: activeSection === 'tracking' }" @click="setActiveSection('tracking')">
          <font-awesome-icon icon="tags" class="menu-icon" />
          <span>Tracking</span>
          <ul v-if="activeSection === 'tracking'" class="submenu">
            <li class="submenu-item" :class="{ active: subSection === 'keywords' }" @click="setSubSection('keywords')">
              Keywords
            </li>
            <li class="submenu-item" :class="{ active: subSection === 'objects' }" @click="setSubSection('objects')">
              Objects
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <div class="main-content">
      <div class="settings-panel">
        <div class="panel-header">
          <h2>{{ activeSection === 'general' ? 'General Settings' : 'Tracking' }}</h2>
        </div>

        <div class="settings-form">
          <transition name="section-fade">
            <div class="settings-body" :key="activeSection + subSection">
              <div v-if="activeSection === 'general'" class="form-section">
                <h3 class="section-title">Notifications</h3>
                <div class="form-group">
                  <div class="toggle-option">
                    <span>Email Notifications</span>
                    <div class="toggle-switch" :class="{ active: settings.emailNotifications }"
                      @click="toggleEmailNotifications">
                      <div class="toggle-switch-handle"></div>
                    </div>
                  </div>

                  <div class="toggle-option">
                    <span>Push Notifications</span>
                    <div class="toggle-switch" :class="{ active: settings.pushNotifications }"
                      @click="togglePushNotifications">
                      <div class="toggle-switch-handle"></div>
                    </div>
                  </div>

                  <div class="telegram-status" v-if="settings.pushNotifications">
                    <div v-if="telegramConnected" class="status-connected">
                      <font-awesome-icon :icon="['fab', 'telegram']" class="telegram-icon" />
                      <div class="status-text">
                        <span class="status-label">Connected to Telegram</span>
                        <span class="status-username">@{{ telegramUsername }}</span>
                      </div>
                      <button class="btn btn-outline" @click="showTelegramModal = true">
                        Change
                      </button>
                    </div>
                    <div v-else class="status-disconnected" @click="showTelegramModal = true">
                      <font-awesome-icon :icon="['fab', 'telegram']" class="telegram-icon" />
                      <div class="status-text">
                        <span class="status-label">Connect to Telegram</span>
                        <span class="status-description">Required for push notifications</span>
                      </div>
                      <font-awesome-icon icon="chevron-right" class="icon-right" />
                    </div>
                  </div>
                </div>

                <h3 class="section-title">Appearance</h3>
                <div class="form-group">
                  <div class="theme-options">
                    <div class="theme-option" :class="{ selected: isDarkTheme }" @click="$emit('set-theme', true)">
                      <font-awesome-icon icon="moon" class="theme-icon" />
                      <span>Dark Mode</span>
                    </div>
                    <div class="theme-option" :class="{ selected: !isDarkTheme }" @click="$emit('set-theme', false)">
                      <font-awesome-icon icon="sun" class="theme-icon" />
                      <span>Light Mode</span>
                    </div>
                  </div>
                </div>
              </div>

              <section v-if="activeSection === 'tracking' && subSection === 'keywords'" class="form-section">
                <h3 class="section-title">Manage Keywords</h3>
                <div class="form-group">
                  <h4>Add Keyword</h4>
                  <form @submit.prevent="addKeyword">
                    <input v-model="newKeyword.keyword" placeholder="Enter Keyword" required
                      :disabled="isAddingKeyword" />
                    <button type="submit" class="btn btn-primary" :disabled="isAddingKeyword">
                      <font-awesome-icon v-if="isAddingKeyword" icon="spinner" spin class="icon-left" />
                      Add Keyword
                    </button>
                  </form>
                </div>
                <div class="form-group">
                  <h4>Update Keyword</h4>
                  <form @submit.prevent="updateKeyword">
                    <select v-model="updateKeywordData.id" required :disabled="isUpdatingKeyword"
                      aria-label="Select a keyword to update">
                      <option value="" disabled>Select a Keyword</option>
                      <option v-for="keyword in keywords" :key="keyword.id" :value="keyword.id">{{ keyword.keyword }}
                      </option>
                    </select>
                    <input v-model="updateKeywordData.keyword" placeholder="New Keyword" required
                      :disabled="isUpdatingKeyword" />
                    <button type="submit" class="btn btn-primary" :disabled="isUpdatingKeyword">
                      <font-awesome-icon v-if="isUpdatingKeyword" icon="spinner" spin class="icon-left" />
                      Update Keyword
                    </button>
                  </form>
                </div>
                <div class="form-group">
                  <h4>Remove Keyword</h4>
                  <form @submit.prevent="removeKeyword">
                    <select v-model="deleteKeywordId" required :disabled="isRemovingKeyword"
                      aria-label="Select a keyword to remove">
                      <option value="" disabled>Select a Keyword</option>
                      <option v-for="keyword in keywords" :key="keyword.id" :value="keyword.id">{{ keyword.keyword }}
                      </option>
                    </select>
                    <button type="submit" class="btn btn-danger" :disabled="isRemovingKeyword">
                      <font-awesome-icon v-if="isRemovingKeyword" icon="spinner" spin class="icon-left" />
                      Remove Keyword
                    </button>
                  </form>
                </div>
              </section>
              <section v-if="activeSection === 'tracking' && subSection === 'objects'" class="form-section">
                <h3 class="section-title">Manage Objects</h3>
                <div class="form-group">
                  <h4>Add Object</h4>
                  <form @submit.prevent="addObject">
                    <input v-model="newObject.object_name" placeholder="Enter Object Name" required
                      :disabled="isAddingObject" />
                    <button type="submit" class="btn btn-primary" :disabled="isAddingObject">
                      <font-awesome-icon v-if="isAddingObject" icon="spinner" spin class="icon-left" />
                      Add Object
                    </button>
                  </form>
                </div>
                <div class="form-group">
                  <h4>Update Object</h4>
                  <form @submit.prevent="updateObject">
                    <select v-model="updateObjectData.id" required :disabled="isUpdatingObject"
                      aria-label="Select an object to update">
                      <option value="" disabled>Select an Object</option>
                      <option v-for="obj in objects" :key="obj.id" :value="obj.id">{{ obj.object_name }}</option>
                    </select>
                    <input v-model="updateObjectData.object_name" placeholder="New Object Name" required
                      :disabled="isUpdatingObject" />
                    <button type="submit" class="btn btn-primary" :disabled="isUpdatingObject">
                      <font-awesome-icon v-if="isUpdatingObject" icon="spinner" spin class="icon-left" />
                      Update Object
                    </button>
                  </form>
                </div>
                <div class="form-group">
                  <h4>Remove Object</h4>
                  <form @submit.prevent="removeObject">
                    <select v-model="deleteObjectId" required :disabled="isRemovingObject"
                      aria-label="Select an object to remove">
                      <option value="" disabled>Select an Object</option>
                      <option v-for="obj in objects" :key="obj.id" :value="obj.id">{{ obj.object_name }}</option>
                    </select>
                    <button type="submit" class="btn btn-danger" :disabled="isRemovingObject">
                      <font-awesome-icon v-if="isRemovingObject" icon="spinner" spin class="icon-left" />
                      Remove Object
                    </button>
                  </form>
                </div>
              </section>
            </div>
          </transition>

          <div class="action-buttons">
            <button class="btn btn-primary" @click="saveSettings">
              <font-awesome-icon icon="save" class="icon-left" />
              Save Changes
            </button>
            <button class="btn btn-danger" @click="showLogoutConfirmation = true" :disabled="isLoggingOut">
              <font-awesome-icon :icon="isLoggingOut ? 'spinner' : 'sign-out-alt'" :spin="isLoggingOut"
                class="icon-left" />
              {{ isLoggingOut ? 'Logging out...' : 'Logout' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <transition name="modal-fade">
      <div v-if="showLogoutConfirmation" class="modal-overlay" @click="showLogoutConfirmation = false">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <font-awesome-icon icon="sign-out-alt" class="modal-icon" />
            <h3>Confirm Logout</h3>
            <button class="close-btn" @click="showLogoutConfirmation = false">
              <font-awesome-icon icon="times" />
            </button>
          </div>
          <p class="modal-message">Are you sure you want to log out of your account?</p>
          <div class="modal-actions">
            <button class="btn btn-danger" @click="handleLogout(playLogoutAnimation)" :disabled="isLoggingOut">
              <font-awesome-icon :icon="isLoggingOut ? 'spinner' : 'sign-out-alt'" :spin="isLoggingOut"
                class="icon-left" />
              {{ isLoggingOut ? 'Logging out...' : 'Logout' }}
            </button>
            <button class="btn btn-outline" @click="showLogoutConfirmation = false">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </transition>

    <div v-if="showLogoutAnimation" class="logout-animation-overlay">
      <div class="logout-animation-container" ref="logoutAnimationContainer">
        <font-awesome-icon icon="sign-out-alt" class="logout-icon" ref="logoutIcon" />
        <div class="logout-message" ref="logoutMessage">Logging out...</div>
        <div class="logout-spinner" ref="logoutSpinner">
          <div class="spinner-circle" v-for="n in 12" :key="n" :style="`--i: ${n}`"></div>
        </div>
      </div>
    </div>

    <TelegramOnboarding :is-visible="showTelegramModal" :existing-username="telegramUsername"
      :existing-chat-id="telegramChatId" @close="showTelegramModal = false"
      @telegram-connected="handleTelegramConnected" />
  </div>
</template>

<script setup>
import { defineProps, defineEmits, ref, nextTick, onMounted } from 'vue'
import anime from 'animejs/lib/anime.es.js'
import TelegramOnboarding from './TelegramOnboarding.vue'
import { useSettings } from '../composables/useSettings'
import axios from 'axios'
import { useToast } from 'vue-toastification'

const toast = useToast()

defineProps({
  isDarkTheme: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['fetch-settings', 'set-theme', 'logout'])

const {
  settings,
  telegramConnected,
  telegramUsername,
  telegramChatId,
  showTelegramModal,
  isLoggingOut,
  showLogoutConfirmation,
  toggleEmailNotifications,
  togglePushNotifications,
  handleTelegramConnected,
  handleLogout,
  saveSettings
} = useSettings()

const activeSection = ref('general')
const subSection = ref('keywords')

const setActiveSection = (sectionId) => {
  activeSection.value = sectionId
  if (sectionId === 'tracking' && !subSection.value) {
    subSection.value = 'keywords'
  }
}

const setSubSection = (sub) => {
  subSection.value = sub
}

const keywords = ref([])
const objects = ref([])

const isAddingKeyword = ref(false)
const isUpdatingKeyword = ref(false)
const isRemovingKeyword = ref(false)
const isAddingObject = ref(false)
const isUpdatingObject = ref(false)
const isRemovingObject = ref(false)

const newKeyword = ref({ keyword: '' })
const updateKeywordData = ref({ id: '', keyword: '' })
const deleteKeywordId = ref('')
const newObject = ref({ object_name: '' })
const updateObjectData = ref({ id: '', object_name: '' })
const deleteObjectId = ref('')

const apiCall = async (method, url, data = null, loadingState = null, showSuccessToast = true) => {
  if (loadingState) loadingState.value = true
  try {
    const response = await axios({
      method,
      url: `${url}`,
      data,
      withCredentials: true
    })
    if (showSuccessToast && response.data.message) {
      toast.success(response.data.message)
    }
    return response.data
  } catch (error) {
    const message = error.response?.data?.message || 'Something went wrong'
    toast.error(message)
    throw error
  } finally {
    if (loadingState) loadingState.value = false
  }
}

const fetchKeywords = async () => {
  try {
    const response = await apiCall('get', '/api/keywords', null, null, false)
    keywords.value = response
  } catch (error) {
    keywords.value = []
  }
}

const fetchObjects = async () => {
  try {
    const response = await apiCall('get', '/api/objects', null, null, false)
    objects.value = response
  } catch (error) {
    objects.value = []
  }
}

const fetchAllData = async () => {
  await Promise.all([
    fetchKeywords(),
    fetchObjects()
  ])
}

onMounted(fetchAllData)

window.addEventListener('beforeunload', () => {
  localStorage.removeItem('keywords')
  localStorage.removeItem('objects')
})

const addKeyword = async () => {
  if (!newKeyword.value.keyword) {
    toast.error('Keyword is required')
    return
  }
  try {
    const response = await apiCall('post', '/api/keywords', newKeyword.value, isAddingKeyword, true)
    newKeyword.value = { keyword: '' }
    await fetchKeywords()
    return response
  } catch (error) {
    // Error handled in apiCall
  }
}

const updateKeyword = async () => {
  if (!updateKeywordData.value.id || !updateKeywordData.value.keyword) {
    toast.error('Please select a keyword and provide a new value')
    return
  }
  try {
    const response = await apiCall('put', `/api/keywords/${updateKeywordData.value.id}`, { keyword: updateKeywordData.value.keyword }, isUpdatingKeyword, true)
    updateKeywordData.value = { id: '', keyword: '' }
    await fetchKeywords()
    return response
  } catch (error) {
    // Error handled in apiCall
  }
}

const removeKeyword = async () => {
  if (!deleteKeywordId.value) {
    toast.error('Please select a keyword to remove')
    return
  }
  try {
    const response = await apiCall('delete', `/api/keywords/${deleteKeywordId.value}`, null, isRemovingKeyword, true)
    deleteKeywordId.value = ''
    await fetchKeywords()
    return response
  } catch (error) {
    // Error handled in apiCall
  }
}

const addObject = async () => {
  if (!newObject.value.object_name) {
    toast.error('Object name is required')
    return
  }
  try {
    const response = await apiCall('post', '/api/objects', newObject.value, isAddingObject, true)
    newObject.value = { object_name: '' }
    await fetchObjects()
    return response
  } catch (error) {
    // Error handled in apiCall
  }
}

const updateObject = async () => {
  if (!updateObjectData.value.id || !updateObjectData.value.object_name) {
    toast.error('Please select an object and provide a new name')
    return
  }
  try {
    const response = await apiCall('put', `/api/objects/${updateObjectData.value.id}`, { object_name: updateObjectData.value.object_name }, isUpdatingObject, true)
    updateObjectData.value = { id: '', object_name: '' }
    await fetchObjects()
    return response
  } catch (error) {
    // Error handled in apiCall
  }
}

const removeObject = async () => {
  if (!deleteObjectId.value) {
    toast.error('Please select an object to remove')
    return
  }
  try {
    const response = await apiCall('delete', `/api/objects/${deleteObjectId.value}`, null, isRemovingObject, true)
    deleteObjectId.value = ''
    await fetchObjects()
    return response
  } catch (error) {
    // Error handled in apiCall
  }
}

const showLogoutAnimation = ref(false)
const logoutAnimationContainer = ref(null)
const logoutIcon = ref(null)
const logoutMessage = ref(null)
const logoutSpinner = ref(null)

const playLogoutAnimation = () => {
  showLogoutAnimation.value = true

  nextTick(() => {
    if (logoutAnimationContainer.value) {
      anime({
        targets: logoutAnimationContainer.value,
        opacity: [0, 1],
        scale: [0.8, 1],
        duration: 600,
        easing: 'easeOutCubic'
      })
    }

    if (logoutIcon.value) {
      anime({
        targets: logoutIcon.value,
        scale: [0, 1],
        opacity: [0, 1],
        duration: 500,
        easing: 'easeOutBack'
      })
    }

    if (logoutMessage.value) {
      anime({
        targets: logoutMessage.value,
        opacity: [0, 1],
        translateY: [20, 0],
        delay: 200,
        duration: 400,
        easing: 'easeOutQuad'
      })
    }

    if (logoutSpinner.value) {
      const spinnerCircles = logoutSpinner.value.querySelectorAll('.spinner-circle')
      anime({
        targets: spinnerCircles,
        scale: [0, 1],
        opacity: [0, 1],
        delay: anime.stagger(50),
        duration: 400,
        easing: 'easeOutExpo',
        complete: () => {
          if (logoutSpinner.value) {
            anime({
              targets: logoutSpinner.value,
              rotate: '360deg',
              duration: 1500,
              loop: true,
              easing: 'linear'
            })
          }
        }
      })
    }

    setTimeout(() => {
      completeLogout()
    }, 2000)
  })
}

const completeLogout = () => {
  anime({
    targets: logoutAnimationContainer.value,
    opacity: 0,
    scale: 0.8,
    duration: 400,
    easing: 'easeInQuad',
    complete: () => {
      showLogoutAnimation.value = false
      emit('logout')
      localStorage.removeItem('userSettings')
      window.location.href = '/dashboard'
    }
  })
}
</script>

<style scoped>
@import '../styles/shared.css';

.agent-settings-page {
  display: flex;
  min-height: 100vh;
  background-color: var(--background-color);
}

/* Sidebar */
.sidebar {
  width: 250px;
  background-color: var(--input-bg);
  border-right: 1px solid var(--border-color);
  padding: 1.5rem;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.05);
}

.sidebar-header {
  margin-bottom: 2rem;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
}

.sidebar-menu {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu-item {
  flex-direction: column;
  align-items: flex-start;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.menu-item:hover {
  background-color: var(--hover-bg);
}

.menu-item.active {
  background-color: var(--primary-color);
  color: white;
}

.menu-icon {
  margin-right: 0.75rem;
  font-size: 1.2rem;
}

.menu-item span {
  font-size: 1rem;
  font-weight: 500;
}

.submenu {
  list-style: none;
  padding-left: 2rem;
  margin-top: 0.5rem;
  width: 100%;
}

.submenu-item {
  padding: 0.5rem 0;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.3s ease;
}

.submenu-item.active {
  font-weight: 600;
  color: white;
}

.submenu-item:hover {
  color: rgb(171, 199, 224);
}

/* Main Content */
.main-content {
  flex: 1;
  padding: 2rem;
  display: flex;
  justify-content: center;
}

.settings-panel {
  max-width: 700px;
  width: 100%;
  background-color: var(--input-bg);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.panel-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
}

.panel-header h2 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--text-color);
}

.settings-form {
  padding: 2rem;
}

.form-section {
  margin-bottom: 2.5rem;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-color);
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

input,
select {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background-color: var(--input-bg);
  color: var(--text-color);
  transition: border-color 0.3s, transform 0.2s;
}

input:focus,
select:focus {
  border-color: var(--primary-color);
  outline: none;
  transform: scale(1.02);
}

select {
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg fill='%232C3E50' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>");
  background-repeat: no-repeat;
  background-position-x: 98%;
  background-position-y: 50%;
}

[data-theme="dark"] select {
  background-image: url("data:image/svg+xml;utf8,<svg fill='%23ECF0F1' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>");
}

.toggle-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
  font-size: 1rem;
  transition: background-color 0.2s ease;
}

.toggle-option:hover {
  background-color: var(--hover-bg);
}

.toggle-switch {
  width: 50px;
  height: 26px;
  border-radius: 26px;
  background-color: var(--border-color);
  position: relative;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.toggle-switch.active {
  background-color: var(--primary-color);
}

.toggle-switch-handle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: white;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.3s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active .toggle-switch-handle {
  transform: translateX(24px);
}

.theme-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  border-radius: 10px;
  background-color: var(--hover-bg);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.theme-option:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.theme-option.selected {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-dark-color);
}

.theme-icon {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
}

.theme-option span {
  font-size: 1rem;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.btn .icon-left {
  margin-right: 0.5rem;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  border: none;
}

.btn-danger {
  background-color: var(--danger-color);
  color: white;
  border: none;
}

.btn-outline {
  background-color: transparent;
  border: 2px solid var(--border-color);
  color: var(--text-color);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background-color: var(--input-bg);
  border-radius: 12px;
  width: 100%;
  max-width: 450px;
  padding: 1.5rem;
  position: relative;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  position: relative;
}

.modal-icon {
  font-size: 1.5rem;
  color: var(--danger-color);
  margin-right: 0.75rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text-color);
}

.close-btn {
  position: absolute;
  top: 0;
  right: 0;
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: var(--text-color);
}

.modal-message {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

/* Modal transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Section transitions */
.section-fade-enter-active,
.section-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.section-fade-enter-from,
.section-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Logout Animation Styles */
.logout-animation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

[data-theme='light'] .logout-animation-overlay {
  background-color: rgba(248, 249, 250, 0.9);
}

[data-theme='dark'] .logout-animation-overlay {
  background-color: rgba(18, 18, 18, 0.9);
}

.logout-animation-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
}

.logout-icon {
  font-size: 4rem;
  color: var(--primary-color);
  margin-bottom: 1.5rem;
  opacity: 0;
}

[data-theme='light'] .logout-icon {
  color: var(--light-primary);
}

[data-theme='dark'] .logout-icon {
  color: var(--dark-primary);
}

.logout-message {
  font-size: 1.3rem;
  color: white;
  text-align: center;
  margin-bottom: 2rem;
  opacity: 0;
}

[data-theme='light'] .logout-message {
  color: var(--light-text);
}

[data-theme='dark'] .logout-message {
  color: var(--dark-text);
}

.logout-spinner {
  position: relative;
  width: 80px;
  height: 80px;
}

.spinner-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--light-primary);
  transform: translate(-50%, -50%) rotate(calc(var(--i) * 30deg)) translateY(-30px);
  transform-origin: center;
  opacity: calc(1 - (var(--i) * 0.08));
}

[data-theme='dark'] .spinner-circle {
  background-color: var(--dark-primary);
}

/* Telegram Status */
.telegram-status {
  margin-top: 1rem;
}

.status-connected,
.status-disconnected {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.status-connected {
  background-color: var(--success-bg);
}

.status-disconnected {
  background-color: var(--warning-bg);
  cursor: pointer;
}

.status-disconnected:hover {
  background-color: var(--hover-bg);
}

.telegram-icon {
  font-size: 1.5rem;
  margin-right: 1rem;
  color: var(--primary-color);
}

.status-text {
  flex: 1;
}

.status-label {
  display: block;
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-color);
}

.status-username,
.status-description {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.icon-right {
  font-size: 1rem;
  color: var(--text-secondary);
}

/* Toastification */
:deep(.Vue-Toastification__toast--success) {
  background-color: var(--primary-color);
  color: white;
}

:deep(.Vue-Toastification__toast--error) {
  background-color: var(--danger-color);
  color: white;
}

:deep(.Vue-Toastification__toast) {
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>