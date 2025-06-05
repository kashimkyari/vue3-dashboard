<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <button class="modal-close" @click="$emit('close')" v-wave>
        <font-awesome-icon icon="times" />
      </button>
      <div class="modal-header">
        <h3>{{ stream.streamer_username }}</h3>
        <div class="stream-tags">
          <span class="tag platform">{{ stream.platform }}</span>
          <div class="agent-tags">
            <span v-if="!hasAssignedAgents" class="tag agent unassigned">
              Unassigned
            </span>
            <span 
              v-for="assignment in stream.assignments" 
              :key="assignment.id" 
              class="tag agent"
              v-tooltip="'Agent ID: ' + assignment.agent_id"
            >
              {{ assignedAgentNames[assignment.agent_id] || 'Agent ' + assignment.agent_id }}
            </span>
          </div>
          <span class="tag stream-id">ID: {{ stream.id }}</span>
        </div>
      </div>
      <div class="modal-body">
        <div class="stream-player-container">
          <video ref="videoPlayer" class="video-player"></video>
          <div v-if="isLoading" class="loading-overlay">
            <font-awesome-icon icon="spinner" spin class="loading-icon" />
            <div>Loading stream...</div>
          </div>
          <div class="detection-controls">
            <button class="detection-toggle" :class="{
              'active': isDetecting,
              'loading': isDetectionLoading,
              'error': detectionError
            }" @click="toggleDetection" :title="getDetectionButtonTooltip"
              :disabled="!isOnline || isDetectionLoading">
              <span class="detection-icon">
                <font-awesome-icon v-if="isDetectionLoading" icon="spinner" spin />
                <font-awesome-icon v-else-if="detectionError" icon="exclamation-circle" />
                <font-awesome-icon v-else :icon="isDetecting ? 'stop-circle' : 'play-circle'" />
              </span>
              <span class="detection-label">{{ getDetectionButtonText }}</span>
            </button>
          </div>
        </div>
        <div v-if="detections.length > 0" class="detections-section">
          <h4>Recent Detections</h4>
          <div class="detections-grid">
            <div 
              v-for="(alert, index) in detections" 
              :key="index"
              class="detection-card"
              v-wave
            >
              <img :src="alert.image_url" alt="Detection" class="detection-image" />
              <div class="detection-info">
                <div class="detection-class">{{ alert.class }}</div>
                <div class="detection-confidence">
                  {{ (alert.confidence * 100).toFixed(1) }}% confidence
                </div>
                <div class="detection-time">{{ formatTime(alert.timestamp) }}</div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="refreshError" class="error-banner">
          {{ refreshError }}
        </div>
      </div>
      <div class="modal-footer">
        <!-- Removed assign agent and refresh buttons -->
      </div>
    </div>
  </div>
</template>

<script>
import Hls from 'hls.js'
import anime from 'animejs'
import { ref, onMounted, onBeforeUnmount, watch, computed, inject } from 'vue'
import axios from 'axios'

