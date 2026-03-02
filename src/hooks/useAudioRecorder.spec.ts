import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioRecorder } from './useAudioRecorder';

// Browser API Mocks
const mockStream = {
    getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
};

const mockMediaRecorder = {
    start: vi.fn(),
    stop: vi.fn(),
    ondataavailable: null,
    onstop: null,
    state: 'inactive',
    stream: mockStream,
};

// Constructor mock
vi.stubGlobal('MediaRecorder', vi.fn().mockImplementation(function () {
    return mockMediaRecorder;
}));
(MediaRecorder as any).isTypeSupported = vi.fn().mockReturnValue(true);

const MockAudioContext = vi.fn().mockImplementation(function () {
    return {
        createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn() }),
        createAnalyser: vi.fn().mockReturnValue({ fftSize: 0 }),
        close: vi.fn().mockResolvedValue(undefined),
    };
});
vi.stubGlobal('AudioContext', MockAudioContext);

vi.stubGlobal('navigator', {
    mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
    },
});

describe('useAudioRecorder', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default values', () => {
        const { result } = renderHook(() => useAudioRecorder());
        expect(result.current.isRecording).toBe(false);
        expect(result.current.analyserNode).toBe(null);
    });

    it('should start recording correctly', async () => {
        const { result } = renderHook(() => useAudioRecorder());

        await act(async () => {
            await result.current.startRecording();
        });

        expect(result.current.isRecording).toBe(true);
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
        expect(mockMediaRecorder.start).toHaveBeenCalled();
    });

    it('should stop recording and return a blob', async () => {
        const { result } = renderHook(() => useAudioRecorder());

        await act(async () => {
            await result.current.startRecording();
        });

        let blobPromise: Promise<Blob>;
        await act(async () => {
            blobPromise = result.current.stopRecording();
            // Simulate MediaRecorder stop event
            if (mockMediaRecorder.onstop) {
                (mockMediaRecorder as any).onstop();
            }
        });

        const blob = await blobPromise!;
        expect(result.current.isRecording).toBe(false);
        expect(blob).toBeInstanceOf(Blob);
        expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });
});
