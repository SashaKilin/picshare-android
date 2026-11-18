import { getServerUrl, resolveMediaUrl } from '../config';

const getApiBase = () => {
  const base = getServerUrl();
  return `${base}/api`;
};

export function fixMediaUrls(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(fixMediaUrls);
  }
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (
      (key === 'file_url' || key === 'avatar' || key === 'avatar_url' || key === 'image_url') &&
      typeof result[key] === 'string'
    ) {
      result[key] = resolveMediaUrl(result[key]);
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = fixMediaUrls(result[key]);
    }
  }
  return result;
}

export function getAuthToken() {
  return localStorage.getItem('picshare_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('picshare_token', token);
  } else {
    localStorage.removeItem('picshare_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is NOT FormData, default to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${getApiBase()}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Произошла ошибка при выполнении запроса');
  }

  return fixMediaUrls(data);
}

export const api = {
  // Auth & Profile
  register: (userData) => request('/auth/register', { method: 'POST', body: userData }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  googleAuth: (credential) => request('/auth/google', { method: 'POST', body: { credential } }),
  linkGoogle: (credential) => request('/auth/link-google', { method: 'POST', body: { credential } }),
  unlinkGoogle: () => request('/auth/unlink-google', { method: 'POST' }),
  setPassword: (password) => request('/auth/set-password', { method: 'POST', body: { password } }),
  getMe: () => request('/auth/me'),
  updateProfile: (profileData) => request('/auth/profile', { method: 'PUT', body: profileData }),
  uploadMedia: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/auth/upload-media', { method: 'POST', body: formData });
  },

  // Users public profiles
  getUserProfile: (idOrUsername) => request(`/users/${idOrUsername}`),

  // Friends
  getFriends: () => request('/friends'),
  getFriendRequests: () => request('/friends/requests'),
  sendFriendRequest: (targetUserId, query) => request('/friends/request', { method: 'POST', body: { targetUserId, query } }),
  acceptFriendRequest: (requestId, senderId) => request('/friends/accept', { method: 'POST', body: { requestId, senderId } }),
  rejectFriendRequest: (requestId, senderId) => request('/friends/reject', { method: 'POST', body: { requestId, senderId } }),
  removeFriend: (friendId) => request(`/friends/${friendId}`, { method: 'DELETE' }),
  searchUsers: (q) => request(`/friends/search?q=${encodeURIComponent(q)}`),

  // Groups
  getGroups: () => request('/groups'),
  getGroup: (groupId) => request(`/groups/${groupId}`),
  createGroup: (groupData) => request('/groups', { method: 'POST', body: groupData }),
  updateGroup: (groupId, groupData) => request(`/groups/${groupId}`, { method: 'PUT', body: groupData }),
  addGroupMembers: (groupId, userIds) => request(`/groups/${groupId}/members`, { method: 'POST', body: { userIds } }),
  removeGroupMember: (groupId, userId) => request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
  deleteGroup: (groupId) => request(`/groups/${groupId}`, { method: 'DELETE' }),

  // Images & Messages
  sendImage: (formData) => request('/images/send', { method: 'POST', body: formData }),
  getChatImages: (friendId) => request(`/images/chat/${friendId}`),
  getGroupChatImages: (groupId) => request(`/images/chat/group/${groupId}`),
  deleteImage: (imageId) => request(`/images/${imageId}`, { method: 'DELETE' }),
  getFeed: () => request('/images/feed'),

  // Health
  getHealth: () => request('/health'),

  // Web Push & App Notifications
  getPushPublicKey: () => request('/push/public-key'),
  subscribePush: (subscription, clientType) => request('/push/subscribe', { method: 'POST', body: { subscription, clientType } }),
  unsubscribePush: (endpoint) => request('/push/unsubscribe', { method: 'POST', body: { endpoint } }),
  setAppNotificationStatus: (enabled) => request('/push/app-status', { method: 'POST', body: { enabled } }),
  getPushStatus: () => request('/push/status'),
  testPush: () => request('/push/test', { method: 'POST' }),
};
