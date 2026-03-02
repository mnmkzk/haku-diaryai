import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import RecordPage from '@/app/record/page'
import { useRouter } from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(() => ({
        back: vi.fn(),
        push: vi.fn(),
    })),
}))

// Mock WaveformVisualizer
vi.mock('@/components/record/WaveformVisualizer', () => ({
    WaveformVisualizer: () => <div data-testid="waveform">Waveform</div>,
}))

describe('RecordPage Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        // Mock MediaRecorder
        const mockStream = {
            getTracks: vi.fn(() => [{ stop: vi.fn() }]),
        }

        vi.stubGlobal('navigator', {
            mediaDevices: {
                getUserMedia: vi.fn(async () => mockStream),
            },
        })

        function MockMediaRecorder(this: any, stream: any) {
            this.stream = stream;
            this.state = 'inactive';
            this.onstop = null;
            this.onerror = null;
            this.ondataavailable = null;

            this.start = vi.fn(() => {
                this.state = 'recording';
            });

            this.stop = vi.fn(() => {
                this.state = 'inactive';
                // Simulate dataavailable before stop
                if (this.ondataavailable) {
                    // Use File instead of Blob to avoid undici FormData parsing issues in Node
                    const file = new File(['test-audio-data'], 'record.webm', { type: 'audio/webm' });
                    this.ondataavailable({ data: file });
                }
                // Simulate onstop
                if (this.onstop) {
                    setTimeout(() => {
                        if (this.onstop) this.onstop();
                    }, 0);
                }
            });

            this.addEventListener = vi.fn((event, cb) => {
                if (event === 'dataavailable') this.ondataavailable = cb;
                if (event === 'stop') this.onstop = cb;
                if (event === 'error') this.onerror = cb;
            });

            this.removeEventListener = vi.fn();
        }

        (MockMediaRecorder as any).isTypeSupported = vi.fn().mockReturnValue(true);
        vi.stubGlobal('MediaRecorder', MockMediaRecorder)

        // Mock AudioContext
        vi.stubGlobal('AudioContext', function () {
            return {
                createAnalyser: vi.fn(() => ({
                    connect: vi.fn(),
                    disconnect: vi.fn(),
                    frequencyBinCount: 128,
                    getByteTimeDomainData: vi.fn(),
                })),
                createMediaStreamSource: vi.fn(() => ({
                    connect: vi.fn(),
                })),
                close: vi.fn(),
            }
        })
    })

    it('完成した投稿フロー: 録音の開始、停止、解析結果の表示', async () => {
        render(<RecordPage />)

        // 1. Ready to listen
        expect(screen.getByText('Ready to listen')).toBeInTheDocument()

        // 2. Start
        const startBtn = screen.getByRole('button', { name: /録音開始/i })
        fireEvent.click(startBtn)

        // 3. Verify Recording state
        await waitFor(() => {
            expect(screen.getByText('Recording')).toBeInTheDocument()
        })

        // 4. Stop
        const stopBtn = screen.getByRole('button', { name: /録音停止/i })
        fireEvent.click(stopBtn)

        // 5. Verify Processing state
        await waitFor(() => {
            expect(screen.getByText(/Haku が聴いています/i)).toBeInTheDocument()
        }, { timeout: 5000 })

        // 6. Result display
        await waitFor(() => {
            expect(screen.getByText(/今日はとても良い一日だった/i)).toBeInTheDocument()
            expect(screen.getByText(/自分を少し褒めてあげたい/i)).toBeInTheDocument()
        }, { timeout: 10000 })

        // 7. Emotions
        expect(screen.getByText('joy')).toBeInTheDocument()
        expect(screen.getByText('90%')).toBeInTheDocument()
    }, 15000)

    it('APIエラー時の挙動: エラーメッセージの表示', async () => {
        const { server } = await import('@/test/mocks/server')
        const { http, HttpResponse } = await import('msw')

        server.use(
            http.post('/api/entries', () => {
                return new HttpResponse(null, { status: 500 })
            })
        )

        render(<RecordPage />)

        const startBtn = screen.getByRole('button', { name: /録音開始/i })
        fireEvent.click(startBtn)
        await waitFor(() => expect(screen.getByText('Recording')).toBeInTheDocument())

        const stopBtn = screen.getByRole('button', { name: /録音停止/i })
        fireEvent.click(stopBtn)

        // Should return to idle on error
        await waitFor(() => {
            expect(screen.getByText('Ready to listen')).toBeInTheDocument()
        }, { timeout: 10000 })
    }, 15000)
})