export default {
  name: 'StreamDetailsModal',
  props: {
    stream: {
      type: Object,
      required: true
    },
    detections: {
      type: Array,
      default: () => []
    },
    isRefreshing: {
      type: Boolean,
      default: false
    },
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'detection-toggled', 'stream-updated'],
  setup(props, { emit }) {
    const refreshError = ref(null)
    const videoPlayer = ref(null)
    const hls = ref(null)
    const isLoading = ref(true)
    const isDetecting = ref(props.stream.is_monitored)
    const isDetectionLoading = ref(false)
    const detectionError = ref(null)
    const isOnline = ref(props.stream.status === 'online' || props.stream.status === 'monitoring')
    const toast = inject('toast', null)
    const agentCache = ref({})
    const allAgentsFetched = ref(false)
    
    const hasAssignedAgents = computed(() => {
      return props.stream.assignments && props.stream.assignments.length > 0
    })

    const assignedAgentNames = computed(() => {
      if (!hasAssignedAgents.value) return {}
      const names = {}
      props.stream.assignments.forEach(assignment => {
        if (assignment.agent && assignment.agent.username) {
          names[assignment.agent_id] = assignment.agent.username
        } else {
          const agentId = assignment.agent_id
          names[agentId] = agentCache.value[agentId] || `Agent ${agentId}`
        }
      })
      return names
    })

    const getDetectionButtonText = computed(() => {
      if (isDetectionLoading.value) return 'Loading...'
      if (detectionError.value) return 'Error'
      return isDetecting.value ? 'Stop' : 'Monitor'
    })

    const getDetectionButtonTooltip = computed(() => {
      if (isDetectionLoading.value) return 'Processing detection request...'
      if (detectionError.value) return `Detection error: ${detectionError.value}`
      return isDetecting.value ? 'Stop detection' : 'Start detection'
    })

    const fetchAllAgents = async () => {
      if (allAgentsFetched.value) return
      try {
        const response = await axios.get('/api/agents')
        const agents = response.data || []
        agents.forEach(agent => {
          agentCache.value[agent.id] = agent.username || `Agent ${agent.id}`
        })
        allAgentsFetched.value = true
      } catch (error) {
        console.error('Error fetching all agents:', error)
        fetchAgentUsernames()
      }
    }

    const fetchAgentUsernames = async () => {
      if (!hasAssignedAgents.value) return
      for (const assignment of props.stream.assignments) {
        if (assignment.agent && assignment.agent.username) {
          agentCache.value[assignment.agent_id] = assignment.agent.username
        } else {
          const agentId = assignment.agent_id
          if (!agentCache.value[agentId]) {
            try {
              const response = await axios.get(`/api/agents/${agentId}`)
              agentCache.value[agentId] = response.data.username || `Agent ${agentId}`
            } catch (error) {
              console.error(`Error fetching username for agent ${agentId}:`, error)
              agentCache.value[agentId] = `Agent ${agentId}`
            }
          }
        }
      }
    }

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }

    const initializeVideo = () => {
      if (!videoPlayer.value) return
      
      try {
        isLoading.value = true
        
        let m3u8Url = null
        
        if (props.stream.platform.toLowerCase() === 'chaturbate' && props.stream.chaturbate_m3u8_url) {
          m3u8Url = props.stream.chaturbate_m3u8_url
        } else if (props.stream.platform.toLowerCase() === 'stripchat' && props.stream.stripchat_m3u8_url) {
          m3u8Url = props.stream.stripchat_m3u8_url
        }
        
        if (!m3u8Url) {
          refreshError.value = 'No valid streaming URL available for this stream'
          isLoading.value = false
          return
        }
        
        if (Hls.isSupported()) {
          destroyHls()
          
          hls.value = new Hls({
            startLevel: 0,
            capLevelToPlayerSize: true,
            maxBufferLength: 30,
            maxMaxBufferLength: 60
          })
          
          hls.value.loadSource(m3u8Url)
          hls.value.attachMedia(videoPlayer.value)
          
          hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
            videoPlayer.value.muted = true
            videoPlayer.value.play().catch(e => {
              console.warn('Autoplay prevented:', e)
            })
            isLoading.value = false
            
            anime({
              targets: videoPlayer.value,
              opacity: [0, 1],
              duration: 800,
              easing: 'easeOutSine'
            })
          })
          
          hls.value.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data)
            if (data.fatal) {
              switch(data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  refreshError.value = 'Network error while loading the stream'
                  hls.value.startLoad()
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  refreshError.value = 'Media error while playing the stream'
                  hls.value.recoverMediaError()
                  break
                default:
                  refreshError.value = 'Error loading the stream'
                  destroyHls()
                  break
              }
            }
          })
        } 
        else if (videoPlayer.value.canPlayType('application/vnd.apple.mpegurl')) {
          videoPlayer.value.src = m3u8Url
          videoPlayer.value.addEventListener('loadedmetadata', () => {
            videoPlayer.value.muted = true
            videoPlayer.value.play().catch(e => {
              console.warn('Autoplay prevented:', e)
            })
            isLoading.value = false
          })
          
          videoPlayer.value.addEventListener('error', () => {
            refreshError.value = 'Error loading the stream'
            isLoading.value = false
          })
        } else {
          refreshError.value = 'HLS streaming is not supported by your browser'
          isLoading.value = false
        }
      } catch (error) {
        console.error('Error initializing video stream:', error)
        refreshError.value = 'Failed to load stream data'
        isLoading.value = false
      }
    }
    
    const destroyHls = () => {
      if (hls.value) {
        hls.value.destroy()
        hls.value = null
      }
      
      if (videoPlayer.value) {
        videoPlayer.value.pause()
        videoPlayer.value.removeAttribute('src')
        videoPlayer.value.load()
      }
    }

    const checkDetectionStatus = async () => {
      try {
        const response = await axios.get(`/api/detection-status/${props.stream.id}`)
        isDetecting.value = response.data.isDetecting
        isDetectionLoading.value = response.data.isDetectionLoading
        detectionError.value = response.data.detectionError
        isOnline.value = response.data.status === 'online' || response.data.status === 'monitoring'
      } catch (error) {
        console.error('Error checking detection status:', error)
        detectionError.value = error.response?.data?.error || error.message
      }
    }

    const toggleDetection = async () => {
      if (isDetectionLoading.value) return

      try {
        const statusResponse = await axios.get(`/api/detection-status/${props.stream.id}`)
        if (statusResponse.data.isDetecting === isDetecting.value) {
          isDetectionLoading.value = true
          detectionError.value = null
          try {
            const response = await axios.post('/api/trigger-detection', {
              stream_id: props.stream.id,
              stop: isDetecting.value
            })

            isDetecting.value = response.data.isDetecting
            isDetectionLoading.value = response.data.isDetectionLoading
            detectionError.value = response.data.detectionError

            toast.success(
              isDetecting.value
                ? `Detection started for ${props.stream.streamer_username}`
                : `Detection stopped for ${props.stream.streamer_username}`
            )
            emit('detection-toggled', { streamId: props.stream.id, isDetecting: isDetecting.value })
          } catch (error) {
            console.error('Error toggling detection:', error)
            detectionError.value = error.response?.data?.error || error.message
            toast.error(`Error toggling detection: ${detectionError.value}`)
          } finally {
            isDetectionLoading.value = false
          }
        } else {
          isDetecting.value = statusResponse.data.isDetecting
          isDetectionLoading.value = statusResponse.data.isDetectionLoading
          detectionError.value = statusResponse.data.detectionError
          toast.info(`Detection state updated for ${props.stream.streamer_username}`)
        }
      } catch (error) {
        console.error('Error checking detection status before toggle:', error)
        detectionError.value = error.response?.data?.error || error.message
        toast.error(`Error checking detection status: ${detectionError.value}`)
      }
    }
    
    onMounted(() => {
      anime({
        targets: '.modal-content',
        translateY: [30, 0],
        opacity: [0, 1],
        easing: 'easeOutExpo',
        duration: 600
      })
      
      initializeVideo()
      fetchAllAgents()
      checkDetectionStatus()
      
      anime({
        targets: '.detection-card',
        scale: [0.9, 1],
        opacity: [0, 1],
        delay: anime.stagger(100),
        easing: 'easeOutElastic(1, .8)',
        duration: 800
      })
    })
    
    onBeforeUnmount(() => {
      destroyHls()
    })
    
    watch(() => props.stream.id, () => {
      destroyHls()
      initializeVideo()
    })

    watch(() => props.stream.status, (newStatus) => {
      isOnline.value = newStatus === 'online' || newStatus === 'monitoring'
    })

    watch(() => props.stream.is_monitored, (newMonitored) => {
      isDetecting.value = newMonitored
    })

    watch(() => props.stream.assignments, () => {
      if (!allAgentsFetched.value) {
        fetchAllAgents()
      }
    }, { deep: true })

    return {
      refreshError,
      videoPlayer,
      isLoading,
      hasAssignedAgents,
      assignedAgentNames,
      formatTime,
      isDetecting,
      isDetectionLoading,
      detectionError,
      isOnline,
      toggleDetection,
      getDetectionButtonText,
      getDetectionButtonTooltip
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background-color: var(--input-bg);
  border-radius: 10px;
  width: 100%;
  max-width: 800px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  position: relative;
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  font-size: 1.2rem;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  padding: 8px;
  z-index: 10;
}

