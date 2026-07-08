/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// ── Mock Tauri API ──
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// ── Mock child components for clean rendering ──
vi.mock('../components/Bookshelf', () => ({
  default: ({ projects, onEnterProject, onCreateProject }: {
    projects: Array<{ id: string; title: string }>;
    onEnterProject: (p: { id: string }) => void;
    onCreateProject?: () => void;
  }) => {
    const { default: React } = await import('react');
    // Render nothing
  },
}));
