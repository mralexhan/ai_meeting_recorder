using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

namespace MeetingRecorder.Controllers
{
    public class RecordController : ControllerBase
    {

        public static Process? RecordingProcess = null;

        [HttpPost("record/start")]
        public async Task<IActionResult> RecordAudio()
        {
            var pythonPath = Path.Combine(Directory.GetCurrentDirectory(), "Python", "venv", "Scripts", "python.exe");
            var scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "Python", "record.py");

            var start = new ProcessStartInfo
            {
                FileName = pythonPath,
                Arguments = scriptPath,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                RedirectStandardInput = true,
                CreateNoWindow = true
            };

            // var process = new Process { StartInfo = start };
            // process.Start();
            // RecordingProcess = process;

            try
            {
                // Set environment variable to suppress warnings in the Python process
                start.Environment["PYTHONWARNINGS"] = "ignore";
                
                // Start the process and capture the output from the Python script
                using var process = Process.Start(start);
                RecordingProcess = process;
                // Check if RecordingProcess is null or empty
                if (RecordingProcess == null)
                {
                    return StatusCode(500, "Failed to start the Python process. Recording process is null.");
                }

                // Capture any error from the Python script
                var error = await process.StandardError.ReadToEndAsync();
                if (!string.IsNullOrEmpty(error))
                {
                    return StatusCode(500, $"Python script error: {error}");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error executing Python script: {ex.Message}");
            }

            return Ok(new { message = "Recording Started" });
        }

        [HttpPost("record/stop")]
        public async Task<IActionResult> StopRecording()
        {
            if (RecordingProcess == null || RecordingProcess.HasExited)
            {
                return BadRequest("No active recording process.");
            }

            RecordingProcess.StandardInput.WriteLine("stop");
            RecordingProcess.StandardInput.Flush();
            var outputTask = RecordingProcess.StandardOutput.ReadToEndAsync();
            RecordingProcess.WaitForExit();

            var output = await outputTask;

            RecordingProcess.Dispose();
            RecordingProcess = null;

            // Last printed line should be the file path
            var lines = output.Split('\n');
            var filePath = lines.LastOrDefault(line => line.Trim().EndsWith(".wav"))?.Trim();

            if (string.IsNullOrEmpty(filePath))
            {
                return BadRequest("No valid file path found.");
            }

            byte[] audioData = System.IO.File.ReadAllBytes(filePath);


            return File(audioData, "audio/wav", "audiofile.wav");
        }

    }
}