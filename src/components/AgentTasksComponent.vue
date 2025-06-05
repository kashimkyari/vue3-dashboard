<template>
  <div class="tasks-container">
    <!-- Header Section -->
    <div class="tasks-header">
      <div class="header-content">
        <h2 class="header-title">
          <font-awesome-icon :icon="['fas', 'tasks']" class="title-icon" />
          My Tasks
          <span class="task-count" v-if="tasks.length > 0">{{ tasks.length }}</span>
        </h2>
        <div class="header-actions">
          <button class="action-btn filter-btn" @click="toggleFilters" :class="{ active: showFilters }">
            <font-awesome-icon :icon="['fas', 'filter']" />
            <span>Filter</span>
          </button>
          <button class="action-btn refresh-btn" @click="refreshTasks" :disabled="isLoading">
            <font-awesome-icon :icon="['fas', 'sync']" :class="{ 'rotating': isLoading }" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Filter Panel -->
      <div class="filter-panel" v-show="showFilters">
        <div class="filter-group">
          <label>Priority:</label>
          <select v-model="selectedPriority" class="filter-select">
            <option value="">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status:</label>
          <select v-model="selectedStatus" class="filter-select">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <button class="clear-filters-btn" @click="clearFilters">
          <font-awesome-icon :icon="['fas', 'times']" />
          Clear
        </button>
      </div>
    </div>

    <!-- Tasks List -->
    <div class="tasks-content">
      <div class="tasks-list" v-if="filteredTasks.length > 0">
        <transition-group name="task-list" tag="div">
          <div v-for="(task, index) in filteredTasks" :key="task.id || index" class="task-card" :class="[
            `priority-${task.priority}`,
            { 'overdue': isOverdue(task.due_date) },
            { 'completing': completingTasks.includes(task.id) }
          ]">
            <!-- Priority Indicator -->
            <div class="task-priority-indicator" :class="task.priority">
              <div class="priority-dot"></div>
            </div>

            <!-- Task Content -->
            <div class="task-content">
              <div class="task-header">
                <h3 class="task-title">{{ task.title }}</h3>
                <div class="task-badges">
                  <span class="priority-badge" :class="task.priority">
                    {{ task.priority?.toUpperCase() || 'NORMAL' }}
                  </span>
                  <span class="status-badge" :class="getStatusClass(task)">
                    {{ getStatusText(task) }}
                  </span>
                </div>
              </div>

              <div class="task-description" v-if="task.description">
                {{ task.description }}
              </div>

              <div class="task-meta">
                <div class="meta-item">
                  <font-awesome-icon :icon="['fas', 'clock']" class="meta-icon" />
                  <span>Created {{ formatTimeAgo(task.created_at) }}</span>
                </div>
                <div class="meta-item" v-if="task.due_date">
                  <font-awesome-icon :icon="['fas', isOverdue(task.due_date) ? 'exclamation-triangle' : 'calendar']"
                    class="meta-icon" :class="{ 'text-danger': isOverdue(task.due_date) }" />
                  <span :class="{ 'text-danger': isOverdue(task.due_date) }">
                    Due {{ formatTimeAgo(task.due_date) }}
                  </span>
                </div>
                <div class="meta-item" v-if="task.assignee">
                  <font-awesome-icon :icon="['fas', 'user']" class="meta-icon" />
                  <span>{{ task.assignee }}</span>
                </div>
              </div>
            </div>

            <!-- Task Actions -->
            <div class="task-actions">
              <button class="action-button edit-button" @click="editTask(task)" title="Edit Task">
                <font-awesome-icon :icon="['fas', 'edit']" />
              </button>
              <button class="action-button complete-button" @click="completeTask(task.id)"
                :disabled="completingTasks.includes(task.id)" title="Mark as Complete">
                <font-awesome-icon :icon="completingTasks.includes(task.id) ? ['fas', 'spinner'] : ['fas', 'check']"
                  :class="{ 'fa-spin': completingTasks.includes(task.id) }" />
              </button>
              <button class="action-button delete-button" @click="deleteTask(task.id)" title="Delete Task">
                <font-awesome-icon :icon="['fas', 'trash']" />
              </button>
            </div>
          </div>
        </transition-group>
      </div>

      <!-- Empty State -->
      <div class="empty-state" v-else-if="tasks.length === 0">
        <div class="empty-icon-container">
          <font-awesome-icon :icon="['fas', 'clipboard-check']" class="empty-icon" />
        </div>
        <div class="empty-content">
          <h3 class="empty-title">All caught up!</h3>
          <p class="empty-text">You don't have any pending tasks right now.</p>
          <button class="create-task-btn" @click="createNewTask">
            <font-awesome-icon :icon="['fas', 'plus']" />
            Create Your First Task
          </button>
        </div>
      </div>

      <!-- No Results State -->
      <div class="empty-state" v-else>
        <div class="empty-icon-container">
          <font-awesome-icon :icon="['fas', 'search']" class="empty-icon" />
        </div>
        <div class="empty-content">
          <h3 class="empty-title">No tasks found</h3>
          <p class="empty-text">Try adjusting your filters to see more tasks.</p>
          <button class="clear-filters-btn secondary" @click="clearFilters">
            Clear Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div class="loading-overlay" v-if="isLoading">
      <div class="loading-spinner">
        <font-awesome-icon :icon="['fas', 'spinner']" class="fa-spin" />
        <span>Loading tasks...</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

