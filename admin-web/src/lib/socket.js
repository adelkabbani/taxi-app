import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuthStore } from './authStore';

// Singleton socket instance
let socket;

export const useSocket = () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Initialize only once
    if (!socket && token) {
        socket = io('/', { // Proxy handles URL
            auth: {
                token
            },
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log('Socket connected', socket.id);

            // Authenticate
            socket.emit('authenticate', {
                token,
                userId: user.id,
                role: user.role
            });
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
        });
    }

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