.modal-close:hover {
  opacity: 1;
}

.modal-header {
  padding: 25px;
  border-bottom: 1px solid var(--input-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-color);
}

.stream-tags {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.agent-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tag {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
}

.tag.platform {
  background-color: rgba(0, 123, 255, 0.2);
  color: var(--primary-color);
}

.tag.agent {
  background-color: rgba(40, 167, 69, 0.2);
  color: #28a745;
}

.tag.agent.unassigned {
  background-color: rgba(108, 117, 125, 0.2);
  color: #6c757d;
}

.tag.stream-id {
  background-color: rgba(108, 117, 125, 0.2);
  color: #6c757d;
}

.modal-body {
  padding: 20px;
}

.stream-player-container {
  width: 100%;
  height: 300px;
  background-color: black;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
  position: relative;
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 5;
}

.loading-icon {
  font-size: 2rem;
  margin-bottom: 10px;
  animation: spin 1s linear infinite;
}

.detection-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}

.detection-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: rgba(40, 167, 69, 0.85);
  color: white;
  border: none;
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.detection-toggle:hover:not(:disabled) {
  background-color: rgb(103, 124, 108);
  transform: translateY(-2px);
}

.detection-toggle.active {
  background-color: rgba(220, 53, 69, 0.85);
}

.detection-toggle.active:hover:not(:disabled) {
  background-color: rgba(200, 33, 49, 0.85);
  transform: translateY(-2px);
}

