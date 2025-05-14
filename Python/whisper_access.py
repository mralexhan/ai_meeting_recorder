#run source venv/Scripts/activate to get the virtual environment running

import sys
import whisper #run python ver 3.10 and run pip install openai-whisper
import time

#tests if there is a audio file being sent over
if len(sys.argv) < 2:
    print("Missing audio file")
    sys.exit(1)

# print("Uploading...")
# Load the audio file path from command-line argument
audio_path = sys.argv[1]

# Load the Whisper model
# print("Initializing model")
model = whisper.load_model("tiny") #edit this for speed / size in order: tiny, base, small, medium, turbo, large

start_time = time.time()
result = model.transcribe(audio_path)
end_time = time.time()

# print("Transcription complete")
# print(f"Time taken: {end_time - start_time:.2f} seconds")

# Print the result as JSON
print(result["text"].encode('utf-8').decode('cp932', errors='ignore')) #ignores errors caused by system language differences