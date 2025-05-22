import wave
import pyaudio
import os
import sys
import threading

stop_signal = False

# Define the root project directory (one level above the script location)
PROJECT_DIR = os.path.dirname(f"{os.path.abspath(__file__)}")  # Get the current script's directory
SAVE_DIR = os.path.join(PROJECT_DIR, '..', 'recordings')  # 'recordings' folder at the root level of the project
SAVE_DIR = os.path.abspath(SAVE_DIR)  # Get the absolute path

os.makedirs(SAVE_DIR, exist_ok=True)  # Ensure the 'recordings' directory exists

def listen_for_stop():
    global stop_signal
    for line in sys.stdin:
        if line.strip().lower() == "stop":
            stop_signal = True
            break

def record_audio():
    global stop_signal
    # Create a file path within the 'recordings' directory at the root of the project
    temp_file_name = os.path.join(SAVE_DIR, 'audio_recording.wav')

    with wave.open(temp_file_name, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)

        audio = pyaudio.PyAudio()
        stream = audio.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=16000,
            input=True,
            frames_per_buffer=1024
        )

        while not stop_signal:
            data = stream.read(1024)
            wav_file.writeframes(data)

        stream.stop_stream()
        stream.close()
        audio.terminate()

    print(temp_file_name, flush=True)

threading.Thread(target=listen_for_stop, daemon=True).start()
record_audio()