.detection-toggle.loading {
  background-color: rgba(255, 193, 7, 0.85);
  pointer-events: none;
}

.detection-toggle.error {
  background-color: rgba(220, 53, 69, 0.85);
  animation: shake 0.3s;
}

.detection-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.detections-section h4 {
  margin: 20px 0 15px 0;
  font-size: 1.2rem;
  color: var(--text-color);
}

.detections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
}

.detection-card {
  background-color: var(--hover-bg);
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.detection-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.detection-image {
  width: 100%;
  height: 100px;
  object-fit: cover;
  background-color: var(--input-bg);
}

.detection-info {
  padding: 10px;
}

.detection-class {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 3px;
  color: var(--text-color);
}

.detection-confidence {
  font-size: 0.8rem;
  opacity: 0.8;
  color: var(--text-secondary);
}

.detection-time {
  font-size: 0.7rem;
  opacity: 0.6;
  margin-top: 5px;
  color: var(--text-secondary);
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--input-border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.error-banner {
  background-color: #ffebee;
  color: #b71c1c;
  padding: 12px;
  border-radius: 4px;
  margin-top: 20px;
  border: 1px solid #ffcdd2;
  font-size: 0.9rem;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes shake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  50% { transform: translateX(2px); }
  75% { transform: translateX(-2px); }
  100% { transform: translateX(0); }
}

@media (max-width: 576px) {
  .modal-content {
    max-height: 85vh;
  }
  
  .stream-player-container {
    height: 250px;
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .detections-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 400px) {
  .modal-header h3 {
    font-size: 1.2rem;
  }
  
  .stream-tags {
    gap: 6px;
  }
  
  .tag {
    font-size: 0.7rem;
  }
}
</style>