export default {
  name: 'AgentTasksComponent',
  components: {
    FontAwesomeIcon
  },
  props: {
    tasks: {
      type: Array,
      default: () => []
    }
  },
  emits: ['refresh-tasks', 'complete-task', 'edit-task', 'delete-task', 'create-task'],
  setup(props, { emit }) {
    const isLoading = ref(false)
    const showFilters = ref(false)
    const selectedPriority = ref('')
    const selectedStatus = ref('')
    const completingTasks = ref([])

    const filteredTasks = computed(() => {
      let filtered = [...props.tasks]

      if (selectedPriority.value) {
        filtered = filtered.filter(task => task.priority === selectedPriority.value)
      }

      if (selectedStatus.value) {
        filtered = filtered.filter(task => getStatusClass(task) === selectedStatus.value)
      }

      return filtered.sort((a, b) => {
        // Sort by priority and due date
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const aPriority = priorityOrder[a.priority] || 0
        const bPriority = priorityOrder[b.priority] || 0

        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }

        // Then by due date
        if (a.due_date && b.due_date) {
          return new Date(a.due_date) - new Date(b.due_date)
        }

        return 0
      })
    })

    const refreshTasks = () => {
      isLoading.value = true
      emit('refresh-tasks')
      setTimeout(() => {
        isLoading.value = false
      }, 1000)
    }

    const completeTask = (taskId) => {
      completingTasks.value.push(taskId)
      setTimeout(() => {
        emit('complete-task', taskId)
        completingTasks.value = completingTasks.value.filter(id => id !== taskId)
      }, 500)
    }

    const editTask = (task) => {
      emit('edit-task', task)
    }

    const deleteTask = (taskId) => {
      if (confirm('Are you sure you want to delete this task?')) {
        emit('delete-task', taskId)
      }
    }

    const createNewTask = () => {
      emit('create-task')
    }

    const toggleFilters = () => {
      showFilters.value = !showFilters.value
    }

    const clearFilters = () => {
      selectedPriority.value = ''
      selectedStatus.value = ''
      showFilters.value = false
    }

    const formatTimeAgo = (timestamp) => {
      if (!timestamp) return 'unknown'

      const now = new Date()
      const date = new Date(timestamp)
      const diffInMs = now - date
      const diffInHours = diffInMs / (1000 * 60 * 60)
      const diffInDays = diffInHours / 24

      if (diffInHours < 1) {
        return 'just now'
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`
      } else if (diffInDays < 7) {
        return `${Math.floor(diffInDays)}d ago`
      } else {
        return date.toLocaleDateString()
      }
    }

    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString()
    }

    const isOverdue = (dueDate) => {
      if (!dueDate) return false
      return new Date(dueDate) < new Date()
    }

    const getStatusClass = (task) => {
      if (isOverdue(task.due_date)) return 'overdue'
      if (task.status) return task.status
      return 'pending'
    }

    const getStatusText = (task) => {
      const status = getStatusClass(task)
      switch (status) {
        case 'overdue': return 'OVERDUE'
        case 'in-progress': return 'IN PROGRESS'
        case 'pending': return 'PENDING'
        default: return 'PENDING'
      }
    }

    return {
      isLoading,
      showFilters,
      selectedPriority,
      selectedStatus,
      completingTasks,
      filteredTasks,
      refreshTasks,
      completeTask,
      editTask,
      deleteTask,
      createNewTask,
      toggleFilters,
      clearFilters,
      formatTimeAgo,
      formatDate,
      isOverdue,
      getStatusClass,
      getStatusText
    }
  }
}
</script>

<style scoped>
.tasks-container {
  background: #0f0f0f;
  border-radius: 16px;
  padding: 24px;
  min-height: 600px;
  position: relative;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #e5e5e5;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 1px solid #1a1a1a;
}

/* Header Styles */
.tasks-header {
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.title-icon {
  color: #3b82f6;
}

.task-count {
  background: #3b82f6;
  color: #ffffff;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid #333;
  background: #1a1a1a;
  color: #e5e5e5;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: #2a2a2a;
  border-color: #444;
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}

/* Filter Panel */
.filter-panel {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px;
  background: #1a1a1a;
  border-radius: 12px;
  border: 1px solid #333;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 500;
  color: #b3b3b3;
}

.filter-select {
  padding: 6px 12px;
  background: #0f0f0f;
  border: 1px solid #333;
  border-radius: 6px;
  color: #e5e5e5;
  font-size: 14px;
}

.clear-filters-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #dc2626;
  border: none;
  border-radius: 6px;
  color: #ffffff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-filters-btn:hover {
  background: #b91c1c;
}

.clear-filters-btn.secondary {
  background: #333;
  color: #e5e5e5;
}

.clear-filters-btn.secondary:hover {
  background: #444;
}

/* Tasks List */
.tasks-content {
  position: relative;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Task Card */
.task-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
  border: 1px solid #333;
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.task-card:hover {
  border-color: #444;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.task-card.completing {
  opacity: 0.6;
  transform: scale(0.98);
}

.task-card.overdue {
  border-left: 4px solid #dc2626;
  background: linear-gradient(135deg, #1a0f0f 0%, #0f0f0f 100%);
}

/* Priority Indicator */
.task-priority-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 8px;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
}

.priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.task-priority-indicator.high .priority-dot {
  background: #dc2626;
  box-shadow: 0 0 8px rgba(220, 38, 38, 0.5);
}

.task-priority-indicator.medium .priority-dot {
  background: #f59e0b;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
}

.task-priority-indicator.low .priority-dot {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

/* Task Content */
.task-content {
  flex: 1;
  margin-left: 16px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.task-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
  line-height: 1.4;
}

.task-badges {
  display: flex;
  gap: 8px;
}

.priority-badge,
.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.priority-badge.high {
  background: rgba(220, 38, 38, 0.2);
  color: #fca5a5;
}

.priority-badge.medium {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
}

.priority-badge.low {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}

.status-badge.pending {
  background: rgba(107, 114, 128, 0.2);
  color: #d1d5db;
}

.status-badge.in-progress {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.status-badge.overdue {
  background: rgba(220, 38, 38, 0.2);
  color: #fca5a5;
}

.task-description {
  color: #b3b3b3;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 12px;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: #888;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-icon {
  font-size: 10px;
}

.text-danger {
  color: #dc2626 !important;
}

/* Task Actions */
.task-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid #333;
  background: #1a1a1a;
  color: #e5e5e5;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.action-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.edit-button:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}

.complete-button:hover {
  background: #10b981;
  border-color: #10b981;
  color: #ffffff;
}

.delete-button:hover {
  background: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  text-align: center;
}

.empty-icon-container {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.empty-icon {
  font-size: 32px;
  color: #666;
}

.empty-content h3 {
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 8px 0;
}

.empty-text {
  color: #888;
  font-size: 14px;
  margin-bottom: 24px;
}

.create-task-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-task-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

/* Loading Overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 15, 15, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  backdrop-filter: blur(4px);
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #e5e5e5;
}

.loading-spinner svg {
  font-size: 24px;
  color: #3b82f6;
}

/* Animations */
@keyframes rotating {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.rotating {
  animation: rotating 1s linear infinite;
}

.task-list-enter-active,
.task-list-leave-active {
  transition: all 0.3s ease;
}

.task-list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.task-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Responsive Design */
@media (max-width: 768px) {
  .tasks-container {
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-actions {
    justify-content: center;
  }

  .filter-panel {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .filter-group {
    justify-content: space-between;
  }

  .task-card {
    padding: 16px;
  }

  .task-header {
    flex-direction: column;
    gap: 8px;
  }

  .task-meta {
    flex-direction: column;
    gap: 8px;
  }

  .task-actions {
    flex-direction: column;
  }
}
</style>