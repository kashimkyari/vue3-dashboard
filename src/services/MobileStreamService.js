// src/services/MobileStreamService.js
// Mobile-optimized service for API interactions
/* eslint-disable */
import axios from "axios";

/**
 * Mobile-optimized Stream Service that handles caching and optimized API requests
 * to reduce data usage and improve performance on mobile devices
 */
class MobileStreamService {
  /**
   * Get details for a specific stream
   * @param {number} streamId - The ID of the stream to fetch
   * @returns {Promise} - Promise resolving to stream data
   */
  static async getStream(streamId) {
    // Fetch from API
    return axios.get(`/api/streams/${streamId}`).then((response) => {
      return response.data;
    });
  }

  /**
   * Get all assignments for a specific agent
   * @param {number} agentId - The agent ID
   * @returns {Promise} - Promise resolving to list of assignments
   */
  static async getAgentAssignments(agentId) {
    // Fetch fresh data
    return axios.get(`/api/agents/${agentId}/assignments`).then((response) => {
      return response.data;
    });
  }

  /**
   * Get all streams with optional filters
   * @param {Object} [filters={}] - Optional filters (platform, streamer)
   * @param {string} [filters.platform] - Platform filter (chaturbate|stripchat)
   * @param {string} [filters.streamer] - Streamer username search string
   * @returns {Promise} - Promise resolving to list of streams
   */
  static async getAllStreams(filters = {}) {
    // Mobile optimization parameters to reduce data usage
    const mobileParams = {
      platform: filters.platform,
      streamer: filters.streamer,
      mobile_view: true, // Signal to backend this is a mobile request
      exclude_thumbnails: true, // Explicitly exclude thumbnails to reduce data
      min_data: true, // Request minimal data payload
    };

    // Fetch all streams with mobile optimization
    return axios
      .get("/api/streams", {
        params: {
          mobile_view: true,
          exclude_thumbnails: true,
          min_data: true,
        },
      })
      .then((response) => {
        return response.data;
      });
  }

  /**
   * Get all agents
   * @param {boolean} [forceRefresh=false] - Whether to force a refresh from the API
   * @returns {Promise} - Promise resolving to list of agents
   */
  static async getAllAgents(forceRefresh = false) {
    return axios.get("/api/agents").then((response) => {
      return response.data;
    });
  }

  /**
   * Create a new stream assignment with optimized request
   * @param {Object} assignmentData - Assignment details
   * @param {number} assignmentData.agentId - Agent ID to assign
   * @param {number} assignmentData.streamId - Stream ID to assign
   * @returns {Promise} - Promise resolving to created assignment
   */
  static createAssignment({ agentId, streamId }) {
    return axios.post("/api/assign", { agentId, streamId }).then((response) => {
      return response.data;
    });
  }

  /**
   * Update stream assignments in bulk with optimized request
   * @param {number} streamId - Stream ID to update assignments for
   * @param {number[]} agentIds - Array of agent IDs to assign
   * @returns {Promise} - Promise resolving to update result
   */
  static bulkUpdateAssignments(streamId, agentIds) {
    return axios
      .post(`/api/assignments/stream/${streamId}`, { agentIds })
      .then((response) => {
        return response.data;
      });
  }

  /**
   * Delete a stream assignment
   * @param {number} assignmentId - ID of assignment to remove
   * @param {number} agentId - Agent ID associated with the assignment
   * @returns {Promise} - Promise resolving to deletion result
   */
  static deleteAssignment(assignmentId, agentId) {
    return axios.delete(`/api/assignments/${assignmentId}`).then((response) => {
      return response.data;
    });
  }

  /**
   * Create a new stream with validation and progress tracking
   * Optimized for mobile to reduce bandwidth
   * @param {Object} streamData - Stream creation data
   * @param {string} streamData.room_url - Stream room URL
   * @param {string} streamData.platform - Stream platform
   * @param {number} [streamData.agent_id] - Optional agent ID for assignment
   * @returns {Promise} - Promise resolving to job information
   */
  static createStreamInteractive(streamData) {
    return axios
      .post("/api/streams/interactive", streamData)
      .then((response) => {
        return response.data;
      });
  }

  /**
   * Get status of a stream creation job
   * @param {string} jobId - Job ID to check status for
   * @returns {Promise} - Promise resolving to job status
   */
  static getJobStatus(jobId) {
    return axios
      .get("/api/streams/interactive/status?job_id=${jobId}", {
        params: { job_id: jobId },
      })
      .then((response) => response.data);
  }

  /**
   * Optimize a request for mobile by reducing unneeded fields
   * This helps reduce data usage for mobile clients
   * @param {string} endpoint - API endpoint to call
   * @param {Object} [params={}] - Optional query parameters
   * @returns {Promise} - Promise resolving to optimized data
   */
  static getOptimizedRequest(endpoint, params = {}) {
    // Add mobile optimization parameter
    const optimizedParams = {
      ...params,
      mobile_optimized: true,
    };

    return axios
      .get(endpoint, { params: optimizedParams })
      .then((response) => response.data);
  }

  /**
   * Get dashboard data optimized for mobile
   * @returns {Promise} - Promise resolving to mobile-optimized dashboard data
   */
  static getMobileDashboard() {
    return this.getOptimizedRequest("/api/dashboard", { view: "mobile" });
  }

  /**
   * Refresh stream data for mobile view
   * @param {Object} stream - Stream to refresh
   * @returns {Promise} - Promise resolving to refresh result
   */
  static refreshStream(stream) {
    const streamId = stream.id;
    const platform = stream.type || stream.platform;

    let payload;
    let endpoint;

    // Platform-specific handling
    if (platform.toLowerCase() === "chaturbate") {
      let username = "";
      if (stream.room_url?.includes("chaturbate.com/")) {
        username = stream.room_url.split("/").filter(Boolean).pop();
      } else {
        username = stream.streamer_username || "";
      }

      endpoint = "/api/streams/refresh/chaturbate";
      payload = { room_slug: username };
    } else if (platform.toLowerCase() === "stripchat") {
      endpoint = "/api/streams/refresh/stripchat";
      payload = { room_url: stream.room_url };
    } else {
      return Promise.reject(new Error("Unsupported platform for refresh"));
    }

    return axios.post(endpoint, payload).then((response) => {
      return response.data;
    });
  }
}

// Export service without any caching
export default MobileStreamService;
