import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_KEY = import.meta.env.VITE_API_KEY;

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'X-API-Key': API_KEY }),
  },
});

// Family Members
export const getFamilyMembers = () => api.get('/family_members');

// Chores
export const getChores = () => api.get('/chores');
export const createChore = (chore) => api.post('/chores', { chore });
export const updateChore = (id, chore) => api.put(`/chores/${id}`, { chore });
export const deleteChore = (id) => api.delete(`/chores/${id}`);

// Grocery Items
export const getGroceryItems = () => api.get('/grocery_items');
export const createGroceryItem = (item) => api.post('/grocery_items', { grocery_item: item });
export const updateGroceryItem = (id, item) => api.put(`/grocery_items/${id}`, { grocery_item: item });
export const deleteGroceryItem = (id) => api.delete(`/grocery_items/${id}`);

// Google Calendar
export const syncGoogleCalendar = () => api.get('/google_calendar/sync');
export const createGoogleCalendarEvent = (event) => api.post('/google_calendar/create', event);
export const updateGoogleCalendarEvent = (id, event) => api.patch(`/google_calendar/events/${id}`, event);
export const deleteGoogleCalendarEvent = (id) => api.delete(`/google_calendar/events/${id}`);

export default api;
