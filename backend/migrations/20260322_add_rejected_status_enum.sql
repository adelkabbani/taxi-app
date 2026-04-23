-- Migration: Add 'rejected' to the booking_status enum
-- Date: 2026-03-22
-- Run this BEFORE 20260322_add_rejected_transition.sql

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'rejected';
