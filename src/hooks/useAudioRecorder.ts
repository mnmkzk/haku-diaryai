import { useState, useRef, useCallback } from "react"

export function useAudioRecorder() {
    const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)
    const [isRecording, setIsRecording] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const chunksRef = useRef<Blob[]>([])

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

            const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
            audioContextRef.current = new AudioContextCtor()
            const source = audioContextRef.current.createMediaStreamSource(stream)

            const analyser = audioContextRef.current.createAnalyser()
            analyser.fftSize = 256
            source.connect(analyser)
            setAnalyserNode(analyser)

            // MediaRecorder initialization
            // Preferably use webm or mp4 for broader support in Whisper
            const options = { mimeType: 'audio/webm;codecs=opus' }
            const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(options.mimeType) ? options : undefined)

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            recorder.start(200) // Collect chunks every 200ms
            mediaRecorderRef.current = recorder
            setIsRecording(true)

        } catch (err) {
            console.error("Error accessing microphone", err)
            throw err
        }
    }, [])

    const stopRecording = useCallback((): Promise<Blob> => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current) {
                resolve(new Blob())
                return
            }

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' })
                chunksRef.current = [] // reset
                setIsRecording(false)

                if (audioContextRef.current) {
                    audioContextRef.current.close()
                    audioContextRef.current = null
                }
                setAnalyserNode(null)

                // Stop all tracks
                mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop())
                resolve(audioBlob)
            }

            mediaRecorderRef.current.stop()
        })
    }, [])

    return {
        analyserNode,
        isRecording,
        startRecording,
        stopRecording
    }
}
